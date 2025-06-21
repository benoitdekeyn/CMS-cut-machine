/**
 * Résout le problème de découpe de barres avec l'algorithme First-Fit Decreasing (FFD)
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

        // Initialiser les résultats pour ce modèle
        const modelResult = {
            rawData: {
                usedBars: [],  // Données brutes des barres utilisées
                wasteLength: 0,  // Chutes totales
                totalMotherBarsUsed: 0,  // Nombre total de barres mères utilisées
                remainingPieces: [],  // Pièces qu'on n'a pas pu découper
                motherBarLength: 0  // Longueur des barres mères
            },
            layouts: [],  // Schémas de coupe regroupés (sera rempli plus tard)
            availableStock: {
                totalBars: 0,
                bars: []
            }
        };

        // Copier les informations sur le stock disponible
        modelResult.availableStock.bars = motherBars[model].map(bar => ({
            model: model,
            length: bar.length,
            quantity: bar.quantity
        }));
        
        // Obtenir la longueur standard des barres mères pour ce modèle
        const motherBarLength = motherBars[model][0].length;
        modelResult.rawData.motherBarLength = motherBarLength;
        
        // Calculer le nombre total de barres disponibles
        let availableBars = 0;
        motherBars[model].forEach(bar => {
            availableBars += bar.quantity;
            modelResult.availableStock.totalBars += bar.quantity;
        });

        // Créer un tableau de toutes les pièces pour ce modèle
        const allPieces = [];
        pieces[model].forEach(piece => {
            for (let i = 0; i < piece.quantity; i++) {
                allPieces.push(piece.length);
            }
        });

        // Trier les pièces par ordre décroissant
        allPieces.sort((a, b) => b - a);

        // Tableau des barres utilisées
        const usedBars = [];
        let currentBarIndex = -1;

        // First-Fit Decreasing
        for (const pieceLength of allPieces) {
            // Vérifier si la pièce peut être placée dans une barre existante
            let placed = false;

            for (let i = 0; i <= currentBarIndex; i++) {
                if (usedBars[i].remainingLength >= pieceLength) {
                    // Placer dans cette barre
                    usedBars[i].cuts.push(pieceLength);
                    usedBars[i].remainingLength -= pieceLength;
                    placed = true;
                    break;
                }
            }

            // Si pas placée et des barres mères sont encore disponibles, ouvrir une nouvelle
            if (!placed) {
                if (availableBars > 0) {
                    currentBarIndex++;
                    availableBars--;
                    usedBars.push({
                        barId: currentBarIndex + 1,
                        cuts: [pieceLength],
                        remainingLength: motherBarLength - pieceLength,
                        originalLength: motherBarLength,
                        model: model // Ajouter le modèle à la barre
                    });
                } else {
                    // Plus de barres mères disponibles
                    modelResult.rawData.remainingPieces.push(pieceLength);
                }
            }
        }

        // Calculer les statistiques
        let totalWaste = 0;
        usedBars.forEach(bar => {
            totalWaste += bar.remainingLength;
        });

        modelResult.rawData.usedBars = usedBars;
        modelResult.rawData.wasteLength = totalWaste;
        modelResult.rawData.totalMotherBarsUsed = usedBars.length;
        
        // Calculer les statistiques détaillées pour ce modèle
        modelResult.stats = calculateModelStats(modelResult, motherBars[model], pieces[model]);
        
        // Mettre à jour les statistiques globales
        globalStats.totalBarsUsed += usedBars.length;
        globalStats.totalWaste += totalWaste;
        globalStats.totalRemainingPieces += modelResult.rawData.remainingPieces.length;

        // Regrouper les barres par layout identique
        const layoutPatterns = {};
        
        usedBars.forEach(bar => {
            // Créer une clé unique pour ce layout basée sur les coupes et la longueur restante
            // Trier les coupes pour s'assurer que l'ordre n'affecte pas le regroupement
            const sortedCuts = [...bar.cuts].sort((a, b) => b - a);
            const layoutKey = sortedCuts.join(',') + '_' + bar.remainingLength;
            
            if (!layoutPatterns[layoutKey]) {
                layoutPatterns[layoutKey] = {
                    pattern: bar,
                    count: 1,
                    // Ajouter des propriétés compatibles avec l'affichage
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

        // Convertir l'objet en tableau pour faciliter le tri
        const layoutsArray = Object.values(layoutPatterns);
        
        // Trier les layouts par ordre décroissant de fréquence
        layoutsArray.sort((a, b) => b.count - a.count);
        
        // Stocker les layouts pour ce modèle
        modelResult.layouts = layoutsArray;
        
        // Afficher uniquement une ligne de statistique importante pour ce modèle
        console.log(`📊 Modèle ${model}: ${usedBars.length} barres utilisées, taux d'utilisation: ${modelResult.stats.utilizationRate}%`);
        
        // Ajouter les résultats pour ce modèle
        results[model] = modelResult;
    }

    // Calculer les statistiques globales pour tous les modèles
    let totalStockLength = 0;
    let totalDemandLength = 0;
    let totalUsedLength = 0;
    let totalWasteLength = 0;
    
    for (const model in results) {
        const modelStats = results[model].stats;
        if (modelStats) {
            totalStockLength += modelStats.totalStockLength || 0;
            totalDemandLength += modelStats.totalDemandLength || 0;
            totalUsedLength += modelStats.totalUsedLength || 0;
            totalWasteLength += modelStats.totalWasteLength || 0;
        }
    }
    
    // Ajouter les statistiques globales
    globalStats.statistics = {
        totalStockLength,
        totalDemandLength,
        totalUsedLength,
        totalWasteLength,
        utilizationRate: totalStockLength > 0 ? (((totalStockLength - totalWasteLength) / totalStockLength) * 100).toFixed(3) : 0
    };
    
    // Afficher uniquement une ligne de statistique importante globale
    console.log(`📈 GLOBAL: ${globalStats.totalBarsUsed} barres utilisées, taux d'utilisation: ${globalStats.statistics.utilizationRate}%`);

    // Retourner un objet complet avec les résultats et les statistiques globales
    return {
        modelResults: results,
        globalStats: globalStats
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
    }

    return {
        totalDemandLength,
        totalStockLength,
        totalUsedLength,
        totalWasteLength,
        utilizationRate: totalStockLength > 0 ? (((totalStockLength - totalWasteLength) / totalStockLength) * 100).toFixed(3) : 0,
        overproductionDetails: hasOverproduction ? overproductionDetails.join(', ') : null,
        underproductionDetails: hasUnderproduction ? underproductionDetails.join(', ') : null,
        hasOverproduction,
        hasUnderproduction,
        totalOverproduced,
        totalUnderproduced
    };
}