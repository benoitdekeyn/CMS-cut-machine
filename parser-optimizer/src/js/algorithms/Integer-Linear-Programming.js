import solver from 'javascript-lp-solver'; // ou l'équivalent dans votre projet

/**
 * Adapte un pattern pour éviter la surproduction en n'incluant que les pièces nécessaires
 * @param {Object} pattern - Le pattern original à adapter
 * @param {Map} remainingDemand - Demande restante pour chaque longueur de pièce
 * @param {Number} iteration - Numéro de l'itération actuelle
 * @returns {Object} Pattern modifié évitant la surproduction
 */
function adaptPatternToPreventOverproduction(pattern, remainingDemand, iteration) {
    // Analyser les pièces du pattern original
    const pieceCounts = {};
    for (const pieceLength of pattern.pieces) {
        pieceCounts[pieceLength] = (pieceCounts[pieceLength] || 0) + 1;
    }
    
    // Créer un pattern modifié pour éviter la surproduction
    const modifiedPattern = {
        ...pattern,
        pieces: [],
        waste: pattern.waste,
        isModifiedPattern: true
    };
    let overproductionDetected = false;
    
    // Parcourir chaque type de pièce dans le pattern et n'inclure que ce qui est nécessaire
    const usedPiecesLog = [];
    for (const [pieceLength, count] of Object.entries(pieceCounts)) {
        const lengthInt = parseInt(pieceLength, 10);
        const currentDemand = remainingDemand.get(lengthInt) || 0;
        
        // Déterminer combien de pièces de cette longueur peuvent être utilisées
        const usableCount = Math.min(count, currentDemand);
        
        // Ajouter uniquement les pièces nécessaires au pattern modifié
        for (let i = 0; i < usableCount; i++) {
            modifiedPattern.pieces.push(lengthInt);
        }
        
        // Déduire de la demande restante
        if (usableCount > 0) {
            remainingDemand.set(lengthInt, currentDemand - usableCount);
            usedPiecesLog.push(`${usableCount}x${lengthInt}`);
        }
        
        // Signaler une surproduction potentielle
        if (count > currentDemand) {
            overproductionDetected = true;
            
            // Enregistrer les pièces qui ont été supprimées pour éviter la surproduction
            if (modifiedPattern.originInfo && modifiedPattern.originInfo.removedPieces) {
                for (let i = 0; i < count - usableCount; i++) {
                    modifiedPattern.originInfo.removedPieces.push(lengthInt);
                }
            }
            
            // Augmenter la chute pour les pièces non utilisées
            modifiedPattern.waste += (count - usableCount) * lengthInt;
        }
    }
    
    // Si le pattern modifié ne contient pas assez de pièces, il peut ne pas être économique de l'utiliser
    const originalUsage = pattern.pieces.reduce((sum, len) => sum + len, 0);
    const modifiedUsage = modifiedPattern.pieces.reduce((sum, len) => sum + len, 0);
    const usageRatio = modifiedUsage / (originalUsage || 1);
    
    // Transférer l'identifiant du pattern original vers le pattern modifié
    modifiedPattern.originalPatternIndex = pattern.originalPatternIndex || pattern.id || -1;
    
    // Ajout des métadonnées du pattern original pour le suivi
    modifiedPattern.originInfo = {
        originalPieces: [...pattern.pieces],
        removedPieces: overproductionDetected ? [] : null
    };
    
    // Rejeter le pattern si l'utilisation est trop faible (moins de 50%)
    if (usageRatio < 0.5 && modifiedPattern.pieces.length > 0) {
        modifiedPattern.hasUsablePieces = false;
        return modifiedPattern;
    }
    
    // Marquer si le pattern a été modifié
    modifiedPattern.isModified = overproductionDetected;
    modifiedPattern.hasUsablePieces = usedPiecesLog.length > 0;
    
    return modifiedPattern;
}

/**
 * Résout le problème de découpe de barres en utilisant la programmation linéaire en nombres entiers
 * avec le solveur jsLPSolver et des techniques avancées de recherche opérationnelle.
 * 
 * @param {Object} motherBars - Dictionnaire des barres mères disponibles par modèle
 * @param {Object} pieces - Dictionnaire des pièces à découper par modèle
 * @param {Function} progressCallback - Fonction de callback pour indiquer la progression
 * @returns {Object} Résultats de l'optimisation
 */
export function solveWithILP(motherBars, pieces, progressCallback = () => {}) {
    // Vérifier que le solveur est chargé
    if (typeof solver === 'undefined') {
        throw new Error("Le solveur jsLPSolver n'est pas défini. Assurez-vous qu'il est correctement importé.");
    }
    
    // Structure de résultat finale
    const results = {};
    const globalStats = {
        totalBarsUsed: 0,
        totalWaste: 0,
        totalRemainingPieces: 0
    };

    console.log("Début de l'exécution ILP optimisée");

    // Traiter chaque modèle séparément
    for (const model in pieces) {
        if (pieces[model].length === 0 || !motherBars[model] || motherBars[model].length === 0) {
            continue;
        }

        progressCallback({ step: `Traitement du modèle ${model}`, percentage: 10 });

        // Initialiser les résultats pour ce modèle
        const modelResult = {
            rawData: {
                usedBars: [],
                wasteLength: 0,
                totalMotherBarsUsed: 0,
                remainingPieces: [],
                motherBarLength: 0
            },
            layouts: []
        };

        try {
            console.log(`Optimisation du modèle ${model}`);
            
            // Préparer les données
            const stockBars = prepareStockBarsData(motherBars[model]);
            const demandPieces = preparePiecesData(pieces[model]);
            
            // Vérifier que les données sont valides
            if (demandPieces.length === 0) {
                console.log(`Modèle ${model} : aucune pièce à découper`);
                continue;
            }
            
            if (stockBars.length === 0) {
                console.log(`Modèle ${model} : aucune barre mère disponible`);
                continue;
            }
            
            progressCallback({ step: `Génération des patterns pour ${model}`, percentage: 30 });
            
            // Générer des patterns de découpe efficaces
            const initialPatterns = generatePatternsForBars(stockBars, demandPieces);
            console.log(`${initialPatterns.length} patterns générés pour le modèle ${model}`);
            
            // Résoudre le problème de découpe avec la méthode la plus appropriée
            progressCallback({ step: `Résolution ILP pour ${model}`, percentage: 70 });
            
            // Résoudre avec la méthode principale (ILP) ou fallback si nécessaire
            const optimizationResult = solveWithCuttingStockILP(stockBars, demandPieces, initialPatterns);
            
            // Traiter les résultats
            const processedResult = processOptimizationResult(optimizationResult, stockBars, demandPieces);
            
            // Mettre à jour les statistiques globales
            globalStats.totalBarsUsed += processedResult.rawData.totalMotherBarsUsed;
            globalStats.totalWaste += processedResult.rawData.wasteLength;
            globalStats.totalRemainingPieces += processedResult.rawData.remainingPieces.length;
            
            // Assigner les résultats pour ce modèle
            modelResult.rawData = processedResult.rawData;
            modelResult.layouts = processedResult.layouts;
            
            console.log(`Modèle ${model} traité : ${processedResult.rawData.totalMotherBarsUsed} barres utilisées`);
            
            // Vérifier si des pièces n'ont pas été découpées
            if (processedResult.rawData.remainingPieces.length > 0) {
                console.warn(`⚠️ ${processedResult.rawData.remainingPieces.length} pièces non découpées pour le modèle ${model}`);
            }
            
        } catch (error) {
            console.error(`Erreur lors du traitement du modèle ${model}:`, error);
            
            // Essayer de récupérer avec un algorithme glouton simple en cas d'erreur critique
            const stockBars = prepareStockBarsData(motherBars[model]);
            const demandPieces = preparePiecesData(pieces[model]);
            
            const fallbackResult = solveWithSimpleGreedy(stockBars, demandPieces);
            modelResult.rawData = fallbackResult.rawData;
            modelResult.layouts = fallbackResult.layouts;
            
            // Mettre à jour les statistiques globales
            globalStats.totalBarsUsed += fallbackResult.rawData.totalMotherBarsUsed;
            globalStats.totalWaste += fallbackResult.rawData.wasteLength;
            globalStats.totalRemainingPieces += fallbackResult.rawData.remainingPieces.length;
            
            console.warn(`⚠️ Utilisation de l'algorithme de secours pour le modèle ${model}`);
        }
        
        // Calculer et afficher les statistiques pour ce modèle
        const stockBars = prepareStockBarsData(motherBars[model]);
        const demandPieces = preparePiecesData(pieces[model]);
        const modelStats = calculateModelStats(modelResult, stockBars, demandPieces);
        
        // Afficher uniquement les informations essentielles
        console.log(`📊 Modèle ${model}: ${modelResult.rawData.totalMotherBarsUsed} barres utilisées, taux d'utilisation: ${modelStats.utilizationRate}%`);
        
        // Ajouter les résultats et statistiques pour ce modèle
        results[model] = {
            ...modelResult,
            stats: modelStats
        };
        
        progressCallback({ step: `Modèle ${model} terminé`, percentage: 100 });
    }

    // Calculer les statistiques globales
    const globalStatistics = {
        totalDemandLength: 0,
        totalStockLength: 0,
        totalUsedLength: 0,
        totalWasteLength: 0,
        totalBarsLength: 0  // Ajouter cette ligne
    };
    
    for (const model in results) {
        if (results[model].stats) {
            globalStatistics.totalDemandLength += results[model].stats.totalDemandLength;
            globalStatistics.totalStockLength += results[model].stats.totalStockLength;
            globalStatistics.totalUsedLength += results[model].stats.totalUsedLength;
            globalStatistics.totalWasteLength += results[model].stats.totalWasteLength;
            
            // Ajouter le calcul de la longueur totale des barres
            if (results[model].rawData && results[model].rawData.usedBars) {
                globalStatistics.totalBarsLength += results[model].rawData.usedBars.reduce(
                    (sum, bar) => sum + bar.originalLength, 0
                );
            }
        }
    }
    
    // Calculer le taux d'utilisation global basé sur le ratio correct
    globalStatistics.utilizationRate = globalStatistics.totalBarsLength > 0 
        ? ((globalStatistics.totalUsedLength / globalStatistics.totalBarsLength) * 100).toFixed(3) 
        : 0;
    
    // Afficher uniquement une ligne de statistique importante globale
    console.log(`📈 GLOBAL: ${globalStats.totalBarsUsed} barres utilisées, taux d'utilisation: ${globalStatistics.utilizationRate}%`);

    return {
        modelResults: results,
        globalStats: {...globalStats, statistics: globalStatistics}
    };
}

