import { Index } from '@upstash/vector';
import OpenAI from 'openai';
import { Case, VectorSearchResult } from '../types/case.js';
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

  async indexCase(caseItem: Case): Promise<void> {
    try {
      const searchText = this.createSearchText(caseItem);

      const embedding = await this.generateEmbedding(searchText);

      await this.index.upsert({
        id: caseItem.id,
        vector: embedding,
        metadata: {
          title: caseItem.title,
          category: caseItem.category,
          tags: caseItem.tags,
          difficulty: caseItem.difficulty
        }
      });

      logger.debug(`Indexed case: ${caseItem.id}`);
    } catch (error) {
      logger.error(`Error indexing case ${caseItem.id}:`, error);
      throw error;
    }
  }

  async indexCases(cases: Case[]): Promise<void> {
    logger.info(`Indexing ${cases.length} cases...`);

    const batchSize = 10;
    for (let i = 0; i < cases.length; i += batchSize) {
      const batch = cases.slice(i, i + batchSize);

      await Promise.all(
        batch.map(caseItem => this.indexCase(caseItem))
      );

      logger.info(`Indexed ${Math.min(i + batchSize, cases.length)}/${cases.length} cases`);

      if (i + batchSize < cases.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('Case indexing completed');
  }

  async searchSimilar(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

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
      logger.error('Error searching cases:', error);
      return [];
    }
  }

  async deleteCase(id: string): Promise<void> {
    try {
      await this.index.delete(id);
      logger.debug(`Deleted case from index: ${id}`);
    } catch (error) {
      logger.error(`Error deleting case ${id}:`, error);
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

  private createSearchText(caseItem: Case): string {
    const parts = [
      caseItem.title,
      caseItem.category,
      ...caseItem.tags,
      caseItem.difficulty,
      caseItem.content.replace(/```[\s\S]*?```/g, ''),
      ...(caseItem.prerequisites || [])
    ];

    return parts.join(' ').toLowerCase();
  }
}