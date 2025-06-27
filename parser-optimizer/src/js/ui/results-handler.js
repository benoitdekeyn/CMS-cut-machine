/**
 * Gestionnaire de la section résultats
 * Gère le rendu des résultats et la génération des fichiers PGM
 */
import { UIUtils } from './utils.js';

export const ResultsHandler = {
  // Dépendances
  pgmGenerator: null,
  dataManager: null,
  uiController: null, // Référence vers le contrôleur principal
  
  // Callbacks
  showNotification: null,
  
  /**
   * Initialise le gestionnaire de résultats
   * @param {Object} options - Options d'initialisation
   */
  init: function(options) {
    this.pgmGenerator = options.pgmGenerator;
    this.dataManager = options.dataManager;
    this.uiController = options.uiController;
    this.showNotification = options.showNotification;
  },
  
  /**
   * Format model key to user-friendly display name
   * @param {string} modelKey - Technical model key (e.g., "HEA100_a-plat")
   * @returns {string} User-friendly model name
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
   * Génère les aperçus des fichiers PGM à partir des objets PGM
   * @param {Object} results - Résultats de l'optimisation (legacy)
   */
  generatePgmPreviews: function(results) {
    try {
      const container = document.getElementById('pgm-files-list');
      
      // Utiliser les objets PGM du contrôleur
      const pgmObjects = this.uiController.getCurrentPgmObjects();
      
      if (!pgmObjects || pgmObjects.length === 0) {
        container.innerHTML = '<p class="info-text">Aucun fichier PGM à générer.</p>';
        return;
      }
      
      let html = '';
      
      // Générer l'aperçu pour chaque objet PGM
      pgmObjects.forEach((pgmObject, index) => {
        const fileName = `${pgmObject.motherBar.profile}_${pgmObject.motherBar.orientation}_${Math.round(pgmObject.motherBar.length)}.pgm`;
        const displayModelName = this.formatModelName(`${pgmObject.motherBar.profile}_${pgmObject.motherBar.orientation}`);
        
        html += `
          <div class="pgm-file-item">
            <div class="pgm-file-info">
              <span class="pgm-file-name">${fileName}</span>
              <span class="pgm-file-model">${displayModelName}</span>
              <span class="pgm-file-length">Longueur: ${Math.round(pgmObject.motherBar.length)} cm</span>
              <span class="pgm-file-pieces">Pièces: ${pgmObject.pieces.length}</span>
              <span class="pgm-file-efficiency">Efficacité: ${pgmObject.metadata.efficiency}%</span>
            </div>
            <button class="btn btn-sm btn-primary download-pgm-btn" 
                    data-pgm-index="${index}">
              Télécharger
            </button>
          </div>
        `;
      });
      
      container.innerHTML = html;
      
      // Configurer les boutons de téléchargement
      container.querySelectorAll('.download-pgm-btn').forEach(button => {
        button.addEventListener('click', () => {
          const pgmIndex = parseInt(button.getAttribute('data-pgm-index'), 10);
          this.downloadSinglePgm(pgmIndex);
        });
      });
      
      console.log(`✅ ${pgmObjects.length} aperçus PGM générés`);
      
    } catch (error) {
      console.error('Erreur lors de la génération des aperçus PGM:', error);
      document.getElementById('pgm-files-list').innerHTML = '<p class="error-text">Une erreur est survenue lors de la génération des aperçus PGM.</p>';
    }
  },
  
  /**
   * Télécharge un fichier PGM individuel
   * @param {number} pgmIndex - Index de l'objet PGM
   */
  downloadSinglePgm: function(pgmIndex) {
    try {
      const pgmObjects = this.uiController.getCurrentPgmObjects();
      
      if (!pgmObjects || !pgmObjects[pgmIndex]) {
        this.showNotification('Objet PGM introuvable', 'error');
        return;
      }
      
      const pgmObject = pgmObjects[pgmIndex];
      
      // Générer le contenu PGM
      const pgmContent = this.pgmGenerator.generatePgmFromObject(pgmObject, this.dataManager);
      
      // Télécharger le fichier
      const fileName = `${pgmObject.motherBar.profile}_${pgmObject.motherBar.orientation}_${Math.round(pgmObject.motherBar.length)}.pgm`;
      UIUtils.downloadFile(pgmContent, fileName, 'text/plain');
      
      this.showNotification(`Fichier ${fileName} téléchargé`, 'success');
      
    } catch (error) {
      console.error('Erreur lors du téléchargement PGM:', error);
      this.showNotification(`Erreur lors du téléchargement: ${error.message}`, 'error');
    }
  },
  
  /**
   * Télécharge tous les fichiers PGM
   */
  downloadAllPgm: async function() {
    try {
      UIUtils.showLoadingOverlay();
      
      // Utiliser les objets PGM du contrôleur
      const pgmObjects = this.uiController.getCurrentPgmObjects();
      
      if (!pgmObjects || pgmObjects.length === 0) {
        this.showNotification('Aucun objet PGM disponible', 'warning');
        return;
      }
      
      // Générer le ZIP avec tous les fichiers PGM
      const blob = await this.pgmGenerator.generateAllPgmFromObjects(pgmObjects, this.dataManager);
      
      // Télécharger le ZIP
      UIUtils.downloadFile(blob, 'pgm_files.zip', 'application/zip');
      
      this.showNotification(`${pgmObjects.length} fichiers PGM téléchargés avec succès`, 'success');
      
    } catch (error) {
      console.error('Error generating PGM files:', error);
      this.showNotification(`Erreur lors de la génération des fichiers PGM: ${error.message}`, 'error');
    } finally {
      UIUtils.hideLoadingOverlay();
    }
  }
};