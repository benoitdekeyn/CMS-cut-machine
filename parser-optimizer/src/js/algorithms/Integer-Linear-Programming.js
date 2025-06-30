import solver from 'javascript-lp-solver';

/**
 * Algorithme ILP pur - Interface simplifiée mais logique complète
 * Prend des barres mères et des pièces, retourne les schémas de coupe optimaux
 */
export function solveWithILP(motherBars, pieces) {
    console.log('🔧 Exécution ILP pur');
    
    // Convertir au format attendu par l'algorithme original
    const modelData = {
        pieces: { 'model': pieces },
        motherBars: { 'model': motherBars }
    };
    
    // Appeler l'algorithme original avec une fonction de progression vide
    const results = solveWithILPOriginal(modelData.motherBars, modelData.pieces, () => {});
    
    // Extraire les résultats du modèle unique
    const modelResult = results.modelResults['model'];
    if (!modelResult || !modelResult.layouts) {
        throw new Error("Aucun résultat ILP généré");
    }
    
    // Convertir au format de sortie attendu
    const cuttingPatterns = modelResult.layouts.map(layout => ({
        motherBarLength: layout.originalLength,
        cuts: [...layout.cuts],
        waste: layout.waste,
        count: layout.count
    }));
    
    console.log(`✅ ILP terminé: ${cuttingPatterns.length} patterns utilisés`);
    
    return {
        cuttingPatterns: cuttingPatterns
    };
}

/**
 * Algorithme ILP original complet (conservé tel quel)
 * Résout le problème de découpe de barres en utilisant l'ILP (Integer Linear Programming)
 * Basé sur le Column Generation approach du Cutting Stock Problem
 */
function solveWithILPOriginal(motherBars, pieces, progressCallback = () => {}) {
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

        const modelResult = solveModelWithAdvancedILP(motherBars[model], pieces[model], model, progressCallback);
        
        globalStats.totalBarsUsed += modelResult.rawData.totalMotherBarsUsed;
        globalStats.totalWaste += modelResult.rawData.wasteLength;
        globalStats.totalRemainingPieces += modelResult.rawData.remainingPieces.length;
        
        results[model] = modelResult;
        
        console.log(`✅ Modèle ${model}: ${modelResult.rawData.totalMotherBarsUsed} barres, efficacité ${modelResult.stats.utilizationRate}%`);
        
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
    
    // 1. Préparer les données
    const stockSizes = stockBars.map(bar => ({
        size: parseInt(bar.length),
        cost: 1,
        quantity: parseInt(bar.quantity)
    }));
    
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
        throw new Error("Stock insuffisant");
    }

    progressCallback({ step: `Génération des patterns pour ${model}`, percentage: 30 });

    // 2. Générer les patterns de découte
    const cuttingPatterns = generateAdvancedCuttingPatterns(stockSizes, cutSizes, 0);
    console.log(`    🔧 ${cuttingPatterns.totalPatterns} patterns générés au total`);

    progressCallback({ step: `Résolution ILP pour ${model}`, percentage: 70 });

    // 3. Résoudre le modèle ILP
    const ilpSolution = solveAdvancedILPModel(cuttingPatterns, requiredCuts);
    
    if (!ilpSolution || !ilpSolution.solution || !ilpSolution.solution.feasible) {
        throw new Error("Aucune solution ILP trouvée");
    }
    
    progressCallback({ step: `Finalisation pour ${model}`, percentage: 90 });

    // 4. Convertir la solution
    return convertILPSolutionToResult(ilpSolution, model);
}

/**
 * Convertit la solution ILP en format attendu
 */
function convertILPSolutionToResult(ilpSolution, model) {
    console.log(`    🔄 Conversion de la solution ILP pour ${model}:`);
    
    const { solution, patterns } = ilpSolution;
    const layouts = [];
    let totalWaste = 0;
    let totalUsedBars = 0;
    
    // Traiter chaque pattern sélectionné
    for (const [varName, quantity] of Object.entries(solution)) {
        if (varName.startsWith('stock') && quantity > 0) {
            const pattern = patterns.patterns.find(p => p.varName === varName);
            if (pattern) {
                // Extraire les coupes de ce pattern
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
                
                layouts.push({
                    originalLength: pattern.stockSize,
                    length: pattern.stockSize,
                    cuts: cuts,
                    count: quantity,
                    waste: waste
                });
                
                totalWaste += waste * quantity;
                totalUsedBars += quantity;
            }
        }
    }
    
    const totalBarLength = layouts.reduce((sum, layout) => sum + (layout.originalLength * layout.count), 0);
    const utilizationRate = totalBarLength > 0 ? ((totalBarLength - totalWaste) / totalBarLength * 100).toFixed(3) : 0;
    
    console.log(`    📊 Résultat final: ${totalUsedBars} barres, ${totalWaste}cm de chutes, efficacité ${utilizationRate}%`);
    
    return {
        layouts: layouts,
        rawData: {
            totalMotherBarsUsed: totalUsedBars,
            wasteLength: totalWaste,
            remainingPieces: []
        },
        stats: {
            utilizationRate: parseFloat(utilizationRate)
        }
    };
}

