/**
 * Gestionnaire de la section d'import
 * Gère le drag & drop et l'import de fichiers (SANS ID - VERSION FINALE)
 */
import { UIUtils } from './utils.js';

export const ImportHandler = {
  // Dépendances
  dataManager: null,
  importManager: null,
  
  // Callbacks
  showNotification: null,
  refreshDataDisplay: null,
  
  // État
  isTauri: false,
  isProcessing: false,
  
  /**
   * Initialise le handler d'import
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.importManager = options.importManager;
    this.showNotification = options.showNotification;
    this.refreshDataDisplay = options.refreshDataDisplay;
    
    // Détecter l'environnement Tauri
    this.isTauri = window.__TAURI__ !== undefined;
    console.log(this.isTauri ? '🖥️ Mode Tauri détecté' : '🌐 Mode navigateur détecté');
    
    this.initDropZone();
  },
  
  /**
   * Initialise la zone de drop
   */
  initDropZone: function() {
    const dropZone = document.querySelector('.file-drop-zone');
    const fileInput = document.getElementById('nc2-files-input');
    
    if (!dropZone || !fileInput) {
      console.error('❌ Éléments de drop zone non trouvés');
      return;
    }
    
    // Ajouter un conteneur pour les erreurs s'il n'existe pas
    if (!document.getElementById('import-error')) {
      const errorDiv = document.createElement('div');
      errorDiv.id = 'import-error';
      errorDiv.className = 'error-message hidden';
      dropZone.parentNode.insertBefore(errorDiv, dropZone.nextSibling);
    }
    
    if (this.isTauri) {
      // Configuration spécifique pour Tauri - APPROCHE SIMPLIFIÉE
      this.setupTauriFileDrop(dropZone);
    } else {
      // Configuration pour navigateur web (existante)
      this.setupWebFileDrop(dropZone);
    }
    
    // Gérer le clic sur l'input file (commun)
    fileInput.addEventListener('change', () => this.processImportedFiles(fileInput.files));
    
    // Gérer le clic sur la zone de drop pour ouvrir le sélecteur de fichiers
    dropZone.addEventListener('click', (e) => {
      if (e.target !== fileInput) {
        if (this.isTauri) {
          // Dans Tauri, utiliser l'API de dialogue
          this.openTauriFileDialog();
        } else {
          fileInput.click();
        }
      }
    });
  },
  
  /**
   * APPROCHE SIMPLIFIÉE: Configuration du drag & drop pour Tauri
   */
  setupTauriFileDrop: function(dropZone) {
    if (!window.__TAURI__) return;
    
    console.log('🔧 Configuration du drag & drop Tauri (approche simplifiée)');
    
    try {
      const { listen } = window.__TAURI__.event;
      const { invoke } = window.__TAURI__.tauri;
      
      // Écouter les événements émis depuis Rust
      listen('file-drop-hover', (event) => {
        console.log('👀 Survol détecté depuis Rust:', event.payload);
        dropZone.classList.add('active');
      });
      
      listen('file-dropped', async (event) => {
        console.log('📁 Fichiers droppés depuis Rust:', event.payload);
        dropZone.classList.remove('active');
        
        // Traiter les fichiers reçus
        await this.processTauriDroppedFiles(event.payload);
      });
      
      listen('file-drop-cancelled', (event) => {
        console.log('❌ Drop annulé depuis Rust');
        dropZone.classList.remove('active');
      });
      
      // Polling de sécurité moins fréquent
      setInterval(async () => {
        if (this.isProcessing) return;
        
        try {
          const files = await invoke('get_dropped_files');
          if (files && files.length > 0) {
            this.isProcessing = true;
            console.log('📦 Fichiers récupérés par polling:', files);
            await this.processTauriDroppedFiles(files);
            this.isProcessing = false;
          }
        } catch (error) {
          this.isProcessing = false;
          // Ignorer les erreurs de polling
        }
      }, 500);
      
      console.log('✅ Drag & drop Tauri configuré');
    } catch (error) {
      console.error('❌ Erreur configuration Tauri:', error);
      // Fallback : utiliser le comportement web standard
      this.setupWebFileDrop(dropZone);
    }
  },
  
  /**
   * Configuration du drag & drop pour navigateur web
   */
  setupWebFileDrop: function(dropZone) {
    // Prévenir les comportements par défaut du navigateur
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
      
      // Aussi pour document pour éviter la navigation
      document.addEventListener(eventName, e => {
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
  },
  
  /**
   * Ouvre le dialogue de sélection de fichiers Tauri
   */
  openTauriFileDialog: async function() {
    if (!window.__TAURI__) return;
    
    try {
      const { open } = window.__TAURI__.dialog;
      
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Fichiers NC',
          extensions: ['nc1', 'nc2', 'zip']
        }]
      });
      
      if (selected && selected.length > 0) {
        const paths = Array.isArray(selected) ? selected : [selected];
        await this.processTauriDroppedFiles(paths);
      }
    } catch (error) {
      console.error('Erreur dialogue Tauri:', error);
      this.showError('Erreur lors de l\'ouverture du dialogue de fichiers');
    }
  },
  
  /**
   * Traite les fichiers déposés via Tauri
   */
  processTauriDroppedFiles: async function(filePaths) {
    if (!filePaths || filePaths.length === 0) return;
    
    console.log('🔄 Traitement des fichiers Tauri:', filePaths);
    
    UIUtils.showSimpleLoadingOverlay('Lecture des fichiers...');
    this.hideError();
    
    try {
      if (!window.__TAURI__) {
        throw new Error('API Tauri non disponible');
      }
      
      const { readTextFile } = window.__TAURI__.fs;
      const files = [];
      
      // Lire chaque fichier
      for (const filePath of filePaths) {
        try {
          // Extraire le nom du fichier du chemin
          const fileName = filePath.split(/[\\/]/).pop();
          
          // Vérifier l'extension
          if (!fileName.match(/\.(nc1|nc2|zip)$/i)) {
            console.warn(`⚠️ Fichier ignoré (extension non supportée): ${fileName}`);
            continue;
          }
          
          console.log(`📖 Lecture du fichier: ${fileName}`);
          
          if (fileName.endsWith('.zip')) {
            // Pour les fichiers ZIP, on doit les traiter différemment
            console.warn('⚠️ Fichiers ZIP non supportés en mode Tauri pour le moment');
            continue;
          } else {
            // Lire comme fichier texte
            const content = await readTextFile(filePath);
            
            // Créer un objet File-like pour compatibilité
            const file = new File([content], fileName, {
              type: 'text/plain'
            });
            
            files.push(file);
          }
        } catch (error) {
          console.error(`❌ Erreur lecture fichier ${filePath}:`, error);
          this.showError(`Erreur lors de la lecture du fichier: ${filePath}`);
        }
      }
      
      if (files.length > 0) {
        console.log(`✅ ${files.length} fichiers lus avec succès`);
        
        // Utiliser la méthode existante pour traiter les fichiers
        const importedBars = await this.importManager.processMultipleFiles(files);
        
        if (importedBars && importedBars.length > 0) {
          const addedKeys = this.dataManager.addBars(importedBars);
          
          if (addedKeys.length > 0) {
            this.showNotification(`${addedKeys.length} barres importées avec succès.`, 'success');
            
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
      } else {
        this.showError('Aucun fichier valide à traiter');
      }
      
    } catch (error) {
      console.error('Erreur traitement fichiers Tauri:', error);
      this.showError(`Erreur de traitement: ${error.message}`);
    } finally {
      UIUtils.hideSimpleLoadingOverlay();
    }
  },
  
  /**
   * Traite les fichiers importés (MODIFIÉ - Utilise le simple overlay)
   */
  processImportedFiles: async function(files) {
    if (!files || files.length === 0) return;
    
    // MODIFIÉ: Utiliser le simple overlay au lieu de l'overlay complexe
    UIUtils.showSimpleLoadingOverlay('Traitement des fichiers en cours...');
    this.hideError();
    
    try {
      // Utiliser ImportManager pour parser les fichiers
      const importedBars = await this.importManager.processMultipleFiles(files);
      
      if (importedBars && importedBars.length > 0) {
        // Ajouter les barres au DataManager
        const addedKeys = this.dataManager.addBars(importedBars);
        
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
          this.showError('Aucune nouvelle pièce ajoutée.');
        }
      } else {
        this.showError('Aucune pièce valide trouvée dans les fichiers.');
      }
    } catch (error) {
      console.error('Import error:', error);
      this.showError(`Erreur d'import: ${error.message}`);
    } finally {
      // MODIFIÉ: Masquer le simple overlay
      UIUtils.hideSimpleLoadingOverlay();
      
      // Réinitialiser l'élément input file pour permettre la réimportation du même fichier
      const fileInput = document.getElementById('nc2-files-input');
      if (fileInput) {
        fileInput.value = '';
      }
    }
  },
  
  /**
   * MODIFIÉ: Traite les fichiers sans notifications de succès (CORRIGÉ - plus de référence ID)
   */
  processFiles: async function(files) {
    if (!files || files.length === 0) return;
    
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