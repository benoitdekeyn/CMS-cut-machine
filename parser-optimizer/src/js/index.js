// Importer les fichiers CSS
import '../css/fonts.css';     // NOUVEAU: Importer en premier
import '../css/base.css';
import '../css/layout.css';
import '../css/components.css';
import '../css/sections.css';
import '../css/spinner.css';

// Importer tous les modules nécessaires
import { UIUtils} from './ui/utils.js';
import { DataManager } from './data-manager.js';
import { UIController } from './ui-controller.js';
import { AlgorithmService } from './algorithm-service.js';
import { ResultsRenderer } from './results-renderer.js';
import { Parser } from './parser.js';
import { ImportManager } from './import-manager.js';
import { F4CGenerator } from './F4C-generator.js';
import { F4CManager } from './F4C-manager.js';

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

// NOUVEAU: Initialiser le thème très tôt
function initializeEarlyTheme() {
  // MODIFIÉ: Ne plus utiliser localStorage, toujours partir du système
  const html = document.documentElement;
  
  // Supprimer toutes les classes de thème existantes
  html.classList.remove('dark-theme', 'light-theme');
  
  // Appliquer le thème selon les préférences système
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    html.classList.add('dark-theme');
    console.log('🌙 Thème système: dark');
  } else {
    html.classList.add('light-theme');
    console.log('☀️ Thème système: light');
  }
}

// Initialiser le thème avant même le DOM
initializeEarlyTheme();

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
    F4CManager,
    F4CGenerator, // Ajouter le F4C-Generator pour le debug
    UIController
  };
}