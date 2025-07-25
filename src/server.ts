#!/usr/bin/env node

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CaseLoader } from './services/case-loader.js';
import { VectorService } from './services/vector-service.js';
import { SearchService } from './services/search-service.js';
import { SearchCasesSchema, GetCaseSchema } from './types/case.js';
import { logger } from './utils/logger.js';

interface OAuthClient {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  created_at: number;
}

interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  client_id: string;
  created_at: number;
}

class Case7HttpServer {
  private app: express.Application;
  private server: Server;
  private caseLoader: CaseLoader;
  private vectorService: VectorService;
  private searchService: SearchService;
  private clients: Map<string, OAuthClient> = new Map();
  private tokens: Map<string, OAuthToken> = new Map();

  constructor() {
    this.app = express();
    this.server = new Server(
      {
        name: 'case7',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.caseLoader = new CaseLoader();
    this.vectorService = new VectorService();
    this.searchService = new SearchService(this.caseLoader, this.vectorService);

    this.setupMiddleware();
    this.setupMcpHandlers();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors({
      origin: ['http://localhost:3000', 'https://mcp.case7.dev'],
      credentials: true
    }));
    this.app.use(express.json());
  }

  private setupMcpHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search-cases',
          description: 'Search for development cases based on query, category, or difficulty',
          inputSchema: SearchCasesSchema
        },
        {
          name: 'get-case',
          description: 'Retrieve a specific case by ID with optional section filtering',
          inputSchema: GetCaseSchema
        },
        {
          name: 'register-session',
          description: 'Register a new OAuth client and get access token for MCP session',
          inputSchema: { type: 'object', properties: {}, required: [] }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search-cases':
            return await this.handleSearchCases(SearchCasesSchema.parse(args));

          case 'get-case':
            return await this.handleGetCase(GetCaseSchema.parse(args));

          case 'register-session':
            return await this.handleRegisterSession();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error handling tool call ${name}:`, error);
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }],
          isError: true
        };
      }
    });
  }

  private validateBearerToken(req: express.Request): OAuthToken | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const oauthToken = this.tokens.get(token);
    
    if (!oauthToken || Date.now() > oauthToken.created_at + (oauthToken.expires_in * 1000)) {
      return null;
    }
    
    return oauthToken;
  }

  private setupRoutes(): void {
    this.app.post('/register', (req, res) => {
      const { redirect_uris } = req.body;
      
      const client_id = randomUUID();
      const client_secret = randomUUID();
      
      const client: OAuthClient = {
        client_id,
        client_secret,
        redirect_uris: redirect_uris || [],
        created_at: Date.now()
      };
      
      this.clients.set(client_id, client);
      
      logger.info(`Client registered: ${client_id}`);
      
      res.json({
        client_id,
        client_secret,
        registration_access_token: randomUUID(),
        registration_client_uri: `${req.protocol}://${req.get('host')}/client/${client_id}`,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0,
        redirect_uris: client.redirect_uris
      });
    });


    this.app.post('/oauth/token', (req, res) => {
      logger.info('Token request received', { 
        headers: req.headers, 
        body: req.body,
        contentType: req.get('Content-Type')
      });

      if (!req.body) {
        logger.error('Token request missing body');
        return res.status(400).json({ 
          error: 'invalid_request', 
          error_description: 'Request body is required' 
        });
      }

      const { grant_type, client_id, client_secret } = req.body;
      
      if (!grant_type) {
        logger.error('Missing grant_type parameter');
        return res.status(400).json({ 
          error: 'invalid_request', 
          error_description: 'grant_type parameter is required' 
        });
      }

      if (grant_type === 'client_credentials') {
        if (!client_id || !client_secret) {
          logger.error('Missing client credentials', { client_id: !!client_id, client_secret: !!client_secret });
          return res.status(400).json({ 
            error: 'invalid_request', 
            error_description: 'client_id and client_secret are required for client_credentials grant' 
          });
        }

        const client = this.clients.get(client_id);
        if (!client || client.client_secret !== client_secret) {
          logger.error('Invalid client credentials', { client_id, client_exists: !!client });
          return res.status(400).json({ error: 'invalid_client' });
        }
        
        const access_token = randomUUID();
        const token: OAuthToken = {
          access_token,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'mcp',
          client_id,
          created_at: Date.now()
        };
        
        this.tokens.set(access_token, token);
        
        logger.info(`Client credentials token issued for: ${client_id}`);
        
        return res.json({
          access_token,
          token_type: token.token_type,
          expires_in: token.expires_in,
          scope: token.scope
        });
      } else {
        logger.error('Unsupported grant type', { grant_type });
        return res.status(400).json({ 
          error: 'unsupported_grant_type',
          error_description: 'Only client_credentials grant type is supported'
        });
      }
    });

    this.app.post('/mcp', (req, res, next) => {
      const token = this.validateBearerToken(req);
      if (!token) {
        return res.status(401).json({ error: 'invalid_token' });
      }
      
      logger.info(`MCP request from client: ${token.client_id}`);
      return next();
    }, async (req, res) => {
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId: string) => {
            logger.info(`Session initialized: ${sessionId}`);
          },
          onsessionclosed: (sessionId: string) => {
            logger.info(`Session closed: ${sessionId}`);
          }
        });

        await transport.handleRequest(req, res, this.server);
      } catch (error) {
        logger.error('Error handling MCP request:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.use('/.well-known', express.static('.well-known'));


    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        transport: 'streamable-http'
      });
    });

    this.app.get('/info', (req, res) => {
      res.json({
        name: 'case7-http',
        version: '1.0.0',
        transport: 'streamable-http',
        endpoints: {
          mcp: '/mcp',
          register: '/register',
          token: '/oauth/token',
          health: '/health',
          info: '/info'
        },
        oauth: {
          grant_types_supported: ['client_credentials'],
          token_endpoint: '/oauth/token',
          client_registration_endpoint: '/register'
        },
        tools: [
          { name: 'search-cases', description: 'Search for development cases' },
          { name: 'get-case', description: 'Get specific case by ID' },
          { name: 'register-session', description: 'Register MCP session and get access token' }
        ]
      });
    });
  }

  private async handleSearchCases(params: any) {
    const results = await this.searchService.searchCases(params.query, {
      category: params.category,
      difficulty: params.difficulty,
      limit: params.limit
    });

    const response = {
      query: params.query,
      total_results: results.length,
      cases: results.map(result => ({
        id: result.id,
        title: result.title,
        category: result.category,
        tags: result.tags,
        relevance_score: Math.round(result.relevanceScore * 100) / 100,
        excerpt: result.excerpt
      }))
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleGetCase(params: any) {
    const caseItem = this.caseLoader.getCase(params.id);

    if (!caseItem) {
      return {
        content: [{
          type: 'text',
          text: `Case with ID "${params.id}" not found.`
        }],
        isError: true
      };
    }

    let content = caseItem.content;

    if (params.sections && params.sections.length > 0) {
      content = this.filterCaseSections(caseItem.content, params.sections);
    }

    const maxChars = params.maxTokens * 4;
    if (content.length > maxChars) {
      content = content.substring(0, maxChars) + '\n\n[Content truncated due to token limit...]';
    }

    const response = {
      id: caseItem.id,
      title: caseItem.title,
      category: caseItem.category,
      tags: caseItem.tags,
      difficulty: caseItem.difficulty,
      last_updated: caseItem.lastUpdated,
      tested_versions: caseItem.testedVersions,
      estimated_time: caseItem.estimatedTime,
      prerequisites: caseItem.prerequisites,
      content: content
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleRegisterSession() {
    try {
      // Create a new OAuth client automatically
      const client_id = randomUUID();
      const client_secret = randomUUID();
      
      const client: OAuthClient = {
        client_id,
        client_secret,
        redirect_uris: [],
        created_at: Date.now()
      };
      
      this.clients.set(client_id, client);
      logger.info(`MCP session client registered: ${client_id}`);

      // Immediately create an access token using client_credentials flow
      const access_token = randomUUID();
      const token: OAuthToken = {
        access_token,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'mcp',
        client_id,
        created_at: Date.now()
      };
      
      this.tokens.set(access_token, token);
      logger.info(`Access token created for MCP session: ${access_token}`);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            client_id,
            client_secret,
            access_token,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'mcp'
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to register MCP session:', error);
      return {
        content: [{
          type: 'text',
          text: `Error registering session: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private filterCaseSections(content: string, sections: string[]): string {
    const lines = content.split('\n');
    const filteredLines: string[] = [];
    let currentSection = '';
    let includeSection = false;

    for (const line of lines) {
      if (line.startsWith('#')) {
        const headerText = line.replace(/^#+\s*/, '').toLowerCase();
        currentSection = headerText;
        includeSection = sections.some(section =>
          headerText.includes(section.toLowerCase()) ||
          section.toLowerCase().includes(headerText)
        );
      }

      if (includeSection) {
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n').trim();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing case7 HTTP server...');
      await this.caseLoader.loadAllCases();
      logger.info('case7 HTTP server ready');
    } catch (error) {
      logger.error('Failed to initialize HTTP server:', error);
      throw error;
    }
  }

  async start(port = 8080) {
    await this.initialize();
    
    return new Promise<void>((resolve) => {
      this.app.listen(port, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${port}`);
        resolve();
      });
    });
  }
}

// Start server
new Case7HttpServer().start(Number(process.env.PORT) || 8080);

export { Case7HttpServer };
