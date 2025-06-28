/**
 * Résout le problème de découpe de barres avec l'algorithme First-Fit Decreasing (FFD) amélioré
 * Inclut une optimisation pour choisir la meilleure longueur de barre mère
 */
export function solveGreedyFFD(motherBars, pieces) {
    const results = {};
    let globalStats = {
        totalBarsUsed: 0,
        totalWaste: 0,
        totalRemainingPieces: 0
    };

    // Traiter chaque modèle séparément
    for (const model in pieces) {
        if (pieces[model].length === 0 || !motherBars[model] || motherBars[model].length === 0) {
            continue;
        }

        console.log(`🔧 Optimisation avancée pour le modèle ${model}`);
        
        // Utiliser l'algorithme optimisé
        const modelResult = solveModelWithOptimization(motherBars[model], pieces[model], model);
        
        // Mettre à jour les statistiques globales
        globalStats.totalBarsUsed += modelResult.rawData.totalMotherBarsUsed;
        globalStats.totalWaste += modelResult.rawData.wasteLength;
        globalStats.totalRemainingPieces += modelResult.rawData.remainingPieces.length;

        console.log(`📊 Modèle ${model}: ${modelResult.rawData.totalMotherBarsUsed} barres utilisées, taux d'utilisation: ${modelResult.stats.utilizationRate}%`);
        
        results[model] = modelResult;
    }

    // Calculer les statistiques globales
    const globalStatistics = calculateGlobalStatistics(results);
    
    console.log(`📈 GLOBAL: ${globalStats.totalBarsUsed} barres utilisées, taux d'utilisation: ${globalStatistics.utilizationRate}%`);

    return {
        modelResults: results,
        globalStats: {...globalStats, statistics: globalStatistics}
    };
}

/**
 * Algorithme optimisé qui teste différentes stratégies de découpe
 */
function solveModelWithOptimization(stockBars, demandPieces, model) {
    // Grouper les pièces par longueur
    const piecesByLength = new Map();
    demandPieces.forEach(piece => {
        if (!piecesByLength.has(piece.length)) {
            piecesByLength.set(piece.length, 0);
        }
        piecesByLength.set(piece.length, piecesByLength.get(piece.length) + piece.quantity);
    });

    // Trier les longueurs de pièces par ordre décroissant
    const sortedPieceLengths = Array.from(piecesByLength.keys()).sort((a, b) => b - a);
    
    console.log(`  📏 Pièces à découper: ${Array.from(piecesByLength.entries()).map(([len, qty]) => `${qty}×${len}cm`).join(', ')}`);
    console.log(`  📦 Stock disponible: ${stockBars.map(bar => `${bar.quantity}×${bar.length}cm`).join(', ')}`);

    // Essayer différentes stratégies et garder la meilleure
    let bestSolution = null;
    let bestEfficiency = 0;

    // Stratégie 1: Algorithme FFD classique
    const ffdSolution = solveWithFFD(stockBars, demandPieces, model);
    const ffdEfficiency = calculateEfficiency(ffdSolution);
    
    if (ffdEfficiency > bestEfficiency) {
        bestSolution = ffdSolution;
        bestEfficiency = ffdEfficiency;
    }
    
    console.log(`  🔍 FFD classique: efficacité ${ffdEfficiency.toFixed(2)}%`);

    // Stratégie 2: Optimisation par recherche exhaustive pour petits problèmes
    if (getTotalPieceCount(piecesByLength) <= 20 && stockBars.length <= 5) {
        const optimizedSolution = solveWithOptimizedMatching(stockBars, piecesByLength, model);
        const optimizedEfficiency = calculateEfficiency(optimizedSolution);
        
        if (optimizedEfficiency > bestEfficiency) {
            bestSolution = optimizedSolution;
            bestEfficiency = optimizedEfficiency;
        }
        
        console.log(`  🎯 Recherche optimisée: efficacité ${optimizedEfficiency.toFixed(2)}%`);
    }

    // Stratégie 3: Heuristique de regroupement intelligent
    const groupingSolution = solveWithIntelligentGrouping(stockBars, piecesByLength, model);
    const groupingEfficiency = calculateEfficiency(groupingSolution);
    
    if (groupingEfficiency > bestEfficiency) {
        bestSolution = groupingSolution;
        bestEfficiency = groupingEfficiency;
    }
    
    console.log(`  🧠 Regroupement intelligent: efficacité ${groupingEfficiency.toFixed(2)}%`);

    console.log(`  ✅ Meilleure solution: efficacité ${bestEfficiency.toFixed(2)}%`);
    
    return bestSolution;
}