/**
 * Prépare les données des barres mères
 * @param {Array} motherBars - Liste des barres mères
 * @returns {Array} Données préparées
 */
function prepareStockBarsData(motherBars) {
    const stockBars = [];
    
    for (const bar of motherBars) {
        stockBars.push({
            length: parseInt(bar.length, 10),
            quantity: parseInt(bar.quantity, 10)
        });
    }
    
    // Tri par ordre décroissant de longueur
    stockBars.sort((a, b) => b.length - a.length);
    return stockBars;
}

/**
 * Prépare les données des pièces à découper
 * @param {Array} pieces - Liste des pièces
 * @returns {Array} Données préparées
 */
function preparePiecesData(pieces) {
    const demandPieces = [];
    
    for (const piece of pieces) {
        demandPieces.push({
            length: parseInt(piece.length, 10),
            quantity: parseInt(piece.quantity, 10)
        });
    }
    
    // Tri par ordre décroissant de longueur
    demandPieces.sort((a, b) => b.length - a.length);
    return demandPieces;
}

/**
 * Génère des patterns de découpe efficaces pour toutes les barres disponibles
 * @param {Array} stockBars - Barres mères disponibles
 * @param {Array} demandPieces - Pièces à découper
 * @returns {Array} Patterns de découpe
 */
function generatePatternsForBars(stockBars, demandPieces) {
    const allPatterns = [];
    
    // Limiter le nombre de patrons par barre pour éviter une explosion combinatoire
    const maxPatternsPerBar = 3000;
    const totalMaxPatterns = 10000;
    
    // Pour chaque longueur de barre mère
    for (const stockBar of stockBars) {
        const stockLength = stockBar.length;
        const patternsForThisLength = generatePatternsForSingleBar(demandPieces, stockLength, maxPatternsPerBar);
        
        // Ajouter la longueur de la barre mère à chaque pattern
        patternsForThisLength.forEach(pattern => {
            pattern.stockLength = stockLength;
            pattern.stockBarId = stockBar.id || null;
        });
        
        allPatterns.push(...patternsForThisLength);
        
        // Limiter le nombre total de patterns pour éviter les problèmes de mémoire
        if (allPatterns.length >= totalMaxPatterns) {
            console.warn(`⚠️ Nombre maximum de patterns atteint (${totalMaxPatterns}), certains patterns ignorés`);
            break;
        }
    }
    
    return allPatterns;
}

/**
 * Génère des patterns de découpe efficaces pour une seule barre
 * Amélioration: utilise une approche plus efficace avec un cache de patterns
 * @param {Array} pieces - Pièces à découper
 * @param {Number} stockLength - Longueur de la barre mère
 * @param {Number} maxPatterns - Nombre maximum de patterns à générer
 * @returns {Array} Patterns de découpe
 */
function generatePatternsForSingleBar(pieces, stockLength, maxPatterns = 3000) {
    // Éliminer les pièces trop longues
    const validPieces = pieces.filter(piece => piece.length <= stockLength);
    
    // Si aucune pièce valide, retourner un pattern vide
    if (validPieces.length === 0) {
        return [{
            pieces: [],
            waste: stockLength,
            composition: {}
        }];
    }
    
    // Générer les patterns avec l'algorithme de programmation dynamique
    const patterns = generatePatternsDP(validPieces, stockLength, maxPatterns);
    
    // Trier les patterns par efficacité (moins de déchets et plus de pièces)
    patterns.sort((a, b) => {
        // D'abord trier par déchets
        if (a.waste !== b.waste) {
            return a.waste - b.waste;
        }
        // Ensuite par nombre de pièces (préférer plus de pièces)
        return b.pieces.length - a.pieces.length;
    });
    
    return patterns.slice(0, maxPatterns);
}

/**
 * Génère des patterns de découpe avec programmation dynamique
 * Cette approche est beaucoup plus efficace que la recherche en profondeur
 * @param {Array} pieces - Pièces à découper
 * @param {Number} stockLength - Longueur de la barre mère
 * @param {Number} maxPatterns - Nombre maximum de patterns à générer
 * @returns {Array} Patterns de découpe
 */
