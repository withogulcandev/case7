# case7 - Technical Implementation Guide

**A Context7-inspired MCP server for micro product development patterns using Node.js + TypeScript + Upstash Vector**

## 🎯 Project Overview

case7 is a Model Context Protocol (MCP) server that provides AI coding assistants with access to curated development patterns for micro products. Built with Node.js, TypeScript, and Upstash Vector for semantic search.

### Key Features
- ✅ **Zero auth required** - Public MCP server
- ✅ **Markdown-based patterns** - Easy to contribute
- ✅ **Upstash Vector search** - Semantic pattern discovery
- ✅ **Context7-compatible** - Same MCP interface
- ✅ **TypeScript-first** - Type-safe implementation

## 📁 Project Structure

```
case7/
├── src/
│   ├── server.ts              # Main MCP server
│   ├── services/
│   │   ├── pattern-loader.ts  # Load patterns from markdown
│   │   ├── vector-service.ts  # Upstash Vector operations
│   │   └── search-service.ts  # Pattern search logic
│   ├── types/
│   │   └── pattern.ts         # TypeScript interfaces
│   └── utils/
│       └── logger.ts          # Logging utility
├── patterns/
│   ├── mobile/
│   │   ├── expo-stripe.md
│   │   └── revenuecat-setup.md
│   ├── web/
│   │   ├── nextjs-stripe.md
│   │   └── supabase-auth.md
│   └── backend/
│       └── openai-api.md
├── scripts/
│   ├── index-patterns.ts     # Index patterns to Upstash
│   └── validate-patterns.ts  # Validate pattern format
├── dist/                     # Compiled JavaScript
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🛠️ Initial Setup

### 1. Project Initialization

```bash
# Create project directory
mkdir case7
cd case7

# Initialize Node.js project
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk @upstash/vector openai gray-matter zod

# Install dev dependencies
npm install -D typescript @types/node tsx nodemon eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier

