import solver from 'javascript-lp-solver';

/**
 * Résout le problème de découpe de barres en utilisant l'ILP (Integer Linear Programming)
 * Basé sur le Column Generation approach du Cutting Stock Problem
 */
export function solveWithILP(motherBars, pieces, progressCallback = () => {}) {
    console.log("🔧 Début de l'optimisation ILP avancée");
    
    const results = {};
    const globalStats = {
        totalBarsUsed: 0,
        totalWaste: 0,
        totalRemainingPieces: 0
    };

    // Traiter chaque modèle séparément
    for (const model in pieces) {
        if (!pieces[model] || pieces[model].length === 0) continue;
        if (!motherBars[model] || motherBars[model].length === 0) continue;

        console.log(`🎯 Optimisation ILP avancée pour le modèle ${model}`);
        progressCallback({ step: `Traitement du modèle ${model}`, percentage: 10 });

        try {
            const modelResult = solveModelWithAdvancedILP(motherBars[model], pieces[model], model, progressCallback);
            
            globalStats.totalBarsUsed += modelResult.rawData.totalMotherBarsUsed;
            globalStats.totalWaste += modelResult.rawData.wasteLength;
            globalStats.totalRemainingPieces += modelResult.rawData.remainingPieces.length;
            
            results[model] = modelResult;
            
            console.log(`✅ Modèle ${model}: ${modelResult.rawData.totalMotherBarsUsed} barres, efficacité ${modelResult.stats.utilizationRate}%`);
            
        } catch (error) {
            console.error(`❌ Erreur ILP pour ${model}:`, error);
            // Fallback vers FFD en cas d'erreur
            const fallbackResult = fallbackToGreedyAlgorithm(motherBars[model], pieces[model], model);
            results[model] = fallbackResult;
        }
        
        progressCallback({ step: `Modèle ${model} terminé`, percentage: 100 });
    }

    const globalStatistics = calculateGlobalStatistics(results);
    console.log(`📊 GLOBAL ILP: ${globalStats.totalBarsUsed} barres, efficacité ${globalStatistics.utilizationRate}%`);

    return {
        modelResults: results,
        globalStats: { ...globalStats, statistics: globalStatistics }
    };
}

/**
 * Résout un modèle spécifique avec ILP avancé
 */
function solveModelWithAdvancedILP(stockBars, demandPieces, model, progressCallback = () => {}) {
    console.log(`  🔍 Analyse du modèle ${model}:`);
    
    // 1. Préparer les données - CORRECTION: Grouper correctement les pièces par longueur
    const stockSizes = stockBars.map(bar => ({
        size: parseInt(bar.length),
        cost: 1, // Coût uniforme, on minimise le nombre de barres
        quantity: parseInt(bar.quantity)
    }));
    
    // CORRECTION: Grouper les pièces par longueur pour avoir les quantités totales exactes
    const pieceCounts = {};
    const cutSizes = [];
    
    demandPieces.forEach(piece => {
        const length = parseInt(piece.length);
        const quantity = parseInt(piece.quantity);
        
        if (!pieceCounts[length]) {
            pieceCounts[length] = 0;
            cutSizes.push(length);
        }
        pieceCounts[length] += quantity;
    });
    
    const requiredCuts = Object.entries(pieceCounts).map(([length, count]) => ({
        size: parseInt(length),
        count: count
    }));

    console.log(`    📏 Pièces demandées: ${requiredCuts.map(c => `${c.count}×${c.size}cm`).join(', ')}`);
    console.log(`    📦 Stock disponible: ${stockSizes.map(s => `${s.quantity}×${s.size}cm`).join(', ')}`);

    // Vérification de faisabilité
    const totalDemandLength = requiredCuts.reduce((sum, cut) => sum + (cut.size * cut.count), 0);
    const totalStockLength = stockSizes.reduce((sum, stock) => sum + (stock.size * stock.quantity), 0);
    
    if (totalDemandLength > totalStockLength) {
        console.warn(`⚠️ Stock insuffisant: ${totalDemandLength}cm demandés vs ${totalStockLength}cm disponibles`);
        throw new Error("Stock insuffisant");
    }

    progressCallback({ step: `Génération des patterns pour ${model}`, percentage: 30 });

    // 2. Générer tous les patterns de découte possibles
    const cuttingPatterns = generateAdvancedCuttingPatterns(stockSizes, cutSizes, 0);
    
    console.log(`    🔧 ${cuttingPatterns.totalPatterns} patterns générés au total`);

    progressCallback({ step: `Résolution ILP pour ${model}`, percentage: 70 });

    // 3. Construire et résoudre le modèle ILP
    let ilpSolution = solveAdvancedILPModel(cuttingPatterns, requiredCuts);
    
    // CORRECTION: Vérifier la structure correcte de la solution
    if (!ilpSolution || !ilpSolution.solution || !ilpSolution.solution.feasible) {
        console.warn('❌ ILP: Aucune solution optimale trouvée avec contraintes exactes');
        throw new Error("Aucune solution ILP trouvée");
    }
    
    progressCallback({ step: `Finalisation pour ${model}`, percentage: 90 });

    // 4. Convertir la solution ILP en format attendu
    return convertAdvancedILPSolutionToResult(ilpSolution, cuttingPatterns, stockSizes, model);
}