function generatePatternsDP(pieces, stockLength, maxPatterns) {
    // Définir un cache pour les sous-problèmes
    const patternsCache = new Map();
    const patterns = [];
    const visited = new Set();
    
    // Fonction auxiliaire pour générer un pattern key
    function getPatternKey(composition) {
        return Object.entries(composition)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([len, count]) => `${len}:${count}`)
            .join(',');
    }
    
    // Phase 1: Générer tous les patterns possibles avec programmation dynamique
    function generateWithDP(remainingLength, pieceIndex, currentComposition = {}) {
        // Clé de cache pour ce sous-problème
        const cacheKey = `${remainingLength}:${pieceIndex}`;
        
        // Si déjà calculé, retourner le résultat
        if (patternsCache.has(cacheKey)) {
            return patternsCache.get(cacheKey);
        }
        
        // Si nous avons atteint la fin des pièces ou la longueur restante est trop petite
        if (pieceIndex >= pieces.length || remainingLength < pieces[pieces.length - 1].length) {
            const patternKey = getPatternKey(currentComposition);
            
            // Éviter les doublons
            if (!visited.has(patternKey) && patterns.length < maxPatterns) {
                // Convertir la composition en liste de pièces
                const patternPieces = [];
                for (const [pieceLength, count] of Object.entries(currentComposition)) {
                    for (let i = 0; i < count; i++) {
                        patternPieces.push(parseInt(pieceLength, 10));
                    }
                }
                
                patterns.push({
                    pieces: patternPieces,
                    waste: remainingLength,
                    composition: {...currentComposition}
                });
                
                visited.add(patternKey);
            }
            
            return []; // Retourner un tableau vide pour la récursion
        }
        
        // Données de la pièce actuelle
        const piece = pieces[pieceIndex];
        const maxCount = Math.min(
            Math.floor(remainingLength / piece.length),
            piece.quantity
        );
        
        const subResults = [];
        
        // Essayer différentes quantités de la pièce actuelle
        for (let count = maxCount; count >= 0; count--) {
            const newComposition = {...currentComposition};
            if (count > 0) {
                newComposition[piece.length] = (newComposition[piece.length] || 0) + count;
            }
            
            const newRemainingLength = remainingLength - (count * piece.length);
            
            // Récursivement résoudre pour la pièce suivante
            const nextResults = generateWithDP(
                newRemainingLength,
                pieceIndex + 1,
                newComposition
            );
            
            subResults.push(...nextResults);
            
            // Limiter le nombre de sous-résultats pour éviter une explosion combinatoire
            if (subResults.length > 100) break;
        }
        
        // Mettre en cache les résultats pour ce sous-problème
        patternsCache.set(cacheKey, subResults);
        
        return subResults;
    }
    
    // Lancer la génération de patterns
    generateWithDP(stockLength, 0);
    
    // Phase 2: Ajouter des patterns heuristiques qui pourraient être manqués
    addHeuristicPatterns(pieces, stockLength, patterns, maxPatterns);
    
    return patterns;
}

/**
 * Ajoute des patterns heuristiques basés sur des règles empiriques
 * @param {Array} pieces - Pièces à découper
 * @param {Number} stockLength - Longueur de la barre mère
 * @param {Array} patterns - Tableau de patterns existants à compléter
 * @param {Number} maxPatterns - Nombre maximum de patterns
 */
function addHeuristicPatterns(pieces, stockLength, patterns, maxPatterns) {
    // Si on a déjà atteint le maximum de patterns, ne rien faire
    if (patterns.length >= maxPatterns) return;
    
    // Heuristique 1: Essayer de combiner les pièces les plus grandes d'abord
    const sortedPieces = [...pieces].sort((a, b) => b.length - a.length);
    let remainingLength = stockLength;
    const composition = {};
    const patternPieces = [];
    
    for (const piece of sortedPieces) {
        const maxFit = Math.min(
            Math.floor(remainingLength / piece.length),
            piece.quantity
        );
        
        if (maxFit > 0) {
            composition[piece.length] = maxFit;
            for (let i = 0; i < maxFit; i++) {
                patternPieces.push(piece.length);
            }
            remainingLength -= maxFit * piece.length;
        }
    }
    
    if (patternPieces.length > 0) {
        patterns.push({
            pieces: patternPieces,
            waste: remainingLength,
            composition
        });
    }
    
    // Heuristique 2: Essayer de combiner des pièces de taille similaire
    // pour minimiser les petits déchets
    addHomogeneousPatterns(pieces, stockLength, patterns);
    
    // Heuristique 3: Patterns pour les pièces les plus demandées
    addHighDemandPatterns(pieces, stockLength, patterns);
}

/**
 * Ajoute des patterns avec des pièces de taille similaire
 */
function addHomogeneousPatterns(pieces, stockLength, patterns) {
    for (let i = 0; i < Math.min(pieces.length, 5); i++) {
        const piece = pieces[i];
        const maxFit = Math.min(
            Math.floor(stockLength / piece.length),
            piece.quantity
        );
        
        if (maxFit > 0) {
            const patternPieces = Array(maxFit).fill(piece.length);
            const waste = stockLength - (maxFit * piece.length);
            const composition = { [piece.length]: maxFit };
            
            patterns.push({
                pieces: patternPieces,
                waste,
                composition
            });
        }
    }
}

/**
 * Ajoute des patterns pour les pièces les plus demandées
 */
function addHighDemandPatterns(pieces, stockLength, patterns) {
    const highDemandPieces = [...pieces]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3);
    
    for (const piece of highDemandPieces) {
        const maxFit = Math.min(
            Math.floor(stockLength / piece.length),
            piece.quantity
        );
        
        if (maxFit > 0) {
            const patternPieces = Array(maxFit).fill(piece.length);
            const waste = stockLength - (maxFit * piece.length);
            const composition = { [piece.length]: maxFit };
            
            patterns.push({
                pieces: patternPieces,
                waste,
                composition
            });
        }
    }
}

/**
 * Résout le problème de découpe avec la programmation linéaire en nombres entiers
 * @param {Array} stockBars - Barres mères disponibles
 * @param {Array} demandPieces - Pièces à découper
 * @param {Array} patterns - Patterns de découpe
 * @returns {Object} Résultats de l'optimisation
 */
function solveWithCuttingStockILP(stockBars, demandPieces, patterns) {
    console.log(`Tentative de résolution ILP avec ${patterns.length} patterns`);
    
    // Générer des patterns sécurisés qui évitent la surproduction
    const { patterns: safePatterns, maxUsage } = generateSafePatterns(stockBars, demandPieces, patterns);
    
    if (safePatterns.length === 0) {
        console.warn("⚠️ Aucun pattern sécurisé n'a pu être généré, utilisation de l'algorithme de secours");
        return solveWithColumnGeneration(patterns, stockBars, demandPieces);
    }
    
    // Réduire le nombre de patterns si nécessaire pour garantir la stabilité
    const maxPatternsToUse = Math.min(800, safePatterns.length);
    
    // Sélectionner les patterns les plus efficaces
    const sortedPatterns = [...safePatterns]
        .sort((a, b) => a.waste - b.waste)
        .slice(0, maxPatternsToUse);
    
    console.log(`Utilisation des ${sortedPatterns.length} meilleurs patterns sécurisés`);
    
    // Créer un modèle ILP correctement structuré
    const model = createILPModel(sortedPatterns, stockBars, demandPieces, maxUsage);
    
    // Essayer de résoudre avec le solveur ILP
    try {
        const options = {
            timeout: 10000,  // Augmenter le timeout à 10 secondes
            strategy: 0,     // Stratégie de base pour la stabilité
            msg: true        // Activer les messages de debug
        };
        
        console.log("Lancement du solveur ILP...");
        const solution = solver.Solve(model, options);
        console.log("Solution ILP obtenue:", solution.feasible, "valeur:", solution.result);
        
        // Vérifier si la solution est valide et utilisable
        if (solution.feasible && !isNaN(solution.result) && solution.result > 0) {
            // Vérifier que des patterns ont été utilisés
            let patternsUsed = false;
            for (const key in solution) {
                if (key.startsWith('pattern_') && !isNaN(solution[key]) && solution[key] > 0) {
                    patternsUsed = true;
                    break;
                }
            }
            
            if (patternsUsed) {
                console.log("Solution ILP valide, utilisation de cette solution");
                return {
                    method: "ILP",
                    solution: solution,
                    patterns: sortedPatterns
                };
            } else {
                console.warn("⚠️ Solution ILP sans patterns utilisés, utilisation du fallback");
            }
        } else {
            console.warn("⚠️ Solution ILP non valide, utilisation du fallback");
        }
    } catch (error) {
        console.error("Erreur lors de la résolution ILP:", error);
    }
    
    console.log("Utilisation de l'algorithme de secours...");
    return solveWithColumnGeneration(sortedPatterns, stockBars, demandPieces);
}