/**
 * Génère les patterns de découpe avancés OPTIMISÉS
 */
function generateAdvancedCuttingPatterns(stockSizes, cutSizes, bladeSize) {
    console.log(`    🔄 Génération optimisée des patterns...`);
    
    const waysOfCuttingStocks = stockSizes.map(({ size, cost, quantity }) => {
        console.log(`      📏 Analyse barre ${size}cm:`);
        
        // OPTIMISATION: Génération limitée et intelligente
        const waysOfCutting = generateOptimizedPatterns(size, cutSizes, bladeSize, 100); // Max 100 patterns
        
        console.log(`        ✓ ${waysOfCutting.length} patterns optimisés générés`);
        
        // Afficher les meilleurs patterns
        const sortedWays = waysOfCutting
            .map(way => ({
                cuts: way,
                efficiency: way.length > 0 ? (way.reduce((sum, cut) => sum + cut, 0) / size * 100).toFixed(1) : 0,
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
                .join(' + ') || 'Barre vide';
            console.log(`          ${index + 1}. ${cutStr} (${pattern.efficiency}% efficacité, ${pattern.waste}cm chute)`);
        });
        
        // Transformer en format ILP
        const versions = waysOfCutting.map(way => {
            const stockCut = {};
            for (const cut of cutSizes) {
                stockCut[`cut${cut}`] = 0;
            }
            for (const cut of way) {
                stockCut[`cut${cut}`] = stockCut[`cut${cut}`] + 1;
            }
            return stockCut;
        });

        return { size, cost, quantity, versions };
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
        totalPatterns: patternIndex
    };
}

/**
 * NOUVELLE FONCTION: Génération optimisée des patterns avec élagage intelligent
 */
function generateOptimizedPatterns(barSize, cuts, bladeSize, maxPatterns = 100) {
    console.log(`        🎯 Génération optimisée pour barre ${barSize}cm (max ${maxPatterns} patterns)`);
    
    const patterns = [];
    const seen = new Set();
    const startTime = Date.now();
    
    // Trier les coupes par efficacité décroissante
    const sortedCuts = [...cuts].sort((a, b) => b - a);
    
    // Génération avec élagage par efficacité et profondeur limitée
    function generateWithPruning(remaining, current, depth = 0) {
        // Limites de performance
        if (depth > 12 || patterns.length >= maxPatterns) return;
        
        // Élagage par efficacité minimum (30%)
        const currentEfficiency = current.length > 0 ? 
            current.reduce((sum, cut) => sum + cut, 0) / barSize : 0;
        if (currentEfficiency > 0 && currentEfficiency < 0.3) return;
        
        // Éviter les doublons
        const patternKey = [...current].sort((a, b) => a - b).join(',');
        if (seen.has(patternKey)) return;
        
        seen.add(patternKey);
        patterns.push([...current]);
        
        // Continuer la génération avec priorité aux grandes coupes
        for (const cut of sortedCuts) {
            if (remaining >= cut) {
                generateWithPruning(remaining - cut, [...current, cut], depth + 1);
            }
        }
    }
    
    // Démarrer la génération
    generateWithPruning(barSize, []);
    
    // Trier par efficacité et garder seulement les meilleurs
    const rankedPatterns = patterns
        .map(pattern => ({
            cuts: pattern,
            efficiency: pattern.reduce((sum, cut) => sum + cut, 0) / barSize,
            waste: barSize - pattern.reduce((sum, cut) => sum + cut, 0)
        }))
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, maxPatterns);
    
    const elapsedTime = Date.now() - startTime;
    console.log(`        ⚡ ${rankedPatterns.length} patterns générés en ${elapsedTime}ms`);
    
    return rankedPatterns.map(p => p.cuts);
}

/**
 * OPTIMISATION: Résolution ILP par étapes progressives
 */
function solveAdvancedILPModel(cuttingPatterns, requiredCuts) {
    console.log(`    🧮 Construction du modèle ILP optimisé:`);
    
    const constraints = {};
    requiredCuts.forEach(({ size, count }) => {
        constraints[`cut${size}`] = { equal: count };
        console.log(`      📐 Contrainte: exactement ${count} pièces de ${size}cm`);
    });

    console.log(`    📊 Modèle: ${Object.keys(cuttingPatterns.variables).length} variables, ${Object.keys(constraints).length} contraintes`);

    // OPTIMISATION: Résolution par étapes
    const startTime = Date.now();
    console.log(`    ⏳ Résolution progressive en cours...`);
    
    let solution = null;
    let attempt = 1;
    
    // Étape 1: Essai avec les patterns les plus efficaces seulement
    try {
        console.log(`    🎯 Tentative ${attempt}: patterns haute efficacité`);
        const quickModel = buildOptimizedModel(cuttingPatterns, constraints, 0.7); // 70% efficacité min
        solution = solver.Solve(quickModel);
        
        if (solution && solution.feasible) {
            console.log(`    ✅ Solution trouvée à la tentative ${attempt}`);
        } else {
            throw new Error("Pas de solution avec patterns haute efficacité");
        }
    } catch (error) {
        attempt++;
        
        // Étape 2: Essai avec efficacité moyenne
        try {
            console.log(`    🎯 Tentative ${attempt}: patterns efficacité moyenne`);
            const mediumModel = buildOptimizedModel(cuttingPatterns, constraints, 0.5); // 50% efficacité min
            solution = solver.Solve(mediumModel);
            
            if (solution && solution.feasible) {
                console.log(`    ✅ Solution trouvée à la tentative ${attempt}`);
            } else {
                throw new Error("Pas de solution avec patterns efficacité moyenne");
            }
        } catch (error2) {
            attempt++;
            
            // Étape 3: Dernier recours avec tous les patterns
            console.log(`    🎯 Tentative ${attempt}: tous les patterns`);
            const fullModel = {
                optimize: "cost",
                opType: "min",
                variables: cuttingPatterns.variables,
                ints: cuttingPatterns.ints,
                constraints: constraints
            };
            
            solution = solver.Solve(fullModel);
        }
    }
    
    const elapsedTime = Date.now() - startTime;
    console.log(`    ⏱️ Résolution terminée en ${elapsedTime}ms (${attempt} tentatives)`);
    
    if (!solution || !solution.feasible) {
        console.log(`    ⚠️ Aucune solution faisable trouvée après ${attempt} tentatives`);
        throw new Error("Aucune solution ILP trouvée");
    }
    
    console.log(`    ✅ Solution optimale trouvée: coût total ${solution.result}`);
    
    // Vérification des contraintes (code existant conservé)
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
            throw new Error(`Solution incomplète: ${totalProduced}/${count} pièces de ${size}cm`);
        }
    }
    
    // Affichage des patterns sélectionnés (code existant conservé)
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
    
    return { 
        solution: solution,
        patterns: cuttingPatterns 
    };
}

