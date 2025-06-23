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
  
  /**
   * Initialise le handler d'édition
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.showNotification = options.showNotification;
    
    // Créer le panneau latéral d'édition s'il n'existe pas
    this.createEditSidebar();
  },
  
  /**
   * Rend la section d'édition
   */
  renderSection: function() {
    this.renderPiecesTable();
    this.renderStockBarsTable();
    this.initAddMotherBarModal();
    this.initAddPieceModal();
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
        this.openEditSidebar('piece', id);
      });
    });
    
    // Ajouter le gestionnaire pour le bouton d'ajout de pièce
    document.getElementById('add-piece-btn').addEventListener('click', () => {
      document.getElementById('add-piece-modal').classList.remove('hidden');
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
        this.openEditSidebar('stock', id);
      });
    });
    
    // Ajouter le gestionnaire pour le bouton d'ajout
    document.getElementById('add-mother-bar-btn').addEventListener('click', () => {
      document.getElementById('add-mother-bar-modal').classList.remove('hidden');
    });
  },
  
  /**
   * Ouvre le panneau latéral d'édition
   * @param {string} type - Type d'élément ('piece' ou 'stock')
   * @param {string} id - ID de l'élément à éditer
   */
  openEditSidebar: function(type, id) {
    this.editingType = type;
    this.editingId = id;
    
    const sidebar = document.getElementById('edit-sidebar');
    const overlay = document.getElementById('edit-sidebar-overlay');
    const form = sidebar.querySelector('.edit-form');
    
    // Vider le formulaire
    form.innerHTML = '';
    
    // Définir la position du panneau
    sidebar.className = 'edit-form-sidebar';
    sidebar.classList.add(type); // Ajoute la classe 'piece' ou 'stock'
    
    let item = null;
    
    // Récupérer l'élément à éditer
    if (type === 'piece') {
      item = this.dataManager.getPieceById(id);
      
      if (item) {
        const title = sidebar.querySelector('.edit-form-title');
        title.textContent = `Éditer la barre ${item.profileFull || item.model}`;
        
        // Générer le formulaire pour une barre fille
        form.innerHTML = `
          <div class="form-group">
            <label for="edit-piece-profile">Profil :</label>
            <div class="profile-input-group">
              <select id="edit-piece-profile-select">
                <option value="custom">Saisie personnalisée</option>
                ${this.getProfileOptions(item.model)}
              </select>
              <input type="text" id="edit-piece-profile" 
                     value="${item.profileFull || item.model}">
            </div>
          </div>
          <div class="form-group">
            <label for="edit-piece-length">Longueur :</label>
            <input type="number" id="edit-piece-length" min="1" step="0.1"
                   value="${item.length}">
          </div>
          <div class="form-group">
            <label for="edit-piece-quantity">Quantité :</label>
            <input type="number" id="edit-piece-quantity" min="1"
                   value="${item.quantity}">
          </div>
          <div class="form-group">
            <label for="edit-piece-angle-start">Angle début (°) :</label>
            <input type="number" id="edit-piece-angle-start" min="0" max="360"
                   value="${item.angles?.start || 90}">
          </div>
          <div class="form-group">
            <label for="edit-piece-angle-end">Angle fin (°) :</label>
            <input type="number" id="edit-piece-angle-end" min="0" max="360"
                   value="${item.angles?.end || 90}">
          </div>
          <div class="form-group">
            <label for="edit-piece-orientation">Orientation :</label>
            <select id="edit-piece-orientation">
              <option value="a-plat" ${item.orientation === 'a-plat' ? 'selected' : ''}>À plat</option>
              <option value="debout" ${item.orientation === 'debout' ? 'selected' : ''}>Debout</option>
            </select>
          </div>
        `;
        
        // Initialiser les contrôles spécifiques
        const profileSelect = document.getElementById('edit-piece-profile-select');
        const profileInput = document.getElementById('edit-piece-profile');
        
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
      }
    } else if (type === 'stock') {
      item = this.dataManager.getMotherBarById(id);
      
      if (item) {
        const title = sidebar.querySelector('.edit-form-title');
        title.textContent = `Éditer la barre mère ${item.profileFull || item.model}`;
        
        // Générer le formulaire pour une barre mère
        form.innerHTML = `
          <div class="form-group">
            <label for="edit-stock-profile">Profil :</label>
            <select id="edit-stock-profile">
              ${this.getProfileOptions(item.model)}
            </select>
          </div>
          <div class="form-group">
            <label for="edit-stock-length">Longueur :</label>
            <input type="number" id="edit-stock-length" min="1" step="0.1"
                   value="${item.length}">
          </div>
          <div class="form-group">
            <label for="edit-stock-quantity">Quantité :</label>
            <input type="number" id="edit-stock-quantity" min="1"
                   value="${item.quantity}">
          </div>
        `;
      }
    }
    
    // Afficher le panneau et l'overlay
    sidebar.classList.add('visible');
    overlay.classList.add('visible');
  },
  
  /**
   * Ferme le panneau latéral d'édition
   */
  closeEditSidebar: function() {
    const sidebar = document.getElementById('edit-sidebar');
    const overlay = document.getElementById('edit-sidebar-overlay');
    
    sidebar.classList.remove('visible');
    overlay.classList.remove('visible');
    
    this.editingId = null;
    this.editingType = null;
  },
  
  /**
   * Sauvegarde les modifications de l'élément en cours d'édition
   */
  saveEditedItem: function() {
    const type = this.editingType;
    const id = this.editingId;
    
    if (!type || !id) return;
    
    let success = false;
    let updatedProfile = false;
    
    if (type === 'piece') {
      const profileValue = document.getElementById('edit-piece-profile').value;
      const length = parseFloat(document.getElementById('edit-piece-length').value);
      const quantity = parseInt(document.getElementById('edit-piece-quantity').value, 10);
      const angleStart = parseInt(document.getElementById('edit-piece-angle-start').value, 10);
      const angleEnd = parseInt(document.getElementById('edit-piece-angle-end').value, 10);
      const orientation = document.getElementById('edit-piece-orientation').value;
      
      if (profileValue && length && quantity) {
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
            end: angleEnd || 90,
            originalStart: piece?.angles?.originalStart,
            originalEnd: piece?.angles?.originalEnd
          }
        };
        
        success = this.dataManager.updatePiece(id, updatedPiece);
        if (success) {
          this.renderPiecesTable();
          
          // Mettre à jour les listes déroulantes de profils si un nouveau profil a été ajouté
          if (updatedProfile) {
            this.updateAllProfileSelects();
          }
        }
      }
    } else if (type === 'stock') {
      const profileValue = document.getElementById('edit-stock-profile').value;
      const length = parseFloat(document.getElementById('edit-stock-length').value);
      const quantity = parseInt(document.getElementById('edit-stock-quantity').value, 10);
      
      if (profileValue && length && quantity) {
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
      this.closeEditSidebar();
    } else {
      this.showNotification('Veuillez remplir correctement tous les champs', 'warning');
    }
  },
  
  /**
   * Met à jour toutes les listes déroulantes de profils dans l'interface
   */
  updateAllProfileSelects: function() {
    // Mettre à jour la liste des profils dans le modal d'ajout de barre mère
    const motherBarSelect = document.getElementById('mother-bar-profile');
    if (motherBarSelect) {
      const currentValue = motherBarSelect.value;
      motherBarSelect.innerHTML = this.getProfileOptions(currentValue);
    }
    
    // Mettre à jour la liste des profils dans le modal d'ajout de barre fille
    const pieceSelect = document.getElementById('piece-profile-select');
    if (pieceSelect) {
      const customOption = pieceSelect.querySelector('option[value="custom"]');
      const currentValue = pieceSelect.value !== 'custom' ? pieceSelect.value : '';
      pieceSelect.innerHTML = '';
      
      // Remettre l'option "Saisie personnalisée" en premier
      if (customOption) {
        pieceSelect.appendChild(customOption);
      } else {
        const option = document.createElement('option');
        option.value = 'custom';
        option.textContent = 'Saisie personnalisée';
        pieceSelect.appendChild(option);
      }
      
      // Ajouter les autres options
      pieceSelect.innerHTML += this.getProfileOptions(currentValue);
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
   * Initialise le modal d'ajout de barre mère
   */
  initAddMotherBarModal: function() {
    const modal = document.getElementById('add-mother-bar-modal');
    
    // Créer le modal s'il n'existe pas
    if (!modal) {
      this.createMotherBarModal();
      return;
    }
    
    // Fermer le modal
    modal.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', () => modal.classList.add('hidden'));
    });
    
    // Remplir la liste des profils
    const select = document.getElementById('mother-bar-profile');
    select.innerHTML = this.getProfileOptions();
    
    // Définir la quantité par défaut à 1000000
    document.getElementById('mother-bar-quantity').value = 1000000;
    
    // Ajouter une barre mère
    document.getElementById('confirm-add-mother-bar').addEventListener('click', () => {
      const profile = select.value;
      const length = parseFloat(document.getElementById('mother-bar-length').value);
      const quantity = parseInt(document.getElementById('mother-bar-quantity').value, 10);
      
      if (profile && length && quantity) {
        const barData = {
          profileFull: profile,
          model: profile.split(' ')[0] || profile,
          length,
          quantity,
          type: 'mother'
        };
        
        if (this.dataManager.addBars([barData]).length > 0) {
          this.renderStockBarsTable();
          modal.classList.add('hidden');
          
          // Mettre à jour les listes déroulantes de profils
          this.updateAllProfileSelects();
        }
      } else {
        this.showNotification('Valeurs incorrectes', 'warning');
      }
    });
  },
  
  /**
   * Initialise le modal d'ajout de pièce
   */
  initAddPieceModal: function() {
    const modal = document.getElementById('add-piece-modal');
    
    // Créer le modal s'il n'existe pas
    if (!modal) {
      this.createPieceModal();
      return;
    }
    
    // Fermer le modal
    modal.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', () => modal.classList.add('hidden'));
    });
    
    // Remplir la liste des profils
    const select = document.getElementById('piece-profile-select');
    select.innerHTML = '<option value="custom">Saisie personnalisée</option>' + this.getProfileOptions();
    
    // Gérer le changement de sélection de profil
    const profileInput = document.getElementById('piece-profile');
    select.addEventListener('change', () => {
      if (select.value === 'custom') {
        profileInput.removeAttribute('readonly');
        profileInput.value = '';
        profileInput.focus();
      } else {
        profileInput.value = select.value;
        profileInput.setAttribute('readonly', 'readonly');
      }
    });
    
    // Ajouter une pièce
    document.getElementById('confirm-add-piece').addEventListener('click', () => {
      const profile = profileInput.value;
      const length = parseFloat(document.getElementById('piece-length').value);
      const quantity = parseInt(document.getElementById('piece-quantity').value, 10);
      const angleStart = parseInt(document.getElementById('piece-angle-start').value, 10);
      const angleEnd = parseInt(document.getElementById('piece-angle-end').value, 10);
      const orientation = document.getElementById('piece-orientation').value;
      
      if (profile && length && quantity) {
        const pieceData = {
          profileFull: profile,
          model: profile.split(' ')[0] || profile,
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
          this.renderPiecesTable();
          modal.classList.add('hidden');
          
          // Mettre à jour les listes déroulantes de profils
          this.updateAllProfileSelects();
        }
      } else {
        this.showNotification('Valeurs incorrectes', 'warning');
      }
    });
  },
  
  /**
   * Crée le modal d'ajout de barre mère s'il n'existe pas
   */
  createMotherBarModal: function() {
    // Créer le modal
    const modal = document.createElement('div');
    modal.id = 'add-mother-bar-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Ajouter une barre mère</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="mother-bar-profile">Profil :</label>
            <select id="mother-bar-profile"></select>
          </div>
          <div class="form-group">
            <label for="mother-bar-length">Longueur :</label>
            <input type="number" id="mother-bar-length" min="1" step="0.1">
          </div>
          <div class="form-group">
            <label for="mother-bar-quantity">Quantité :</label>
            <input type="number" id="mother-bar-quantity" min="1" value="1000000">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary close-modal">Annuler</button>
          <button id="confirm-add-mother-bar" class="btn btn-primary">Ajouter</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.initAddMotherBarModal();
  },
  
  /**
   * Crée le modal d'ajout de pièce s'il n'existe pas
   */
  createPieceModal: function() {
    // Créer le modal
    const modal = document.createElement('div');
    modal.id = 'add-piece-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Ajouter une barre à découper</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="piece-profile">Profil :</label>
            <div class="profile-input-group">
              <select id="piece-profile-select">
                <option value="custom">Saisie personnalisée</option>
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
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary close-modal">Annuler</button>
          <button id="confirm-add-piece" class="btn btn-primary">Ajouter</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.initAddPieceModal();
  },
  
  /**
   * Crée le panneau latéral d'édition
   */
  createEditSidebar: function() {
    // Vérifier si le panneau existe déjà
    if (document.getElementById('edit-sidebar')) return;
    
    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.id = 'edit-sidebar-overlay';
    overlay.className = 'edit-form-sidebar-overlay';
    
    // Créer le panneau
    const sidebar = document.createElement('div');
    sidebar.id = 'edit-sidebar';
    sidebar.className = 'edit-form-sidebar';
    sidebar.innerHTML = `
      <div class="edit-form-header">
        <h3 class="edit-form-title">Éditer un élément</h3>
        <button class="close-sidebar">&times;</button>
      </div>
      <form class="edit-form">
        <!-- Le contenu du formulaire sera généré dynamiquement -->
      </form>
      <div class="edit-form-actions">
        <button class="btn btn-secondary cancel-edit">Annuler</button>
        <button class="btn btn-primary save-edit">Enregistrer</button>
      </div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);
    
    // Ajouter les gestionnaires d'événements
    document.querySelector('.close-sidebar').addEventListener('click', () => this.closeEditSidebar());
    document.querySelector('.cancel-edit').addEventListener('click', () => this.closeEditSidebar());
    document.querySelector('.save-edit').addEventListener('click', () => this.saveEditedItem());
    overlay.addEventListener('click', () => this.closeEditSidebar());
  }
};