/**
 * Crée un modèle ILP correctement structuré pour le solveur
 * @param {Array} patterns - Patterns de découpe
 * @param {Array} stockBars - Barres mères disponibles
 * @param {Array} demandPieces - Pièces à découper
 * @param {Map} patternMaxUsage - Limites d'utilisation pour chaque pattern
 * @returns {Object} Modèle ILP
 */
function createILPModel(patterns, stockBars, demandPieces, patternMaxUsage = null) {
    // Modèle pour minimiser le nombre de barres utilisées
    const model = {
        optimize: 'bars',
        opType: 'min',
        constraints: {},
        variables: {},
        ints: {}
    };
    
    // 1. CONTRAINTES DE DEMANDE: garantir que toutes les pièces sont découpées exactement selon la demande
    for (const piece of demandPieces) {
        model.constraints[`demand_${piece.length}`] = { equal: piece.quantity };
    }
    
    // 2. CONTRAINTES DE STOCK: garantir qu'on ne dépasse pas le stock disponible
    // Création d'une contrainte par longueur de barre stock
    const stockLengths = new Map();
    for (const bar of stockBars) {
        if (stockLengths.has(bar.length)) {
            stockLengths.set(bar.length, stockLengths.get(bar.length) + bar.quantity);
        } else {
            stockLengths.set(bar.length, bar.quantity);
        }
    }
    
    // Ajouter les contraintes de stock
    for (const [length, quantity] of stockLengths.entries()) {
        model.constraints[`stock_${length}`] = { max: quantity };
    }
    
    // 3. DÉFINIR LES VARIABLES (chaque variable = nombre de fois qu'un pattern est utilisé)
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const varName = `pattern_${i}`;
        
        // Chaque pattern contribue 1 à l'objectif (une barre utilisée)
        model.variables[varName] = { bars: 1 };
        
        // Chaque variable doit être un entier
        model.ints[varName] = 1;
        
        // Si une limite d'utilisation est spécifiée pour ce pattern, l'ajouter comme contrainte
        if (patternMaxUsage && pattern.maxUsage) {
            model.constraints[`max_usage_${i}`] = { max: pattern.maxUsage };
            model.variables[varName][`max_usage_${i}`] = 1;
        }
        
        // Compter les occurrences de chaque type de pièce dans ce pattern
        const pieceCounts = {};
        for (const pieceLength of pattern.pieces) {
            pieceCounts[pieceLength] = (pieceCounts[pieceLength] || 0) + 1;
        }
        
        // Ajouter la contribution aux contraintes de demande
        for (const [pieceLength, count] of Object.entries(pieceCounts)) {
            model.variables[varName][`demand_${pieceLength}`] = count;
        }
        
        // Ajouter la contribution aux contraintes de stock
        if (stockLengths.has(pattern.stockLength)) {
            model.variables[varName][`stock_${pattern.stockLength}`] = 1;
        }
    }
    
    console.log("Modèle ILP créé:");
    console.log("- Contraintes:", Object.keys(model.constraints).length);
    console.log("- Variables:", Object.keys(model.variables).length);
    
    return model;
}

/**
 * Génère des patterns sur mesure qui évitent strictement la surproduction
 * @param {Array} stockBars - Barres mères disponibles
 * @param {Array} demandPieces - Pièces à découper
 * @returns {Array} Patterns adaptés sans surproduction
 */
