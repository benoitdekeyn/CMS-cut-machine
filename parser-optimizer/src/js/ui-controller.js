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
    this.editHandler = EditHandler;
    
    this.editHandler.init({
      dataManager: this.dataManager,
      showNotification: this.notificationService.show.bind(this.notificationService)
    });
    
    this.importHandler.init({
      dataManager: this.dataManager,
      importManager: this.importManager,
      showNotification: this.notificationService.show.bind(this.notificationService),
      navigateToSection: this.navigateToSection.bind(this),
      editHandler: this.editHandler  // Ajouter une référence directe à editHandler
    });
    
    this.resultsHandler = ResultsHandler;
    this.resultsHandler.init({
      pgmGenerator: this.pgmGenerator,
      dataManager: this.dataManager,
      showNotification: this.notificationService.show.bind(this.notificationService)
    });
    
    // Initialiser les gestionnaires d'événements
    this.initEventHandlers();
    
    // Rendre la section d'édition immédiatement
    this.editHandler.renderSection();
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
    
    // Bouton de génération des fichiers de découpe
    document.getElementById('generate-cuts-btn').addEventListener('click', () => this.generateOptimalCuts());
    
    // Bouton de retour aux données
    document.getElementById('back-to-data-btn').addEventListener('click', () => this.navigateToSection('data-section'));
    
    // Bouton de téléchargement de tous les PGM
    document.getElementById('download-all-pgm').addEventListener('click', () => this.resultsHandler.downloadAllPgm());
  },
  
  /**
   * Affiche la section spécifiée
   * @param {string} sectionId - ID de la section à afficher
   */
  navigateToSection: function(sectionId) {
    // Masquer les erreurs d'import
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
      } else {
        section.classList.remove('active');
      }
    });
  },
  
  /**
   * Génère les découpes optimales et affiche les résultats
   */
  generateOptimalCuts: function() {
    // Valider les données avant optimisation
    const validation = this.dataManager.validateData();
    
    if (!validation.valid) {
      this.notificationService.show(validation.message, 'warning');
      return;
    }
    
    const data = this.dataManager.getData();
    
    UIUtils.showLoadingOverlay();
    
    setTimeout(() => {
      try {
        // Comparaison automatique des algorithmes pour choisir le meilleur
        const result = this.algorithmService.compareAlgorithms(data);
        
        console.log('Optimization result:', result);
        
        // Naviguer vers la section des résultats
        this.navigateToSection('result-section');
        
        // Afficher les résultats
        this.resultsRenderer.renderResults(result, this.algorithmService);
        
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