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
      console.log('Configuration des gestionnaires d\'événements...');
      
      // CORRECTION : Utiliser le bon ID du bouton
      const setupOptimizeButton = () => {
        const optimizeBtn = document.getElementById('generate-cuts-btn');
        if (optimizeBtn) {
          console.log('Bouton de génération trouvé');
          
          // Supprimer les anciens listeners pour éviter les doublons
          optimizeBtn.replaceWith(optimizeBtn.cloneNode(true));
          
          // Récupérer le nouveau bouton et ajouter le listener
          const newOptimizeBtn = document.getElementById('generate-cuts-btn');
          newOptimizeBtn.addEventListener('click', (e) => {
            console.log('Clic sur le bouton de génération détecté');
            e.preventDefault();
            
            // Pas de sélection d'algorithme dans le HTML actuel, utiliser la comparaison par défaut
            const algorithmType = 'compare';
            console.log(`Algorithme sélectionné: ${algorithmType}`);
            
            this.runOptimization(algorithmType);
          });
          
          console.log('Event listener attaché au bouton de génération');
        } else {
          console.warn('Bouton de génération non trouvé');
        }
      };
      
      // NOUVEAU : Configurer le bouton de test
      const setupTestButton = () => {
        const testBtn = document.getElementById('test-algorithms-btn');
        if (testBtn) {
          testBtn.addEventListener('click', (e) => {
            console.log('Clic sur le bouton de test détecté');
            e.preventDefault();
            this.showTestScenarioModal();
          });
          console.log('Event listener attaché au bouton de test');
        }
      };
      
      // Configurer les boutons
      setupOptimizeButton();
      setupTestButton();
      
      // Supprimer la configuration du bouton retour
      // const setupBackButton = () => {
      //   const backBtn = document.getElementById('back-to-data-btn');
      //   if (backBtn) {
      //     backBtn.addEventListener('click', () => {
      //       this.showSection('data');
      //     });
      //   }
      // };
      // setupBackButton();
      
      // Configuration des onglets de navigation
      this.setupNavigationTabs();
      
      // NOUVEAU : Configuration de la sélection d'algorithme
      this.setupAlgorithmSelection();
      
      console.log('Gestionnaires d\'événements configurés');
      
    } catch (error) {
      console.error('Erreur lors de la configuration des événements:', error);
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
      // SUPPRESSION: Plus de notification de chargement
      // this.showNotification('Optimisation en cours...', 'info');
      
      // Lancer l'algorithme
      console.log(`Lancement de l'optimisation (${algorithmType})`);
      const results = this.algorithmService.runAlgorithm(algorithmType, data);
      
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
      
      // Générer les aperçus PGM avec le générateur intégré
      this.resultsHandler.generatePgmPreviews();
      
      // Afficher les onglets de résultats
      this.showResultsTabs();
      
      // SUPPRESSION: Plus de notification de succès
      // this.showNotification(`Optimisation terminée - ${summaryReport.totalPgmObjects} barres à découper`, 'success');
      
    } catch (error) {
      console.error('Erreur lors de l\'optimisation:', error);
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
  },
  
  /**
   * NOUVEAU : Crée différents cas de test pour démontrer la supériorité d'ILP
   */
  createAdvancedTestData: function(scenario = 'ILP_meilleur') {
    const testScenarios = {
      // CAS où FFD devrait être meilleur : Multiples tailles qui s'emboîtent parfaitement pour FFD
      'FFD_meilleur': {
        pieces: {
          'FFDBEST_debout': [
            // FFD placera efficacement ces pièces en ordre décroissant
            { id: 'test_1', nom: 'Big', profile: 'FFDBEST', length: 500, quantity: 10, orientation: 'debout', type: 'fille' },
            { id: 'test_2', nom: 'Med', profile: 'FFDBEST', length: 300, quantity: 10, orientation: 'debout', type: 'fille' },
            { id: 'test_3', nom: 'Small', profile: 'FFDBEST', length: 200, quantity: 10, orientation: 'debout', type: 'fille' },
            // Ces pièces s'emboîtent bien : 500+300+200=1000 (parfait)
          ]
        },
        motherBars: {
          'FFDBEST_debout': [
            { id: 'mother_1', profile: 'FFDBEST', length: 1000, quantity: 1000000, type: 'mother' }
          ]
        }
      },

      // CAS où ILP devrait être meilleur : Le problème classique du "Bin Packing" difficile
      'ILP_meilleur': {
        pieces: {
          'ILPBEST_debout': [
            // Sized to create the classic "First Fit Decreasing" vs "Optimal" problem
            { id: 'test_1', nom: 'A', profile: 'ILPBEST', length: 420, quantity: 8, orientation: 'debout', type: 'fille' },
            { id: 'test_2', nom: 'B', profile: 'ILPBEST', length: 320, quantity: 8, orientation: 'debout', type: 'fille' },
            { id: 'test_3', nom: 'C', profile: 'ILPBEST', length: 260, quantity: 8, orientation: 'debout', type: 'fille' }
          ]
        },
        motherBars: {
          'ILPBEST_debout': [
            { id: 'mother_1', profile: 'ILPBEST', length: 1000, quantity: 1000000, type: 'mother' }
          ]
        }
      }
    };
    
    return testScenarios[scenario] || testScenarios['ILP_meilleur'];
  },
  
  /**
   * NOUVEAU : Lance un test avec sélection de scénario
   */
  runAlgorithmTest: async function(scenario = 'default') {
    try {
      console.log(`🧪 === DÉBUT DU TEST DE COMPARAISON ILP vs FFD (${scenario.toUpperCase()}) ===`);
      
      UIUtils.showLoadingOverlay();
      this.showNotification(`Test de comparaison en cours (${scenario})...`, 'info');
      
      // Données de test hardcodées selon le scénario
      const testData = this.createAdvancedTestData(scenario);
      
      console.log(`📊 Données de test (${scenario}):`, testData);
      this.analyzeTestCase(testData, scenario);
      
      // Transformer les données au format attendu par les algorithmes
      const modelData = this.algorithmService.transformDataToModels(testData);
      
      // Tester FFD
      console.log('\n🔄 === TEST FFD ===');
      const startTimeFFD = performance.now();
      const ffdResults = this.algorithmService.runFFDAlgorithm(testData);
      const endTimeFFD = performance.now();
      const ffdTime = (endTimeFFD - startTimeFFD).toFixed(2);
      
      console.log(`⏱️ FFD terminé en ${ffdTime}ms`);
      
      // Tester ILP
      console.log('\n🔄 === TEST ILP ===');
      const startTimeILP = performance.now();
      const ilpResults = this.algorithmService.runILPAlgorithm(testData);
      const endTimeILP = performance.now();
      const ilpTime = (endTimeILP - startTimeILP).toFixed(2);
      
      console.log(`⏱️ ILP terminé en ${ilpTime}ms`);
      
      // Comparer les résultats
      const comparison = this.compareTestResults(ffdResults, ilpResults, ffdTime, ilpTime);
      this.displayDetailedComparison(scenario, comparison, testData);
      
      // Utiliser les meilleurs résultats pour affichage
      const bestResults = this.algorithmService.compareAndSelectBest(ffdResults, ilpResults);
      
      // Stocker les résultats comme si c'était une optimisation normale
      this.currentResults = bestResults;
      
      // Générer les objets PGM
      console.log('🔧 Génération des objets PGM de test...');
      this.currentPgmObjects = this.pgmManager.generatePgmObjects(bestResults, this.dataManager);
      
      // Afficher les résultats
      ResultsRenderer.renderResults(bestResults, this.algorithmService);
      
      // Générer les aperçus PGM
      this.resultsHandler.generatePgmPreviews();
      this.showResultsTabs();
      
      const winnerText = comparison.winner === 'ILP' ? `ILP GAGNE avec ${comparison.ffd.bars - comparison.ilp.bars} barres en moins !` : 'FFD égal ou meilleur';
      this.showNotification(`Test "${scenario}" terminé - ${winnerText}`, comparison.winner === 'ILP' ? 'success' : 'warning');
      
      console.log('🧪 === FIN DU TEST DE COMPARAISON ===\n');
      
    } catch (error) {
      console.error('❌ Erreur lors du test:', error);
      this.showNotification(`Erreur lors du test: ${error.message}`, 'error');
    } finally {
      UIUtils.hideLoadingOverlay();
    }
  },
  
  /**
   * NOUVEAU : Analyse théorique du cas de test
   */
  analyzeTestCase: function(testData, scenario) {
    console.log(`\n🔍 === ANALYSE THÉORIQUE DU CAS "${scenario.toUpperCase()}" ===`);
    
    const modelKey = Object.keys(testData.pieces)[0];
    const pieces = testData.pieces[modelKey];
    const motherBars = testData.motherBars[modelKey];
    const barLength = motherBars[0].length;
    
    console.log(`📏 Barre mère: ${barLength}cm`);
    
    // Calculer les combinaisons possibles
    let totalPieces = 0;
    let totalLength = 0;
    
    console.log('📋 Pièces demandées:');
    pieces.forEach(piece => {
      console.log(`   - ${piece.quantity}× ${piece.length}cm (${piece.nom})`);
      totalPieces += piece.quantity;
      totalLength += piece.quantity * piece.length;
    });
    
    console.log(`📊 Total: ${totalPieces} pièces, ${totalLength}cm de matière`);
    console.log(`📦 Barres mères théoriques minimales: ${Math.ceil(totalLength / barLength)}`);
    
    // Analyser les combinaisons optimales possibles
    console.log('\n🧮 Combinaisons optimales théoriques:');
    pieces.forEach((piece1, i) => {
      pieces.forEach((piece2, j) => {
        if (i <= j) {
          const combination = piece1.length + piece2.length;
          const waste = barLength - combination;
          if (combination <= barLength) {
            console.log(`   ${piece1.length} + ${piece2.length} = ${combination}cm (chute: ${waste}cm)`);
          }
        }
      });
    });
    
    // Prédiction FFD vs ILP
    this.predictAlgorithmPerformance(pieces, barLength, scenario);
  },
  
  /**
   * NOUVEAU : Prédit la performance des algorithmes
   */
  predictAlgorithmPerformance: function(pieces, barLength, scenario) {
    console.log('\n🎯 PRÉDICTION DE PERFORMANCE:');
    
    switch(scenario) {
      case 'FFD_meilleur':
        console.log('FFD: Placera probablement 500+300+200=1000cm (combinaison parfaite)');
        console.log('ILP: Trouvera la même solution optimale');
        console.log('🎖️ Avantage prédit: FFD == ILP (égalité)');
        break;
        
      case 'ILP_meilleur':
        console.log('FFD: Placera 420 seuls ou avec petites pièces (inefficace)');
        console.log('ILP: Trouvera 420+320+260=1000cm (optimisation parfaite)');
        console.log('🎖️ Avantage prédit: ILP >> FFD');
        break;
        
      default:
        console.log('Cas de test standard - avantage modéré attendu pour ILP');
    }
  },
  
  /**
   * NOUVEAU : Affiche une comparaison détaillée avec analyse
   */
  displayDetailedComparison: function(scenario, comparison, testData) {
    console.log(`\n🏆 === RÉSULTATS DÉTAILLÉS (${scenario.toUpperCase()}) ===`);
    
    const improvement = ((comparison.ffd.bars - comparison.ilp.bars) / comparison.ffd.bars * 100).toFixed(1);
    const efficiencyGain = (comparison.ilp.efficiency - comparison.ffd.efficiency).toFixed(2);
    
    console.log(`📊 EFFICACITÉ:`);
    console.log(`   FFD: ${comparison.ffd.bars} barres, ${comparison.ffd.efficiency}% efficacité`);
    console.log(`   ILP: ${comparison.ilp.bars} barres, ${comparison.ilp.efficiency}% efficacité`);
    
    if (comparison.ilp.bars < comparison.ffd.bars) {
      console.log(`🎉 ILP GAGNE! ${comparison.ffd.bars - comparison.ilp.bars} barres économisées (${improvement}% d'amélioration)`);
      console.log(`📈 Gain d'efficacité: +${efficiencyGain}%`);
      
      // Calculer les économies en matière
      const motherBarLength = testData.motherBars[Object.keys(testData.motherBars)[0]][0].length;
      const materialSaved = (comparison.ffd.bars - comparison.ilp.bars) * motherBarLength;
      console.log(`💰 Matière économisée: ${materialSaved}cm de barres mères`);
      
    } else if (comparison.ilp.bars === comparison.ffd.bars) {
      console.log(`🤝 ÉGALITÉ: Même nombre de barres, efficacité ILP: ${efficiencyGain >= 0 ? '+' : ''}${efficiencyGain}%`);
    } else {
      console.log(`😕 FFD meilleur sur ce cas (rare)`);
    }
    
    console.log(`⏱️ TEMPS: FFD ${comparison.ffd.time}ms, ILP ${comparison.ilp.time}ms`);
  },
  
  /**
   * NOUVEAU : Compare et affiche les résultats des deux algorithmes
   */
  compareTestResults: function(ffdResults, ilpResults, ffdTime, ilpTime) {
    console.log('\n🔍 === COMPARAISON DÉTAILLÉE ===');
    
    // Statistiques FFD
    const ffdStats = ffdResults.globalStats.statistics;
    const ffdBars = ffdResults.globalStats.totalBarsUsed;
    const ffdEfficiency = parseFloat(ffdStats.utilizationRate);
    
    // Statistiques ILP
    const ilpStats = ilpResults.globalStats.statistics;
    const ilpBars = ilpResults.globalStats.totalBarsUsed;
    const ilpEfficiency = parseFloat(ilpStats.utilizationRate);
    
    console.log('📊 RÉSULTATS FFD:');
    console.log(`   - Barres utilisées: ${ffdBars}`);
    console.log(`   - Efficacité: ${ffdEfficiency}%`);
    console.log(`   - Temps d'exécution: ${ffdTime}ms`);
    
    console.log('📊 RÉSULTATS ILP:');
    console.log(`   - Barres utilisées: ${ilpBars}`);
    console.log(`   - Efficacité: ${ilpEfficiency}%`);
    console.log(`   - Temps d'exécution: ${ilpTime}ms`);
    
    // Comparaison
    const barsDifference = ffdBars - ilpBars;
    const efficiencyDifference = (ilpEfficiency - ffdEfficiency).toFixed(2);
    const timeDifference = (parseFloat(ilpTime) - parseFloat(ffdTime)).toFixed(2);
    
    console.log('🏆 COMPARAISON:');
    console.log(`   - Différence barres: ${barsDifference > 0 ? '+' : ''}${barsDifference} (ILP ${barsDifference < 0 ? 'MEILLEUR' : barsDifference > 0 ? 'MOINS BON' : 'ÉGAL'})`);
    console.log(`   - Différence efficacité: ${efficiencyDifference > 0 ? '+' : ''}${efficiencyDifference}% (ILP ${efficiencyDifference > 0 ? 'MEILLEUR' : efficiencyDifference < 0 ? 'MOINS BON' : 'ÉGAL'})`);
    console.log(`   - Différence temps: ${timeDifference > 0 ? '+' : ''}${timeDifference}ms (ILP ${timeDifference > 0 ? 'PLUS LENT' : 'PLUS RAPIDE'})`);
    
    // Déterminer le gagnant
    const ilpWins = (ilpBars < ffdBars) || (ilpBars === ffdBars && ilpEfficiency > ffdEfficiency);
    console.log(`🎖️ GAGNANT: ${ilpWins ? 'ILP' : 'FFD'}`);
    
    return {
      ffd: { bars: ffdBars, efficiency: ffdEfficiency, time: parseFloat(ffdTime) },
      ilp: { bars: ilpBars, efficiency: ilpEfficiency, time: parseFloat(ilpTime) },
      winner: ilpWins ? 'ILP' : 'FFD'
    };
  },
  
  /**
   * NOUVEAU : Crée un élément de sélection d'algorithme
   */
  createAlgorithmSelectionElement: function(algorithm) {
    const isSelected = algorithm.type === 'ilp' ? 'best' : '';
    return `
      <div class="efficiency-comparison ${isSelected}" data-algorithm="${algorithm.type}">
        <div class="algorithm-info">
          <span class="algorithm-name">${algorithm.name}</span>
          <span class="algorithm-tag">${algorithm.tag}</span>
        </div>
        <div class="algorithm-stats">
          <div class="stat-item">
            <span class="stat-label">Barres utilisées:</span>
            <span class="stat-value" id="ffd-bars">${algorithm.ffd.bars}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Efficacité:</span>
            <span class="stat-value" id="ffd-efficiency">${algorithm.ffd.efficiency}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Temps:</span>
            <span class="stat-value" id="ffd-time">${algorithm.ffd.time}ms</span>
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * Configure la sélection d'algorithme interactive
   */
  setupAlgorithmSelection: function() {
    // Utiliser la délégation d'événements pour les éléments générés dynamiquement
    document.addEventListener('click', (e) => {
      const algorithmCard = e.target.closest('.efficiency-comparison');
      if (algorithmCard && algorithmCard.hasAttribute('data-algorithm')) {
        const selectedAlgorithm = algorithmCard.getAttribute('data-algorithm');
        this.switchToAlgorithm(selectedAlgorithm);
      }
    });
  },
  
  /**
   * NOUVEAU : Bascule vers un algorithme spécifique et recalcule les PGM
   */
  switchToAlgorithm: async function(algorithmType) {
    try {
      if (!this.currentResults) {
        console.error('Aucun résultat disponible pour basculer');
        return;
      }

      UIUtils.showLoadingOverlay();
      
      console.log(`Basculement vers l'algorithme: ${algorithmType}`);
      
      // Récupérer les données originales
      const data = this.dataManager.getData();
      
      // Exécuter l'algorithme sélectionné
      let newResults;
      if (algorithmType === 'ffd') {
        newResults = this.algorithmService.runFFDAlgorithm(data);
        newResults.algorithmName = 'First-Fit Decreasing (sélectionné)';
        newResults.algorithmType = 'ffd';
      } else if (algorithmType === 'ilp') {
        newResults = this.algorithmService.runILPAlgorithm(data);
        newResults.algorithmName = 'Programmation Linéaire (sélectionné)';
        newResults.algorithmType = 'ilp';
      }
      
      // Conserver les données de comparaison originales
      if (this.currentResults.comparison) {
        newResults.comparison = this.currentResults.comparison;
        newResults.bestAlgorithm = algorithmType;
      }
      
      // Mettre à jour les résultats courants
      this.currentResults = newResults;
      
      // Recalculer les objets PGM
      console.log('Recalcul des objets PGM...');
      this.currentPgmObjects = this.pgmManager.generatePgmObjects(newResults, this.dataManager);
      
      // Re-rendre les résultats
      ResultsRenderer.renderResults(newResults, this.algorithmService);
      
      // Mettre à jour les aperçus PGM
      this.resultsHandler.generatePgmPreviews();
      
      // Mettre à jour l'interface de sélection
      this.updateAlgorithmSelection(algorithmType);
      
      console.log(`Basculement vers ${algorithmType} terminé`);
      
    } catch (error) {
      console.error('Erreur lors du basculement d\'algorithme:', error);
      this.showNotification(`Erreur lors du changement d'algorithme: ${error.message}`, 'error');
    } finally {
      UIUtils.hideLoadingOverlay();
    }
  },
  
  /**
   * NOUVEAU : Met à jour l'interface de sélection d'algorithme
   */
  updateAlgorithmSelection: function(selectedAlgorithm) {
    // Mettre à jour les classes visuelles
    document.querySelectorAll('.efficiency-comparison').forEach(card => {
      card.classList.remove('best');
    });
    
    const selectedCard = document.querySelector(`[data-algorithm="${selectedAlgorithm}"]`);
    if (selectedCard) {
      selectedCard.classList.add('best');
    }
    
    // Mettre à jour le texte affiché
    const algorithmNameSpan = document.getElementById('selected-algorithm-name');
    const algorithmTagSpan = document.getElementById('selected-algorithm-tag');
    
    if (algorithmNameSpan && algorithmTagSpan) {
      if (selectedAlgorithm === 'ffd') {
        algorithmNameSpan.textContent = 'First-Fit Decreasing';
        algorithmTagSpan.textContent = 'FFD';
      } else {
        algorithmNameSpan.textContent = 'Programmation Linéaire';
        algorithmTagSpan.textContent = 'ILP';
      }
    }
  },
  
  /**
   * NOUVEAU : Affiche une modal pour sélectionner le scénario de test
   */
  showTestScenarioModal: function() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Choisir un scénario de test ILP vs FFD</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="scenario-list">
            <div class="scenario-item" data-scenario="FFD_meilleur">
              <h4>FFD Meilleur</h4>
              <p>Test avec des pièces qui s'emboîtent parfaitement pour l'algorithme FFD (First-Fit Decreasing).</p>
              <small>Attendu: FFD égal ou légèrement meilleur qu'ILP</small>
            </div>
            
            <div class="scenario-item" data-scenario="ILP_meilleur">
              <h4>ILP Meilleur</h4>
              <p>Test avec des pièces qui nécessitent une optimisation avancée pour une solution optimale.</p>
              <small>Attendu: ILP nettement meilleur que FFD</small>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary close-modal">Annuler</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Gérer les clics sur les scénarios
    modal.querySelectorAll('.scenario-item').forEach(item => {
      item.addEventListener('click', () => {
        const scenario = item.getAttribute('data-scenario');
        document.body.removeChild(modal);
        this.runAlgorithmTest(scenario);
      });
    });
    
    // Gérer la fermeture
    modal.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    });
    
    // Fermer en cliquant sur l'overlay
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
};