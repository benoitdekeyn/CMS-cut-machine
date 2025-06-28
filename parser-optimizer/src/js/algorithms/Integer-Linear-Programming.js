import solver from 'javascript-lp-solver';

/**
 * Résout le problème de découpe de barres en utilisant la programmation linéaire en nombres entiers
 * basée sur l'article "Pattern-based ILP models for the one-dimensional cutting stock problem with setup cost"
 * 
 * @param {Object} motherBars - Dictionnaire des barres mères disponibles par modèle
 * @param {Object} pieces - Dictionnaire des pièces à découper par modèle
 * @param {Function} progressCallback - Fonction de callback pour indiquer la progression
 * @returns {Object} Résultats de l'optimisation
 */
export function solveWithILP(motherBars, pieces, progressCallback = () => {}) {
    if (typeof solver === 'undefined') {
        throw new Error("Le solveur jsLPSolver n'est pas défini. Assurez-vous qu'il est correctement importé.");
    }
    
    const results = {};
    const globalStats = {
        totalBarsUsed: 0,
        totalWaste: 0,
        totalRemainingPieces: 0
    };

    console.log("Début de l'exécution ILP basée sur l'article de recherche");

    // Traiter chaque modèle séparément
    for (const model in pieces) {
        if (pieces[model].length === 0 || !motherBars[model] || motherBars[model].length === 0) {
            continue;
        }

        progressCallback({ step: `Traitement du modèle ${model}`, percentage: 10 });

        try {
            console.log(`Optimisation du modèle ${model}`);
            
            // Préparer les données
            const stockBars = prepareStockBarsData(motherBars[model]);
            const demandPieces = preparePiecesData(pieces[model]);
            
            if (demandPieces.length === 0 || stockBars.length === 0) {
                console.log(`Modèle ${model} : données insuffisantes`);
                continue;
            }
            
            // Appliquer le préprocessing pour agréger les pièces de même longueur
            const aggregatedPieces = applyPreprocessing(demandPieces);
            
            progressCallback({ step: `Génération des patterns pour ${model}`, percentage: 30 });
            
            // Générer les patterns de découpe selon l'approche de l'article
            const patterns = generatePatterns(stockBars, aggregatedPieces);
            
            progressCallback({ step: `Résolution ILP pour ${model}`, percentage: 70 });
            
            // Résoudre avec le framework Pareto optimal
            const optimizationResult = solveParetoOptimalFramework(stockBars, aggregatedPieces, patterns);
            
            // Traiter les résultats
            const processedResult = processOptimizationResult(optimizationResult, stockBars, aggregatedPieces);
            
            // Mettre à jour les statistiques globales
            globalStats.totalBarsUsed += processedResult.rawData.totalMotherBarsUsed;
            globalStats.totalWaste += processedResult.rawData.wasteLength;
            globalStats.totalRemainingPieces += processedResult.rawData.remainingPieces.length;
            
            results[model] = processedResult;
            
            console.log(`Modèle ${model} traité : ${processedResult.rawData.totalMotherBarsUsed} barres utilisées`);
            
        } catch (error) {
            console.error(`Erreur lors du traitement du modèle ${model}:`, error);
            
            // Utiliser l'algorithme de secours
            const stockBars = prepareStockBarsData(motherBars[model]);
            const demandPieces = preparePiecesData(pieces[model]);
            const fallbackResult = solveWithSimpleGreedy(stockBars, demandPieces);
            
            results[model] = fallbackResult;
            globalStats.totalBarsUsed += fallbackResult.rawData.totalMotherBarsUsed;
            globalStats.totalWaste += fallbackResult.rawData.wasteLength;
            globalStats.totalRemainingPieces += fallbackResult.rawData.remainingPieces.length;
        }
        
        progressCallback({ step: `Modèle ${model} terminé`, percentage: 100 });
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
 * Applique le préprocessing pour agréger les pièces de même longueur (P1)
 */
function applyPreprocessing(demandPieces) {
    const aggregatedMap = new Map();
    
    for (const piece of demandPieces) {
        const length = piece.length;
        if (aggregatedMap.has(length)) {
            aggregatedMap.set(length, aggregatedMap.get(length) + piece.quantity);
        } else {
            aggregatedMap.set(length, piece.quantity);
        }
    }
    
    const aggregated = [];
    for (const [length, quantity] of aggregatedMap.entries()) {
        aggregated.push({ length, quantity });
    }
    
    // Trier par ordre décroissant de longueur
    aggregated.sort((a, b) => b.length - a.length);
    return aggregated;
}

/**
 * Calcule les bornes supérieures selon le Théorème 1 de l'article
 */
function calculateUpperBounds(demandPieces, stockLength) {
    const dmax = Math.max(...demandPieces.map(p => p.quantity));
    const bounds = {
        dmax,
        // Borne géométrique pour chaque type de pièce
        itemBounds: new Map()
    };
    
    for (const piece of demandPieces) {
        const geometricBound = Math.floor(stockLength / piece.length);
        bounds.itemBounds.set(piece.length, Math.min(geometricBound, piece.quantity));
    }
    
    return bounds;
}

/**
 * Génère les patterns de découpe selon l'approche de l'article
 */
function generatePatterns(stockBars, demandPieces) {
    const allPatterns = [];
    
    for (const stockBar of stockBars) {
        const stockLength = stockBar.length;
        const bounds = calculateUpperBounds(demandPieces, stockLength);
        
        // Générer les patterns pour cette longueur de barre
        const patterns = generatePatternsForLength(demandPieces, stockLength, bounds);
        
        patterns.forEach(pattern => {
            pattern.stockLength = stockLength;
            pattern.stockBarId = stockBar.id || null;
        });
        
        allPatterns.push(...patterns);
    }
    
    // Limiter le nombre de patterns pour éviter l'explosion combinatoire
    const maxPatterns = 5000;
    if (allPatterns.length > maxPatterns) {
        console.warn(`⚠️ Limitation du nombre de patterns à ${maxPatterns}`);
        return allPatterns.slice(0, maxPatterns);
    }
    
    return allPatterns;
}

/**
 * Génère les patterns pour une longueur de barre spécifique
 */
function generatePatternsForLength(pieces, stockLength, bounds) {
    const patterns = [];
    const maxPatterns = 1000;
    
    // Générer les patterns en utilisant une approche récursive
    function generateRecursive(remainingLength, pieceIndex, currentPattern, currentComposition) {
        if (patterns.length >= maxPatterns) return;
        
        // Pattern terminal
        if (pieceIndex >= pieces.length || remainingLength <= 0) {
            if (currentPattern.length > 0) {
                patterns.push({
                    pieces: [...currentPattern],
                    waste: Math.max(0, remainingLength),
                    composition: {...currentComposition}
                });
            }
            return;
        }
        
        const piece = pieces[pieceIndex];
        const maxCount = Math.min(
            Math.floor(remainingLength / piece.length),
            bounds.itemBounds.get(piece.length) || piece.quantity
        );
        
        // Essayer différentes quantités de cette pièce
        for (let count = 0; count <= maxCount; count++) {
            const newPattern = [...currentPattern];
            const newComposition = {...currentComposition};
            
            for (let i = 0; i < count; i++) {
                newPattern.push(piece.length);
            }
            
            if (count > 0) {
                newComposition[piece.length] = count;
            }
            
            generateRecursive(
                remainingLength - (count * piece.length),
                pieceIndex + 1,
                newPattern,
                newComposition
            );
        }
    }
    
    generateRecursive(stockLength, 0, [], {});
    
    // Trier par efficacité (moins de déchets)
    patterns.sort((a, b) => a.waste - b.waste);
    
    return patterns;
}

/**
 * Framework pour générer la frontière Pareto optimale selon l'Algorithm 1
 */
function solveParetoOptimalFramework(stockBars, demandPieces, patterns) {
    console.log("Exécution du framework Pareto optimal");
    
    // Calculer z* (nombre minimum d'objets) en résolvant le CSP classique
    const zStar = calculateMinimumObjects(stockBars, demandPieces);
    
    // Calculer y* (nombre minimum de patterns) en résolvant le BPP associé
    const yStar = calculateMinimumPatterns(stockBars, demandPieces);
    
    console.log(`Bornes: z* = ${zStar}, y* = ${yStar}`);
    
    // Résoudre pour le nombre minimum de patterns avec Model (3)
    const solution = solveModel3(stockBars, demandPieces, patterns, yStar);
    
    return {
        method: "ILP_Research_Based",
        solution: solution,
        patterns: patterns,
        bounds: { zStar, yStar }
    };
}

/**
 * Implémentation du Model (3) de l'article
 */
function solveModel3(stockBars, demandPieces, patterns, maxPatterns) {
    console.log(`Résolution du Model (3) avec maximum ${maxPatterns} patterns`);
    
    // Créer le modèle ILP selon Model (3)
    const model = {
        optimize: 'totalObjects',
        opType: 'min',
        constraints: {},
        variables: {},
        ints: {}
    };
    
    // Calculer les fréquences maximales pour chaque pattern selon le Théorème 1
    const patternMaxFreq = calculatePatternMaxFrequencies(patterns, demandPieces);
    
    // Limiter le nombre de patterns pour la faisabilité
    const actualMaxPatterns = Math.min(maxPatterns, patterns.length, 10);
    
    let patternIndex = 0;
    for (const pattern of patterns) {
        if (patternIndex >= actualMaxPatterns) break;
        
        const k = patternIndex;
        const maxFreq = Math.min(patternMaxFreq.get(k) || 1, 10); // Limiter aussi les fréquences
        
        // Contrainte (3e): chaque pattern a exactement une fréquence
        model.constraints[`pattern_${k}_frequency`] = { equal: 1 };
        
        // Pour chaque fréquence possible j (0 à maxFreq)
        for (let j = 0; j <= maxFreq; j++) {
            const lambdaVar = `lambda_${k}_${j}`;
            
            // Variable binaire λkj
            model.variables[lambdaVar] = {
                [`pattern_${k}_frequency`]: 1,
                totalObjects: j  // Contribution à l'objectif (3a)
            };
            model.ints[lambdaVar] = 1;
            
            // Variables αkji pour j > 0
            if (j > 0) {
                // Contrainte (3c): containment constraint pour ce pattern et cette fréquence
                const containmentConstraint = `containment_${k}_${j}`;
                model.constraints[containmentConstraint] = { max: 0 };
                
                // Variables pour chaque type de pièce dans ce pattern
                for (const piece of demandPieces) {
                    const alphaVar = `alpha_${k}_${j}_${piece.length}`;
                    const maxItemsInPattern = Math.floor(pattern.stockLength / piece.length);
                    
                    if (maxItemsInPattern > 0) {
                        // Variable entière αkji
                        model.variables[alphaVar] = {
                            [containmentConstraint]: piece.length
                        };
                        
                        // Contrainte de demande (3d)
                        const demandConstraint = `demand_${piece.length}`;
                        if (!model.constraints[demandConstraint]) {
                            model.constraints[demandConstraint] = { min: piece.quantity };
                        }
                        model.variables[alphaVar][demandConstraint] = j;
                        
                        // Bornes sur les variables αkji
                        model.variables[alphaVar][alphaVar + '_bound'] = 1;
                        model.constraints[alphaVar + '_bound'] = { max: maxItemsInPattern };
                        
                        // Les variables αkji sont entières non-négatives
                        model.ints[alphaVar] = 1;
                    }
                }
                
                // La contrainte containment doit inclure la contribution de λkj
                if (!model.variables[lambdaVar][containmentConstraint]) {
                    model.variables[lambdaVar][containmentConstraint] = 0;
                }
                model.variables[lambdaVar][containmentConstraint] -= pattern.stockLength;
            }
        }
        
        patternIndex++;
    }
    
    // Contraintes d'ordre (3f): patterns triés par fréquence décroissante
    for (let k = 0; k < Math.min(patternIndex - 1, actualMaxPatterns - 1); k++) {
        const orderConstraint = `order_${k}`;
        model.constraints[orderConstraint] = { min: 0 };
        
        const maxFreqK = Math.min(patternMaxFreq.get(k) || 1, 10);
        const maxFreqK1 = Math.min(patternMaxFreq.get(k + 1) || 1, 10);
        
        // Somme des fréquences du pattern k
        for (let j = 0; j <= maxFreqK; j++) {
            const lambdaVar = `lambda_${k}_${j}`;
            if (model.variables[lambdaVar]) {
                if (!model.variables[lambdaVar][orderConstraint]) {
                    model.variables[lambdaVar][orderConstraint] = 0;
                }
                model.variables[lambdaVar][orderConstraint] += j;
            }
        }
        
        // Soustraire les fréquences du pattern k+1
        for (let j = 0; j <= maxFreqK1; j++) {
            const lambdaVar = `lambda_${k+1}_${j}`;
            if (model.variables[lambdaVar]) {
                if (!model.variables[lambdaVar][orderConstraint]) {
                    model.variables[lambdaVar][orderConstraint] = 0;
                }
                model.variables[lambdaVar][orderConstraint] -= j;
            }
        }
    }
    
    console.log("Modèle ILP créé:");
    console.log("- Variables:", Object.keys(model.variables).length);
    console.log("- Contraintes:", Object.keys(model.constraints).length);
    console.log("- Patterns utilisés:", actualMaxPatterns);
    
    try {
        const options = {
            timeout: 30000,
            msg: false
        };
        
        const solution = solver.Solve(model, options);
        
        if (solution.feasible && !isNaN(solution.result)) {
            console.log("Solution ILP trouvée:", solution.result, "objets");
            return solution;
        } else {
            console.warn("Solution ILP non faisable, utilisation du fallback");
            return solveGreedyFallback(stockBars, demandPieces);
        }
        
    } catch (error) {
        console.error("Erreur lors de la résolution ILP:", error);
        return solveGreedyFallback(stockBars, demandPieces);
    }
}

/**
 * Calcule les fréquences maximales pour chaque pattern selon le Théorème 1
 */
function calculatePatternMaxFrequencies(patterns, demandPieces) {
    const maxFreq = new Map();
    const dmax = Math.max(...demandPieces.map(p => p.quantity));
    
    patterns.forEach((pattern, index) => {
        // Compter les pièces dans le pattern
        const pieceCounts = {};
        for (const pieceLength of pattern.pieces) {
            pieceCounts[pieceLength] = (pieceCounts[pieceLength] || 0) + 1;
        }
        
        // Calculer la fréquence maximum basée sur la demande
        let maxUsage = dmax;
        for (const [pieceLength, count] of Object.entries(pieceCounts)) {
            const piece = demandPieces.find(p => p.length === parseInt(pieceLength));
            if (piece && count > 0) {
                maxUsage = Math.min(maxUsage, Math.floor(piece.quantity / count));
            }
        }
        
        maxFreq.set(index, Math.max(1, maxUsage));
    });
    
    return maxFreq;
}

/**
 * Calcule le nombre minimum d'objets (résolution du CSP classique)
 */
function calculateMinimumObjects(stockBars, demandPieces) {
    // Approximation simple: somme des demandes divisée par la capacité moyenne
    const totalDemandLength = demandPieces.reduce((sum, p) => sum + p.length * p.quantity, 0);
    const avgStockLength = stockBars.reduce((sum, b) => sum + b.length, 0) / stockBars.length;
    
    return Math.ceil(totalDemandLength / avgStockLength);
}

/**
 * Calcule le nombre minimum de patterns (résolution du BPP associé)
 */
function calculateMinimumPatterns(stockBars, demandPieces) {
    // Approximation: au minimum un pattern par type de pièce
    return Math.min(demandPieces.length, stockBars.length);
}

/**
 * Algorithme glouton de secours amélioré
 */
function solveGreedyFallback(stockBars, demandPieces) {
    console.log("Utilisation de l'algorithme glouton de secours");
    
    const usedBars = [];
    const allPieces = [];
    let barId = 1;
    
    // Créer une liste plate de toutes les pièces
    for (const piece of demandPieces) {
        for (let i = 0; i < piece.quantity; i++) {
            allPieces.push(piece.length);
        }
    }
    
    // Trier par ordre décroissant
    allPieces.sort((a, b) => b - a);
    
    // First-Fit Decreasing
    const bins = [];
    const stockLength = stockBars[0]?.length || 1000;
    
    for (const pieceLength of allPieces) {
        let placed = false;
        
        // Essayer de placer dans un bin existant
        for (const bin of bins) {
            if (bin.remainingSpace >= pieceLength) {
                bin.pieces.push(pieceLength);
                bin.remainingSpace -= pieceLength;
                placed = true;
                break;
            }
        }
        
        // Créer un nouveau bin si nécessaire
        if (!placed) {
            bins.push({
                pieces: [pieceLength],
                remainingSpace: stockLength - pieceLength
            });
        }
    }
    
    // Convertir les bins en format attendu
    for (const bin of bins) {
        usedBars.push({
            id: barId++,
            pieces: [...bin.pieces],
            waste: bin.remainingSpace,
            originalLength: stockLength,
            cuts: [...bin.pieces],
            remainingLength: bin.remainingSpace
        });
    }
    
    return {
        feasible: true,
        result: bins.length,
        usedBars: usedBars
    };
}

/**
 * Prépare les données des barres mères
 */
function prepareStockBarsData(motherBars) {
    const stockBars = [];
    
    for (const bar of motherBars) {
        stockBars.push({
            length: parseInt(bar.length, 10),
            quantity: parseInt(bar.quantity, 10)
        });
    }
    
    stockBars.sort((a, b) => b.length - a.length);
    return stockBars;
}

/**
 * Prépare les données des pièces à découper
 */
function preparePiecesData(pieces) {
    const demandPieces = [];
    
    for (const piece of pieces) {
        demandPieces.push({
            length: parseInt(piece.length, 10),
            quantity: parseInt(piece.quantity, 10)
        });
    }
    
    demandPieces.sort((a, b) => b.length - a.length);
    return demandPieces;
}

/**
 * Traite les résultats de l'optimisation - version corrigée
 */
function processOptimizationResult(optimizationResult, stockBars, demandPieces) {
    const { solution, patterns } = optimizationResult;
    
    let usedBars = [];
    let wasteLength = 0;
    let barId = 1;
    
    // Si la solution contient déjà des usedBars (fallback)
    if (solution.usedBars) {
        usedBars = solution.usedBars;
        wasteLength = usedBars.reduce((sum, bar) => sum + bar.waste, 0);
    } else {
        // Analyser la solution pour extraire les patterns utilisés
        for (const [varName, value] of Object.entries(solution)) {
            if (varName.startsWith('lambda_') && value > 0) {
                // Extraire les indices k et j
                const parts = varName.split('_');
                const k = parseInt(parts[1]);
                const j = parseInt(parts[2]);
                
                if (j > 0 && patterns[k]) {
                    // Ce pattern est utilisé j fois
                    for (let i = 0; i < j; i++) {
                        const pattern = patterns[k];
                        usedBars.push({
                            id: barId++,
                            pieces: [...pattern.pieces],
                            waste: pattern.waste || 0,
                            originalLength: pattern.stockLength,
                            cuts: [...pattern.pieces],
                            remainingLength: pattern.waste || 0
                        });
                        wasteLength += pattern.waste || 0;
                    }
                }
            }
        }
    }
    
    // Calculer les pièces restantes
    const remainingPieces = calculateRemainingPieces(demandPieces, usedBars);
    
    // Créer les layouts
    const layouts = createLayouts(usedBars);
    
    return {
        rawData: {
            usedBars,
            wasteLength,
            totalMotherBarsUsed: usedBars.length,
            remainingPieces,
            motherBarLength: stockBars.length > 0 ? stockBars[0].length : 0
        },
        layouts
    };
}

/**
 * Calcule les pièces restantes
 */
function calculateRemainingPieces(demandPieces, usedBars) {
    const placedCounts = new Map();
    
    // Compter les pièces placées
    for (const bar of usedBars) {
        for (const pieceLength of bar.pieces) {
            placedCounts.set(pieceLength, (placedCounts.get(pieceLength) || 0) + 1);
        }
    }
    
    // Calculer les pièces restantes
    const remaining = [];
    for (const piece of demandPieces) {
        const placed = placedCounts.get(piece.length) || 0;
        const remainingQty = piece.quantity - placed;
        
        if (remainingQty > 0) {
            remaining.push({
                length: piece.length,
                quantity: remainingQty
            });
        }
    }
    
    return remaining;
}

/**
 * Crée les layouts à partir des barres utilisées
 */
function createLayouts(usedBars) {
    const layoutMap = new Map();
    
    for (const bar of usedBars) {
        const key = bar.pieces.slice().sort((a, b) => b - a).join(',');
        
        if (layoutMap.has(key)) {
            layoutMap.get(key).count++;
        } else {
            layoutMap.set(key, {
                count: 1,
                pieces: bar.pieces.slice().sort((a, b) => b - a),
                waste: bar.waste,
                cuts: bar.pieces.slice().sort((a, b) => b - a),
                remainingLength: bar.remainingLength,
                originalLength: bar.originalLength
            });
        }
    }
    
    return Array.from(layoutMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Calcule les statistiques globales
 */
function calculateGlobalStatistics(results) {
    let totalDemandLength = 0;
    let totalUsedLength = 0;
    let totalBarsLength = 0;
    
    for (const modelResult of Object.values(results)) {
        if (modelResult.rawData && modelResult.rawData.usedBars) {
            for (const bar of modelResult.rawData.usedBars) {
                totalUsedLength += bar.pieces.reduce((sum, piece) => sum + piece, 0);
                totalBarsLength += bar.originalLength;
            }
        }
    }
    
    const utilizationRate = totalBarsLength > 0 
        ? ((totalUsedLength / totalBarsLength) * 100).toFixed(3)
        : 0;
    
    return {
        totalDemandLength,
        totalUsedLength,
        totalBarsLength,
        utilizationRate
    };
}

/**
 * Algorithme glouton simple (fallback)
 */
function solveWithSimpleGreedy(stockBars, demandPieces) {
    return {
        rawData: {
            usedBars: [],
            wasteLength: 0,
            totalMotherBarsUsed: 0,
            remainingPieces: demandPieces,
            motherBarLength: stockBars.length > 0 ? stockBars[0].length : 0
        },
        layouts: []
    };
}
