import { algorithms } from './index.js';
import { DataManager } from './data-manager.js'; // Import direct

export const AlgorithmService = {

  /**
   * FONCTION PRINCIPALE SIMPLIFIÉE - Point d'entrée unique
   * Lance l'optimisation complète sans paramètres
   */
  runOptimization: function() {
    console.log('🚀 Début de l\'optimisation complète');
    
    try {
      // 1. Créer les modèles à partir du DataManager
      const models = this.createModelsFromDataManager();
      
      if (models.length === 0) {
        throw new Error('Aucun modèle trouvé pour l\'optimisation');
      }
      
      // 2. Exécuter tous les algorithmes sur tous les modèles
      const allResults = this.runAllAlgorithmsOnAllModels(models);
      
      // 3. Traiter et comparer les résultats
      const finalResults = this.processAndCompareResults(allResults, models);
      
      console.log('✅ Optimisation complète terminée');
      return finalResults;
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'optimisation:', error);
      throw error;
    }
  },

  /**
   * ÉTAPE 1: Crée les objets modèles à partir du DataManager
   */
  createModelsFromDataManager: function() {
    console.log('📋 Création des modèles à partir du DataManager');
    
    // Obtenir tous les modèles distincts directement depuis DataManager
    const modelDefinitions = DataManager.getModels();
    const models = [];
    
    for (const modelDef of modelDefinitions) {
      const { profile, orientation } = modelDef;
      
      // Obtenir les barres mères pour ce profil
      const motherBars = DataManager.getMotherBarsByProfile(profile);
      
      // Obtenir les pièces à découper pour ce modèle
      const pieces = DataManager.getLengthsToCutByModel(profile, orientation);
      
      // Vérifier que le modèle a des données valides
      if (motherBars.length > 0 && pieces.length > 0) {
        const model = {
          key: `${profile}_${orientation}`,
          profile: profile,
          orientation: orientation,
          motherBars: motherBars,
          pieces: pieces,
          label: this.formatModelLabel(profile, orientation)
        };
        
        models.push(model);
        
        // Log des détails du modèle
        const totalPieces = pieces.reduce((sum, p) => sum + p.quantity, 0);
        const totalMotherBars = motherBars.reduce((sum, m) => sum + m.quantity, 0);
        console.log(`  ✓ ${model.label}: ${totalPieces} pièces, ${totalMotherBars} barres mères`);
      } else {
        console.warn(`  ⚠️ Modèle ${profile}_${orientation} ignoré: données insuffisantes`);
      }
    }
    
    console.log(`📊 ${models.length} modèles créés pour l'optimisation`);
    return models;
  },

  /**
   * ÉTAPE 2: Exécute tous les algorithmes sur tous les modèles
   */
  runAllAlgorithmsOnAllModels: function(models) {
    console.log('🔧 Exécution de tous les algorithmes sur tous les modèles');
    
    const algorithmTypes = ['ffd', 'ilp'];
    const allResults = {};
    
    // Boucle imbriquée: pour chaque modèle, exécuter chaque algorithme
    for (const model of models) {
      console.log(`\n🎯 Traitement du modèle: ${model.label}`);
      
      allResults[model.key] = {
        model: model,
        algorithmResults: {}
      };
      
      for (const algorithmType of algorithmTypes) {
        console.log(`  🔄 Exécution ${algorithmType.toUpperCase()} pour ${model.label}`);
        
        try {
          // Appeler l'algorithme pur
          const algorithmResult = this.callPureAlgorithm(algorithmType, model.motherBars, model.pieces);
          
          // Convertir en format standardisé
          const standardResult = this.convertToStandardFormat(
            algorithmResult, 
            model.key, 
            algorithmType, 
            model.pieces, 
            model.motherBars
          );
          
          allResults[model.key].algorithmResults[algorithmType] = standardResult;
          
          console.log(`    ✅ ${algorithmType.toUpperCase()}: ${standardResult.rawData.totalMotherBarsUsed} barres, ${standardResult.stats.utilizationRate}% efficacité`);
          
        } catch (error) {
          console.error(`    ❌ Erreur ${algorithmType.toUpperCase()}:`, error.message);
          allResults[model.key].algorithmResults[algorithmType] = null;
        }
      }
    }
    
    return allResults;
  },

  /**
   * ÉTAPE 3: Traite et compare tous les résultats
   */
  processAndCompareResults: function(allResults, models) {
    console.log('🤖 Traitement et comparaison des résultats');
    
    const finalModelResults = {};
    const globalStats = {
      totalUsedBars: 0,
      totalWaste: 0,
      totalBarLength: 0
    };
    
    // Comparer et sélectionner le meilleur algorithme pour chaque modèle
    for (const [modelKey, modelData] of Object.entries(allResults)) {
      const ffdResult = modelData.algorithmResults.ffd;
      const ilpResult = modelData.algorithmResults.ilp;
      
      const bestResult = this.selectBestAlgorithmForModel(modelKey, ffdResult, ilpResult);
      
      if (bestResult) {
        finalModelResults[modelKey] = bestResult;
        
        // Ajouter aux statistiques globales
        globalStats.totalUsedBars += bestResult.rawData.totalMotherBarsUsed || 0;
        globalStats.totalWaste += bestResult.rawData.wasteLength || 0;
        
        // Calculer la longueur totale des barres
        if (bestResult.layouts) {
          for (const layout of bestResult.layouts) {
            const barLength = layout.originalLength || layout.length || 0;
            const count = layout.count || 1;
            globalStats.totalBarLength += barLength * count;
          }
        }
        
        console.log(`  ${modelKey}: ${bestResult.algoUsed.toUpperCase()} sélectionné (${bestResult.comparison.reason})`);
      }
    }
    
    // Calculer l'efficacité globale
    const globalEfficiency = globalStats.totalBarLength > 0 
      ? ((globalStats.totalBarLength - globalStats.totalWaste) / globalStats.totalBarLength * 100).toFixed(2)
      : "100.00";
    
    globalStats.totalEfficiency = parseFloat(globalEfficiency);
    
    console.log(`🏆 Résumé global: ${globalStats.totalUsedBars} barres, ${globalEfficiency}% efficacité`);
    
    return {
      modelResults: finalModelResults,
      globalStats: globalStats,
      bestAlgorithm: 'per-model',
      models: models
    };
  },

  /**
   * NOUVEAU: Exécute UN algorithme sur UN modèle spécifique
   * Appelé directement par UI-Controller pour chaque étape
   */
  runAlgorithmOnSingleModel: function(algorithmType, model) {
    console.log(`🔄 Exécution ${algorithmType.toUpperCase()} pour ${model.label}`);
    
    try {
      // Appeler l'algorithme pur
      const algorithmResult = this.callPureAlgorithm(algorithmType, model.motherBars, model.pieces);
      
      // Convertir en format standardisé
      const standardResult = this.convertToStandardFormat(
        algorithmResult, 
        model.key, 
        algorithmType, 
        model.pieces, 
        model.motherBars
      );
      
      console.log(`    ✅ ${algorithmType.toUpperCase()}: ${standardResult.rawData.totalMotherBarsUsed} barres, ${standardResult.stats.utilizationRate}% efficacité`);
      
      return standardResult;
      
    } catch (error) {
      console.error(`    ❌ Erreur ${algorithmType.toUpperCase()}:`, error.message);
      throw error;
    }
  },

  /**
   * NOUVEAU: Sélectionne le meilleur résultat entre FFD et ILP pour un modèle
   * Appelé par UI-Controller après l'exécution des deux algorithmes
   */
  selectBestForModel: function(modelKey, ffdResult, ilpResult) {
    console.log(`🤖 Comparaison des algorithmes pour ${modelKey}`);
    
    // Log des résultats disponibles
    if (ffdResult) {
      console.log(`  📊 FFD: ${ffdResult.rawData.totalMotherBarsUsed} barres, ${ffdResult.stats.utilizationRate}% efficacité`);
    } else {
      console.log(`  ❌ FFD: Non disponible`);
    }
    
    if (ilpResult) {
      console.log(`  📊 ILP: ${ilpResult.rawData.totalMotherBarsUsed} barres, ${ilpResult.stats.utilizationRate}% efficacité`);
    } else {
      console.log(`  ❌ ILP: Non disponible`);
    }
    
    let chosen, usedAlgo, comparison;
    
    if (!ilpResult) {
      chosen = ffdResult;
      usedAlgo = 'ffd';
      comparison = {
        ffd: ffdResult?.stats.utilizationRate || 0,
        ilp: null,
        reason: 'ILP non disponible'
      };
    } else if (!ffdResult) {
      chosen = ilpResult;
      usedAlgo = 'ilp';
      comparison = {
        ffd: null,
        ilp: ilpResult?.stats.utilizationRate || 0,
        reason: 'FFD non disponible'
      };
    } else {
      // Comparer FFD et ILP
      const ffdEff = ffdResult.stats.utilizationRate;
      const ilpEff = ilpResult.stats.utilizationRate;
      const ffdBars = ffdResult.rawData.totalMotherBarsUsed;
      const ilpBars = ilpResult.rawData.totalMotherBarsUsed;
      
      if (ilpEff > ffdEff) {
        chosen = ilpResult;
        usedAlgo = 'ilp';
        comparison = {
          ffd: ffdEff,
          ilp: ilpEff,
          reason: `ILP plus efficace (${ilpEff}% vs ${ffdEff}%)`
        };
      } else if (ffdEff > ilpEff) {
        chosen = ffdResult;
        usedAlgo = 'ffd';
        comparison = {
          ffd: ffdEff,
          ilp: ilpEff,
          reason: `FFD plus efficace (${ffdEff}% vs ${ilpEff}%)`
        };
      } else if (ilpBars < ffdBars) {
        chosen = ilpResult;
        usedAlgo = 'ilp';
        comparison = {
          ffd: ffdEff,
          ilp: ilpEff,
          reason: `Même efficacité, ILP utilise moins de barres (${ilpBars} vs ${ffdBars})`
        };
      } else {
        chosen = ffdResult;
        usedAlgo = 'ffd';
        comparison = {
          ffd: ffdEff,
          ilp: ilpEff,
          reason: `Performances équivalentes, FFD privilégié`
        };
      }
    }
    
    const bestResult = {
      ...chosen,
      algoUsed: usedAlgo,
      comparison: comparison
    };
    
    console.log(`  🏆 ${modelKey}: ${usedAlgo.toUpperCase()} sélectionné (${comparison.reason})`);
    
    return bestResult;
  },

  /**
   * NOUVEAU: Construit les résultats finaux avec vérifications complètes
   * Appelé par UI-Controller à la fin
   */
  buildFinalResults: function(modelResults) {
    console.log('🏗️ Construction des résultats finaux avec vérifications');
    
    const globalStats = {
      totalUsedBars: 0,
      totalWaste: 0,
      totalBarLength: 0
    };
    
    const validatedResults = {};
    const stockUsageByProfile = {}; // Suivi de l'utilisation du stock par profil
    
    // 1. PREMIÈRE PASSE: Vérifier chaque modèle individuellement
    for (const [modelKey, bestResult] of Object.entries(modelResults)) {
      if (!bestResult) continue;
      
      console.log(`🔍 Vérification du modèle ${modelKey}`);
      
      // Récupérer le modèle original pour les vérifications
      const originalModel = this.getOriginalModelData(modelKey);
      if (!originalModel) {
        console.error(`❌ Modèle original ${modelKey} non trouvé`);
        validatedResults[modelKey] = this.createErrorResult(
          bestResult, 
          'Données du modèle non trouvées'
        );
        continue;
      }
      
      // Vérification 1: Compter les pièces produites vs demandées
      const pieceValidation = this.validatePieceCount(bestResult, originalModel.pieces);
      if (!pieceValidation.valid) {
        console.error(`❌ ${modelKey}: ${pieceValidation.error}`);
        validatedResults[modelKey] = this.createErrorResult(bestResult, pieceValidation.error);
        continue;
      }
      
      // Vérification 2: Comptabiliser l'utilisation du stock
      const stockUsage = this.calculateStockUsage(bestResult, originalModel.profile);
      this.addToStockUsage(stockUsageByProfile, originalModel.profile, stockUsage);
      
      // Si tout est bon, ajouter aux résultats validés
      validatedResults[modelKey] = bestResult;
      
      // Ajouter aux statistiques globales
      globalStats.totalUsedBars += bestResult.rawData.totalMotherBarsUsed || 0;
      globalStats.totalWaste += bestResult.rawData.wasteLength || 0;
      
      if (bestResult.layouts) {
        for (const layout of bestResult.layouts) {
          const barLength = layout.originalLength || layout.length || 0;
          const count = layout.count || 1;
          globalStats.totalBarLength += barLength * count;
        }
      }
      
      console.log(`✅ ${modelKey}: Validation réussie`);
    }
    
    // 2. DEUXIÈME PASSE: Vérifier la disponibilité globale du stock
    console.log('🏭 Vérification de la disponibilité globale du stock');
    const stockValidation = this.validateGlobalStock(stockUsageByProfile, validatedResults);
    
    if (!stockValidation.valid) {
      console.error('❌ Stock insuffisant détecté');
      // Marquer les modèles problématiques
      for (const modelKey of stockValidation.affectedModels) {
        if (validatedResults[modelKey] && !validatedResults[modelKey].error) {
          validatedResults[modelKey] = this.createErrorResult(
            validatedResults[modelKey], 
            stockValidation.error
          );
        }
      }
    }
    
    // Calculer l'efficacité globale
    const globalEfficiency = globalStats.totalBarLength > 0 
      ? ((globalStats.totalBarLength - globalStats.totalWaste) / globalStats.totalBarLength * 100).toFixed(2)
      : "100.00";
    
    globalStats.totalEfficiency = parseFloat(globalEfficiency);
    
    console.log(`🏆 Résumé global: ${globalStats.totalUsedBars} barres, ${globalEfficiency}% efficacité`);
    
    return {
      modelResults: validatedResults,
      globalStats: globalStats,
      bestAlgorithm: 'per-model',
      stockValidation: stockValidation
    };
  },

  /**
   * NOUVEAU: Récupère les données du modèle original à partir de la clé
   */
  getOriginalModelData: function(modelKey) {
    const [profile, orientation] = modelKey.split('_');
    
    // Récupérer les pièces demandées pour ce modèle
    const pieces = DataManager.getLengthsToCutByModel(profile, orientation);
    
    return {
      profile: profile,
      orientation: orientation,
      pieces: pieces
    };
  },

  /**
   * NOUVEAU: Valide que le nombre de pièces produites correspond à la demande
   */
  validatePieceCount: function(result, demandedPieces) {
    console.log('  📊 Vérification du nombre de pièces');
    
    // Compter les pièces demandées par longueur
    const demanded = new Map();
    demandedPieces.forEach(piece => {
      demanded.set(piece.length, piece.quantity);
    });
    
    // Compter les pièces produites par longueur
    const produced = new Map();
    if (result.layouts) {
      result.layouts.forEach(layout => {
        const count = layout.count || 1;
        layout.cuts.forEach(cutLength => {
          const current = produced.get(cutLength) || 0;
          produced.set(cutLength, current + count);
        });
      });
    }
    
    // Vérifier chaque longueur demandée
    for (const [length, demandedQty] of demanded.entries()) {
      const producedQty = produced.get(length) || 0;
      
      if (producedQty < demandedQty) {
        return {
          valid: false,
          error: `Pièces manquantes: ${demandedQty - producedQty} pièce(s) de ${length}mm non produites. \nEssayez avec plus de barres mères.`
        };
      }
      
      if (producedQty > demandedQty) {
        return {
          valid: false,
          error: `Pièces en excès: ${producedQty - demandedQty} pièce(s) de ${length}mm en trop. \nVérifiez les quantités de barres mères.`
        };
      }
    }
    
    // Vérifier qu'il n'y a pas de pièces produites non demandées
    for (const [length, producedQty] of produced.entries()) {
      if (!demanded.has(length)) {
        return {
          valid: false,
          error: `Pièces non demandées: ${producedQty} pièce(s) de ${length}mm produites sans demande. \nVérifiez la configuration.`
        };
      }
    }
    
    console.log('    ✅ Nombre de pièces correct');
    return { valid: true };
  },

  /**
   * NOUVEAU: Calcule l'utilisation du stock pour un résultat
   */
  calculateStockUsage: function(result, profile) {
    const usage = new Map(); // Map<longueur, quantité>
    
    if (result.layouts) {
      result.layouts.forEach(layout => {
        const barLength = layout.originalLength || layout.length;
        const count = layout.count || 1;
        
        const current = usage.get(barLength) || 0;
        usage.set(barLength, current + count);
      });
    }
    
    return usage;
  },

  /**
   * NOUVEAU: Ajoute l'utilisation à l'accumulation globale
   */
  addToStockUsage: function(stockUsageByProfile, profile, usage) {
    if (!stockUsageByProfile[profile]) {
      stockUsageByProfile[profile] = new Map();
    }
    
    for (const [length, qty] of usage.entries()) {
      const current = stockUsageByProfile[profile].get(length) || 0;
      stockUsageByProfile[profile].set(length, current + qty);
    }
  },

  /**
   * NOUVEAU: Valide que le stock global est suffisant
   */
  validateGlobalStock: function(stockUsageByProfile, validatedResults) {
    console.log('  🏭 Vérification du stock global');
    
    const errors = [];
    const affectedModels = [];
    
    for (const [profile, usage] of Object.entries(stockUsageByProfile)) {
      // Récupérer le stock disponible pour ce profil
      const availableStock = DataManager.getMotherBarsByProfile(profile);
      const stockMap = new Map();
      
      availableStock.forEach(stock => {
        stockMap.set(stock.length, stock.quantity);
      });
      
      // Vérifier chaque longueur utilisée
      for (const [length, usedQty] of usage.entries()) {
        const availableQty = stockMap.get(length) || 0;
        
        if (usedQty > availableQty) {
          const deficit = usedQty - availableQty;
          const error = `Stock insuffisant pour ${profile}: ${deficit} barre(s) de ${length}mm manquante(s) (demandé: ${usedQty}, disponible: ${availableQty}). \n\nAjoutez plus de barres mères.`;
          errors.push(error);
          
          // Identifier les modèles affectés
          Object.keys(validatedResults).forEach(modelKey => {
            if (modelKey.startsWith(profile + '_')) {
              affectedModels.push(modelKey);
            }
          });
        }
      }
    }
    
    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join(' '),
        affectedModels: [...new Set(affectedModels)] // Supprimer les doublons
      };
    }
    
    console.log('    ✅ Stock global suffisant');
    return { valid: true };
  },

  /**
   * NOUVEAU: Crée un résultat d'erreur pour un modèle
   */
  createErrorResult: function(originalResult, errorMessage) {
    return {
      ...originalResult,
      error: errorMessage,
      layouts: [], // Vider les schémas de coupe
      rawData: {
        ...originalResult.rawData,
        totalMotherBarsUsed: 0,
        wasteLength: 0
      },
      stats: {
        ...originalResult.stats,
        utilizationRate: 0
      }
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
   * Formate le label d'un modèle pour l'affichage
   */
  formatModelLabel: function(profile, orientation) {
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
   * FONCTIONS DE COMPATIBILITÉ avec l'ancien code
   */
  
  // Point d'entrée pour la comparaison (redirige vers la fonction principale)
  runAlgorithm: function(type, data) {
    // Ignorer les paramètres et utiliser directement le DataManager
    return this.runOptimization();
  },
  
  runComparisonOptimization: function(data) {
    return this.runOptimization();
  },
  
  runFFDAlgorithm: function(data) {
    return this.runOptimization();
  },
  
  runILPAlgorithm: function(data) {
    return this.runOptimization();
  },
  
  compareAlgorithms: function(data) {
    return this.runOptimization();
  },

  /**
   * Fonction pour traiter un pattern individuel (pour ResultsRenderer)
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
    cuts.forEach((cutLength, index) => {
      const percentage = (cutLength / barLength) * 100;
      visualPieces.push({
        length: cutLength,
        percentage: percentage,
        isLast: index === cuts.length - 1
      });
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

  /**
   * FONCTION MANQUANTE: Calcule les statistiques globales (pour compatibilité avec ResultsRenderer)
   */
  calculateGlobalStats: function(results) {
    console.log('📊 Calcul des statistiques globales');
    
    const modelResults = results.modelResults || {};
    
    let totalUsedBars = 0;
    let totalWaste = 0;
    let totalBarLength = 0;
    
    // Parcourir tous les résultats de modèles
    for (const [modelKey, modelResult] of Object.entries(modelResults)) {
      if (!modelResult) continue;
      
      // Ajouter les données brutes
      if (modelResult.rawData) {
        totalUsedBars += modelResult.rawData.totalMotherBarsUsed || 0;
        totalWaste += modelResult.rawData.wasteLength || 0;
      }
      
      // Calculer à partir des layouts
      if (modelResult.layouts && Array.isArray(modelResult.layouts)) {
        for (const layout of modelResult.layouts) {
          const barLength = layout.originalLength || layout.length || 0;
          const count = layout.count || 1;
          totalBarLength += barLength * count;
        }
      }
    }
    
    // Calculer l'efficacité globale
    const totalEfficiency = totalBarLength > 0 
      ? ((totalBarLength - totalWaste) / totalBarLength * 100).toFixed(2)
      : "100.00";
    
    return {
      totalUsedBars: totalUsedBars,
      totalWaste: totalWaste,
      totalBarLength: totalBarLength,
      totalEfficiency: parseFloat(totalEfficiency),
      // Compatibilité avec l'ancien format
      totalBarsUsed: totalUsedBars,
      wasteLength: totalWaste
    };
  },

  /**
   * FONCTION MANQUANTE: Calcule les statistiques d'un modèle (pour compatibilité avec ResultsRenderer)
   */
  calculateModelStats: function(modelResult) {
    if (!modelResult || !modelResult.layouts) {
      return {
        barCount: 0,
        totalLength: 0,
        wasteLength: 0,
        efficiency: 0
      };
    }
    
    let barCount = 0;
    let totalLength = 0;
    let wasteLength = 0;
    
    modelResult.layouts.forEach(layout => {
      const count = layout.count || 1;
      const length = layout.originalLength || layout.length || 0;
      const waste = layout.waste || layout.remainingLength || 0;
      
      barCount += count;
      totalLength += length * count;
      wasteLength += waste * count;
    });
    
    const efficiency = totalLength > 0 
      ? ((totalLength - wasteLength) / totalLength * 100).toFixed(1)
      : "0.0";
    
    return {
      barCount: barCount,
      totalLength: totalLength,
      wasteLength: wasteLength,
      efficiency: parseFloat(efficiency)
    };
  },

  /**
   * NOUVEAU: Exécute TOUS les algorithmes sur UN modèle spécifique
   * Appelé directement par UI-Controller pour chaque étape de modèle
   */
  runAllAlgorithmsOnSingleModel: function(model) {
    console.log(`🎯 Exécution complète des algorithmes pour ${model.label}`);
    
    const results = {
      model: model,
      ffdResult: null,
      ilpResult: null
    };
    
    // Exécuter FFD
    try {
      console.log(`  🔄 FFD pour ${model.key}`);
      const ffdResult = this.runAlgorithmOnSingleModel('ffd', model);
      results.ffdResult = ffdResult;
      console.log(`    ✅ FFD: ${ffdResult.rawData.totalMotherBarsUsed} barres, ${ffdResult.stats.utilizationRate}% efficacité`);
    } catch (error) {
      console.error(`    ❌ Erreur FFD:`, error.message);
      results.ffdResult = null;
    }
    
    // Exécuter ILP
    try {
      console.log(`  🔄 ILP pour ${model.key}`);
      const ilpResult = this.runAlgorithmOnSingleModel('ilp', model);
      results.ilpResult = ilpResult;
      console.log(`    ✅ ILP: ${ilpResult.rawData.totalMotherBarsUsed} barres, ${ilpResult.stats.utilizationRate}% efficacité`);
    } catch (error) {
      console.error(`    ❌ Erreur ILP:`, error.message);
      results.ilpResult = null;
    }
    
    console.log(`🏁 Optimisation terminée pour ${model.label}`);
    return results;
  },

};
