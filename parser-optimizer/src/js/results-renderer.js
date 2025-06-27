/**
 * ResultsRenderer - Handles rendering of algorithm results in the UI
 * This separates UI rendering from algorithm logic
 */
export const ResultsRenderer = {
  /**
   * Render algorithm results to the container
   * @param {Object} results - Algorithm results to render
   * @param {Object} algorithmService - Algorithm service for stats calculation
   * @param {HTMLElement} [container] - Optional container element (defaults to results-container)
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
   * @param {HTMLElement} container - Container element
   * @param {string} title - Error title
   * @param {string} message - Error message
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
   * @param {Object} results - Algorithm results
   * @param {Object} stats - Calculated global statistics
   * @returns {string} HTML for global summary
   */
  renderGlobalSummary: function(results, stats) {
    let html = `
      <div class="results-summary">
        <h3>Résumé global</h3>
    `;
    
    // Add comparison information if available
    if (results.comparison) {
      html += this.renderComparisonSection(results.comparison, results.bestAlgorithm);
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
   * Render algorithm comparison section
   * @param {Object} comparison - Comparison data
   * @param {string} bestAlgorithm - Best algorithm identifier
   * @returns {string} HTML for comparison section
   */
  renderComparisonSection: function(comparison, bestAlgorithm) {
    return `
      <div class="algorithm-comparison">
        <p class="comparison-result">
          <strong>Algorithme choisi:</strong> ${bestAlgorithm === 'ffd' ? 'First-Fit Decreasing' : 'Programmation Linéaire'}
          <span class="tag">${bestAlgorithm === 'ffd' ? 'FFD' : 'ILP'}</span>
        </p>
        <div class="algorithm-efficiencies">
          <div class="efficiency-comparison ${bestAlgorithm === 'ffd' ? 'best' : ''}">
            <div class="algorithm-name">First-Fit Decreasing</div>
            <div class="efficiency-value">${comparison.ffdEfficiency}%</div>
          </div>
          <div class="efficiency-comparison ${bestAlgorithm === 'ilp' ? 'best' : ''}">
            <div class="algorithm-name">Programmation Linéaire</div>
            <div class="efficiency-value">${comparison.ilpEfficiency}%</div>
          </div>
        </div>
        <p class="difference-info">
          Différence d'efficacité: <strong>${comparison.differencePercentage}%</strong>
        </p>
      </div>
    `;
  },
  
  /**
   * Render model details sections
   * @param {Object} results - Algorithm results
   * @param {Object} algorithmService - Algorithm service for stats calculation
   * @returns {string} HTML for model details
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
   * @param {string} modelName - Name of the model
   * @param {Object} modelResult - Model result data
   * @param {Object} stats - Calculated model statistics
   * @param {Object} algorithmService - Algorithm service for pattern processing
   * @returns {string} HTML for model card
   */
  renderModelCard: function(modelName, modelResult, stats, algorithmService) {
    let html = `
      <div class="model-card">
        <div class="model-header">
          <h3>Modèle: ${modelName}</h3>
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
   * @param {Object} pattern - Processed pattern data
   * @param {number} index - Pattern index
   * @returns {string} HTML for cut scheme
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