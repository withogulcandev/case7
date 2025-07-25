#!/usr/bin/env node

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CaseLoader } from './services/case-loader.js';
import { VectorService } from './services/vector-service.js';
import { SearchService } from './services/search-service.js';
import { SearchCasesSchema, GetCaseSchema } from './types/case.js';
import { logger } from './utils/logger.js';

class Case7Server {
  private server: Server;
  private caseLoader: CaseLoader;
  private vectorService: VectorService;
  private searchService: SearchService;

  constructor() {
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

    this.setupHandlers();
  }

  private setupHandlers(): void {
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
      logger.info('Initializing case7 server...');

      await this.caseLoader.loadAllCases();

      logger.info('case7 server ready');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    await this.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('case7 MCP server started');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new Case7Server();

  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { Case7Server };