/**
 * Génère les patterns de découpe de manière exhaustive mais optimisée
 */
function generateAdvancedCuttingPatterns(stockSizes, cutSizes, bladeSize) {
    console.log(`    🔄 Génération exhaustive des patterns...`);
    
    const waysOfCuttingStocks = stockSizes.map(({ size, cost, quantity }) => {
        console.log(`      📏 Analyse barre ${size}cm:`);
        
        // Générer toutes les façons de découper cette barre
        const waysOfCutting = generateAllWaysToCut(size, cutSizes, bladeSize);
        
        console.log(`        ✓ ${waysOfCutting.length} patterns générés`);
        
        // Afficher les 5 meilleurs patterns
        const sortedWays = waysOfCutting
            .map(way => ({
                cuts: way,
                efficiency: (way.reduce((sum, cut) => sum + cut, 0) / size * 100).toFixed(1),
                waste: size - way.reduce((sum, cut) => sum + cut, 0)
            }))
            .sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency));
            
        console.log(`        📊 Top 5 patterns:`);
        sortedWays.slice(0, 5).forEach((pattern, index) => {
            const cutCounts = {};
            pattern.cuts.forEach(cut => {
                cutCounts[cut] = (cutCounts[cut] || 0) + 1;
            });
            const cutStr = Object.entries(cutCounts)
                .map(([cut, count]) => `${count}×${cut}cm`)
                .join(' + ');
            console.log(`          ${index + 1}. ${cutStr} (${pattern.efficiency}% efficacité, ${pattern.waste}cm chute)`);
        });
        
        // CORRECTION: Transformer en format pour ILP avec les bonnes clés
        const versions = waysOfCutting.map(way => {
            const stockCut = {};
            // Initialiser toutes les tailles de coupes à 0
            for (const cut of cutSizes) {
                stockCut[`cut${cut}`] = 0;
            }
            // Compter chaque coupe dans ce pattern
            for (const cut of way) {
                stockCut[`cut${cut}`] = stockCut[`cut${cut}`] + 1;
            }
            return stockCut;
        });

        return { size, cost, quantity, versions, waysOfCutting };
    });

    // Créer les variables pour le modèle ILP
    const variables = {};
    const ints = {};
    const allPatterns = [];
    let patternIndex = 0;
    
    waysOfCuttingStocks.forEach(({ size, cost, quantity, versions }) => {
        versions.forEach((cut, index) => {
            const varName = `stock${size}version${index}`;
            
            variables[varName] = { ...cut, cost: cost };
            ints[varName] = 1;
            
            allPatterns.push({
                varName,
                stockSize: size,
                version: index,
                cuts: cut,
                cost: cost,
                maxQuantity: quantity
            });
            
            patternIndex++;
        });
    });

    return {
        variables,
        ints,
        patterns: allPatterns,
        waysOfCuttingStocks,
        totalPatterns: patternIndex
    };
}

/**
 * Génère récursivement toutes les façons de découper une barre
 * Inspiré de l'algorithme de référence
 */
function generateAllWaysToCut(barSize, cuts, bladeSize, state = []) {
    const waysToCut = [];
    
    // Essayer chaque type de coupe
    for (const cut of cuts) {
        const remainder = barSize - cut;
        if (remainder >= 0) {
            // Récursion pour remplir le reste de la barre
            const subWays = generateAllWaysToCut(
                remainder - bladeSize, // Soustraire la largeur de lame
                cuts,
                bladeSize,
                [...state, cut]
            );
            waysToCut.push(...subWays);
        }
    }
    
    // Ajouter l'état actuel (peut être vide pour la barre complète)
    waysToCut.push([...state]);
    
    // Éliminer les doublons et sous-ensembles
    return removeDuplicatesAndSubsets(waysToCut);
}