/**
 * NOUVELLE FONCTION: Construit un modèle ILP filtré par efficacité
 */
function buildOptimizedModel(cuttingPatterns, constraints, minEfficiency = 0.5) {
    const filteredVariables = {};
    const filteredInts = {};
    
    // Filtrer les variables par efficacité
    for (const [varName, varData] of Object.entries(cuttingPatterns.variables)) {
        const pattern = cuttingPatterns.patterns.find(p => p.varName === varName);
        if (pattern) {
            // Calculer l'efficacité du pattern
            let usedLength = 0;
            for (const [cutKey, cutCount] of Object.entries(pattern.cuts)) {
                if (cutKey.startsWith('cut') && cutCount > 0) {
                    const cutSize = parseInt(cutKey.replace('cut', ''));
                    usedLength += cutSize * cutCount;
                }
            }
            const efficiency = usedLength / pattern.stockSize;
            
            // Inclure seulement si l'efficacité est suffisante
            if (efficiency >= minEfficiency) {
                filteredVariables[varName] = varData;
                filteredInts[varName] = cuttingPatterns.ints[varName];
            }
        }
    }
    
    console.log(`      🔍 ${Object.keys(filteredVariables).length}/${Object.keys(cuttingPatterns.variables).length} variables conservées (efficacité ≥ ${(minEfficiency * 100).toFixed(0)}%)`);
    
    return {
        optimize: "cost",
        opType: "min",
        variables: filteredVariables,
        ints: filteredInts,
        constraints: constraints
    };
}

/**
 * Calcule les statistiques globales (algorithme original)
 */
function calculateGlobalStatistics(results) {
    let totalBarsUsed = 0;
    let totalWaste = 0;
    let totalBarLength = 0;
    
    for (const model in results) {
        const modelResult = results[model];
        totalBarsUsed += modelResult.rawData.totalMotherBarsUsed;
        totalWaste += modelResult.rawData.wasteLength;
        
        for (const layout of modelResult.layouts) {
            totalBarLength += layout.originalLength * layout.count;
        }
    }
    
    const utilizationRate = totalBarLength > 0 
        ? ((totalBarLength - totalWaste) / totalBarLength * 100).toFixed(3)
        : "100.000";
        
    return {
        utilizationRate: parseFloat(utilizationRate),
        totalBarsUsed,
        totalWaste,
        totalBarLength
    };
}