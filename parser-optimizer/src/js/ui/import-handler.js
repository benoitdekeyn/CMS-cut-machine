/**
 * Gestionnaire de la section d'import
 * Gère le drag & drop et l'import de fichiers (SANS ID - VERSION FINALE)
 */
import { UIUtils } from './utils.js';

// Timeout pour détecter les imports en double (en millisecondes)
// Augmenter cette valeur pour une protection plus stricte contre les doublons
// Diminuer pour permettre des réimports volontaires plus rapides
const DUPLICATE_IMPORT_TIMEOUT = 1000;

export const ImportHandler = {
  // Dépendances
  dataManager: null,
  importManager: null,
  
  // Callbacks
  showNotification: null,
  refreshDataDisplay: null,
  
  // Protection contre les doubles imports
  isProcessing: false,
  lastProcessedFiles: null,
  lastProcessedTime: 0,
  
  /**
   * Initialise le handler d'import
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.importManager = options.importManager;
    this.showNotification = options.showNotification;
    this.refreshDataDisplay = options.refreshDataDisplay;
    
    // Réinitialiser l'état au démarrage
    this.isProcessing = false;
    this.lastProcessedFiles = null;
    this.lastProcessedTime = 0;
    
    this.initDropZone();
  },
  
  /**
   * Initialise la zone de drop
   */
  initDropZone: function() {
    const dropZone = document.querySelector('.file-drop-zone');
    const fileInput = document.getElementById('nc2-files-input');
    
    // Ajouter un conteneur pour les erreurs s'il n'existe pas
    if (!document.getElementById('import-error')) {
      const errorDiv = document.createElement('div');
      errorDiv.id = 'import-error';
      errorDiv.className = 'error-message hidden';
      dropZone.parentNode.insertBefore(errorDiv, dropZone.nextSibling);
    }
    
    // Prévenir les comportements par défaut du navigateur
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    // Ajouter/retirer la classe active pendant le drag
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.add('active'));
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.remove('active'));
    });
    
    // Gérer le drop
    dropZone.addEventListener('drop', e => this.processImportedFiles(e.dataTransfer.files));
    
    // Gérer le clic sur l'input file
    fileInput.addEventListener('change', () => this.processImportedFiles(fileInput.files));
    
    // Gérer le clic sur la zone de drop pour ouvrir le sélecteur de fichiers
    dropZone.addEventListener('click', (e) => {
      // Ne pas déclencher si clic sur l'input lui-même (évite double ouverture)
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });
  },
  
  /**
   * Génère une signature pour identifier les fichiers
   */
  generateFilesSignature: function(files) {
    const fileInfos = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      lastModified: file.lastModified
    }));
    return JSON.stringify(fileInfos);
  },
  
  /**
   * Traite les fichiers importés (MODIFIÉ - Utilise le simple overlay)
   */
  processImportedFiles: async function(files) {
    if (!files || files.length === 0) return;
    
    // Vérifier si un import est déjà en cours
    if (this.isProcessing) {
      console.log('⚠️ Import déjà en cours, ignoré');
      this.showNotification('Un import est déjà en cours', 'warning');
      return;
    }
    
    // Générer une signature des fichiers
    const filesSignature = this.generateFilesSignature(files);
    const now = Date.now();
    
    // Vérifier si ce sont les mêmes fichiers importés récemment
    if (filesSignature === this.lastProcessedFiles && (now - this.lastProcessedTime) < DUPLICATE_IMPORT_TIMEOUT) {
      console.log('🔁 Fichiers déjà traités récemment, ignorés');
      this.showNotification('Ces fichiers ont déjà été importés', 'info');
      return;
    }
    
    // Marquer comme en cours de traitement
    this.isProcessing = true;
    this.lastProcessedFiles = filesSignature;
    this.lastProcessedTime = now;
    
    console.log(`📂 Import de ${files.length} fichier(s)`);
    
    // MODIFIÉ: Utiliser le simple overlay au lieu de l'overlay complexe
    UIUtils.showSimpleLoadingOverlay('Traitement des fichiers en cours...');
    this.hideError();
    
    try {
      // Utiliser ImportManager pour parser les fichiers
      const importedBars = await this.importManager.processMultipleFiles(files);
      
      if (importedBars && importedBars.length > 0) {
        console.log(`📊 ${importedBars.length} barres à ajouter`);
        
        // Ajouter les barres au DataManager
        const addedKeys = this.dataManager.addBars(importedBars);
        
        console.log(`✅ ${addedKeys.length} barres ajoutées (clés uniques)`);
        
        if (addedKeys.length > 0) {
          // Rester sur la même section et montrer un message de succès
          this.showNotification(`${addedKeys.length} barres importées avec succès.`, 'success');
          
          // Rafraîchir l'affichage des données
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          
          // Faire défiler jusqu'à la zone d'édition après un court délai
          setTimeout(() => {
            const editPanel = document.querySelector('.panels-container');
            if (editPanel) {
              editPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
        } else {
          this.showError('Aucune nouvelle pièce ajoutée (peut-être des doublons).');
        }
      } else {
        this.showError('Aucune pièce valide trouvée dans les fichiers.');
      }
    } catch (error) {
      console.error('❌ Erreur import:', error);
      this.showError(`Erreur d'import: ${error.message}`);
      
      // En cas d'erreur, oublier la signature pour permettre une réessai
      this.lastProcessedFiles = null;
    } finally {
      // MODIFIÉ: Masquer le simple overlay
      UIUtils.hideSimpleLoadingOverlay();
      
      // Réinitialiser l'élément input file pour permettre la réimportation du même fichier
      const fileInput = document.getElementById('nc2-files-input');
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Libérer après un délai de sécurité
      setTimeout(() => {
        this.isProcessing = false;
        console.log('🔓 Import terminé, prêt pour le suivant');
      }, 1000);
    }
  },
  
  /**
   * MODIFIÉ: Traite les fichiers sans notifications de succès (CORRIGÉ - plus de référence ID)
   */
  processFiles: async function(files) {
    if (!files || files.length === 0) return;
    
    // Vérifier si un import est déjà en cours
    if (this.isProcessing) {
      console.log('⚠️ Import déjà en cours (processFiles), ignoré');
      return;
    }
    
    this.isProcessing = true;
    
    // MODIFIÉ: Utiliser le simple overlay
    UIUtils.showSimpleLoadingOverlay('Traitement des fichiers...');
    
    try {
      const results = await this.importManager.processFiles(files);
      
      if (results.success.length > 0) {
        const addedKeys = this.dataManager.addBars(results.bars);
        
        if (addedKeys.length > 0) {
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          // SUPPRIMÉ: Notification de succès
        }
      }
      
      // Afficher seulement les erreurs
      if (results.errors.length > 0) {
        const errorMsg = results.errors.length === 1 
          ? results.errors[0] 
          : `${results.errors.length} erreurs d'import`;
        this.showNotification(errorMsg, 'error');
      }
      
    } catch (error) {
      console.error('Erreur lors du traitement des fichiers:', error);
      this.showNotification('Erreur lors de l\'import', 'error');
    } finally {
      // MODIFIÉ: Masquer le simple overlay
      UIUtils.hideSimpleLoadingOverlay();
      
      // Libérer après traitement
      setTimeout(() => {
        this.isProcessing = false;
      }, 1000);
    }
  },
  
  /**
   * Affiche une erreur d'import
   */
  showError: function(message) {
    const errorDiv = document.getElementById('import-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  },
  
  /**
   * Masque l'erreur d'import
   */
  hideError: function() {
    const errorDiv = document.getElementById('import-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }
};