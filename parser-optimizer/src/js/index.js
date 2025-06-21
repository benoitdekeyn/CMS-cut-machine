import '../css/style.css';
import { DataManager } from './data-manager.js';
import { UIController } from './ui-controller.js';
import { AlgorithmService } from './algorithm-service.js';
import { ResultsRenderer } from './results-renderer.js';
import { solveGreedyFFD } from './algorithms/First-Fit-Decreasing.js';
import { solveWithILP } from './algorithms/Integer-Linear-Programming.js';

// Export algorithms for the algorithm service
export const algorithms = {
  solveGreedyFFD,
  solveWithILP
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
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
    data
  });
  
  // Expose data for debugging
  if (process.env.NODE_ENV !== 'production') {
    window.appData = data;
    window.debug = {
      dataManager,
      algorithmService,
      resultsRenderer,
      uiController: UIController
    };
  }
});