/**
 * Supprime les doublons et les sous-ensembles des patterns
 */
function removeDuplicatesAndSubsets(ways) {
    let results = [];
    
    for (const way of ways) {
        // Vérifier si ce pattern est un sous-ensemble d'un pattern existant
        const isSubsetOfExisting = results.some(existing => 
            isSubset(way, existing)
        );
        
        if (!isSubsetOfExisting) {
            // Supprimer les patterns existants qui sont des sous-ensembles du nouveau
            results = results.filter(existing => 
                !isSubset(existing, way)
            );
            
            results.push(way);
        }
    }
    
    return results;
}

/**
 * Vérifie si 'a' est un sous-ensemble de 'b'
 */
function isSubset(a, b) {
    if (a.length > b.length) return false;
    
    const aCopy = [...a];
    for (const item of b) {
        const index = aCopy.indexOf(item);
        if (index !== -1) {
            aCopy.splice(index, 1);
            if (aCopy.length === 0) return true;
        }
    }
    return aCopy.length === 0;
}

/**
 * CORRECTION: Résout le modèle ILP avec contraintes exactes obligatoires
 */
function solveAdvancedILPModel(cuttingPatterns, requiredCuts) {
    console.log(`    🧮 Construction du modèle ILP:`);
    
    // CORRECTION: Créer les contraintes avec égalité exacte au lieu de minimum
    const constraints = {};
    requiredCuts.forEach(({ size, count }) => {
        constraints[`cut${size}`] = { equal: count }; // CORRECTION: equal au lieu de min
        console.log(`      📐 Contrainte: exactement ${count} pièces de ${size}cm`);
    });

    const model = {
        optimize: "cost",
        opType: "min",
        variables: cuttingPatterns.variables,
        ints: cuttingPatterns.ints,
        constraints: constraints
    };

    console.log(`    📊 Modèle final: ${Object.keys(model.variables).length} variables, ${Object.keys(model.constraints).length} contraintes`);

    // Résolution avec gestion d'erreur
    try {
        const startTime = Date.now();
        console.log(`    ⏳ Résolution en cours...`);
        
        const solution = solver.Solve(model);
        const elapsedTime = Date.now() - startTime;
        
        console.log(`    ⏱️ Résolution terminée en ${elapsedTime}ms`);
        
        // CORRECTION: La structure de retour du solver est différente
        if (!solution.feasible) {
            console.warn("    ⚠️ Aucune solution faisable trouvée");
            return null;
        }
        
        if (typeof solution.result !== 'number' || isNaN(solution.result)) {
            throw new Error(`Solution invalide: ${solution.result}`);
        }
        
        console.log(`    ✅ Solution optimale trouvée: coût total ${solution.result}`);
        
        // CORRECTION: Vérifier que toutes les contraintes sont satisfaites
        console.log(`    🔍 Vérification des contraintes:`);
        for (const { size, count } of requiredCuts) {
            let totalProduced = 0;
            for (const [varName, quantity] of Object.entries(solution)) {
                if (varName.startsWith('stock') && quantity > 0) {
                    const pattern = cuttingPatterns.patterns.find(p => p.varName === varName);
                    if (pattern && pattern.cuts[`cut${size}`]) {
                        totalProduced += pattern.cuts[`cut${size}`] * quantity;
                    }
                }
            }
            console.log(`      ✓ ${size}cm: ${totalProduced}/${count} pièces (${totalProduced >= count ? 'OK' : 'MANQUE'})`);
            
            if (totalProduced < count) {
                console.warn(`    ⚠️ Solution incomplète pour ${size}cm`);
                throw new Error(`Solution incomplète: ${totalProduced}/${count} pièces de ${size}cm`);
            }
        }
        
        // Afficher les patterns choisis
        console.log(`    📋 Patterns sélectionnés:`);
        let totalBars = 0;
        for (const [varName, quantity] of Object.entries(solution)) {
            if (varName.startsWith('stock') && quantity > 0) {
                const pattern = cuttingPatterns.patterns.find(p => p.varName === varName);
                if (pattern) {
                    const cuts = [];
                    for (const [cutKey, cutCount] of Object.entries(pattern.cuts)) {
                        if (cutKey.startsWith('cut') && cutCount > 0) {
                            const cutSize = parseInt(cutKey.replace('cut', ''));
                            for (let i = 0; i < cutCount; i++) {
                                cuts.push(cutSize);
                            }
                        }
                    }
                    const usedLength = cuts.reduce((sum, cut) => sum + cut, 0);
                    const waste = pattern.stockSize - usedLength;
                    const efficiency = (usedLength / pattern.stockSize * 100).toFixed(1);
                    
                    console.log(`      • ${quantity}× barre ${pattern.stockSize}cm: [${cuts.join(', ')}] (${efficiency}% efficacité, ${waste}cm chute)`);
                    totalBars += quantity;
                }
            }
        }
        console.log(`    📦 Total: ${totalBars} barres utilisées`);
        
        // CORRECTION: Retourner l'objet solution directement, pas un wrapper
        return { 
            solution: solution,  // solution contient déjà feasible, result, etc.
            model, 
            patterns: cuttingPatterns 
        };
        
    } catch (error) {
        console.error("    ❌ Erreur lors de la résolution ILP:", error);
        throw error;
    }
}