function generateSafePatterns(stockBars, demandPieces) {
    console.log("Génération de patterns sans risque de surproduction...");
    
    // Créer une copie des patterns standards
    const basicPatterns = generatePatternsForBars(stockBars, demandPieces);
    
    // Éliminer tout pattern qui pourrait causer une surproduction
    const safePatterns = [];
    
    // Créer un tableau pour suivre le nombre maximal de fois qu'un pattern peut être utilisé
    const patternMaxUsage = new Map();
    
    // Pour chaque pattern, calculer combien de fois il peut être utilisé sans surproduction
    for (const pattern of basicPatterns) {
        const pieceCounts = {};
        for (const pieceLength of pattern.pieces) {
            pieceCounts[pieceLength] = (pieceCounts[pieceLength] || 0) + 1;
        }
        
        // Vérifier que ce pattern pourrait être utilisé au moins une fois
        let minUsageCount = Infinity;
        let hasPieces = false;
        
        for (const [pieceLength, count] of Object.entries(pieceCounts)) {
            hasPieces = true;
            const lengthInt = parseInt(pieceLength, 10);
            
            // Trouver la pièce correspondante dans la demande
            const demandPiece = demandPieces.find(p => p.length === lengthInt);
            
            if (demandPiece) {
                // Calculer combien de fois ce pattern peut être utilisé
                const maxUsage = Math.floor(demandPiece.quantity / count);
                minUsageCount = Math.min(minUsageCount, maxUsage);
            } else {
                // Ce pattern utilise une pièce qui n'est pas demandée
                minUsageCount = 0;
                break;
            }
        }
        
        // Si ce pattern peut être utilisé, l'ajouter à la liste
        if (minUsageCount > 0 && hasPieces) {
            safePatterns.push(pattern);
            patternMaxUsage.set(pattern, minUsageCount);
        }
    }
    
    console.log(`${safePatterns.length} patterns sûrs générés (sur ${basicPatterns.length} patterns initiaux)`);
    
    return {
        patterns: safePatterns,
        maxUsage: patternMaxUsage
    };
}
function solveWithColumnGeneration(patterns, stockBars, demandPieces) {
    console.log("Exécution de la génération de colonnes...");
    
    // Solution finale à construire
    const solution = { feasible: true, result: 0 };
    const selectedPatterns = new Map();
    
    // Créer une copie des demandes qu'on va satisfaire progressivement
    const remainingDemand = new Map();
    console.log("\n📋 RÉSUMÉ DES PIÈCES À DÉCOUPER:");
    console.log("─────────────────────────────────────────────────────");
    for (const piece of demandPieces) {
        remainingDemand.set(piece.length, piece.quantity);
        console.log(`  • Pièce de longueur ${piece.length}: ${piece.quantity} unités demandées`);
    }
    console.log("─────────────────────────────────────────────────────\n");
    
    // Garder trace des barres disponibles
    const availableStock = new Map();
    for (const bar of stockBars) {
        if (availableStock.has(bar.length)) {
            availableStock.set(bar.length, availableStock.get(bar.length) + bar.quantity);
        } else {
            availableStock.set(bar.length, bar.quantity);
        }
    }
    
    // Garder trace du nombre maximum de fois que chaque pattern peut être utilisé
    const patternUsageLimits = new Map();
    const patternCurrentUsage = new Map();
    
    // Initialiser les limites d'utilisation des patterns en fonction des demandes
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        
        // Compter les pièces par longueur dans ce pattern
        const pieceCounts = {};
        for (const pieceLength of pattern.pieces) {
            pieceCounts[pieceLength] = (pieceCounts[pieceLength] || 0) + 1;
        }
        
        // Calculer le nombre maximum de fois que ce pattern peut être utilisé
        let maxUsage = Infinity;
        for (const [pieceLength, count] of Object.entries(pieceCounts)) {
            const lengthInt = parseInt(pieceLength, 10);
            const demand = remainingDemand.get(lengthInt) || 0;
            if (count > 0) {
                maxUsage = Math.min(maxUsage, Math.floor(demand / count));
            }
        }
        
        // Stocker cette limite
        patternUsageLimits.set(i, maxUsage);
        patternCurrentUsage.set(i, 0);
    }
    
    // Algorithme de column generation simplifié
    let iteration = 0;
    const maxIterations = 100;
    
    console.log("\n🔄 DÉMARRAGE DES ITÉRATIONS");
    console.log("─────────────────────────────────────────────────────");
    
    // Tant qu'il reste des pièces à découper et qu'on n'a pas atteint le max d'itérations
    while (Array.from(remainingDemand.values()).some(qty => qty > 0) && iteration < maxIterations) {
        iteration++;
        
        console.log(`\n📌 ITÉRATION ${iteration} :`);
        
        // État actuel de la demande
        let demandStatusLog = [];
        for (const [length, qty] of remainingDemand.entries()) {
            if (qty > 0) {
                demandStatusLog.push(`${qty}x${length}`);
            }
        }
        
        if (demandStatusLog.length === 0) {
            console.log("✅ Toutes les pièces ont été satisfaites!");
            break;
        }
        
        console.log(`  • Demande restante: ${demandStatusLog.join(', ')}`);
        
        // 1. PHASE DE PRICING: Trouver le meilleur pattern pour la demande restante
        let bestPattern = null;
        let bestScore = -Infinity;
        let bestPatternIndex = -1;
        
        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            
            // Vérifier si ce pattern a atteint sa limite d'utilisation
            const currentUsage = patternCurrentUsage.get(i) || 0;
            const maxUsage = patternUsageLimits.get(i) || 0;
            
            if (currentUsage >= maxUsage) {
                // Pattern déjà utilisé au maximum, ignorer
                continue;
            }
            
            // Calculer la valeur de ce pattern pour la demande restante
            let score = 0;
            let useful = false;
            
            // Compter les pièces de chaque type dans ce pattern
            const pieceCounts = {};
            for (const pieceLength of pattern.pieces) {
                pieceCounts[pieceLength] = (pieceCounts[pieceLength] || 0) + 1;
            }
            
            // Évaluer ce pattern
            for (const [pieceLength, count] of Object.entries(pieceCounts)) {
                const lengthInt = parseInt(pieceLength, 10);
                const demandLeft = remainingDemand.get(lengthInt) || 0;
                if (demandLeft > 0) {
                    useful = true;
                    // Récompense pour chaque pièce satisfaite (proportionnelle à sa taille)
                    // Ne compter que les pièces qui sont réellement nécessaires (pas plus que la demande)
                    const usableCount = Math.min(count, demandLeft);
                    score += usableCount * lengthInt;
                }
            }
            
            // Si le pattern contient des pièces qui ne sont plus nécessaires,
            // il devrait être fortement pénalisé ou ignoré complètement
            let isPatternViable = true; // Commencer par supposer que le pattern est viable
            
            // Pénaliser le gaspillage et les pièces superflues
            let overproduction = 0;
            let totalOverproduction = 0;
            let hasCriticalOverproduction = false;
            
            for (const [pieceLength, count] of Object.entries(pieceCounts)) {
                const lengthInt = parseInt(pieceLength, 10);
                const demandLeft = remainingDemand.get(lengthInt) || 0;
                
                if (count > demandLeft) {
                    // Comptabiliser la surproduction
                    const excessCount = count - demandLeft;
                    overproduction += 1; // Pénalité par type de pièce en surproduction
                    totalOverproduction += excessCount; // Nombre total de pièces en surproduction
                    
                    // Si la demande est à zéro mais qu'on produirait quand même, pénalité encore plus forte
                    if (demandLeft === 0) {
                        hasCriticalOverproduction = true;
                        // Marquer ce pattern comme non viable s'il produirait des pièces 
                        // dont on n'a plus besoin du tout
                        isPatternViable = false;
                    }
                }
            }
            
            // Ne considérer les patterns non viables que s'ils sont vraiment nécessaires
            if (!isPatternViable) {
                // Pénaliser très fortement, sauf s'il n'y a pas d'autre choix
                score = -1000;
            } else {
                // Pénalités progressives pour dissuader la surproduction
                const wastePenalty = pattern.waste * 2;
                const overproductionPenalty = overproduction * 15;
                const totalOverproductionPenalty = totalOverproduction * 10;
                const criticalPenalty = hasCriticalOverproduction ? 200 : 0;
                
                score -= (wastePenalty + overproductionPenalty + totalOverproductionPenalty + criticalPenalty);
            }
            
            // Actualiser si c'est le meilleur pattern jusqu'à présent
            if (useful && score > bestScore) {
                bestScore = score;
                bestPattern = pattern;
                bestPatternIndex = i;
            }
        }
        
        // Si aucun pattern utile n'a été trouvé, générer un nouveau pattern spécifique
        if (bestPattern === null) {
            // Essayer de générer un pattern sur mesure pour la demande restante
            bestPattern = generateCustomPattern(remainingDemand, stockBars);
            bestPatternIndex = patterns.length; // Un nouvel index virtuel
            
            if (bestPattern) {
                patterns.push(bestPattern);
                console.log(`Nouveau pattern généré à l'itération ${iteration}`);
            } else {
                console.warn(`⚠️ Impossible de satisfaire toute la demande à l'itération ${iteration}`);
                break;
            }
        }
        
        // 2. PHASE DE MASTER PROBLEM: Appliquer ce pattern
        if (bestPattern) {
            // Vérifier si nous avons suffisamment de barres mères de cette longueur
            const stockLength = bestPattern.stockLength;
            const availableCount = availableStock.get(stockLength) || 0;
            
            if (availableCount <= 0) {
                // Plus de barres mères de cette longueur disponibles, essayer un autre pattern
                console.log(`⚠️ Plus de barres mères de longueur ${stockLength} disponibles`);
                patterns.splice(bestPatternIndex, 1); // Retirer ce pattern de la liste
                continue;
            }
            
            // Adapter le pattern pour éviter la surproduction
            const modifiedPattern = adaptPatternToPreventOverproduction(bestPattern, remainingDemand, iteration);
            
            // Ne pas utiliser le pattern s'il n'a plus de pièces utiles après adaptation
            if (!modifiedPattern.hasUsablePieces) {
                console.log(`  • Pattern ignoré car aucune pièce n'est nécessaire après adaptation`);
                continue;
            }
            
            // Décrémenter le stock disponible
            availableStock.set(stockLength, availableCount - 1);
            
            // Créer un nouvel index pour ce pattern modifié
            const modifiedPatternIndex = `modified_${bestPatternIndex}_${iteration}`;
            
            // Incrémenter le compteur de ce pattern modifié
            const varName = `pattern_${modifiedPatternIndex}`;
            solution[varName] = (solution[varName] || 0) + 1;
            
            // Mettre à jour l'utilisation de ce pattern
            patternCurrentUsage.set(bestPatternIndex, (patternCurrentUsage.get(bestPatternIndex) || 0) + 1);
            
            // Utiliser le pattern modifié au lieu du pattern d'origine
            bestPattern = modifiedPattern;
            
            // Garder trace des patterns modifiés
            // Important: Stocker le modifiedPattern avec le nouvel index pour le retrouver lors du traitement final
            patterns[modifiedPatternIndex] = modifiedPattern;
            
            // Garder trace des patterns sélectionnés
            if (selectedPatterns.has(modifiedPatternIndex)) {
                selectedPatterns.set(modifiedPatternIndex, selectedPatterns.get(modifiedPatternIndex) + 1);
            } else {
                selectedPatterns.set(modifiedPatternIndex, 1);
            }
            
            // Incrémenter le nombre total de barres utilisées
            solution.result++;
        }
    }
    
    // Vérifier s'il reste des pièces non satisfaites
    const remainingPieces = Array.from(remainingDemand.entries())
        .filter(([_, qty]) => qty > 0)
        .map(([len, qty]) => ({ length: len, quantity: qty }));
    
    if (remainingPieces.length > 0) {
        console.warn(`⚠️ ${remainingPieces.length} types de pièces non satisfaites après column generation`);
        
        // Dernière chance: utiliser un algorithme glouton direct pour les pièces restantes
        const additionalSolution = solveRemainingPiecesGreedy(remainingPieces, stockBars);
        
        // Fusionner les solutions
        for (const [key, value] of Object.entries(additionalSolution)) {
            if (key === 'result') {
                solution.result += value;
            } else if (key.startsWith('pattern_')) {
                solution[key] = (solution[key] || 0) + value;
            }
        }
    }
    
    console.log(`Column Generation terminée: ${solution.result} barres utilisées`);
    return {
        method: "ColumnGeneration",
        solution: solution,
        patterns: patterns
    };
}