# Create initial directory structure
mkdir -p src/{services,types,utils} patterns/{mobile,web,backend} scripts dist
```

### 2. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 3. Package Configuration

```json
// package.json
{
  "name": "@yourname/case7-mcp",
  "version": "1.0.0",
  "description": "MCP server for micro product development patterns",
  "main": "dist/server.js",
  "type": "module",
  "bin": {
    "case7": "dist/server.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx --watch src/server.ts",
    "start": "node dist/server.js",
    "index-patterns": "tsx scripts/index-patterns.ts",
    "validate-patterns": "tsx scripts/validate-patterns.ts",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  },
  "keywords": ["mcp", "patterns", "development", "micro-products"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@upstash/vector": "^1.0.0",
    "openai": "^4.0.0",
    "gray-matter": "^4.0.3",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "nodemon": "^3.0.0",
    "prettier": "^3.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 📝 TypeScript Interfaces

### Pattern Types

```typescript
// src/types/pattern.ts
import { z } from 'zod';

// Zod schema for pattern frontmatter validation
export const PatternFrontmatterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.enum(['mobile', 'web', 'backend', 'tools', 'integrations']),
  tags: z.array(z.string()).min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  last_updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tested_versions: z.record(z.string()).optional(),
  estimated_time: z.string().optional(),
  prerequisites: z.array(z.string()).optional()
});

export type PatternFrontmatter = z.infer<typeof PatternFrontmatterSchema>;

export interface Pattern {
  id: string;
  title: string;
  category: string;
  tags: string[];
  difficulty: string;
  lastUpdated: string;
  testedVersions?: Record<string, string>;
  estimatedTime?: string;
  prerequisites?: string[];
  content: string;
  filePath: string;
}

export interface PatternSearchResult {
  id: string;
  title: string;
  category: string;
  tags: string[];
  relevanceScore: number;
  excerpt: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: {
    title: string;
    category: string;
    tags: string[];
  };
}

// MCP Tool Schemas
export const SearchPatternsSchema = z.object({
  query: z.string().min(1).describe('Search query for patterns'),
  category: z.enum(['mobile', 'web', 'backend', 'tools', 'integrations']).optional().describe('Filter by category'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Filter by difficulty'),
  limit: z.number().min(1).max(20).default(5).describe('Maximum number of results')
});

export const GetPatternSchema = z.object({
  id: z.string().min(1).describe('Pattern ID to retrieve'),
  sections: z.array(z.string()).optional().describe('Specific sections to include (e.g., "install", "setup", "usage")'),
  maxTokens: z.number().min(500).max(16000).default(8000).describe('Maximum tokens to return')
});

export type SearchPatternsParams = z.infer<typeof SearchPatternsSchema>;
export type GetPatternParams = z.infer<typeof GetPatternSchema>;
```

## 🔧 Core Implementation

### 1. Pattern Loader Service

```typescript
// src/services/pattern-loader.ts
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { Pattern, PatternFrontmatter, PatternFrontmatterSchema } from '../types/pattern.js';
import { logger } from '../utils/logger.js';

export class PatternLoader {
  private patterns: Map<string, Pattern> = new Map();
  private readonly patternsDir: string;

  constructor(patternsDir: string = './patterns') {
    this.patternsDir = path.resolve(patternsDir);
  }

  async loadAllPatterns(): Promise<Pattern[]> {
    logger.info('Loading patterns from', this.patternsDir);

    this.patterns.clear();
    await this.loadPatternsFromDirectory(this.patternsDir);

    const patternArray = Array.from(this.patterns.values());
    logger.info(`Loaded ${patternArray.length} patterns`);

    return patternArray;
  }

  private async loadPatternsFromDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.loadPatternsFromDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          await this.loadPattern(fullPath);
        }
      }
    } catch (error) {
      logger.error('Error loading patterns from directory:', dirPath, error);
    }
  }

  private async loadPattern(filePath: string): Promise<void> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);

      // Validate frontmatter
      const validatedFrontmatter = PatternFrontmatterSchema.parse(frontmatter);

      // Determine category from file path if not in frontmatter
      const category = validatedFrontmatter.category || this.getCategoryFromPath(filePath);

      const pattern: Pattern = {
        id: validatedFrontmatter.id,
        title: validatedFrontmatter.title,
        category,
        tags: validatedFrontmatter.tags,
        difficulty: validatedFrontmatter.difficulty,
        lastUpdated: validatedFrontmatter.last_updated,
        testedVersions: validatedFrontmatter.tested_versions,
        estimatedTime: validatedFrontmatter.estimated_time,
        prerequisites: validatedFrontmatter.prerequisites,
        content: content.trim(),
        filePath
      };

      this.patterns.set(pattern.id, pattern);
      logger.debug(`Loaded pattern: ${pattern.id}`);

    } catch (error) {
      logger.error(`Error loading pattern from ${filePath}:`, error);
    }
  }

  private getCategoryFromPath(filePath: string): string {
    const pathParts = filePath.split(path.sep);
    const patternsIndex = pathParts.findIndex(part => part === 'patterns');

    if (patternsIndex !== -1 && patternsIndex < pathParts.length - 1) {
      return pathParts[patternsIndex + 1];
    }

    return 'general';
  }

  getPattern(id: string): Pattern | undefined {
    return this.patterns.get(id);
  }

  getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  getPatternsByCategory(category: string): Pattern[] {
    return this.getAllPatterns().filter(pattern => pattern.category === category);
  }

  getPatternsByTag(tag: string): Pattern[] {
    return this.getAllPatterns().filter(pattern =>
      pattern.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }
}
```

### 2. Vector Service (Upstash Integration)

```typescript
// src/services/vector-service.ts
import { Index } from '@upstash/vector';
import OpenAI from 'openai';
import { Pattern, VectorSearchResult } from '../types/pattern.js';
import { logger } from '../utils/logger.js';

export class VectorService {
  private index: Index;
  private openai: OpenAI;

  constructor() {
    if (!process.env.UPSTASH_VECTOR_URL || !process.env.UPSTASH_VECTOR_TOKEN) {
      throw new Error('UPSTASH_VECTOR_URL and UPSTASH_VECTOR_TOKEN environment variables are required');
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.index = new Index({
      url: process.env.UPSTASH_VECTOR_URL,
      token: process.env.UPSTASH_VECTOR_TOKEN
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });

      return response.data[0]?.embedding || [];
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  async indexPattern(pattern: Pattern): Promise<void> {
    try {
      // Create searchable text from pattern
      const searchText = this.createSearchText(pattern);

      // Generate embedding
      const embedding = await this.generateEmbedding(searchText);

      // Upsert to Upstash Vector
      await this.index.upsert({
        id: pattern.id,
        vector: embedding,
        metadata: {
          title: pattern.title,
          category: pattern.category,
          tags: pattern.tags,
          difficulty: pattern.difficulty
        }
      });

      logger.debug(`Indexed pattern: ${pattern.id}`);
    } catch (error) {
      logger.error(`Error indexing pattern ${pattern.id}:`, error);
      throw error;
    }
  }

  async indexPatterns(patterns: Pattern[]): Promise<void> {
    logger.info(`Indexing ${patterns.length} patterns...`);

    const batchSize = 10;
    for (let i = 0; i < patterns.length; i += batchSize) {
      const batch = patterns.slice(i, i + batchSize);

      await Promise.all(
        batch.map(pattern => this.indexPattern(pattern))
      );

      logger.info(`Indexed ${Math.min(i + batchSize, patterns.length)}/${patterns.length} patterns`);

      // Small delay to avoid rate limiting
      if (i + batchSize < patterns.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('Pattern indexing completed');
  }

  async searchSimilar(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in Upstash Vector
      const results = await this.index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true
      });

      return results.map(result => ({
        id: result.id as string,
        score: result.score || 0,
        metadata: result.metadata as any
      }));
    } catch (error) {
      logger.error('Error searching patterns:', error);
      return [];
    }
  }

  async deletePattern(id: string): Promise<void> {
    try {
      await this.index.delete(id);
      logger.debug(`Deleted pattern from index: ${id}`);
    } catch (error) {
      logger.error(`Error deleting pattern ${id}:`, error);
      throw error;
    }
  }

  async clearIndex(): Promise<void> {
    try {
      await this.index.reset();
      logger.info('Vector index cleared');
    } catch (error) {
      logger.error('Error clearing index:', error);
      throw error;
    }
  }

  private createSearchText(pattern: Pattern): string {
    const parts = [
      pattern.title,
      pattern.category,
      ...pattern.tags,
      pattern.difficulty,
      pattern.content.replace(/```[\s\S]*?```/g, ''), // Remove code blocks
      ...(pattern.prerequisites || [])
    ];

    return parts.join(' ').toLowerCase();
  }
}
```

### 3. Search Service

```typescript
// src/services/search-service.ts
import { Pattern, PatternSearchResult } from '../types/pattern.js';
import { PatternLoader } from './pattern-loader.js';
import { VectorService } from './vector-service.js';
import { logger } from '../utils/logger.js';

export class SearchService {
  constructor(
    private patternLoader: PatternLoader,
    private vectorService: VectorService
  ) {}

  async searchPatterns(
    query: string,
    options: {
      category?: string;
      difficulty?: string;
      limit?: number;
    } = {}
  ): Promise<PatternSearchResult[]> {
    const { category, difficulty, limit = 5 } = options;

    try {
      // Get vector search results
      const vectorResults = await this.vectorService.searchSimilar(query, limit * 2);

      // Get all patterns for filtering and keyword matching
      const allPatterns = this.patternLoader.getAllPatterns();

      // Apply filters
      let filteredPatterns = allPatterns;

      if (category) {
        filteredPatterns = filteredPatterns.filter(p => p.category === category);
      }

      if (difficulty) {
        filteredPatterns = filteredPatterns.filter(p => p.difficulty === difficulty);
      }

      // Combine vector results with keyword matching
      const results = new Map<string, PatternSearchResult>();

      // Add vector search results
      for (const vectorResult of vectorResults) {
        const pattern = filteredPatterns.find(p => p.id === vectorResult.id);
        if (pattern) {
          results.set(pattern.id, {
            id: pattern.id,
            title: pattern.title,
            category: pattern.category,
            tags: pattern.tags,
            relevanceScore: vectorResult.score,
            excerpt: this.createExcerpt(pattern.content, query)
          });
        }
      }

      // Add keyword matches for remaining patterns
      const keywordMatches = this.performKeywordSearch(
        filteredPatterns.filter(p => !results.has(p.id)),
        query
      );

      for (const match of keywordMatches) {
        if (results.size < limit) {
          results.set(match.id, match);
        }
      }

      // Sort by relevance score and return top results
      return Array.from(results.values())
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error searching patterns:', error);
      return [];
    }
  }

  private performKeywordSearch(patterns: Pattern[], query: string): PatternSearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);

    return patterns
      .map(pattern => {
        const searchText = `${pattern.title} ${pattern.tags.join(' ')} ${pattern.content}`.toLowerCase();

        let score = 0;
        for (const term of queryTerms) {
          // Title matches are weighted higher
          if (pattern.title.toLowerCase().includes(term)) {
            score += 3;
          }

          // Tag matches
          if (pattern.tags.some(tag => tag.toLowerCase().includes(term))) {
            score += 2;
          }

          // Content matches
          const contentMatches = (searchText.match(new RegExp(term, 'g')) || []).length;
          score += contentMatches * 0.5;
        }

        return {
          id: pattern.id,
          title: pattern.title,
          category: pattern.category,
          tags: pattern.tags,
          relevanceScore: score,
          excerpt: this.createExcerpt(pattern.content, query)
        };
      })
      .filter(result => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private createExcerpt(content: string, query: string, maxLength: number = 200): string {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

    // Find sentence with most query terms
    let bestSentence = sentences[0] || '';
    let bestScore = 0;

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const score = queryTerms.reduce((acc, term) => {
        return acc + (sentenceLower.includes(term) ? 1 : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    }

    // Truncate if too long
    if (bestSentence.length > maxLength) {
      bestSentence = bestSentence.substring(0, maxLength - 3) + '...';
    }

    return bestSentence;
  }
}
```

### 4. Main MCP Server

```typescript
// src/server.ts
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PatternLoader } from './services/pattern-loader.js';
import { VectorService } from './services/vector-service.js';
import { SearchService } from './services/search-service.js';
import { SearchPatternsSchema, GetPatternSchema } from './types/pattern.js';
import { logger } from './utils/logger.js';

class case7Server {
  private server: Server;
  private patternLoader: PatternLoader;
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

    this.patternLoader = new PatternLoader();
    this.vectorService = new VectorService();
    this.searchService = new SearchService(this.patternLoader, this.vectorService);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'search-patterns',
          description: 'Search for development patterns based on query, category, or difficulty',
          inputSchema: SearchPatternsSchema
        },
        {
          name: 'get-pattern',
          description: 'Retrieve a specific pattern by ID with optional section filtering',
          inputSchema: GetPatternSchema
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = CallToolRequestSchema.parse(request.params);

      try {
        switch (name) {
          case 'search-patterns':
            return await this.handleSearchPatterns(SearchPatternsSchema.parse(args));

          case 'get-pattern':
            return await this.handleGetPattern(GetPatternSchema.parse(args));

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

  private async handleSearchPatterns(params: any) {
    const results = await this.searchService.searchPatterns(params.query, {
      category: params.category,
      difficulty: params.difficulty,
      limit: params.limit
    });

    const response = {
      query: params.query,
      total_results: results.length,
      patterns: results.map(result => ({
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

  private async handleGetPattern(params: any) {
    const pattern = this.patternLoader.getPattern(params.id);

    if (!pattern) {
      return {
        content: [{
          type: 'text',
          text: `Pattern with ID "${params.id}" not found.`
        }],
        isError: true
      };
    }

    let content = pattern.content;

    // Filter sections if requested
    if (params.sections && params.sections.length > 0) {
      content = this.filterPatternSections(pattern.content, params.sections);
    }

    // Truncate if too long (rough token estimation: 1 token ≈ 4 characters)
    const maxChars = params.maxTokens * 4;
    if (content.length > maxChars) {
      content = content.substring(0, maxChars) + '\n\n[Content truncated due to token limit...]';
    }

    // Include metadata
    const response = {
      id: pattern.id,
      title: pattern.title,
      category: pattern.category,
      tags: pattern.tags,
      difficulty: pattern.difficulty,
      last_updated: pattern.lastUpdated,
      tested_versions: pattern.testedVersions,
      estimated_time: pattern.estimatedTime,
      prerequisites: pattern.prerequisites,
      content: content
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private filterPatternSections(content: string, sections: string[]): string {
    const lines = content.split('\n');
    const filteredLines: string[] = [];
    let currentSection = '';
    let includeSection = false;

    for (const line of lines) {
      // Check if line is a header
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

      // Load patterns
      await this.patternLoader.loadAllPatterns();

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

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new case7Server();

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

export { case7Server };
```

### 5. Logger Utility

```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', ...args));
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', ...args));
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', ...args));
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', ...args));
    }
  }
}

export const logger = new Logger();
```

## 🗂️ Scripts

### 1. Pattern Indexing Script

```typescript
// scripts/index-patterns.ts
import 'dotenv/config';
import { PatternLoader } from '../src/services/pattern-loader.js';
import { VectorService } from '../src/services/vector-service.js';
import { logger } from '../src/utils/logger.js';

async function indexPatterns() {
  try {
    logger.info('Starting pattern indexing...');

    const patternLoader = new PatternLoader();
    const vectorService = new VectorService();

    // Load all patterns
    const patterns = await patternLoader.loadAllPatterns();

    if (patterns.length === 0) {
      logger.warn('No patterns found to index');
      return;
    }

    // Clear existing index (optional)
    const shouldClearIndex = process.argv.includes('--clear');
    if (shouldClearIndex) {
      logger.info('Clearing existing index...');
      await vectorService.clearIndex();
    }

    // Index patterns
    await vectorService.indexPatterns(patterns);

    logger.info(`Successfully indexed ${patterns.length} patterns`);
  } catch (error) {
    logger.error('Error indexing patterns:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  indexPatterns();
}
```

### 2. Pattern Validation Script

```typescript
// scripts/validate-patterns.ts
import { PatternLoader } from '../src/services/pattern-loader.js';
import { PatternFrontmatterSchema } from '../src/types/pattern.js';
import { logger } from '../src/utils/logger.js';

async function validatePatterns() {
  try {
    logger.info('Validating patterns...');

    const patternLoader = new PatternLoader();
    const patterns = await patternLoader.loadAllPatterns();

    let validCount = 0;
    let errorCount = 0;

    for (const pattern of patterns) {
      try {
        // Validate frontmatter
        PatternFrontmatterSchema.parse({
          id: pattern.id,
          title: pattern.title,
          category: pattern.category,
          tags: pattern.tags,
          difficulty: pattern.difficulty,
          last_updated: pattern.lastUpdated,
          tested_versions: pattern.testedVersions,
          estimated_time: pattern.estimatedTime,
          prerequisites: pattern.prerequisites
        });

        // Check for required content sections
        const requiredSections = ['install', 'setup', 'usage'];
        const content = pattern.content.toLowerCase();
        const missingSections = requiredSections.filter(section =>
          !content.includes(`## ${section}`) && !content.includes(`# ${section}`)
        );

        if (missingSections.length > 0) {
          logger.warn(`Pattern ${pattern.id} missing sections: ${missingSections.join(', ')}`);
        }

        validCount++;
        logger.debug(`✓ Pattern ${pattern.id} is valid`);
      } catch (error) {
        errorCount++;
        logger.error(`✗ Pattern ${pattern.id} validation failed:`, error);
      }
    }

    logger.info(`Validation complete: ${validCount} valid, ${errorCount} errors`);

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Error validating patterns:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validatePatterns();
}
```

## 📝 Pattern Format Template

```markdown
<!-- patterns/web/nextjs-stripe.md -->
---
id: nextjs-stripe-checkout
title: Next.js + Stripe Checkout Integration
category: web
tags: [nextjs, stripe, payments, checkout, web]
difficulty: intermediate
last_updated: 2025-01-15
tested_versions:
  nextjs: "14.x"
  stripe: "14.x"
  "@stripe/stripe-js": "2.x"
