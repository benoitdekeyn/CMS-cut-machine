/**
 * ResultsRenderer - Handles rendering of algorithm results in the UI
 */
export const ResultsRenderer = {
  /**
   * Format model key to user-friendly display name
   */
  formatModelName: function(modelKey) {
    const parts = modelKey.split('_');
    const profile = parts[0];
    const orientation = parts[1];
    
    let orientationText = '';
    switch(orientation) {
      case 'a-plat':
        orientationText = 'À plat';
        break;
      case 'debout':
        orientationText = 'Debout';
        break;
      case 'undefined':
        orientationText = 'Non définie';
        break;
      default:
        orientationText = orientation;
    }
    
    return `${profile} - ${orientationText}`;
  },

  /**
   * NOUVEAU: Formate une longueur en centimètres vers mètres avec décimales intelligentes
   */
  formatLengthInMeters: function(lengthInMm) {
    const meters = lengthInMm / 1000;
    
    // Si c'est un nombre entier, pas de décimales
    if (meters % 1 === 0) {
      return `${meters}`;
    }
    
    // Sinon, formatage avec jusqu'à 3 décimales en supprimant les zéros inutiles
    const formatted = meters.toFixed(3);
    const cleanFormatted = parseFloat(formatted).toString();
    return `${cleanFormatted}`;
  },

  /**
   * NOUVEAU: Calcule la largeur minimum nécessaire pour afficher du texte
   */
  shouldShowTextInPiece: function(percentage, text) {
    // Estimation grossière : il faut au moins 30px pour afficher du texte lisible
    // Si la largeur représentée est inférieure à 8%, on n'affiche pas le texte
    return percentage >= 8 && text.toString().length <= 4;
  },
  
  /**
   * Render algorithm results to the container
   */
  renderResults: function(results, algorithmService) {
    // Résumé global
    const globalSummaryContainer = document.getElementById('global-summary-container');
    if (globalSummaryContainer) {
      globalSummaryContainer.innerHTML = this.renderGlobalSummary(results, algorithmService.calculateGlobalStats(results));
    }

    // Détails par modèle
    const modelDetailsContainer = document.getElementById('model-details-container');
    if (modelDetailsContainer) {
      modelDetailsContainer.innerHTML = this.renderModelDetails(results, algorithmService);
    }
  },
  
  /**
   * Render error message
   */
  renderErrorMessage: function(container, title, message) {
    container.innerHTML = `
      <div class="error-message">
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
    `;
  },
  
  /**
   * Render global statistics summary
   */
  renderGlobalSummary: function(results, stats) {
    let html = `
      <div class="results-summary">
        <h2>Résultats de l'optimisation</h2>
    `;
    
    // Add discrete algorithm information if available
    if (results.comparison) {
      html += this.renderAlgorithmInfo(results.comparison, results.bestAlgorithm);
    }
    
    // MODIFIÉ: Grille compacte avec ordre spécifique
    html += `
        <div class="stats-grid-compact">
          <div class="stat-card-compact efficiency-card">
            <div class="stat-label-compact">Efficacité</div>
            <div class="stat-value-compact">${stats.totalEfficiency}%</div>
          </div>
          <div class="stat-card-compact">
            <div class="stat-label-compact">Chutes</div>
            <div class="stat-value-compact">${Math.round(stats.totalWaste)} mm</div>
          </div>
          <div class="stat-card-compact">
            <div class="stat-label-compact">Barres mères</div>
            <div class="stat-value-compact">${stats.totalUsedBars}</div>
          </div>
          <div class="stat-card-compact">
            <div class="stat-label-compact">Longueur totale</div>
            <div class="stat-value-compact">${stats.totalBarLength} mm</div>
          </div>
        </div>
      </div>
    `;
    
    return html;
  },
  
  /**
   * Render discrete algorithm information (3 lines)
   */
  renderAlgorithmInfo: function(comparison, bestAlgorithm) {
    const algorithmName = bestAlgorithm === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire';
    
    return `
      <div class="algorithm-info">
        <p class="algorithm-used">Algorithme utilisé : <strong>${algorithmName}</strong></p>
        <p class="algorithm-comparison">
          FFD : ${comparison.ffdEfficiency}% | ILP : ${comparison.ilpEfficiency}%
        </p>
      </div>
    `;
  },
  
  /**
   * Render model details sections
   */
  renderModelDetails: function(results, algorithmService) {
    const modelResults = results.modelResults || {};
    
    let html = `
      <h3 class="mb-3">Détails par modèle</h3>
      <div class="model-results">
    `;
    
    // Add each model's results
    for (const model in modelResults) {
      const modelResult = modelResults[model];
      const modelStats = algorithmService.calculateModelStats(modelResult);
      
      html += this.renderModelCard(model, modelResult, modelStats, algorithmService);
    }
    
    html += `</div>`;
    return html;
  },
  
  /**
   * Render a single model card
   */
  renderModelCard: function(modelName, modelResult, stats, algorithmService) {
    // Format the model name for display
    const displayName = this.formatModelName(modelName);

    // NOUVEAU: Vérifier s'il y a une erreur
    if (modelResult.error) {
      return this.renderErrorModelCard(displayName, modelResult.error);
    }

    let algoLine = '';
    if (modelResult.algoUsed && modelResult.comparison) {
      const used = modelResult.algoUsed === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire';
      const otherKey = modelResult.algoUsed === 'ffd' ? 'ilp' : 'ffd';
      const otherName = otherKey === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire';
      const usedEff = modelResult.comparison[modelResult.algoUsed];
      const otherEff = modelResult.comparison[otherKey];

      algoLine = `
        <div class="algo-model-info" style="font-size: 0.75em; color: var(--text-secondary); margin-bottom: 0.5rem; opacity: 0.85;">
          </br>
          <div>
            <span><strong>${used}</strong> : ${usedEff !== null && usedEff !== undefined ? usedEff + '%' : 'N/A'}</span>
          </div>
          <div>
            <span>${otherName} : ${otherEff !== null && otherEff !== undefined ? otherEff + '%' : 'N/A'}</span>
          </div>
        </div>
      `;
    }

    let html = `
      <div class="model-card">
        <div class="model-header">
          <h3>${displayName}</h3>
          ${algoLine}
        </div>
        <div class="model-content">
          <div class="model-stats">
            <div class="model-stat">
              <div class="stat-label">Efficacité</div>
              <div class="stat-value efficiency-tag">${stats.efficiency}%</div>
            </div>
            <div class="model-stat">
              <div class="stat-label">Chutes</div>
              <div class="stat-value">${Math.round(stats.wasteLength)} mm</div>
            </div>
            <div class="model-stat">
              <div class="stat-label">Barres mères</div>
              <div class="stat-value">${stats.barCount}</div>
            </div>
            <div class="model-stat">
              <div class="stat-label">Longueur totale</div>
              <div class="stat-value">${stats.totalLength} mm</div>
            </div>
          </div>
          <div class="cut-schemes">
            <h4 class="mb-2">Schémas de coupe</h4>
    `;
    
    // Add each cutting pattern
    if (modelResult.layouts && modelResult.layouts.length > 0) {
      modelResult.layouts.forEach((layout, index) => {
        const processedPattern = algorithmService.processPattern(layout);
        html += this.renderCutScheme(processedPattern, index);
      });
    } else {
      html += '<p class="info-text">Aucun schéma de coupe disponible.</p>';
    }
    
    html += `
          </div>
        </div>
      </div>
    `;
    
    return html;
  },

  /**
   * NOUVEAU: Render une carte d'erreur pour un modèle
   */
  renderErrorModelCard: function(modelName, errorMessage) {
    // Diviser le message d'erreur si il contient <br><br>
    const messageParts = errorMessage.split('\n');
    const mainMessage = messageParts[0];
    const suggestion = messageParts[1] || '';
    
    let suggestionHtml = '';
    if (suggestion) {
      suggestionHtml = `<div class="error-suggestion">${suggestion}</div>`;
    }
    
    return `
      <div class="model-card error-card">
        <div class="model-header">
          <h3>${modelName}</h3>
        </div>
        <div class="model-content">
          <div class="error-content">
            <div class="error-icon">⚠️</div>
            <div class="error-message">
              <h4>Optimisation impossible</h4>
              <p class="error-main">${mainMessage}</p>
              ${suggestionHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render a single cut scheme
   */
  renderCutScheme: function(pattern, index) {
    // Generate the text representation of cuts
    let cutsHtml = '';
    pattern.cuts.forEach(cut => {
      cutsHtml += `<span class="cut-count">${cut.count}×</span>${cut.length} mm `;
    });
    
    // Generate visual representation of the cuts
    let visualBarHtml = '';
    pattern.visualPieces.forEach((piece, pieceIndex) => {
      const lastPieceClass = piece.isLast ? 'last-piece' : '';
      const showText = this.shouldShowTextInPiece(piece.percentage, piece.length);
      
      visualBarHtml += `
        <div class="cut-piece ${lastPieceClass}" 
             style="width: ${piece.percentage}%" 
             title="${piece.length} mm">
          ${showText ? piece.length : ''}
        </div>
      `;
    });
    
    // Add waste piece if any
    if (pattern.waste > 0) {
      const showWasteText = this.shouldShowTextInPiece(pattern.wastePercentage, pattern.waste);
      
      visualBarHtml += `
        <div class="waste-piece" 
             style="width: ${pattern.wastePercentage}%" 
             title="Chute: ${pattern.waste} mm">
          ${showWasteText ? pattern.waste : ''}
        </div>
      `;
    }
    
    return `
      <div class="cut-scheme">
        <div class="cut-scheme-header">
          <strong>${pattern.count}× Schéma #${index + 1}</strong>
          <span>Barre mère <span class="bar-length-badge">${pattern.barLength} mm</span></span>
        </div>
        <div class="cut-pieces">
          Pièces: ${cutsHtml}
        </div>
        <div class="waste">
          Chute: <span class="waste-value">${pattern.waste} mm</span>
        </div>
        <div class="cut-bar">
          ${visualBarHtml}
        </div>
      </div>
    `;
  }
};