/**
 * Génère un pattern sur mesure pour satisfaire une demande spécifique
 * Utile quand les patterns existants ne sont pas adaptés
 * @param {Map} demandMap - Mapping des demandes restantes
 * @param {Array} stockBars - Barres mères disponibles
 * @returns {Object} Pattern généré, ou null si impossible
 */
function generateCustomPattern(demandMap, stockBars) {
    // Trouver la barre mère la plus appropriée
    let bestBar = stockBars[0]; // Par défaut, prendre la première
    
    // Déterminer les pièces encore nécessaires, triées par taille décroissante
    const remainingPieces = [];
    for (const [length, quantity] of demandMap.entries()) {
        if (quantity > 0) {
            remainingPieces.push({
                length: parseInt(length, 10),
                quantity: quantity
            });
        }
    }
    
    // Si aucune pièce restante, retourner null
    if (remainingPieces.length === 0) return null;
    
    // Trier par ordre décroissant de longueur
    remainingPieces.sort((a, b) => b.length - a.length);
    
    // Essayer de générer un pattern pour chaque barre disponible
    let bestPattern = null;
    let bestScore = -Infinity;
    
    for (const bar of stockBars) {
        const stockLength = bar.length;
        
        // Algorithme du sac à dos pour maximiser l'utilisation de la barre
        const pattern = knapsackForPattern(remainingPieces, stockLength);
        
        // Évaluer ce pattern
        if (pattern && pattern.pieces.length > 0) {
            // Score = rapport entre la somme des longueurs et la longueur de la barre
            const utilizationRatio = (stockLength - pattern.waste) / stockLength;
            
            // Préférer les patterns qui utilisent bien la barre
            if (utilizationRatio > 0.5 && utilizationRatio > bestScore) {
                bestScore = utilizationRatio;
                bestPattern = pattern;
                bestPattern.stockLength = stockLength;
            }
        }
    }
    
    return bestPattern;
}

/**
 * Résout un problème de sac à dos pour générer un pattern optimisé
 * @param {Array} pieces - Pièces disponibles
 * @param {Number} capacity - Capacité (longueur de la barre)
 * @returns {Object} Pattern généré
 */
function knapsackForPattern(pieces, capacity) {
    // Algorithme du sac à dos modifié pour le problème de cutting stock
    const n = pieces.length;
    const dp = Array(capacity + 1).fill(0);
    const selected = Array(capacity + 1).fill().map(() => []);
    
    // Phase 1: Résoudre le problème du sac à dos
    for (let i = 0; i < n; i++) {
        const piece = pieces[i];
        
        for (let j = capacity; j >= piece.length; j--) {
            // Limiter le nombre de copies de chaque pièce à sa quantité
            for (let k = 1; k <= piece.quantity; k++) {
                if (j >= k * piece.length) {
                    const newValue = dp[j - k * piece.length] + k * piece.length;
                    
                    if (newValue > dp[j]) {
                        dp[j] = newValue;
                        selected[j] = [...selected[j - k * piece.length]];
                        
                        // Ajouter k copies de cette pièce
                        for (let l = 0; l < k; l++) {
                            selected[j].push(piece.length);
                        }
                    }
                }
            }
        }
    }
    
    // Phase 2: Reconstruire la solution
    const patternPieces = selected[capacity];
    const waste = capacity - dp[capacity];
    
    // Compter les occurrences de chaque pièce
    const composition = {};
    for (const pieceLength of patternPieces) {
        composition[pieceLength] = (composition[pieceLength] || 0) + 1;
    }
    
    return {
        pieces: patternPieces,
        waste: waste,
        composition: composition
    };
}

/**
 * Résout le problème pour les pièces restantes avec un algorithme glouton
 * @param {Array} remainingPieces - Pièces restantes
 * @param {Array} stockBars - Barres mères disponibles
 * @returns {Object} Solution pour les pièces restantes
 */
function solveRemainingPiecesGreedy(remainingPieces, stockBars) {
    console.log("Résolution des pièces restantes avec algorithme glouton");
    
    // Créer une copie du stock disponible
    const availableBarsByLength = new Map();
    for (const bar of stockBars) {
        if (availableBarsByLength.has(bar.length)) {
            availableBarsByLength.set(bar.length, availableBarsByLength.get(bar.length) + bar.quantity);
        } else {
            availableBarsByLength.set(bar.length, bar.quantity);
        }
    }
    
    // Vérifier si nous avons encore des barres disponibles
    const totalAvailableBars = Array.from(availableBarsByLength.values()).reduce((acc, val) => acc + val, 0);
    if (totalAvailableBars === 0) {
        console.warn("⚠️ Plus aucune barre mère disponible pour les pièces restantes");
        return { feasible: false, result: 0 };
    }
    
    // Trier les barres mères par longueur décroissante
    const sortedBars = Array.from(availableBarsByLength.entries())
        .sort((a, b) => b[0] - a[0]);
    
    // Obtenir la barre mère la plus adaptée pour chaque pièce
    const stockLength = sortedBars[0][0]; // Par défaut, prendre la plus grande
    
    // Préparer toutes les pièces restantes dans un tableau plat
    const allPieces = [];
    for (const piece of remainingPieces) {
        for (let i = 0; i < piece.quantity; i++) {
            allPieces.push(piece.length);
        }
    }
    
    // Trier les pièces par ordre décroissant
    allPieces.sort((a, b) => b - a);
    
    // First-Fit Decreasing
    const bars = [];
    const solution = { feasible: true, result: 0 };
    
    for (const pieceLength of allPieces) {
        let placed = false;
        
        // Essayer de placer dans une barre existante
        for (let i = 0; i < bars.length; i++) {
            if (bars[i].remainingSpace >= pieceLength) {
                bars[i].pieces.push(pieceLength);
                bars[i].remainingSpace -= pieceLength;
                placed = true;
                break;
            }
        }
        
        // Si non placée, créer une nouvelle barre
        if (!placed) {
            // Trouver la barre la plus petite qui peut contenir cette pièce
            let bestFitBarLength = null;
            
            for (const [barLength, quantity] of availableBarsByLength.entries()) {
                if (quantity > 0 && barLength >= pieceLength && 
                    (bestFitBarLength === null || barLength < bestFitBarLength)) {
                    bestFitBarLength = barLength;
                }
            }
            
            // Vérifier si nous avons trouvé une barre disponible
            if (bestFitBarLength === null) {
                console.warn(`⚠️ Plus de barres disponibles pour la pièce de longueur ${pieceLength}`);
                continue; // Passer à la pièce suivante
            }
            
            // Réduire la quantité disponible
            availableBarsByLength.set(bestFitBarLength, availableBarsByLength.get(bestFitBarLength) - 1);
            
            // Créer une nouvelle barre
            bars.push({
                pieces: [pieceLength],
                remainingSpace: bestFitBarLength - pieceLength,
                stockLength: bestFitBarLength
            });
            solution.result++;
        }
    }
    
    // Convertir en format pattern_X
    for (let i = 0; i < bars.length; i++) {
        const patternKey = `pattern_extra_${i}`;
        solution[patternKey] = 1;
    }
    
    return solution;
}

