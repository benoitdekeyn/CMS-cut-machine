/**
 * Contrôleur d'interface utilisateur principal
 * Coordonne les différentes sections et services
 */
import { ImportHandler } from './ui/import-handler.js';
import { EditHandler } from './ui/edit-handler.js';
import { ResultsHandler } from './ui/results-handler.js';
import { NotificationService } from './ui/notification-service.js';
import { UIUtils } from './ui/utils.js';

export const UIController = {
  // Références aux services
  dataManager: null,
  algorithmService: null,
  resultsRenderer: null,
  importManager: null,
  pgmGenerator: null,
  
  // Handlers de sections
  importHandler: null,
  editHandler: null,
  resultsHandler: null,
  
  // Services UI
  notificationService: null,
  
  /**
   * Initialise le contrôleur UI avec les dépendances
   * @param {Object} options - Options d'initialisation
   */
  init: function(options) {
    // Stocke les références aux services
    this.dataManager = options.dataManager;
    this.algorithmService = options.algorithmService;
    this.resultsRenderer = options.resultsRenderer;
    this.importManager = options.importManager;
    this.pgmGenerator = options.pgmGenerator;
    
    // Initialiser les services UI
    this.notificationService = NotificationService;
    this.notificationService.init();
    
    // Initialiser les handlers de sections
    this.importHandler = ImportHandler;
    this.importHandler.init({
      dataManager: this.dataManager,
      importManager: this.importManager,
      showNotification: this.notificationService.show.bind(this.notificationService),
      navigateToSection: this.navigateToSection.bind(this)
    });
    
    this.editHandler = EditHandler;
    this.editHandler.init({
      dataManager: this.dataManager,
      showNotification: this.notificationService.show.bind(this.notificationService)
    });
    
    this.resultsHandler = ResultsHandler;
    this.resultsHandler.init({
      pgmGenerator: this.pgmGenerator,
      dataManager: this.dataManager,
      showNotification: this.notificationService.show.bind(this.notificationService)
    });
    
    // Initialiser les gestionnaires d'événements
    this.initEventHandlers();
  },
  
  /**
   * Initialise tous les gestionnaires d'événements de navigation
   */
  initEventHandlers: function() {
    // Navigation entre sections
    document.querySelectorAll('.nav-btn').forEach(button => {
      button.addEventListener('click', () => {
        const sectionId = button.getAttribute('data-section');
        this.navigateToSection(sectionId);
      });
    });
    
    // Boutons d'optimisation
    document.getElementById('run-ffd-btn').addEventListener('click', () => this.runOptimization('ffd'));
    document.getElementById('run-ilp-btn').addEventListener('click', () => this.runOptimization('ilp'));
    document.getElementById('run-compare-btn').addEventListener('click', () => this.runOptimization('compare'));
    
    // Bouton de retour à l'édition
    document.getElementById('back-to-edit-btn').addEventListener('click', () => this.navigateToSection('edit-section'));
    
    // Bouton pour importer plus de fichiers
    document.getElementById('import-more-btn').addEventListener('click', () => this.navigateToSection('import-section'));
    
    // Bouton de téléchargement de tous les PGM
    document.getElementById('download-all-pgm').addEventListener('click', () => this.resultsHandler.downloadAllPgm());
  },
  
  /**
   * Affiche la section spécifiée
   * @param {string} sectionId - ID de la section à afficher
   */
  navigateToSection: function(sectionId) {
    // Masquer les erreurs d'import lors du changement de section
    if (this.importHandler) this.importHandler.hideError();
    
    // Mettre à jour les boutons de navigation
    document.querySelectorAll('.nav-btn').forEach(button => {
      if (button.getAttribute('data-section') === sectionId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Afficher la section correspondante
    document.querySelectorAll('.content-section').forEach(section => {
      if (section.id === sectionId) {
        section.classList.add('active');
        
        // Si c'est la section d'édition, mettre à jour le rendu
        if (sectionId === 'edit-section' && this.editHandler) {
          this.editHandler.renderSection();
        }
      } else {
        section.classList.remove('active');
      }
    });
  },
  
  /**
   * Exécute l'algorithme d'optimisation
   * @param {string} type - Type d'algorithme ('ffd', 'ilp', 'compare')
   */
  runOptimization: function(type) {
    // Valider les données avant optimisation
    const validation = this.dataManager.validateData();
    
    if (!validation.valid) {
      this.notificationService.show(validation.message, 'warning');
      return;
    }
    
    const data = this.dataManager.getData();
    console.log('Running optimization with data:', data);
    
    UIUtils.showLoadingOverlay();
    
    setTimeout(() => {
      try {
        // Exécuter l'algorithme approprié
        let result;
        
        if (type === 'ffd') {
          result = this.algorithmService.runAlgorithm('ffd', data);
        } else if (type === 'ilp') {
          result = this.algorithmService.runAlgorithm('ilp', data);
        } else if (type === 'compare') {
          result = this.algorithmService.compareAlgorithms(data);
        } else {
          throw new Error("Type d'algorithme inconnu");
        }
        
        console.log('Optimization result:', result);
        
        // Naviguer vers la section des résultats
        this.navigateToSection('results-section');
        
        // Afficher les résultats
        this.resultsRenderer.renderResults(result, type);
        
        // Générer les aperçus PGM
        this.resultsHandler.generatePgmPreviews(result);
      } catch (error) {
        console.error('Optimization error:', error);
        this.notificationService.show(`Erreur d'optimisation: ${error.message}`, 'error');
      } finally {
        UIUtils.hideLoadingOverlay();
      }
    }, 100);
  }
};