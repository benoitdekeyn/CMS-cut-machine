/**
 * Gestionnaire de la section d'édition
 * Gère les tableaux de barres et leur édition
 */
export const EditHandler = {
  // Dépendances
  dataManager: null,
  showNotification: null,
  
  /**
   * Initialise le handler d'édition
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.showNotification = options.showNotification;
  },
  
  /**
   * Rend la section d'édition
   */
  renderSection: function() {
    this.renderPiecesTable();
    this.renderStockBarsTable();
    this.initAddMotherBarModal();
    this.initAddPieceModal(); // Nouvelle fonction pour initialiser le modal d'ajout de pièce
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
          <td class="editable-cell" data-field="model">${piece.model}</td>
          <td>${piece.orientation || "non-définie"}</td>
          <td class="editable-cell" data-field="length">${piece.length}</td>
          <td>${piece.angles?.start || 90}°</td>
          <td>${piece.angles?.end || 90}°</td>
          <td class="editable-cell" data-field="quantity">${piece.quantity}</td>
          <td>
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
    this.initEditableCells(tableContainer.querySelector('tbody'), 'piece');
    
    tableContainer.querySelectorAll('.delete-piece-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        if (this.dataManager.deletePiece(id)) {
          this.renderPiecesTable();
        }
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
          <td class="editable-cell" data-field="model">${bar.profileFull || bar.model}</td>
          <td class="editable-cell" data-field="length">${bar.length}</td>
          <td class="editable-cell" data-field="quantity">${bar.quantity}</td>
          <td>
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
    this.initEditableCells(tableContainer.querySelector('tbody'), 'stock');
    
    tableContainer.querySelectorAll('.delete-stock-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        if (this.dataManager.deleteMotherBar(id)) {
          this.renderStockBarsTable();
        }
      });
    });
    
    // Ajouter le gestionnaire pour le bouton d'ajout
    document.getElementById('add-mother-bar-btn').addEventListener('click', () => {
      document.getElementById('add-mother-bar-modal').classList.remove('hidden');
    });
  },
  
  /**
   * Initialise les cellules éditables
   */
  initEditableCells: function(tableBody, type) {
    tableBody.querySelectorAll('.editable-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        // Si la cellule est déjà en édition, on ne fait rien
        if (cell.querySelector('.inline-edit-input')) return;
        
        const value = cell.textContent;
        const field = cell.getAttribute('data-field');
        const id = cell.closest('tr').getAttribute('data-id');
        
        // Créer l'input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.className = 'inline-edit-input';
        
        // Remplacer le contenu
        cell.textContent = '';
        cell.appendChild(input);
        
        // Ajuster la taille de l'input à la cellule
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        
        input.focus();
        
        // Gérer la fin d'édition
        const finishEdit = () => {
          const newValue = input.value.trim();
          if (newValue === value) {
            cell.textContent = value;
            return;
          }
          
          let success = false;
          
          if (type === 'piece') {
            if (field === 'quantity') {
              success = this.dataManager.updatePieceQuantityById(id, parseInt(newValue, 10));
              if (success) this.renderPiecesTable();
            } else if (field === 'length') {
              success = this.dataManager.updatePieceLengthById(id, parseFloat(newValue));
              if (success) this.renderPiecesTable();
            }
          } else if (type === 'stock') {
            if (field === 'quantity') {
              success = this.dataManager.updateMotherBarQuantityById(id, parseInt(newValue, 10));
              if (success) this.renderStockBarsTable();
            } else if (field === 'length') {
              success = this.dataManager.updateMotherBarLengthById(id, parseFloat(newValue));
              if (success) this.renderStockBarsTable();
            }
          }
          
          if (!success) {
            cell.textContent = value; // Restaurer l'ancienne valeur
          }
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') finishEdit();
          else if (e.key === 'Escape') cell.textContent = value;
        });
      });
    });
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
    
    // Remplir la liste des modèles
    const select = document.getElementById('mother-bar-profile');
    select.innerHTML = '';
    
    // Récupérer les modèles uniques
    const data = this.dataManager.getData();
    const models = new Set();
    
    for (const model in data.pieces) models.add(model);
    for (const model in data.motherBars) models.add(model);
    
    for (const model of models) {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      select.appendChild(option);
    }
    
    // Définir la quantité par défaut à 1000000
    document.getElementById('mother-bar-quantity').value = 1000000;
    
    // Ajouter une barre mère
    document.getElementById('confirm-add-mother-bar').addEventListener('click', () => {
      const model = select.value;
      const length = parseFloat(document.getElementById('mother-bar-length').value);
      const quantity = parseInt(document.getElementById('mother-bar-quantity').value, 10);
      
      if (model && length && quantity) {
        const barData = {
          model,
          length,
          quantity,
          type: 'mother',
          profileFull: model
        };
        
        if (this.dataManager.addBars([barData]).length > 0) {
          this.renderStockBarsTable();
          modal.classList.add('hidden');
        }
      } else {
        // Garde la notification d'erreur
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
    
    // Remplir la liste des modèles
    const select = document.getElementById('piece-profile');
    select.innerHTML = '';
    
    // Récupérer les modèles uniques
    const data = this.dataManager.getData();
    const models = new Set();
    
    for (const model in data.pieces) models.add(model);
    for (const model in data.motherBars) models.add(model);
    
    for (const model of models) {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      select.appendChild(option);
    }
    
    // Ajouter une pièce
    document.getElementById('confirm-add-piece').addEventListener('click', () => {
      const model = select.value;
      const length = parseFloat(document.getElementById('piece-length').value);
      const quantity = parseInt(document.getElementById('piece-quantity').value, 10);
      const angleStart = parseInt(document.getElementById('piece-angle-start').value, 10);
      const angleEnd = parseInt(document.getElementById('piece-angle-end').value, 10);
      
      if (model && length && quantity) {
        const pieceData = {
          model,
          profileFull: model,
          length,
          quantity,
          type: 'fille',
          orientation: 'a-plat',
          angles: {
            start: angleStart || 90,
            end: angleEnd || 90
          }
        };
        
        if (this.dataManager.addBars([pieceData]).length > 0) {
          this.renderPiecesTable();
          modal.classList.add('hidden');
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
            <select id="piece-profile"></select>
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
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary close-modal">Annuler</button>
          <button id="confirm-add-piece" class="btn btn-primary">Ajouter</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.initAddPieceModal();
  }
};