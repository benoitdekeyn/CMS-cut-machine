import { UIUtils } from './utils.js';
import { EditPanels } from './edit-panels.js';
import { EditValidation } from './edit-validation.js';

/**
 * Contrôleur principal de l'édition (SANS ID)
 */
export const EditController = {
  // Dépendances
  dataManager: null,
  showNotification: null,
  refreshDataDisplay: null,
  
  // État interne
  editingKey: null,
  editingType: null,
  editingMode: null,
  
  // Options de verrouillage
  lockOptions: {
    lockPieceCreation: true,
    lockPieceAngles: true,
    lockPieceLengths: true
  },
  
  /**
   * Initialise le contrôleur d'édition
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.showNotification = options.showNotification;
    this.refreshDataDisplay = options.refreshDataDisplay;
    
    if (options.lockOptions) {
      this.lockOptions = { ...this.lockOptions, ...options.lockOptions };
    }
    
    // Initialiser les panneaux
    EditPanels.init(this);
    
    // Initialiser les boutons de reset
    this.initResetButton();
    this.initResetMotherBarsButton();
  },

  /**
   * Point d'entrée principal pour le rendu
   */
  renderSection: function() {
    EditPanels.renderPiecesTable();
    EditPanels.renderStockBarsTable();
  },

  /**
   * Alias pour la rétrocompatibilité
   */
  refreshTables: function() {
    this.renderSection();
  },

  /**
   * Initialise le bouton de reset des barres filles
   */
  initResetButton: function() {
    const resetBtn = document.getElementById('reset-pieces-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetAllPieces();
      });
    }
  },

  /**
   * Supprime toutes les barres filles
   */
  resetAllPieces: function() {
    const data = this.dataManager.getData();
    
    let totalPieces = 0;
    for (const profile in data.pieces) {
      totalPieces += data.pieces[profile].length;
    }
    
    if (totalPieces === 0) {
      this.showNotification('Aucune barre à découper à supprimer', 'info');
      return;
    }
    
    let deletedCount = 0;
    for (const profile in data.pieces) {
      const pieces = [...data.pieces[profile]];
      pieces.forEach(piece => {
        const key = this.dataManager.generatePieceKey(piece);
        if (this.dataManager.deletePiece(key)) {
          deletedCount++;
        }
      });
    }
    
    EditPanels.renderPiecesTable();
    this.updateAllProfileSelects();
    
    this.showNotification(`${deletedCount} barre${deletedCount > 1 ? 's' : ''} à découper supprimée${deletedCount > 1 ? 's' : ''}`, 'success');
    
    if (this.refreshDataDisplay) {
      this.refreshDataDisplay();
    }
  },

  /**
   * Initialise le bouton de reset des barres mères
   */
  initResetMotherBarsButton: function() {
    const resetBtn = document.getElementById('reset-mother-bars-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetAllMotherBars());
    }
  },

  /**
   * Supprime toutes les barres mères avec confirmation
   */
  resetAllMotherBars: function() {
    const data = this.dataManager.getData();
    
    let totalMotherBars = 0;
    for (const profile in data.motherBars) {
      totalMotherBars += data.motherBars[profile].length;
    }
    
    if (totalMotherBars === 0) {
      this.showNotification('Aucune barre mère à supprimer', 'info');
      return;
    }
    
    let deletedCount = 0;
    for (const profile in data.motherBars) {
      const motherBars = [...data.motherBars[profile]];
      motherBars.forEach(motherBar => {
        const key = this.dataManager.generateMotherBarKey(motherBar);
        if (this.dataManager.deleteMotherBar(key)) {
          deletedCount++;
        }
      });
    }
    
    this.dataManager.clearStoredMotherBars();
    EditPanels.renderStockBarsTable();
    this.updateAllProfileSelects();
    
    this.showNotification(`${deletedCount} barre${deletedCount > 1 ? 's' : ''} mère${deletedCount > 1 ? 's' : ''} supprimée${deletedCount > 1 ? 's' : ''}`, 'success');
    
    if (this.refreshDataDisplay) {
      this.refreshDataDisplay();
    }
  },

  /**
   * Ouvre le panneau des barres filles
   */
  openPiecePanel: function(mode, key = null) {
    if (mode === 'create' && this.lockOptions.lockPieceCreation) {
      this.showNotification('La création de nouvelles barres filles est désactivée', 'warning');
      return;
    }
    
    this.editingMode = mode;
    this.editingKey = key;
    this.editingType = 'piece';
    
    EditPanels.openPiecePanel(mode, key);
  },

  /**
   * Ouvre le panneau des barres mères
   */
  openStockPanel: function(mode, key = null) {
    this.editingMode = mode;
    this.editingKey = key;
    this.editingType = 'stock';
    
    EditPanels.openStockPanel(mode, key);
  },

  /**
   * Enregistre les modifications ou crée un nouvel élément
   */
  saveItem: function() {
    const type = this.editingType;
    const key = this.editingKey;
    const mode = this.editingMode;
    
    if (!type) return;
    
    let success = false;
    let updatedProfile = false;
    
    if (type === 'piece') {
      const formData = UIUtils.trimFormData({
        nom: document.getElementById('piece-nom').value,
        profile: document.getElementById('piece-profile').value,
        quantity: document.getElementById('piece-quantity').value,
        orientation: document.getElementById('piece-orientation').value
      });
      
      const nom = formData.nom;
      const profileValue = formData.profile;
      const quantity = parseInt(formData.quantity, 10);
      const orientation = formData.orientation;
      
      let length = null;
      let angle1 = 90, angle2 = 90;
      
      if (!this.lockOptions.lockPieceLengths) {
        const lengthInput = document.getElementById('piece-length').value.trim();
        length = parseInt(lengthInput, 10);
      } else if (mode === 'edit') {
        const item = this.dataManager.getPieceByKey(key);
        length = item ? item.length : null;
      }
      
      if (!this.lockOptions.lockPieceAngles) {
        const angle1Input = document.getElementById('piece-angle-1').value.trim();
        const angle2Input = document.getElementById('piece-angle-2').value.trim();
        angle1 = parseFloat(angle1Input);
        angle2 = parseFloat(angle2Input);
      } else if (mode === 'edit') {
        const item = this.dataManager.getPieceByKey(key);
        angle1 = item ? (item.angles?.[1] || 90) : 90;
        angle2 = item ? (item.angles?.[2] || 90) : 90;
      }
      
      const pieceData = {
        nom,
        profile: profileValue,
        length,
        quantity,
        orientation,
        angles: { 1: angle1, 2: angle2 }
      };
      
      const errors = EditValidation.validatePieceData(pieceData);
      if (errors.length > 0) {
        this.showNotification(errors[0], 'error');
        return;
      }
      
      if (profileValue && length && quantity) {
        if (mode === 'edit') {
          const piece = this.dataManager.getPieceByKey(key);
          
          if (piece && piece.profile !== profileValue) {
            updatedProfile = true;
          }
          
          const updatedPiece = {
            nom,
            profile: profileValue,
            length,
            quantity,
            orientation,
            angles: { 1: angle1, 2: angle2 }
          };
          
          const newKey = this.dataManager.updatePiece(key, updatedPiece);
          success = newKey !== null;
        } else {
          const pieceData = {
            nom,
            profile: profileValue,
            length,
            quantity,
            orientation,
            angles: { 1: angle1, 2: angle2 },
            type: 'fille'
          };
          
          const addedKeys = this.dataManager.addBars([pieceData]);
          if (addedKeys.length > 0) {
            success = true;
            updatedProfile = true;
          }
        }
        
        if (success) {
          EditPanels.renderPiecesTable();
          
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
          
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          
          if (mode === 'edit') {
            this.showNotification(`Barre modifiée`, 'success');
          }
        }
      }
    } else if (type === 'stock') {
      // MODIFIÉ: Récupérer la valeur depuis le champ input au lieu du select
      const formData = UIUtils.trimFormData({
        profile: document.getElementById('stock-profile').value,
        length: document.getElementById('stock-length').value,
        quantity: document.getElementById('stock-quantity').value
      });
      
      const profileValue = formData.profile;
      const lengthInput = formData.length;
      const quantity = parseInt(formData.quantity, 10);
      
      const lengthInMm = EditValidation.parseLengthFromDisplay(lengthInput);
      
      const motherBarData = {
        profile: profileValue,
        length: lengthInMm,
        quantity
      };
      
      const errors = EditValidation.validateMotherBarData(motherBarData);
      if (errors.length > 0) {
        this.showNotification(errors[0], 'error');
        return;
      }
      
      if (profileValue && lengthInMm && quantity) {
        if (mode === 'edit') {
          const bar = this.dataManager.getMotherBarByKey(key);
          
          if (bar && bar.profile !== profileValue) {
            updatedProfile = true;
          }
          
          const updatedMotherBar = {
            profile: profileValue,
            length: lengthInMm,
            quantity
          };
          
          const newKey = this.dataManager.updateMotherBar(key, updatedMotherBar);
          success = newKey !== null;
        } else {
          const barData = {
            profile: profileValue,
            length: lengthInMm,
            quantity,
            type: 'mother'
          };
          
          const addedKeys = this.dataManager.addBars([barData]);
          if (addedKeys.length > 0) {
            success = true;
            updatedProfile = true;
          }
        }
        
        if (success) {
          EditPanels.renderStockBarsTable();
          
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
          
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          
          if (mode === 'edit') {
            this.showNotification(`Barre mère modifiée`, 'success');
          }
        }
      }
    }
    
    if (success) {
      EditPanels.closePanel();
    } else {
      this.showNotification('Erreur lors de l\'enregistrement', 'error');
    }
  },

  /**
   * Met à jour toutes les listes déroulantes de profils
   */
  updateAllProfileSelects: function() {
    // Mettre à jour le select des barres mères
    const stockProfileSelect = document.getElementById('stock-profile-select');
    if (stockProfileSelect) {
      const currentValue = stockProfileSelect.value;
      const customOption = '<option value="custom">Saisie personnalisée</option>';
      stockProfileSelect.innerHTML = customOption + this.getProfileOptions(currentValue === 'custom' ? '' : currentValue);
    }
    
    // Mettre à jour le select des barres filles
    const pieceProfileSelect = document.getElementById('piece-profile-select');
    if (pieceProfileSelect) {
      const currentValue = pieceProfileSelect.value;
      const customOption = '<option value="custom">Saisie personnalisée</option>';
      pieceProfileSelect.innerHTML = customOption + this.getProfileOptions(currentValue === 'custom' ? '' : currentValue);
    }
  },

  /**
   * Obtient la liste des options de profil pour les selects
   */
  getProfileOptions: function(currentValue) {
    const data = this.dataManager.getData();
    const profiles = new Set();
    
    for (const profile in data.pieces) {
      profiles.add(profile);
    }
    
    for (const profile in data.motherBars) {
      profiles.add(profile);
    }
    
    let optionsHtml = '';
    for (const profile of profiles) {
      const selected = profile === currentValue ? 'selected' : '';
      optionsHtml += `<option value="${profile}" ${selected}>${profile}</option>`;
    }
    
    return optionsHtml;
  }
};