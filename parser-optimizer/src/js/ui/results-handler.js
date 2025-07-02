/**
 * Gestionnaire de la section résultats
 * Gère le rendu des résultats et la génération des fichiers PGM
 */
import { UIUtils } from './utils.js';
import { NotificationService } from './notification-service.js';
import { PgmGenerator } from '../pgm-generator.js';

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
      
      // Filtrer les objets PGM valides
      const validPgmObjects = pgmObjects.filter(pgmObject => {
        if (!pgmObject) {
          console.warn('Objet PGM undefined trouvé');
          return false;
        }
        if (!pgmObject.profile) {
          console.warn('Objet PGM sans profile:', pgmObject);
          return false;
        }
        return true;
      });
      
      if (validPgmObjects.length === 0) {
        container.innerHTML = '<p class="error-text">Aucun objet PGM valide trouvé.</p>';
        return;
      }
      
      let html = `<div class="pgm-preview-header">
        <h3>Fichiers PGM à générer</h3>
        <button id="download-all-pgm-btn" class="btn btn-primary">
          <img src="assets/download.svg" alt="" class="btn-icon">
          Télécharger tous les PGM (ZIP)
        </button>
      </div>`;
      
      // Générer l'aperçu pour chaque objet PGM valide
      validPgmObjects.forEach((pgmObject, index) => {
        try {
          const fileName = this.pgmGenerator.generatePgmFileName(pgmObject);
          
          html += `
            <div class="pgm-file-item" data-pgm-index="${index}">
              <div class="pgm-file-header">
                <span class="pgm-file-name">${fileName}</span>
                <div class="pgm-file-actions">
                  <button class="btn btn-sm btn-outline info-pgm-btn" 
                          data-pgm-index="${index}">
                    <img src="assets/info.svg" alt="" class="btn-icon">
                    Détails
                  </button>
                  <button class="btn btn-sm btn-primary download-pgm-btn" 
                          data-pgm-index="${index}">
                    <img src="assets/download.svg" alt="" class="btn-icon">
                    Télécharger
                  </button>
                </div>
              </div>
            </div>
          `;
        } catch (error) {
          console.error('Erreur lors de la génération du nom de fichier PGM:', error, pgmObject);
          html += `
            <div class="pgm-file-item error">
              <div class="pgm-file-header">
                <span class="pgm-file-name">Erreur - PGM ${index + 1}</span>
                <div class="pgm-file-actions">
                  <span class="error-text">Erreur</span>
                </div>
              </div>
            </div>
          `;
        }
      });
      
      container.innerHTML = html;
      
      // Configurer les événements
      this.setupPgmPreviewEvents();
      
      console.log(`${validPgmObjects.length} aperçus PGM générés`);
      
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
   * MODIFIÉ: Télécharge un fichier PGM individuel avec overlay de chargement
   */
  downloadSinglePgm: function(pgmIndex) {
    try {
      // NOUVEAU: Afficher l'overlay de téléchargement
      UIUtils.showSimpleLoadingOverlay('Préparation du téléchargement...');
      
      const pgmObjects = this.uiController.getCurrentPgmObjects();
      
      if (!pgmObjects || !pgmObjects[pgmIndex]) {
        UIUtils.hideSimpleLoadingOverlay();
        this.showNotification('Objet PGM introuvable', 'error');
        return;
      }
      
      const pgmObject = pgmObjects[pgmIndex];
      const pgmContent = this.pgmGenerator.generatePgmFromObject(pgmObject, this.dataManager);
      const fileName = this.pgmGenerator.generatePgmFileName(pgmObject);
      
      // Utiliser setTimeout pour permettre à l'overlay de s'afficher avant le téléchargement
      setTimeout(() => {
        UIUtils.downloadFile(pgmContent, fileName, 'text/plain');
        
        // Masquer l'overlay après un court délai pour laisser le temps au popup de s'afficher
        setTimeout(() => {
          UIUtils.hideSimpleLoadingOverlay();
        }, 500);
      }, 100);
      
    } catch (error) {
      UIUtils.hideSimpleLoadingOverlay();
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
    // Adapter au nouveau format PGM
    const profile = pgmObject.profile;
    const orientation = pgmObject.orientation;
    const length = pgmObject.length;
    const pieces = pgmObject.pieces || [];
    const b021 = pgmObject.B021 || 'N/A';
    const b035 = pgmObject.B035 || '0';
    
    // Calculer la chute et l'efficacité
    const totalPiecesLength = pieces.reduce((sum, piece) => sum + piece.length, 0);
    const waste = length - totalPiecesLength;
    const efficiency = length > 0 ? ((totalPiecesLength / length) * 100).toFixed(1) : 0;
    
    // Créer la modal en utilisant les classes existantes
    const modal = document.createElement('div');
    modal.className = 'modal pgm-info-modal';
    modal.innerHTML = `
      <div class="modal-content pgm-modal-content">
        <div class="modal-header">
          <h3>Détails du PGM: ${fileName}</h3>
          <button class="close-modal" title="Fermer">&times;</button>
        </div>
        
        <div class="modal-body pgm-modal-body">
          <!-- En-tête simplifié -->
          <div class="pgm-header-grid">
            <div class="pgm-header-item">
              <div class="pgm-header-label">Profil</div>
              <div class="pgm-header-value">${profile}</div>
            </div>
            <div class="pgm-header-item">
              <div class="pgm-header-label">Orientation</div>
              <div class="pgm-header-value">${this.formatOrientation(orientation)}</div>
            </div>
            <div class="pgm-header-item">
              <div class="pgm-header-label">Longueur</div>
              <div class="pgm-header-value">${this.formatLengthInMeters(length)}</div>
            </div>
          </div>
          
          <!-- Informations de performance -->
          <div class="pgm-performance-info">
            <span class="pgm-performance-item">
              Chute&nbsp;: <span class="pgm-performance-value">${waste} cm</span>
            </span>
            <span class="pgm-performance-item">
              Efficacité&nbsp;: <span class="pgm-performance-value">${efficiency}%</span>
            </span>
          </div>
          
          <!-- Paramètres BODY -->
          <div class="pgm-section">
            <h4 class="pgm-section-title">Paramètres BODY:</h4>
            <div class="pgm-params-grid">
              <span class="pgm-param-tag">B021: ${b021}</span>
              <span class="pgm-param-tag">B035: ${b035}</span>
            </div>
          </div>
          
          <!-- Barres à découper -->
          <div class="pgm-section">
            <h4 class="pgm-section-title">Barres à découper (${pieces.length}):</h4>
            
            <div class="pgm-pieces-list">
              ${pieces.map((piece, index) => {
                // Accès direct aux propriétés de la pièce
                const f4c = piece.f4cData || {};
                
                // Calculer les valeurs F4C
                const s051 = f4c.S051 || Math.round(piece.length * 10000).toString();
                const s052 = '1';
                const s053 = '1';
                const s054 = f4c.S054 || (piece.angles && piece.angles[1] ? Math.round(piece.angles[1] * 100).toString() : '9000');
                const s055 = f4c.S055 || (piece.angles && piece.angles[2] ? Math.round(piece.angles[2] * 100).toString() : '9000');
                const s058 = f4c.S058 || piece.S058 || '';
                
                return `
                  <div class="pgm-piece-item">
                    <!-- Index aligné à droite -->
                    <div class="pgm-piece-index">#${index + 1}</div>
                    
                    <!-- Nom de la pièce -->
                    <div class="pgm-piece-name">
                      ${piece.nom || `Pièce ${index + 1} - ${piece.length}cm`}
                    </div>
                    
                    <!-- Codes F4C -->
                    <div class="pgm-f4c-grid">
                      <span class="pgm-f4c-tag">S051: ${s051}</span>
                      <span class="pgm-f4c-tag">S052: ${s052}</span>
                      <span class="pgm-f4c-tag">S053: ${s053}</span>
                      <span class="pgm-f4c-tag">S054: ${s054}</span>
                      <span class="pgm-f4c-tag">S055: ${s055}</span>
                      <span class="pgm-f4c-tag">S058: ${s058}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary close-modal">Fermer</button>
          <button class="btn btn-primary modal-download">
            <img src="assets/download.svg" alt="" class="btn-icon">
            Télécharger
          </button>
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
    
    // MODIFIÉ: Bouton de téléchargement avec overlay
    modal.querySelector('.modal-download').addEventListener('click', () => {
      try {
        // NOUVEAU: Afficher l'overlay de téléchargement
        UIUtils.showSimpleLoadingOverlay('Préparation du téléchargement...');
        
        // Utiliser setTimeout pour permettre à l'overlay de s'afficher
        setTimeout(() => {
          const pgmContent = this.pgmGenerator.generatePgmFromObject(pgmObject, this.dataManager);
          UIUtils.downloadFile(pgmContent, fileName, 'text/plain');
          
          // Fermer le modal et masquer l'overlay après un délai
          setTimeout(() => {
            this.closePgmInfoModal();
            UIUtils.hideSimpleLoadingOverlay();
          }, 500);
        }, 100);
        
      } catch (error) {
        UIUtils.hideSimpleLoadingOverlay();
        console.error('Erreur téléchargement:', error);
        this.showNotification('Erreur lors du téléchargement', 'error');
      }
    });
  },
  
  /**
   * MODIFIÉ: Télécharge tous les fichiers PGM dans un ZIP avec overlay de chargement
   */
  downloadAllPgm: async function() {
    try {
      console.log('🔽 Début du téléchargement des PGM...');
      
      if (!this.uiController.currentPgmObjects) {
        throw new Error('Aucun objet PGM disponible');
      }
      
      // NOUVEAU: Afficher l'overlay de téléchargement
      UIUtils.showSimpleLoadingOverlay('Génération du fichier ZIP...');
      
      // Utiliser setTimeout pour permettre à l'overlay de s'afficher
      setTimeout(async () => {
        try {
          // CORRECTION: Utiliser PgmGenerator directement (pas this.pgmGenerator)
          const result = await PgmGenerator.generateAllPgmFromObjects(
            this.uiController.currentPgmObjects, 
            this.uiController.dataManager
          );
          
          // CORRECTION: Vérifier que result a la bonne structure
          console.log(`📦 Nom du ZIP généré: ${result.fileName}`);
          
          // Télécharger avec le nom automatiquement généré
          UIUtils.downloadFile(result.blob, result.fileName, 'application/zip');
          
          // Masquer l'overlay après un délai pour laisser le temps au popup de s'afficher
          setTimeout(() => {
            UIUtils.hideSimpleLoadingOverlay();
          }, 1000); // Délai plus long pour le ZIP car il peut être plus lourd
          
        } catch (error) {
          UIUtils.hideSimpleLoadingOverlay();
          console.error('❌ Erreur téléchargement PGM:', error);
          
          // CORRECTION: Utiliser this.showNotification ou NotificationService
          if (this.showNotification) {
            this.showNotification(`❌ Erreur: ${error.message}`, 'error');
          } else {
            NotificationService.show(`❌ Erreur: ${error.message}`, 'error');
          }
        }
      }, 100);
      
    } catch (error) {
      UIUtils.hideSimpleLoadingOverlay();
      console.error('❌ Erreur téléchargement PGM:', error);
      
      // CORRECTION: Utiliser this.showNotification ou NotificationService
      if (this.showNotification) {
        this.showNotification(`❌ Erreur: ${error.message}`, 'error');
      } else {
        NotificationService.show(`❌ Erreur: ${error.message}`, 'error');
      }
    }
  }
};