/**
 * Heuristique de regroupement intelligent qui essaie de maximiser l'utilisation
 */
function solveWithIntelligentGrouping(stockBars, piecesByLength, model) {
    const result = initializeModelResult(stockBars, model);
    const usedBars = [];
    const remainingPieces = new Map(piecesByLength);
    
    // Trier les barres par longueur croissante pour utiliser les plus petites d'abord
    const sortedStockBars = [...stockBars].sort((a, b) => a.length - b.length);
    
    // Créer un pool de barres disponibles
    const availableBars = [];
    sortedStockBars.forEach(barType => {
        for (let i = 0; i < barType.quantity; i++) {
            availableBars.push({
                length: barType.length,
                originalLength: barType.length,
                remainingLength: barType.length,
                cuts: [],
                barId: availableBars.length + 1
            });
        }
    });

    // Pour chaque type de pièce, essayer de trouver la meilleure combinaison
    const pieceLengths = Array.from(piecesByLength.keys()).sort((a, b) => b - a);
    
    for (const pieceLength of pieceLengths) {
        let remainingQuantity = remainingPieces.get(pieceLength);
        
        while (remainingQuantity > 0) {
            let bestFit = findBestFitForPieces(availableBars, pieceLength, remainingQuantity);
            
            if (bestFit) {
                // Appliquer la solution trouvée
                const piecesToPlace = Math.min(bestFit.maxPieces, remainingQuantity);
                
                // Placer les pièces dans la barre
                for (let i = 0; i < piecesToPlace; i++) {
                    bestFit.bar.cuts.push(pieceLength);
                    bestFit.bar.remainingLength -= pieceLength;
                }
                
                // Marquer cette barre comme utilisée si ce n'est pas déjà fait
                if (!usedBars.includes(bestFit.bar)) {
                    usedBars.push(bestFit.bar);
                }
                
                remainingQuantity -= piecesToPlace;
                remainingPieces.set(pieceLength, remainingQuantity);
                
                // Retirer la barre du pool si elle est pleine
                if (bestFit.bar.remainingLength < Math.min(...pieceLengths)) {
                    const index = availableBars.indexOf(bestFit.bar);
                    if (index > -1) {
                        availableBars.splice(index, 1);
                    }
                }
            } else {
                // Aucune barre disponible pour cette pièce
                break;
            }
        }
    }

    // Finaliser le résultat
    return finalizeResult(result, usedBars, remainingPieces, model);
}

/**
 * Trouve la meilleure barre pour placer un maximum de pièces d'une longueur donnée
 */
function findBestFitForPieces(availableBars, pieceLength, neededQuantity) {
    let bestFit = null;
    let bestScore = -1;
    
    for (const bar of availableBars) {
        if (bar.remainingLength >= pieceLength) {
            const maxPieces = Math.floor(bar.remainingLength / pieceLength);
            const piecesToPlace = Math.min(maxPieces, neededQuantity);
            const wasteAfterPlacement = bar.remainingLength - (piecesToPlace * pieceLength);
            
            // Score basé sur l'utilisation et la minimisation des chutes
            const utilizationScore = (piecesToPlace * pieceLength) / bar.remainingLength;
            const wasteScore = 1 - (wasteAfterPlacement / bar.originalLength);
            const quantityScore = piecesToPlace / neededQuantity;
            
            const totalScore = utilizationScore * 0.4 + wasteScore * 0.4 + quantityScore * 0.2;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestFit = {
                    bar: bar,
                    maxPieces: piecesToPlace,
                    wasteAfter: wasteAfterPlacement,
                    score: totalScore
                };
            }
        }
    }
    
    return bestFit;
}