/**
 * Convertit la solution ILP au format attendu par l'application
 */
function convertAdvancedILPSolutionToResult(ilpSolution, cuttingPatterns, stockSizes, model) {
    const { solution } = ilpSolution;
    const usedBars = [];
    let barId = 1;
    let totalWaste = 0;

    console.log(`    🔄 Conversion de la solution ILP pour ${model}:`);

    // Parcourir les variables de la solution
    for (const [varName, quantity] of Object.entries(solution)) {
        if (varName.startsWith('stock') && quantity > 0) {
            // Trouver le pattern correspondant
            const pattern = cuttingPatterns.patterns.find(p => p.varName === varName);
            
            if (pattern) {
                // Créer les barres utilisées
                for (let i = 0; i < quantity; i++) {
                    const cuts = [];
                    
                    // Reconstruire la liste des coupes à partir du pattern
                    for (const [cutKey, cutCount] of Object.entries(pattern.cuts)) {
                        if (cutKey.startsWith('cut') && cutCount > 0) {
                            const cutSize = parseInt(cutKey.replace('cut', ''));
                            for (let j = 0; j < cutCount; j++) {
                                cuts.push(cutSize);
                            }
                        }
                    }
                    
                    const usedLength = cuts.reduce((sum, cut) => sum + cut, 0);
                    const waste = pattern.stockSize - usedLength;
                    
                    usedBars.push({
                        id: barId++,
                        cuts: cuts,
                        pieces: cuts, // Alias pour compatibilité
                        waste: waste,
                        remainingLength: waste,
                        originalLength: pattern.stockSize,
                        model: model
                    });
                    
                    totalWaste += waste;
                }
            }
        }
    }

    // Calculer les pièces restantes (il ne devrait pas y avoir avec ILP optimal)
    const remainingPieces = [];

    // Créer les layouts groupés
    const layouts = createLayoutsFromBars(usedBars);
    
    // Calculer les statistiques
    const stats = calculateStats(usedBars, stockSizes);

    console.log(`    📊 Résultat final: ${usedBars.length} barres, ${totalWaste}cm de chutes, efficacité ${stats.utilizationRate}%`);

    return {
        rawData: {
            usedBars,
            wasteLength: totalWaste,
            totalMotherBarsUsed: usedBars.length,
            remainingPieces,
            motherBarLength: stockSizes[0]?.size || 0
        },
        layouts,
        stats,
        method: 'ILP_Advanced'
    };
}

/**
 * Algorithme de fallback en cas d'échec ILP
 */
