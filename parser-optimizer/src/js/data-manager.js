/**
 * DataManager - Service pur de gestion des données (CRUD)
 */
export const DataManager = {
  // Structure de données simplifiée
  data: {
    pieces: {},      // Barres filles groupées par profil
    motherBars: {},  // Barres mères groupées par profil
    barsList: []     // Liste plate de toutes les barres
  },
  
  /**
   * Initialise les données
   */
  initData: function() {
    this.data = {
      pieces: {},
      motherBars: {},
      barsList: []
    };
    return this.data;
  },
  
  /**
   * Récupère l'état des données
   */
  getData: function() {
    return this.data;
  },
  
  /**
   * Ajoute une liste de barres aux données
   */
  addBars: function(bars) {
    if (!Array.isArray(bars) || bars.length === 0) return [];
    
    const addedIds = [];
    
    bars.forEach(bar => {
      if (!bar) return; // Ignorer les barres nulles
      
      // Générer un ID unique si manquant
      if (!bar.id) {
        bar.id = `bar_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      }
      
      // Ajouter à la liste principale
      this.data.barsList.push(bar);
      
      // Ajouter à la structure appropriée selon le type
      if (bar.type === 'fille') {
        this._addToPieces(bar);
      } else if (bar.type === 'mere' || bar.type === 'mother') {
        this._addToMotherBars(bar);
      }
      
      addedIds.push(bar.id);
    });
    
    return addedIds;
  },
  
  /**
   * Trie les barres dans une collection selon l'ordre : profil → orientation → longueur
   * @param {Array} bars - Tableau de barres à trier
   */
  _sortBarsCollection: function(bars) {
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
   * Ajoute une barre fille à la structure pieces avec tri automatique
   */
  _addToPieces: function(bar) {
    const profile = bar.profile;
    
    // Créer l'entrée pour ce profil si nécessaire
    if (!this.data.pieces[profile]) {
      this.data.pieces[profile] = [];
    }
    
    // Vérifier si une barre identique existe déjà
    const existingIndex = this.data.pieces[profile].findIndex(b => 
      b.length === bar.length && 
      b.orientation === bar.orientation &&
      b.angles?.[1] === bar.angles?.[1] &&
      b.angles?.[2] === bar.angles?.[2] &&
      b.nom === bar.nom
    );
    
    if (existingIndex !== -1) {
      // Mettre à jour la quantité de la barre existante
      this.data.pieces[profile][existingIndex].quantity += bar.quantity || 1;
    } else {
      // Ajouter la nouvelle barre avec tous les champs nécessaires
      this.data.pieces[profile].push({
        ...bar,
        orientation: bar.orientation || 'a-plat',
        angles: bar.angles || { 1: 90, 2: 90 },
        f4cData: bar.f4cData || {}
      });
    }
    
    // Trier automatiquement après ajout
    this._sortBarsCollection(this.data.pieces[profile]);
  },
  
  /**
   * Ajoute une barre mère à la structure motherBars avec tri automatique
   */
  _addToMotherBars: function(bar) {
    const profile = bar.profile;
    
    // Créer l'entrée pour ce profil si nécessaire
    if (!this.data.motherBars[profile]) {
      this.data.motherBars[profile] = [];
    }
    
    // Vérifier si une barre identique existe déjà
    const existingIndex = this.data.motherBars[profile].findIndex(b => 
      b.length === bar.length
    );
    
    if (existingIndex !== -1) {
      // Mettre à jour la quantité de la barre existante
      this.data.motherBars[profile][existingIndex].quantity += bar.quantity || 1;
    } else {
      // Ajouter la nouvelle barre (sans nom pour les barres mères)
      const motherBar = { ...bar };
      delete motherBar.nom; // Supprimer la propriété nom
      this.data.motherBars[profile].push(motherBar);
    }
    
    // Trier automatiquement après ajout
    this._sortBarsCollection(this.data.motherBars[profile]);
  },
  
  /**
   * Supprime une pièce par son ID
   */
  deletePiece: function(id) {
    // Trouver la barre dans la liste principale
    const barIndex = this.data.barsList.findIndex(b => b.id === id && b.type === 'fille');
    
    if (barIndex !== -1) {
      const bar = this.data.barsList[barIndex];
      const profile = bar.profile; // Utiliser 'profile' au lieu de 'model'
      
      // Supprimer de la liste principale
      this.data.barsList.splice(barIndex, 1);
      
      // Supprimer de la structure pieces
      if (this.data.pieces[profile]) {
        const pieceIndex = this.data.pieces[profile].findIndex(p => p.id === id);
        if (pieceIndex !== -1) {
          this.data.pieces[profile].splice(pieceIndex, 1);
          
          // Nettoyer la structure si vide
          if (this.data.pieces[profile].length === 0) {
            delete this.data.pieces[profile];
          }
          
          return true;
        }
      }
    }
    
    return false;
  },
  
  /**
   * Supprime une barre mère par son ID
   */
  deleteMotherBar: function(id) {
    // Trouver la barre dans la liste principale
    const barIndex = this.data.barsList.findIndex(b => b.id === id && (b.type === 'mere' || b.type === 'mother'));
    
    if (barIndex !== -1) {
      const bar = this.data.barsList[barIndex];
      const profile = bar.profile; // Utiliser 'profile' au lieu de 'model'
      
      // Supprimer de la liste principale
      this.data.barsList.splice(barIndex, 1);
      
      // Supprimer de la structure motherBars
      if (this.data.motherBars[profile]) {
        const barModelIndex = this.data.motherBars[profile].findIndex(b => b.id === id);
        if (barModelIndex !== -1) {
          this.data.motherBars[profile].splice(barModelIndex, 1);
          
          // Nettoyer la structure si vide
          if (this.data.motherBars[profile].length === 0) {
            delete this.data.motherBars[profile];
          }
          
          return true;
        }
      }
    }
    
    return false;
  },
  
  /**
   * Met à jour la quantité d'une pièce
   */
  updatePieceQuantityById: function(id, quantity) {
    // Parcourir la liste principale
    for (let i = 0; i < this.data.barsList.length; i++) {
      if (this.data.barsList[i].id === id && this.data.barsList[i].type === 'fille') {
        // Mettre à jour dans la liste principale
        this.data.barsList[i].quantity = quantity;
        
        // Mettre à jour dans la structure pieces
        const profile = this.data.barsList[i].profile; // Utiliser 'profile' au lieu de 'model'
        if (this.data.pieces[profile]) {
          for (let j = 0; j < this.data.pieces[profile].length; j++) {
            if (this.data.pieces[profile][j].id === id) {
              this.data.pieces[profile][j].quantity = quantity;
              return true;
            }
          }
        }
      }
    }
    
    return false;
  },
  
  /**
   * Met à jour la longueur d'une pièce
   */
  updatePieceLengthById: function(id, length) {
    for (let i = 0; i < this.data.barsList.length; i++) {
      if (this.data.barsList[i].id === id && this.data.barsList[i].type === 'fille') {
        // Mettre à jour dans la liste principale
        this.data.barsList[i].length = length;
        
        // Mettre à jour dans la structure pieces
        const profile = this.data.barsList[i].profile; // Utiliser 'profile' au lieu de 'model'
        if (this.data.pieces[profile]) {
          for (let j = 0; j < this.data.pieces[profile].length; j++) {
            if (this.data.pieces[profile][j].id === id) {
              this.data.pieces[profile][j].length = length;
              return true;
            }
          }
        }
      }
    }
    
    return false;
  },
  
  /**
   * Met à jour la quantité d'une barre mère
   */
  updateMotherBarQuantityById: function(id, quantity) {
    for (let i = 0; i < this.data.barsList.length; i++) {
      if (this.data.barsList[i].id === id && 
         (this.data.barsList[i].type === 'mere' || this.data.barsList[i].type === 'mother')) {
        // Mettre à jour dans la liste principale
        this.data.barsList[i].quantity = quantity;
        
        // Mettre à jour dans la structure motherBars
        const profile = this.data.barsList[i].profile; // Utiliser 'profile' au lieu de 'model'
        if (this.data.motherBars[profile]) {
          for (let j = 0; j < this.data.motherBars[profile].length; j++) {
            if (this.data.motherBars[profile][j].id === id) {
              this.data.motherBars[profile][j].quantity = quantity;
              return true;
            }
          }
        }
      }
    }
    
    return false;
  },
  
  /**
   * Met à jour la longueur d'une barre mère
   */
  updateMotherBarLengthById: function(id, length) {
    for (let i = 0; i < this.data.barsList.length; i++) {
      if (this.data.barsList[i].id === id && 
         (this.data.barsList[i].type === 'mere' || this.data.barsList[i].type === 'mother')) {
        // Mettre à jour dans la liste principale
        this.data.barsList[i].length = length;
        
        // Mettre à jour dans la structure motherBars
        const profile = this.data.barsList[i].profile; // Utiliser 'profile' au lieu de 'model'
        if (this.data.motherBars[profile]) {
          for (let j = 0; j < this.data.motherBars[profile].length; j++) {
            if (this.data.motherBars[profile][j].id === id) {
              this.data.motherBars[profile][j].length = length;
              return true;
            }
          }
        }
      }
    }
    
    return false;
  },
  
  /**
   * Récupère une pièce par son ID
   * @param {string} id - ID de la pièce
   * @returns {Object|null} La pièce ou null si non trouvée
   */
  getPieceById: function(id) {
    const piece = this.data.barsList.find(b => b.id === id && b.type === 'fille');
    return piece ? {...piece} : null;
  },
  
  /**
   * Récupère une barre mère par son ID
   * @param {string} id - ID de la barre mère
   * @returns {Object|null} La barre mère ou null si non trouvée
   */
  getMotherBarById: function(id) {
    const bar = this.data.barsList.find(b => b.id === id && (b.type === 'mother' || b.type === 'mere'));
    return bar ? {...bar} : null;
  },
  
  /**
   * Valide les données avant optimisation
   * @returns {Object} Résultat de validation
   */
  validateData: function() {
    const data = this.getData();
    
    // Vérifier qu'il y a des pièces à découper
    let totalPieces = 0;
    for (const profile in data.pieces) {
      for (const piece of data.pieces[profile]) {
        if (!piece.length || piece.length <= 0) {
          return {
            valid: false,
            message: `La pièce "${piece.nom || piece.profile}" a une longueur invalide.`
          };
        }
        if (!piece.quantity || piece.quantity <= 0) {
          return {
            valid: false,
            message: `La pièce "${piece.nom || piece.profile}" a une quantité invalide.`
          };
        }
        totalPieces += piece.quantity;
      }
    }
    
    if (totalPieces === 0) {
      return {
        valid: false,
        message: 'Aucune pièce à découper. Importez des fichiers NC2 ou ajoutez des pièces manuellement.'
      };
    }
    
    // Vérifier qu'il y a des barres mères
    let totalMotherBars = 0;
    for (const profile in data.motherBars) {
      for (const bar of data.motherBars[profile]) {
        if (!bar.length || bar.length <= 0) {
          return {
            valid: false,
            message: `La barre mère "${bar.profile}" a une longueur invalide.`
          };
        }
        if (!bar.quantity || bar.quantity <= 0) {
          return {
            valid: false,
            message: `La barre mère "${bar.profile}" a une quantité invalide.`
          };
        }
        totalMotherBars += bar.quantity;
      }
    }
    
    if (totalMotherBars === 0) {
      return {
        valid: false,
        message: 'Aucune barre mère disponible. Ajoutez des barres mères pour l\'optimisation.'
      };
    }
    
    return { valid: true };
  },
  
  /**
   * Met à jour une pièce avec de nouvelles valeurs et re-trie
   * @param {string} id - ID de la pièce à mettre à jour
   * @param {Object} updatedValues - Nouvelles valeurs
   * @returns {boolean} Succès de l'opération
   */
  updatePiece: function(id, updatedValues) {
    // Trouver la pièce dans la liste principale
    const pieceIndex = this.data.barsList.findIndex(b => b.id === id && b.type === 'fille');
    
    if (pieceIndex === -1) return false;
    
    const oldPiece = this.data.barsList[pieceIndex];
    const oldProfile = oldPiece.profile;
    const newProfile = updatedValues.profile || oldProfile;
    
    // Suppression de l'ancienne pièce de la structure pieces
    if (this.data.pieces[oldProfile]) {
      const index = this.data.pieces[oldProfile].findIndex(p => p.id === id);
      if (index !== -1) {
        this.data.pieces[oldProfile].splice(index, 1);
        
        // Re-trier après suppression
        if (this.data.pieces[oldProfile].length > 0) {
          this._sortBarsCollection(this.data.pieces[oldProfile]);
        } else {
          delete this.data.pieces[oldProfile];
        }
      }
    }
    
    // Mise à jour de la pièce dans la liste principale
    this.data.barsList[pieceIndex] = {
      ...oldPiece,
      ...updatedValues
    };
    
    // Ajout de la pièce mise à jour dans la structure pieces
    if (!this.data.pieces[newProfile]) {
      this.data.pieces[newProfile] = [];
    }
    
    this.data.pieces[newProfile].push(this.data.barsList[pieceIndex]);
    
    // Trier automatiquement après ajout
    this._sortBarsCollection(this.data.pieces[newProfile]);
    
    return true;
  },
  
  /**
   * Met à jour une barre mère avec de nouvelles valeurs et re-trie
   * @param {string} id - ID de la barre mère à mettre à jour
   * @param {Object} updatedValues - Nouvelles valeurs
   * @returns {boolean} Succès de l'opération
   */
  updateMotherBar: function(id, updatedValues) {
    // Trouver la barre dans la liste principale
    const barIndex = this.data.barsList.findIndex(b => b.id === id && (b.type === 'mother' || b.type === 'mere'));
    
    if (barIndex === -1) return false;
    
    const oldBar = this.data.barsList[barIndex];
    const oldProfile = oldBar.profile;
    const newProfile = updatedValues.profile || oldProfile;
    
    // Suppression de l'ancienne barre de la structure motherBars
    if (this.data.motherBars[oldProfile]) {
      const index = this.data.motherBars[oldProfile].findIndex(b => b.id === id);
      if (index !== -1) {
        this.data.motherBars[oldProfile].splice(index, 1);
        
        // Re-trier après suppression
        if (this.data.motherBars[oldProfile].length > 0) {
          this._sortBarsCollection(this.data.motherBars[oldProfile]);
        } else {
          delete this.data.motherBars[oldProfile];
        }
      }
    }
    
    // Mise à jour de la barre dans la liste principale
    const updatedBar = { ...oldBar, ...updatedValues };
    delete updatedBar.nom; // Supprimer la propriété nom des barres mères
    this.data.barsList[barIndex] = updatedBar;
    
    // Ajout de la barre mise à jour dans la structure motherBars
    if (!this.data.motherBars[newProfile]) {
      this.data.motherBars[newProfile] = [];
    }
    
    this.data.motherBars[newProfile].push(this.data.barsList[barIndex]);
    
    // Trier automatiquement après ajout
    this._sortBarsCollection(this.data.motherBars[newProfile]);
    
    return true;
  }
};