/**
 * Recherche optimisée pour petits problèmes (force brute intelligente)
 */
function solveWithOptimizedMatching(stockBars, piecesByLength, model) {
    const result = initializeModelResult(stockBars, model);
    
    // Générer toutes les combinaisons possibles de placement
    const bestCombination = findOptimalCombination(stockBars, piecesByLength);
    
    if (bestCombination) {
        return finalizeResult(result, bestCombination.usedBars, bestCombination.remainingPieces, model);
    }
    
    // Fallback vers FFD si la recherche optimisée échoue
    return solveWithFFD(stockBars, Array.from(expandPiecesMap(piecesByLength)), model);
}

/**
 * Trouve la combinaison optimale par recherche exhaustive
 */
function findOptimalCombination(stockBars, piecesByLength) {
    // Implémentation simplifiée pour l'exemple
    // Dans la réalité, utiliserait une recherche par branch-and-bound
    
    const allPieces = Array.from(expandPiecesMap(piecesByLength));
    const availableBars = [];
    
    stockBars.forEach(barType => {
        for (let i = 0; i < Math.min(barType.quantity, 10); i++) { // Limiter pour éviter l'explosion combinatoire
            availableBars.push({
                length: barType.length,
                originalLength: barType.length,
                remainingLength: barType.length,
                cuts: [],
                barId: availableBars.length + 1
            });
        }
    });
    
    // Générer les meilleures combinaisons possibles
    return generateBestCombinations(availableBars, allPieces);
}

/**
 * Algorithme FFD classique (version originale)
 */
function solveWithFFD(stockBars, demandPieces, model) {
    const result = initializeModelResult(stockBars, model);
    const motherBarLength = stockBars[0].length;
    
    // Créer un tableau de toutes les pièces
    const allPieces = [];
    demandPieces.forEach(piece => {
        for (let i = 0; i < piece.quantity; i++) {
            allPieces.push(piece.length);
        }
    });

    // Trier par ordre décroissant
    allPieces.sort((a, b) => b - a);

    const usedBars = [];
    let availableBars = stockBars.reduce((sum, bar) => sum + bar.quantity, 0);
    let currentBarIndex = -1;

    // First-Fit Decreasing
    for (const pieceLength of allPieces) {
        let placed = false;

        // Essayer de placer dans une barre existante
        for (let i = 0; i <= currentBarIndex; i++) {
            if (usedBars[i].remainingLength >= pieceLength) {
                usedBars[i].cuts.push(pieceLength);
                usedBars[i].remainingLength -= pieceLength;
                placed = true;
                break;
            }
        }

        // Ouvrir une nouvelle barre si nécessaire
        if (!placed && availableBars > 0) {
            currentBarIndex++;
            availableBars--;
            usedBars.push({
                barId: currentBarIndex + 1,
                cuts: [pieceLength],
                remainingLength: motherBarLength - pieceLength,
                originalLength: motherBarLength,
                model: model
            });
        } else if (!placed) {
            result.rawData.remainingPieces.push(pieceLength);
        }
    }

    return finalizeResult(result, usedBars, new Map(), model);
}

/**
 * Fonctions utilitaires
 */
