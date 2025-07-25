import 'dotenv/config';
import { CaseLoader } from '../src/services/case-loader.js';
import { VectorService } from '../src/services/vector-service.js';
import { logger } from '../src/utils/logger.js';

async function indexCases() {
  try {
    logger.info('Starting case indexing...');

    const caseLoader = new CaseLoader();
    const vectorService = new VectorService();

    const cases = await caseLoader.loadAllCases();

    if (cases.length === 0) {
      logger.warn('No cases found to index');
      return;
    }

    const shouldClearIndex = process.argv.includes('--clear');
    if (shouldClearIndex) {
      logger.info('Clearing existing index...');
      await vectorService.clearIndex();
    }

    await vectorService.indexCases(cases);

    logger.info(`Successfully indexed ${cases.length} cases`);
  } catch (error) {
    logger.error('Error indexing cases:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  indexCases();
}