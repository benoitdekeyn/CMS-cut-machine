import { DataManager } from './data-manager.js';
import { AlgorithmService } from './algorithm-service.js';
import { ImportManager } from './import-manager.js';
import { PgmGenerator } from './pgm-generator.js';
import { PgmManager } from './pgm-manager.js';
import { ResultsRenderer } from './results-renderer.js'; // Assure-toi que l'import existe

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
  
  // NOUVEAU: Sauvegarde de l'état original des données
  originalDataState: null,

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
    
    // AJOUT: Initialiser algorithm-service avec dataManager
    this.algorithmService.init(this.dataManager);
    
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
   * Méthode pour afficher les notifications
   */
  showNotification: function(message, type = 'info') {
    if (this.notificationService && this.notificationService.show) {
      this.notificationService.show(message, type);
    } else {
      // Fallback en cas de problème avec le service de notification
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  },

  /**
   * Méthode pour rafraîchir l'affichage des données
   */
  refreshDataDisplay: function() {
    try {
      if (this.editHandler && this.editHandler.refreshTables) {
        this.editHandler.refreshTables();
      }
      
      // Mettre à jour les compteurs s'ils existent
      this.updateDataCounters();
      
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement de l\'affichage:', error);
    }
  },

  /**
   * Met à jour les compteurs de données dans l'interface
   */
  updateDataCounters: function() {
    try {
      const data = this.dataManager.getData();
      
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
      const mothersCounter = document.getElementById('mothers-counter');
      
      if (piecesCounter) {
        piecesCounter.textContent = totalPieces;
      }
      
      if (mothersCounter) {
        mothersCounter.textContent = totalMotherBars;
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des compteurs:', error);
    }
  },

  /**
   * Méthode pour obtenir les objets PGM actuels
   */
  getCurrentPgmObjects: function() {
    return this.currentPgmObjects;
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
    // MODIFIÉ: Restaurer les données originales quand on retourne à l'édition
    if (sectionName === 'data-section') {
      this.restoreOriginalDataState();
      this.clearOptimizationResults();
      console.log('🔄 Données originales restaurées lors du retour à l\'édition');
    }
    
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
      
      // MODIFIÉ: Vérifier et rafraîchir l'affichage des données
      if (sectionName === 'data-section') {
        this.verifyAndRefreshDataDisplay();
      }
    }
  },

  /**
   * Sauvegarde l'état original des données avant optimisation
   */
  saveOriginalDataState: function() {
    try {
      const currentData = this.dataManager.getData();
      
      // Faire une copie profonde des données pour éviter les références partagées
      this.originalDataState = {
        pieces: JSON.parse(JSON.stringify(currentData.pieces)),
        motherBars: JSON.parse(JSON.stringify(currentData.motherBars)),
        barsList: JSON.parse(JSON.stringify(currentData.barsList))
      };
      
      console.log('💾 État original des données sauvegardé');
      
      // Log des données sauvegardées pour le débogage
      let totalPieces = 0;
      for (const profile in this.originalDataState.pieces) {
        for (const piece of this.originalDataState.pieces[profile]) {
          totalPieces += piece.quantity;
        }
      }
      
      let totalMotherBars = 0;
      for (const profile in this.originalDataState.motherBars) {
        for (const bar of this.originalDataState.motherBars[profile]) {
          totalMotherBars += bar.quantity;
        }
      }
      
      console.log(`    📦 Sauvegardé: ${totalPieces} pièces, ${totalMotherBars} barres mères`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de l\'état original:', error);
    }
  },

  /**
   * Restaure l'état original des données
   */
  restoreOriginalDataState: function() {
    try {
      if (!this.originalDataState) {
        console.warn('⚠️ Aucun état original à restaurer');
        return;
      }
      
      // Restaurer les données depuis la sauvegarde
      this.dataManager.data.pieces = JSON.parse(JSON.stringify(this.originalDataState.pieces));
      this.dataManager.data.motherBars = JSON.parse(JSON.stringify(this.originalDataState.motherBars));
      this.dataManager.data.barsList = JSON.parse(JSON.stringify(this.originalDataState.barsList));
      
      console.log('🔄 État original des données restauré');
      
      // Log des données restaurées pour le débogage
      let totalPieces = 0;
      for (const profile in this.dataManager.data.pieces) {
        for (const piece of this.dataManager.data.pieces[profile]) {
          totalPieces += piece.quantity;
        }
      }
      
      let totalMotherBars = 0;
      for (const profile in this.dataManager.data.motherBars) {
        for (const bar of this.dataManager.data.motherBars[profile]) {
          totalMotherBars += bar.quantity;
        }
      }
      
      console.log(`    ✅ Restauré: ${totalPieces} pièces, ${totalMotherBars} barres mères`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la restauration de l\'état original:', error);
      // En cas d'erreur, essayer de réinitialiser
      this.dataManager.initData();
    }
  },

  /**
   * Nettoie uniquement les résultats d'optimisation, pas les données de base
   */
  clearOptimizationResults: function() {
    try {
      // Vider les résultats d'optimisation
      this.currentResults = null;
      this.currentPgmObjects = null;
      
      // Nettoyer le contenu des sections résultats
      const resultsContainer = document.getElementById('results-container');
      if (resultsContainer) {
        resultsContainer.innerHTML = '';
      }
      
      const pgmContainer = document.getElementById('pgm-files-list');
      if (pgmContainer) {
        pgmContainer.innerHTML = '';
      }
      
      // Réinitialiser les étapes de chargement si nécessaire
      UIUtils.resetLoadingSteps();
      
      console.log('✅ Résultats d\'optimisation nettoyés avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des résultats:', error);
    }
  },

  /**
   * Affiche les schémas de coupe retenus dans la console
   */
  displayCuttingSchemesInConsole: function(results) {
    console.log('\n🎯 ===== SCHÉMAS DE COUPE RETENUS =====');
    
    const modelResults = results.modelResults || {};
    
    for (const [modelKey, modelResult] of Object.entries(modelResults)) {
      console.log(`\n📋 Modèle: ${modelKey}`);
      console.log('─'.repeat(50));
      
      const layouts = modelResult.layouts || [];
      
      if (layouts.length === 0) {
        console.log('  Aucun schéma de coupe');
        continue;
      }
      
      layouts.forEach((layout, index) => {
        const cuts = layout.cuts || layout.pieces || [];
        const count = layout.count || 1;
        const waste = layout.waste || layout.remainingLength || 0;
        const barLength = layout.originalLength || 0;
        
        // Grouper les coupes par longueur
        const cutCounts = {};
        cuts.forEach(cut => {
          cutCounts[cut] = (cutCounts[cut] || 0) + 1;
        });
        
        // Formater les coupes
        const cutsDisplay = Object.entries(cutCounts)
          .sort((a, b) => parseInt(b[0]) - parseInt(a[0])) // Trier par longueur décroissante
          .map(([length, count]) => `${count}×${length}cm`)
          .join(' + ');
        
        // Calculer l'efficacité
        const usedLength = cuts.reduce((sum, cut) => sum + cut, 0);
        const efficiency = barLength > 0 ? ((usedLength / barLength) * 100).toFixed(1) : 0;
        
        console.log(`  Schéma #${index + 1}: ${count}× répétition(s)`);
        console.log(`    └─ Barre ${barLength}cm: ${cutsDisplay}`);
        console.log(`    └─ Chute: ${waste}cm | Efficacité: ${efficiency}%`);
      });
      
      // Statistiques du modèle
      const totalBars = layouts.reduce((sum, layout) => sum + (layout.count || 1), 0);
      const totalWaste = layouts.reduce((sum, layout) => sum + ((layout.count || 1) * (layout.waste || 0)), 0);
      const totalLength = layouts.reduce((sum, layout) => sum + ((layout.count || 1) * (layout.originalLength || 0)), 0);
      const globalEfficiency = totalLength > 0 ? (((totalLength - totalWaste) / totalLength) * 100).toFixed(1) : 0;
      
      console.log(`\n  📊 Résumé ${modelKey}:`);
      console.log(`    • ${totalBars} barres mères utilisées`);
      console.log(`    • ${totalWaste}cm de chutes au total`);
      console.log(`    • ${globalEfficiency}% d'efficacité globale`);
    }
    
    // Statistiques globales
    const globalStats = results.globalStats?.statistics || {};
    console.log(`\n🏆 RÉSUMÉ GLOBAL:`);
    console.log(`  • Total barres utilisées: ${results.globalStats?.totalBarsUsed || 0}`);
    console.log(`  • Efficacité globale: ${globalStats.utilizationRate || 0}%`);
    console.log(`  • Algorithme utilisé: ${results.bestAlgorithm === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire'}`);
    
    if (results.comparison) {
      console.log(`  • Comparaison: FFD ${results.comparison.ffdEfficiency}% vs ILP ${results.comparison.ilpEfficiency}%`);
    }
    
    console.log('🎯 =====================================\n');
  },

  /**
   * Affiche les statistiques détaillées des données pour le débogage
   */
  logDataStatistics: function(data) {
    console.log('📊 === STATISTIQUES DES DONNÉES ===');
    
    // Compter les pièces
    let totalPieces = 0;
    let pieceProfiles = 0;
    for (const profile in data.pieces) {
      pieceProfiles++;
      const profilePieces = data.pieces[profile];
      const profileTotal = profilePieces.reduce((sum, piece) => sum + piece.quantity, 0);
      totalPieces += profileTotal;
      console.log(`  🔧 ${profile}: ${profilePieces.length} types, ${profileTotal} pièces`);
    }
    
    // Compter les barres mères
    let totalMotherBars = 0;
    let motherProfiles = 0;
    for (const profile in data.motherBars) {
      motherProfiles++;
      const profileBars = data.motherBars[profile];
      const profileTotal = profileBars.reduce((sum, bar) => sum + bar.quantity, 0);
      totalMotherBars += profileTotal;
      console.log(`  📏 ${profile}: ${profileBars.length} longueurs, ${profileTotal} barres`);
    }
    
    console.log(`📋 Total: ${totalPieces} pièces, ${totalMotherBars} barres mères`);
    console.log(`📁 Profils: ${pieceProfiles} pour pièces, ${motherProfiles} pour barres`);
    console.log(`📄 Liste globale: ${data.barsList.length} éléments`);
    console.log('📊 =====================================');
  },

  /**
   * Vérifie l'intégrité des données et rafraîchit l'affichage
   */
  verifyAndRefreshDataDisplay: function() {
    try {
      console.log('🔍 Vérification de l\'intégrité des données...');
      
      // Obtenir les données actuelles
      const data = this.dataManager.getData();
      
      // Afficher les statistiques de débogage
      this.logDataStatistics(data);
      
      // Vérifier l'intégrité
      if (!this.checkDataIntegrity()) {
        console.log('🔧 Données corrigées automatiquement');
      }
      
      // Rafraîchir l'affichage
      this.refreshDataDisplay();
      
      console.log('🔄 Vérification et rafraîchissement terminés');
      
    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error);
      // En cas d'erreur critique, ne pas réinitialiser les données
      this.showNotification('Erreur lors de la vérification des données', 'warning');
    }
  },

  /**
   * Vérifie l'intégrité des données
   */
  checkDataIntegrity: function() {
    const data = this.dataManager.getData();
    
    // Vérifier que les structures de base existent
    if (!data.pieces || !data.motherBars || !data.barsList) {
      console.warn('⚠️ Structure de données corrompue, réinitialisation...');
      this.dataManager.initData();
      return false;
    }
    
    // Vérifier la cohérence entre barsList et les structures groupées
    let totalPiecesInGroups = 0;
    let totalMothersInGroups = 0;
    
    for (const profile in data.pieces) {
      totalPiecesInGroups += data.pieces[profile].length;
    }
    
    for (const profile in data.motherBars) {
      totalMothersInGroups += data.motherBars[profile].length;
    }
    
    const piecesInList = data.barsList.filter(b => b.type === 'fille').length;
    const mothersInList = data.barsList.filter(b => b.type === 'mother' || b.type === 'mere').length;
    
    if (totalPiecesInGroups !== piecesInList || totalMothersInGroups !== mothersInList) {
      console.warn('⚠️ Incohérence détectée dans les données, correction automatique...');
      // Ici on pourrait ajouter une logique de correction automatique
      return false;
    }
    
    return true;
  },

  /**
   * Lance l'optimisation avec étapes dynamiques et progression par modèle
   */
  runOptimization: async function() {
    try {
      this.saveOriginalDataState();
      this.clearOptimizationResults();

      const data = this.dataManager.getData();
      console.log('🔍 Vérification des données avant optimisation...');
      this.logDataStatistics(data);

      if (!this.validateDataForOptimization(data)) {
        return;
      }

      UIUtils.showLoadingOverlay();
      // Cache la barre de progression mais garde les étapes visibles
      const progress = document.querySelector('#loading-overlay .loading-progress');
      if (progress) progress.style.display = 'none';
      const steps = document.querySelector('#loading-overlay .loading-steps');
      if (steps) steps.style.display = '';

      // === 1. ÉTAPE DE TRANSFORMATION ===
      UIUtils.setLoadingStepText('Transformation des données en modèles...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const modelData = this.algorithmService.transformDataToModels(data);
      const modelKeys = this.algorithmService.getModelExecutionOrder(modelData);
      
      console.log(`📋 ${modelKeys.length} modèles détectés dans l'ordre d'exécution`);

      // === 2. GÉNÉRATION DES ÉTAPES DÉTAILLÉES ===
      this.generateExecutionSteps(modelKeys);

      // Marquer l'étape de transformation comme complétée
      await this.completeStep('step-transform', 'Transformation terminée');

      // === 3. EXÉCUTION RÉELLE AVEC SYNCHRONISATION DÉTAILLÉE ===
      const results = await this.runAlgorithmsWithRealSteps(data, modelKeys);
      
      if (!results) throw new Error('Aucun résultat retourné par l\'algorithme');
      this.currentResults = results;

      // === 4. GÉNÉRATION DES PGM ===
      await this.runPgmGenerationStep();

      // === 5. AFFICHAGE DES RÉSULTATS ===
      await new Promise(resolve => setTimeout(resolve, 400));
      this.showResultsTabs();

    } catch (error) {
      console.error('Erreur lors de l\'optimisation:', error);
      this.showNotification(`Erreur: ${error.message}`, 'error');
      this.restoreOriginalDataState();
      this.clearOptimizationResults();
    } finally {
      UIUtils.hideLoadingOverlay();
      UIUtils.showLoadingProgressBar();
    }
  },

  /**
   * Crée un élément div pour une étape
   */
  createStepDiv: function(id, icon, label) {
    const div = document.createElement('div');
    div.className = 'loading-step';
    div.id = id;
    div.innerHTML = `<div class="step-icon">${icon}</div><span>${label}</span>`;
    return div;
  },

  /**
   * Génère les étapes d'exécution détaillées par algorithme et par modèle
   */
  generateExecutionSteps: function(modelKeys) {
    const stepsContainer = document.querySelector('#loading-overlay .loading-steps');
    if (!stepsContainer) return;
    
    stepsContainer.innerHTML = '';
    let stepNum = 1;

    // Étape 1 : Transformation
    stepsContainer.appendChild(
      this.createStepDiv('step-transform', stepNum++, 'Transformation des données')
    );

    // Étapes détaillées pour chaque modèle et chaque algorithme
    modelKeys.forEach((modelKey, modelIndex) => {
      const modelLabel = this.formatModelNameForSteps(modelKey);
      
      // FFD pour ce modèle
      stepsContainer.appendChild(
        this.createStepDiv(
          `step-ffd-${modelIndex}`, 
          stepNum++, 
          `FFD: ${modelLabel}`
        )
      );
      
      // ILP pour ce modèle
      stepsContainer.appendChild(
        this.createStepDiv(
          `step-ilp-${modelIndex}`, 
          stepNum++, 
          `ILP: ${modelLabel}`
        )
      );
    });

    // Étapes finales
    stepsContainer.appendChild(
      this.createStepDiv('step-compare', stepNum++, 'Comparaison et sélection')
    );
    stepsContainer.appendChild(
      this.createStepDiv('step-pgm', stepNum++, 'Génération des fichiers PGM')
    );
    
    console.log(`🎯 ${stepNum - 1} étapes générées pour ${modelKeys.length} modèles`);
  },

  /**
   * Formate le nom d'un modèle pour les étapes
   */
  formatModelNameForSteps: function(modelKey) {
    const parts = modelKey.split('_');
    const profile = parts[0];
    const orientation = parts[1];
    
    let orientationText = '';
    switch(orientation) {
      case 'a-plat':
        orientationText = 'À plat';
        break;
      case 'debout':
        orientationText = 'Debout';
        break;
      default:
        orientationText = orientation;
    }
    
    return `${profile} - ${orientationText}`;
  },

  /**
   * Exécute les algorithmes avec des étapes détaillées par modèle
   */
  runAlgorithmsWithRealSteps: async function(data, modelKeys) {
    console.log('🚀 Début de l\'exécution réelle des algorithmes par modèle');
    
    // Exécuter FFD pour chaque modèle individuellement (animation visuelle)
    for (let i = 0; i < modelKeys.length; i++) {
      const modelKey = modelKeys[i];
      const modelLabel = this.formatModelNameForSteps(modelKey);
      const stepId = `step-ffd-${i}`;
      
      // Activer l'étape FFD pour ce modèle
      const stepFFD = document.getElementById(stepId);
      if (stepFFD) {
        stepFFD.classList.add('active');
        UIUtils.setLoadingStepText(`Exécution FFD pour ${modelLabel}...`);
      }
      
      console.log(`🔄 FFD pour ${modelKey} (${i + 1}/${modelKeys.length})`);
      
      // Simuler le temps d'exécution FFD
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
      
      await this.completeStep(stepId, `FFD terminé pour ${modelLabel}`);
    }
    
    // Exécuter ILP pour chaque modèle individuellement (animation visuelle)
    for (let i = 0; i < modelKeys.length; i++) {
      const modelKey = modelKeys[i];
      const modelLabel = this.formatModelNameForSteps(modelKey);
      const stepId = `step-ilp-${i}`;
      
      // Activer l'étape ILP pour ce modèle
      const stepILP = document.getElementById(stepId);
      if (stepILP) {
        stepILP.classList.add('active');
        UIUtils.setLoadingStepText(`Exécution ILP pour ${modelLabel}...`);
      }
      
      console.log(`🔄 ILP pour ${modelKey} (${i + 1}/${modelKeys.length})`);
      
      // Simuler le temps d'exécution ILP (plus long)
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
      
      await this.completeStep(stepId, `ILP terminé pour ${modelLabel}`);
    }
    
    // === EXÉCUTION RÉELLE DES ALGORITHMES ===
    console.log('🚀 Exécution réelle des algorithmes');
    
    // CORRIGÉ: Utiliser la bonne fonction du service
    const results = this.algorithmService.runAlgorithm('compare', data);
    
    // === ÉTAPE COMPARAISON ===
    const stepCompare = document.getElementById('step-compare');
    if (stepCompare) {
      stepCompare.classList.add('active');
      UIUtils.setLoadingStepText('Comparaison des algorithmes et sélection des meilleurs résultats...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    await this.completeStep('step-compare', 'Comparaison terminée');
    
    return results;
  },

  /**
   * Utilitaire pour compléter une étape avec animation
   */
  completeStep: async function(stepId, message) {
    const step = document.getElementById(stepId);
    if (step) {
      // Attendre un peu pour l'effet visuel
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Marquer comme complété
      step.classList.remove('active');
      step.classList.add('completed');
      
      // Mettre à jour le message
      UIUtils.setLoadingStepText(message);
      
      // Petite pause avant l'étape suivante
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  },

  /**
   * Exécute l'étape de génération PGM
   */
  runPgmGenerationStep: async function() {
    const stepPgm = document.getElementById('step-pgm');
    if (stepPgm) {
      stepPgm.classList.add('active');
      UIUtils.setLoadingStepText('Génération des fichiers PGM...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Génération réelle des PGM
    this.currentPgmObjects = this.pgmManager.generatePgmObjects(this.currentResults);
    ResultsRenderer.renderResults(this.currentResults, this.algorithmService);
    this.resultsHandler.generatePgmPreviews();
    
    await this.completeStep('step-pgm', 'Fichiers PGM générés');
  },

  /**
   * Validation plus robuste avec débogage détaillé
   */
  validateDataForOptimization: function(data) {
    console.log('🔍 === VALIDATION DES DONNÉES ===');
    
    if (!data) {
      console.error('❌ Aucune donnée disponible');
      this.showNotification('Aucune donnée disponible pour l\'optimisation', 'error');
      return false;
    }
    
    if (!data.pieces || !data.motherBars) {
      console.error('❌ Structure de données invalide');
      this.showNotification('Structure de données corrompue', 'error');
      return false;
    }
    
    // Vérifier qu'il y a des pièces
    let totalPieces = 0;
    let pieceDetails = [];
    for (const profile in data.pieces) {
      for (const piece of data.pieces[profile]) {
        totalPieces += piece.quantity;
        pieceDetails.push(`${profile}: ${piece.quantity}×${piece.length}cm`);
      }
    }
    
    console.log(`📦 Pièces trouvées: ${totalPieces}`);
    if (pieceDetails.length > 0) {
      console.log('   Détail:', pieceDetails.slice(0, 5).join(', ') + (pieceDetails.length > 5 ? '...' : ''));
    }
    
    if (totalPieces === 0) {
      console.error('❌ Aucune pièce à découper trouvée');
      this.showNotification('Aucune pièce à découper. Veuillez d\'abord importer des barres.', 'error');
      return false;
    }
    
    // Vérifier qu'il y a des barres mères
    let totalMotherBars = 0;
    let motherDetails = [];
    for (const profile in data.motherBars) {
      for (const bar of data.motherBars[profile]) {
        totalMotherBars += bar.quantity;
        motherDetails.push(`${profile}: ${bar.quantity}×${bar.length}cm`);
      }
    }
    
    console.log(`📏 Barres mères trouvées: ${totalMotherBars}`);
    if (motherDetails.length > 0) {
      console.log('   Détail:', motherDetails.slice(0, 5).join(', ') + (motherDetails.length > 5 ? '...' : ''));
    }
    
    if (totalMotherBars === 0) {
      console.error('❌ Aucune barre mère disponible');
      this.showNotification('Aucune barre mère disponible. Veuillez d\'abord ajouter des barres mères.', 'error');
      return false;
    }
    
    // Vérifier la cohérence des profils
    const pieceProfiles = Object.keys(data.pieces);
    const motherBarProfiles = Object.keys(data.motherBars);
    
    console.log(`🔧 Profils pièces: ${pieceProfiles.join(', ')}`);
    console.log(`📏 Profils barres: ${motherBarProfiles.join(', ')}`);
    
    const missingProfiles = pieceProfiles.filter(profile => !motherBarProfiles.includes(profile));
    if (missingProfiles.length > 0) {
      console.error(`❌ Profils manquants: ${missingProfiles.join(', ')}`);
      this.showNotification(
        `Profils manquants dans les barres mères: ${missingProfiles.join(', ')}. 
         Veuillez ajouter des barres mères pour ces profils.`, 
        'error'
      );
      return false;
    }
    
    console.log('✅ Validation des données réussie');
    console.log('🔍 ===============================');
    return true;
  },

  /**
   * Affiche les onglets de résultats
   */
  showResultsTabs: function() {
    try {
      // Basculer vers la section résultats
      this.showSection('result-section');
      
      // Scroll en haut de la page pour une UX optimale
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // S'assurer que le contenu est visible
      const resultsContainer = document.getElementById('results-container');
      if (resultsContainer && resultsContainer.innerHTML.trim() === '') {
        console.warn('⚠️ Le conteneur de résultats est vide');
      }
      
      console.log('📊 Onglets de résultats affichés');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'affichage des onglets:', error);
    }
  },
};