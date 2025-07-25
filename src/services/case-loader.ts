import { readdir, readFile } from 'fs/promises';
import { resolve, join, sep } from 'path';
import matter from 'gray-matter';
import { Case, CaseFrontmatter, CaseFrontmatterSchema } from '../types/case.js';
import { logger } from '../utils/logger.js';

export class CaseLoader {
  private cases: Map<string, Case> = new Map();
  private readonly casesDir: string;

  constructor(casesDir: string = './cases') {
    this.casesDir = resolve(casesDir);
  }

  async loadAllCases(): Promise<Case[]> {
    logger.info('Loading cases from', this.casesDir);

    this.cases.clear();
    await this.loadCasesFromDirectory(this.casesDir);

    const caseArray = Array.from(this.cases.values());
    logger.info(`Loaded ${caseArray.length} cases`);

    return caseArray;
  }

  private async loadCasesFromDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.loadCasesFromDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          await this.loadCase(fullPath);
        }
      }
    } catch (error) {
      logger.error('Error loading cases from directory:', dirPath, error);
    }
  }

  private async loadCase(filePath: string): Promise<void> {
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);

      const validatedFrontmatter = CaseFrontmatterSchema.parse(frontmatter);

      const category = validatedFrontmatter.category || this.getCategoryFromPath(filePath);

      const caseItem: Case = {
        id: validatedFrontmatter.id,
        title: validatedFrontmatter.title,
        category,
        tags: validatedFrontmatter.tags,
        difficulty: validatedFrontmatter.difficulty,
        lastUpdated: validatedFrontmatter.last_updated,
        testedVersions: validatedFrontmatter.tested_versions || undefined,
        estimatedTime: validatedFrontmatter.estimated_time || undefined,
        prerequisites: validatedFrontmatter.prerequisites || undefined,
        content: content.trim(),
        filePath
      };

      this.cases.set(caseItem.id, caseItem);
      logger.debug(`Loaded case: ${caseItem.id}`);

    } catch (error) {
      logger.error(`Error loading case from ${filePath}:`, error);
    }
  }

  private getCategoryFromPath(filePath: string): 'mobile' | 'web' | 'backend' | 'tools' | 'integrations' {
    const pathParts = filePath.split(sep);
    const casesIndex = pathParts.findIndex(part => part === 'cases');

    if (casesIndex !== -1 && casesIndex < pathParts.length - 1) {
      const category = pathParts[casesIndex + 1];
      if (category && ['mobile', 'web', 'backend', 'tools', 'integrations'].includes(category)) {
        return category as 'mobile' | 'web' | 'backend' | 'tools' | 'integrations';
      }
    }

    return 'tools';
  }

  getCase(id: string): Case | undefined {
    return this.cases.get(id);
  }

  getAllCases(): Case[] {
    return Array.from(this.cases.values());
  }

  getCasesByCategory(category: string): Case[] {
    return this.getAllCases().filter(caseItem => caseItem.category === category);
  }

  getCasesByTag(tag: string): Case[] {
    return this.getAllCases().filter(caseItem =>
      caseItem.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }
}