/**
 * DataManager - Service pur de gestion des données (CRUD)
 */
export const DataManager = {
  // Structure de données simplifiée
  data: {
    pieces: {},      // Barres filles groupées par modèle
    motherBars: {},  // Barres mères groupées par modèle
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
   * Ajoute une barre fille à la structure pieces
   */
  _addToPieces: function(bar) {
    const model = bar.model;
    
    // Créer l'entrée pour ce modèle si nécessaire
    if (!this.data.pieces[model]) {
      this.data.pieces[model] = [];
    }
    
    // Vérifier si une barre identique existe déjà
    const existingIndex = this.data.pieces[model].findIndex(b => 
      b.length === bar.length && 
      b.orientation === bar.orientation &&
      b.angles?.start === bar.angles?.start &&
      b.angles?.end === bar.angles?.end
    );
    
    if (existingIndex !== -1) {
      // Mettre à jour la quantité de la barre existante
      this.data.pieces[model][existingIndex].quantity += bar.quantity || 1;
    } else {
      // Ajouter la nouvelle barre
      this.data.pieces[model].push({...bar});
    }
  },
  
  /**
   * Ajoute une barre mère à la structure motherBars
   */
  _addToMotherBars: function(bar) {
    const model = bar.model;
    
    // Créer l'entrée pour ce modèle si nécessaire
    if (!this.data.motherBars[model]) {
      this.data.motherBars[model] = [];
    }
    
    // Vérifier si une barre identique existe déjà
    const existingIndex = this.data.motherBars[model].findIndex(b => 
      b.length === bar.length
    );
    
    if (existingIndex !== -1) {
      // Mettre à jour la quantité de la barre existante
      this.data.motherBars[model][existingIndex].quantity += bar.quantity || 1;
    } else {
      // Ajouter la nouvelle barre
      this.data.motherBars[model].push({...bar});
    }
  },
  
  /**
   * Supprime une pièce par son ID
   */
  deletePiece: function(id) {
    // Trouver la barre dans la liste principale
    const barIndex = this.data.barsList.findIndex(b => b.id === id && b.type === 'fille');
    
    if (barIndex !== -1) {
      const bar = this.data.barsList[barIndex];
      const model = bar.model;
      
      // Supprimer de la liste principale
      this.data.barsList.splice(barIndex, 1);
      
      // Supprimer de la structure pieces
      if (this.data.pieces[model]) {
        const pieceIndex = this.data.pieces[model].findIndex(p => p.id === id);
        if (pieceIndex !== -1) {
          this.data.pieces[model].splice(pieceIndex, 1);
          
          // Nettoyer la structure si vide
          if (this.data.pieces[model].length === 0) {
            delete this.data.pieces[model];
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
      const model = bar.model;
      
      // Supprimer de la liste principale
      this.data.barsList.splice(barIndex, 1);
      
      // Supprimer de la structure motherBars
      if (this.data.motherBars[model]) {
        const barModelIndex = this.data.motherBars[model].findIndex(b => b.id === id);
        if (barModelIndex !== -1) {
          this.data.motherBars[model].splice(barModelIndex, 1);
          
          // Nettoyer la structure si vide
          if (this.data.motherBars[model].length === 0) {
            delete this.data.motherBars[model];
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
        const model = this.data.barsList[i].model;
        if (this.data.pieces[model]) {
          for (let j = 0; j < this.data.pieces[model].length; j++) {
            if (this.data.pieces[model][j].id === id) {
              this.data.pieces[model][j].quantity = quantity;
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
        const model = this.data.barsList[i].model;
        if (this.data.pieces[model]) {
          for (let j = 0; j < this.data.pieces[model].length; j++) {
            if (this.data.pieces[model][j].id === id) {
              this.data.pieces[model][j].length = length;
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
        const model = this.data.barsList[i].model;
        if (this.data.motherBars[model]) {
          for (let j = 0; j < this.data.motherBars[model].length; j++) {
            if (this.data.motherBars[model][j].id === id) {
              this.data.motherBars[model][j].quantity = quantity;
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
        const model = this.data.barsList[i].model;
        if (this.data.motherBars[model]) {
          for (let j = 0; j < this.data.motherBars[model].length; j++) {
            if (this.data.motherBars[model][j].id === id) {
              this.data.motherBars[model][j].length = length;
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
   * Met à jour une pièce avec de nouvelles valeurs
   * @param {string} id - ID de la pièce à mettre à jour
   * @param {Object} updatedValues - Nouvelles valeurs
   * @returns {boolean} Succès de l'opération
   */
  updatePiece: function(id, updatedValues) {
    // Trouver la pièce dans la liste principale
    const pieceIndex = this.data.barsList.findIndex(b => b.id === id && b.type === 'fille');
    
    if (pieceIndex === -1) return false;
    
    const oldPiece = this.data.barsList[pieceIndex];
    const oldModel = oldPiece.model;
    const newModel = updatedValues.model || oldModel;
    
    // Suppression de l'ancienne pièce de la structure pieces
    if (this.data.pieces[oldModel]) {
      const index = this.data.pieces[oldModel].findIndex(p => p.id === id);
      if (index !== -1) {
        this.data.pieces[oldModel].splice(index, 1);
        
        if (this.data.pieces[oldModel].length === 0) {
          delete this.data.pieces[oldModel];
        }
      }
    }
    
    // Mise à jour de la pièce dans la liste principale
    this.data.barsList[pieceIndex] = {
      ...oldPiece,
      ...updatedValues
    };
    
    // Ajout de la pièce mise à jour dans la structure pieces
    if (!this.data.pieces[newModel]) {
      this.data.pieces[newModel] = [];
    }
    
    this.data.pieces[newModel].push(this.data.barsList[pieceIndex]);
    
    return true;
  },
  
  /**
   * Met à jour une barre mère avec de nouvelles valeurs
   * @param {string} id - ID de la barre mère à mettre à jour
   * @param {Object} updatedValues - Nouvelles valeurs
   * @returns {boolean} Succès de l'opération
   */
  updateMotherBar: function(id, updatedValues) {
    // Trouver la barre dans la liste principale
    const barIndex = this.data.barsList.findIndex(b => b.id === id && (b.type === 'mother' || b.type === 'mere'));
    
    if (barIndex === -1) return false;
    
    const oldBar = this.data.barsList[barIndex];
    const oldModel = oldBar.model;
    const newModel = updatedValues.model || oldModel;
    
    // Suppression de l'ancienne barre de la structure motherBars
    if (this.data.motherBars[oldModel]) {
      const index = this.data.motherBars[oldModel].findIndex(b => b.id === id);
      if (index !== -1) {
        this.data.motherBars[oldModel].splice(index, 1);
        
        if (this.data.motherBars[oldModel].length === 0) {
          delete this.data.motherBars[oldModel];
        }
      }
    }
    
    // Mise à jour de la barre dans la liste principale
    this.data.barsList[barIndex] = {
      ...oldBar,
      ...updatedValues
    };
    
    // Ajout de la barre mise à jour dans la structure motherBars
    if (!this.data.motherBars[newModel]) {
      this.data.motherBars[newModel] = [];
    }
    
    this.data.motherBars[newModel].push(this.data.barsList[barIndex]);
    
    return true;
  }
};