function fallbackToGreedyAlgorithm(stockBars, demandPieces, model) {
    console.log("    🔄 Utilisation de l'algorithme glouton comme fallback");
    
    const usedBars = [];
    const remainingPieces = [...demandPieces];
    let barId = 1;
    let totalWaste = 0;
    
    // Trier les pièces par taille décroissante
    remainingPieces.sort((a, b) => parseInt(b.length) - parseInt(a.length));
    
    while (remainingPieces.length > 0) {
        // Prendre la première barre disponible
        const availableBar = stockBars.find(bar => parseInt(bar.quantity) > 0);
        if (!availableBar) break;
        
        const barLength = parseInt(availableBar.length);
        const cuts = [];
        let remainingLength = barLength;
        
        // Remplir la barre avec les pièces les plus grandes possibles
        for (let i = remainingPieces.length - 1; i >= 0; i--) {
            const piece = remainingPieces[i];
            const pieceLength = parseInt(piece.length);
            
            if (pieceLength <= remainingLength) {
                cuts.push(pieceLength);
                remainingLength -= pieceLength;
                
                // Décrémenter la quantité
                piece.quantity = parseInt(piece.quantity) - 1;
                if (piece.quantity <= 0) {
                    remainingPieces.splice(i, 1);
                }
                break;
            }
        }
        
        // Si aucune pièce ne rentre, utiliser la plus petite
        if (cuts.length === 0 && remainingPieces.length > 0) {
            const smallestPiece = remainingPieces[remainingPieces.length - 1];
            const pieceLength = parseInt(smallestPiece.length);
            
            cuts.push(pieceLength);
            remainingLength -= pieceLength;
            
            smallestPiece.quantity = parseInt(smallestPiece.quantity) - 1;
            if (smallestPiece.quantity <= 0) {
                remainingPieces.pop();
            }
        }
        
        usedBars.push({
            id: barId++,
            cuts: cuts,
            pieces: cuts,
            waste: remainingLength,
            remainingLength: remainingLength,
            originalLength: barLength,
            model: model
        });
        
        totalWaste += remainingLength;
        availableBar.quantity = parseInt(availableBar.quantity) - 1;
    }
    
    const layouts = createLayoutsFromBars(usedBars);
    const stats = calculateStats(usedBars, stockBars.map(bar => ({ size: parseInt(bar.length) })));
    
    return {
        rawData: {
            usedBars,
            wasteLength: totalWaste,
            totalMotherBarsUsed: usedBars.length,
            remainingPieces: remainingPieces.filter(piece => parseInt(piece.quantity) > 0),
            motherBarLength: stockBars[0]?.length || 0
        },
        layouts,
        stats: { ...stats, method: 'Greedy_Fallback' },
        method: 'Greedy_Fallback'
    };
}

/**
 * Crée les layouts groupés à partir des barres utilisées
 */
function createLayoutsFromBars(usedBars) {
    const layoutMap = new Map();
    
    for (const bar of usedBars) {
        const sortedCuts = [...bar.cuts].sort((a, b) => b - a);
        const key = sortedCuts.join(',') + '_' + bar.waste;
        
        if (layoutMap.has(key)) {
            layoutMap.get(key).count++;
        } else {
            layoutMap.set(key, {
                count: 1,
                pieces: sortedCuts,
                cuts: sortedCuts,
                waste: bar.waste,
                remainingLength: bar.remainingLength,
                originalLength: bar.originalLength,
                efficiency: ((bar.originalLength - bar.waste) / bar.originalLength * 100).toFixed(1)
            });
        }
    }
    
    return Array.from(layoutMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Calcule les statistiques du modèle
 */
function calculateStats(usedBars, stockSizes) {
    let totalUsedLength = 0;
    let totalBarsLength = 0;
    
    for (const bar of usedBars) {
        // Calculer la longueur totale utilisée (somme des pièces découpées)
        const piecesLength = bar.cuts.reduce((sum, cut) => sum + cut, 0);
        totalUsedLength += piecesLength;
        
        // Calculer la longueur totale des barres (longueur originale)
        totalBarsLength += bar.originalLength;
    }
    
    return {
        totalUsedLength,
        totalBarsLength,
        utilizationRate: totalBarsLength > 0 ? ((totalUsedLength / totalBarsLength) * 100).toFixed(3) : 0,
        averageWastePerBar: usedBars.length > 0 ? (usedBars.reduce((sum, bar) => sum + bar.waste, 0) / usedBars.length).toFixed(1) : 0
    };
}

/**
 * Calcule les statistiques globales
 */
function calculateGlobalStatistics(results) {
    let totalUsedLength = 0;
    let totalBarsLength = 0;
    
    for (const modelResult of Object.values(results)) {
        if (modelResult.stats) {
            totalUsedLength += modelResult.stats.totalUsedLength;
            totalBarsLength += modelResult.stats.totalBarsLength;
        }
    }
    
    return {
        totalUsedLength,
        totalBarsLength,
        utilizationRate: totalBarsLength > 0 ? ((totalUsedLength / totalBarsLength) * 100).toFixed(3) : 0
    };
}