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
    
    return `${profile} (${orientationText})`;
  },
  
  /**
   * Render algorithm results to the container
   */
  renderResults: function(results, algorithmService, container) {
    if (!container) {
      container = document.getElementById('results-container');
    }
    
    if (!results) {
      this.renderErrorMessage(
        container, 
        "Impossible de calculer les résultats", 
        "L'algorithme n'a pas pu trouver de solution avec les données fournies."
      );
      return;
    }
    
    // Calculate global statistics
    const globalStats = algorithmService.calculateGlobalStats(results);
    
    // Build HTML for results
    let html = this.renderGlobalSummary(results, globalStats);
    html += this.renderModelDetails(results, algorithmService);
    
    // Update container
    container.innerHTML = html;
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
        <h3>Résumé global</h3>
    `;
    
    // Add discrete algorithm information if available
    if (results.comparison) {
      html += this.renderAlgorithmInfo(results.comparison, results.bestAlgorithm);
    }
    
    html += `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Barres utilisées</div>
            <div class="stat-value">${stats.totalUsedBars}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Longueur totale barres mères</div>
            <div class="stat-value">${stats.totalBarLength} cm</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Chutes (total)</div>
            <div class="stat-value">${stats.totalWaste} cm</div>
          </div>
          <div class="stat-card efficiency-card">
            <div class="stat-label">Efficacité</div>
            <div class="stat-value">${stats.totalEfficiency}%</div>
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
    
    let html = `
      <div class="model-card">
        <div class="model-header">
          <h3>Modèle: ${displayName}</h3>
        </div>
        <div class="model-content">
          <div class="model-stats">
            <div class="model-stat">
              <div class="stat-label">Barres</div>
              <div class="stat-value">${stats.barCount}</div>
            </div>
            <div class="model-stat">
              <div class="stat-label">Longueur totale</div>
              <div class="stat-value">${stats.totalLength} cm</div>
            </div>
            <div class="model-stat">
              <div class="stat-label">Chutes</div>
              <div class="stat-value">${stats.wasteLength} cm</div>
            </div>
            <div class="model-stat">
              <div class="stat-label">Efficacité</div>
              <div class="efficiency-tag">${stats.efficiency}%</div>
            </div>
          </div>
          
          <div class="cut-schemes">
            <h4 class="mb-2">Schémas de coupe</h4>
    `;
    
    // Add each cutting pattern
    modelResult.layouts.forEach((layout, index) => {
      const processedPattern = algorithmService.processPattern(layout);
      html += this.renderCutScheme(processedPattern, index);
    });
    
    html += `
          </div>
        </div>
      </div>
    `;
    
    return html;
  },
  
  /**
   * Render a single cut scheme
   */
  renderCutScheme: function(pattern, index) {
    // Generate the text representation of cuts
    let cutsHtml = '';
    pattern.cuts.forEach(cut => {
      cutsHtml += `<span class="cut-count">${cut.count}×</span>${cut.length} cm `;
    });
    
    // Generate visual representation of the cuts
    let visualBarHtml = '';
    pattern.visualPieces.forEach(piece => {
      const lastPieceClass = piece.isLast ? 'last-piece' : '';
      visualBarHtml += `
        <div class="cut-piece ${lastPieceClass}" 
             style="width: ${piece.percentage}%" 
             title="${piece.length} cm">
          ${piece.length}
        </div>
      `;
    });
    
    // Add waste piece if any
    if (pattern.waste > 0) {
      visualBarHtml += `
        <div class="waste-piece" 
             style="width: ${pattern.wastePercentage}%" 
             title="Chute: ${pattern.waste} cm">
          ${pattern.waste}
        </div>
      `;
    }
    
    return `
      <div class="cut-scheme">
        <div class="cut-scheme-header">
          <strong>${pattern.count}× Schéma #${index + 1}</strong>
          <span>Barre de ${pattern.barLength} cm</span>
        </div>
        <div class="cut-pieces">
          Pièces: ${cutsHtml}
        </div>
        <div class="waste">
          Chute: <span class="waste-value">${pattern.waste} cm</span>
        </div>
        <div class="cut-bar">
          ${visualBarHtml}
        </div>
      </div>
    `;
  }
};