/**
 * Gestionnaire de la section résultats
 * Gère le rendu des résultats et la génération des fichiers F4C
 */
import { UIUtils } from './utils.js';
import { NotificationService } from './notification-service.js';
import { F4CGenerator } from '../F4C-generator.js';

export const ResultsHandler = {
  // Dépendances
  F4CGenerator: null,
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
    this.F4CGenerator = options.F4CGenerator;
    this.dataManager = options.dataManager;
    this.uiController = options.uiController;
    this.showNotification = options.showNotification;
  },
  
  /**
   * Génère les aperçus des fichiers F4C à partir des objets F4C
   */
  generateF4CPreviews: function() {
    try {
      const container = document.getElementById('F4C-files-list');
      if (!container) {
        console.warn('Container F4C-files-list non trouvé');
        return;
      }
      
      const F4CObjects = this.uiController.getCurrentF4CObjects();
      
      if (!F4CObjects || F4CObjects.length === 0) {
        container.innerHTML = '<p class="info-text">Aucun fichier F4C à générer.</p>';
        return;
      }
      
      // Filtrer les objets F4C valides
      const validF4CObjects = F4CObjects.filter(F4CObject => {
        if (!F4CObject) {
          console.warn('Objet F4C undefined trouvé');
          return false;
        }
        if (!F4CObject.profile) {
          console.warn('Objet F4C sans profile:', F4CObject);
          return false;
        }
        return true;
      });
      
      if (validF4CObjects.length === 0) {
        container.innerHTML = '<p class="error-text">Aucun objet F4C valide trouvé.</p>';
        return;
      }
      
      let html = `<div class="F4C-preview-header">
        <h3>Fichiers F4C à générer</h3>
        <button id="download-all-F4C-btn" class="btn btn-primary">
          <img src="assets/download.svg" alt="" class="btn-icon">
          Télécharger tous les F4C (ZIP)
        </button>
      </div>`;
      
      // Générer l'aperçu pour chaque objet F4C valide
      validF4CObjects.forEach((F4CObject, index) => {
        try {
          const fileName = this.F4CGenerator.generateF4CFileName(F4CObject);
          
          html += `
            <div class="F4C-file-item" data-F4C-index="${index}">
              <div class="F4C-file-header">
                <span class="F4C-file-name">${fileName}</span>
                <div class="F4C-file-actions">
                  <button class="btn btn-sm btn-outline info-F4C-btn" 
                          data-F4C-index="${index}">
                    <img src="assets/info.svg" alt="" class="btn-icon">
                    Détails
                  </button>
                  <button class="btn btn-sm btn-primary download-F4C-btn" 
                          data-F4C-index="${index}">
                    <img src="assets/download.svg" alt="" class="btn-icon">
                    Télécharger
                  </button>
                </div>
              </div>
            </div>
          `;
        } catch (error) {
          console.error('Erreur lors de la génération du nom de fichier F4C:', error, F4CObject);
          html += `
            <div class="F4C-file-item error">
              <div class="F4C-file-header">
                <span class="F4C-file-name">Erreur - F4C ${index + 1}</span>
                <div class="F4C-file-actions">
                  <span class="error-text">Erreur</span>
                </div>
              </div>
            </div>
          `;
        }
      });
      
      container.innerHTML = html;
      
      // Configurer les événements
      this.setupF4CPreviewEvents();
      
      console.log(`${validF4CObjects.length} aperçus F4C générés`);
      
    } catch (error) {
      console.error('Erreur lors de la génération des aperçus F4C:', error);
      const container = document.getElementById('F4C-files-list');
      if (container) {
        container.innerHTML = '<p class="error-text">Erreur lors de la génération des aperçus F4C.</p>';
      }
    }
  },
  
  /**
   * Configure les événements pour les aperçus F4C
   */
  setupF4CPreviewEvents: function() {
    // Bouton télécharger tout
    const downloadAllBtn = document.getElementById('download-all-F4C-btn');
    if (downloadAllBtn) {
      downloadAllBtn.addEventListener('click', () => {
        this.downloadAllF4C();
      });
    }
    
    // Boutons de téléchargement individuel
    document.querySelectorAll('.download-F4C-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const F4CIndex = parseInt(e.target.getAttribute('data-F4C-index'), 10);
        this.downloadSingleF4C(F4CIndex);
      });
    });
    
    // Boutons d'informations
    document.querySelectorAll('.info-F4C-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const F4CIndex = parseInt(e.target.getAttribute('data-F4C-index'), 10);
        this.showF4CInfo(F4CIndex);
      });
    });
  },
  
  /**
   * MODIFIÉ: Télécharge un fichier F4C individuel avec overlay de chargement
   */
  downloadSingleF4C: function(F4CIndex) {
    try {
      // NOUVEAU: Afficher l'overlay de téléchargement
      UIUtils.showSimpleLoadingOverlay('Préparation du téléchargement...');
      
      const F4CObjects = this.uiController.getCurrentF4CObjects();
      
      if (!F4CObjects || !F4CObjects[F4CIndex]) {
        UIUtils.hideSimpleLoadingOverlay();
        this.showNotification('Objet F4C introuvable', 'error');
        return;
      }
      
      const F4CObject = F4CObjects[F4CIndex];
      const F4CContent = this.F4CGenerator.generateF4CFromObject(F4CObject, this.dataManager);
      const fileName = this.F4CGenerator.generateF4CFileName(F4CObject);
      
      // Utiliser setTimeout pour permettre à l'overlay de s'afficher avant le téléchargement
      setTimeout(() => {
        UIUtils.downloadFile(F4CContent, fileName, 'text/plain');
        
        // Masquer l'overlay après un court délai pour laisser le temps au popup de s'afficher
        setTimeout(() => {
          UIUtils.hideSimpleLoadingOverlay();
        }, 500);
      }, 100);
      
    } catch (error) {
      UIUtils.hideSimpleLoadingOverlay();
      console.error('Erreur lors du téléchargement F4C:', error);
      this.showNotification(`Erreur lors du téléchargement: ${error.message}`, 'error');
    }
  },
  
  /**
   * Affiche les informations détaillées du F4C
   */
  showF4CInfo: function(F4CIndex) {
    try {
      // Fermer le modal existant s'il y en a un
      this.closeF4CInfoModal();
      
      const F4CObjects = this.uiController.getCurrentF4CObjects();
      
      if (!F4CObjects || !F4CObjects[F4CIndex]) {
        this.showNotification('Objet F4C introuvable', 'error');
        return;
      }
      
      const F4CObject = F4CObjects[F4CIndex];
      const fileName = this.F4CGenerator.generateF4CFileName(F4CObject);
      
      this.showF4CInfoModal(fileName, F4CObject);
      
    } catch (error) {
      console.error('Erreur lors de l\'affichage des infos F4C:', error);
      this.showNotification(`Erreur lors de l'affichage: ${error.message}`, 'error');
    }
  },
  
  /**
   * Ferme le modal F4C s'il existe
   */
  closeF4CInfoModal: function() {
    if (this.currentModal && this.currentModal.parentNode) {
      this.currentModal.parentNode.removeChild(this.currentModal);
      this.currentModal = null;
    }
    
    // Nettoyer tous les modals F4C existants (au cas où)
    const existingModals = document.querySelectorAll('.F4C-info-modal');
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
   * Affiche une modal avec les informations du F4C
   */
  showF4CInfoModal: function(fileName, F4CObject) {
    // Adapter au nouveau format F4C
    const profile = F4CObject.profile;
    const orientation = F4CObject.orientation;
    const length = F4CObject.length;
    const pieces = F4CObject.pieces || [];
    const b021 = F4CObject.B021 || 'N/A';
    const b035 = F4CObject.B035 || '0';
    
    // Calculer la chute et l'efficacité
    const totalPiecesLength = pieces.reduce((sum, piece) => sum + piece.length, 0);
    const waste = length - totalPiecesLength;
    const efficiency = length > 0 ? ((totalPiecesLength / length) * 100).toFixed(1) : 0;
    
    // Créer la modal en utilisant les classes existantes
    const modal = document.createElement('div');
    modal.className = 'modal F4C-info-modal';
    modal.innerHTML = `
      <div class="modal-content F4C-modal-content">
        <div class="modal-header">
          <h3>Détails du F4C: ${fileName}</h3>
          <button class="close-modal" title="Fermer">&times;</button>
        </div>
        
        <div class="modal-body F4C-modal-body">
          <!-- En-tête simplifié -->
          <div class="F4C-header-grid">
            <div class="F4C-header-item">
              <div class="F4C-header-label">Profil</div>
              <div class="F4C-header-value">${profile}</div>
            </div>
            <div class="F4C-header-item">
              <div class="F4C-header-label">Orientation</div>
              <div class="F4C-header-value">${this.formatOrientation(orientation)}</div>
            </div>
            <div class="F4C-header-item">
              <div class="F4C-header-label">Longueur</div>
              <div class="F4C-header-value">${UIUtils.formatLenght(length)} mm</div>
            </div>
          </div>
          
          <!-- Informations de performance -->
          <div class="F4C-performance-info">
            <span class="F4C-performance-item">
              Chute&nbsp;: <span class="F4C-performance-value">${UIUtils.formatLenght(waste)} mm</span>
            </span>
            <span class="F4C-performance-item">
              Efficacité&nbsp;: <span class="F4C-performance-value">${efficiency}%</span>
            </span>
          </div>
          
          <!-- Paramètres BODY -->
          <div class="F4C-section">
            <h4 class="F4C-section-title">Paramètres BODY:</h4>
            <div class="F4C-params-grid">
              <span class="F4C-param-tag">B021: ${b021}</span>
              <span class="F4C-param-tag">B035: ${b035}</span>
            </div>
          </div>
          
          <!-- Barres à découper -->
          <div class="F4C-section">
            <h4 class="F4C-section-title">Barres à découper (${pieces.length}):</h4>
            
            <div class="F4C-pieces-list">
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
                  <div class="F4C-piece-item">
                    <!-- Index aligné à droite -->
                    <div class="F4C-piece-index">#${index + 1}</div>
                    
                    <!-- Nom de la pièce -->
                    <div class="F4C-piece-name">
                      ${piece.nom || `Pièce ${index + 1} - ${UIUtils.formatLenght(piece.length)}mm`}
                    </div>
                    
                    <!-- Codes F4C -->
                    <div class="F4C-f4c-grid">
                      <span class="F4C-f4c-tag">S051: ${s051}</span>
                      <span class="F4C-f4c-tag">S052: ${s052}</span>
                      <span class="F4C-f4c-tag">S053: ${s053}</span>
                      <span class="F4C-f4c-tag">S054: ${s054}</span>
                      <span class="F4C-f4c-tag">S055: ${s055}</span>
                      <span class="F4C-f4c-tag">S058: ${s058}</span>
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
        this.closeF4CInfoModal();
      });
    });
    
    // Fermer en cliquant sur l'overlay (background du modal)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeF4CInfoModal();
      }
    });
    
    // Fermer avec la touche Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeF4CInfoModal();
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
          const F4CContent = this.F4CGenerator.generateF4CFromObject(F4CObject, this.dataManager);
          UIUtils.downloadFile(F4CContent, fileName, 'text/plain');
          
          // Fermer le modal et masquer l'overlay après un délai
          setTimeout(() => {
            this.closeF4CInfoModal();
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
   * MODIFIÉ: Télécharge tous les fichiers F4C dans un ZIP avec overlay de chargement
   */
  downloadAllF4C: async function() {
    try {
      console.log('🔽 Début du téléchargement des F4C...');
      
      if (!this.uiController.currentF4CObjects) {
        throw new Error('Aucun objet F4C disponible');
      }
      
      // NOUVEAU: Afficher l'overlay de téléchargement
      UIUtils.showSimpleLoadingOverlay('Génération du fichier ZIP...');
      
      // Utiliser setTimeout pour permettre à l'overlay de s'afficher
      setTimeout(async () => {
        try {
          // CORRECTION: Utiliser F4CGenerator directement (pas this.F4CGenerator)
          const result = await F4CGenerator.generateAllF4CFromObjects(
            this.uiController.currentF4CObjects, 
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
          console.error('❌ Erreur téléchargement F4C:', error);
          
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
      console.error('❌ Erreur téléchargement F4C:', error);
      
      // CORRECTION: Utiliser this.showNotification ou NotificationService
      if (this.showNotification) {
        this.showNotification(`❌ Erreur: ${error.message}`, 'error');
      } else {
        NotificationService.show(`❌ Erreur: ${error.message}`, 'error');
      }
    }
  }
};