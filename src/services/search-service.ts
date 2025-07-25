import { Case, CaseSearchResult } from '../types/case.js';
import { CaseLoader } from './case-loader.js';
import { VectorService } from './vector-service.js';
import { logger } from '../utils/logger.js';

export class SearchService {
  constructor(
    private caseLoader: CaseLoader,
    private vectorService: VectorService
  ) {}

  async searchCases(
    query: string,
    options: {
      category?: string;
      difficulty?: string;
      limit?: number;
    } = {}
  ): Promise<CaseSearchResult[]> {
    const { category, difficulty, limit = 5 } = options;

    try {
      const vectorResults = await this.vectorService.searchSimilar(query, limit * 2);

      const allCases = this.caseLoader.getAllCases();

      let filteredCases = allCases;

      if (category) {
        filteredCases = filteredCases.filter(c => c.category === category);
      }

      if (difficulty) {
        filteredCases = filteredCases.filter(c => c.difficulty === difficulty);
      }

      const results = new Map<string, CaseSearchResult>();

      for (const vectorResult of vectorResults) {
        const caseItem = filteredCases.find(c => c.id === vectorResult.id);
        if (caseItem) {
          results.set(caseItem.id, {
            id: caseItem.id,
            title: caseItem.title,
            category: caseItem.category,
            tags: caseItem.tags,
            relevanceScore: vectorResult.score,
            excerpt: this.createExcerpt(caseItem.content, query)
          });
        }
      }

      const keywordMatches = this.performKeywordSearch(
        filteredCases.filter(c => !results.has(c.id)),
        query
      );

      for (const match of keywordMatches) {
        if (results.size < limit) {
          results.set(match.id, match);
        }
      }

      return Array.from(results.values())
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error searching cases:', error);
      return [];
    }
  }

  private performKeywordSearch(cases: Case[], query: string): CaseSearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);

    return cases
      .map(caseItem => {
        const searchText = `${caseItem.title} ${caseItem.tags.join(' ')} ${caseItem.content}`.toLowerCase();

        let score = 0;
        for (const term of queryTerms) {
          if (caseItem.title.toLowerCase().includes(term)) {
            score += 3;
          }

          if (caseItem.tags.some(tag => tag.toLowerCase().includes(term))) {
            score += 2;
          }

          const contentMatches = (searchText.match(new RegExp(term, 'g')) || []).length;
          score += contentMatches * 0.5;
        }

        return {
          id: caseItem.id,
          title: caseItem.title,
          category: caseItem.category,
          tags: caseItem.tags,
          relevanceScore: score,
          excerpt: this.createExcerpt(caseItem.content, query)
        };
      })
      .filter(result => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private createExcerpt(content: string, query: string, maxLength: number = 200): string {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

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

    if (bestSentence.length > maxLength) {
      bestSentence = bestSentence.substring(0, maxLength - 3) + '...';
    }

    return bestSentence;
  }
}