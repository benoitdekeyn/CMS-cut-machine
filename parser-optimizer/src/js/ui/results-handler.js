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
  
  // État pour gérer les modals
  currentModal: null,
  
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
                  Détails
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
      // Fermer le modal existant s'il y en a un
      this.closePgmInfoModal();
      
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
   * Ferme le modal PGM s'il existe
   */
  closePgmInfoModal: function() {
    if (this.currentModal && this.currentModal.parentNode) {
      this.currentModal.parentNode.removeChild(this.currentModal);
      this.currentModal = null;
    }
    
    // Nettoyer tous les modals PGM existants (au cas où)
    const existingModals = document.querySelectorAll('.pgm-info-modal');
    existingModals.forEach(modal => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    });
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
    
    // Créer la modal en utilisant les classes existantes
    const modal = document.createElement('div');
    modal.className = 'modal'; // Utilise la classe existante
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Détails du PGM: ${fileName}</h3>
          <button class="close-modal" title="Fermer">&times;</button>
        </div>
        
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <!-- En-tête simplifié -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 2rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius);">
            <div style="text-align: center;">
              <div style="font-weight: 500; color: var(--text-secondary); margin-bottom: 0.5rem;">Profil</div>
              <div style="font-weight: 600; color: var(--text-primary);">${motherBar.profile}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: 500; color: var(--text-secondary); margin-bottom: 0.5rem;">Orientation</div>
              <div style="font-weight: 600; color: var(--text-primary);">${this.formatOrientation(motherBar.orientation)}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: 500; color: var(--text-secondary); margin-bottom: 0.5rem;">Longueur</div>
              <div style="font-weight: 600; color: var(--text-primary);">${this.formatLengthInMeters(motherBar.length)}</div>
            </div>
          </div>
          
          <!-- Paramètres BODY -->
          <div style="margin-bottom: 2rem;">
            <h4 style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 600; color: var(--text-primary);">Paramètres BODY:</h4>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <span style="background: var(--bg-tertiary); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-family: 'Courier New', monospace; font-size: 0.875rem; color: var(--text-primary); border: 1px solid var(--border-color);">B021: ${b021}</span>
              <span style="background: var(--bg-tertiary); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); font-family: 'Courier New', monospace; font-size: 0.875rem; color: var(--text-primary); border: 1px solid var(--border-color);">B035: ${b035}</span>
            </div>
          </div>
          
          <!-- Informations de performance -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
            <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius);">
              <div style="font-weight: 500; color: var(--text-secondary); margin-bottom: 0.5rem;">Chute</div>
              <div style="font-weight: 600; color: var(--text-primary);">${motherBar.waste} cm</div>
            </div>
            <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius);">
              <div style="font-weight: 500; color: var(--text-secondary); margin-bottom: 0.5rem;">Efficacité</div>
              <div style="font-weight: 600; color: var(--text-primary);">${pgmObject.metadata.efficiency}%</div>
            </div>
          </div>
          
          <!-- Barres à découper -->
          <div>
            <h4 style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 600; color: var(--text-primary);">Barres à découper (${pieces.length}):</h4>
            
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
                <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius); margin-bottom: 1rem; position: relative;">
                  <!-- Index aligné à droite -->
                  <div style="position: absolute; top: 0.5rem; right: 1rem; background: var(--primary); color: white; padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600;">
                    #${index + 1}
                  </div>
                  
                  <!-- Nom de la pièce -->
                  <div style="font-weight: 500; color: var(--text-primary); margin-bottom: 0.75rem; padding-right: 3rem;">
                    ${pieceRef.nom || `Pièce ${index + 1} - ${piece.length}cm`}
                  </div>
                  
                  <!-- Codes F4C -->
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <span style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-family: 'Courier New', monospace; font-size: 0.75rem; color: var(--text-secondary); border: 1px solid var(--border-color);">S051: ${s051}</span>
                    <span style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-family: 'Courier New', monospace; font-size: 0.75rem; color: var(--text-secondary); border: 1px solid var(--border-color);">S052: ${s052}</span>
                    <span style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-family: 'Courier New', monospace; font-size: 0.75rem; color: var(--text-secondary); border: 1px solid var(--border-color);">S053: ${s053}</span>
                    <span style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-family: 'Courier New', monospace; font-size: 0.75rem; color: var(--text-secondary); border: 1px solid var(--border-color);">S054: ${s054}</span>
                    <span style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); font-family: 'Courier New', monospace; font-size: 0.75rem; color: var(--text-secondary); border: 1px solid var(--border-color);">S055: ${s055}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary close-modal">Fermer</button>
          <button class="btn btn-primary modal-download">Télécharger</button>
        </div>
      </div>
    `;
    
    // Stocker la référence du modal
    this.currentModal = modal;
    
    // Ajouter au DOM
    document.body.appendChild(modal);
    
    // Gérer les événements de fermeture
    modal.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closePgmInfoModal();
      });
    });
    
    // Fermer en cliquant sur l'overlay (background du modal)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closePgmInfoModal();
      }
    });
    
    // Fermer avec la touche Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closePgmInfoModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Bouton de téléchargement
    modal.querySelector('.modal-download').addEventListener('click', () => {
      try {
        const pgmContent = this.pgmGenerator.generatePgmFromObject(pgmObject, this.dataManager);
        UIUtils.downloadFile(pgmContent, fileName, 'text/plain');
        this.closePgmInfoModal();
      } catch (error) {
        console.error('Erreur téléchargement:', error);
        this.showNotification('Erreur lors du téléchargement', 'error');
      }
    });
  },
  
  /**
   * Télécharge tous les fichiers PGM dans un ZIP
   */
  downloadAllPgm: async function() {
    try {
      UIUtils.showLoadingOverlay();
      
      const pgmObjects = this.uiController.getCurrentPgmObjects();
      
      if (!pgmObjects || pgmObjects.length === 0) {
        this.showNotification('Aucun objet PGM disponible', 'warning');
        return;
      }
      
      const blob = await this.pgmGenerator.generateAllPgmFromObjects(pgmObjects, this.dataManager);
      const zipFileName = `pgm_files_${Date.now()}.zip`;
      UIUtils.downloadFile(blob, zipFileName, 'application/zip');
      
      
    } catch (error) {
      console.error('Erreur lors de la génération des fichiers PGM:', error);
      this.showNotification(`Erreur lors de la génération des fichiers PGM: ${error.message}`, 'error');
    } finally {
      UIUtils.hideLoadingOverlay();
    }
  }
};