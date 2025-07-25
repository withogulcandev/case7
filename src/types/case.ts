import { z } from 'zod';

export const CaseFrontmatterSchema = z.object({
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

export type CaseFrontmatter = z.infer<typeof CaseFrontmatterSchema>;

export interface Case {
  id: string;
  title: string;
  category: string;
  tags: string[];
  difficulty: string;
  lastUpdated: string;
  testedVersions?: Record<string, string> | undefined;
  estimatedTime?: string | undefined;
  prerequisites?: string[] | undefined;
  content: string;
  filePath: string;
}

export interface CaseSearchResult {
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

export const SearchCasesSchema = z.object({
  query: z.string().min(1).describe('Search query for cases'),
  category: z.enum(['mobile', 'web', 'backend', 'tools', 'integrations']).optional().describe('Filter by category'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Filter by difficulty'),
  limit: z.number().min(1).max(20).default(5).describe('Maximum number of results')
});

export const GetCaseSchema = z.object({
  id: z.string().min(1).describe('Case ID to retrieve'),
  sections: z.array(z.string()).optional().describe('Specific sections to include (e.g., "install", "setup", "usage")'),
  maxTokens: z.number().min(500).max(16000).default(8000).describe('Maximum tokens to return')
});

export type SearchCasesParams = z.infer<typeof SearchCasesSchema>;
export type GetCaseParams = z.infer<typeof GetCaseSchema>;