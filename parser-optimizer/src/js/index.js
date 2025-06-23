// Importer les fichiers CSS
import '../css/base.css';
import '../css/layout.css';
import '../css/components.css';
import '../css/sections.css';

// Importer tous les modules nécessaires
import { DataManager } from './data-manager.js';
import { UIController } from './ui-controller.js';
import { AlgorithmService } from './algorithm-service.js';
import { ResultsRenderer } from './results-renderer.js';
import { Parser } from './parser.js';
import { ImportManager } from './import-manager.js';
import { PgmGenerator } from './pgm-generator.js';

// Importer les algorithmes
import { solveGreedyFFD } from './algorithms/First-Fit-Decreasing.js';
import { solveWithILP } from './algorithms/Integer-Linear-Programming.js';

// Export algorithms for the algorithm service
export const algorithms = {
  solveGreedyFFD,
  solveWithILP
};

// Export parser for the import manager
export { Parser };

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Parser Optimizer');
  
  // Initialize services
  const dataManager = DataManager;
  const algorithmService = AlgorithmService;
  const resultsRenderer = ResultsRenderer;
  
  // Initialize data
  const data = dataManager.initData();
  
  // Initialize UI with dependencies
  UIController.init({
    dataManager,
    algorithmService,
    resultsRenderer,
    importManager: ImportManager,
    pgmGenerator: PgmGenerator,
    data
  });
  
  // Expose data for debugging
  if (process.env.NODE_ENV !== 'production') {
    window.appData = data;
    window.debug = {
      dataManager,
      algorithmService,
      resultsRenderer,
      uiController: UIController,
      importManager: ImportManager
    };
  }
});