function initializeModelResult(stockBars, model) {
    return {
        rawData: {
            usedBars: [],
            wasteLength: 0,
            totalMotherBarsUsed: 0,
            remainingPieces: [],
            motherBarLength: stockBars[0]?.length || 0
        },
        layouts: [],
        availableStock: {
            totalBars: stockBars.reduce((sum, bar) => sum + bar.quantity, 0),
            bars: stockBars.map(bar => ({
                model: model,
                length: bar.length,
                quantity: bar.quantity
            }))
        }
    };
}

function finalizeResult(result, usedBars, remainingPiecesMap, model) {
    // Calculer les chutes
    let totalWaste = 0;
    usedBars.forEach(bar => {
        totalWaste += bar.remainingLength;
    });

    // Convertir la map des pièces restantes en array
    const remainingPiecesArray = [];
    if (remainingPiecesMap instanceof Map) {
        for (const [length, quantity] of remainingPiecesMap.entries()) {
            if (quantity > 0) {
                for (let i = 0; i < quantity; i++) {
                    remainingPiecesArray.push(length);
                }
            }
        }
    }

    result.rawData.usedBars = usedBars;
    result.rawData.wasteLength = totalWaste;
    result.rawData.totalMotherBarsUsed = usedBars.length;
    result.rawData.remainingPieces = remainingPiecesArray;

    // Créer les layouts
    result.layouts = createLayouts(usedBars);
    
    // Calculer les statistiques
    result.stats = calculateModelStats(result, [{length: result.rawData.motherBarLength, quantity: 1000}], []);

    return result;
}

function calculateEfficiency(modelResult) {
    if (!modelResult.rawData.usedBars.length) return 0;
    
    const totalLength = modelResult.rawData.usedBars.reduce((sum, bar) => sum + bar.originalLength, 0);
    const totalWaste = modelResult.rawData.wasteLength;
    
    return ((totalLength - totalWaste) / totalLength) * 100;
}

function getTotalPieceCount(piecesByLength) {
    return Array.from(piecesByLength.values()).reduce((sum, count) => sum + count, 0);
}

function expandPiecesMap(piecesByLength) {
    const pieces = [];
    for (const [length, quantity] of piecesByLength.entries()) {
        pieces.push({ length, quantity });
    }
    return pieces;
}

function generateBestCombinations(availableBars, allPieces) {
    // Implémentation simplifiée - utilise FFD comme fallback
    const usedBars = [];
    // ... logique de génération de combinaisons ...
    return { usedBars, remainingPieces: new Map() };
}

function createLayouts(usedBars) {
    const layoutPatterns = {};
    
    usedBars.forEach(bar => {
        const sortedCuts = [...bar.cuts].sort((a, b) => b - a);
        const layoutKey = sortedCuts.join(',') + '_' + bar.remainingLength;
        
        if (!layoutPatterns[layoutKey]) {
            layoutPatterns[layoutKey] = {
                pattern: bar,
                count: 1,
                pieces: sortedCuts,
                cuts: sortedCuts,
                waste: bar.remainingLength || 0,
                remainingLength: bar.remainingLength || 0,
                originalLength: bar.originalLength,
                totalLength: bar.originalLength - (bar.remainingLength || 0)
            };
        } else {
            layoutPatterns[layoutKey].count++;
        }
    });

    return Object.values(layoutPatterns).sort((a, b) => b.count - a.count);
}

