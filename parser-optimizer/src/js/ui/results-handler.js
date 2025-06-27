/**
 * Gestionnaire de la section résultats
 * Gère le rendu des résultats et la génération des fichiers PGM
 */
import { UIUtils } from './utils.js';

export const ResultsHandler = {
  // Dépendances
  pgmGenerator: null,
  dataManager: null,
  
  // Callbacks
  showNotification: null,
  
  /**
   * Initialise le gestionnaire de résultats
   * @param {Object} options - Options d'initialisation
   */
  init: function(options) {
    this.pgmGenerator = options.pgmGenerator;
    this.dataManager = options.dataManager;
    this.showNotification = options.showNotification;
  },
  
  /**
   * Génère les aperçus des fichiers PGM
   * @param {Object} results - Résultats de l'optimisation
   */
  generatePgmPreviews: function(results) {
    try {
      const container = document.getElementById('pgm-files-list');
      let html = '';
      
      // Pour chaque modèle
      for (const model in results.modelResults) {
        const modelResults = results.modelResults[model];
        
        // Pour chaque schéma de coupe
        modelResults.layouts.forEach((layout, index) => {
          const fileName = `${model}_${Math.round(layout.barLength)}.pgm`;
          
          html += `
            <div class="pgm-file-item">
              <div class="pgm-file-info">
                <span class="pgm-file-name">${fileName}</span>
                <span class="pgm-file-model">${model}</span>
                <span class="pgm-file-length">Longueur: ${layout.barLength} cm</span>
                <span class="pgm-file-pieces">Pièces: ${layout.cuts ? layout.cuts.length : 0}</span>
              </div>
              <button class="btn btn-sm btn-primary download-pgm-btn" 
                      data-model="${model}" 
                      data-index="${index}">
                Télécharger
              </button>
            </div>
          `;
        });
      }
      
      container.innerHTML = html;
      
      // Configurer les boutons de téléchargement
      container.querySelectorAll('.download-pgm-btn').forEach(button => {
        button.addEventListener('click', () => {
          const model = button.getAttribute('data-model');
          const index = parseInt(button.getAttribute('data-index'), 10);
          
          const layout = results.modelResults[model].layouts[index];
          const pgmContent = this.pgmGenerator.generatePgm(layout, model);
          
          // Télécharger le fichier
          UIUtils.downloadFile(pgmContent, `${model}_${Math.round(layout.barLength)}.pgm`, 'text/plain');
        });
      });
    } catch (error) {
      console.error('Erreur lors de la génération des aperçus PGM:', error);
      document.getElementById('pgm-files-list').innerHTML = '<p class="error-text">Une erreur est survenue lors de la génération des aperçus PGM.</p>';
    }
  },
  
  /**
   * Télécharge tous les fichiers PGM
   */
  downloadAllPgm: async function() {
    try {
      UIUtils.showLoadingOverlay();
      
      // Obtenir les résultats actuels
      const resultsContainer = document.getElementById('results-display');
      if (!resultsContainer.dataset.results) {
        this.showNotification('Aucun résultat disponible', 'warning');
        return;
      }
      
      const results = JSON.parse(resultsContainer.dataset.results);
      
      // Générer le ZIP avec tous les fichiers PGM
      const blob = await this.pgmGenerator.generateAllPgmFiles(results, this.dataManager);
      
      // Télécharger le ZIP
      UIUtils.downloadFile(blob, 'pgm_files.zip', 'application/zip');
      
      // Suppression de la notification de succès
    } catch (error) {
      console.error('Error generating PGM files:', error);
      this.showNotification(`Erreur lors de la génération des fichiers PGM: ${error.message}`, 'error');
    } finally {
      UIUtils.hideLoadingOverlay();
    }
  }
};