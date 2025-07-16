import { UIUtils } from './utils.js';
import { EditValidation } from './edit-validation.js';

/**
 * Gestionnaire des panneaux d'édition
 */
export const EditPanels = {
  controller: null,
  
  /**
   * Initialise le gestionnaire de panneaux
   */
  init: function(controller) {
    this.controller = controller;
    this.createPiecePanel();
    this.createStockPanel();
  },

  /**
   * Convertit le code d'orientation en affichage lisible
   */
  formatOrientation: function(orientation) {
    switch(orientation) {
      case 'debout': return 'Debout';
      case 'a-plat': return 'À plat';
      default: return orientation;
    }
  },

  /**
   * Trie les barres selon l'ordre : profil → orientation → longueur
   */
  sortBars: function(bars) {
    return bars.sort((a, b) => {
      if (a.profile !== b.profile) {
        return a.profile.localeCompare(b.profile);
      }
      
      if (a.orientation && b.orientation && a.orientation !== b.orientation) {
        const orientationOrder = { 'a-plat': 0, 'debout': 1 };
        const orderA = orientationOrder[a.orientation] !== undefined ? orientationOrder[a.orientation] : 2;
        const orderB = orientationOrder[b.orientation] !== undefined ? orientationOrder[b.orientation] : 2;
        return orderA - orderB;
      }
      
      return a.length - b.length;
    });
  },

  /**
   * Rend le tableau des barres filles avec tri automatique
   */
  renderPiecesTable: function() {
    const tableContainer = document.querySelector('#pieces-table');
    const data = this.controller.dataManager.getData();
    
    const allPieces = [];
    for (const profile in data.pieces) {
      allPieces.push(...data.pieces[profile]);
    }
    
    const sortedPieces = this.sortBars(allPieces);
    
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Profil</th>
            <th>Orientation</th>
            <th>Longueur</th>
            <th>Angle 1</th>
            <th>Angle 2</th>
            <th>Quantité</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    for (const piece of sortedPieces) {
      const pieceKey = this.controller.dataManager.generatePieceKey(piece);
      html += `
        <tr data-key="${pieceKey}">
          <td>${piece.nom || '-'}</td>
          <td>${piece.profile}</td>
          <td>${this.formatOrientation(piece.orientation || "non-définie")}</td>
          <td>${UIUtils.formatLenght(piece.length)} mm</td>
          <td>${parseFloat(piece.angles?.[1] || 90).toFixed(2)}°</td>
          <td>${parseFloat(piece.angles?.[2] || 90).toFixed(2)}°</td>
          <td>${piece.quantity}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-action-edit edit-piece-btn" 
                      data-key="${pieceKey}" 
                      title="Éditer">
                <img src="assets/edit.svg" alt="Éditer" class="btn-icon">
              </button>
              <button class="btn-action btn-action-delete delete-piece-btn" 
                      data-key="${pieceKey}" 
                      title="Supprimer">
                <img src="assets/delete.svg" alt="Supprimer" class="btn-icon">
              </button>
            </div>
          </td>
        </tr>
      `;
    }
    
    if (!this.controller.lockOptions.lockPieceCreation) {
      html += `
        <tr class="add-row">
          <td colspan="8">
            <button id="add-piece-btn" class="btn btn-sm btn-primary">+ Ajouter une barre à découper</button>
          </td>
        </tr>
      `;
    }
    
    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
    
    // Configurer les gestionnaires d'événements
    if (!this.controller.lockOptions.lockPieceCreation) {
      const addBtn = document.getElementById('add-piece-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          this.controller.openPiecePanel('create');
        });
      }
    }
    
    document.querySelectorAll('.edit-piece-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        this.controller.openPiecePanel('edit', key);
      });
    });
    
    document.querySelectorAll('.delete-piece-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (this.controller.dataManager.deletePiece(key)) {
          this.renderPiecesTable();
          this.controller.updateAllProfileSelects();
        } else {
          this.controller.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    });
  },

  /**
   * Rend le tableau des barres mères avec tri automatique
   */
  renderStockBarsTable: function() {
    const tableContainer = document.querySelector('#stock-bars-table');
    const data = this.controller.dataManager.getData();
    
    const allMotherBars = [];
    for (const profile in data.motherBars) {
      allMotherBars.push(...data.motherBars[profile]);
    }
    
    const sortedBars = this.sortBars(allMotherBars);
    
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Profil</th>
            <th>Longueur</th>
            <th>Quantité</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    for (const bar of sortedBars) {
      const barKey = this.controller.dataManager.generateMotherBarKey(bar);
      const lengthInMilimeters = UIUtils.formatLenght(bar.length);
      html += `
        <tr data-key="${barKey}">
          <td>${bar.profile}</td>
          <td>${lengthInMilimeters} mm</td>
          <td>${bar.quantity}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-action-edit edit-stock-btn" 
                      data-key="${barKey}" 
                      title="Éditer">
                <img src="assets/edit.svg" alt="Éditer" class="btn-icon">
              </button>
              <button class="btn-action btn-action-delete delete-stock-btn" 
                      data-key="${barKey}" 
                      title="Supprimer">
                <img src="assets/delete.svg" alt="Supprimer" class="btn-icon">
              </button>
            </div>
          </td>
        </tr>
      `;
    }
    
    html += `
      <tr class="add-row">
        <td colspan="4">
          <button id="add-stock-btn" class="btn btn-sm btn-primary">+ Ajouter une barre mère</button>
        </td>
      </tr>
    </tbody>
    </table>
    `;
    
    tableContainer.innerHTML = html;
    
    document.getElementById('add-stock-btn').addEventListener('click', () => {
      this.controller.openStockPanel('create');
    });
    
    document.querySelectorAll('.edit-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        this.controller.openStockPanel('edit', key);
      });
    });
    
    document.querySelectorAll('.delete-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (this.controller.dataManager.deleteMotherBar(key)) {
          this.renderStockBarsTable();
          this.controller.updateAllProfileSelects();
        } else {
          this.controller.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    });
  },

  /**
   * Ouvre le panneau des barres filles
   */
  openPiecePanel: function(mode, key = null) {
    const panel = document.getElementById('piece-panel');
    const form = panel.querySelector('.panel-form');
    const title = panel.querySelector('.panel-title');
    
    form.innerHTML = '';
    
    if (mode === 'edit') {
      const item = this.controller.dataManager.getPieceByKey(key);
      if (!item) return;
      
      title.textContent = `Éditer la barre ${item.nom || item.profile}`;
      
      const lengthDisabled = this.controller.lockOptions.lockPieceLengths ? 'disabled' : '';
      const angleDisabled = this.controller.lockOptions.lockPieceAngles ? 'disabled' : '';
      
      form.innerHTML = `
        <div class="form-group">
          <label for="piece-nom">Nom :</label>
          <input type="text" id="piece-nom" value="${item.nom || ''}" placeholder="Nom de la barre">
        </div>
        <div class="form-group">
          <label for="piece-profile">Profil :</label>
          <div class="profile-input-container">
            <select id="piece-profile-select" class="profile-select">
              <option value="custom">Saisie personnalisée</option>
              ${this.controller.getProfileOptions(item.profile)}
            </select>
            <input type="text" id="piece-profile" class="profile-input" value="${item.profile}" placeholder="ex: HEA100">
          </div>
        </div>
        <div class="form-group">
          <label for="piece-orientation">Orientation :</label>
          <select id="piece-orientation">
            <option value="a-plat" ${item.orientation === 'a-plat' ? 'selected' : ''}>À plat</option>
            <option value="debout" ${item.orientation === 'debout' ? 'selected' : ''}>Debout</option>
          </select>
        </div>
        <div class="form-group">
          <label for="piece-quantity">Quantité :</label>
          <input type="number" id="piece-quantity" min="1" max="10000" value="${item.quantity}">
        </div>
        <div class="form-group">
          <label for="piece-length">Longueur (mm) ${this.controller.lockOptions.lockPieceLengths ? '(verrouillée)' : ''} :</label>
          <input type="number" id="piece-length" min="1" max="100000" value="${item.length}" ${lengthDisabled}>
          ${this.controller.lockOptions.lockPieceLengths ? '<small class="form-help">La longueur ne peut pas être modifiée pour les barres importées</small>' : ''}
        </div>
        <div class="form-group">
          <label for="piece-angle-1">Angle 1 (°) ${this.controller.lockOptions.lockPieceAngles ? '(verrouillé)' : ''} :</label>
          <input type="number" id="piece-angle-1" min="-360" max="360" step="0.01" value="${parseFloat(item.angles?.[1] || 90).toFixed(2)}" ${angleDisabled}>
          ${this.controller.lockOptions.lockPieceAngles ? '<small class="form-help">Les angles ne peuvent pas être modifiés pour les barres importées</small>' : ''}
        </div>
        <div class="form-group">
          <label for="piece-angle-2">Angle 2 (°) ${this.controller.lockOptions.lockPieceAngles ? '(verrouillé)' : ''} :</label>
          <input type="number" id="piece-angle-2" min="-360" max="360" step="0.01" value="${parseFloat(item.angles?.[2] || 90).toFixed(2)}" ${angleDisabled}>
        </div>
      `;
      
      this.initializeProfileSystem(item.profile);
    } else {
      title.textContent = 'Nouvelle barre à découper';
      
      form.innerHTML = `
        <div class="form-group">
          <label for="piece-nom">Nom :</label>
          <input type="text" id="piece-nom" placeholder="Nom de la barre (optionnel)">
        </div>
        <div class="form-group">
          <label for="piece-profile">Profil :</label>
          <div class="profile-input-container">
            <select id="piece-profile-select" class="profile-select">
              <option value="custom">Saisie personnalisée</option>
              ${this.controller.getProfileOptions()}
            </select>
            <input type="text" id="piece-profile" class="profile-input" placeholder="ex: HEA100">
          </div>
        </div>
        <div class="form-group">
          <label for="piece-orientation">Orientation :</label>
          <select id="piece-orientation">
            <option value="a-plat">À plat</option>
            <option value="debout">Debout</option>
          </select>
        </div>
        <div class="form-group">
          <label for="piece-quantity">Quantité :</label>
          <input type="number" id="piece-quantity" min="1" max="10000" value="1">
        </div>
        <div class="form-group">
          <label for="piece-length">Longueur (mm) :</label>
          <input type="number" id="piece-length" min="1" max="100000" placeholder="ex: 300">
        </div>
        <div class="form-group">
          <label for="piece-angle-1">Angle 1 (°) :</label>
          <input type="number" id="piece-angle-1" min="-360" max="360" step="0.01" value="90.00">
        </div>
        <div class="form-group">
          <label for="piece-angle-2">Angle 2 (°) :</label>
          <input type="number" id="piece-angle-2" min="-360" max="360" step="0.01" value="90.00">
        </div>
      `;
      
      this.initializeProfileSystem();
    }
    
    this.setupFormKeyHandlers();
    this.openPanel('piece-panel');
  },

  /**
   * Ouvre le panneau des barres mères
   */
  openStockPanel: function(mode, key = null) {
    const panel = document.getElementById('stock-panel');
    const form = panel.querySelector('.panel-form');
    const title = panel.querySelector('.panel-title');
    
    form.innerHTML = '';
    
    if (mode === 'edit') {
      const item = this.controller.dataManager.getMotherBarByKey(key);
      if (!item) return;
      
      title.textContent = `Éditer la barre mère ${item.profile}`;
      
      const lengthInMilimeters = UIUtils.formatLenght(item.length);
      
      form.innerHTML = `
        <div class="form-group">
          <label for="stock-profile">Profil :</label>
          <div class="profile-input-container">
            <select id="stock-profile-select" class="profile-select">
              <option value="custom">Saisie personnalisée</option>
              ${this.controller.getProfileOptions(item.profile)}
            </select>
            <input type="text" id="stock-profile" class="profile-input" value="${item.profile}" placeholder="ex: HEA100">
          </div>
          <small class="form-help">Sélectionnez un profil existant ou saisissez-en un nouveau</small>
        </div>
        <div class="form-group">
          <label for="stock-length">Longueur (mm) :</label>
          <input type="text" id="stock-length" value="${lengthInMilimeters}" placeholder="ex : 12000">
          <small class="form-help">Saisissez la longueur en milimètres</small>
        </div>
        <div class="form-group">
          <label for="stock-quantity">Quantité :</label>
          <input type="number" id="stock-quantity" min="1" max="1000000" value="${item.quantity}">
          <small class="form-help">Quantité disponible (1000000 = illimitée)</small>
        </div>
      `;
      
      // Initialiser le système de profil pour les barres mères
      this.initializeStockProfileSystem(item.profile);
    } else {
      title.textContent = 'Nouvelle barre mère';
      
      form.innerHTML = `
        <div class="form-group">
          <label for="stock-profile">Profil :</label>
          <div class="profile-input-container">
            <select id="stock-profile-select" class="profile-select">
              <option value="custom">Saisie personnalisée</option>
              ${this.controller.getProfileOptions()}
            </select>
            <input type="text" id="stock-profile" class="profile-input" placeholder="ex: HEA100">
          </div>
          <small class="form-help">Sélectionnez un profil existant ou saisissez-en un nouveau</small>
        </div>
        <div class="form-group">
          <label for="stock-length">Longueur (mm) :</label>
          <input type="text" id="stock-length" placeholder="ex : 12000">
          <small class="form-help">Saisissez la longueur en milimètres</small>
        </div>
        <div class="form-group">
          <label for="stock-quantity">Quantité :</label>
          <input type="number" id="stock-quantity" min="1" max="1000000" value="1000000">
          <small class="form-help">Quantité disponible (1000000 = illimitée)</small>
        </div>
      `;
      
      // MODIFIÉ: Initialiser le système de profil avec le premier profil disponible
      this.initializeStockProfileSystemForNew();
    }
    
    const lengthInput = document.getElementById('stock-length');
    if (lengthInput) {
      this.setupLengthInputHandlers(lengthInput);
    }
    
    this.setupFormKeyHandlers();
    this.openPanel('stock-panel');
    
    // MODIFIÉ: Focus sur le champ longueur pour les nouvelles barres mères
    if (mode === 'create') {
      setTimeout(() => {
        const lengthField = document.getElementById('stock-length');
        if (lengthField) {
          lengthField.focus();
          lengthField.select();
          console.log('🎯 Focus automatique sur le champ longueur pour nouvelle barre mère');
        }
      }, 400);
    }
  },

  /**
   * Ferme le panneau d'édition actif
   */
  closePanel: function() {
    const panels = ['piece-panel', 'stock-panel'];
    const overlay = document.getElementById('panel-overlay');
    
    panels.forEach(panelId => {
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.remove('visible');
    });
    
    if (overlay) overlay.classList.remove('visible');
    
    document.body.classList.remove('panel-open');
    
    this.removeGlobalKeyHandlers();
    
    this.controller.editingKey = null;
    this.controller.editingType = null;
    this.controller.editingMode = null;
  },

  /**
   * Ouvre un panneau générique
   */
  openPanel: function(panelId) {
    console.log('🔧 Ouverture du panneau:', panelId);
    
    const panel = document.getElementById(panelId);
    const overlay = document.getElementById('panel-overlay');
    
    if (!panel) {
      console.error('❌ Panneau non trouvé:', panelId);
      return;
    }
    
    if (!overlay) {
      console.error('❌ Overlay non trouvé');
      return;
    }
    
    document.body.classList.add('panel-open');
    console.log('🔒 Défilement de la page bloqué');
    
    panel.classList.add('visible');
    overlay.classList.add('visible');
    console.log('👁️ Panneau et overlay affichés');
    
    // MODIFIÉ: Ne pas faire de focus automatique ici, c'est géré dans openStockPanel
    // Le focus sera fait spécifiquement pour chaque type de panneau
  },

  /**
   * Initialise le système de profil avec dropdown et champ éditable
   */
  initializeProfileSystem: function(currentValue = '') {
    const profileSelect = document.getElementById('piece-profile-select');
    const profileInput = document.getElementById('piece-profile');
    
    if (!profileSelect || !profileInput) return;
    
    let isCustomMode = false;
    
    if (currentValue && currentValue.trim() !== '') {
      const matchingOption = Array.from(profileSelect.options)
        .find(option => option.value === currentValue && option.value !== 'custom');
      
      if (matchingOption) {
        profileSelect.value = currentValue;
        profileInput.value = currentValue;
        profileInput.readOnly = true;
        isCustomMode = false;
      } else {
        profileSelect.value = 'custom';
        profileInput.value = currentValue;
        profileInput.readOnly = false;
        isCustomMode = true;
      }
    } else {
      profileSelect.value = 'custom';
      profileInput.value = '';
      profileInput.readOnly = false;
      isCustomMode = true;
    }
    
    profileSelect.addEventListener('change', () => {
      if (profileSelect.value === 'custom') {
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      } else {
        profileInput.value = profileSelect.value;
        profileInput.readOnly = true;
      }
    });
    
    profileInput.addEventListener('click', () => {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      }
    });
    
    profileInput.addEventListener('input', () => {
      if (!profileInput.readOnly) {
        if (profileSelect.value !== 'custom') {
          profileSelect.value = 'custom';
        }
      }
    });
    
    profileInput.addEventListener('focus', () => {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        setTimeout(() => {
          profileInput.focus();
          profileInput.select();
        }, 0);
      }
    });
    
    this.updateProfileInputStyles(profileInput, isCustomMode);
  },

  /**
   * Met à jour les styles visuels du champ de profil
   */
  updateProfileInputStyles: function(profileInput, isCustomMode) {
    if (isCustomMode) {
      profileInput.classList.add('custom-mode');
      profileInput.classList.remove('readonly-mode');
    } else {
      profileInput.classList.add('readonly-mode');
      profileInput.classList.remove('custom-mode');
    }
  },

  /**
   * Initialise le système de profil pour les barres mères avec dropdown et champ éditable
   */
  initializeStockProfileSystem: function(currentValue = '') {
    const profileSelect = document.getElementById('stock-profile-select');
    const profileInput = document.getElementById('stock-profile');
    
    if (!profileSelect || !profileInput) return;
    
    let isCustomMode = false;
    
    if (currentValue && currentValue.trim() !== '') {
      const matchingOption = Array.from(profileSelect.options)
        .find(option => option.value === currentValue && option.value !== 'custom');
      
      if (matchingOption) {
        profileSelect.value = currentValue;
        profileInput.value = currentValue;
        profileInput.readOnly = true;
        isCustomMode = false;
      } else {
        profileSelect.value = 'custom';
        profileInput.value = currentValue;
        profileInput.readOnly = false;
        isCustomMode = true;
      }
    } else {
      profileSelect.value = 'custom';
      profileInput.value = '';
      profileInput.readOnly = false;
      isCustomMode = true;
    }
    
    profileSelect.addEventListener('change', () => {
      if (profileSelect.value === 'custom') {
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      } else {
        profileInput.value = profileSelect.value;
        profileInput.readOnly = true;
      }
      
      // Mettre à jour les styles
      this.updateProfileInputStyles(profileInput, profileSelect.value === 'custom');
    });
    
    profileInput.addEventListener('click', () => {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
        this.updateProfileInputStyles(profileInput, true);
      }
    });
    
    profileInput.addEventListener('input', () => {
      if (!profileInput.readOnly) {
        if (profileSelect.value !== 'custom') {
          profileSelect.value = 'custom';
        }
      }
    });
    
    profileInput.addEventListener('focus', () => {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        setTimeout(() => {
          profileInput.focus();
          profileInput.select();
        }, 0);
        this.updateProfileInputStyles(profileInput, true);
      }
    });
  },

  /**
   * NOUVEAU: Initialise le système de profil pour les nouvelles barres mères avec le premier profil disponible
   */
  initializeStockProfileSystemForNew: function() {
    const profileSelect = document.getElementById('stock-profile-select');
    const profileInput = document.getElementById('stock-profile');
    
    if (!profileSelect || !profileInput) return;
    
    // Chercher le premier profil disponible (non "custom")
    const firstAvailableProfile = Array.from(profileSelect.options)
      .find(option => option.value !== 'custom');
    
    if (firstAvailableProfile) {
      // Utiliser le premier profil disponible
      profileSelect.value = firstAvailableProfile.value;
      profileInput.value = firstAvailableProfile.value;
      profileInput.readOnly = true;
      this.updateProfileInputStyles(profileInput, false); // false = pas en mode custom
    } else {
      // Pas de profil disponible, utiliser le mode custom
      profileSelect.value = 'custom';
      profileInput.value = '';
      profileInput.readOnly = false;
      this.updateProfileInputStyles(profileInput, true); // true = mode custom
    }
    
    // Configurer les gestionnaires d'événements
    profileSelect.addEventListener('change', () => {
      if (profileSelect.value === 'custom') {
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      } else {
        profileInput.value = profileSelect.value;
        profileInput.readOnly = true;
      }
      
      // Mettre à jour les styles
      this.updateProfileInputStyles(profileInput, profileSelect.value === 'custom');
    });
    
    profileInput.addEventListener('click', () => {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
        this.updateProfileInputStyles(profileInput, true);
      }
    });
    
    profileInput.addEventListener('input', () => {
      if (!profileInput.readOnly) {
        if (profileSelect.value !== 'custom') {
          profileSelect.value = 'custom';
        }
      }
    });
    
    profileInput.addEventListener('focus', () => {
      if (profileInput.readOnly) {
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        setTimeout(() => {
          profileInput.focus();
          profileInput.select();
        }, 0);
        this.updateProfileInputStyles(profileInput, true);
      }
    });
  },

  /**
   * Configure les gestionnaires pour les champs de longueur
   */
  setupLengthInputHandlers: function(inputElement) {
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.controller.saveItem();
      }
    });
    
    inputElement.addEventListener('blur', (e) => {
      const value = e.target.value.trim();
      if (value !== '') {
        const parsed = EditValidation.parseLengthFromDisplay(value);
        if (parsed !== null) {
          e.target.value = UIUtils.formatLenght(parsed);
        }
      }
    });
  },

  /**
   * Configure les gestionnaires pour tous les champs du formulaire
   */
  setupFormKeyHandlers: function() {
    const form = document.querySelector('.panel-form');
    if (!form) return;
    
    const globalKeyHandler = (e) => {
      if (e.key === 'Enter') {
        const piecePanel = document.getElementById('piece-panel');
        const stockPanel = document.getElementById('stock-panel');
        const isPanelOpen = (piecePanel && piecePanel.classList.contains('visible')) || 
                          (stockPanel && stockPanel.classList.contains('visible'));
        
        if (isPanelOpen) {
          e.preventDefault();
          e.stopPropagation();
          this.controller.saveItem();
        }
      }
    };
    
    if (this._globalKeyHandler) {
      document.removeEventListener('keydown', this._globalKeyHandler);
    }
    
    this._globalKeyHandler = globalKeyHandler;
    document.addEventListener('keydown', this._globalKeyHandler);
    
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.controller.saveItem();
      }
    });
  },

  /**
   * Supprime les gestionnaires d'événements globaux
   */
  removeGlobalKeyHandlers: function() {
    if (this._globalKeyHandler) {
      document.removeEventListener('keydown', this._globalKeyHandler);
      this._globalKeyHandler = null;
    }
  },

  /**
   * Crée le panneau des barres filles
   */
  createPiecePanel: function() {
    if (document.getElementById('piece-panel')) return;
    
    if (!document.getElementById('panel-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'panel-overlay';
      overlay.className = 'panel-overlay';
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closePanel();
        }
      });
      
      overlay.addEventListener('wheel', (e) => {
        e.preventDefault();
      }, { passive: false });
      
      document.body.appendChild(overlay);
    }
    
    const panel = document.createElement('div');
    panel.id = 'piece-panel';
    panel.className = 'side-panel piece-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">Barre à découper</h3>
        <button class="panel-close">&times;</button>
      </div>
      <div class="panel-form">
        <!-- Le contenu du formulaire sera généré dynamiquement -->
      </div>
      <div class="panel-actions">
        <button class="btn btn-secondary cancel-btn">Annuler</button>
        <button class="btn btn-primary save-btn">Enregistrer</button>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    panel.querySelector('.panel-close').addEventListener('click', () => this.closePanel());
    panel.querySelector('.cancel-btn').addEventListener('click', () => this.closePanel());
    panel.querySelector('.save-btn').addEventListener('click', () => this.controller.saveItem());
  },

  /**
   * Crée le panneau des barres mères
   */
  createStockPanel: function() {
    if (document.getElementById('stock-panel')) return;
    
    if (!document.getElementById('panel-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'panel-overlay';
      overlay.className = 'panel-overlay';
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closePanel();
        }
      });
      
      overlay.addEventListener('wheel', (e) => {
        e.preventDefault();
      }, { passive: false });
      
      document.body.appendChild(overlay);
    }
    
    const panel = document.createElement('div');
    panel.id = 'stock-panel';
    panel.className = 'side-panel stock-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">Barre mère</h3>
        <button class="panel-close">&times;</button>
      </div>
      <div class="panel-form">
        <!-- Le contenu du formulaire sera généré dynamiquement -->
      </div>
      <div class="panel-actions">
        <button class="btn btn-secondary cancel-btn">Annuler</button>
        <button class="btn btn-primary save-btn">Enregistrer</button>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    panel.querySelector('.panel-close').addEventListener('click', () => this.closePanel());
    panel.querySelector('.cancel-btn').addEventListener('click', () => this.closePanel());
    panel.querySelector('.save-btn').addEventListener('click', () => this.controller.saveItem());
  }
};