/**
 * Gestionnaire de la section d'édition
 * Gère les tableaux de barres et leur édition
 */
export const EditHandler = {
  // Dépendances
  dataManager: null,
  
  // Callbacks
  showNotification: null,
  
  /**
   * Initialise le handler d'édition
   * @param {Object} options - Options d'initialisation
   */
  init: function(options) {
    this.dataManager = options.dataManager;
    this.showNotification = options.showNotification;
  },
  
  /**
   * Rend la section d'édition avec les données actuelles
   */
  renderSection: function() {
    // Afficher les barres filles
    this.renderPiecesTable();
    
    // Afficher les barres mères
    this.renderStockBarsTable();
    
    // Initialiser le modal d'ajout de barre mère
    this.initAddMotherBarModal();
  },
  
  /**
   * Rend le tableau des barres filles
   */
  renderPiecesTable: function() {
    const tableBody = document.querySelector('#pieces-table tbody');
    const data = this.dataManager.getData();
    let html = '';
    
    // Récupérer toutes les barres filles
    const allPieces = [];
    for (const model in data.pieces) {
      for (const piece of data.pieces[model]) {
        allPieces.push(piece);
      }
    }
    
    // Trier les barres filles selon les critères demandés
    allPieces.sort((a, b) => {
      // D'abord par modèle
      if (a.model !== b.model) {
        return a.model.localeCompare(b.model);
      }
      // Puis par orientation
      if (a.orientation !== b.orientation) {
        return a.orientation.localeCompare(b.orientation);
      }
      // Puis par longueur
      if (a.length !== b.length) {
        return a.length - b.length;
      }
      // Puis par angle de début
      if (a.angles?.start !== b.angles?.start) {
        return (a.angles?.start || 0) - (b.angles?.start || 0);
      }
      // Enfin par angle de fin
      return (a.angles?.end || 0) - (b.angles?.end || 0);
    });
    
    // Générer une ligne pour chaque pièce triée
    for (const piece of allPieces) {
      // Utiliser le nom complet du profil pour l'affichage
      const displayName = piece.profileFull || piece.model;
      const orientation = piece.orientation || "non-définie";
      const startAngle = piece.angles?.start || 90;
      const endAngle = piece.angles?.end || 90;
      
      html += `
        <tr data-model="${piece.model}" data-length="${piece.length}" data-orientation="${orientation}" 
            data-angle-start="${startAngle}" data-angle-end="${endAngle}">
          <td>${displayName}</td>
          <td>${orientation}</td>
          <td class="editable-cell" data-field="length">${piece.length}</td>
          <td>${startAngle}°</td>
          <td>${endAngle}°</td>
          <td class="editable-cell" data-field="quantity">${piece.quantity}</td>
          <td class="delete-cell">
            <button class="btn btn-sm btn-danger delete-piece-btn" 
                    data-model="${piece.model}" 
                    data-length="${piece.length}"
                    data-orientation="${orientation}"
                    data-angle-start="${startAngle}"
                    data-angle-end="${endAngle}">×</button>
          </td>
        </tr>
      `;
    }
    
    // Mettre à jour l'en-tête du tableau
    const tableHeader = document.querySelector('#pieces-table thead');
    tableHeader.innerHTML = `
      <tr>
        <th>Modèle</th>
        <th>Orientation</th>
        <th>Longueur</th>
        <th>Angle 1</th>
        <th>Angle 2</th>
        <th>Quantité</th>
        <th></th>
      </tr>
    `;
    
    tableBody.innerHTML = html;
    
    // Ajouter les gestionnaires d'événements pour les cellules éditables
    this.initEditableCells(tableBody, 'piece');
    
    // Ajouter les gestionnaires d'événements pour les boutons de suppression
    tableBody.querySelectorAll('.delete-piece-btn').forEach(button => {
      button.addEventListener('click', () => {
        const model = button.getAttribute('data-model');
        const length = parseFloat(button.getAttribute('data-length'));
        const orientation = button.getAttribute('data-orientation');
        const startAngle = parseFloat(button.getAttribute('data-angle-start'));
        const endAngle = parseFloat(button.getAttribute('data-angle-end'));
        
        // Trouver la pièce exacte à supprimer
        const pieceToDelete = data.pieces[model]?.find(p => 
          p.length === length && 
          p.orientation === orientation && 
          p.angles?.start === startAngle && 
          p.angles?.end === endAngle
        );
        
        if (pieceToDelete) {
          // Supprimer la pièce via le DataManager
          if (this.dataManager.deletePiece(pieceToDelete.id)) {
            // Mettre à jour l'interface
            this.renderPiecesTable();
            this.showNotification(`Pièce ${model} de longueur ${length} supprimée`, 'success');
          } else {
            this.showNotification(`Erreur lors de la suppression de la pièce`, 'error');
          }
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
    let html = '';
    
    // Récupérer toutes les barres mères
    const allMotherBars = [];
    for (const model in data.motherBars) {
      for (const bar of data.motherBars[model]) {
        allMotherBars.push(bar);
      }
    }
    
    // Trier par modèle puis par longueur
    allMotherBars.sort((a, b) => {
      if (a.model !== b.model) {
        return a.model.localeCompare(b.model);
      }
      return a.length - b.length;
    });
    
    // Générer une ligne pour chaque barre mère
    for (const bar of allMotherBars) {
      // Utiliser le nom complet du profil pour l'affichage
      const displayName = bar.profileFull || bar.model;
      
      html += `
        <tr data-model="${bar.model}" data-length="${bar.length}">
          <td class="editable-cell" data-field="model" title="Modèle court: ${bar.model}">${displayName}</td>
          <td class="editable-cell" data-field="length">${bar.length}</td>
          <td class="editable-cell" data-field="quantity">${bar.quantity}</td>
          <td class="delete-cell">
            <button class="btn btn-sm btn-danger delete-stock-btn" data-model="${bar.model}" data-length="${bar.length}">×</button>
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
    
    // Ajouter les gestionnaires d'événements pour les cellules éditables
    this.initEditableCells(tableBody, 'stock');
    
    // Ajouter les gestionnaires d'événements pour les boutons de suppression
    tableBody.querySelectorAll('.delete-stock-btn').forEach(button => {
      button.addEventListener('click', () => {
        const model = button.getAttribute('data-model');
        const length = parseFloat(button.getAttribute('data-length'));
        
        // Supprimer la barre mère via le DataManager
        if (this.dataManager.deleteMotherBar(model, length)) {
          // Mettre à jour l'interface
          this.renderStockBarsTable();
          this.showNotification(`Barre mère ${model} de longueur ${length} supprimée`, 'success');
        } else {
          this.showNotification(`Erreur lors de la suppression de la barre mère`, 'error');
        }
      });
    });
    
    // Ajouter le gestionnaire pour le bouton d'ajout
    document.getElementById('add-mother-bar-btn').addEventListener('click', () => {
      this.openAddMotherBarModal();
    });
  },
  
  /**
   * Initialise les cellules éditables d'une table
   * @param {HTMLElement} tableBody - Élément tbody de la table
   * @param {string} type - Type d'élément ('piece' ou 'stock')
   */
  initEditableCells: function(tableBody, type) {
    tableBody.querySelectorAll('.editable-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        // Ne pas rendre éditable si déjà en mode édition
        if (cell.classList.contains('editing')) return;
        
        const value = cell.textContent;
        const field = cell.getAttribute('data-field');
        const row = cell.parentNode;
        const model = row.getAttribute('data-model');
        const length = parseFloat(row.getAttribute('data-length'));
        
        // Créer un champ de saisie
        cell.classList.add('editing');
        const input = document.createElement('input');
        input.type = field === 'quantity' ? 'number' : field === 'length' ? 'number' : 'text';
        input.value = value;
        input.min = field === 'quantity' || field === 'length' ? '1' : '';
        input.step = field === 'length' ? '0.1' : '1';
        
        // Remplacer le contenu par le champ
        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
        
        // Gérer la validation
        const handleValidation = () => {
          const newValue = input.value.trim();
          cell.classList.remove('editing');
          
          // Si la valeur a changé, mettre à jour les données
          if (newValue !== value && newValue !== '') {
            let success = false;
            
            try {
              if (type === 'piece') {
                if (field === 'quantity') {
                  // Mettre à jour la quantité de la pièce
                  success = this.dataManager.updatePieceQuantity(model, length, parseInt(newValue, 10));
                } else if (field === 'length') {
                  // Mettre à jour la longueur de la pièce
                  success = this.dataManager.updatePieceLength(model, length, parseFloat(newValue));
                } else if (field === 'model') {
                  // Mettre à jour le modèle de la pièce
                  success = this.dataManager.updatePieceModel(model, length, newValue);
                }
                
                // Mettre à jour l'interface si succès
                if (success) {
                  this.renderPiecesTable();
                } else {
                  this.showNotification(`Erreur lors de la mise à jour de la pièce`, 'error');
                  cell.textContent = value; // Restaurer l'ancienne valeur
                }
              } else if (type === 'stock') {
                if (field === 'quantity') {
                  // Mettre à jour la quantité de la barre mère
                  success = this.dataManager.updateMotherBarQuantity(model, length, parseInt(newValue, 10));
                } else if (field === 'length') {
                  // Mettre à jour la longueur de la barre mère
                  success = this.dataManager.updateMotherBarLength(model, length, parseFloat(newValue));
                } else if (field === 'model') {
                  // Mettre à jour le modèle de la barre mère
                  success = this.dataManager.updateMotherBarModel(model, length, newValue);
                }
                
                // Mettre à jour l'interface si succès
                if (success) {
                  this.renderStockBarsTable();
                } else {
                  this.showNotification(`Erreur lors de la mise à jour de la barre mère`, 'error');
                  cell.textContent = value; // Restaurer l'ancienne valeur
                }
              }
            } catch (error) {
              console.error('Update error:', error);
              this.showNotification(`Erreur: ${error.message}`, 'error');
              cell.textContent = value; // Restaurer l'ancienne valeur
              return;
            }
          } else {
            // Si la valeur n'a pas changé, restaurer le texte
            cell.textContent = value;
          }
        };
        
        // Event listeners pour la validation
        input.addEventListener('blur', handleValidation);
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleValidation();
          }
        });
      });
    });
  },
  
  /**
   * Initialise le modal d'ajout de barre mère
   */
  initAddMotherBarModal: function() {
    const modal = document.getElementById('add-mother-bar-modal');
    const closeButtons = modal.querySelectorAll('.close-modal');
    
    // Gestionnaires pour fermer le modal
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    });
    
    // Remplir le select avec les modèles disponibles
    const select = document.getElementById('mother-bar-profile');
    select.innerHTML = '';
    
    // Récupérer tous les modèles uniques (barres filles et mères)
    const data = this.dataManager.getData();
    const models = new Set();
    
    // Ajouter les modèles des barres filles
    for (const model in data.pieces) {
      models.add(model);
    }
    
    // Ajouter les modèles des barres mères
    for (const model in data.motherBars) {
      models.add(model);
    }
    
    // Créer les options
    for (const model of models) {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      select.appendChild(option);
    }
    
    // Gestionnaire pour le bouton d'ajout
    document.getElementById('confirm-add-mother-bar').addEventListener('click', () => {
      const model = select.value;
      const length = parseFloat(document.getElementById('mother-bar-length').value);
      const quantity = parseInt(document.getElementById('mother-bar-quantity').value, 10);
      
      if (model && length && quantity) {
        try {
          // Créer la nouvelle barre mère via le DataManager
          const barData = {
            model,
            length, 
            quantity,
            type: 'mother',
            profileFull: model // Par défaut, utiliser le modèle comme nom complet
          };
          
          const id = this.dataManager.createOrUpdateMotherBar(barData);
          
          if (id) {
            // Mettre à jour l'interface
            this.renderStockBarsTable();
            modal.classList.add('hidden');
            this.showNotification(`Barre mère ${model} de longueur ${length} ajoutée`, 'success');
          }
        } catch (error) {
          this.showNotification(`Erreur: ${error.message}`, 'error');
        }
      } else {
        this.showNotification('Veuillez remplir tous les champs correctement', 'warning');
      }
    });
  },
  
  /**
   * Ouvre le modal d'ajout de barre mère
   */
  openAddMotherBarModal: function() {
    const modal = document.getElementById('add-mother-bar-modal');
    modal.classList.remove('hidden');
    
    // Réinitialiser les champs avec les valeurs par défaut
    document.getElementById('mother-bar-length').value = '';
    document.getElementById('mother-bar-quantity').value = '1000000';  // Quantité par défaut à 1000000
  }
};