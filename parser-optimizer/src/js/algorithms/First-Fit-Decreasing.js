/**
 * Algorithme First-Fit Decreasing pur
 * Prend des barres mères et des pièces, retourne les schémas de coupe
 */
export function solveGreedyFFD(motherBars, pieces) {
    console.log('🔧 Exécution FFD pur');
    
    // Créer la liste de toutes les pièces individuelles
    const allPieces = [];
    pieces.forEach(piece => {
        for (let i = 0; i < piece.quantity; i++) {
            allPieces.push(piece.length);
        }
    });

    // Trier par ordre décroissant
    allPieces.sort((a, b) => b - a);

    // Créer le pool de barres disponibles
    const availableBars = [];
    motherBars.forEach(barType => {
        for (let i = 0; i < barType.quantity; i++) {
            availableBars.push({
                length: barType.length,
                originalLength: barType.length,
                remainingLength: barType.length,
                cuts: [],
                barId: `${barType.length}_${i}`
            });
        }
    });

    const usedBars = [];

    // First-Fit Decreasing
    for (const pieceLength of allPieces) {
        let placed = false;

        // 1. Essayer de placer dans une barre déjà utilisée
        for (const usedBar of usedBars) {
            if (usedBar.remainingLength >= pieceLength) {
                usedBar.cuts.push(pieceLength);
                usedBar.remainingLength -= pieceLength;
                placed = true;
                break;
            }
        }

        // 2. Si pas placée, prendre une nouvelle barre
        if (!placed) {
            // Trouver la plus petite barre qui peut contenir cette pièce
            let bestBar = null;
            let bestBarIndex = -1;
            
            for (let i = 0; i < availableBars.length; i++) {
                const bar = availableBars[i];
                if (bar.length >= pieceLength) {
                    if (!bestBar || bar.length < bestBar.length) {
                        bestBar = bar;
                        bestBarIndex = i;
                    }
                }
            }
            
            if (bestBar) {
                // Retirer cette barre du pool
                availableBars.splice(bestBarIndex, 1);
                
                // Placer la pièce
                bestBar.cuts.push(pieceLength);
                bestBar.remainingLength -= pieceLength;
                
                // Ajouter aux barres utilisées
                usedBars.push(bestBar);
                placed = true;
            }
        }

        if (!placed) {
            console.warn(`⚠️ Impossible de placer la pièce de ${pieceLength}cm`);
        }
    }

    console.log(`✅ FFD terminé: ${usedBars.length} barres utilisées`);
    
    // Retourner uniquement les schémas de coupe
    return {
        cuttingPatterns: usedBars.map(bar => ({
            motherBarLength: bar.originalLength,
            cuts: [...bar.cuts],
            waste: bar.remainingLength,
            count: 1
        }))
    };
}