/**
 * Algorithme glouton simple (fallback de secours)
 * @param {Array} stockBars - Barres mères disponibles
 * @param {Array} demandPieces - Pièces à découper
 * @returns {Object} Résultats de l'algorithme glouton
 */
function solveWithSimpleGreedy(stockBars, demandPieces) {
    console.log("Utilisation de l'algorithme glouton simple");
    
    // Créer une carte des barres disponibles par longueur
    const availableBarsByLength = new Map();
    for (const bar of stockBars) {
        if (availableBarsByLength.has(bar.length)) {
            availableBarsByLength.set(bar.length, availableBarsByLength.get(bar.length) + bar.quantity);
        } else {
            availableBarsByLength.set(bar.length, bar.quantity);
        }
    }
    
    // Vérifier si nous avons des barres disponibles
    const totalAvailableBars = Array.from(availableBarsByLength.values()).reduce((acc, val) => acc + val, 0);
    if (totalAvailableBars === 0) {
        console.warn("⚠️ Aucune barre mère disponible");
        return {
            rawData: {
                usedBars: [],
                wasteLength: 0,
                totalMotherBarsUsed: 0,
                remainingPieces: demandPieces,
                motherBarLength: 0
            },
            layouts: []
        };
    }
    
    // Extraire les longueurs des barres mères disponibles
    const availableLengths = Array.from(availableBarsByLength.keys()).sort((a, b) => b - a);
    const motherBarLength = availableLengths[0]; // La plus grande
    
    // Créer un tableau plat de toutes les pièces
    const allPieces = [];
    for (const piece of demandPieces) {
        for (let i = 0; i < piece.quantity; i++) {
            allPieces.push(piece.length);
        }
    }
    
    // Trier les pièces par ordre décroissant
    allPieces.sort((a, b) => b - a);
    
    // First-Fit Decreasing
    const usedBars = [];
    let currentBarIndex = -1;
    
    for (const pieceLength of allPieces) {
        let placed = false;
        
        // Essayer de placer dans une barre existante
        for (let i = 0; i <= currentBarIndex; i++) {
            if (usedBars[i].remainingSpace >= pieceLength) {
                usedBars[i].pieces.push(pieceLength);
                usedBars[i].cuts.push(pieceLength); // Mise à jour pour compatibilité
                usedBars[i].remainingSpace -= pieceLength;
                usedBars[i].remainingLength -= pieceLength; // Mise à jour pour compatibilité
                placed = true;
                break;
            }
        }
        
        // Si non placée, créer une nouvelle barre
        if (!placed) {
            // Trouver la barre la plus petite qui peut contenir cette pièce
            let bestFitBarLength = null;
            
            for (const barLength of availableLengths) {
                if (availableBarsByLength.get(barLength) > 0 && barLength >= pieceLength &&
                   (bestFitBarLength === null || barLength < bestFitBarLength)) {
                    bestFitBarLength = barLength;
                }
            }
            
            // Si aucune barre disponible, considérer cette pièce comme non satisfaite
            if (bestFitBarLength === null) {
                console.warn(`⚠️ Plus de barres disponibles pour la pièce de longueur ${pieceLength}`);
                continue; // Passer à la pièce suivante sans la placer
            }
            
            // Réduire le stock de barres disponibles
            availableBarsByLength.set(bestFitBarLength, availableBarsByLength.get(bestFitBarLength) - 1);
            
            // Créer la nouvelle barre
            currentBarIndex++;
            usedBars[currentBarIndex] = {
                id: currentBarIndex + 1,
                pieces: [pieceLength],
                remainingSpace: bestFitBarLength - pieceLength,
                originalLength: bestFitBarLength,
                // Ajout pour compatibilité
                cuts: [pieceLength],
                remainingLength: bestFitBarLength - pieceLength
            };
        }
    }
    
    // Calculer le total des déchets
    let wasteLength = 0;
    for (const bar of usedBars) {
        wasteLength += bar.remainingSpace;
    }
    
    // Regrouper les barres par layout identique
    const layoutPatterns = {};
    
    for (const bar of usedBars) {
        // Créer une clé unique pour ce layout (arrangement de pièces)
        const layoutKey = bar.pieces.slice().sort((a, b) => b - a).join(',');            if (!layoutPatterns[layoutKey]) {
                layoutPatterns[layoutKey] = {
                    count: 1,
                    pieces: bar.pieces.slice().sort((a, b) => b - a),
                    waste: bar.remainingSpace,
                    totalLength: bar.originalLength - bar.remainingSpace,
                    // Ajout des propriétés pour la compatibilité
                    cuts: bar.pieces.slice().sort((a, b) => b - a),
                    remainingLength: bar.remainingSpace,
                    originalLength: bar.originalLength
                };
            } else {
                layoutPatterns[layoutKey].count++;
        }
    }
    
    // Convertir en tableau et trier
    const layoutsArray = Object.values(layoutPatterns);
    layoutsArray.sort((a, b) => b.count - a.count);
    
    return {
        rawData: {
            usedBars,
            wasteLength,
            totalMotherBarsUsed: usedBars.length,
            remainingPieces: [], // Toutes les pièces sont découpées
            motherBarLength
        },
        layouts: layoutsArray
    };
}

/**
 * Traite les résultats bruts de l'optimisation pour générer un résultat structuré
 * @param {Object} optimizationResult - Résultats bruts
 * @param {Array} stockBars - Barres mères disponibles
 * @param {Array} demandPieces - Pièces à découper
 * @returns {Object} Résultats structurés
 */
