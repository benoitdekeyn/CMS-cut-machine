import { algorithms } from './index.js';

/**
 * AlgorithmService - Handles algorithm execution and results processing
 * No UI concerns are handled here
 */
export const AlgorithmService = {
  /**
   * Run the selected cutting optimization algorithm
   * @param {string} type - Algorithm type ('ffd', 'ilp', 'compare')
   * @param {Object} data - Data to process
   * @returns {Object} Algorithm results
   * @throws {Error} If data is invalid or algorithm fails
   */
  runAlgorithm: function(type, data) {
    try {
      let results;
      
      if (type === 'compare') {
        // Run both algorithms and compare results
        const ffdResults = this.runFFDAlgorithm(data);
        const ilpResults = this.runILPAlgorithm(data);
        
        // Compare results and select the best
        results = this.compareAndSelectBest(ffdResults, ilpResults);
      }
      else if (type === 'greedy' || type === 'ffd') {
        results = this.runFFDAlgorithm(data);
      } 
      else if (type === 'ilp') {
        results = this.runILPAlgorithm(data);
      } else {
        throw new Error(`Type d'algorithme non reconnu: ${type}`);
      }
      
      return results;
    } catch (error) {
      console.error('Algorithm error:', error);
      throw error;
    }
  },
  
  /**
   * Compare algorithms and automatically select the best one
   * @param {Object} data - Data to process
   * @returns {Object} Best algorithm results with comparison data
   */
  compareAlgorithms: function(data) {
    return this.runAlgorithm('compare', data);
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
   * Run the First-Fit Decreasing algorithm
   * @param {Object} data - Data to process
   * @returns {Object} Algorithm results
   */
  runFFDAlgorithm: function(data) {
    // Transform data to models format
    const modelData = this.transformDataToModels(data);
    
    // NOUVEAU: Afficher les données transformées avant exécution
    this.displayTransformedDataForAlgorithms(modelData, 'FFD');
    
    // Run algorithm with transformed data
    const results = algorithms.solveGreedyFFD(modelData.motherBars, modelData.pieces);
    results.algorithmName = 'First-Fit Decreasing';
    results.algorithmType = 'ffd';
    return results;
  },
  
  /**
   * Run the Integer Linear Programming algorithm
   * @param {Object} data - Data to process
   * @returns {Object} Algorithm results
   */
  runILPAlgorithm: function(data) {
    // Transform data to models format
    const modelData = this.transformDataToModels(data);
    
    // NOUVEAU: Afficher les données transformées avant exécution
    this.displayTransformedDataForAlgorithms(modelData, 'ILP');
    
    // Run algorithm with transformed data
    const results = algorithms.solveWithILP(modelData.motherBars, modelData.pieces);
    results.algorithmName = 'Programmation Linéaire (ILP)';
    results.algorithmType = 'ilp';
    return results;
  },

  /**
   * NOUVEAU: Affiche les données transformées qui seront envoyées aux algorithmes
   * @param {Object} modelData - Données transformées par modèle
   * @param {string} algorithmName - Nom de l'algorithme (FFD ou ILP)
   */
  displayTransformedDataForAlgorithms: function(modelData, algorithmName) {
    console.log(`\n📊 ===== DONNÉES ENVOYÉES À L'ALGORITHME ${algorithmName} =====`);
    
    const { pieces, motherBars } = modelData;
    
    // Afficher les modèles traités
    const modelKeys = Object.keys(pieces);
    console.log(`🔧 Modèles à traiter: ${modelKeys.join(', ')}`);
    
    // Pour chaque modèle, afficher les détails
    for (const modelKey of modelKeys) {
      console.log(`\n📋 Modèle: ${modelKey}`);
      console.log('─'.repeat(60));
      
      // Afficher les barres filles (pièces à découper)
      const modelPieces = pieces[modelKey] || [];
      if (modelPieces.length > 0) {
        console.log('  🔩 Barres filles (pièces à découper):');
        
        // Grouper par longueur pour un affichage plus clair
        const piecesByLength = new Map();
        modelPieces.forEach(piece => {
          const length = piece.length;
          const quantity = piece.quantity;
          
          if (piecesByLength.has(length)) {
            piecesByLength.set(length, piecesByLength.get(length) + quantity);
          } else {
            piecesByLength.set(length, quantity);
          }
        });
        
        // Trier par longueur décroissante et afficher
        const sortedPieces = Array.from(piecesByLength.entries())
          .sort((a, b) => b[0] - a[0]);
          
        sortedPieces.forEach(([length, totalQuantity]) => {
          console.log(`    • ${totalQuantity}× ${length}cm`);
        });
        
        const totalPiecesQuantity = sortedPieces.reduce((sum, [, qty]) => sum + qty, 0);
        console.log(`    📦 Total: ${totalPiecesQuantity} pièces`);
      } else {
        console.log('  🔩 Barres filles: Aucune');
      }
      
      // Afficher les barres mères disponibles
      const modelMotherBars = motherBars[modelKey] || [];
      if (modelMotherBars.length > 0) {
        console.log('  📏 Barres mères disponibles:');
        
        // Grouper par longueur
        const motherBarsByLength = new Map();
        modelMotherBars.forEach(bar => {
          const length = bar.length;
          const quantity = bar.quantity;
          
          if (motherBarsByLength.has(length)) {
            motherBarsByLength.set(length, motherBarsByLength.get(length) + quantity);
          } else {
            motherBarsByLength.set(length, quantity);
          }
        });
        
        // Trier par longueur décroissante et afficher
        const sortedMotherBars = Array.from(motherBarsByLength.entries())
          .sort((a, b) => b[0] - a[0]);
          
        sortedMotherBars.forEach(([length, totalQuantity]) => {
          console.log(`    • ${totalQuantity}× ${length}cm`);
        });
        
        const totalMotherBarsQuantity = sortedMotherBars.reduce((sum, [, qty]) => sum + qty, 0);
        console.log(`    📦 Total: ${totalMotherBarsQuantity} barres mères`);
      } else {
        console.log('  📏 Barres mères: Aucune');
      }
      
      // Calcul de faisabilité pour ce modèle
      const totalDemandLength = modelPieces.reduce((sum, piece) => sum + (piece.length * piece.quantity), 0);
      const totalSupplyLength = modelMotherBars.reduce((sum, bar) => sum + (bar.length * bar.quantity), 0);
      
      console.log(`  📊 Longueur demandée: ${totalDemandLength}cm`);
      console.log(`  📦 Longueur disponible: ${totalSupplyLength}cm`);
      
      if (totalSupplyLength >= totalDemandLength) {
        const ratio = totalDemandLength > 0 ? ((totalDemandLength / totalSupplyLength) * 100).toFixed(1) : 0;
        console.log(`  ✅ Faisable (ratio demande/stock: ${ratio}%)`);
      } else {
        const deficit = totalDemandLength - totalSupplyLength;
        console.log(`  ❌ Stock insuffisant (manque ${deficit}cm)`);
      }
    }
    
    // Statistiques globales
    let globalTotalPieces = 0;
    let globalTotalMotherBars = 0;
    let globalDemandLength = 0;
    let globalSupplyLength = 0;
    
    for (const modelKey of modelKeys) {
      const modelPieces = pieces[modelKey] || [];
      const modelMotherBars = motherBars[modelKey] || [];
      
      globalTotalPieces += modelPieces.reduce((sum, piece) => sum + piece.quantity, 0);
      globalTotalMotherBars += modelMotherBars.reduce((sum, bar) => sum + bar.quantity, 0);
      globalDemandLength += modelPieces.reduce((sum, piece) => sum + (piece.length * piece.quantity), 0);
      globalSupplyLength += modelMotherBars.reduce((sum, bar) => sum + (bar.length * bar.quantity), 0);
    }
    
    console.log(`\n🌍 RÉSUMÉ GLOBAL:`);
    console.log(`  • ${modelKeys.length} modèles à traiter`);
    console.log(`  • ${globalTotalPieces} pièces à découper au total`);
    console.log(`  • ${globalTotalMotherBars} barres mères disponibles au total`);
    console.log(`  • ${globalDemandLength}cm de longueur demandée`);
    console.log(`  • ${globalSupplyLength}cm de longueur disponible`);
    
    if (globalSupplyLength >= globalDemandLength) {
      const globalRatio = globalDemandLength > 0 ? ((globalDemandLength / globalSupplyLength) * 100).toFixed(1) : 0;
      console.log(`  ✅ Globalement faisable (efficacité théorique max: ${globalRatio}%)`);
    } else {
      const globalDeficit = globalDemandLength - globalSupplyLength;
      console.log(`  ❌ Stock global insuffisant (manque ${globalDeficit}cm)`);
    }
    
    console.log(`📊 ====================================================\n`);
  },

  /**
   * Compare results and select the best algorithm
   * @param {Object} ffdResults - FFD algorithm results
   * @param {Object} ilpResults - ILP algorithm results 
   * @returns {Object} Best algorithm results with comparison data
   */
  compareAndSelectBest: function(ffdResults, ilpResults) {
    // Validate results have needed properties
    if (!ffdResults?.globalStats?.statistics?.utilizationRate || 
        !ilpResults?.globalStats?.statistics?.utilizationRate) {
      throw new Error("Les résultats d'algorithme sont incomplets pour la comparaison.");
    }
    
    // Get efficiency values from results
    const ffdEfficiency = parseFloat(ffdResults.globalStats.statistics.utilizationRate);
    const ilpEfficiency = parseFloat(ilpResults.globalStats.statistics.utilizationRate);
    
    // Get total bars used for each algorithm
    const ffdBarsUsed = ffdResults.globalStats.totalBarsUsed;
    const ilpBarsUsed = ilpResults.globalStats.totalBarsUsed;
    
    // Determine best algorithm with improved logic
    let bestAlgorithm;
    let bestResults;
    
    console.log(`🔍 Comparaison des algorithmes:`);
    console.log(`  FFD: ${ffdEfficiency}% efficacité, ${ffdBarsUsed} barres mères`);
    console.log(`  ILP: ${ilpEfficiency}% efficacité, ${ilpBarsUsed} barres mères`);
    
    if (ffdEfficiency > ilpEfficiency) {
      // FFD est plus efficace
      bestAlgorithm = 'ffd';
      bestResults = ffdResults;
      console.log(`  ✅ FFD choisi: meilleure efficacité`);
    } else if (ilpEfficiency > ffdEfficiency) {
      // ILP est plus efficace
      bestAlgorithm = 'ilp';
      bestResults = ilpResults;
      console.log(`  ✅ ILP choisi: meilleure efficacité`);
    } else {
      // Même efficacité, comparer le nombre de barres mères
      if (ffdBarsUsed < ilpBarsUsed) {
        bestAlgorithm = 'ffd';
        bestResults = ffdResults;
        console.log(`  ✅ FFD choisi: même efficacité mais moins de barres mères`);
      } else if (ilpBarsUsed < ffdBarsUsed) {
        bestAlgorithm = 'ilp';
        bestResults = ilpResults;
        console.log(`  ✅ ILP choisi: même efficacité mais moins de barres mères`);
      } else {
        // Même efficacité et même nombre de barres : choisir ILP par défaut
        bestAlgorithm = 'ilp';
        bestResults = ilpResults;
        console.log(`  ✅ ILP choisi: résultats identiques, préférence ILP`);
      }
    }
    
    // Add comparison data to results
    bestResults.comparison = {
      ffdEfficiency,
      ilpEfficiency,
      ffdBarsUsed,
      ilpBarsUsed,
      bestAlgorithm,
      differencePercentage: Math.abs(ffdEfficiency - ilpEfficiency).toFixed(2)
    };
    
    bestResults.bestAlgorithm = bestAlgorithm;
    bestResults.algorithmName = bestAlgorithm === 'ffd' ? 
      'First-Fit Decreasing (meilleur)' : 'Programmation Linéaire (meilleur)';
    bestResults.algorithmType = 'compare';
    
    return bestResults;
  },
  
  /**
   * Process cutting patterns for visualization
   * @param {Object} layout - Layout pattern to process
   * @returns {Object} Processed pattern with visualization data
   */
  processPattern: function(layout) {
    const pattern = layout.pattern || layout;
    const count = layout.count || 1;
    const cuts = pattern.cuts || pattern.pieces || [];
    const waste = pattern.remainingLength || pattern.waste || 0;
    const barLength = pattern.originalLength || pattern.totalLength + waste;
    
    // Group cuts by length
    const cutCounts = {};
    cuts.forEach(cut => {
      cutCounts[cut] = (cutCounts[cut] || 0) + 1;
    });
    
    // Sort cuts by length (descending)
    const sortedCuts = Object.entries(cutCounts)
      .sort((a, b) => b[0] - a[0])
      .map(([length, count]) => ({ length: parseInt(length), count }));
    
    // Calculate visual representations
    const visualPieces = cuts.map((cut, index) => {
      return {
        length: cut,
        percentage: (cut / barLength) * 100,
        isLast: (index === cuts.length - 1 && waste === 0)
      };
    });
    
    return {
      count,
      barLength,
      waste,
      cuts: sortedCuts,
      visualPieces,
      wastePercentage: (waste / barLength) * 100
    };
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
      totalUsedBars += modelResult.rawData.usedBars.length;
      
      // Calculate waste and total length
      for (const bar of modelResult.rawData.usedBars) {
        totalBarLength += bar.originalLength;
        totalWaste += bar.remainingLength || bar.waste || 0;
      }
    }
    
    // Calculate global efficiency
    const totalEfficiency = totalBarLength > 0 
      ? ((1 - (totalWaste / totalBarLength)) * 100).toFixed(2)
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
    const usedBars = modelResult.rawData.usedBars;
    
    let totalModelBarLength = 0;
    let totalModelWasteLength = 0;
    
    // Calculate model totals
    for (const bar of usedBars) {
      totalModelBarLength += bar.originalLength;
      totalModelWasteLength += bar.remainingLength || bar.waste || 0;
    }
    
    // Calculate model efficiency
    const modelEfficiency = totalModelBarLength > 0 
      ? ((1 - (totalModelWasteLength / totalModelBarLength)) * 100).toFixed(2)
      : "100.00";
      
    return {
      barCount: usedBars.length,
      totalLength: totalModelBarLength,
      wasteLength: totalModelWasteLength,
      efficiency: modelEfficiency
    };
  }
};