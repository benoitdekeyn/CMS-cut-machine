/**
 * Gestionnaire de la section résultats
 * Gère le rendu des résultats et la génération des fichiers PGM
 */
import { UIUtils } from './utils.js';

export const ResultsHandler = {
  // Dépendances
  pgmGenerator: null,
  dataManager: null,
  uiController: null,
  
  // Callbacks
  showNotification: null,
  
  /**
   * Initialise le gestionnaire de résultats
   */
  init: function(options) {
    this.pgmGenerator = options.pgmGenerator;
    this.dataManager = options.dataManager;
    this.uiController = options.uiController;
    this.showNotification = options.showNotification;
  },
  
  /**
   * Génère les aperçus des fichiers PGM à partir des objets PGM
   */
  generatePgmPreviews: function() {
    try {
      const container = document.getElementById('pgm-files-list');
      if (!container) {
        console.warn('Container pgm-files-list non trouvé');
        return;
      }
      
      const pgmObjects = this.uiController.getCurrentPgmObjects();
      
      if (!pgmObjects || pgmObjects.length === 0) {
        container.innerHTML = '<p class="info-text">Aucun fichier PGM à générer.</p>';
        return;
      }
      
      let html = `<div class="pgm-preview-header">
        <h3>Fichiers PGM à générer</h3>
        <button id="download-all-pgm-btn" class="btn btn-primary">
          Télécharger tous les PGM (ZIP)
        </button>
      </div>`;
      
      // Générer l'aperçu pour chaque objet PGM
      pgmObjects.forEach((pgmObject, index) => {
        const fileName = this.pgmGenerator.generatePgmFileName(pgmObject);
        
        html += `
          <div class="pgm-file-item" data-pgm-index="${index}">
            <div class="pgm-file-header">
              <span class="pgm-file-name">${fileName}</span>
              <div class="pgm-file-actions">
                <button class="btn btn-sm btn-outline info-pgm-btn" 
                        data-pgm-index="${index}">
                  Infos
                </button>
                <button class="btn btn-sm btn-primary download-pgm-btn" 
                        data-pgm-index="${index}">
                  Télécharger
                </button>
              </div>
            </div>
          </div>
        `;
      });
      
      container.innerHTML = html;
      
      // Configurer les événements
      this.setupPgmPreviewEvents();
      
      console.log(`${pgmObjects.length} aperçus PGM générés`);
      
    } catch (error) {
      console.error('Erreur lors de la génération des aperçus PGM:', error);
      const container = document.getElementById('pgm-files-list');
      if (container) {
        container.innerHTML = '<p class="error-text">Erreur lors de la génération des aperçus PGM.</p>';
      }
    }
  },
  
  /**
   * Configure les événements pour les aperçus PGM
   */
  setupPgmPreviewEvents: function() {
    // Bouton télécharger tout
    const downloadAllBtn = document.getElementById('download-all-pgm-btn');
    if (downloadAllBtn) {
      downloadAllBtn.addEventListener('click', () => {
        this.downloadAllPgm();
      });
    }
    
    // Boutons de téléchargement individuel
    document.querySelectorAll('.download-pgm-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const pgmIndex = parseInt(e.target.getAttribute('data-pgm-index'), 10);
        this.downloadSinglePgm(pgmIndex);
      });
    });
    
    // Boutons d'informations
    document.querySelectorAll('.info-pgm-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const pgmIndex = parseInt(e.target.getAttribute('data-pgm-index'), 10);
        this.showPgmInfo(pgmIndex);
      });
    });
  },
  
  /**
   * Télécharge un fichier PGM individuel
   */
  downloadSinglePgm: function(pgmIndex) {
    try {
      const pgmObjects = this.uiController.getCurrentPgmObjects();
      
      if (!pgmObjects || !pgmObjects[pgmIndex]) {
        this.showNotification('Objet PGM introuvable', 'error');
        return;
      }
      
      const pgmObject = pgmObjects[pgmIndex];
      const pgmContent = this.pgmGenerator.generatePgmFromObject(pgmObject, this.dataManager);
      const fileName = this.pgmGenerator.generatePgmFileName(pgmObject);
      
      UIUtils.downloadFile(pgmContent, fileName, 'text/plain');
      this.showNotification(`Fichier ${fileName} téléchargé`, 'success');
      
    } catch (error) {
      console.error('Erreur lors du téléchargement PGM:', error);
      this.showNotification(`Erreur lors du téléchargement: ${error.message}`, 'error');
    }
  },
  
  /**
   * Affiche les informations détaillées du PGM
   */
  showPgmInfo: function(pgmIndex) {
    try {
      const pgmObjects = this.uiController.getCurrentPgmObjects();
      
      if (!pgmObjects || !pgmObjects[pgmIndex]) {
        this.showNotification('Objet PGM introuvable', 'error');
        return;
      }
      
      const pgmObject = pgmObjects[pgmIndex];
      const fileName = this.pgmGenerator.generatePgmFileName(pgmObject);
      
      this.showPgmInfoModal(fileName, pgmObject);
      
    } catch (error) {
      console.error('Erreur lors de l\'affichage des infos PGM:', error);
      this.showNotification(`Erreur lors de l'affichage: ${error.message}`, 'error');
    }
  },
  
  /**
   * Formate l'orientation pour l'affichage
   */
  formatOrientation: function(orientation) {
    switch (orientation) {
      case 'a-plat':
        return 'À plat';
      case 'debout':
        return 'Debout';
      default:
        return orientation;
    }
  },

  /**
   * Formate la longueur en mètres
   */
  formatLengthInMeters: function(lengthInCm) {
    const meters = lengthInCm / 100;
    return meters % 1 === 0 ? `${meters} m` : `${meters.toFixed(2)} m`;
  },

  /**
   * Affiche une modal avec les informations du PGM
   */
  showPgmInfoModal: function(fileName, pgmObject) {
    const motherBar = pgmObject.motherBar;
    const pieces = pgmObject.pieces;
    const firstPiece = pieces[0]?.pieceReference;
    
    // Récupérer les valeurs B021 et B035
    const b021 = firstPiece?.f4cData?.B021 || firstPiece?.profile?.substring(0, 3) || 'N/A';
    const b035 = firstPiece?.f4cData?.B035 || '10000';
    
    // Créer la modal
    const modal = document.createElement('div');
    modal.className = 'pgm-info-modal';
    modal.innerHTML = `
      <div class="pgm-info-overlay"></div>
      <div class="pgm-info-content">
        <div class="pgm-info-header">
          <h3>Informations PGM: ${fileName}</h3>
          <button class="pgm-info-close">&times;</button>
        </div>
        
        <div class="pgm-info-body">
          <div class="pgm-main-info">
            <div class="info-group">
              <label>Profil:</label>
              <span>${motherBar.profile}</span>
            </div>
            <div class="info-group">
              <label>Orientation:</label>
              <span>${this.formatOrientation(motherBar.orientation)}</span>
            </div>
            <div class="info-group">
              <label>Longueur barre mère:</label>
              <span>${this.formatLengthInMeters(motherBar.length)}</span>
            </div>
          </div>
          
          <div class="pgm-body-info">
            <h4>Paramètres BODY:</h4>
            <div class="body-f4c">
              <span>B021: ${b021}</span>
              <span>B035: ${b035}</span>
            </div>
          </div>
          
          <div class="pgm-pieces-info">
            <h4>Barres à découper (${pieces.length}):</h4>
            <div class="pieces-list">
              ${pieces.map((piece, index) => {
                const pieceRef = piece.pieceReference;
                const f4c = pieceRef.f4cData || {};
                
                // Calculer les valeurs F4C
                const s051 = f4c.S051 || Math.round(piece.length * 10000).toString();
                const s052 = '1'; // Quantité par défaut
                const s053 = '1'; // Quantité par défaut
                const s054 = f4c.S054 || Math.round((pieceRef.angles?.[1] || 90) * 100).toString();
                const s055 = f4c.S055 || Math.round((pieceRef.angles?.[2] || 90) * 100).toString();
                
                return `
                  <div class="piece-item">
                    <div class="piece-name">${pieceRef.nom || `Pièce ${index + 1}`}</div>
                    <div class="piece-f4c">
                      <span>S051: ${s051}</span>
                      <span>S052: ${s052}</span>
                      <span>S053: ${s053}</span>
                      <span>S054: ${s054}</span>
                      <span>S055: ${s055}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
        
        <div class="pgm-info-actions">
          <button class="btn btn-secondary pgm-info-close">Fermer</button>
          <button class="btn btn-primary pgm-info-download">Télécharger</button>
        </div>
      </div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(modal);
    
    // Gérer les événements
    modal.querySelectorAll('.pgm-info-close').forEach(btn => {
      btn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    });
    
    // Fermer en cliquant sur l'overlay
    modal.querySelector('.pgm-info-overlay').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('.pgm-info-download').addEventListener('click', () => {
      const pgmContent = this.pgmGenerator.generatePgmFromObject(pgmObject, this.dataManager);
      UIUtils.downloadFile(pgmContent, fileName, 'text/plain');
      this.showNotification(`Fichier ${fileName} téléchargé`, 'success');
      document.body.removeChild(modal);
    });
  },
  
  /**
   * Télécharge tous les fichiers PGM dans un ZIP
   */
  downloadAllPgm: async function() {
    try {
      UIUtils.showLoadingOverlay();
      this.showNotification('Génération des fichiers PGM en cours...', 'info');
      
      const pgmObjects = this.uiController.getCurrentPgmObjects();
      
      if (!pgmObjects || pgmObjects.length === 0) {
        this.showNotification('Aucun objet PGM disponible', 'warning');
        return;
      }
      
      const blob = await this.pgmGenerator.generateAllPgmFromObjects(pgmObjects, this.dataManager);
      const zipFileName = `pgm_files_${Date.now()}.zip`;
      UIUtils.downloadFile(blob, zipFileName, 'application/zip');
      
      this.showNotification(`${pgmObjects.length} fichiers PGM téléchargés avec succès`, 'success');
      
    } catch (error) {
      console.error('Erreur lors de la génération des fichiers PGM:', error);
      this.showNotification(`Erreur lors de la génération des fichiers PGM: ${error.message}`, 'error');
    } finally {
      UIUtils.hideLoadingOverlay();
    }
  }
};