estimated_time: "2 hours"
prerequisites:
  - "Next.js project setup"
  - "Stripe account with API keys"
---

# Next.js + Stripe Checkout Integration

Complete integration of Stripe Checkout in a Next.js application with TypeScript.

## Install

```bash
npm install stripe @stripe/stripe-js
npm install -D @types/stripe
```

## Setup

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Configuration

```typescript
// lib/stripe.ts
import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
```

## Usage

### Create Checkout Session

```typescript
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { priceId, successUrl, cancelUrl } = await request.json();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}
```

### Checkout Component

```typescript
// components/CheckoutButton.tsx
'use client';

import { useState } from 'react';
import { stripePromise } from '@/lib/stripe';

interface CheckoutButtonProps {
  priceId: string;
  children: React.ReactNode;
}

export function CheckoutButton({ priceId, children }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/cancel`,
        }),
      });

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Processing...' : children}
    </button>
  );
}
```

## Common Issues

### CORS Errors
- Ensure API routes are properly configured
- Check domain settings in Stripe dashboard

### Webhook Verification
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks`
- Verify webhook signatures in production

### TypeScript Errors
- Install `@types/stripe` for proper typing
- Use Stripe's TypeScript definitions

## Testing

```bash
# Test with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks

# Use test card numbers
# Success: 4242424242424242
# Decline: 4000000000000002
```
```

## 🌍 Environment Configuration

```bash
# .env.example
# Upstash Vector Configuration
UPSTASH_VECTOR_URL=https://your-vector-url.upstash.io
UPSTASH_VECTOR_TOKEN=your_vector_token

# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Logging
LOG_LEVEL=info

# Optional: Pattern directory path
PATTERNS_DIR=./patterns
```

## 🚀 Development Workflow

### Initial Setup

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd case7
npm install
```

2. **Setup environment:**
```bash
cp .env.example .env
# Fill in your API keys
```

3. **Create first patterns:**
```bash
mkdir -p patterns/web
# Create patterns/web/example.md following the template
```

4. **Validate patterns:**
```bash
npm run validate-patterns
```

5. **Index patterns:**
```bash
npm run index-patterns
```

6. **Start development server:**
```bash
npm run dev
```

### Adding New Patterns

1. Create markdown file in appropriate category directory
2. Follow the pattern template format
3. Validate: `npm run validate-patterns`
4. Re-index: `npm run index-patterns`
5. Test with MCP client

### Testing

```bash
# Run the MCP server
npm start

# In another terminal, test with MCP client or configure in AI tool
```

## 📦 Build and Deployment

### Build for Production

```bash
npm run build
npm start
```

### Package as NPM Module

```bash
npm pack
# Or publish to npm
npm publish --access public
```

### Deploy to Railway/Fly.io

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY patterns/ ./patterns/

CMD ["npm", "start"]
```

## 🧪 Testing the Implementation

### MCP Client Configuration

```json
// Cursor: ~/.cursor/mcp.json
{
  "mcpServers": {
    "case7": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/path/to/case7",
      "env": {
        "UPSTASH_VECTOR_URL": "your_url",
        "UPSTASH_VECTOR_TOKEN": "your_token",
        "OPENAI_API_KEY": "your_key"
      }
    }
  }
}
```

### Test Queries

```
"I need to add Stripe payments to my Next.js app. use case7"
"How do I setup Expo with RevenueCat? use case7"
"Show me Supabase auth patterns. use case7"
```

---

This technical documentation provides a complete implementation guide for building case7 as a Context7-style MCP server using Node.js, TypeScript, and Upstash Vector. The architecture is modular, type-safe, and follows best practices for production deployment.
