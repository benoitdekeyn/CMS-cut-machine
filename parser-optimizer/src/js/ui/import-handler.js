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
  refreshDataDisplay: null, // CORRIGÉ : utiliser refreshDataDisplay au lieu de navigateToSection
  
  /**
   * Initialise le handler d'import
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.importManager = options.importManager;
    this.showNotification = options.showNotification;
    this.refreshDataDisplay = options.refreshDataDisplay; // CORRIGÉ
    
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
  },
  
  /**
   * Traite les fichiers importés
   */
  processImportedFiles: async function(files) {
    if (files.length === 0) return;
    
    UIUtils.showLoadingOverlay();
    this.hideError();
    
    try {
      // Utiliser ImportManager pour parser les fichiers
      const importedBars = await this.importManager.processMultipleFiles(files);
      
      if (importedBars && importedBars.length > 0) {
        // Ajouter les barres au DataManager
        const addedIds = this.dataManager.addBars(importedBars);
        
        if (addedIds.length > 0) {
          // Rester sur la même section et montrer un message de succès
          this.showNotification(`${addedIds.length} barres importées avec succès.`, 'success');
          
          // CORRIGÉ : Rafraîchir l'affichage des données
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
          this.showError('Aucune nouvelle pièce ajoutée.');
        }
      } else {
        this.showError('Aucune pièce valide trouvée dans les fichiers.');
      }
    } catch (error) {
      console.error('Import error:', error);
      this.showError(`Erreur d'import: ${error.message}`);
    } finally {
      UIUtils.hideLoadingOverlay();
      
      // Réinitialiser l'élément input file pour permettre la réimportation du même fichier
      const fileInput = document.getElementById('nc2-files-input');
      if (fileInput) {
        fileInput.value = '';
      }
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