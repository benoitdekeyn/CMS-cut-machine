import '../css/style.css';
import { DataManager } from './data-manager.js';
import { UIComponents } from './ui-components.js';
import { AlgorithmHandler } from './algorithm-handler.js';
import { solveGreedyFFD } from './algorithms/First-Fit-Decreasing.js';
import { solveWithILP } from './algorithms/Integer-Linear-Programming.js';

// Exporter les algorithmes pour le gestionnaire d'algorithmes
export const algorithms = {
  solveGreedyFFD,
  solveWithILP
};

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  // Initialiser le DataManager avec des données vides
  const data = DataManager.initData();
  
  // Initialiser l'interface utilisateur
  UIComponents.init(data);
  
  // Exposer les données pour le débogage
  window.appData = data;
});