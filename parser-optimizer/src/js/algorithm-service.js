import { algorithms } from './index.js';

export const AlgorithmService = {
  // Référence au DataManager pour accès aux modèles
  dataManager: null,

  /**
   * Initialise les dépendances
   */
  init: function(dataManager) {
    this.dataManager = dataManager;
  },

  /**
   * Point d'entrée principal pour l'optimisation
   */
  runAlgorithm: function(type, data) {
    try {
      if (type === 'compare') {
        return this.runComparisonOptimization(data);
      } else if (type === 'greedy' || type === 'ffd') {
        return this.runSingleAlgorithmOptimization(data, 'ffd');
      } else if (type === 'ilp') {
        return this.runSingleAlgorithmOptimization(data, 'ilp');
      } else {
        throw new Error(`Type d'algorithme non reconnu: ${type}`);
      }
    } catch (error) {
      console.error('Algorithm error:', error);
      throw error;
    }
  },

  /**
   * Exécute la comparaison FFD vs ILP
   */
  runComparisonOptimization: function(data) {
    console.log('🎯 Optimisation comparative FFD vs ILP');
    
    const modelData = this.transformDataToModels(data);
    const modelKeys = this.getModelExecutionOrder(modelData);
    
    const ffdResults = this.runAlgorithmOnAllModels(modelData, 'ffd');
    
    let ilpResults = null;
    try {
      ilpResults = this.runAlgorithmOnAllModels(modelData, 'ilp');
    } catch (error) {
      console.warn('ILP failed, using FFD only:', error.message);
    }
    
    return this.compareAndSelectBest(ffdResults, ilpResults);
  },

  /**
   * Exécute un seul algorithme
   */
  runSingleAlgorithmOptimization: function(data, algorithmType) {
    console.log(`🎯 Optimisation ${algorithmType.toUpperCase()}`);
    
    const modelData = this.transformDataToModels(data);
    return this.runAlgorithmOnAllModels(modelData, algorithmType);
  },

  /**
   * Exécute un algorithme sur tous les modèles
   */
  runAlgorithmOnAllModels: function(modelData, algorithmType) {
    const results = {};
    const modelKeys = this.getModelExecutionOrder(modelData);
    
    console.log(`🔧 Exécution ${algorithmType.toUpperCase()} sur ${modelKeys.length} modèles`);
    
    for (const modelKey of modelKeys) {
      const modelPieces = modelData.pieces[modelKey] || [];
      const modelMotherBars = modelData.motherBars[modelKey] || [];
      
      if (modelPieces.length === 0 || modelMotherBars.length === 0) {
        console.warn(`⚠️ Modèle ${modelKey} ignoré: données insuffisantes`);
        continue;
      }
      
      console.log(`🔄 ${algorithmType.toUpperCase()} pour ${modelKey}`);
      
      // Appeler l'algorithme pur
      const algorithmResult = this.callPureAlgorithm(algorithmType, modelMotherBars, modelPieces);
      
      // Convertir en format standardisé
      const modelResult = this.convertToStandardFormat(algorithmResult, modelKey, algorithmType, modelPieces, modelMotherBars);
      
      results[modelKey] = modelResult;
      
      console.log(`✅ ${modelKey}: ${modelResult.rawData.totalMotherBarsUsed} barres, efficacité ${modelResult.stats.utilizationRate}%`);
    }
    
    return {
      modelResults: results,
      globalStats: this.calculateGlobalStats({ modelResults: results }),
      algorithmType: algorithmType
    };
  },

  /**
   * Appelle l'algorithme pur (FFD ou ILP)
   */
  callPureAlgorithm: function(algorithmType, motherBars, pieces) {
    if (algorithmType === 'ffd') {
      return algorithms.solveGreedyFFD(motherBars, pieces);
    } else if (algorithmType === 'ilp') {
      return algorithms.solveWithILP(motherBars, pieces);
    } else {
      throw new Error(`Algorithme non supporté: ${algorithmType}`);
    }
  },

  /**
   * Convertit le résultat d'algorithme pur en format standardisé
   */
  convertToStandardFormat: function(algorithmResult, modelKey, algorithmType, originalPieces, originalMotherBars) {
    const cuttingPatterns = algorithmResult.cuttingPatterns || [];
    
    // Créer les layouts à partir des patterns
    const layouts = cuttingPatterns.map(pattern => ({
      originalLength: pattern.motherBarLength,
      length: pattern.motherBarLength,
      cuts: [...pattern.cuts],
      count: pattern.count,
      waste: pattern.waste,
      remainingLength: pattern.waste
    }));
    
    // Calculer les statistiques
    const totalMotherBarsUsed = cuttingPatterns.reduce((sum, pattern) => sum + pattern.count, 0);
    const totalWasteLength = cuttingPatterns.reduce((sum, pattern) => sum + (pattern.waste * pattern.count), 0);
    const totalBarLength = cuttingPatterns.reduce((sum, pattern) => sum + (pattern.motherBarLength * pattern.count), 0);
    const totalUsedLength = totalBarLength - totalWasteLength;
    
    const utilizationRate = totalBarLength > 0 
      ? ((totalUsedLength / totalBarLength) * 100).toFixed(3)
      : "0.000";
    
    // Vérifier les pièces restantes
    const remainingPieces = this.calculateRemainingPieces(originalPieces, cuttingPatterns);
    
    return {
      layouts: layouts,
      rawData: {
        totalMotherBarsUsed: totalMotherBarsUsed,
        wasteLength: totalWasteLength,
        remainingPieces: remainingPieces,
        usedBars: this.convertPatternsToUsedBars(cuttingPatterns)
      },
      stats: {
        utilizationRate: parseFloat(utilizationRate),
        totalBarLength: totalBarLength,
        totalUsedLength: totalUsedLength,
        totalWasteLength: totalWasteLength
      },
      algorithmName: algorithmType === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire (ILP)',
      algorithmType: algorithmType
    };
  },

  /**
   * Calcule les pièces restantes non découpées
   */
  calculateRemainingPieces: function(originalPieces, cuttingPatterns) {
    const demandByLength = new Map();
    const cutByLength = new Map();
    
    // Compter la demande
    originalPieces.forEach(piece => {
      const current = demandByLength.get(piece.length) || 0;
      demandByLength.set(piece.length, current + piece.quantity);
    });
    
    // Compter les pièces découpées
    cuttingPatterns.forEach(pattern => {
      pattern.cuts.forEach(cut => {
        const current = cutByLength.get(cut) || 0;
        cutByLength.set(cut, current + pattern.count);
      });
    });
    
    // Calculer les pièces restantes
    const remaining = [];
    demandByLength.forEach((demand, length) => {
      const cut = cutByLength.get(length) || 0;
      const deficit = demand - cut;
      if (deficit > 0) {
        for (let i = 0; i < deficit; i++) {
          remaining.push(length);
        }
      }
    });
    
    return remaining;
  },

  /**
   * Convertit les patterns en format usedBars pour compatibilité
   */
  convertPatternsToUsedBars: function(cuttingPatterns) {
    const usedBars = [];
    
    cuttingPatterns.forEach((pattern, index) => {
      for (let i = 0; i < pattern.count; i++) {
        usedBars.push({
          barId: `pattern_${index}_${i}`,
          originalLength: pattern.motherBarLength,
          length: pattern.motherBarLength,
          cuts: [...pattern.cuts],
          remainingLength: pattern.waste
        });
      }
    });
    
    return usedBars;
  },

  /**
   * Compare FFD et ILP et sélectionne le meilleur par modèle
   */
  compareAndSelectBest: function(ffdResults, ilpResults) {
    const modelResults = {};
    const ffdModels = ffdResults.modelResults || {};
    const ilpModels = ilpResults?.modelResults || {};

    console.log('🤖 Comparaison et sélection des meilleurs algorithmes par modèle');

    for (const modelKey of Object.keys(ffdModels)) {
      const ffd = ffdModels[modelKey];
      const ilp = ilpModels[modelKey];

      let chosen, usedAlgo, comparison;

      if (!ilp) {
        chosen = ffd;
        usedAlgo = 'ffd';
        comparison = {
          ffd: ffd.stats.utilizationRate,
          ilp: null,
          reason: 'ILP non disponible'
        };
      } else {
        const ffdEff = ffd.stats.utilizationRate;
        const ilpEff = ilp.stats.utilizationRate;
        const ffdBars = ffd.rawData.totalMotherBarsUsed;
        const ilpBars = ilp.rawData.totalMotherBarsUsed;

        if (ilpEff > ffdEff) {
          chosen = ilp;
          usedAlgo = 'ilp';
          comparison = {
            ffd: ffdEff,
            ilp: ilpEff,
            reason: `ILP plus efficace (${ilpEff}% vs ${ffdEff}%)`
          };
        } else if (ffdEff > ilpEff) {
          chosen = ffd;
          usedAlgo = 'ffd';
          comparison = {
            ffd: ffdEff,
            ilp: ilpEff,
            reason: `FFD plus efficace (${ffdEff}% vs ${ilpEff}%)`
          };
        } else if (ilpBars < ffdBars) {
          chosen = ilp;
          usedAlgo = 'ilp';
          comparison = {
            ffd: ffdEff,
            ilp: ilpEff,
            reason: `Même efficacité, ILP utilise moins de barres (${ilpBars} vs ${ffdBars})`
          };
        } else {
          chosen = ffd;
          usedAlgo = 'ffd';
          comparison = {
            ffd: ffdEff,
            ilp: ilpEff,
            reason: `Performances équivalentes, FFD privilégié`
          };
        }
      }

      modelResults[modelKey] = {
        ...chosen,
        algoUsed: usedAlgo,
        comparison: comparison
      };

      console.log(`  ${modelKey}: ${usedAlgo.toUpperCase()} sélectionné (${comparison.reason})`);
    }

    return {
      modelResults,
      globalStats: this.calculateGlobalStats({ modelResults }),
      bestAlgorithm: 'per-model'
    };
  },

  /**
   * NOUVEAU: Obtient l'ordre d'exécution standardisé des modèles
   */
  getModelExecutionOrder: function(modelData) {
    if (this.dataManager && this.dataManager.getModels) {
      const models = this.dataManager.getModels();
      const modelKeys = models.map(model => `${model.profile}_${model.orientation}`);
      console.log(`📋 Ordre d'exécution des modèles: ${modelKeys.join(' → ')}`);
      return modelKeys;
    }
    
    // Fallback: utiliser les clés des données transformées
    const modelKeys = Object.keys(modelData.pieces).sort();
    console.log(`📋 Ordre d'exécution des modèles (fallback): ${modelKeys.join(' → ')}`);
    return modelKeys;
  },

  /**
   * Transform DataManager data structure to algorithm-expected models format
   * @param {Object} data - Raw data from DataManager
   * @returns {Object} Transformed data organized by models (profile_orientation)
   */
  transformDataToModels: function(data) {
    const modelPieces = {};
    const modelMotherBars = {};
    
    console.log('🔄 Transformation des données en modèles...');
    
    // Transform pieces grouped by profile+orientation
    for (const profile in data.pieces) {
      for (const piece of data.pieces[profile]) {
        const orientation = piece.orientation || 'undefined';
        const modelKey = `${profile}_${orientation}`;
        
        if (!modelPieces[modelKey]) {
          modelPieces[modelKey] = [];
        }
        modelPieces[modelKey].push(piece);
      }
    }
    
    // Transform mother bars - they need to be available for each orientation that has pieces
    for (const profile in data.motherBars) {
      const availableOrientations = this.getOrientationsForProfile(profile, data.pieces);
      
      for (const orientation of availableOrientations) {
        const modelKey = `${profile}_${orientation}`;
        
        if (!modelMotherBars[modelKey]) {
          modelMotherBars[modelKey] = [...data.motherBars[profile]];
        }
      }
    }
    
    // Log transformation summary
    const modelCount = Object.keys(modelPieces).length;
    console.log(`📊 ${modelCount} modèles créés:`);
    for (const modelKey in modelPieces) {
      const pieceCount = modelPieces[modelKey].length;
      const motherBarCount = modelMotherBars[modelKey] ? modelMotherBars[modelKey].length : 0;
      console.log(`  • ${modelKey}: ${pieceCount} pièces, ${motherBarCount} barres mères`);
    }
    
    return { 
      pieces: modelPieces, 
      motherBars: modelMotherBars 
    };
  },
  
  /**
   * Get all orientations for a given profile from pieces data
   * @param {string} profile - Profile to check
   * @param {Object} piecesData - Pieces data organized by profile
   * @returns {Array} Array of orientations for this profile
   */
  getOrientationsForProfile: function(profile, piecesData) {
    const orientations = new Set();
    
    if (piecesData[profile]) {
      for (const piece of piecesData[profile]) {
        orientations.add(piece.orientation || 'undefined');
      }
    }
    
    // If no orientations found, default to 'undefined'
    if (orientations.size === 0) {
      orientations.add('undefined');
    }
    
    return Array.from(orientations);
  },
  
  /**
   * Calculate global statistics from results
   * @param {Object} results - Algorithm results
   * @returns {Object} Calculated global statistics
   */
  calculateGlobalStats: function(results) {
    const modelResults = results.modelResults || {};
    
    let totalUsedBars = 0;
    let totalWaste = 0;
    let totalBarLength = 0;
    
    // Calculate totals across all models
    for (const model in modelResults) {
      const modelResult = modelResults[model];
      
      // CORRECTION: Adapter au nouveau format des résultats
      if (modelResult.rawData) {
        totalUsedBars += modelResult.rawData.totalMotherBarsUsed || 0;
        totalWaste += modelResult.rawData.wasteLength || 0;
      }
      
      // CORRECTION: Calculer la longueur totale depuis les layouts
      if (modelResult.layouts && Array.isArray(modelResult.layouts)) {
        for (const layout of modelResult.layouts) {
          const barLength = layout.originalLength || layout.length || 0;
          const count = layout.count || 1;
          totalBarLength += barLength * count;
        }
      }
      // Fallback pour l'ancien format FFD
      else if (modelResult.rawData && modelResult.rawData.usedBars) {
        for (const bar of modelResult.rawData.usedBars) {
          totalBarLength += bar.originalLength || bar.length || 0;
        }
      }
    }
    
    // Calculate global efficiency
    const totalEfficiency = totalBarLength > 0 
      ? ((totalBarLength - totalWaste) / totalBarLength * 100).toFixed(2)
      : "100.00";
      
    return {
      totalUsedBars,
      totalWaste, 
      totalBarLength,
      totalEfficiency
    };
  },
  
  /**
   * Calculate statistics for an individual model
   * @param {Object} modelResult - Model result data
   * @returns {Object} Calculated model statistics
   */
  calculateModelStats: function(modelResult) {
    let totalModelBarLength = 0;
    let totalModelWasteLength = 0;
    let barCount = 0;
    
    // CORRECTION: Adapter au nouveau format des résultats
    if (modelResult.layouts && Array.isArray(modelResult.layouts)) {
      // Nouveau format ILP/PGM
      for (const layout of modelResult.layouts) {
        const barLength = layout.originalLength || layout.length || 0;
        const count = layout.count || 1;
        const waste = layout.waste || 0;
        
        totalModelBarLength += barLength * count;
        totalModelWasteLength += waste * count;
        barCount += count;
      }
    }
    // Fallback pour l'ancien format FFD
    else if (modelResult.rawData && modelResult.rawData.usedBars) {
      const usedBars = modelResult.rawData.usedBars;
      
      for (const bar of usedBars) {
        totalModelBarLength += bar.originalLength || bar.length || 0;
        totalModelWasteLength += bar.remainingLength || bar.waste || 0;
      }
      barCount = usedBars.length;
    }
    // Utiliser les données rawData comme fallback
    else if (modelResult.rawData) {
      barCount = modelResult.rawData.totalMotherBarsUsed || 0;
      totalModelWasteLength = modelResult.rawData.wasteLength || 0;
      // Estimer la longueur totale si pas disponible
      if (modelResult.rawData.motherBarLength && barCount > 0) {
        totalModelBarLength = modelResult.rawData.motherBarLength * barCount;
      }
    }
    
    // Calculate model efficiency
    const modelEfficiency = totalModelBarLength > 0 
      ? ((totalModelBarLength - totalModelWasteLength) / totalModelBarLength * 100).toFixed(2)
      : "100.00";
      
    return {
      barCount: barCount,
      totalLength: totalModelBarLength,
      wasteLength: totalModelWasteLength,
      efficiency: modelEfficiency
    };
  },
  
  /**
   * Exécute FFD pour un modèle donné (asynchrone pour l'UI)
   */
  runFFDAlgorithmForModel: async function(modelKey, modelData) {
    
  },

  /**
   * Exécute ILP pour un modèle donné (asynchrone pour l'UI)
   */
  runILPAlgorithmForModel: async function(modelKey, modelData) {
  },

  /**
   * NOUVEAU: Fonctions d'alias pour compatibilité avec l'ancien code
   */
  runFFDAlgorithm: function(data) {
    return this.runSingleAlgorithmOptimization(data, 'ffd');
  },

  runILPAlgorithm: function(data) {
    return this.runSingleAlgorithmOptimization(data, 'ilp');
  },

  /**
   * NOUVEAU: Alias pour la comparaison (compatibilité)
   */
  compareAlgorithms: function(data) {
    return this.runComparisonOptimization(data);
  },

  /**
   * NOUVEAU: Fonction pour traiter un pattern individuel (pour ResultsRenderer)
   */
  processPattern: function(layout) {
    const cuts = layout.cuts || [];
    const barLength = layout.originalLength || layout.length || 0;
    const waste = layout.waste || layout.remainingLength || 0;
    const count = layout.count || 1;
    
    // Grouper les coupes par longueur
    const cutCounts = {};
    cuts.forEach(cut => {
      cutCounts[cut] = (cutCounts[cut] || 0) + 1;
    });
    
    // Convertir en format pour l'affichage
    const processedCuts = Object.entries(cutCounts).map(([length, count]) => ({
      length: parseInt(length),
      count: count
    })).sort((a, b) => b.length - a.length); // Trier par longueur décroissante
    
    // Créer les pièces visuelles pour la barre
    const visualPieces = [];
    let currentPosition = 0;
    
    cuts.forEach((cutLength, index) => {
      const percentage = (cutLength / barLength) * 100;
      visualPieces.push({
        length: cutLength,
        percentage: percentage,
        isLast: index === cuts.length - 1
      });
      currentPosition += cutLength;
    });
    
    // Calculer le pourcentage de chute
    const wastePercentage = barLength > 0 ? (waste / barLength) * 100 : 0;
    
    return {
      cuts: processedCuts,
      visualPieces: visualPieces,
      barLength: barLength,
      waste: waste,
      wastePercentage: wastePercentage,
      count: count
    };
  },
};
