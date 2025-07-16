/**
 * DataManager - Service pur de gestion des données (SANS ID)
 */
export const DataManager = {
  // Structure de données simplifiée
  data: {
    pieces: {},      // Barres filles groupées par profil
    motherBars: {},  // Barres mères groupées par profil
  },

  // Clé pour le localStorage
  STORAGE_KEY: 'cms-mother-bars-stock',
  
  /**
   * Initialise les données
   */
  initData: function() {
    this.data = {
      pieces: {},
      motherBars: {}
    };
    
    // NOUVEAU: Charger automatiquement les barres mères sauvegardées
    this.loadMotherBarsFromStorage();
    
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
    const nameKey = nom.trim() !== '' ? nom : `${profile}_${length}mm`;
    
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
      const motherBar = { 
        profile: bar.profile,
        length: bar.length,
        quantity: bar.quantity || 1,
        type: bar.type || 'mere'
      };
      this.data.motherBars[profile].push(motherBar);
    }
    
    // Trier automatiquement après ajout
    this._sortBarsCollection(this.data.motherBars[profile]);
    
    // NOUVEAU: Sauvegarder automatiquement après modification
    this.saveMotherBarsToStorage();
    
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
        
        // Sauvegarder les barres mères restantes dans le localStorage
        this.saveMotherBarsToStorage();
        
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
        
        // NOUVEAU: Sauvegarder automatiquement après modification
        this.saveMotherBarsToStorage();
        
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
    
    // NOUVEAU: Nettoyer aussi le localStorage
    this.clearStoredMotherBars();
    
    console.log('📝 Toutes les données ont été effacées');
    return this.data;
  },

  /**
   * NOUVEAU: Sauvegarde les barres mères dans le localStorage
   */
  saveMotherBarsToStorage: function() {
    try {
      // Nettoyer les données avant la sérialisation pour éviter les propriétés undefined
      const cleanMotherBars = this.cleanMotherBarsForStorage();
      const motherBarsData = JSON.stringify(cleanMotherBars);
      
      // Vérifier la taille des données (limite à 1MB)
      const sizeInBytes = new Blob([motherBarsData]).size;
      if (sizeInBytes > 1024 * 1024) { // 1MB
        console.warn('⚠️ Les données du stock sont trop volumineuses pour être sauvegardées');
        return;
      }
      
      localStorage.setItem(this.STORAGE_KEY, motherBarsData);
      console.log(`📦 Stock de barres mères sauvegardé (${(sizeInBytes / 1024).toFixed(1)} KB)`);
    } catch (error) {
      console.warn('⚠️ Impossible de sauvegarder le stock:', error);
      // Si l'erreur est due à un quota dépassé, essayer de nettoyer
      if (error.name === 'QuotaExceededError') {
        console.warn('🚫 Quota localStorage dépassé, suppression de l\'ancien stock');
        this.clearStoredMotherBars();
      }
    }
  },

  /**
   * NOUVEAU: Nettoie les données des barres mères pour la sauvegarde
   */
  cleanMotherBarsForStorage: function() {
    const cleanBars = {};
    
    for (const profile in this.data.motherBars) {
      if (this.data.motherBars[profile] && Array.isArray(this.data.motherBars[profile])) {
        cleanBars[profile] = this.data.motherBars[profile].map(bar => {
          // Ne garder que les propriétés essentielles et définies
          const cleanBar = {};
          
          if (bar.profile !== undefined) cleanBar.profile = bar.profile;
          if (bar.length !== undefined) cleanBar.length = bar.length;
          if (bar.quantity !== undefined) cleanBar.quantity = bar.quantity;
          if (bar.type !== undefined) cleanBar.type = bar.type;
          if (bar.orientation !== undefined) cleanBar.orientation = bar.orientation;
          
          return cleanBar;
        }).filter(bar => bar.profile && bar.length && bar.quantity); // Filtrer les barres invalides
      }
    }
    
    return cleanBars;
  },

  /**
   * NOUVEAU: Charge les barres mères depuis le localStorage
   */
  loadMotherBarsFromStorage: function() {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      console.log('🔍 Données sauvegardées trouvées:', savedData ? 'Oui' : 'Non');
      
      if (savedData) {
        const motherBars = JSON.parse(savedData);
        console.log('📋 Données parsées:', motherBars);
        
        // Valider que les données sont dans le bon format
        if (typeof motherBars === 'object' && motherBars !== null) {
          // Valider et nettoyer chaque profil et barre
          const validatedBars = {};
          let totalBars = 0;
          
          for (const profile in motherBars) {
            console.log(`🔍 Traitement du profil: ${profile}`, motherBars[profile]);
            
            if (Array.isArray(motherBars[profile])) {
              const validBars = motherBars[profile].filter(bar => {
                const isValid = bar && 
                       typeof bar.profile === 'string' && 
                       typeof bar.length === 'number' && bar.length > 0 &&
                       typeof bar.quantity === 'number' && bar.quantity > 0;
                
                console.log(`🔍 Validation barre:`, bar, 'Valide:', isValid);
                return isValid;
              }).map(bar => {
                // Normaliser le type pour être compatible
                return {
                  ...bar,
                  type: bar.type === 'mother' ? 'mere' : (bar.type || 'mere')
                };
              });
              
              if (validBars.length > 0) {
                validatedBars[profile] = validBars;
                totalBars += validBars.length;
                console.log(`✅ ${validBars.length} barre(s) validée(s) pour ${profile}`);
              }
            }
          }
          
          if (totalBars > 0) {
            this.data.motherBars = validatedBars;
            console.log(`📦 ${totalBars} barre${totalBars > 1 ? 's' : ''} mère${totalBars > 1 ? 's' : ''} restaurée${totalBars > 1 ? 's' : ''} depuis le localStorage`);
            console.log('📋 Données finales chargées:', this.data.motherBars);
            return true;
          } else {
            console.log('⚠️ Aucune barre valide trouvée après validation');
          }
        } else {
          console.log('⚠️ Format de données invalide');
        }
      }
    } catch (error) {
      console.warn('⚠️ Impossible de charger le stock sauvegardé:', error);
      // En cas d'erreur, nettoyer le localStorage corrompu
      this.clearStoredMotherBars();
    }
    return false;
  },

  /**
   * NOUVEAU: Efface le stock sauvegardé du localStorage
   */
  clearStoredMotherBars: function() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Stock sauvegardé supprimé du localStorage');
    } catch (error) {
      console.warn('⚠️ Impossible de supprimer le stock sauvegardé:', error);
    }
  },
};