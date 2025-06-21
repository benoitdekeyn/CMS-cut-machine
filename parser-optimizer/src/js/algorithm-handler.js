import { algorithms } from './index.js';

export const AlgorithmHandler = {
    // Show the algorithm selection UI
    showAlgorithmSelectionUI: function(actionButtonsSection, data, resultsSection) {
        // Créer la section si elle n'existe pas
        let algoSelectionSection = document.getElementById('algorithm-selection');
        if (!algoSelectionSection) {
            algoSelectionSection = document.createElement('section');
            algoSelectionSection.id = 'algorithm-selection';
            
            // Insérer après le bouton d'action
            actionButtonsSection.parentNode.insertBefore(algoSelectionSection, actionButtonsSection.nextSibling);
            
            // Déplacer la section de résultats pour qu'elle apparaisse après la section de sélection d'algorithmes
            if (resultsSection.parentNode) {
                // Si la section est déjà dans le DOM, la déplacer
                resultsSection.parentNode.removeChild(resultsSection);
            }
            algoSelectionSection.parentNode.insertBefore(resultsSection, algoSelectionSection.nextSibling);
        }
        
        algoSelectionSection.innerHTML = `
            <h2>Choisir un algorithme d'optimisation</h2>
            <p class="instruction">Sélectionnez l'algorithme à utiliser pour optimiser la découpe de vos barres.</p>
            
            <div class="algorithm-cards">
                <div class="algorithm-card">
                    <h3>First-Fit Decreasing (FFD)</h3>
                    <div class="algo-description">
                        <p><strong>Fonctionnement :</strong> Trie les barres à découper par ordre décroissant et place chaque barre dans la première barre mère où elle peut tenir.</p>
                        <p><strong>Performance :</strong> Rapide et efficace pour des cas simples. Garantit une solution au plus 11/9 OPT + 6/9.</p>
                        <p><strong>Idéal pour :</strong> Petits à moyens volumes, calcul rapide.</p>
                    </div>
                    <button class="algo-btn primary-btn" id="ffd-btn">Utiliser FFD</button>
                </div>
                
                <div class="algorithm-card">
                    <h3>Programmation Linéaire en Nombres Entiers (ILP)</h3>
                    <div class="algo-description">
                        <p><strong>Fonctionnement :</strong> Formule le problème comme un modèle mathématique d'optimisation et trouve la solution optimale globale.</p>
                        <p><strong>Performance :</strong> Garantit la solution optimale mais peut être lent sur de très grands problèmes. Excellente minimisation des déchets.</p>
                        <p><strong>Idéal pour :</strong> Problèmes à haute valeur où la minimisation des déchets est critique et le temps de calcul n'est pas une contrainte.</p>
                    </div>
                    <button class="algo-btn primary-btn" id="ilp-btn">Utiliser ILP</button>
                </div>
            </div>
        `;
        
        // Afficher la section
        algoSelectionSection.classList.remove('hidden');
        
        // Ajouter les gestionnaires d'événements
        this.initAlgorithmSelectionUI(data, resultsSection);
    },

    // Initialize the algorithm selection UI
    initAlgorithmSelectionUI: function(data, resultsSection) {
        // Récupérer les boutons d'algorithme
        const ffdBtn = document.getElementById('ffd-btn');
        const ilpBtn = document.getElementById('ilp-btn');
        
        // Ajouter les gestionnaires d'événements
        if (ffdBtn) {
            ffdBtn.addEventListener('click', () => {
                this.runAlgorithm('greedy', data, resultsSection);
            });
        }
        
        if (ilpBtn) {
            ilpBtn.addEventListener('click', () => {
                this.runAlgorithm('ilp', data, resultsSection);
            });
        }
    },

    // Run the selected algorithm
    runAlgorithm: function(type, data, resultsSection) {
        // Vérifier que nous avons des données à traiter
        if (Object.keys(data.pieces).length === 0) {
            alert("Veuillez d'abord importer ou ajouter des pièces à découper.");
            return;
        }
        
        if (Object.keys(data.motherBars).length === 0) {
            alert("Veuillez définir des barres mères avant de continuer.");
            return;
        }
        
        // Verification plus approfondie des données
        let hasPieces = false;
        for (const model in data.pieces) {
            if (data.pieces[model] && data.pieces[model].length > 0) {
                hasPieces = true;
                break;
            }
        }
        
        if (!hasPieces) {
            alert("Veuillez d'abord ajouter des pièces à découper.");
            return;
        }
        
        // Afficher le loading et naviguer vers les résultats
        document.getElementById('loading-overlay').classList.remove('hidden');
        
        // Si ce n'est pas une comparaison, naviguer directement vers les résultats
        if (type !== 'compare') {
            document.querySelectorAll('.nav-btn')[1].click(); // Active l'onglet résultats
        }
        
        const algorithmName = type === 'greedy' || type === 'ffd' 
            ? 'First-Fit Decreasing' 
            : (type === 'ilp' ? 'Programmation Linéaire (ILP)' : 'Comparaison');
        
        document.getElementById('result-algorithm').textContent = algorithmName;

        setTimeout(() => {
            try {
                let results;
                
                if (type === 'compare') {
                    // Exécuter les deux algorithmes et comparer les résultats
                    const ffdResults = algorithms.solveGreedyFFD(data.motherBars, data.pieces);
                    const ilpResults = algorithms.solveWithILP(data.motherBars, data.pieces);
                    
                    // Comparer les résultats et choisir le meilleur
                    results = this.compareAndSelectBest(ffdResults, ilpResults);
                    
                    // Naviguer vers l'onglet résultats après la comparaison
                    document.querySelectorAll('.nav-btn')[1].click();
                    
                    // Mettre à jour le texte du résultat
                    document.getElementById('result-algorithm').textContent = 
                        results.bestAlgorithm === 'ffd' ? 'First-Fit Decreasing (meilleur)' : 'Programmation Linéaire (meilleur)';
                }
                else if (type === 'greedy' || type === 'ffd') {
                    results = algorithms.solveGreedyFFD(data.motherBars, data.pieces);
                } 
                else if (type === 'ilp') {
                    results = algorithms.solveWithILP(data.motherBars, data.pieces);
                }
                
                // Afficher les résultats
                this.renderResults(results);
            } catch (error) {
                console.error('Algorithm error:', error);
                document.getElementById('results-container').innerHTML = `
                    <div class="error-message">
                        <h3>Erreur lors de l'exécution</h3>
                        <p>${error.message || "Une erreur s'est produite"}</p>
                    </div>
                `;
            } finally {
                document.getElementById('loading-overlay').classList.add('hidden');
            }
        }, 100);
    },

    // Fonction corrigée pour comparer les résultats et sélectionner le meilleur
    compareAndSelectBest: function(ffdResults, ilpResults) {
        console.log("Comparaison des résultats des deux algorithmes");
        
        // Utiliser directement les valeurs d'efficacité déjà calculées correctement par les algorithmes
        const ffdEfficiency = parseFloat(ffdResults.globalStats.statistics.utilizationRate);
        const ilpEfficiency = parseFloat(ilpResults.globalStats.statistics.utilizationRate);
        
        console.log(`FFD Efficacité: ${ffdEfficiency}%, ILP Efficacité: ${ilpEfficiency}%`);
        
        // Déterminer le meilleur algorithme basé sur l'efficacité
        const bestAlgorithm = ffdEfficiency >= ilpEfficiency ? 'ffd' : 'ilp';
        const bestResults = bestAlgorithm === 'ffd' ? ffdResults : ilpResults;
        
        // Ajouter des informations de comparaison
        bestResults.comparison = {
            ffdEfficiency,
            ilpEfficiency,
            bestAlgorithm,
            differencePercentage: Math.abs(ffdEfficiency - ilpEfficiency).toFixed(2)
        };
        
        bestResults.bestAlgorithm = bestAlgorithm;
        
        return bestResults;
    },

    renderResults: function(results) {
        const container = document.getElementById('results-container');
        
        if (!results) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>Impossible de calculer les résultats</h3>
                    <p>L'algorithme n'a pas pu trouver de solution avec les données fournies.</p>
                </div>
            `;
            return;
        }
        
        const modelResults = results.modelResults || {};
        const globalStats = results.globalStats || {};
        
        // Calculate global statistics
        let totalUsedBars = 0;
        let totalWaste = 0;
        let totalBarLength = 0;
        
        for (const model in modelResults) {
            const modelResult = modelResults[model];
            totalUsedBars += modelResult.rawData.usedBars.length;
            
            // Calculate detailed statistics
            for (const bar of modelResult.rawData.usedBars) {
                totalBarLength += bar.originalLength;
                totalWaste += bar.remainingLength || bar.waste || 0;
            }
        }
        
        // Calculate efficiency
        const totalEfficiency = totalBarLength > 0 
            ? ((1 - (totalWaste / totalBarLength)) * 100).toFixed(2)
            : "100.00";
        
        // Build results HTML
        let html = `
            <div class="results-summary">
                <h3>Résumé global</h3>
        `;
        
        // Ajouter les informations de comparaison si disponibles
        if (results.comparison) {
            html += `
                <div class="algorithm-comparison">
                    <p class="comparison-result">
                        <strong>Algorithme choisi:</strong> ${results.bestAlgorithm === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire'}
                        <span class="tag">${results.bestAlgorithm === 'ffd' ? 'FFD' : 'ILP'}</span>
                    </p>
                    <div class="algorithm-efficiencies">
                        <div class="efficiency-comparison ${results.bestAlgorithm === 'ffd' ? 'best' : ''}">
                            <div class="algorithm-name">First-Fit Decreasing</div>
                            <div class="efficiency-value">${results.comparison.ffdEfficiency}%</div>
                        </div>
                        <div class="efficiency-comparison ${results.bestAlgorithm === 'ilp' ? 'best' : ''}">
                            <div class="algorithm-name">Programmation Linéaire</div>
                            <div class="efficiency-value">${results.comparison.ilpEfficiency}%</div>
                        </div>
                    </div>
                    <p class="difference-info">
                        Différence d'efficacité: <strong>${results.comparison.differencePercentage}%</strong>
                    </p>
                </div>
            `;
        }
        
        html += `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Barres utilisées</div>
                        <div class="stat-value">${totalUsedBars}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Longueur totale barres mères</div>
                        <div class="stat-value">${totalBarLength} unités</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Chutes (total)</div>
                        <div class="stat-value">${totalWaste} unités</div>
                    </div>
                    <div class="stat-card efficiency-card">
                        <div class="stat-label">Efficacité</div>
                        <div class="stat-value">${totalEfficiency}%</div>
                    </div>
                </div>
            </div>
            
            <h3 class="mb-3">Détails par modèle</h3>
            <div class="model-results">
        `;
        
        // Add each model's results
        for (const model in modelResults) {
            const modelResult = modelResults[model];
            const usedBars = modelResult.rawData.usedBars;
            
            // Calculate model statistics
            let totalModelBarLength = 0;
            let totalModelWasteLength = 0;
            
            for (const bar of usedBars) {
                totalModelBarLength += bar.originalLength;
                totalModelWasteLength += bar.remainingLength || bar.waste || 0;
            }
            
            const modelEfficiency = totalModelBarLength > 0 
                ? ((1 - (totalModelWasteLength / totalModelBarLength)) * 100).toFixed(2)
                : "100.00";
            
            html += `
                <div class="model-card">
                    <div class="model-header">
                        <h3>Modèle: ${model}</h3>
                    </div>
                    <div class="model-content">
                        <div class="model-stats">
                            <div class="model-stat">
                                <div class="stat-label">Barres</div>
                                <div class="stat-value">${usedBars.length}</div>
                            </div>
                            <div class="model-stat">
                                <div class="stat-label">Longueur totale</div>
                                <div class="stat-value">${totalModelBarLength} unités</div>
                            </div>
                            <div class="model-stat">
                                <div class="stat-label">Chutes</div>
                                <div class="stat-value">${totalModelWasteLength} unités</div>
                            </div>
                            <div class="model-stat">
                                <div class="stat-label">Efficacité</div>
                                <div class="efficiency-tag">${modelEfficiency}%</div>
                            </div>
                        </div>
                        
                        <div class="cut-schemes">
                            <h4 class="mb-2">Schémas de coupe</h4>
            `;
            
            // Add each cutting pattern
            modelResult.layouts.forEach((layout, index) => {
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
                
                let cutsHtml = '';
                Object.entries(cutCounts)
                    .sort((a, b) => b[0] - a[0])
                    .forEach(([length, count]) => {
                        cutsHtml += `<span class="cut-count">${count}×</span>${length} `;
                    });
                
                // Visual representation of the cuts
                let visualBarHtml = '';
                cuts.forEach((cut, index) => {
                    const percentage = (cut / barLength) * 100;
                    // Ajouter une classe pour le dernier morceau qui n'aura pas de bordure
                    const lastPieceClass = (index === cuts.length - 1 && waste === 0) ? 'last-piece' : '';
                    visualBarHtml += `<div class="cut-piece ${lastPieceClass}" style="width: ${percentage}%" title="${cut}">${cut}</div>`;
                });
                
                // Add waste piece if any
                if (waste > 0) {
                    const wastePercentage = (waste / barLength) * 100;
                    visualBarHtml += `<div class="waste-piece" style="width: ${wastePercentage}%" title="Chute: ${waste}">${waste}</div>`;
                }
                
                html += `
                    <div class="cut-scheme">
                        <div class="cut-scheme-header">
                            <strong>${count}× Schéma #${index + 1}</strong>
                            <span>Barre de ${barLength}</span>
                        </div>
                        <div class="cut-pieces">
                            Pièces: ${cutsHtml}
                        </div>
                        <div class="waste">
                            Chute: <span class="waste-value">${waste}</span>
                        </div>
                        <div class="cut-bar">
                            ${visualBarHtml}
                        </div>
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        container.innerHTML = html;
    }
};
