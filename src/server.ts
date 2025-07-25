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

class Case7HttpServer {
  private app: express.Application;
  private server: Server;
  private caseLoader: CaseLoader;
  private vectorService: VectorService;
  private searchService: SearchService;

  constructor() {
    this.app = express();
    this.server = new Server(
      {
        name: 'case7-http',
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
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true
    }));
    this.app.use(express.json());
    this.app.use(express.raw({ type: 'application/json' }));
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

  private setupRoutes(): void {
    // MCP endpoint for Streamable HTTP transport
    this.app.post('/mcp', async (req, res) => {
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID()
        });

        await transport.handleRequest(req, res, this.server);
      } catch (error) {
        logger.error('Error handling MCP request:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        transport: 'streamable-http'
      });
    });

    // Info endpoint
    this.app.get('/info', (req, res) => {
      res.json({
        name: 'case7-http',
        version: '1.0.0',
        transport: 'streamable-http',
        endpoints: {
          mcp: '/mcp',
          health: '/health',
          info: '/info'
        },
        tools: [
          { name: 'search-cases', description: 'Search for development cases' },
          { name: 'get-case', description: 'Get specific case by ID' }
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

  async start(port: number = 3000): Promise<void> {
    await this.initialize();

    this.app.listen(port, '127.0.0.1', () => {
      logger.info(`case7 HTTP MCP server started on http://127.0.0.1:${port}`);
      logger.info(`MCP endpoint: http://127.0.0.1:${port}/mcp`);
      logger.info(`Health check: http://127.0.0.1:${port}/health`);
    });

    // Cleanup on shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down HTTP server gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down HTTP server gracefully...');
      process.exit(0);
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new Case7HttpServer();
  const port = parseInt(process.env.PORT || '3000');

  server.start(port).catch((error) => {
    logger.error('Failed to start HTTP server:', error);
    process.exit(1);
  });
}

export { Case7HttpServer };