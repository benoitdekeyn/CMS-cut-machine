/**
 * DataManager - Service pur de gestion des données (SANS ID)
 */
export const DataManager = {
  // Structure de données simplifiée
  data: {
    pieces: {},      // Barres filles groupées par profil
    motherBars: {},  // Barres mères groupées par profil
  },
  
  /**
   * Initialise les données
   */
  initData: function() {
    this.data = {
      pieces: {},
      motherBars: {}
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
   * Génère une clé unique pour une barre fille basée sur ses propriétés
   */
  generatePieceKey: function(piece) {
    const profile = piece.profile || 'UNKNOWN';
    const length = piece.length || 0;
    const orientation = piece.orientation || 'a-plat';
    const angle1 = piece.angles?.[1] || 90;
    const angle2 = piece.angles?.[2] || 90;
    const nom = piece.nom || '';
    
    // Utiliser nom si disponible, sinon profil+longueur
    const nameKey = nom.trim() !== '' ? nom : `${profile}_${length}cm`;
    
    return `${profile}|${orientation}|${length}|${angle1}|${angle2}|${nameKey}`;
  },

  /**
   * Génère une clé unique pour une barre mère basée sur ses propriétés
   */
  generateMotherBarKey: function(bar) {
    const profile = bar.profile || 'UNKNOWN';
    const length = bar.length || 0;
    
    return `${profile}|${length}`;
  },
  
  /**
   * Ajoute une liste de barres aux données
   */
  addBars: function(bars) {
    if (!Array.isArray(bars) || bars.length === 0) return [];
    
    const addedKeys = [];
    
    bars.forEach(bar => {
      if (!bar) return; // Ignorer les barres nulles
      
      // Ajouter à la structure appropriée selon le type
      if (bar.type === 'fille') {
        const key = this._addToPieces(bar);
        if (key) addedKeys.push(key);
      } else if (bar.type === 'mere' || bar.type === 'mother') {
        const key = this._addToMotherBars(bar);
        if (key) addedKeys.push(key);
      }
    });
    
    return addedKeys;
  },
  
  /**
   * Trie les barres dans une collection selon l'ordre : profil → orientation → longueur
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
    const key = this.generatePieceKey(bar);
    
    // Créer l'entrée pour ce profil si nécessaire
    if (!this.data.pieces[profile]) {
      this.data.pieces[profile] = [];
    }
    
    // Vérifier si une barre identique existe déjà
    const existingIndex = this.data.pieces[profile].findIndex(b => 
      this.generatePieceKey(b) === key
    );
    
    if (existingIndex !== -1) {
      // Mettre à jour la quantité de la barre existante
      this.data.pieces[profile][existingIndex].quantity += bar.quantity || 1;
    } else {
      // Ajouter la nouvelle barre avec tous les champs nécessaires
      const newPiece = {
        ...bar,
        orientation: bar.orientation || 'a-plat',
        angles: bar.angles || { 1: 90, 2: 90 },
        f4cData: bar.f4cData || {}
      };
      this.data.pieces[profile].push(newPiece);
    }
    
    // Trier automatiquement après ajout
    this._sortBarsCollection(this.data.pieces[profile]);
    
    return key;
  },
  
  /**
   * Ajoute une barre mère à la structure motherBars avec tri automatique
   */
  _addToMotherBars: function(bar) {
    const profile = bar.profile;
    const key = this.generateMotherBarKey(bar);
    
    // Créer l'entrée pour ce profil si nécessaire
    if (!this.data.motherBars[profile]) {
      this.data.motherBars[profile] = [];
    }
    
    // Vérifier si une barre identique existe déjà
    const existingIndex = this.data.motherBars[profile].findIndex(b => 
      this.generateMotherBarKey(b) === key
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
    
    return key;
  },
  
  /**
   * Supprime une pièce par sa clé
   */
  deletePiece: function(key) {
    for (const profile in this.data.pieces) {
      const pieceIndex = this.data.pieces[profile].findIndex(p => 
        this.generatePieceKey(p) === key
      );
      
      if (pieceIndex !== -1) {
        this.data.pieces[profile].splice(pieceIndex, 1);
        
        // Nettoyer la structure si vide
        if (this.data.pieces[profile].length === 0) {
          delete this.data.pieces[profile];
        }
        
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Supprime une barre mère par sa clé
   */
  deleteMotherBar: function(key) {
    for (const profile in this.data.motherBars) {
      const barIndex = this.data.motherBars[profile].findIndex(b => 
        this.generateMotherBarKey(b) === key
      );
      
      if (barIndex !== -1) {
        this.data.motherBars[profile].splice(barIndex, 1);
        
        // Nettoyer la structure si vide
        if (this.data.motherBars[profile].length === 0) {
          delete this.data.motherBars[profile];
        }
        
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Met à jour une pièce par sa clé
   */
  updatePiece: function(key, updatedValues) {
    // Trouver la pièce par sa clé
    for (const profile in this.data.pieces) {
      const pieceIndex = this.data.pieces[profile].findIndex(p => 
        this.generatePieceKey(p) === key
      );
      
      if (pieceIndex !== -1) {
        const oldPiece = this.data.pieces[profile][pieceIndex];
        const oldProfile = oldPiece.profile;
        const newProfile = updatedValues.profile || oldProfile;
        
        // Suppression de l'ancienne pièce
        this.data.pieces[oldProfile].splice(pieceIndex, 1);
        
        // Re-trier après suppression
        if (this.data.pieces[oldProfile].length > 0) {
          this._sortBarsCollection(this.data.pieces[oldProfile]);
        } else {
          delete this.data.pieces[oldProfile];
        }
        
        // Créer la pièce mise à jour
        const updatedPiece = {
          ...oldPiece,
          ...updatedValues
        };
        
        // Ajouter la pièce mise à jour
        if (!this.data.pieces[newProfile]) {
          this.data.pieces[newProfile] = [];
        }
        
        this.data.pieces[newProfile].push(updatedPiece);
        
        // Trier automatiquement après ajout
        this._sortBarsCollection(this.data.pieces[newProfile]);
        
        return this.generatePieceKey(updatedPiece);
      }
    }
    
    return null;
  },
  
  /**
   * Met à jour une barre mère par sa clé
   */
  updateMotherBar: function(key, updatedValues) {
    // Trouver la barre par sa clé
    for (const profile in this.data.motherBars) {
      const barIndex = this.data.motherBars[profile].findIndex(b => 
        this.generateMotherBarKey(b) === key
      );
      
      if (barIndex !== -1) {
        const oldBar = this.data.motherBars[profile][barIndex];
        const oldProfile = oldBar.profile;
        const newProfile = updatedValues.profile || oldProfile;
        
        // Suppression de l'ancienne barre
        this.data.motherBars[oldProfile].splice(barIndex, 1);
        
        // Re-trier après suppression
        if (this.data.motherBars[oldProfile].length > 0) {
          this._sortBarsCollection(this.data.motherBars[oldProfile]);
        } else {
          delete this.data.motherBars[oldProfile];
        }
        
        // Créer la barre mise à jour
        const updatedBar = { ...oldBar, ...updatedValues };
        delete updatedBar.nom; // Supprimer la propriété nom des barres mères
        
        // Ajouter la barre mise à jour
        if (!this.data.motherBars[newProfile]) {
          this.data.motherBars[newProfile] = [];
        }
        
        this.data.motherBars[newProfile].push(updatedBar);
        
        // Trier automatiquement après ajout
        this._sortBarsCollection(this.data.motherBars[newProfile]);
        
        return this.generateMotherBarKey(updatedBar);
      }
    }
    
    return null;
  },
  
  /**
   * Récupère une pièce par sa clé
   */
  getPieceByKey: function(key) {
    for (const profile in this.data.pieces) {
      for (const piece of this.data.pieces[profile]) {
        if (this.generatePieceKey(piece) === key) {
          return {...piece}; // Retourner une copie
        }
      }
    }
    return null;
  },
  
  /**
   * Récupère une barre mère par sa clé
   */
  getMotherBarByKey: function(key) {
    for (const profile in this.data.motherBars) {
      for (const bar of this.data.motherBars[profile]) {
        if (this.generateMotherBarKey(bar) === key) {
          return {...bar}; // Retourner une copie
        }
      }
    }
    return null;
  },

  /**
   * Valide les données avant optimisation
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
   * Récupère toutes les barres filles d'un profil et orientation donnés
   */
  getPiecesByModel: function(profile, orientation) {
    if (!profile || !orientation) return [];
    
    // Vérifier si le profil existe dans la structure pieces
    if (!this.data.pieces[profile]) return [];
    
    // Filtrer les pièces par orientation
    return this.data.pieces[profile].filter(piece => piece.orientation === orientation);
  },

  /**
   * Récupère toutes les longueurs et quantités des barres mères d'un profil donné
   */
  getMotherBarsByProfile: function(profile) {
    if (!profile || !this.data.motherBars[profile]) return [];
    
    return this.data.motherBars[profile].map(bar => ({
      length: bar.length,
      quantity: bar.quantity
    }));
  },

  /**
   * Récupère toutes les longueurs et quantités des barres filles d'un modèle donné
   */
  getLengthsToCutByModel: function(profile, orientation) {
    const filteredPieces = this.getPiecesByModel(profile, orientation);
    // Regrouper toutes les longeurs identique pour jouer sur la quantité
    const lengthMap = new Map();
    for (const piece of filteredPieces) {
      const existing = lengthMap.get(piece.length);
      if (existing) {
        existing.quantity += piece.quantity;
      } else {
        lengthMap.set(piece.length, { length: piece.length, quantity: piece.quantity });
      }
    }
    return Array.from(lengthMap.values());
  },

  /**
   * Récupère tous les modèles distincts de barres à découper
   */
  getModels: function() {
    const models = new Set();
    
    // Parcourir toutes les pièces pour extraire les modèles uniques
    for (const profile in this.data.pieces) {
      for (const piece of this.data.pieces[profile]) {
        const orientation = piece.orientation || 'a-plat';
        const modelKey = `${profile}_${orientation}`;
        models.add(modelKey);
      }
    }
    
    // Convertir en tableau d'objets avec tri
    const modelArray = Array.from(models).map(modelKey => {
      const [profile, orientation] = modelKey.split('_');
      return { profile, orientation };
    });
    
    // Trier par profil puis par orientation
    return modelArray.sort((a, b) => {
      // 1. Trier par profil
      if (a.profile !== b.profile) {
        return a.profile.localeCompare(b.profile);
      }
      
      // 2. Trier par orientation
      const orientationOrder = { 'a-plat': 0, 'debout': 1 };
      const orderA = orientationOrder[a.orientation] !== undefined ? orientationOrder[a.orientation] : 2;
      const orderB = orientationOrder[b.orientation] !== undefined ? orientationOrder[b.orientation] : 2;
      return orderA - orderB;
    });
  },
  
  /**
   * Efface toutes les données
   */
  clearAllData: function() {
    this.data = {
      pieces: {},
      motherBars: {}
    };
    console.log('📝 Toutes les données ont été effacées');
    return this.data;
  }
};