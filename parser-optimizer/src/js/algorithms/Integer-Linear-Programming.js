import solver from 'javascript-lp-solver';

/**
 * Résout le problème de découpe de barres en utilisant l'ILP (Integer Linear Programming)
 * Basé sur le Column Generation approach du Cutting Stock Problem
 */
export function solveWithILP(motherBars, pieces, progressCallback = () => {}) {
    console.log("🔧 Début de l'optimisation ILP");
    
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

        console.log(`🎯 Optimisation ILP pour le modèle ${model}`);
        progressCallback({ step: `Traitement du modèle ${model}`, percentage: 10 });

        try {
            const modelResult = solveModelWithILP(motherBars[model], pieces[model], model);
            
            globalStats.totalBarsUsed += modelResult.rawData.totalMotherBarsUsed;
            globalStats.totalWaste += modelResult.rawData.wasteLength;
            globalStats.totalRemainingPieces += modelResult.rawData.remainingPieces.length;
            
            results[model] = modelResult;
            
            console.log(`✅ Modèle ${model}: ${modelResult.rawData.totalMotherBarsUsed} barres, efficacité ${modelResult.stats.utilizationRate}%`);
            
        } catch (error) {
            console.error(`❌ Erreur ILP pour ${model}:`, error);
            throw error;
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
 * Résout un modèle spécifique avec ILP
 */
function solveModelWithILP(stockBars, demandPieces, model) {
    // 1. Préparer les données - CORRECTION: Grouper les pièces par longueur
    const stockSizes = stockBars.map(bar => ({
        size: parseInt(bar.length),
        cost: 1, // Coût uniforme - on minimise le nombre de barres
        quantity: parseInt(bar.quantity)
    }));
    
    // CORRECTION: Grouper les pièces par longueur au lieu de les traiter individuellement
    const pieceCounts = {};
    demandPieces.forEach(piece => {
        const length = parseInt(piece.length);
        const quantity = parseInt(piece.quantity);
        pieceCounts[length] = (pieceCounts[length] || 0) + quantity;
    });
    
    // Convertir en format requiredCuts
    const requiredCuts = Object.entries(pieceCounts).map(([length, count]) => ({
        size: parseInt(length),
        count: count
    }));

    console.log(`  📏 Pièces demandées: ${requiredCuts.map(c => `${c.count}×${c.size}cm`).join(', ')}`);
    console.log(`  📦 Stock: ${stockSizes.map(s => `${s.quantity}×${s.size}cm`).join(', ')}`);

    // 2. Générer tous les patterns de découte possibles
    const cuttingPatterns = generateAllCuttingPatterns(stockSizes, requiredCuts);
    
    console.log(`  🔧 ${cuttingPatterns.totalPatterns} patterns générés`);

    // 3. Construire et résoudre le modèle ILP
    const ilpSolution = solveILPModel(cuttingPatterns, requiredCuts);
    
    // 4. Convertir la solution ILP en format attendu
    return convertILPSolutionToResult(ilpSolution, cuttingPatterns, stockSizes, model);
}

/**
 * Génère tous les patterns de découpe possibles (inspiré du code TypeScript)
 */
function generateAllCuttingPatterns(stockSizes, requiredCuts) {
    const cutSizes = requiredCuts.map(cut => cut.size);
    const allPatterns = [];
    let patternIndex = 0;

    console.log(`  🔧 Génération de patterns pour: ${requiredCuts.map(c => `${c.count}×${c.size}cm`).join(', ')}`);

    const waysOfCuttingStocks = stockSizes.map(({ size, cost, quantity }) => {
        // Générer toutes les façons de découper cette longueur de barre
        const waysOfCutting = generateWaysToCut(size, cutSizes, 0); // bladeSize = 0 pour simplifier
        
        console.log(`    📏 Barre ${size}cm: ${waysOfCutting.length} patterns possibles`);
        
        // Transformer chaque façon en pattern avec compteurs
        const versions = waysOfCutting.map(way => {
            const stockCut = {};
            
            // Initialiser tous les compteurs à 0
            for (const cutSize of cutSizes) {
                stockCut[`cut${cutSize}`] = 0;
            }
            
            // Compter chaque pièce dans ce pattern
            for (const cut of way) {
                stockCut[`cut${cut}`] = stockCut[`cut${cut}`] + 1;
            }
            
            return stockCut;
        });

        // Debug des patterns générés
        versions.forEach((version, index) => {
            const pieces = Object.entries(version)
                .filter(([key, value]) => key.startsWith('cut') && value > 0)
                .map(([key, value]) => `${value}×${key.replace('cut', '')}cm`)
                .join(', ');
            if (pieces) {
                console.log(`      Pattern ${index}: ${pieces}`);
            }
        });

        return { size, cost, quantity, versions, waysOfCutting };
    });

    // Créer les variables pour le modèle ILP
    const variables = {};
    const ints = {};
    
    waysOfCuttingStocks.forEach(({ size, cost, quantity, versions }) => {
        versions.forEach((cut, index) => {
            const varName = `stock${size}version${index}`;
            
            // Variable avec coût et contraintes
            variables[varName] = { ...cut, cost: cost };
            
            // Variable entière
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
 * Génère toutes les façons de découper une barre (récursif) - Version limitée
 */
function generateWaysToCut(barSize, cuts, bladeSize, state = [], maxDepth = 3) {
    // LIMITATION : Arrêter si on dépasse la profondeur max ou si on a trop de patterns
    if (state.length >= maxDepth) {
        return [[...state]];
    }
    
    const waysToCut = [];
    
    // Essayer chaque type de coupe
    for (const cut of cuts) {
        const remainder = barSize - cut - bladeSize;
        if (remainder >= 0) {
            // Récursion pour découper le reste (avec profondeur limitée)
            const subWays = generateWaysToCut(remainder, cuts, bladeSize, [...state, cut], maxDepth);
            waysToCut.push(...subWays);
        }
    }
    
    // Toujours ajouter l'état actuel
    waysToCut.push([...state]);
    
    // LIMITATION : Ne garder que les meilleurs patterns (top 20)
    const uniquePatterns = removeDuplicatePatterns(waysToCut);
    const limitedPatterns = limitPatternsForPerformance(uniquePatterns, barSize);
    
    return limitedPatterns.filter((pattern, index) => 
        pattern.length > 0 || index === 0
    );
}

/**
 * NOUVEAU : Limite le nombre de patterns pour éviter l'explosion combinatoire
 */
function limitPatternsForPerformance(patterns, barSize) {
    // Scorer les patterns par efficacité
    const scoredPatterns = patterns.map(pattern => {
        const usedLength = pattern.reduce((sum, cut) => sum + cut, 0);
        const efficiency = usedLength / barSize;
        const pieceCount = pattern.length;
        
        return {
            pattern,
            score: efficiency * 0.7 + (pieceCount / 10) * 0.3 // Favoriser efficacité et nombre de pièces
        };
    });
    
    // Trier par score et garder seulement les 20 meilleurs
    const topPatterns = scoredPatterns
        .sort((a, b) => b.score - a.score)
        .slice(0, 20) // LIMITATION à 20 patterns max par barre
        .map(item => item.pattern);
    
    console.log(`    ⚡ Patterns limités: ${patterns.length} → ${topPatterns.length}`);
    
    return topPatterns;
}

/**
 * Élimine les patterns en double
 */
function removeDuplicatePatterns(patterns) {
    const uniquePatterns = [];
    const seenPatterns = new Set();
    
    for (const pattern of patterns) {
        // Créer une signature unique pour ce pattern
        const sorted = [...pattern].sort((a, b) => a - b);
        const signature = sorted.join(',');
        
        if (!seenPatterns.has(signature)) {
            seenPatterns.add(signature);
            uniquePatterns.push(pattern);
        }
    }
    
    return uniquePatterns;
}

/**
 * Construit et résout le modèle ILP - Version avec contraintes exactes
 */
function solveILPModel(cuttingPatterns, requiredCuts) {
    // Créer les contraintes (demande EXACTE pour chaque taille)
    const constraints = {};
    requiredCuts.forEach(({ size, count }) => {
        // Utiliser 'equal' au lieu de 'min' pour avoir exactement le nombre demandé
        constraints[`cut${size}`] = { equal: count };
    });

    console.log(`  📋 Contraintes de demande:`);
    requiredCuts.forEach(({ size, count }) => {
        console.log(`    - Exactement ${count} pièces de ${size}cm`);
    });

    // Modèle ILP complet
    const model = {
        optimize: "cost",
        opType: "min",
        variables: cuttingPatterns.variables,
        ints: cuttingPatterns.ints,
        constraints: constraints
    };

    console.log(`  📋 Modèle ILP: ${Object.keys(model.variables).length} variables, ${Object.keys(model.constraints).length} contraintes`);

    // Debug du modèle
    console.log(`  🔍 Variables de contrôle (premiers 5):`);
    let varCount = 0;
    for (const [varName, varData] of Object.entries(model.variables)) {
        if (varCount >= 5) break;
        const pieces = Object.entries(varData)
            .filter(([key, value]) => key.startsWith('cut') && value > 0)
            .map(([key, value]) => `${value}×${key.replace('cut', '')}cm`)
            .join(', ');
        console.log(`    ${varName}: ${pieces || 'vide'} (coût: ${varData.cost})`);
        varCount++;
    }

    // Résoudre le modèle
    try {
        const solution = solver.Solve(model);
        
        console.log(`  🔍 Solution: feasible=${solution.feasible}, result=${solution.result}`);
        
        if (!solution.feasible) {
            console.warn("  ⚠️ Contraintes exactes impossibles, tentative avec contraintes minimales...");
            return solveWithMinConstraints(cuttingPatterns, requiredCuts);
        }
        
        if (typeof solution.result !== 'number' || isNaN(solution.result)) {
            throw new Error(`Solution invalide: ${solution.result}`);
        }
        
        // Debug de la solution
        console.log(`  🔍 Variables utilisées dans la solution:`);
        for (const [varName, value] of Object.entries(solution)) {
            if (varName.startsWith('stock') && value > 0) {
                console.log(`    ${varName} = ${value}`);
            }
        }
        
        console.log(`  ✅ Solution optimale trouvée: coût ${solution.result}`);
        
        return { solution, model, patterns: cuttingPatterns };
        
    } catch (error) {
        console.error("❌ Erreur lors de la résolution ILP:", error);
        throw new Error(`Échec ILP: ${error.message}`);
    }
}

/**
 * Résout avec des contraintes minimales si les contraintes exactes échouent
 */
function solveWithMinConstraints(cuttingPatterns, requiredCuts) {
    const constraints = {};
    requiredCuts.forEach(({ size, count }) => {
        constraints[`cut${size}`] = { min: count };
    });

    const model = {
        optimize: "cost",
        opType: "min",
        variables: cuttingPatterns.variables,
        ints: cuttingPatterns.ints,
        constraints: constraints
    };

    console.log(`  🔧 Tentative avec contraintes minimales...`);
    
    const solution = solver.Solve(model);
    
    if (!solution.feasible) {
        throw new Error("Problème ILP non faisable même avec contraintes minimales");
    }
    
    console.log(`  ✅ Solution avec contraintes minimales trouvée: coût ${solution.result}`);
    
    return { solution, model, patterns: cuttingPatterns };
}

/**
 * Convertit la solution ILP au format attendu par l'application
 */
function convertILPSolutionToResult(ilpSolution, cuttingPatterns, stockSizes, model) {
    const { solution } = ilpSolution;
    const usedBars = [];
    let barId = 1;
    let totalWaste = 0;

    console.log("  🔄 Conversion de la solution ILP...");

    // Parcourir les variables de la solution
    for (const [varName, quantity] of Object.entries(solution)) {
        if (varName.startsWith('stock') && quantity > 0) {
            // Trouver le pattern correspondant
            const pattern = cuttingPatterns.patterns.find(p => p.varName === varName);
            
            if (pattern) {
                console.log(`    📦 ${varName}: ${quantity} barres`);
                
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

    // Calculer les pièces restantes (il ne devrait pas y en avoir avec ILP optimal)
    const remainingPieces = [];

    // Créer les layouts groupés
    const layouts = createLayoutsFromBars(usedBars);
    
    // Calculer les statistiques
    const stats = calculateStats(usedBars, stockSizes);

    console.log(`  📊 Résultat final: ${usedBars.length} barres, ${totalWaste}cm de chutes`);

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
        method: 'ILP_Optimized'
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
        totalUsedLength += bar.cuts.reduce((sum, piece) => sum + piece, 0);
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
        if (modelResult.rawData?.usedBars) {
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