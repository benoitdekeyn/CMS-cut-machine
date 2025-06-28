/**
 * Gestionnaire de la section d'édition
 */
export const EditHandler = {
  // Dépendances
  dataManager: null,
  showNotification: null,
  refreshDataDisplay: null,
  
  // État interne
  editingId: null,
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
   * NOUVEAU: Convertit des centimètres en mètres pour l'affichage
   */
  formatLengthForDisplay: function(lengthInCm) {
    const meters = lengthInCm / 100;
    // Afficher avec le minimum de décimales nécessaires, virgule comme séparateur
    return meters % 1 === 0 ? meters.toString() : meters.toString().replace('.', ',');
  },
  
  /**
   * NOUVEAU: Convertit une valeur en mètres (avec virgule ou point) vers des centimètres
   */
  parseLengthFromDisplay: function(displayValue) {
    if (!displayValue || displayValue.trim() === '') return null;
    
    // Remplacer la virgule par un point pour la conversion
    const normalizedValue = displayValue.replace(',', '.');
    const meters = parseFloat(normalizedValue);
    
    if (isNaN(meters) || meters <= 0) return null;
    
    // Convertir en centimètres et arrondir
    return Math.round(meters * 100);
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
    
    // Formatage automatique lors de la perte de focus
    inputElement.addEventListener('blur', (e) => {
      const value = e.target.value.trim();
      if (value !== '') {
        const parsed = this.parseLengthFromDisplay(value);
        if (parsed !== null) {
          e.target.value = this.formatLengthForDisplay(parsed);
        }
      }
    });
  },
  
  /**
   * NOUVEAU: Configure les gestionnaires pour tous les champs du formulaire
   */
  setupFormKeyHandlers: function() {
    const form = document.querySelector('.panel-form');
    if (form) {
      // Ajouter un gestionnaire pour la touche Entrée sur tous les champs
      form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          this.saveItem();
        }
      });
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
   * Rend le tableau des barres filles avec tri automatique
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
      html += `
        <tr data-id="${piece.id}">
          <td>${piece.nom || '-'}</td>
          <td>${piece.profile}</td>
          <td>${this.formatOrientation(piece.orientation || "non-définie")}</td>
          <td>${Math.round(piece.length)} cm</td>
          <td>${parseFloat(piece.angles?.[1] || 90).toFixed(2)}°</td>
          <td>${parseFloat(piece.angles?.[2] || 90).toFixed(2)}°</td>
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
        const id = btn.getAttribute('data-id');
        this.openPiecePanel('edit', id);
      });
    });
    
    document.querySelectorAll('.delete-piece-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (this.dataManager.deletePiece(id)) {
          this.renderPiecesTable(); // Re-render avec tri automatique
          this.updateAllProfileSelects();
        } else {
          this.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    });
  },
  
  /**
   * Rend le tableau des barres mères avec tri automatique et longueurs en mètres
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
      const lengthInMeters = this.formatLengthForDisplay(bar.length);
      html += `
        <tr data-id="${bar.id}">
          <td>${bar.profile}</td>
          <td>${lengthInMeters} m</td>
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
        const id = btn.getAttribute('data-id');
        this.openStockPanel('edit', id);
      });
    });
    
    document.querySelectorAll('.delete-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (this.dataManager.deleteMotherBar(id)) {
          this.renderStockBarsTable(); // Re-render avec tri automatique
          this.updateAllProfileSelects();
        } else {
          this.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    });
  },
  
  /**
   * Ouvre le panneau des barres filles (édition ou création)
   * @param {string} mode - Mode du panneau ('edit' ou 'create')
   * @param {string} id - ID de la pièce à éditer (seulement en mode 'edit')
   */
  openPiecePanel: function(mode, id = null) {
    // Vérifier si la création est verrouillée
    if (mode === 'create' && this.lockOptions.lockPieceCreation) {
      this.showNotification('La création de nouvelles barres filles est désactivée', 'warning');
      return;
    }
    
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
      
      title.textContent = `Éditer la barre ${item.nom || item.profile}`;
      
      // Déterminer si les champs doivent être désactivés
      const lengthDisabled = this.lockOptions.lockPieceLengths ? 'disabled' : '';
      const angleDisabled = this.lockOptions.lockPieceAngles ? 'disabled' : '';
      
      // Générer le formulaire d'édition
      form.innerHTML = `
        <div class="form-group">
          <label for="piece-nom">Nom :</label>
          <input type="text" id="piece-nom" value="${item.nom || ''}" placeholder="Nom de la barre">
        </div>
        <div class="form-group">
          <label for="piece-profile">Profil :</label>
          <div class="profile-input-group">
            <select id="piece-profile-select">
              <option value="custom">Saisie personnalisée</option>
              ${this.getProfileOptions(item.profile)}
            </select>
            <input type="text" id="piece-profile" value="${item.profile}">
          </div>
        </div>
        <div class="form-group">
          <label for="piece-length">Longueur (cm) ${this.lockOptions.lockPieceLengths ? '(verrouillée)' : ''} :</label>
          <input type="number" id="piece-length" min="1" step="1" value="${Math.round(item.length)}" ${lengthDisabled}>
          ${this.lockOptions.lockPieceLengths ? '<small class="form-help">La longueur ne peut pas être modifiée pour les barres importées</small>' : ''}
        </div>
        <div class="form-group">
          <label for="piece-quantity">Quantité :</label>
          <input type="number" id="piece-quantity" min="1" value="${item.quantity}">
        </div>
        <div class="form-group">
          <label for="piece-angle-1">Angle 1 (°) ${this.lockOptions.lockPieceAngles ? '(verrouillé)' : ''} :</label>
          <input type="number" id="piece-angle-1" min="0" max="360" step="0.01" value="${parseFloat(item.angles?.[1] || 90).toFixed(2)}" ${angleDisabled}>
          ${this.lockOptions.lockPieceAngles ? '<small class="form-help">Les angles ne peuvent pas être modifiés pour les barres importées</small>' : ''}
        </div>
        <div class="form-group">
          <label for="piece-angle-2">Angle 2 (°) ${this.lockOptions.lockPieceAngles ? '(verrouillé)' : ''} :</label>
          <input type="number" id="piece-angle-2" min="0" max="360" step="0.01" value="${parseFloat(item.angles?.[2] || 90).toFixed(2)}" ${angleDisabled}>
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
        .find(option => option.value === item.profile);
        
      if (!matchingOption) {
        profileSelect.value = 'custom';
        profileInput.removeAttribute('readonly');
      } else {
        profileSelect.value = item.profile;
        profileInput.setAttribute('readonly', 'readonly');
      }
    } else {
      // Mode création
      title.textContent = 'Nouvelle barre à découper';
      
      form.innerHTML = `
        <div class="form-group">
          <label for="piece-nom">Nom :</label>
          <input type="text" id="piece-nom" placeholder="Nom de la barre">
        </div>
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
          <label for="piece-length">Longueur (cm) :</label>
          <input type="number" id="piece-length" min="1" step="1">
        </div>
        <div class="form-group">
          <label for="piece-quantity">Quantité :</label>
          <input type="number" id="piece-quantity" min="1" value="1">
        </div>
        <div class="form-group">
          <label for="piece-angle-1">Angle 1 (°) :</label>
          <input type="number" id="piece-angle-1" min="0" max="360" step="0.01" value="90.00">
        </div>
        <div class="form-group">
          <label for="piece-angle-2">Angle 2 (°) :</label>
          <input type="number" id="piece-angle-2" min="0" max="360" step="0.01" value="90.00">
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
    
    // Configurer les gestionnaires d'événements pour les formulaires
    this.setupFormKeyHandlers();
    
    // Afficher le panneau et l'overlay
    panel.classList.add('visible');
    overlay.classList.add('visible');
  },
  
  /**
   * Ouvre le panneau des barres mères (édition ou création) avec longueurs en mètres
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
      
      title.textContent = `Éditer la barre mère ${item.profile}`;
      
      // Convertir la longueur en mètres pour l'affichage
      const lengthInMeters = this.formatLengthForDisplay(item.length);
      
      // Générer le formulaire d'édition
      form.innerHTML = `
        <div class="form-group">
          <label for="stock-profile">Profil :</label>
          <select id="stock-profile">
            ${this.getProfileOptions(item.profile)}
          </select>
        </div>
        <div class="form-group">
          <label for="stock-length">Longueur (m) :</label>
          <input type="text" id="stock-length" value="${lengthInMeters}" placeholder="ex : 12 ou 3,5">
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
          <label for="stock-length">Longueur (m) :</label>
          <input type="text" id="stock-length" placeholder="ex : 12 ou 3,5">
        </div>
        <div class="form-group">
          <label for="stock-quantity">Quantité :</label>
          <input type="number" id="stock-quantity" min="1" value="1000000">
        </div>
      `;
    }
    
    // Configurer les gestionnaires spéciaux pour le champ de longueur
    const lengthInput = document.getElementById('stock-length');
    if (lengthInput) {
      this.setupLengthInputHandlers(lengthInput);
    }
    
    // Configurer les gestionnaires d'événements pour les formulaires
    this.setupFormKeyHandlers();
    
    // Afficher le panneau et l'overlay
    panel.classList.add('visible');
    overlay.classList.add('visible');
    
    // NOUVEAU: Mettre le focus sur le champ de longueur en mode création
    if (mode === 'create') {
      // Utiliser un petit délai pour s'assurer que le panneau est visible
      setTimeout(() => {
        const lengthInput = document.getElementById('stock-length');
        if (lengthInput) {
          lengthInput.focus();
        }
      }, 100);
    }
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
   * Enregistre les modifications ou crée un nouvel élément avec re-tri automatique
   */
  saveItem: function() {
    const type = this.editingType;
    const id = this.editingId;
    const mode = this.editingMode;
    
    if (!type) return;
    
    let success = false;
    let updatedProfile = false;
    
    if (type === 'piece') {
      const nom = document.getElementById('piece-nom').value.trim();
      const profileValue = document.getElementById('piece-profile').value;
      const quantity = parseInt(document.getElementById('piece-quantity').value, 10);
      const orientation = document.getElementById('piece-orientation').value;
      
      // Récupérer la longueur et les angles seulement si les champs ne sont pas verrouillés
      let length, angle1, angle2;
      
      if (this.lockOptions.lockPieceLengths && mode === 'edit') {
        // Si verrouillé en mode édition, garder la valeur existante
        const existingPiece = this.dataManager.getPieceById(id);
        length = existingPiece ? existingPiece.length : Math.round(parseFloat(document.getElementById('piece-length').value));
      } else {
        length = Math.round(parseFloat(document.getElementById('piece-length').value));
      }
      
      if (this.lockOptions.lockPieceAngles && mode === 'edit') {
        // Si verrouillé en mode édition, garder les valeurs existantes
        const existingPiece = this.dataManager.getPieceById(id);
        angle1 = existingPiece ? existingPiece.angles?.[1] || 90 : parseFloat(parseFloat(document.getElementById('piece-angle-1').value).toFixed(2));
        angle2 = existingPiece ? existingPiece.angles?.[2] || 90 : parseFloat(parseFloat(document.getElementById('piece-angle-2').value).toFixed(2));
      } else {
        angle1 = parseFloat(parseFloat(document.getElementById('piece-angle-1').value).toFixed(2));
        angle2 = parseFloat(parseFloat(document.getElementById('piece-angle-2').value).toFixed(2));
      }
      
      if (profileValue && length && quantity) {
        if (mode === 'edit') {
          const piece = this.dataManager.getPieceById(id);
          
          // Vérifier si c'est un nouveau profil
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
          
          success = this.dataManager.updatePiece(id, updatedPiece);
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
          
          if (this.dataManager.addBars([pieceData]).length > 0) {
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
          
          // Rafraîchir l'affichage global
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          
          // Afficher notification de succès
          const action = mode === 'edit' ? 'modifiée' : 'ajoutée';
          this.showNotification(`Barre ${action} avec succès`, 'success');
        }
      }
    } else if (type === 'stock') {
      const profileValue = document.getElementById('stock-profile').value;
      const lengthInput = document.getElementById('stock-length').value.trim();
      const quantity = parseInt(document.getElementById('stock-quantity').value, 10);
      
      // Convertir la longueur de mètres vers centimètres
      const lengthInCm = this.parseLengthFromDisplay(lengthInput);
      
      if (profileValue && lengthInCm && quantity) {
        if (mode === 'edit') {
          const bar = this.dataManager.getMotherBarById(id);
          
          if (bar && bar.profile !== profileValue) {
            updatedProfile = true;
          }
          
          const updatedMotherBar = {
            profile: profileValue,
            length: lengthInCm,
            quantity
          };
          
          success = this.dataManager.updateMotherBar(id, updatedMotherBar);
        } else {
          const barData = {
            profile: profileValue,
            length: lengthInCm,
            quantity,
            type: 'mother'
          };
          
          if (this.dataManager.addBars([barData]).length > 0) {
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
          
          // Rafraîchir l'affichage global
          if (this.refreshDataDisplay) {
            this.refreshDataDisplay();
          }
          
          // Afficher notification de succès
          const action = mode === 'edit' ? 'modifiée' : 'ajoutée';
          this.showNotification(`Barre mère ${action} avec succès`, 'success');
        }
      } else {
        // Afficher une erreur si la conversion de longueur a échoué
        if (!lengthInCm) {
          this.showNotification('Longueur invalide. Utilisez le format "12" ou "3,5"', 'error');
          return;
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
    
    // S'assurer que l'overlay existe
    if (!document.getElementById('panel-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'panel-overlay';
      overlay.className = 'panel-overlay';
      overlay.addEventListener('click', () => this.closePanel());
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
      overlay.addEventListener('click', () => this.closePanel());
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
  }
};