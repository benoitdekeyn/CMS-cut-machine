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
  
  // État
  isTauri: false,
  isProcessing: false,
  
  // Protection contre les doubles imports
  lastProcessedFiles: null,
  lastProcessedTime: 0,
  
  /**
   * Vérifie et verrouille un import (retourne false si déjà en cours ou doublon)
   */
  _checkAndLockImport: function(filesSignature) {
    // Vérifier si un import est déjà en cours
    if (this.isProcessing) {
      console.log('⚠️ Import déjà en cours, ignoré');
      this.showNotification('Un import est déjà en cours', 'warning');
      return false;
    }
    
    const now = Date.now();
    
    // Vérifier si ce sont les mêmes fichiers importés récemment
    if (filesSignature === this.lastProcessedFiles && (now - this.lastProcessedTime) < DUPLICATE_IMPORT_TIMEOUT) {
      console.log('🔁 Fichiers déjà traités récemment, ignorés');
      this.showNotification('Ces fichiers ont déjà été importés', 'info');
      return false;
    }
    
    // Marquer comme en cours de traitement
    this.isProcessing = true;
    this.lastProcessedFiles = filesSignature;
    this.lastProcessedTime = now;
    
    return true;
  },
  
  /**
   * Libère le verrou d'import après un délai de sécurité
   */
  _unlockImport: function() {
    setTimeout(() => {
      this.isProcessing = false;
      console.log('🔓 Import terminé, prêt pour le suivant');
    }, 1000);
  },
  
  /**
   * Ajoute les barres et rafraîchit l'affichage
   */
  _addBarsAndRefresh: function(importedBars, showScroll = true) {
    if (!importedBars || importedBars.length === 0) {
      this.showError('Aucune pièce valide trouvée dans les fichiers.');
      return false;
    }
    
    console.log(`📊 ${importedBars.length} barres à ajouter`);
    const addedKeys = this.dataManager.addBars(importedBars);
    console.log(`✅ ${addedKeys.length} barres ajoutées (clés uniques)`);
    
    if (addedKeys.length > 0) {
      this.showNotification(`${addedKeys.length} barres importées avec succès.`, 'success');
      
      if (this.refreshDataDisplay) {
        this.refreshDataDisplay();
      }
      
      // Faire défiler jusqu'à la zone d'édition
      if (showScroll) {
        setTimeout(() => {
          const editPanel = document.querySelector('.panels-container');
          if (editPanel) {
            editPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
      
      return true;
    } else {
      this.showError('Aucune nouvelle pièce ajoutée (peut-être des doublons).');
      return false;
    }
  },
  
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
   * Configuration du drag & drop pour Tauri (version simplifiée)
   */
  setupTauriFileDrop: function(dropZone) {
    if (!window.__TAURI__) return;
    
    console.log('🔧 Configuration du drag & drop Tauri');
    
    try {
      const { listen } = window.__TAURI__.event;
      
      // Écouter les événements émis depuis Rust
      listen('file-drop-hover', (event) => {
        console.log('👀 Survol détecté:', event.payload);
        dropZone.classList.add('active');
      });
      
      listen('file-dropped', async (event) => {
        console.log('📁 Fichiers droppés:', event.payload);
        dropZone.classList.remove('active');
        await this.processTauriDroppedFiles(event.payload);
      });
      
      listen('file-drop-cancelled', (event) => {
        console.log('❌ Drop annulé');
        dropZone.classList.remove('active');
      });
      
      console.log('✅ Drag & drop Tauri configuré');
    } catch (error) {
      console.error('❌ Erreur configuration Tauri:', error);
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
          name: 'Fichiers NC et ZIP',
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
    
    // Vérifier et verrouiller l'import
    const filesSignature = JSON.stringify(filePaths);
    if (!this._checkAndLockImport(filesSignature)) return;
    
    console.log(`📂 Import de ${filePaths.length} fichier(s) Tauri`);
    UIUtils.showSimpleLoadingOverlay('Lecture des fichiers...');
    this.hideError();
    
    try {
      if (!window.__TAURI__) {
        throw new Error('API Tauri non disponible');
      }
      
      const { readTextFile, readBinaryFile } = window.__TAURI__.fs;
      const files = [];
      
      // Lire chaque fichier
      for (const filePath of filePaths) {
        try {
          const fileName = filePath.split(/[\\/]/).pop();
          
          if (!fileName.match(/\.(nc1|nc2|zip)$/i)) {
            console.warn(`⚠️ Fichier ignoré: ${fileName}`);
            continue;
          }
          
          console.log(`📖 Lecture: ${fileName}`);
          
          if (fileName.endsWith('.zip')) {
            // Lire le ZIP comme binaire
            const binaryData = await readBinaryFile(filePath);
            const blob = new Blob([binaryData], { type: 'application/zip' });
            const file = new File([blob], fileName, { type: 'application/zip' });
            files.push(file);
            console.log(`✅ ZIP lu: ${fileName} (${binaryData.length} octets)`);
          } else {
            // Lire les fichiers NC2/NC1 comme texte
            const content = await readTextFile(filePath);
            files.push(new File([content], fileName, { type: 'text/plain' }));
            console.log(`✅ NC2 lu: ${fileName}`);
          }
        } catch (error) {
          console.error(`❌ Erreur lecture ${filePath}:`, error);
          this.showError(`Erreur lors de la lecture du fichier: ${filePath}`);
        }
      }
      
      if (files.length > 0) {
        console.log(`✅ ${files.length} fichier(s) lus avec succès`);
        const importedBars = await this.importManager.processMultipleFiles(files);
        this._addBarsAndRefresh(importedBars);
      } else {
        this.showError('Aucun fichier valide à traiter');
      }
      
    } catch (error) {
      console.error('❌ Erreur traitement Tauri:', error);
      this.showError(`Erreur: ${error.message}`);
      this.lastProcessedFiles = null; // Permettre réessai
    } finally {
      UIUtils.hideSimpleLoadingOverlay();
      this._unlockImport();
    }
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
   * Traite les fichiers importés
   */
  processImportedFiles: async function(files) {
    if (!files || files.length === 0) return;
    
    // Vérifier et verrouiller l'import
    const filesSignature = this.generateFilesSignature(files);
    if (!this._checkAndLockImport(filesSignature)) return;
    
    console.log(`📂 Import de ${files.length} fichier(s)`);
    UIUtils.showSimpleLoadingOverlay('Traitement des fichiers en cours...');
    this.hideError();
    
    try {
      const importedBars = await this.importManager.processMultipleFiles(files);
      this._addBarsAndRefresh(importedBars);
    } catch (error) {
      console.error('❌ Erreur import:', error);
      this.showError(`Erreur d'import: ${error.message}`);
      this.lastProcessedFiles = null; // Permettre réessai
    } finally {
      UIUtils.hideSimpleLoadingOverlay();
      
      // Réinitialiser l'input file
      const fileInput = document.getElementById('nc2-files-input');
      if (fileInput) fileInput.value = '';
      
      this._unlockImport();
    }
  },
  
  /**
   * Traite les fichiers sans notifications de succès
   */
  processFiles: async function(files) {
    if (!files || files.length === 0) return;
    if (this.isProcessing) {
      console.log('⚠️ Import déjà en cours (processFiles), ignoré');
      return;
    }
    
    this.isProcessing = true;
    UIUtils.showSimpleLoadingOverlay('Traitement des fichiers...');
    
    try {
      const results = await this.importManager.processFiles(files);
      
      if (results.success.length > 0) {
        const addedKeys = this.dataManager.addBars(results.bars);
        if (addedKeys.length > 0 && this.refreshDataDisplay) {
          this.refreshDataDisplay();
        }
      }
      
      if (results.errors.length > 0) {
        const errorMsg = results.errors.length === 1 
          ? results.errors[0] 
          : `${results.errors.length} erreurs d'import`;
        this.showNotification(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Erreur traitement fichiers:', error);
      this.showNotification('Erreur lors de l\'import', 'error');
    } finally {
      UIUtils.hideSimpleLoadingOverlay();
      this._unlockImport();
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