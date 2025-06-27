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
      
      // AJOUTER : Rendre les sections d'édition après initialisation
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
      console.log('🔗 Configuration des gestionnaires d\'événements...');
      
      // CORRECTION : Utiliser le bon ID du bouton
      const setupOptimizeButton = () => {
        const optimizeBtn = document.getElementById('generate-cuts-btn'); // ✅ Bon ID
        if (optimizeBtn) {
          console.log('✅ Bouton de génération trouvé');
          
          // Supprimer les anciens listeners pour éviter les doublons
          optimizeBtn.replaceWith(optimizeBtn.cloneNode(true));
          
          // Récupérer le nouveau bouton et ajouter le listener
          const newOptimizeBtn = document.getElementById('generate-cuts-btn'); // ✅ Bon ID
          newOptimizeBtn.addEventListener('click', (e) => {
            console.log('🎯 Clic sur le bouton de génération détecté');
            e.preventDefault();
            
            // Pas de sélection d'algorithme dans le HTML actuel, utiliser la comparaison par défaut
            const algorithmType = 'compare';
            console.log(`🔍 Algorithme sélectionné: ${algorithmType}`);
            
            this.runOptimization(algorithmType);
          });
          
          console.log('✅ Event listener attaché au bouton de génération');
        } else {
          console.warn('⚠️ Bouton de génération non trouvé');
        }
      };
      
      // Configurer le bouton d'optimisation
      setupOptimizeButton();
      
      // Gestionnaire pour le bouton "Retour aux données"
      const setupBackButton = () => {
        const backBtn = document.getElementById('back-to-data-btn');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            this.showSection('data');
          });
          console.log('✅ Event listener attaché au bouton de retour');
        }
      };
      
      setupBackButton();
      
      // Gestionnaire pour le téléchargement de tous les PGM
      const setupDownloadButton = () => {
        const downloadAllBtn = document.getElementById('download-all-pgm');
        if (downloadAllBtn) {
          downloadAllBtn.addEventListener('click', () => {
            this.resultsHandler.downloadAllPgm();
          });
          console.log('✅ Event listener attaché au bouton de téléchargement');
        }
      };
      
      setupDownloadButton();
      
      // Configuration des onglets de navigation
      this.setupNavigationTabs();
      
      console.log('✅ Gestionnaires d\'événements configurés');
      
    } catch (error) {
      console.error('❌ Erreur lors de la configuration des événements:', error);
    }
  },
  
  /**
   * Configure les onglets de navigation
   */
  setupNavigationTabs: function() {
    const navButtons = document.querySelectorAll('[data-section]'); // ✅ Utiliser data-section
    
    navButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const sectionName = e.target.getAttribute('data-section');
        this.showSection(sectionName);
      });
    });
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
    
    // Mettre à jour les boutons de navigation
    const navButtons = document.querySelectorAll('[data-section]');
    navButtons.forEach(button => {
      button.classList.remove('active');
      if (button.getAttribute('data-section') === sectionName) {
        button.classList.add('active');
      }
    });
  },
  
  /**
   * Lance l'optimisation des découpes
   * @param {string} algorithmType - Type d'algorithme à utiliser
   */
  runOptimization: async function(algorithmType = 'compare') {
    try {
      // Vérifier qu'il y a des données
      const data = this.dataManager.getData();
      if (!this.validateDataForOptimization(data)) {
        return;
      }
      
      UIUtils.showLoadingOverlay();
      this.showNotification('Optimisation en cours...', 'info');
      
      // Lancer l'algorithme
      console.log(`🧮 Lancement de l'optimisation (${algorithmType})`);
      const results = this.algorithmService.runAlgorithm(algorithmType, data);
      
      if (!results) {
        throw new Error('Aucun résultat retourné par l\'algorithme');
      }
      
      // Stocker les résultats
      this.currentResults = results;
      
      // Générer les objets PGM
      console.log('🔧 Génération des objets PGM...');
      this.currentPgmObjects = this.pgmManager.generatePgmObjects(results, this.dataManager);
      
      // Afficher le rapport de synthèse des PGM
      const summaryReport = this.pgmManager.generateSummaryReport(this.currentPgmObjects);
      console.log('📊 Rapport PGM:', summaryReport);
      
      // Rendre les résultats
      ResultsRenderer.renderResults(results, this.algorithmService);
      
      // Générer les aperçus PGM
      this.resultsHandler.generatePgmPreviews(results);
      
      // Afficher les onglets de résultats
      this.showResultsTabs();
      
      this.showNotification(`Optimisation terminée - ${summaryReport.totalPgmObjects} barres à découper`, 'success');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'optimisation:', error);
      this.showNotification(`Erreur lors de l'optimisation: ${error.message}`, 'error');
      this.currentResults = null;
      this.currentPgmObjects = null;
    } finally {
      UIUtils.hideLoadingOverlay();
    }
  },
  
  /**
   * Valide les données pour l'optimisation
   * @param {Object} data - Données à valider
   * @returns {boolean} True if valid
   */
  validateDataForOptimization: function(data) {
    if (!data.pieces || Object.keys(data.pieces).length === 0) {
      this.showNotification('Aucune pièce à découper n\'a été importée', 'warning');
      return false;
    }
    
    if (!data.motherBars || Object.keys(data.motherBars).length === 0) {
      this.showNotification('Aucune barre mère n\'a été définie', 'warning');
      return false;
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
        this.editHandler.renderSection();
      }
      
      console.log('🔄 Affichage des données rafraîchi');
      
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
    }
  },
  
  /**
   * Met à jour les compteurs de données
   * @param {Object} data - Données actuelles
   */
  updateDataCounters: function(data) {
    try {
      // Compter les pièces
      let totalPieces = 0;
      for (const profile in data.pieces) {
        totalPieces += data.pieces[profile].length;
      }
      
      // Compter les barres mères
      let totalMotherBars = 0;
      for (const profile in data.motherBars) {
        totalMotherBars += data.motherBars[profile].length;
      }
      
      // Mettre à jour l'interface
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
   * Efface toutes les données
   */
  clearAllData: function() {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données ?')) {
      this.dataManager.clearAllData();
      this.currentResults = null;
      this.currentPgmObjects = null;
      
      // Rafraîchir l'affichage
      this.refreshDataDisplay();
      
      // Cacher les résultats
      const resultsSection = document.getElementById('results-section');
      if (resultsSection) {
        resultsSection.style.display = 'none';
      }
      
      this.showNotification('Toutes les données ont été effacées', 'info');
    }
  },
  
  /**
   * Affiche une notification
   * @param {string} message - Message à afficher
   * @param {string} type - Type de notification
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
   * @returns {Array|null} Liste des objets PGM ou null
   */
  getCurrentPgmObjects: function() {
    return this.currentPgmObjects;
  },
  
  /**
   * Affiche les informations de debug des objets PGM
   */
  debugPgmObjects: function() {
    if (!this.currentPgmObjects) {
      console.log('Aucun objet PGM disponible');
      return;
    }
    
    console.log('🔍 Debug des objets PGM:');
    console.log(`Total: ${this.currentPgmObjects.length} objets`);
    
    this.currentPgmObjects.forEach((pgm, index) => {
      console.log(`\n--- PGM ${index + 1} ---`);
      console.log(`ID: ${pgm.id}`);
      console.log(`Barre mère: ${pgm.motherBar.profile} (${pgm.motherBar.orientation}) - ${pgm.motherBar.length}cm`);
      console.log(`Pièces: ${pgm.pieces.length}`);
      pgm.pieces.forEach((piece, pieceIndex) => {
        console.log(`  ${pieceIndex + 1}. ${piece.length}cm → ${piece.pieceReference.nom || piece.pieceReference.id}`);
      });
    });
  }
};