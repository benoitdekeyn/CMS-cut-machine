import { EditController } from './ui/edit-controller.js'; // MODIFIÉ: Import direct
import { ImportHandler } from './ui/import-handler.js';
import { ImportManager } from './import-manager.js';
import { UIUtils } from './ui/utils.js';
import { ResultsHandler } from './ui/results-handler.js';
import { NotificationService } from './ui/notification-service.js';
import { DataManager } from './data-manager.js';
import { AlgorithmService } from './algorithm-service.js';
import { F4CManager } from './F4C-manager.js';
import { F4CGenerator } from './F4C-generator.js';
import { ResultsRenderer } from './results-renderer.js';

/**
 * Contrôleur d'interface utilisateur principal (ADAPTÉ SANS ID)
 */
export const UIController = {
  // Services et gestionnaires
  dataManager: null,
  algorithmService: null,
  importManager: null,
  F4CGenerator: null,
  F4CManager: null,
  
  // Gestionnaires UI
  importHandler: null,
  editHandler: null, // MODIFIÉ: Sera maintenant EditController
  resultsHandler: null,
  notificationService: null,
  
  // État de l'application
  currentResults: null,
  currentF4CObjects: null,
  
  // NOUVEAU: Sauvegarde de l'état original des données
  originalDataState: null,

  /**
   * NOUVEAU: Initialise le thème au chargement
   */
  initializeTheme: function() {
    // MODIFIÉ: Ne plus utiliser localStorage, toujours partir du système
    const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    console.log(`🖥️ Initialisation avec le thème système: ${systemTheme}`);
    
    this.applyTheme(systemTheme);
    console.log('🎨 Thème initialisé selon le système');
  },

  /**
   * NOUVEAU: Applique un thème spécifique
   */
  applyTheme: function(theme) {
    const html = document.documentElement;
    console.log(`🎨 Application du thème: ${theme}`);
    
    // MODIFIÉ: Utiliser des classes au lieu de color-scheme
    if (theme === 'dark') {
      html.classList.add('dark-theme');
      html.classList.remove('light-theme');
    } else {
      html.classList.add('light-theme');
      html.classList.remove('dark-theme');
    }
    
    console.log(`✅ Thème ${theme} appliqué`);
  },

  /**
   * NOUVEAU: Détecte si le mode sombre est actif
   */
  isDarkMode: function() {
    // MODIFIÉ: Ne plus vérifier localStorage, toujours utiliser les classes appliquées ou le système
    const html = document.documentElement;
    
    // Vérifier si une classe de thème est appliquée
    if (html.classList.contains('dark-theme')) {
      return true;
    } else if (html.classList.contains('light-theme')) {
      return false;
    }
    
    // Sinon, utiliser la préférence système
    if (window.matchMedia) {
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log(`🎨 Préférence système: ${systemPreference ? 'dark' : 'light'}`);
      return systemPreference;
    }
    
    console.log('🎨 Par défaut: light');
    return false;
  },

  /**
   * NOUVEAU: Bascule entre les thèmes
   */
  toggleTheme: function() {
    const currentTheme = this.isDarkMode() ? 'light' : 'dark';
    console.log(`🎨 Basculement manuel vers: ${currentTheme}`);
    
    // SUPPRIMÉ: Ne plus sauvegarder la préférence utilisateur
    // localStorage.setItem('theme', currentTheme);
    console.log(`🔄 Basculement temporaire vers: ${currentTheme}`);
    
    // Appliquer le thème
    this.applyTheme(currentTheme);
    
    // Mettre à jour le toggle
    this.updateThemeToggleState();
    
    console.log(`✅ Thème basculé temporairement vers: ${currentTheme}`);
  },

  /**
   * NOUVEAU: Met à jour l'état visuel du toggle
   */
  updateThemeToggleState: function() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) {
      console.warn('⚠️ Impossible de mettre à jour le toggle (élément non trouvé)');
      return;
    }
    
    const isDarkMode = this.isDarkMode();
    console.log(`🎨 Mise à jour du toggle vers: ${isDarkMode ? 'dark' : 'light'}`);
    
    if (isDarkMode) {
      themeToggle.classList.add('dark');
    } else {
      themeToggle.classList.remove('dark');
    }
  },

  /**
   * NOUVEAU: Initialise l'état du toggle de thème
   */
  initializeThemeToggle: function() {
    console.log('🎨 Initialisation de l\'état du toggle');
    this.updateThemeToggleState();
  },

  /**
   * NOUVEAU: Configure le toggle de thème
   */
  setupThemeToggle: function() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      console.log('🎨 Configuration du toggle de thème');
      
      // Initialiser l'état du toggle selon le thème actuel
      this.initializeThemeToggle();
      
      // MODIFIÉ: Toggle qui bascule toujours entre les modes mais reste synchronisé au système
      themeToggle.addEventListener('click', (event) => {
        console.log('🎨 Toggle de thème cliqué !');
        event.preventDefault();
        event.stopPropagation();
        this.toggleTheme();
      });
      
      // MODIFIÉ: Toujours synchroniser avec le système, même s'il y a une préférence stockée
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
          console.log('🎨 Préférence système changée vers:', e.matches ? 'dark' : 'light');
          
          // NOUVEAU: Toujours suivre le système, peu importe les préférences stockées
          const newTheme = e.matches ? 'dark' : 'light';
          console.log(`🔄 Synchronisation automatique vers: ${newTheme}`);
          
          // Appliquer le nouveau thème
          this.applyTheme(newTheme);
          
          // Mettre à jour le toggle pour refléter le changement
          this.updateThemeToggleState();
          
          // Notification discrète
          if (this.showNotification) {
            this.showNotification(`Mode ${newTheme === 'dark' ? 'sombre' : 'clair'} (système)`, 'info');
          }
        });
      }
      
      console.log('✅ Toggle de thème configuré avec synchronisation automatique permanente');
    } else {
      console.warn('⚠️ Élément theme-toggle non trouvé');
    }
  },

  /**
   * NOUVEAU: Méthode pour réinitialiser et suivre les préférences système
   */
  resetToSystemTheme: function() {
    console.log('🔄 Réinitialisation vers les préférences système');
    
    // Supprimer la préférence stockée
    localStorage.removeItem('theme');
    
    // Détecter et appliquer le thème système actuel
    const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    console.log(`🖥️ Thème système détecté: ${systemTheme}`);
    
    // Appliquer le thème système
    this.applyTheme(systemTheme);
    
    // Mettre à jour le toggle
    this.updateThemeToggleState();
    
    if (this.showNotification) {
      this.showNotification('Synchronisation automatique avec le système activée', 'info');
    }
    
    console.log('✅ Synchronisation système activée');
  },

  /**
   * NOUVEAU: Initialise l'état du toggle de thème
   */
  initializeThemeToggle: function() {
    console.log('🎨 Initialisation de l\'état du toggle');
    this.updateThemeToggleState();
  },

  /**
   * NOUVEAU: Configure le toggle de thème
   */
  setupThemeToggle: function() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      console.log('🎨 Configuration du toggle de thème');
      
      // Initialiser l'état du toggle selon le thème actuel
      this.initializeThemeToggle();
      
      // MODIFIÉ: Toggle qui bascule toujours entre les modes mais reste synchronisé au système
      themeToggle.addEventListener('click', (event) => {
        console.log('🎨 Toggle de thème cliqué !');
        event.preventDefault();
        event.stopPropagation();
        this.toggleTheme();
      });
      
      // MODIFIÉ: Toujours synchroniser avec le système, même s'il y a une préférence stockée
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
          console.log('🎨 Préférence système changée vers:', e.matches ? 'dark' : 'light');
          
          // NOUVEAU: Toujours suivre le système, peu importe les préférences stockées
          const newTheme = e.matches ? 'dark' : 'light';
          console.log(`🔄 Synchronisation automatique vers: ${newTheme}`);
          
          // Appliquer le nouveau thème
          this.applyTheme(newTheme);
          
          // Mettre à jour le toggle pour refléter le changement
          this.updateThemeToggleState();
          
          // Notification discrète
          if (this.showNotification) {
            this.showNotification(`Mode ${newTheme === 'dark' ? 'sombre' : 'clair'} (système)`, 'info');
          }
        });
      }
      
      console.log('✅ Toggle de thème configuré avec synchronisation automatique permanente');
    } else {
      console.warn('⚠️ Élément theme-toggle non trouvé');
    }
  },

  /**
   * NOUVEAU: Configure le bouton "Éditer les données"
   */
  setupEditDataButton: function() {
    const editDataBtn = document.getElementById('edit-data-btn');
    if (editDataBtn) {
      editDataBtn.addEventListener('click', () => {
        console.log('🔄 Retour à l\'édition des données');
        this.showSection('data-section');
      });
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
      
      // NOUVEAU: Configuration du toggle de thème
      this.setupThemeToggle();
      
      console.log('Gestionnaires d\'événements configurés');
      
    } catch (error) {
      console.error('Erreur lors de la configuration des événements:', error);
    }
  },

  /**
   * Initialise le contrôleur et tous les services
   */
  init: async function() {
    try {
      console.log('🚀 Initialisation de l\'application...');
      
      // NOUVEAU: Initialiser le thème en premier
      this.initializeTheme();
      
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
    this.F4CGenerator = F4CGenerator;
    this.F4CManager = F4CManager;
    
    // NOUVEAU: Initialiser les données (chargement automatique du localStorage)
    this.dataManager.initData();
    
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
      
      // MODIFIÉ: Utiliser EditController directement
      this.editHandler = EditController;
      this.editHandler.init({
        dataManager: this.dataManager,
        showNotification: (msg, type) => this.showNotification(msg, type),
        refreshDataDisplay: () => this.refreshDataDisplay()
      });
      
      this.resultsHandler = ResultsHandler;
      this.resultsHandler.init({
        F4CGenerator: this.F4CGenerator,
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
   * Méthode pour obtenir les objets F4C actuels
   */
  getCurrentF4CObjects: function() {
    return this.currentF4CObjects;
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
    
    // MODIFIÉ: Gérer l'affichage de la navigation avec le toggle
    const editDataBtn = document.getElementById('edit-data-btn');
    const themeToggleContainer = document.getElementById('theme-toggle-container');
    
    if (sectionName === 'result-section') {
      // Page résultats : afficher le bouton "Éditer les Données", masquer le toggle
      if (editDataBtn) {
        editDataBtn.style.display = 'flex';
      }
      if (themeToggleContainer) {
        themeToggleContainer.style.display = 'none';
      }
    } else {
      // Page données : masquer le bouton "Éditer les Données", afficher le toggle
      if (editDataBtn) {
        editDataBtn.style.display = 'none';
      }
      if (themeToggleContainer) {
        themeToggleContainer.style.display = 'flex';
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
          .map(([length, count]) => `${count}×${length}mm`)
          .join(' + ');
        
        // Calculer l'efficacité
        const usedLength = cuts.reduce((sum, cut) => sum + cut, 0);
        const efficiency = barLength > 0 ? ((usedLength / barLength) * 100).toFixed(1) : 0;
        
        console.log(`  Schéma #${index + 1}: ${count}× répétition(s)`);
        console.log(`    └─ Barre ${barLength}mm: ${cutsDisplay}`);
        console.log(`    └─ Chute: ${waste}mm | Efficacité: ${efficiency}%`);
      });
      
      // Statistiques du modèle
      const totalBars = layouts.reduce((sum, layout) => sum + (layout.count || 1), 0);
      const totalWaste = layouts.reduce((sum, layout) => sum + ((layout.count || 1) * (layout.waste || 0)), 0);
      const totalLength = layouts.reduce((sum, layout) => sum + ((layout.count || 1) * (layout.originalLength || 0)), 0);
      const globalEfficiency = totalLength > 0 ? (((totalLength - totalWaste) / totalLength) * 100).toFixed(1) : 0;
      
      console.log(`\n  📊 Résumé ${modelKey}:`);
      console.log(`    • ${totalBars} barres mères utilisées`);
      console.log(`    • ${totalWaste}mm de chutes au total`);
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

      // === 6. GÉNÉRATION DES F4C ===
      await this.runF4CGenerationStep();

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
      this.createStepDiv('step-F4C', stepNum++, 'Génération des fichiers F4C')
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
   * AMÉLIORÉ: Exécute l'étape de génération F4C
   */
  runF4CGenerationStep: async function() {
    const stepF4CId = 'step-F4C';
    
    // ACTIVER l'étape F4C
    await this.activateStep(stepF4CId, 'Génération des fichiers F4C...');
    
    try {
      // Génération réelle des F4C
      this.currentF4CObjects = this.F4CManager.generateF4CObjects(this.currentResults);
      ResultsRenderer.renderResults(this.currentResults, this.algorithmService);
      this.resultsHandler.generateF4CPreviews();
      
      // COMPLÉTER l'étape F4C
      await this.completeStep(stepF4CId, 'Fichiers F4C générés');
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération F4C:', error);
      await this.completeStep(stepF4CId, 'Erreur génération F4C');
      this.showNotification('Erreur lors de la génération des aperçus F4C', 'warning');
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
   * Validation plus robuste avec débogage détaillé ET vérification de longueur
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
    const allPieceRequirements = []; // Pour stocker les besoins de chaque pièce
    
    for (const profile in data.pieces) {
      for (const piece of data.pieces[profile]) {
        totalPieces += piece.quantity;
        pieceDetails.push(`${profile}: ${piece.quantity}×${piece.length}mm`);
        
        // Stocker les besoins pour la validation ultérieure
        allPieceRequirements.push({
          profile: piece.profile,
          length: piece.length,
          quantity: piece.quantity,
          orientation: piece.orientation || 'a-plat',
          nom: piece.nom || `${profile}_${piece.length}mm`
        });
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
    const motherBarCapabilities = {}; // Structure: {profile: [{length: X, quantity: Y}, ...]}
    
    for (const profile in data.motherBars) {
      if (!motherBarCapabilities[profile]) {
        motherBarCapabilities[profile] = [];
      }
      
      for (const bar of data.motherBars[profile]) {
        totalMotherBars += bar.quantity;
        motherDetails.push(`${profile}: ${bar.quantity}×${bar.length}mm`);
        
        motherBarCapabilities[profile].push({
          length: bar.length,
          quantity: bar.quantity
        });
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
    
    // NOUVELLE VALIDATION: Vérifier la compatibilité profil + longueur
    console.log('🔍 === VALIDATION COMPATIBILITÉ PROFIL + LONGUEUR ===');
    
    const incompatiblePieces = [];
    const missingProfiles = new Set();
    const insufficientLengths = [];
    
    for (const pieceReq of allPieceRequirements) {
      const profile = pieceReq.profile;
      const requiredLength = pieceReq.length;
      
      // 1. Vérifier si le profil existe
      if (!motherBarCapabilities[profile]) {
        missingProfiles.add(profile);
        incompatiblePieces.push({
          ...pieceReq,
          issue: 'profil_manquant'
        });
        continue;
      }
      
      // 2. Vérifier si au moins une barre mère a une longueur suffisante
      const compatibleBars = motherBarCapabilities[profile].filter(bar => bar.length >= requiredLength);
      
      if (compatibleBars.length === 0) {
        // Aucune barre mère assez longue
        const maxAvailableLength = Math.max(...motherBarCapabilities[profile].map(bar => bar.length));
        
        insufficientLengths.push({
          ...pieceReq,
          maxAvailableLength,
          issue: 'longueur_insuffisante'
        });
        
        incompatiblePieces.push({
          ...pieceReq,
          maxAvailableLength,
          issue: 'longueur_insuffisante'
        });
      } else {
        // Compatible - log pour debug
        console.log(`✅ ${pieceReq.nom}: ${compatibleBars.length} barre(s) mère(s) compatible(s)`);
      }
    }
    
    // Rapport des problèmes trouvés
    if (missingProfiles.size > 0) {
      console.error(`❌ Profils manquants: ${Array.from(missingProfiles).join(', ')}`);
    }
    
    if (insufficientLengths.length > 0) {
      console.error(`❌ ${insufficientLengths.length} pièce(s) avec longueur insuffisante:`);
      insufficientLengths.forEach(piece => {
        console.error(`   • ${piece.nom} (${piece.profile}): besoin ${UIUtils.formatLenght(piece.length)}mm, max disponible ${UIUtils.formatLenght(piece.maxAvailableLength)}mm`);
      });
    }
    
    // Si des incompatibilités existent, afficher un message d'erreur détaillé
    if (incompatiblePieces.length > 0) {
      const errorMessages = this.generateCompatibilityErrorMessage(incompatiblePieces, missingProfiles, insufficientLengths);
      this.showNotification(errorMessages.short, 'error');
      
      // Log détaillé pour la console
      console.error('❌ === INCOMPATIBILITÉS DÉTECTÉES ===');
      console.error(errorMessages.detailed);
      console.error('❌ =====================================');
      
      return false;
    }
    
    console.log('✅ Validation de compatibilité réussie');
    console.log('🔍 =======================================');
    return true;
  },

  /**
   * NOUVEAU: Génère des messages d'erreur détaillés mais synthétiques pour les incompatibilités
   */
  generateCompatibilityErrorMessage: function(incompatiblePieces, missingProfiles, insufficientLengths) {
    let shortMessage = '';
    let detailedMessage = '';
    
    // Messages pour les profils manquants
    if (missingProfiles.size > 0) {
      const profilesList = Array.from(missingProfiles).join(', ');
      if (missingProfiles.size === 1) {
        shortMessage += `Profil ${profilesList} : aucune barre mère disponible. `;
      } else {
        shortMessage += `Profils ${profilesList} : aucune barre mère disponible. `;
      }
      detailedMessage += `PROFILS MANQUANTS:\n${profilesList}\n\n`;
    }
    
    // Messages pour les longueurs insuffisantes - VERSION DÉTAILLÉE
    if (insufficientLengths.length > 0) {
      if (insufficientLengths.length === 1) {
        const piece = insufficientLengths[0];
        shortMessage += `${piece.nom} (${piece.profile}) : besoin ${UIUtils.formatLenght(piece.length)}mm, max disponible ${UIUtils.formatLenght(piece.maxAvailableLength)}mm (déficit ${UIUtils.formatLenght(piece.length - piece.maxAvailableLength)}mm).`;
      } else if (insufficientLengths.length <= 3) {
        // Afficher jusqu'à 3 pièces problématiques
        const piecesList = insufficientLengths.map(piece => 
          `${piece.nom} (${UIUtils.formatLenght(piece.length)}mm > ${UIUtils.formatLenght(piece.maxAvailableLength)}mm)`
        ).join(', ');
        shortMessage += `Pièces trop longues : ${piecesList}.`;
      } else {
        // Plus de 3 pièces : résumer
        const firstThree = insufficientLengths.slice(0, 2);
        const piecesList = firstThree.map(piece => 
          `${piece.nom} (${UIUtils.formatLenght(piece.length)}mm > ${UIUtils.formatLenght(piece.maxAvailableLength)}mm)`
        ).join(', ');
        shortMessage += `${insufficientLengths.length} pièces trop longues : ${piecesList} et ${insufficientLengths.length - 2} autre(s).`;
      }
      
      detailedMessage += `LONGUEURS INSUFFISANTES:\n`;
      insufficientLengths.forEach(piece => {
        detailedMessage += `• ${piece.nom} (${piece.profile}): \n`;
        detailedMessage += `  Besoin: ${UIUtils.formatLenght(piece.length)}mm\n`;
        detailedMessage += `  Maximum disponible: ${UIUtils.formatLenght(piece.maxAvailableLength)}mm\n`;
        detailedMessage += `  Déficit: ${UIUtils.formatLenght(piece.length - piece.maxAvailableLength)}mm\n\n`;
      });
    }
    
    // Message de suggestion synthétique
    if (missingProfiles.size > 0 && insufficientLengths.length > 0) {
      shortMessage += ` Ajoutez des barres mères pour ces profils et longueurs.`;
    } else if (missingProfiles.size > 0) {
      shortMessage += ` Ajoutez des barres mères pour ces profils.`;
    } else if (insufficientLengths.length > 0) {
      shortMessage += ` Ajoutez des barres mères plus longues.`;
    }
    
    return {
      short: shortMessage.trim(),
      detailed: detailedMessage.trim()
    };
  },

  /**
   * MÉTHODE MANQUANTE: Efface les résultats d'optimisation précédents
   */
  clearOptimizationResults: function() {
    try {
      console.log('🧹 Nettoyage des résultats d\'optimisation précédents');
      
      // Réinitialiser les résultats actuels
      this.currentResults = null;
      this.currentF4CObjects = null;
      
      // Nettoyer l'interface des résultats
      const globalSummaryContainer = document.getElementById('global-summary-container');
      if (globalSummaryContainer) {
        globalSummaryContainer.innerHTML = '';
      }
      
      const modelDetailsContainer = document.getElementById('model-details-container');
      if (modelDetailsContainer) {
        modelDetailsContainer.innerHTML = '';
      }
      
      const F4CFilesContainer = document.getElementById('F4C-files-list');
      if (F4CFilesContainer) {
        F4CFilesContainer.innerHTML = '';
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
  }
};