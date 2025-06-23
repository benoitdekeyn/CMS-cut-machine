/**
 * Gestionnaire de la section d'édition
 */
export const EditHandler = {
  // Dépendances
  dataManager: null,
  showNotification: null,
  
  // État interne
  editingId: null,
  editingType: null,
  editingMode: null, // 'edit' ou 'create'
  
  /**
   * Initialise le handler d'édition
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.showNotification = options.showNotification;
    
    // Créer les panneaux latéraux s'ils n'existent pas
    this.createPiecePanel();
    this.createStockPanel();
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
   * Rend le tableau des barres filles
   */
  renderPiecesTable: function() {
    const tableContainer = document.querySelector('#pieces-table');
    const data = this.dataManager.getData();
    
    // Récupérer toutes les barres filles
    const allPieces = [];
    for (const model in data.pieces) {
      allPieces.push(...data.pieces[model]);
    }
    
    // Trier les barres
    allPieces.sort((a, b) => a.model.localeCompare(b.model) || a.length - b.length);
    
    // Générer l'en-tête du tableau
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Profil</th>
            <th>Orientation</th>
            <th>Longueur</th>
            <th>Angle début</th>
            <th>Angle fin</th>
            <th>Quantité</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    // Générer les lignes du tableau
    for (const piece of allPieces) {
      html += `
        <tr data-id="${piece.id}">
          <td>${piece.profileFull || piece.model}</td>
          <td>${this.formatOrientation(piece.orientation || "non-définie")}</td>
          <td>${piece.length}</td>
          <td>${piece.angles?.start || 90}°</td>
          <td>${piece.angles?.end || 90}°</td>
          <td>${piece.quantity}</td>
          <td>
            <button class="btn btn-sm btn-primary edit-piece-btn" 
                    data-id="${piece.id}">✎</button>
            <button class="btn btn-sm btn-danger delete-piece-btn" 
                    data-id="${piece.id}">×</button>
          </td>
        </tr>
      `;
    }
    
    // Ajouter une ligne pour le bouton d'ajout
    html += `
        <tr class="add-row">
          <td colspan="7">
            <button id="add-piece-btn" class="btn btn-sm btn-primary">+ Ajouter une barre à découper</button>
          </td>
        </tr>
      </tbody>
    </table>
    `;
    
    tableContainer.innerHTML = html;
    
    // Ajouter les gestionnaires d'événements
    tableContainer.querySelectorAll('.delete-piece-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        if (this.dataManager.deletePiece(id)) {
          this.renderPiecesTable();
        }
      });
    });
    
    // Ajouter les gestionnaires pour l'édition
    tableContainer.querySelectorAll('.edit-piece-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        this.openPiecePanel('edit', id);
      });
    });
    
    // Ajouter le gestionnaire pour le bouton d'ajout de pièce
    document.getElementById('add-piece-btn').addEventListener('click', () => {
      this.openPiecePanel('create');
    });
  },
  
  /**
   * Rend le tableau des barres mères
   */
  renderStockBarsTable: function() {
    const tableContainer = document.querySelector('#stock-bars-table');
    const data = this.dataManager.getData();
    
    // Récupérer toutes les barres mères
    const allMotherBars = [];
    for (const model in data.motherBars) {
      allMotherBars.push(...data.motherBars[model]);
    }
    
    // Trier les barres
    allMotherBars.sort((a, b) => a.model.localeCompare(b.model) || a.length - b.length);
    
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
    
    // Générer les lignes du tableau
    for (const bar of allMotherBars) {
      html += `
        <tr data-id="${bar.id}">
          <td>${bar.profileFull || bar.model}</td>
          <td>${bar.length}</td>
          <td>${bar.quantity}</td>
          <td>
            <button class="btn btn-sm btn-primary edit-stock-btn" 
                    data-id="${bar.id}">✎</button>
            <button class="btn btn-sm btn-danger delete-stock-btn" 
                    data-id="${bar.id}">×</button>
          </td>
        </tr>
      `;
    }
    
    // Ajouter une ligne pour le bouton d'ajout
    html += `
        <tr class="add-row">
          <td colspan="4">
            <button id="add-mother-bar-btn" class="btn btn-sm btn-primary">+ Ajouter une barre mère</button>
          </td>
        </tr>
      </tbody>
    </table>
    `;
    
    tableContainer.innerHTML = html;
    
    // Ajouter les gestionnaires d'événements
    tableContainer.querySelectorAll('.delete-stock-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        if (this.dataManager.deleteMotherBar(id)) {
          this.renderStockBarsTable();
        }
      });
    });
    
    // Ajouter les gestionnaires pour l'édition
    tableContainer.querySelectorAll('.edit-stock-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        this.openStockPanel('edit', id);
      });
    });
    
    // Ajouter le gestionnaire pour le bouton d'ajout
    document.getElementById('add-mother-bar-btn').addEventListener('click', () => {
      this.openStockPanel('create');
    });
  },
  
  /**
   * Ouvre le panneau des barres filles (édition ou création)
   * @param {string} mode - Mode du panneau ('edit' ou 'create')
   * @param {string} id - ID de la pièce à éditer (seulement en mode 'edit')
   */
  openPiecePanel: function(mode, id = null) {
    this.editingMode = mode;
    this.editingId = id;
    this.editingType = 'piece';
    
    const panel = document.getElementById('piece-panel');
    const overlay = document.getElementById('panel-overlay');
    const form = panel.querySelector('.panel-form');
    const title = panel.querySelector('.panel-title');
    
    // Vider le formulaire
    form.innerHTML = '';
    
    if (mode === 'edit') {
      const item = this.dataManager.getPieceById(id);
      if (!item) return;
      
      title.textContent = `Éditer la barre ${item.profileFull || item.model}`;
      
      // Générer le formulaire d'édition
      form.innerHTML = `
        <div class="form-group">
          <label for="piece-profile">Profil :</label>
          <div class="profile-input-group">
            <select id="piece-profile-select">
              <option value="custom">Saisie personnalisée</option>
              ${this.getProfileOptions(item.profileFull)}
            </select>
            <input type="text" id="piece-profile" value="${item.profileFull || item.model}">
          </div>
        </div>
        <div class="form-group">
          <label for="piece-length">Longueur :</label>
          <input type="number" id="piece-length" min="1" step="0.1" value="${item.length}">
        </div>
        <div class="form-group">
          <label for="piece-quantity">Quantité :</label>
          <input type="number" id="piece-quantity" min="1" value="${item.quantity}">
        </div>
        <div class="form-group">
          <label for="piece-angle-start">Angle début (°) :</label>
          <input type="number" id="piece-angle-start" min="0" max="360" value="${item.angles?.start || 90}">
        </div>
        <div class="form-group">
          <label for="piece-angle-end">Angle fin (°) :</label>
          <input type="number" id="piece-angle-end" min="0" max="360" value="${item.angles?.end || 90}">
        </div>
        <div class="form-group">
          <label for="piece-orientation">Orientation :</label>
          <select id="piece-orientation">
            <option value="a-plat" ${item.orientation === 'a-plat' ? 'selected' : ''}>À plat</option>
            <option value="debout" ${item.orientation === 'debout' ? 'selected' : ''}>Debout</option>
          </select>
        </div>
      `;
      
      // Initialiser les contrôles spécifiques
      const profileSelect = document.getElementById('piece-profile-select');
      const profileInput = document.getElementById('piece-profile');
      
      profileSelect.addEventListener('change', () => {
        if (profileSelect.value === 'custom') {
          profileInput.removeAttribute('readonly');
          profileInput.focus();
        } else {
          profileInput.value = profileSelect.value;
          profileInput.setAttribute('readonly', 'readonly');
        }
      });
      
      // Si le profil actuel n'est pas dans la liste, sélectionner "custom"
      const matchingOption = Array.from(profileSelect.options)
        .find(option => option.value === item.profileFull);
        
      if (!matchingOption) {
        profileSelect.value = 'custom';
        profileInput.removeAttribute('readonly');
      } else {
        profileSelect.value = item.profileFull;
        profileInput.setAttribute('readonly', 'readonly');
      }
    } else {
      // Mode création
      title.textContent = 'Nouvelle barre à découper';
      
      form.innerHTML = `
        <div class="form-group">
          <label for="piece-profile">Profil :</label>
          <div class="profile-input-group">
            <select id="piece-profile-select">
              <option value="custom">Saisie personnalisée</option>
              ${this.getProfileOptions()}
            </select>
            <input type="text" id="piece-profile" placeholder="Saisir le profil">
          </div>
        </div>
        <div class="form-group">
          <label for="piece-length">Longueur :</label>
          <input type="number" id="piece-length" min="1" step="0.1">
        </div>
        <div class="form-group">
          <label for="piece-quantity">Quantité :</label>
          <input type="number" id="piece-quantity" min="1" value="1">
        </div>
        <div class="form-group">
          <label for="piece-angle-start">Angle début (°) :</label>
          <input type="number" id="piece-angle-start" min="0" max="360" value="90">
        </div>
        <div class="form-group">
          <label for="piece-angle-end">Angle fin (°) :</label>
          <input type="number" id="piece-angle-end" min="0" max="360" value="90">
        </div>
        <div class="form-group">
          <label for="piece-orientation">Orientation :</label>
          <select id="piece-orientation">
            <option value="a-plat">À plat</option>
            <option value="debout">Debout</option>
          </select>
        </div>
      `;
      
      // Initialiser les contrôles
      const profileSelect = document.getElementById('piece-profile-select');
      const profileInput = document.getElementById('piece-profile');
      
      profileSelect.addEventListener('change', () => {
        if (profileSelect.value === 'custom') {
          profileInput.removeAttribute('readonly');
          profileInput.focus();
        } else {
          profileInput.value = profileSelect.value;
          profileInput.setAttribute('readonly', 'readonly');
        }
      });
    }
    
    // Afficher le panneau et l'overlay
    panel.classList.add('visible');
    overlay.classList.add('visible');
  },
  
  /**
   * Ouvre le panneau des barres mères (édition ou création)
   * @param {string} mode - Mode du panneau ('edit' ou 'create')
   * @param {string} id - ID de la barre à éditer (seulement en mode 'edit')
   */
  openStockPanel: function(mode, id = null) {
    this.editingMode = mode;
    this.editingId = id;
    this.editingType = 'stock';
    
    const panel = document.getElementById('stock-panel');
    const overlay = document.getElementById('panel-overlay');
    const form = panel.querySelector('.panel-form');
    const title = panel.querySelector('.panel-title');
    
    // Vider le formulaire
    form.innerHTML = '';
    
    if (mode === 'edit') {
      const item = this.dataManager.getMotherBarById(id);
      if (!item) return;
      
      title.textContent = `Éditer la barre mère ${item.profileFull || item.model}`;
      
      // Générer le formulaire d'édition
      form.innerHTML = `
        <div class="form-group">
          <label for="stock-profile">Profil :</label>
          <select id="stock-profile">
            ${this.getProfileOptions(item.profileFull)}
          </select>
        </div>
        <div class="form-group">
          <label for="stock-length">Longueur :</label>
          <input type="number" id="stock-length" min="1" step="0.1" value="${item.length}">
        </div>
        <div class="form-group">
          <label for="stock-quantity">Quantité :</label>
          <input type="number" id="stock-quantity" min="1" value="${item.quantity}">
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
        </div>
        <div class="form-group">
          <label for="stock-length">Longueur :</label>
          <input type="number" id="stock-length" min="1" step="0.1">
        </div>
        <div class="form-group">
          <label for="stock-quantity">Quantité :</label>
          <input type="number" id="stock-quantity" min="1" value="1000000">
        </div>
      `;
    }
    
    // Afficher le panneau et l'overlay
    panel.classList.add('visible');
    overlay.classList.add('visible');
  },
  
  /**
   * Ferme le panneau d'édition actif
   */
  closePanel: function() {
    const piecePanel = document.getElementById('piece-panel');
    const stockPanel = document.getElementById('stock-panel');
    const overlay = document.getElementById('panel-overlay');
    
    piecePanel.classList.remove('visible');
    stockPanel.classList.remove('visible');
    overlay.classList.remove('visible');
    
    this.editingId = null;
    this.editingType = null;
    this.editingMode = null;
  },
  
  /**
   * Enregistre les modifications ou crée un nouvel élément
   */
  saveItem: function() {
    const type = this.editingType;
    const id = this.editingId;
    const mode = this.editingMode;
    
    if (!type) return;
    
    let success = false;
    let updatedProfile = false;
    
    if (type === 'piece') {
      const profileValue = document.getElementById('piece-profile').value;
      const length = parseFloat(document.getElementById('piece-length').value);
      const quantity = parseInt(document.getElementById('piece-quantity').value, 10);
      const angleStart = parseInt(document.getElementById('piece-angle-start').value, 10);
      const angleEnd = parseInt(document.getElementById('piece-angle-end').value, 10);
      const orientation = document.getElementById('piece-orientation').value;
      
      if (profileValue && length && quantity) {
        if (mode === 'edit') {
          const piece = this.dataManager.getPieceById(id);
          
          // Vérifier si c'est un nouveau profil
          if (piece && piece.profileFull !== profileValue) {
            updatedProfile = true;
          }
          
          const updatedPiece = {
            profileFull: profileValue,
            model: profileValue.split(' ')[0] || profileValue,
            length,
            quantity,
            orientation,
            angles: {
              start: angleStart || 90,
              end: angleEnd || 90
            }
          };
          
          success = this.dataManager.updatePiece(id, updatedPiece);
        } else {
          const pieceData = {
            profileFull: profileValue,
            model: profileValue.split(' ')[0] || profileValue,
            length,
            quantity,
            type: 'fille',
            orientation,
            angles: {
              start: angleStart || 90,
              end: angleEnd || 90
            }
          };
          
          if (this.dataManager.addBars([pieceData]).length > 0) {
            success = true;
            updatedProfile = true;
          }
        }
        
        if (success) {
          this.renderPiecesTable();
          
          // Mettre à jour les listes déroulantes de profils si un nouveau profil a été ajouté
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
        }
      }
    } else if (type === 'stock') {
      const profileValue = document.getElementById('stock-profile').value;
      const length = parseFloat(document.getElementById('stock-length').value);
      const quantity = parseInt(document.getElementById('stock-quantity').value, 10);
      
      if (profileValue && length && quantity) {
        if (mode === 'edit') {
          const bar = this.dataManager.getMotherBarById(id);
          
          // Vérifier si c'est un nouveau profil
          if (bar && bar.profileFull !== profileValue) {
            updatedProfile = true;
          }
          
          const updatedMotherBar = {
            profileFull: profileValue,
            model: profileValue.split(' ')[0] || profileValue,
            length,
            quantity
          };
          
          success = this.dataManager.updateMotherBar(id, updatedMotherBar);
        } else {
          const barData = {
            profileFull: profileValue,
            model: profileValue.split(' ')[0] || profileValue,
            length,
            quantity,
            type: 'mother'
          };
          
          if (this.dataManager.addBars([barData]).length > 0) {
            success = true;
            updatedProfile = true;
          }
        }
        
        if (success) {
          this.renderStockBarsTable();
          
          // Mettre à jour les listes déroulantes de profils si un nouveau profil a été ajouté
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
        }
      }
    }
    
    if (success) {
      this.closePanel();
    } else {
      this.showNotification('Veuillez remplir correctement tous les champs', 'warning');
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
      const customOption = pieceProfileSelect.querySelector('option[value="custom"]');
      const currentValue = pieceProfileSelect.value !== 'custom' ? pieceProfileSelect.value : '';
      
      // Sauvegarder l'option "Saisie personnalisée"
      const customHtml = customOption ? customOption.outerHTML : '<option value="custom">Saisie personnalisée</option>';
      
      pieceProfileSelect.innerHTML = customHtml + this.getProfileOptions(currentValue);
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
    for (const model in data.pieces) {
      data.pieces[model].forEach(piece => {
        if (piece.profileFull) profiles.add(piece.profileFull);
        else profiles.add(model);
      });
    }
    
    for (const model in data.motherBars) {
      data.motherBars[model].forEach(bar => {
        if (bar.profileFull) profiles.add(bar.profileFull);
        else profiles.add(model);
      });
    }
    
    // Générer les options HTML
    let optionsHtml = '';
    for (const profile of profiles) {
      optionsHtml += `<option value="${profile}" ${profile === currentValue ? 'selected' : ''}>${profile}</option>`;
    }
    
    return optionsHtml;
  },
  
  /**
   * Crée le panneau des barres filles
   */
  createPiecePanel: function() {
    // Vérifier si le panneau existe déjà
    if (document.getElementById('piece-panel')) return;
    
    // S'assurer que l'overlay existe
    if (!document.getElementById('panel-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'panel-overlay';
      overlay.className = 'panel-overlay';
      document.body.appendChild(overlay);
      
      // Fermer le panneau quand on clique sur l'overlay
      overlay.addEventListener('click', () => this.closePanel());
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
      document.body.appendChild(overlay);
      
      // Fermer le panneau quand on clique sur l'overlay
      overlay.addEventListener('click', () => this.closePanel());
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
  }
};