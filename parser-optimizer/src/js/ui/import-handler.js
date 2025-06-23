/**
 * Gestionnaire de la section d'import
 * Gère le drag & drop et l'import de fichiers
 */
import { UIUtils } from './utils.js';

export const ImportHandler = {
  // Dépendances
  dataManager: null,
  importManager: null,
  
  // Callbacks
  showNotification: null,
  navigateToSection: null,
  
  /**
   * Initialise le handler d'import
   * @param {Object} options - Options d'initialisation
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.importManager = options.importManager;
    this.showNotification = options.showNotification;
    this.navigateToSection = options.navigateToSection;
    
    this.initImportSection();
  },
  
  /**
   * Initialise la section d'import
   */
  initImportSection: function() {
    // Configurer le drag & drop pour l'import
    const dropZone = document.querySelector('.file-drop-zone');
    const fileInput = document.getElementById('nc2-files-input');
    
    // S'assurer que le conteneur d'erreur existe
    if (!document.getElementById('import-error')) {
      const errorDiv = document.createElement('div');
      errorDiv.id = 'import-error';
      errorDiv.className = 'error-message hidden';
      dropZone.parentNode.insertBefore(errorDiv, dropZone.nextSibling);
    }
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('active');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('active');
      });
    });
    
    dropZone.addEventListener('drop', async e => {
      const files = e.dataTransfer.files;
      await this.processImportedFiles(files);
    });
    
    fileInput.addEventListener('change', async () => {
      const files = fileInput.files;
      await this.processImportedFiles(files);
    });
  },
  
  /**
   * Traite les fichiers importés et met à jour l'interface
   * @param {FileList} files - Liste des fichiers à traiter
   */
  processImportedFiles: async function(files) {
    if (files.length === 0) return;
    
    console.log('Processing files:', files);
    UIUtils.showLoadingOverlay();
    
    // Masquer les erreurs précédentes
    this.hideError();
    
    try {
      // Utiliser ImportManager pour parser les fichiers
      const importedBars = await this.importManager.processMultipleFiles(files);
      console.log('Parsed bars from files:', importedBars);
      
      if (importedBars && importedBars.length > 0) {
        // Ajouter les barres importées au DataManager
        const addedIds = this.dataManager.addBars(importedBars);
        
        if (addedIds.length > 0) {
          // Passer directement à la section d'édition sans alerte
          this.navigateToSection('edit-section');
        } else {
          // Aucune barre ajoutée (probablement déjà existantes)
          this.showError('Aucune nouvelle pièce ajoutée. Vérifiez que les fichiers sont valides et uniques.');
        }
      } else {
        // Aucune barre valide trouvée
        this.showError('Aucune pièce valide n\'a été trouvée dans les fichiers importés.');
      }
    } catch (error) {
      console.error('Import error:', error);
      this.showError(`Erreur lors de l'import: ${error.message}`);
    } finally {
      UIUtils.hideLoadingOverlay();
    }
  },
  
  /**
   * Affiche un message d'erreur sous la zone d'import
   * @param {string} message - Message d'erreur à afficher
   */
  showError: function(message) {
    const errorDiv = document.getElementById('import-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  },
  
  /**
   * Masque le message d'erreur d'import
   */
  hideError: function() {
    const errorDiv = document.getElementById('import-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }
};