function processOptimizationResult(optimizationResult, stockBars, demandPieces) {
    const { method, solution, patterns } = optimizationResult;
    
    // Si pas de patterns, retourner une solution vide
    if (!patterns || patterns.length === 0) {
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
    
    console.log(`Traitement des résultats (méthode: ${method})`);
    
    // Structures pour la solution
    const usedBars = [];
    const placedPieces = new Map();
    let wasteLength = 0;
    let barId = 1;
    
    // Initialiser le compteur de pièces placées
    for (const piece of demandPieces) {
        placedPieces.set(piece.length, 0);
    }
    
    // Traiter les patterns utilisés dans la solution
    for (const [varName, countValue] of Object.entries(solution)) {
        // N'utiliser que les variables de type pattern_X avec une valeur positive
        if (varName.startsWith('pattern_') && !isNaN(countValue) && countValue > 0) {
            let patternIndex;
            
            // Extraire l'index du pattern
            if (varName.startsWith('pattern_extra_')) {
                // Patterns ajoutés par l'algorithme glouton
                continue; // On ne peut pas les tracer, ils seront gérés séparément
            } else if (varName.startsWith('pattern_modified_')) {
                // Pattern modifié - extraire l'ID complet
                patternIndex = varName.replace('pattern_', '');
            } else {
                patternIndex = parseInt(varName.replace('pattern_', ''), 10);
            }
            
            // Récupérer le pattern
            const pattern = patterns[patternIndex];
            if (!pattern) {
                console.warn(`⚠️ Pattern ${patternIndex} non trouvé dans la collection de patterns`);
                continue;
            }
            
            // Debug pour les patterns modifiés
            if (pattern.isModifiedPattern && pattern.originInfo) {
                console.log(`Application du pattern modifié ${patternIndex}:`);
                console.log(`  • Pièces d'origine: ${pattern.originInfo.originalPieces.join(', ')}`);
                console.log(`  • Pièces conservées: ${pattern.pieces.join(', ')}`);
                if (pattern.originInfo.removedPieces && pattern.originInfo.removedPieces.length > 0) {
                    console.log(`  • Pièces supprimées: ${pattern.originInfo.removedPieces.join(', ')}`);
                }
            }
            
            // Utiliser ce pattern le nombre de fois indiqué
            for (let i = 0; i < countValue; i++) {
                // Créer une nouvelle barre utilisée
                const bar = {
                    id: barId++,
                    pieces: [...pattern.pieces],
                    waste: pattern.waste || 0,
                    originalLength: pattern.stockLength || stockBars[0].length,
                    // Ajouter des propriétés pour la compatibilité avec l'affichage
                    cuts: [...pattern.pieces],
                    remainingLength: pattern.waste || 0
                };
                
                usedBars.push(bar);
                wasteLength += pattern.waste || 0;
                
                // Mettre à jour le compteur de pièces placées
                for (const pieceLength of pattern.pieces) {
                    placedPieces.set(pieceLength, (placedPieces.get(pieceLength) || 0) + 1);
                }
            }
        }
    }
    
    // Calculer les pièces restantes
    const remainingPieces = [];
    for (const piece of demandPieces) {
        const placed = placedPieces.get(piece.length) || 0;
        const remaining = piece.quantity - placed;
        
        if (remaining > 0) {
            remainingPieces.push({
                length: piece.length,
                quantity: remaining
            });
        }
    }
    
    // S'il reste des pièces et que nous sommes dans un cas avec algorithme glouton
    if (remainingPieces.length > 0 && (method === "ColumnGeneration" || solution.greedy)) {
        console.warn(`⚠️ Il reste ${remainingPieces.length} types de pièces non découpées`);
        
        // Essayer de découper les pièces restantes avec l'algorithme glouton
        const remainingResult = solveWithSimpleGreedy(stockBars, remainingPieces);
        
        // Fusionner les résultats
        usedBars.push(...remainingResult.rawData.usedBars);
        wasteLength += remainingResult.rawData.wasteLength;
        
        // Les pièces restantes sont maintenant toutes découpées
        remainingPieces.length = 0;
    }
    
    // Regrouper les barres par layout identique
    const layoutPatterns = {};
    
    for (const bar of usedBars) {
        // Créer une clé unique pour ce layout
        const layoutKey = bar.pieces.slice().sort((a, b) => b - a).join(',');
        
        if (!layoutPatterns[layoutKey]) {
            // Créer une structure compatible avec les autres algorithmes
            layoutPatterns[layoutKey] = {
                count: 1,
                pieces: bar.pieces.slice().sort((a, b) => b - a),
                waste: bar.waste || bar.remainingLength || 0,
                totalLength: bar.originalLength - (bar.waste || bar.remainingLength || 0),
                // Pour compatibilité avec la fonction d'affichage
                cuts: bar.pieces.slice().sort((a, b) => b - a),
                remainingLength: bar.waste || bar.remainingLength || 0,
                originalLength: bar.originalLength
            };
        } else {
            layoutPatterns[layoutKey].count++;
        }
    }
    
    // Convertir en tableau et trier
    const layoutsArray = Object.values(layoutPatterns);
    layoutsArray.sort((a, b) => b.count - a.count);
    
    return {
        rawData: {
            usedBars,
            wasteLength,
            totalMotherBarsUsed: usedBars.length,
            remainingPieces,
            motherBarLength: stockBars.length > 0 ? stockBars[0].length : 0
        },
        layouts: layoutsArray
    };
}

/**
 * Calcule les statistiques clés pour un modèle
 * @param {Object} modelResult - Résultats pour un modèle spécifique
 * @param {Array} stockBars - Barres mères disponibles
 * @param {Array} demandPieces - Pièces à découper
 * @returns {Object} Statistiques calculées
 */
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
    if (modelResult.layouts && modelResult.layouts.length > 0) {
        // Garder trace des pièces découpées par longueur
        const cutPiecesByLength = new Map();
        
        // Réinitialiser totalWasteLength pour un calcul précis
        totalWasteLength = 0;
        
        for (const layout of modelResult.layouts) {
            // Nombre de barres de ce layout
            const count = layout.count || 1;
            
            // Pour chaque barre de ce layout
            const pieces = layout.cuts || layout.pieces || [];
            
            // Compter les pièces par longueur
            for (const pieceLength of pieces) {
                const currentCount = cutPiecesByLength.get(pieceLength) || 0;
                cutPiecesByLength.set(pieceLength, currentCount + count);
            }
            
            const pieceSum = pieces.reduce((sum, piece) => sum + piece, 0);
            const wasteLength = layout.remainingLength || layout.waste || 0;
            
            // Multiplier par le nombre de fois que ce layout est utilisé
            totalUsedLength += pieceSum * count;
            totalWasteLength += wasteLength * count;
        }
        
        // Calculer la longueur totale des barres utilisées
        let totalBarsLength = 0;
        if (modelResult.rawData && modelResult.rawData.usedBars) {
            totalBarsLength = modelResult.rawData.usedBars.reduce((sum, bar) => sum + bar.originalLength, 0);
        }
        
        // Le taux d'utilisation correct est:
        const correctUtilizationRate = totalBarsLength > 0 ? ((totalUsedLength / totalBarsLength) * 100).toFixed(3) : 0;
        
        // Vérifier s'il y a une surproduction
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
        
        // Afficher des avertissements clairs pour les problèmes détectés
        if (hasOverproduction) {
            console.warn(`⚠️ SURPRODUCTION: ${totalOverproduced} pièces au total`);
        }
        
        if (hasUnderproduction) {
            console.warn(`⚠️ PRODUCTION INCOMPLÈTE: ${totalUnderproduced} pièces manquantes`);
        }
    }

    return {
        totalDemandLength,
        totalStockLength,
        totalUsedLength,
        totalWasteLength,
        // Correction du calcul du taux d'utilisation
        utilizationRate: totalUsedLength > 0 && modelResult.rawData && modelResult.rawData.usedBars && modelResult.rawData.usedBars.length > 0 
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
