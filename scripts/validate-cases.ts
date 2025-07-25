import { CaseLoader } from '../src/services/case-loader.js';
import { CaseFrontmatterSchema } from '../src/types/case.js';
import { logger } from '../src/utils/logger.js';

async function validateCases() {
  try {
    logger.info('Validating cases...');

    const caseLoader = new CaseLoader();
    const cases = await caseLoader.loadAllCases();

    let validCount = 0;
    let errorCount = 0;

    for (const caseItem of cases) {
      try {
        CaseFrontmatterSchema.parse({
          id: caseItem.id,
          title: caseItem.title,
          category: caseItem.category,
          tags: caseItem.tags,
          difficulty: caseItem.difficulty,
          last_updated: caseItem.lastUpdated,
          tested_versions: caseItem.testedVersions,
          estimated_time: caseItem.estimatedTime,
          prerequisites: caseItem.prerequisites
        });

        const requiredSections = ['install', 'setup', 'usage'];
        const content = caseItem.content.toLowerCase();
        const missingSections = requiredSections.filter(section =>
          !content.includes(`## ${section}`) && !content.includes(`# ${section}`)
        );

        if (missingSections.length > 0) {
          logger.warn(`Case ${caseItem.id} missing sections: ${missingSections.join(', ')}`);
        }

        validCount++;
        logger.debug(`✓ Case ${caseItem.id} is valid`);
      } catch (error) {
        errorCount++;
        logger.error(`✗ Case ${caseItem.id} validation failed:`, error);
      }
    }

    logger.info(`Validation complete: ${validCount} valid, ${errorCount} errors`);

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Error validating cases:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateCases();
}