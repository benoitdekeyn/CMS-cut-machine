import { UIUtils } from './utils.js';

/**
 * Gestionnaire de la section d'édition (SANS ID)
 */
export const EditHandler = {
  // Dépendances
  dataManager: null,
  showNotification: null,
  refreshDataDisplay: null,
  
  // État interne (utilise des clés au lieu d'IDs)
  editingKey: null,
  editingType: null,
  editingMode: null, // 'edit' ou 'create'
  
  // Options de verrouillage
  lockOptions: {
    lockPieceCreation: true,    // Empêche l'ajout de nouvelles barres filles
    lockPieceAngles: true,      // Empêche la modification des angles
    lockPieceLengths: true      // Empêche la modification des longueurs
  },
  
  /**
   * Initialise le handler d'édition
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.showNotification = options.showNotification;
    this.refreshDataDisplay = options.refreshDataDisplay;
    
    // Appliquer les options de verrouillage si fournies
    if (options.lockOptions) {
      this.lockOptions = { ...this.lockOptions, ...options.lockOptions };
    }
    
    // Créer les panneaux latéraux s'ils n'existent pas
    this.createPiecePanel();
    this.createStockPanel();
  },
  
  /**
   * NOUVEAU: Convertit une valeur en milimètres (avec virgule ou point)
   */
  parseLengthFromDisplay: function(displayValue) {
    if (!displayValue || displayValue.trim() === '') return null;
    
    // Remplacer la virgule par un point pour la conversion
    const normalizedValue = displayValue.replace(',', '.');
    const milimeters = parseFloat(normalizedValue);
    
    if (isNaN(milimeters) || milimeters <= 0) return null;
    
    // Convertir en centimètres et arrondir
    return Math.round(milimeters);
  },
  
  /**
   * NOUVEAU: Configure les gestionnaires d'événements pour les champs de longueur
   */
  setupLengthInputHandlers: function(inputElement) {
    // Gérer la touche Entrée
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveItem();
      }
    });
    
    // Formatage automatique lors de la perte de focus seulement
    inputElement.addEventListener('blur', (e) => {
      const value = e.target.value.trim();
      if (value !== '') {
        const parsed = this.parseLengthFromDisplay(value);
        if (parsed !== null) {
          e.target.value = UIUtils.formatLenght(parsed);
        }
      }
    });
  },
  
  /**
   * CORRECTION COMPLÈTE: Configure les gestionnaires pour tous les champs du formulaire
   */
  setupFormKeyHandlers: function() {
    // Supprimer tous les anciens gestionnaires pour éviter les doublons
    const form = document.querySelector('.panel-form');
    if (!form) return;
    
    // Créer un gestionnaire unique pour toute la fenêtre quand un panneau est ouvert
    const globalKeyHandler = (e) => {
      if (e.key === 'Enter') {
        // Vérifier qu'un panneau est ouvert
        const piecePanel = document.getElementById('piece-panel');
        const stockPanel = document.getElementById('stock-panel');
        const isPanelOpen = (piecePanel && piecePanel.classList.contains('visible')) || 
                          (stockPanel && stockPanel.classList.contains('visible'));
        
        if (isPanelOpen) {
          e.preventDefault();
          e.stopPropagation();
          this.saveItem();
        }
      }
    };
    
    // Supprimer l'ancien gestionnaire s'il existe
    if (this._globalKeyHandler) {
      document.removeEventListener('keydown', this._globalKeyHandler);
    }
    
    // Ajouter le nouveau gestionnaire global
    this._globalKeyHandler = globalKeyHandler;
    document.addEventListener('keydown', this._globalKeyHandler);
    
    // Également ajouter sur le formulaire comme backup
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.saveItem();
      }
    });
  },
  
  /**
   * NOUVEAU: Supprime les gestionnaires d'événements globaux
   */
  removeGlobalKeyHandlers: function() {
    if (this._globalKeyHandler) {
      document.removeEventListener('keydown', this._globalKeyHandler);
      this._globalKeyHandler = null;
    }
  },
  
  /**
   * Méthode pour rafraîchir les tableaux
   */
  refreshTables: function() {
    this.renderSection();
  },
  
  /**
   * Rend la section d'édition
   */
  renderSection: function() {
    this.renderPiecesTable();
    this.renderStockBarsTable();
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
   * @param {Array} bars - Tableau de barres à trier
   * @returns {Array} - Tableau trié
   */
  sortBars: function(bars) {
    return bars.sort((a, b) => {
      // 1. Trier par profil
      if (a.profile !== b.profile) {
        return a.profile.localeCompare(b.profile);
      }
      
      // 2. Trier par orientation (pour les pièces uniquement)
      if (a.orientation && b.orientation && a.orientation !== b.orientation) {
        const orientationOrder = { 'a-plat': 0, 'debout': 1 };
        const orderA = orientationOrder[a.orientation] !== undefined ? orientationOrder[a.orientation] : 2;
        const orderB = orientationOrder[b.orientation] !== undefined ? orientationOrder[b.orientation] : 2;
        return orderA - orderB;
      }
      
      // 3. Trier par longueur
      return a.length - b.length;
    });
  },

  /**
   * Rend le tableau des barres filles avec tri automatique (adapté sans ID)
   */
  renderPiecesTable: function() {
    const tableContainer = document.querySelector('#pieces-table');
    const data = this.dataManager.getData();
    
    // Récupérer toutes les barres filles
    const allPieces = [];
    for (const profile in data.pieces) {
      allPieces.push(...data.pieces[profile]);
    }
    
    // Trier les barres selon l'ordre défini
    const sortedPieces = this.sortBars(allPieces);
    
    // Générer l'en-tête du tableau
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
    
    // Générer les lignes du tableau
    for (const piece of sortedPieces) {
      const pieceKey = this.dataManager.generatePieceKey(piece);
      html += `
        <tr data-key="${pieceKey}">
          <td>${piece.nom || '-'}</td>
          <td>${piece.profile}</td>
          <td>${this.formatOrientation(piece.orientation || "non-définie")}</td>
          <td>${Math.round(piece.length)} mm</td>
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
    
    // Ajouter une ligne pour le bouton d'ajout seulement si non verrouillé
    if (!this.lockOptions.lockPieceCreation) {
      html += `
        <tr class="add-row">
          <td colspan="8">
            <button id="add-piece-btn" class="btn btn-sm btn-primary">+ Ajouter une barre à découper</button>
          </td>
        </tr>
      `;
    }
    
    html += `
      </tbody>
    </table>
    `;
    
    tableContainer.innerHTML = html;
    
    // Configurer les gestionnaires d'événements
    if (!this.lockOptions.lockPieceCreation) {
      const addBtn = document.getElementById('add-piece-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          this.openPiecePanel('create');
        });
      }
    }
    
    document.querySelectorAll('.edit-piece-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        this.openPiecePanel('edit', key);
      });
    });
    
    document.querySelectorAll('.delete-piece-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (this.dataManager.deletePiece(key)) {
          this.renderPiecesTable(); // Re-render avec tri automatique
          this.updateAllProfileSelects();
        } else {
          this.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    });
  },
  
  /**
   * Rend le tableau des barres mères avec tri automatique et longueurs en mètres (adapté sans ID)
   */
  renderStockBarsTable: function() {
    const tableContainer = document.querySelector('#stock-bars-table');
    const data = this.dataManager.getData();
    
    // Récupérer toutes les barres mères
    const allMotherBars = [];
    for (const profile in data.motherBars) {
      allMotherBars.push(...data.motherBars[profile]);
    }
    
    // Trier les barres selon l'ordre défini (profil puis longueur pour les barres mères)
    const sortedBars = this.sortBars(allMotherBars);
    
    // Générer l'en-tête du tableau
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
    
    // Générer les lignes du tableau avec longueurs en mètres
    for (const bar of sortedBars) {
      const barKey = this.dataManager.generateMotherBarKey(bar);
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
    
    // Ajouter une ligne pour le bouton d'ajout
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
    
    // Configurer les gestionnaires d'événements
    document.getElementById('add-stock-btn').addEventListener('click', () => {
      this.openStockPanel('create');
    });
    
    document.querySelectorAll('.edit-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        this.openStockPanel('edit', key);
      });
    });
    
    document.querySelectorAll('.delete-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (this.dataManager.deleteMotherBar(key)) {
          this.renderStockBarsTable(); // Re-render avec tri automatique
          this.updateAllProfileSelects();
        } else {
          this.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    });
  },
  
  /**
   * Ouvre le panneau des barres filles (édition ou création) - adapté sans ID
   */
  openPiecePanel: function(mode, key = null) {
    // Vérifier si la création est verrouillée
    if (mode === 'create' && this.lockOptions.lockPieceCreation) {
      this.showNotification('La création de nouvelles barres filles est désactivée', 'warning');
      return;
    }
    
    this.editingMode = mode;
    this.editingKey = key;
    this.editingType = 'piece';
    
    const panel = document.getElementById('piece-panel');
    const form = panel.querySelector('.panel-form');
    const title = panel.querySelector('.panel-title');
    
    // Vider le formulaire
    form.innerHTML = '';
    
    if (mode === 'edit') {
      const item = this.dataManager.getPieceByKey(key);
      if (!item) return;
      
      title.textContent = `Éditer la barre ${item.nom || item.profile}`;
      
      // Déterminer si les champs doivent être désactivés
      const lengthDisabled = this.lockOptions.lockPieceLengths ? 'disabled' : '';
      const angleDisabled = this.lockOptions.lockPieceAngles ? 'disabled' : '';
      
      // MODIFICATION: Réorganisation des champs - orientation et quantité après profil
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
              ${this.getProfileOptions(item.profile)}
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
          <label for="piece-length">Longueur (mm) ${this.lockOptions.lockPieceLengths ? '(verrouillée)' : ''} :</label>
          <input type="number" id="piece-length" min="1" max="100000" value="${item.length}" ${lengthDisabled}>
          ${this.lockOptions.lockPieceLengths ? '<small class="form-help">La longueur ne peut pas être modifiée pour les barres importées</small>' : ''}
        </div>
        <div class="form-group">
          <label for="piece-angle-1">Angle 1 (°) ${this.lockOptions.lockPieceAngles ? '(verrouillé)' : ''} :</label>
          <input type="number" id="piece-angle-1" min="-360" max="360" step="0.01" value="${parseFloat(item.angles?.[1] || 90).toFixed(2)}" ${angleDisabled}>
          ${this.lockOptions.lockPieceAngles ? '<small class="form-help">Les angles ne peuvent pas être modifiés pour les barres importées</small>' : ''}
        </div>
        <div class="form-group">
          <label for="piece-angle-2">Angle 2 (°) ${this.lockOptions.lockPieceAngles ? '(verrouillé)' : ''} :</label>
          <input type="number" id="piece-angle-2" min="-360" max="360" step="0.01" value="${parseFloat(item.angles?.[2] || 90).toFixed(2)}" ${angleDisabled}>
        </div>
      `;
      
      // Initialiser le système de profil
      this.initializeProfileSystem(item.profile);
      
    } else {
      title.textContent = 'Nouvelle barre à découper';
      
      // MODIFICATION: Même réorganisation pour le mode création
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
              ${this.getProfileOptions()}
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
      
      // Initialiser le système de profil sans valeur prédéfinie
      this.initializeProfileSystem();
    }
    
    // Configurer les gestionnaires après génération du formulaire
    this.setupFormKeyHandlers();
    
    // Utiliser la méthode d'ouverture
    this.openPanel('piece-panel');
  },

  /**
   * NOUVEAU: Initialise le système de profil avec dropdown et champ éditable
   */
  initializeProfileSystem: function(currentValue = '') {
    const profileSelect = document.getElementById('piece-profile-select');
    const profileInput = document.getElementById('piece-profile');
    
    if (!profileSelect || !profileInput) return;
    
    // Déterminer l'état initial
    let isCustomMode = false;
    
    if (currentValue && currentValue.trim() !== '') {
      // Vérifier si la valeur actuelle existe dans les options
      const matchingOption = Array.from(profileSelect.options)
        .find(option => option.value === currentValue && option.value !== 'custom');
      
      if (matchingOption) {
        // Profil existant : sélectionner dans le dropdown
        profileSelect.value = currentValue;
        profileInput.value = currentValue;
        profileInput.readOnly = true;
        isCustomMode = false;
      } else {
        // Profil personnalisé : mode saisie
        profileSelect.value = 'custom';
        profileInput.value = currentValue;
        profileInput.readOnly = false;
        isCustomMode = true;
      }
    } else {
      // Nouveau : mode saisie par défaut
      profileSelect.value = 'custom';
      profileInput.value = '';
      profileInput.readOnly = false;
      isCustomMode = true;
    }
    
    // Gestionnaire pour le changement de dropdown
    profileSelect.addEventListener('change', () => {
      if (profileSelect.value === 'custom') {
        // Mode saisie personnalisée
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      } else {
        // Mode profil existant
        profileInput.value = profileSelect.value;
        profileInput.readOnly = true;
      }
    });
    
    // Gestionnaire pour le clic sur le champ de saisie
    profileInput.addEventListener('click', () => {
      if (profileInput.readOnly) {
        // Passer en mode saisie personnalisée
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        profileInput.focus();
        profileInput.select();
      }
    });
    
    // Gestionnaire pour la saisie dans le champ
    profileInput.addEventListener('input', () => {
      if (!profileInput.readOnly) {
        // En mode saisie, s'assurer que le dropdown est sur "custom"
        if (profileSelect.value !== 'custom') {
          profileSelect.value = 'custom';
        }
      }
    });
    
    // Gestionnaire pour le focus sur le champ
    profileInput.addEventListener('focus', () => {
      if (profileInput.readOnly) {
        // Si on focus sur un champ en lecture seule, passer en mode saisie
        profileSelect.value = 'custom';
        profileInput.readOnly = false;
        // Maintenir le focus et sélectionner le texte
        setTimeout(() => {
          profileInput.focus();
          profileInput.select();
        }, 0);
      }
    });
    
    // Appliquer les styles visuels initiaux
    this.updateProfileInputStyles(profileInput, isCustomMode);
  },

  /**
   * NOUVEAU: Met à jour les styles visuels du champ de profil
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
   * Ouvre le panneau des barres mères - adapté sans ID
   */
  openStockPanel: function(mode, key = null) {
    // Vérifier s'il y a des barres filles avant d'ajouter une barre mère
    if (!this.checkPiecesExistBeforeAddingMotherBar(mode)) {
      return;
    }
    
    this.editingMode = mode;
    this.editingKey = key;
    this.editingType = 'stock';
    
    const panel = document.getElementById('stock-panel');
    const form = panel.querySelector('.panel-form');
    const title = panel.querySelector('.panel-title');
    
    // Vider le formulaire
    form.innerHTML = '';
    
    if (mode === 'edit') {
      const item = this.dataManager.getMotherBarByKey(key);
      if (!item) return;
      
      title.textContent = `Éditer la barre mère ${item.profile}`;
      
      // Convertir la longueur en milimètres pour l'affichage
      const lengthInMilimeters = UIUtils.formatLenght(item.length);
      
      // Générer le formulaire d'édition
      form.innerHTML = `
        <div class="form-group">
          <label for="stock-profile">Profil :</label>
          <select id="stock-profile">
            ${this.getProfileOptions(item.profile)}
          </select>
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
    } else {
      // Mode création
      title.textContent = 'Nouvelle barre mère';
      
      form.innerHTML = `
        <div class="form-group">
          <label for="stock-profile">Profil :</label>
          <select id="stock-profile">
            ${this.getProfileOptions()}
          </select>
          <small class="form-help">Sélectionnez un profil existant ou saisissez-en un nouveau</small>
        </div>
        <div class="form-group">
          <label for="stock-length">Longueur (m) :</label>
          <input type="text" id="stock-length" placeholder="ex : 12000">
          <small class="form-help">Saisissez la longueur en milimètres</small>
        </div>
        <div class="form-group">
          <label for="stock-quantity">Quantité :</label>
          <input type="number" id="stock-quantity" min="1" max="1000000" value="1000000">
          <small class="form-help">Quantité disponible (1000000 = illimitée)</small>
        </div>
      `;
    }
    
    // Configurer les gestionnaires spéciaux pour le champ de longueur
    const lengthInput = document.getElementById('stock-length');
    if (lengthInput) {
      this.setupLengthInputHandlers(lengthInput);
    }
    
    // Configurer les gestionnaires après génération du formulaire
    this.setupFormKeyHandlers();
    
    // Utiliser la nouvelle méthode d'ouverture
    this.openPanel('stock-panel');
    
    // AJOUT: Focus automatique sur le champ longueur pour les nouvelles barres mères
    if (mode === 'create') {
      setTimeout(() => {
        const lengthField = document.getElementById('stock-length');
        if (lengthField) {
          lengthField.focus();
          lengthField.select(); // Sélectionner tout le texte s'il y en a
          console.log('🎯 Focus automatique sur le champ longueur pour nouvelle barre mère');
        }
      }, 400); // Délai légèrement plus long pour s'assurer que le panneau est bien affiché
    }
  },

  /**
   * Ferme le panneau d'édition actif et nettoie les gestionnaires
   */
  closePanel: function() {
    const piecePanel = document.getElementById('piece-panel');
    const stockPanel = document.getElementById('stock-panel');
    const overlay = document.getElementById('panel-overlay');
    
    // Masquer les panneaux
    if (piecePanel) piecePanel.classList.remove('visible');
    if (stockPanel) stockPanel.classList.remove('visible');
    if (overlay) overlay.classList.remove('visible');
    
    // AJOUT: Débloquer le défilement de la page
    document.body.classList.remove('panel-open');
    
    // Nettoyer les gestionnaires d'événements globaux
    this.removeGlobalKeyHandlers();
    
    this.editingKey = null;
    this.editingType = null;
    this.editingMode = null;
  },
  
  /**
   * Enregistre les modifications ou crée un nouvel élément - adapté sans ID
   */
  saveItem: function() {
    const type = this.editingType;
    const key = this.editingKey;
    const mode = this.editingMode;
    
    if (!type) return;
    
    let success = false;
    let updatedProfile = false;
    
    if (type === 'piece') {
      const nom = document.getElementById('piece-nom').value.trim();
      const profileValue = document.getElementById('piece-profile').value.trim();
      const quantity = parseInt(document.getElementById('piece-quantity').value, 10);
      const orientation = document.getElementById('piece-orientation').value;
      
      // Récupérer la longueur et les angles seulement si les champs ne sont pas verrouillés
      let length = null;
      let angle1 = 90, angle2 = 90;
      
      if (!this.lockOptions.lockPieceLengths) {
        const lengthInput = document.getElementById('piece-length').value;
        length = parseInt(lengthInput, 10);
      } else if (mode === 'edit') {
        const item = this.dataManager.getPieceByKey(key);
        length = item ? item.length : null;
      }
      
      if (!this.lockOptions.lockPieceAngles) {
        const angle1Input = document.getElementById('piece-angle-1').value;
        const angle2Input = document.getElementById('piece-angle-2').value;
        angle1 = parseFloat(angle1Input);
        angle2 = parseFloat(angle2Input);
      } else if (mode === 'edit') {
        const item = this.dataManager.getPieceByKey(key);
        angle1 = item ? (item.angles?.[1] || 90) : 90;
        angle2 = item ? (item.angles?.[2] || 90) : 90;
      }
      
      // Préparer les données à valider
      const pieceData = {
        nom,
        profile: profileValue,
        length,
        quantity,
        orientation,
        angles: { 1: angle1, 2: angle2 }
      };
      
      // Valider les données
      const errors = this.validatePieceData(pieceData);
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
          // Re-render avec tri automatique
          this.renderPiecesTable();
          
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
          
          // Rafraîchir l'affichage global SANS notification
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          
          // Notification de succès seulement
          if (mode === 'edit') {
            this.showNotification(`Barre modifiée`, 'success');
          }
        }
      }
    } else if (type === 'stock') {
      const profileValue = document.getElementById('stock-profile').value.trim();
      const lengthInput = document.getElementById('stock-length').value.trim();
      const quantity = parseInt(document.getElementById('stock-quantity').value, 10);
      
      // Convertir la longueur de mètres vers centimètres
      const lengthInMm = this.parseLengthFromDisplay(lengthInput);
      
      // Préparer les données à valider
      const motherBarData = {
        profile: profileValue,
        length: lengthInMm,
        quantity
      };
      
      // Valider les données
      const errors = this.validateMotherBarData(motherBarData);
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
          // Re-render avec tri automatique
          this.renderStockBarsTable();
          
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
          
          // Rafraîchir l'affichage global SANS notification
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          
          // Notification de succès seulement
          if (mode === 'edit') {
            this.showNotification(`Barre mère modifiée`, 'success');
          }
        }
      }
    }
    
    if (success) {
      this.closePanel();
    } else {
      this.showNotification('Erreur lors de l\'enregistrement', 'error');
    }
  },
  
  /**
   * MODIFIÉ: Valide les données d'une barre fille
   */
  validatePieceData: function(data) {
    const errors = [];
    
    if (data.nom && data.nom.length > 50) {
      errors.push('Nom trop long (max 50 caractères)');
    }
    
    if (!data.profile || data.profile.trim() === '') {
      errors.push('Profil obligatoire');
    } else if (data.profile.length > 20) {
      errors.push('Profil trop long (max 20 caractères)');
    }
    
    if (!data.length || isNaN(data.length) || data.length <= 0) {
      errors.push('Longueur invalide');
    } else if (data.length > 100000) {
      errors.push('Longueur trop grande (max 100 m)');
    } else if (data.length < 100) {
      errors.push('Longueur minimale 10 cm');
    }
    
    if (!data.quantity || isNaN(data.quantity) || data.quantity <= 0) {
      errors.push('Quantité invalide');
    } else if (!Number.isInteger(data.quantity)) {
      errors.push('Quantité doit être un entier');
    } else if (data.quantity > 10000) {
      errors.push('Quantité trop élevée (max 10 000)');
    }
    
    if (data.angles) {
      if (isNaN(data.angles[1]) || data.angles[1] < -360 || data.angles[1] > 360) {
        errors.push('Angle 1 invalide (-360 à 360°)');
      }
      if (isNaN(data.angles[2]) || data.angles[2] < -360 || data.angles[2] > 360) {
        errors.push('Angle 2 invalide (-360 à 360°)');
      }
    }
    
    if (data.orientation && !['a-plat', 'debout'].includes(data.orientation)) {
      errors.push('Orientation invalide');
    }
    
    return errors;
  },

  /**
   * NOUVEAU: Valide les données d'une barre mère
   */
  validateMotherBarData: function(data) {
    const errors = [];
    
    if (!data.profile || data.profile.trim() === '') {
      errors.push('Profil obligatoire');
    } else if (data.profile.length > 20) {
      errors.push('Profil trop long (max 20 caractères)');
    }
    
    if (!data.length || isNaN(data.length) || data.length <= 0) {
      errors.push('Longueur invalide');
    } else if (data.length > 100000) {
      errors.push('Longueur trop grande (max 100 m)');
    } else if (data.length < 100) {
      errors.push('Longueur minimale 10 cm');
    }
    
    if (!data.quantity || isNaN(data.quantity) || data.quantity <= 0) {
      errors.push('Quantité invalide');
    } else if (!Number.isInteger(data.quantity)) {
      errors.push('Quantité doit être un entier');
    } else if (data.quantity > 1000000) {
      errors.push('Quantité trop élevée (max 1 000 000)');
    }
    
    return errors;
  },

  /**
   * NOUVEAU: Vérifie s'il y a des barres filles avant d'ajouter une barre mère
   */
  checkPiecesExistBeforeAddingMotherBar: function(mode) {
    if (mode === 'create') {
      const data = this.dataManager.getData();
      let totalPieces = 0;
      
      for (const profile in data.pieces) {
        for (const piece of data.pieces[profile]) {
          totalPieces += piece.quantity;
        }
      }
      
      if (totalPieces === 0) {
        this.showNotification('Importez d\'abord des barres à découper', 'warning');
        return false;
      }
    }
    return true;
  },

  /**
   * MODIFICATION: Focus automatique sur le champ longueur pour les nouvelles barres mères
   */
  openStockPanel: function(mode, key = null) {
    // Vérifier s'il y a des barres filles avant d'ajouter une barre mère
    if (!this.checkPiecesExistBeforeAddingMotherBar(mode)) {
      return;
    }
    
    this.editingMode = mode;
    this.editingKey = key;
    this.editingType = 'stock';
    
    const panel = document.getElementById('stock-panel');
    const form = panel.querySelector('.panel-form');
    const title = panel.querySelector('.panel-title');
    
    // Vider le formulaire
    form.innerHTML = '';
    
    if (mode === 'edit') {
      const item = this.dataManager.getMotherBarByKey(key);
      if (!item) return;
      
      title.textContent = `Éditer la barre mère ${item.profile}`;
      
      // Convertir la longueur en milimètres pour l'affichage
      const lengthInMilimeters = UIUtils.formatLenght(item.length);
      
      // Générer le formulaire d'édition
      form.innerHTML = `
        <div class="form-group">
          <label for="stock-profile">Profil :</label>
          <select id="stock-profile">
            ${this.getProfileOptions(item.profile)}
          </select>
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
    } else {
      // Mode création
      title.textContent = 'Nouvelle barre mère';
      
      form.innerHTML = `
        <div class="form-group">
          <label for="stock-profile">Profil :</label>
          <select id="stock-profile">
            ${this.getProfileOptions()}
          </select>
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
    }
    
    // Configurer les gestionnaires spéciaux pour le champ de longueur
    const lengthInput = document.getElementById('stock-length');
    if (lengthInput) {
      this.setupLengthInputHandlers(lengthInput);
    }
    
    // Configurer les gestionnaires après génération du formulaire
    this.setupFormKeyHandlers();
    
    // Utiliser la nouvelle méthode d'ouverture
    this.openPanel('stock-panel');
    
    // AJOUT: Focus automatique sur le champ longueur pour les nouvelles barres mères
    if (mode === 'create') {
      setTimeout(() => {
        const lengthField = document.getElementById('stock-length');
        if (lengthField) {
          lengthField.focus();
          lengthField.select(); // Sélectionner tout le texte s'il y en a
          console.log('🎯 Focus automatique sur le champ longueur pour nouvelle barre mère');
        }
      }, 400); // Délai légèrement plus long pour s'assurer que le panneau est bien affiché
    }
  },

  /**
   * Ferme le panneau d'édition actif et nettoie les gestionnaires
   */
  closePanel: function() {
    const piecePanel = document.getElementById('piece-panel');
    const stockPanel = document.getElementById('stock-panel');
    const overlay = document.getElementById('panel-overlay');
    
    // Masquer les panneaux
    if (piecePanel) piecePanel.classList.remove('visible');
    if (stockPanel) stockPanel.classList.remove('visible');
    if (overlay) overlay.classList.remove('visible');
    
    // AJOUT: Débloquer le défilement de la page
    document.body.classList.remove('panel-open');
    
    // Nettoyer les gestionnaires d'événements globaux
    this.removeGlobalKeyHandlers();
    
    this.editingKey = null;
    this.editingType = null;
    this.editingMode = null;
  },
  
  /**
   * Enregistre les modifications ou crée un nouvel élément - adapté sans ID
   */
  saveItem: function() {
    const type = this.editingType;
    const key = this.editingKey;
    const mode = this.editingMode;
    
    if (!type) return;
    
    let success = false;
    let updatedProfile = false;
    
    if (type === 'piece') {
      const nom = document.getElementById('piece-nom').value.trim();
      const profileValue = document.getElementById('piece-profile').value.trim();
      const quantity = parseInt(document.getElementById('piece-quantity').value, 10);
      const orientation = document.getElementById('piece-orientation').value;
      
      // Récupérer la longueur et les angles seulement si les champs ne sont pas verrouillés
      let length = null;
      let angle1 = 90, angle2 = 90;
      
      if (!this.lockOptions.lockPieceLengths) {
        const lengthInput = document.getElementById('piece-length').value;
        length = parseInt(lengthInput, 10);
      } else if (mode === 'edit') {
        const item = this.dataManager.getPieceByKey(key);
        length = item ? item.length : null;
      }
      
      if (!this.lockOptions.lockPieceAngles) {
        const angle1Input = document.getElementById('piece-angle-1').value;
        const angle2Input = document.getElementById('piece-angle-2').value;
        angle1 = parseFloat(angle1Input);
        angle2 = parseFloat(angle2Input);
      } else if (mode === 'edit') {
        const item = this.dataManager.getPieceByKey(key);
        angle1 = item ? (item.angles?.[1] || 90) : 90;
        angle2 = item ? (item.angles?.[2] || 90) : 90;
      }
      
      // Préparer les données à valider
      const pieceData = {
        nom,
        profile: profileValue,
        length,
        quantity,
        orientation,
        angles: { 1: angle1, 2: angle2 }
      };
      
      // Valider les données
      const errors = this.validatePieceData(pieceData);
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
          // Re-render avec tri automatique
          this.renderPiecesTable();
          
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
          
          // Rafraîchir l'affichage global SANS notification
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          
          // Notification de succès seulement
          if (mode === 'edit') {
            this.showNotification(`Barre modifiée`, 'success');
          }
        }
      }
    } else if (type === 'stock') {
      const profileValue = document.getElementById('stock-profile').value.trim();
      const lengthInput = document.getElementById('stock-length').value.trim();
      const quantity = parseInt(document.getElementById('stock-quantity').value, 10);
      
      // Convertir la longueur de mètres vers centimètres
      const lengthInMm = this.parseLengthFromDisplay(lengthInput);
      
      // Préparer les données à valider
      const motherBarData = {
        profile: profileValue,
        length: lengthInMm,
        quantity
      };
      
      // Valider les données
      const errors = this.validateMotherBarData(motherBarData);
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
          // Re-render avec tri automatique
          this.renderStockBarsTable();
          
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
          
          // Rafraîchir l'affichage global SANS notification
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          
          // Notification de succès seulement
          if (mode === 'edit') {
            this.showNotification(`Barre mère modifiée`, 'success');
          }
        }
      }
    }
    
    if (success) {
      this.closePanel();
    } else {
      this.showNotification('Erreur lors de l\'enregistrement', 'error');
    }
  },
  
  /**
   * Met à jour toutes les listes déroulantes de profils dans l'interface
   */
  updateAllProfileSelects: function() {
    // Mettre à jour la liste des profils dans le panneau d'ajout/édition de barre mère
    const stockProfileSelect = document.getElementById('stock-profile');
    if (stockProfileSelect) {
      const currentValue = stockProfileSelect.value;
      stockProfileSelect.innerHTML = this.getProfileOptions(currentValue);
    }
    
    // Mettre à jour la liste des profils dans le panneau d'ajout/édition de barre fille
    const pieceProfileSelect = document.getElementById('piece-profile-select');
    if (pieceProfileSelect) {
      const currentValue = pieceProfileSelect.value;
      pieceProfileSelect.innerHTML = '<option value="custom">Saisie personnalisée</option>' + this.getProfileOptions(currentValue);
    }
  },
  
  /**
   * Obtient la liste des options de profil pour les selects
   * @param {string} currentValue - Valeur actuelle pour pré-sélection
   * @returns {string} HTML des options
   */
  getProfileOptions: function(currentValue) {
    const data = this.dataManager.getData();
    const profiles = new Set();
    
    // Collecter tous les profils uniques
    for (const profile in data.pieces) {
      profiles.add(profile);
    }
    
    for (const profile in data.motherBars) {
      profiles.add(profile);
    }
    
    // Générer les options HTML
    let optionsHtml = '';
    for (const profile of profiles) {
      const selected = profile === currentValue ? 'selected' : '';
      optionsHtml += `<option value="${profile}" ${selected}>${profile}</option>`;
    }
    
    return optionsHtml;
  },
  
  /**
   * Crée le panneau des barres filles
   */
  createPiecePanel: function() {
    // Vérifier si le panneau existe déjà
    if (document.getElementById('piece-panel')) return;
    
    // S'assurer que l'overlay existe avec les bonnes propriétés
    if (!document.getElementById('panel-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'panel-overlay';
      overlay.className = 'panel-overlay';
      
      // AJOUT: Gestionnaire pour fermer en cliquant sur l'overlay
      overlay.addEventListener('click', (e) => {
        // Seulement fermer si on clique directement sur l'overlay
        if (e.target === overlay) {
          this.closePanel();
        }
      });
      
      // AJOUT: Empêcher le défilement avec la molette
      overlay.addEventListener('wheel', (e) => {
        e.preventDefault();
      }, { passive: false });
      
      document.body.appendChild(overlay);
    }
    
    // Créer le panneau
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
    
    // Ajouter au DOM
    document.body.appendChild(panel);
    
    // Ajouter les gestionnaires d'événements
    panel.querySelector('.panel-close').addEventListener('click', () => this.closePanel());
    panel.querySelector('.cancel-btn').addEventListener('click', () => this.closePanel());
    panel.querySelector('.save-btn').addEventListener('click', () => this.saveItem());
  },
  
  /**
   * Crée le panneau des barres mères
   */
  createStockPanel: function() {
    // Vérifier si le panneau existe déjà
    if (document.getElementById('stock-panel')) return;
    
    // S'assurer que l'overlay existe
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
    
    // Créer le panneau
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
    
    // Ajouter au DOM
    document.body.appendChild(panel);
    
    // Ajouter les gestionnaires d'événements
    panel.querySelector('.panel-close').addEventListener('click', () => this.closePanel());
    panel.querySelector('.cancel-btn').addEventListener('click', () => this.closePanel());
    panel.querySelector('.save-btn').addEventListener('click', () => this.saveItem());
  },
  
  /**
   * AJOUT: Gère l'ouverture d'un panneau avec blocage du défilement
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
    
    // Bloquer le défilement de la page
    document.body.classList.add('panel-open');
    console.log('🔒 Défilement de la page bloqué');
    
    // Afficher le panneau et l'overlay
    panel.classList.add('visible');
    overlay.classList.add('visible');
    console.log('👁️ Panneau et overlay affichés');
    
    // MODIFICATION: Focus par défaut seulement si pas de focus spécifique prévu
    // Le focus spécifique sera géré dans openStockPanel pour le mode 'create'
    if (panelId !== 'stock-panel' || this.editingMode === 'edit') {
      setTimeout(() => {
        const firstInput = panel.querySelector('input, select, textarea');
        if (firstInput && !firstInput.disabled) {
          firstInput.focus();
          console.log('🎯 Focus sur le premier champ');
        }
      }, 300);
    }
  }
};