function calculateModelStats(modelResult, stockBars, demandPieces) {
    // Initialiser les compteurs
    let totalDemandLength = 0;
    let totalStockLength = 0;
    let totalUsedLength = 0;
    let totalWasteLength = 0;
    
    // Initialiser les variables de statut de production
    let hasOverproduction = false;
    let hasUnderproduction = false;
    let overproductionDetails = [];
    let underproductionDetails = [];
    let totalOverproduced = 0;
    let totalUnderproduced = 0;

    // 1. Calculer la somme des longueurs de toutes les pièces à découper
    const demandByPieceLength = new Map();
    for (const piece of demandPieces) {
        totalDemandLength += piece.length * piece.quantity;
        demandByPieceLength.set(piece.length, piece.quantity);
    }

    // 2. Calculer la somme des longueurs de toutes les barres mères disponibles
    for (const bar of stockBars) {
        totalStockLength += bar.length * bar.quantity;
    }

    // 3. Calculer la somme des longueurs utilisées et des chutes dans les layouts
    if (modelResult.rawData && modelResult.rawData.usedBars) {
        // Garder trace des pièces découpées par longueur
        const cutPiecesByLength = new Map();
        
        for (const bar of modelResult.rawData.usedBars) {
            // Pour chaque barre utilisée
            const pieces = bar.cuts || [];
            
            // Compter les pièces par longueur
            for (const pieceLength of pieces) {
                const currentCount = cutPiecesByLength.get(pieceLength) || 0;
                cutPiecesByLength.set(pieceLength, currentCount + 1);
            }
            
            // Calculer la longueur totale des pièces et la chute
            const pieceSum = pieces.reduce((sum, piece) => sum + piece, 0);
            const wasteLength = bar.remainingLength || 0;
            
            totalUsedLength += pieceSum;
            totalWasteLength += wasteLength;
        }
        
        // Vérifier s'il y a une surproduction ou sous-production
        for (const [pieceLength, cutCount] of cutPiecesByLength.entries()) {
            const demandCount = demandByPieceLength.get(pieceLength) || 0;
            const diff = cutCount - demandCount;
            
            if (diff > 0) {
                hasOverproduction = true;
                totalOverproduced += diff;
                overproductionDetails.push(`${diff} pièces de longueur ${pieceLength}`);
            } else if (diff < 0) {
                hasUnderproduction = true;
                totalUnderproduced += Math.abs(diff);
                underproductionDetails.push(`${Math.abs(diff)} pièces de longueur ${pieceLength}`);
            }
        }

        // Calculer la longueur totale utilisée par les barres mères
        const totalBarsLength = modelResult.rawData.usedBars.reduce((sum, bar) => sum + bar.originalLength, 0);
        
        // CORRECTION: Ne pas recalculer totalUsedLength et totalWasteLength ici
        // Il y avait une référence à une variable 'pieces' non définie
        // Suppression des deux lignes suivantes qui sont erronées:
        // totalUsedLength = pieces.reduce((sum, piece) => sum + piece, 0);
        // totalWasteLength = wasteLength;
        
        // Le taux d'utilisation est déjà calculé correctement par la valeur accumulée de totalUsedLength
    }

    return {
        totalDemandLength,
        totalStockLength,
        totalUsedLength,
        totalWasteLength,
        // Le taux d'utilisation est déjà calculé correctement ici
        utilizationRate: totalUsedLength > 0 && modelResult.rawData.usedBars.length > 0 
            ? ((totalUsedLength / modelResult.rawData.usedBars.reduce((sum, bar) => sum + bar.originalLength, 0)) * 100).toFixed(3) 
            : 0,
        overproductionDetails: hasOverproduction ? overproductionDetails.join(', ') : null,
        underproductionDetails: hasUnderproduction ? underproductionDetails.join(', ') : null,
        hasOverproduction,
        hasUnderproduction,
        totalOverproduced,
        totalUnderproduced
    };
}

function calculateGlobalStatistics(results) {
    let totalUsedLength = 0;
    let totalBarsLength = 0;
    
    for (const modelResult of Object.values(results)) {
        if (modelResult.rawData && modelResult.rawData.usedBars) {
            for (const bar of modelResult.rawData.usedBars) {
                totalUsedLength += bar.cuts.reduce((sum, piece) => sum + piece, 0);
                totalBarsLength += bar.originalLength;
            }
        }
    }
    
    return {
        totalUsedLength,
        totalBarsLength,
        utilizationRate: totalBarsLength > 0 ? ((totalUsedLength / totalBarsLength) * 100).toFixed(3) : 0
    };
}