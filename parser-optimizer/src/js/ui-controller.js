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
 * Contrôleur d'interface utilisateur principal (ADAPTÉ SANS ID)
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
    this.algorithmService = AlgorithmService; // Plus besoin d'init car import direct
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
   * Sauvegarde l'état original des données avant optimisation (CORRIGÉ)
   */
  saveOriginalDataState: function() {
    try {
      const currentData = this.dataManager.getData();
      
      // CORRIGÉ: Plus de barsList, seulement pieces et motherBars
      this.originalDataState = {
        pieces: JSON.parse(JSON.stringify(currentData.pieces)),
        motherBars: JSON.parse(JSON.stringify(currentData.motherBars))
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
   * Restaure l'état original des données (CORRIGÉ)
   */
  restoreOriginalDataState: function() {
    try {
      if (!this.originalDataState) {
        console.warn('⚠️ Aucun état original à restaurer');
        return;
      }
      
      // CORRIGÉ: Restaurer seulement pieces et motherBars
      this.dataManager.data.pieces = JSON.parse(JSON.stringify(this.originalDataState.pieces));
      this.dataManager.data.motherBars = JSON.parse(JSON.stringify(this.originalDataState.motherBars));
      
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
   * Affiche les statistiques détaillées des données pour le débogage (CORRIGÉ)
   */
  logDataStatistics: function(data) {
    console.log('📊 === STATISTIQUES DES DONNÉES ===');
    
    // Compter les pièces
    let totalPieces = 0;
    let pieceProfiles = 0;
    let totalPieceTypes = 0;
    for (const profile in data.pieces) {
      pieceProfiles++;
      const profilePieces = data.pieces[profile];
      const profileTotal = profilePieces.reduce((sum, piece) => sum + piece.quantity, 0);
      totalPieces += profileTotal;
      totalPieceTypes += profilePieces.length;
      console.log(`  🔧 ${profile}: ${profilePieces.length} types, ${profileTotal} pièces`);
    }
    
    // Compter les barres mères
    let totalMotherBars = 0;
    let motherProfiles = 0;
    let totalMotherTypes = 0;
    for (const profile in data.motherBars) {
      motherProfiles++;
      const profileBars = data.motherBars[profile];
      const profileTotal = profileBars.reduce((sum, bar) => sum + bar.quantity, 0);
      totalMotherBars += profileTotal;
      totalMotherTypes += profileBars.length;
      console.log(`  📏 ${profile}: ${profileBars.length} longueurs, ${profileTotal} barres`);
    }
    
    console.log(`📋 Total: ${totalPieces} pièces (${totalPieceTypes} types), ${totalMotherBars} barres mères (${totalMotherTypes} types)`);
    console.log(`📁 Profils: ${pieceProfiles} pour pièces, ${motherProfiles} pour barres`);
    // SUPPRIMÉ: Plus de référence à barsList
    console.log('📊 =====================================');
  },

  /**
   * Vérifie l'intégrité des données (SIMPLIFIÉ - Plus de barsList)
   */
  checkDataIntegrity: function() {
    const data = this.dataManager.getData();
    
    // CORRIGÉ: Vérifier seulement que les structures de base existent
    if (!data.pieces || !data.motherBars) {
      console.warn('⚠️ Structure de données corrompue, réinitialisation...');
      this.dataManager.initData();
      return false;
    }
    
    // NOUVEAU: Vérifications de cohérence interne
    for (const profile in data.pieces) {
      if (!Array.isArray(data.pieces[profile])) {
        console.warn(`⚠️ Structure pieces[${profile}] corrompue`);
        return false;
      }
      
      // Vérifier chaque pièce
      for (const piece of data.pieces[profile]) {
        if (!piece.profile || !piece.length || !piece.quantity) {
          console.warn(`⚠️ Pièce invalide dans ${profile}:`, piece);
          return false;
        }
      }
    }
    
    for (const profile in data.motherBars) {
      if (!Array.isArray(data.motherBars[profile])) {
        console.warn(`⚠️ Structure motherBars[${profile}] corrompue`);
        return false;
      }
      
      // Vérifier chaque barre mère
      for (const bar of data.motherBars[profile]) {
        if (!bar.profile || !bar.length || !bar.quantity) {
          console.warn(`⚠️ Barre mère invalide dans ${profile}:`, bar);
          return false;
        }
      }
    }
    
    console.log('✅ Intégrité des données vérifiée');
    return true;
  },

  /**
   * NOUVEAU: Compte le nombre total d'éléments dans les données
   */
  getTotalDataElements: function() {
    const data = this.dataManager.getData();
    let totalElements = 0;
    
    // Compter les types de pièces
    for (const profile in data.pieces) {
      totalElements += data.pieces[profile].length;
    }
    
    // Compter les types de barres mères  
    for (const profile in data.motherBars) {
      totalElements += data.motherBars[profile].length;
    }
    
    return totalElements;
  },

  /**
   * Vérifie l'intégrité des données et rafraîchit l'affichage (AMÉLIORÉ)
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
      } else {
        console.log(`✅ ${this.getTotalDataElements()} éléments de données validés`);
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
   * Lance l'optimisation avec étapes RÉELLES synchronisées
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
      const progress = document.querySelector('#loading-overlay .loading-progress');
      if (progress) progress.style.display = 'none';

      // === 1. CRÉATION DES MODÈLES ===
      // Création des modèles AVANT génération des étapes
      const models = this.algorithmService.createModelsFromDataManager();
      console.log(`📋 ${models.length} modèles créés`);

      // === 2. GÉNÉRATION DES ÉTAPES ===
      this.generateExecutionSteps(models);
      
      // === 3. ÉTAPE TRANSFORM ===
      await this.activateStep('step-transform', 'Préparation des modèles...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulation du temps de préparation
      await this.completeStep('step-transform', 'Modèles prêts');

      // === 4. EXÉCUTION RÉELLE ÉTAPE PAR ÉTAPE ===
      const allResults = await this.runRealAlgorithmSteps(models);

      // === 5. COMPARAISON FINALE ===
      const finalResults = await this.runFinalComparison(allResults);
      this.currentResults = finalResults;

      // === 6. GÉNÉRATION DES PGM ===
      await this.runPgmGenerationStep();

      // === 7. AFFICHAGE DES RÉSULTATS ===
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
   * Génère les étapes d'exécution basées sur les modèles réels - VERSION SIMPLIFIÉE
   * Une étape par modèle (FFD + ILP en arrière-plan)
   */
  generateExecutionSteps: function(models) {
    const stepsContainer = document.querySelector('#loading-overlay .loading-steps');
    if (!stepsContainer) return;
    
    stepsContainer.innerHTML = '';
    let stepNum = 1;

    // Étape 1 : Création des modèles
    stepsContainer.appendChild(
      this.createStepDiv('step-transform', stepNum++, 'Préparation des modèles')
    );

    // Une étape par modèle (FFD + ILP combinés)
    models.forEach((model, modelIndex) => {
      const modelLabel = model.label;
      
      stepsContainer.appendChild(
        this.createStepDiv(
          `step-model-${modelIndex}`, 
          stepNum++, 
          `Optimisation: ${modelLabel}`
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
    
    console.log(`🎯 ${stepNum - 1} étapes générées pour ${models.length} modèles`);
  },

  /**
   * NOUVEAU: Active une étape (état "en cours")
   */
  activateStep: async function(stepId, message) {
    const step = document.getElementById(stepId);
    if (step) {
      // Marquer comme actif
      step.classList.add('active');
      step.classList.remove('completed');
      
      // SUPPRIMÉ: Plus de mise à jour du texte dynamique
      // UIUtils.setLoadingStepText(message);
      
      // Petite pause pour l'effet visuel
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`🟡 Étape ${stepId} activée: ${message}`);
  },

  /**
   * AMÉLIORÉ: Complète une étape avec animation
   */
  completeStep: async function(stepId, message) {
    const step = document.getElementById(stepId);
    if (step) {
      // Attendre un peu pour l'effet visuel de l'exécution
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Marquer comme complété
      step.classList.remove('active');
      step.classList.add('completed');
      
      // SUPPRIMÉ: Plus de mise à jour du texte dynamique
      // UIUtils.setLoadingStepText(message);
      
      // Petite pause avant l'étape suivante
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✅ Étape ${stepId} terminée: ${message}`);
  },

  /**
   * SIMPLIFIÉ: Exécute les deux algorithmes pour chaque modèle dans une seule étape
   * Une étape visuelle = FFD + ILP pour un modèle
   */
  runRealAlgorithmSteps: async function(models) {
    console.log('🚀 Exécution réelle étape par étape (version simplifiée)');
    
    const allResults = {};
    
    // Initialiser la structure des résultats
    models.forEach(model => {
      allResults[model.key] = {
        model: model,
        ffdResult: null,
        ilpResult: null
      };
    });

    // EXÉCUTION: Une étape par modèle (FFD + ILP combinés)
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const stepId = `step-model-${i}`;
      
      console.log(`🎯 Optimisation complète pour ${model.key} (${i + 1}/${models.length})`);
      
      // ACTIVER l'étape avant l'exécution
      await this.activateStep(stepId, `Optimisation de ${model.label}...`);
      
      try {
        // EXÉCUTION FFD en arrière-plan
        console.log(`  🔄 FFD pour ${model.key}`);
        const ffdResult = this.algorithmService.runAlgorithmOnSingleModel('ffd', model);
        allResults[model.key].ffdResult = ffdResult;
        
        // SUPPRIMÉ: Plus de mise à jour du message
        // UIUtils.setLoadingStepText(`Optimisation de ${model.label} (FFD terminé)...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // EXÉCUTION ILP en arrière-plan
        console.log(`  🔄 ILP pour ${model.key}`);
        const ilpResult = this.algorithmService.runAlgorithmOnSingleModel('ilp', model);
        allResults[model.key].ilpResult = ilpResult;
        
        // COMPLÉTER l'étape après les deux algorithmes
        await this.completeStep(stepId, `${model.label} optimisé`);
        
      } catch (error) {
        console.error(`❌ Erreur optimisation pour ${model.key}:`, error);
        
        // Essayer au moins un algorithme si l'autre a échoué
        if (!allResults[model.key].ffdResult && !allResults[model.key].ilpResult) {
          // Si les deux ont échoué, essayer juste FFD
          try {
            console.log(`  🔄 Tentative FFD seul pour ${model.key}`);
            const ffdResult = this.algorithmService.runAlgorithmOnSingleModel('ffd', model);
            allResults[model.key].ffdResult = ffdResult;
            await this.completeStep(stepId, `${model.label} optimisé (FFD uniquement)`);
          } catch (ffdError) {
            console.error(`❌ Erreur FFD pour ${model.key}:`, ffdError);
            await this.completeStep(stepId, `${model.label} - Échec optimisation`);
          }
        } else {
          await this.completeStep(stepId, `${model.label} partiellement optimisé`);
        }
      }
    }
    
    return allResults;
  },

  /**
   * NOUVEAU: Effectue la comparaison finale et sélection des meilleurs résultats
   */
  runFinalComparison: async function(allResults) {
    const stepCompareId = 'step-compare';
    
    // ACTIVER l'étape de comparaison
    await this.activateStep(stepCompareId, 'Comparaison des algorithmes et sélection...');
    
    console.log('🔄 Comparaison finale des résultats');
    
    const modelResults = {};
    
    // Comparer et sélectionner pour chaque modèle
    for (const [modelKey, results] of Object.entries(allResults)) {
      const { ffdResult, ilpResult } = results;
      
      if (ffdResult || ilpResult) {
        const bestResult = this.algorithmService.selectBestForModel(modelKey, ffdResult, ilpResult);
        modelResults[modelKey] = bestResult;
      }
    }
    
    // Construire les résultats finaux
    const finalResults = this.algorithmService.buildFinalResults(modelResults);
    
    // COMPLÉTER l'étape de comparaison
    await this.completeStep(stepCompareId, 'Comparaison terminée');
    
    return finalResults;
  },

  /**
   * AMÉLIORÉ: Exécute l'étape de génération PGM
   */
  runPgmGenerationStep: async function() {
    const stepPgmId = 'step-pgm';
    
    // ACTIVER l'étape PGM
    await this.activateStep(stepPgmId, 'Génération des fichiers PGM...');
    
    try {
      // Génération réelle des PGM
      this.currentPgmObjects = this.pgmManager.generatePgmObjects(this.currentResults);
      ResultsRenderer.renderResults(this.currentResults, this.algorithmService);
      this.resultsHandler.generatePgmPreviews();
      
      // COMPLÉTER l'étape PGM
      await this.completeStep(stepPgmId, 'Fichiers PGM générés');
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération PGM:', error);
      await this.completeStep(stepPgmId, 'Erreur génération PGM');
      this.showNotification('Erreur lors de la génération des aperçus PGM', 'warning');
    }
  },

  /**
   * CORRIGÉ: Lance l'optimisation avec l'étape transform bien gérée
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
      const progress = document.querySelector('#loading-overlay .loading-progress');
      if (progress) progress.style.display = 'none';

      // === 1. CRÉATION DES MODÈLES ===
      // Création des modèles AVANT génération des étapes
      const models = this.algorithmService.createModelsFromDataManager();
      console.log(`📋 ${models.length} modèles créés`);

      // === 2. GÉNÉRATION DES ÉTAPES ===
      this.generateExecutionSteps(models);
      
      // === 3. ÉTAPE TRANSFORM ===
      await this.activateStep('step-transform', 'Préparation des modèles...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulation du temps de préparation
      await this.completeStep('step-transform', 'Modèles prêts');

      // === 4. EXÉCUTION RÉELLE ÉTAPE PAR ÉTAPE ===
      const allResults = await this.runRealAlgorithmSteps(models);

      // === 5. COMPARAISON FINALE ===
      const finalResults = await this.runFinalComparison(allResults);
      this.currentResults = finalResults;

      // === 6. GÉNÉRATION DES PGM ===
      await this.runPgmGenerationStep();

      // === 7. AFFICHAGE DES RÉSULTATS ===
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
   * MÉTHODE MANQUANTE: Efface les résultats d'optimisation précédents
   */
  clearOptimizationResults: function() {
    try {
      console.log('🧹 Nettoyage des résultats d\'optimisation précédents');
      
      // Réinitialiser les résultats actuels
      this.currentResults = null;
      this.currentPgmObjects = null;
      
      // Nettoyer l'interface des résultats
      const globalSummaryContainer = document.getElementById('global-summary-container');
      if (globalSummaryContainer) {
        globalSummaryContainer.innerHTML = '';
      }
      
      const modelDetailsContainer = document.getElementById('model-details-container');
      if (modelDetailsContainer) {
        modelDetailsContainer.innerHTML = '';
      }
      
      const pgmFilesContainer = document.getElementById('pgm-files-list');
      if (pgmFilesContainer) {
        pgmFilesContainer.innerHTML = '';
      }
      
      // Masquer la section résultats et afficher la section données
      const resultSection = document.getElementById('result-section');
      const dataSection = document.getElementById('data-section');
      
      if (resultSection) {
        resultSection.classList.remove('active');
      }
      
      if (dataSection) {
        dataSection.classList.add('active');
      }
      
      // Masquer la navigation résultats
      const resultsNav = document.getElementById('results-nav');
      if (resultsNav) {
        resultsNav.style.display = 'none';
      }
      
      console.log('✅ Résultats d\'optimisation nettoyés');
      
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des résultats:', error);
    }
  },

  /**
   * MÉTHODE MANQUANTE: Affiche les onglets de résultats
   */
  showResultsTabs: function() {
    try {
      console.log('📊 Affichage des onglets de résultats');
      
      // Vérifier que nous avons des résultats à afficher
      if (!this.currentResults) {
        console.warn('⚠️ Aucun résultat à afficher');
        return;
      }
      
      // Basculer vers la section résultats
      this.showSection('result-section');
      
      // Afficher la navigation résultats
      const resultsNav = document.getElementById('results-nav');
      if (resultsNav) {
        resultsNav.style.display = 'flex';
      }
      
      console.log('✅ Onglets de résultats affichés');
      
      // MODIFIÉ: Scroll immédiat vers le haut sans animation, puis pas de scroll vers les détails
      setTimeout(() => {
        // Scroll instantané vers le haut de la page (sans animation)
        window.scrollTo({ top: 0, behavior: 'instant' });
        console.log('🔝 Page positionnée en haut');
        
        // SUPPRIMÉ: Le scroll vers les détails des modèles
        // La page reste simplement en haut, l'utilisateur peut défiler manuellement
        
      }, 100); // Court délai pour laisser le rendu se faire
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'affichage des résultats:', error);
      this.showNotification('Erreur lors de l\'affichage des résultats', 'error');
    }
  },

  // ... [autres méthodes existantes] ...
};