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
import { PgmManager } from './pgm-manager.js';

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

// Initialiser l'application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Chargement de l\'application...');
  
  try {
    await UIController.init();
    console.log('✅ Application prête');
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
  }
});

// Exposer certains modules pour le debug en développement
if (process.env.NODE_ENV === 'development') {
  window.DEBUG = {
    DataManager,
    AlgorithmService,
    PgmManager,
    UIController
  };
}