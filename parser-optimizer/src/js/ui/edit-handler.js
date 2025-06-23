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
  },
  
  /**
   * Rend le tableau des barres filles
   */
  renderPiecesTable: function() {
    const tableBody = document.querySelector('#pieces-table tbody');
    const data = this.dataManager.getData();
    
    // Récupérer toutes les barres filles
    const allPieces = [];
    for (const model in data.pieces) {
      allPieces.push(...data.pieces[model]);
    }
    
    // Trier les barres
    allPieces.sort((a, b) => a.model.localeCompare(b.model) || a.length - b.length);
    
    // Générer le HTML
    let html = '';
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
    
    tableBody.innerHTML = html;
    
    // Ajouter les gestionnaires d'événements
    this.initEditableCells(tableBody, 'piece');
    
    tableBody.querySelectorAll('.delete-piece-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        if (this.dataManager.deletePiece(id)) {
          this.renderPiecesTable();
          this.showNotification(`Pièce supprimée`, 'success');
        }
      });
    });
  },
  
  /**
   * Rend le tableau des barres mères
   */
  renderStockBarsTable: function() {
    const tableBody = document.querySelector('#stock-bars-table tbody');
    const data = this.dataManager.getData();
    
    // Récupérer toutes les barres mères
    const allMotherBars = [];
    for (const model in data.motherBars) {
      allMotherBars.push(...data.motherBars[model]);
    }
    
    // Trier les barres
    allMotherBars.sort((a, b) => a.model.localeCompare(b.model) || a.length - b.length);
    
    // Générer le HTML
    let html = '';
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
    `;
    
    tableBody.innerHTML = html;
    
    // Ajouter les gestionnaires d'événements
    this.initEditableCells(tableBody, 'stock');
    
    tableBody.querySelectorAll('.delete-stock-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        if (this.dataManager.deleteMotherBar(id)) {
          this.renderStockBarsTable();
          this.showNotification(`Barre mère supprimée`, 'success');
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
          this.showNotification(`Barre mère ajoutée`, 'success');
        }
      } else {
        this.showNotification('Valeurs incorrectes', 'warning');
      }
    });
  }
};