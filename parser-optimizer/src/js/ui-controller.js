import { DataManager } from './data-manager.js';
import { AlgorithmService } from './algorithm-service.js';
import { ImportManager } from './import-manager.js';
import { PgmGenerator } from './pgm-generator.js';
import { PgmManager } from './pgm-manager.js';
import { ResultsRenderer } from './results-renderer.js';

// Importer les gestionnaires UI
import { ImportHandler } from './ui/import-handler.js';
import { EditHandler } from './ui/edit-handler.js';
import { ResultsHandler } from './ui/results-handler.js';
import { NotificationService } from './ui/notification-service.js';
import { UIUtils } from './ui/utils.js';

/**
 * Contrôleur d'interface utilisateur principal
 * Coordonne les différentes sections et services
 */
export const UIController = {
  // Services et gestionnaires
  dataManager: null,
  algorithmService: null,
  importManager: null,
  pgmGenerator: null,
  pgmManager: null,
  
  // Gestionnaires UI
  importHandler: null,
  editHandler: null,
  resultsHandler: null,
  notificationService: null,
  
  // État de l'application
  currentResults: null,
  currentPgmObjects: null,
  
  /**
   * Initialise le contrôleur et tous les services
   */
  init: async function() {
    try {
      console.log('🚀 Initialisation de l\'application...');
      
      // Initialiser les services principaux
      this.initializeServices();
      
      // Initialiser les gestionnaires UI
      await this.initializeUIHandlers();
      
      // Configurer les gestionnaires d'événements
      this.setupEventListeners();
      
      console.log('✅ Application initialisée avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      this.showNotification('Erreur lors de l\'initialisation de l\'application', 'error');
    }
  },
  
  /**
   * Initialise les services principaux
   */
  initializeServices: function() {
    // Initialiser le service de notification en premier
    this.notificationService = NotificationService;
    this.notificationService.init();
    
    // Initialiser les autres services
    this.dataManager = DataManager;
    this.algorithmService = AlgorithmService;
    this.importManager = ImportManager;
    this.pgmGenerator = PgmGenerator;
    this.pgmManager = PgmManager;
    
    console.log('📋 Services principaux initialisés');
  },
  
  /**
   * Initialise les gestionnaires d'interface utilisateur
   */
  initializeUIHandlers: async function() {
    try {
      // Initialiser les gestionnaires avec leurs dépendances
      this.importHandler = ImportHandler;
      this.importHandler.init({
        importManager: this.importManager,
        dataManager: this.dataManager,
        showNotification: (msg, type) => this.showNotification(msg, type),
        refreshDataDisplay: () => this.refreshDataDisplay()
      });
      
      this.editHandler = EditHandler;
      this.editHandler.init({
        dataManager: this.dataManager,
        showNotification: (msg, type) => this.showNotification(msg, type),
        refreshDataDisplay: () => this.refreshDataDisplay()
      });
      
      this.resultsHandler = ResultsHandler;
      this.resultsHandler.init({
        pgmGenerator: this.pgmGenerator,
        dataManager: this.dataManager,
        uiController: this,
        showNotification: (msg, type) => this.showNotification(msg, type)
      });
      
      // Rendre les sections d'édition après initialisation
      this.editHandler.renderSection();
      
      console.log('🎨 Gestionnaires UI initialisés');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des gestionnaires UI:', error);
      throw error;
    }
  },
  
  /**
   * Configure tous les gestionnaires d'événements
   */
  setupEventListeners: function() {
    try {
      console.log('Configuration des gestionnaires d\'événements...');
      
      // Configurer le bouton d'optimisation
      const setupOptimizeButton = () => {
        const optimizeBtn = document.getElementById('generate-cuts-btn');
        if (optimizeBtn) {
          optimizeBtn.addEventListener('click', () => {
            this.runOptimization();
          });
        }
      };
      
      // Configurer les boutons
      setupOptimizeButton();
      
      // Configuration du bouton "Éditer les Données"
      this.setupEditDataButton();
      
      console.log('Gestionnaires d\'événements configurés');
      
    } catch (error) {
      console.error('Erreur lors de la configuration des événements:', error);
    }
  },
  
  /**
   * Configure le bouton "Éditer les Données"
   */
  setupEditDataButton: function() {
    const editDataBtn = document.querySelector('.btn-edit-data');
    if (editDataBtn) {
      editDataBtn.addEventListener('click', () => {
        this.showSection('data-section');
      });
    }
  },
  
  /**
   * Affiche une section spécifique
   */
  showSection: function(sectionName) {
    // Cacher toutes les sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
      section.classList.remove('active');
    });
    
    // Afficher la section demandée
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
      targetSection.classList.add('active');
    }
    
    // Gérer l'affichage de la navigation
    const resultsNav = document.getElementById('results-nav');
    if (sectionName === 'result-section') {
      // Afficher le bouton "Éditer les Données" sur la page résultats
      if (resultsNav) {
        resultsNav.style.display = 'flex';
      }
    } else {
      // Cacher la navigation sur la page données
      if (resultsNav) {
        resultsNav.style.display = 'none';
      }
    }
  },
  
  /**
   * Lance l'optimisation des découpes
   */
  runOptimization: async function() {
    try {
      // Vérifier qu'il y a des données
      const data = this.dataManager.getData();
      if (!this.validateDataForOptimization(data)) {
        return;
      }
      
      UIUtils.showLoadingOverlay();
      
      // Lancer l'algorithme (compare automatiquement FFD et ILP)
      console.log('Lancement de l\'optimisation...');
      const results = this.algorithmService.runAlgorithm('compare', data);
      
      if (!results) {
        throw new Error('Aucun résultat retourné par l\'algorithme');
      }
      
      // Stocker les résultats
      this.currentResults = results;
      
      // Générer les objets PGM
      console.log('Génération des objets PGM...');
      this.currentPgmObjects = this.pgmManager.generatePgmObjects(results, this.dataManager);
      
      // Afficher le rapport de synthèse des PGM
      const summaryReport = this.pgmManager.generateSummaryReport(this.currentPgmObjects);
      console.log('Rapport PGM:', summaryReport);
      
      // Rendre les résultats
      ResultsRenderer.renderResults(results, this.algorithmService);
      
      // Générer les aperçus PGM
      this.resultsHandler.generatePgmPreviews();
      
      // Afficher les onglets de résultats
      this.showResultsTabs();
      
      // PAS de notification de succès - l'utilisateur voit les résultats
      
    } catch (error) {
      console.error('Erreur lors de l\'optimisation:', error);
      this.showNotification(`Erreur: ${error.message}`, 'error');
      this.currentResults = null;
      this.currentPgmObjects = null;
    } finally {
      UIUtils.hideLoadingOverlay();
    }
  },
  
  /**
   * MODIFIÉ: Valide les données pour l'optimisation avec messages concis
   */
  validateDataForOptimization: function(data) {
    // Vérifier qu'il y a des pièces à découper
    let totalPieces = 0;
    
    for (const profile in data.pieces) {
      for (const piece of data.pieces[profile]) {
        totalPieces += piece.quantity;
      }
    }
    
    if (totalPieces === 0) {
      this.showNotification('Aucune barre à découper importée', 'warning');
      return false;
    }
    
    // Vérifier qu'il y a des barres mères
    let totalMotherBars = 0;
    
    for (const profile in data.motherBars) {
      for (const bar of data.motherBars[profile]) {
        totalMotherBars += bar.quantity;
      }
    }
    
    if (totalMotherBars === 0) {
      this.showNotification('Aucune barre mère définie', 'warning');
      return false;
    }
    
    // Vérification de cohérence simplifiée
    const incompatibleProfiles = [];
    
    for (const profile in data.pieces) {
      const pieces = data.pieces[profile];
      const minPieceLength = Math.min(...pieces.map(p => p.length));
      
      const motherBars = data.motherBars[profile];
      if (!motherBars || motherBars.length === 0) {
        incompatibleProfiles.push(profile);
      } else {
        const maxMotherBarLength = Math.max(...motherBars.map(b => b.length));
        if (maxMotherBarLength < minPieceLength) {
          incompatibleProfiles.push(profile);
        }
      }
    }
    
    if (incompatibleProfiles.length > 0) {
      this.showNotification(`Problème profil ${incompatibleProfiles[0]}`, 'warning');
      // Continuer quand même
    }
    
    return true;
  },
  
  /**
   * Affiche les onglets de résultats
   */
  showResultsTabs: function() {
    // Basculer vers l'onglet résultats
    this.showSection('result-section');
  },
  
  /**
   * Rafraîchit l'affichage des données
   */
  refreshDataDisplay: function() {
    try {
      const data = this.dataManager.getData();
      
      // Mettre à jour les compteurs
      this.updateDataCounters(data);
      
      // Rafraîchir les tableaux si ils sont visibles
      if (this.editHandler) {
        this.editHandler.refreshTables();
      }
      
      console.log('🔄 Affichage des données rafraîchi');
      
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
    }
  },
  
  /**
   * Met à jour les compteurs de données
   */
  updateDataCounters: function(data) {
    try {
      // Compter les pièces
      let totalPieces = 0;
      for (const profile in data.pieces) {
        for (const piece of data.pieces[profile]) {
          totalPieces += piece.quantity;
        }
      }
      
      // Compter les barres mères
      let totalMotherBars = 0;
      for (const profile in data.motherBars) {
        for (const bar of data.motherBars[profile]) {
          totalMotherBars += bar.quantity;
        }
      }
      
      // Mettre à jour l'interface si les éléments existent
      const piecesCounter = document.getElementById('pieces-counter');
      if (piecesCounter) {
        piecesCounter.textContent = totalPieces;
      }
      
      const motherBarsCounter = document.getElementById('mother-bars-counter');
      if (motherBarsCounter) {
        motherBarsCounter.textContent = totalMotherBars;
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des compteurs:', error);
    }
  },
  
  /**
   * Affiche une notification
   */
  showNotification: function(message, type = 'info') {
    if (this.notificationService) {
      this.notificationService.show(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  },
  
  /**
   * Récupère les objets PGM actuels
   */
  getCurrentPgmObjects: function() {
    return this.currentPgmObjects;
  }
};