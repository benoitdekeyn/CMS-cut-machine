/**
 * DataManager - Service pur de gestion des données (CRUD)
 * Aucune logique d'interface ou métier ne doit être présente ici
 */
export const DataManager = {
  // Structure de données centrale
  data: {
    pieces: {},      // Format groupé par modèle pour les barres filles
    motherBars: {},  // Format groupé par modèle pour les barres mères
    barsList: []     // Liste complète des barres avec toutes les informations
  },
  
  /**
   * Initialise ou réinitialise les données
   * @returns {Object} Structure de données vide
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
   * Récupère l'état actuel des données
   * @returns {Object} Données de l'application
   */
  getData: function() {
    return this.data;
  },
  
  /**
   * Récupère une barre par son identifiant unique
   * @param {string} id - Identifiant unique de la barre
   * @returns {Object|null} Objet barre ou null si non trouvé
   */
  getBarById: function(id) {
    return this.data.barsList.find(bar => bar.id === id) || null;
  },
  
  /**
   * Récupère toutes les barres d'un modèle spécifique
   * @param {string} model - Nom du modèle à filtrer
   * @param {string} [type] - Type optionnel ('fille' ou 'mother')
   * @returns {Array} Liste des barres correspondant aux critères
   */
  getBarsByModel: function(model, type = null) {
    return this.data.barsList.filter(bar => {
      if (type) {
        return bar.model === model && bar.type === type;
      }
      return bar.model === model;
    });
  },
  
  /**
   * Récupère toutes les barres mères
   * @returns {Array} Liste des barres mères
   */
  getAllMotherBars: function() {
    return this.data.barsList.filter(bar => bar.type === 'mother' || bar.type === 'mere');
  },
  
  /**
   * Récupère toutes les barres filles
   * @returns {Array} Liste des barres filles
   */
  getAllDaughterBars: function() {
    return this.data.barsList.filter(bar => bar.type === 'fille');
  },
  
  /**
   * Ajoute une liste de barres aux données
   * @param {Array} bars - Liste des objets barre à ajouter
   * @returns {Array} Liste des IDs des barres ajoutées
   */
  addBars: function(bars) {
    if (!Array.isArray(bars) || bars.length === 0) return [];
    
    const addedIds = [];
    
    bars.forEach(bar => {
      // Générer un ID unique si non fourni
      if (!bar.id) {
        bar.id = `bar_${bar.model}_${bar.length}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      }
      
      // Ajouter à la liste principale
      this.data.barsList.push(bar);
      
      // Ajouter à la structure appropriée selon le type
      if (bar.type === 'fille') {
        this._addToOrganizedStructure(bar, this.data.pieces);
      } else if (bar.type === 'mere' || bar.type === 'mother') {
        this._addToOrganizedStructure(bar, this.data.motherBars);
      }
      
      addedIds.push(bar.id);
    });
    
    return addedIds;
  },
  
  /**
   * Ajoute ou met à jour une pièce (barre fille)
   * @param {Object} pieceData - Données de la pièce
   * @returns {string} ID de la pièce ajoutée/mise à jour
   */
  createOrUpdatePiece: function(pieceData) {
    // S'assurer que les propriétés essentielles sont présentes
    if (!pieceData.model || !pieceData.length) {
      throw new Error("Le modèle et la longueur sont requis");
    }
    
    // S'assurer que c'est une pièce fille
    pieceData.type = 'fille';
    
    // Rechercher une pièce existante avec le même modèle et longueur
    const existingPiece = this._findPieceByModelAndLength(pieceData.model, pieceData.length);
    
    if (existingPiece) {
      // Mettre à jour la pièce existante
      Object.assign(existingPiece, pieceData);
      return existingPiece.id;
    } else {
      // Ajouter une nouvelle pièce
      if (!pieceData.id) {
        pieceData.id = `piece_${pieceData.model}_${pieceData.length}_${Date.now()}`;
      }
      
      // S'assurer que les propriétés par défaut sont présentes
      pieceData = this._ensureDefaultProperties(pieceData);
      
      // Ajouter à barsList
      this.data.barsList.push(pieceData);
      
      // Ajouter à la structure pieces
      this._addToOrganizedStructure(pieceData, this.data.pieces);
      
      return pieceData.id;
    }
  },
  
  /**
   * Ajoute ou met à jour une barre mère
   * @param {Object} barData - Données de la barre mère
   * @returns {string} ID de la barre ajoutée/mise à jour
   */
  createOrUpdateMotherBar: function(barData) {
    // S'assurer que les propriétés essentielles sont présentes
    if (!barData.model || !barData.length) {
      throw new Error("Le modèle et la longueur sont requis");
    }
    
    // S'assurer que c'est une barre mère
    barData.type = 'mother';
    
    // Rechercher une barre existante avec le même modèle et longueur
    const existingBar = this._findMotherBarByModelAndLength(barData.model, barData.length);
    
    if (existingBar) {
      // Mettre à jour la barre existante
      Object.assign(existingBar, barData);
      return existingBar.id;
    } else {
      // Ajouter une nouvelle barre
      if (!barData.id) {
        barData.id = `mother_${barData.model}_${barData.length}_${Date.now()}`;
      }
      
      // S'assurer que les propriétés par défaut sont présentes
      barData = this._ensureDefaultProperties(barData);
      
      // Ajouter à barsList
      this.data.barsList.push(barData);
      
      // Ajouter à la structure motherBars
      this._addToOrganizedStructure(barData, this.data.motherBars);
      
      return barData.id;
    }
  },
  
  /**
   * Met à jour la quantité d'une pièce
   * @param {string} model - Modèle de la pièce
   * @param {number} length - Longueur de la pièce
   * @param {number} quantity - Nouvelle quantité
   * @returns {boolean} Succès de l'opération
   */
  updatePieceQuantity: function(model, length, quantity) {
    const piece = this._findPieceByModelAndLength(model, length);
    if (piece) {
      piece.quantity = quantity;
      return true;
    }
    return false;
  },
  
  /**
   * Met à jour la longueur d'une pièce
   * @param {string} model - Modèle de la pièce
   * @param {number} oldLength - Longueur actuelle
   * @param {number} newLength - Nouvelle longueur
   * @returns {boolean} Succès de l'opération
   */
  updatePieceLength: function(model, oldLength, newLength) {
    const piece = this._findPieceByModelAndLength(model, oldLength);
    if (piece) {
      // Mettre à jour la longueur
      piece.length = newLength;
      
      // Réorganiser la structure pieces si nécessaire
      this._reorganizeStructure(this.data.pieces, model);
      
      return true;
    }
    return false;
  },
  
  /**
   * Met à jour le modèle d'une pièce
   * @param {string} oldModel - Modèle actuel
   * @param {number} length - Longueur de la pièce
   * @param {string} newModel - Nouveau modèle
   * @returns {boolean} Succès de l'opération
   */
  updatePieceModel: function(oldModel, length, newModel) {
    const piece = this._findPieceByModelAndLength(oldModel, length);
    if (piece) {
      // Mettre à jour le modèle
      piece.model = newModel;
      
      // Réorganiser les structures
      this._reorganizeStructure(this.data.pieces, oldModel);
      this._reorganizeStructure(this.data.pieces, newModel);
      
      return true;
    }
    return false;
  },
  
  /**
   * Met à jour la quantité d'une barre mère
   * @param {string} model - Modèle de la barre
   * @param {number} length - Longueur de la barre
   * @param {number} quantity - Nouvelle quantité
   * @returns {boolean} Succès de l'opération
   */
  updateMotherBarQuantity: function(model, length, quantity) {
    const bar = this._findMotherBarByModelAndLength(model, length);
    if (bar) {
      bar.quantity = quantity;
      return true;
    }
    return false;
  },
  
  /**
   * Met à jour la longueur d'une barre mère
   * @param {string} model - Modèle de la barre
   * @param {number} oldLength - Longueur actuelle
   * @param {number} newLength - Nouvelle longueur
   * @returns {boolean} Succès de l'opération
   */
  updateMotherBarLength: function(model, oldLength, newLength) {
    const bar = this._findMotherBarByModelAndLength(model, oldLength);
    if (bar) {
      // Mettre à jour la longueur
      bar.length = newLength;
      
      // Réorganiser la structure motherBars si nécessaire
      this._reorganizeStructure(this.data.motherBars, model);
      
      return true;
    }
    return false;
  },
  
  /**
   * Met à jour le modèle d'une barre mère
   * @param {string} oldModel - Modèle actuel
   * @param {number} length - Longueur de la barre
   * @param {string} newModel - Nouveau modèle
   * @returns {boolean} Succès de l'opération
   */
  updateMotherBarModel: function(oldModel, length, newModel) {
    const bar = this._findMotherBarByModelAndLength(oldModel, length);
    if (bar) {
      // Mettre à jour le modèle
      bar.model = newModel;
      
      // Réorganiser les structures
      this._reorganizeStructure(this.data.motherBars, oldModel);
      this._reorganizeStructure(this.data.motherBars, newModel);
      
      return true;
    }
    return false;
  },
  
  /**
   * Supprime une pièce
   * @param {string} model - Modèle de la pièce
   * @param {number} length - Longueur de la pièce
   * @returns {boolean} Succès de l'opération
   */
  deletePiece: function(model, length) {
    // Supprimer de barsList
    const barIndex = this.data.barsList.findIndex(bar => 
      bar.type === 'fille' && bar.model === model && bar.length === length
    );
    
    if (barIndex !== -1) {
      this.data.barsList.splice(barIndex, 1);
    }
    
    // Supprimer de la structure pieces
    if (this.data.pieces[model]) {
      const pieceIndex = this.data.pieces[model].findIndex(p => p.length === length);
      if (pieceIndex !== -1) {
        this.data.pieces[model].splice(pieceIndex, 1);
        
        // Nettoyer la structure si vide
        if (this.data.pieces[model].length === 0) {
          delete this.data.pieces[model];
        }
        
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Supprime une barre mère
   * @param {string} model - Modèle de la barre
   * @param {number} length - Longueur de la barre
   * @returns {boolean} Succès de l'opération
   */
  deleteMotherBar: function(model, length) {
    // Supprimer de barsList
    const barIndex = this.data.barsList.findIndex(bar => 
      (bar.type === 'mother' || bar.type === 'mere') && bar.model === model && bar.length === length
    );
    
    if (barIndex !== -1) {
      this.data.barsList.splice(barIndex, 1);
    }
    
    // Supprimer de la structure motherBars
    if (this.data.motherBars[model]) {
      const barIndex = this.data.motherBars[model].findIndex(b => b.length === length);
      if (barIndex !== -1) {
        this.data.motherBars[model].splice(barIndex, 1);
        
        // Nettoyer la structure si vide
        if (this.data.motherBars[model].length === 0) {
          delete this.data.motherBars[model];
        }
        
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Vérifie que les données sont valides pour l'optimisation
   * @returns {Object} Résultat de validation {valid: boolean, message: string}
   */
  validateData: function() {
    // Vérifier s'il y a des pièces définies
    if (Object.keys(this.data.pieces).length === 0) {
      return {
        valid: false,
        message: "Veuillez d'abord importer ou ajouter des pièces à découper."
      };
    }
    
    // Vérifier s'il y a des barres mères définies
    if (Object.keys(this.data.motherBars).length === 0) {
      return {
        valid: false,
        message: "Veuillez définir des barres mères avant de continuer."
      };
    }
    
    // Vérifier s'il y a des pièces avec des quantités
    let hasPieces = false;
    for (const model in this.data.pieces) {
      if (this.data.pieces[model] && this.data.pieces[model].length > 0) {
        hasPieces = true;
        break;
      }
    }
    
    if (!hasPieces) {
      return {
        valid: false,
        message: "Veuillez d'abord ajouter des pièces à découper."
      };
    }
    
    return { valid: true };
  },
  
  /**
   * Exporte les données au format JSON
   * @returns {string} Données au format JSON
   */
  exportData: function() {
    return JSON.stringify(this.data);
  },
  
  /**
   * Importe des données à partir d'un JSON
   * @param {string} jsonData - Données au format JSON
   * @returns {boolean} Succès de l'opération
   */
  importData: function(jsonData) {
    try {
      const parsedData = JSON.parse(jsonData);
      
      // Valider la structure minimale
      if (!parsedData.pieces || !parsedData.motherBars || !parsedData.barsList) {
        return false;
      }
      
      this.data = parsedData;
      return true;
    } catch (error) {
      console.error("Erreur lors de l'import des données:", error);
      return false;
    }
  },
  
  // Méthodes privées (utilitaires)
  
  /**
   * Trouve une pièce par modèle et longueur
   * @private
   * @param {string} model - Modèle de la pièce
   * @param {number} length - Longueur de la pièce
   * @returns {Object|null} Pièce trouvée ou null
   */
  _findPieceByModelAndLength: function(model, length) {
    if (!this.data.pieces[model]) return null;
    
    return this.data.pieces[model].find(p => p.length === length);
  },
  
  /**
   * Trouve une barre mère par modèle et longueur
   * @private
   * @param {string} model - Modèle de la barre
   * @param {number} length - Longueur de la barre
   * @returns {Object|null} Barre trouvée ou null
   */
  _findMotherBarByModelAndLength: function(model, length) {
    if (!this.data.motherBars[model]) return null;
    
    return this.data.motherBars[model].find(b => b.length === length);
  },
  
  /**
   * S'assure que toutes les propriétés par défaut sont présentes
   * @private
   * @param {Object} barData - Données de la barre
   * @returns {Object} Données complétées avec les valeurs par défaut
   */
  _ensureDefaultProperties: function(barData) {
    const defaults = {
      quantity: 1,
      profileFull: barData.profileFull || barData.model,
      angles: barData.angles || { start: 90, end: 90 },
      flatValue: barData.flatValue || 0,
      cas: barData.cas || 5
    };
    
    return { ...defaults, ...barData };
  },
  
  /**
   * Ajoute une barre à une structure organisée (pieces ou motherBars)
   * @private
   * @param {Object} bar - Barre à ajouter
   * @param {Object} structure - Structure cible (pieces ou motherBars)
   */
  _addToOrganizedStructure: function(bar, structure) {
    const model = bar.model;
    
    // Créer le tableau pour ce modèle s'il n'existe pas
    if (!structure[model]) {
      structure[model] = [];
    }
    
    // Vérifier si la barre existe déjà avec exactement les mêmes caractéristiques
    const existingIndex = structure[model].findIndex(b => 
      b.length === bar.length && 
      b.orientation === bar.orientation &&
      this._haveEqualAngles(b.angles, bar.angles)
    );
    
    if (existingIndex !== -1) {
      // Mettre à jour la quantité de la barre existante
      structure[model][existingIndex].quantity += bar.quantity || 1;
      
      // Conserver l'ID du nouvel élément s'il est plus récent
      if (bar.id && (!structure[model][existingIndex].id || 
          parseInt(bar.id.split('_').pop()) > parseInt(structure[model][existingIndex].id.split('_').pop()))) {
        structure[model][existingIndex].id = bar.id;
      }
      
      // Fusionner d'autres propriétés pertinentes
      if (bar.originalFile) {
        structure[model][existingIndex].originalFile = bar.originalFile;
      }
      
      // Màj originalData si nécessaire
      if (bar.originalData) {
        structure[model][existingIndex].originalData = bar.originalData;
      }
    } else {
      // Ajouter la nouvelle barre
      structure[model].push({...bar});
    }
  },
  
  /**
   * Compare deux objets angles pour vérifier s'ils sont identiques
   * @private
   * @param {Object} angles1 - Premier objet angles {start, end}
   * @param {Object} angles2 - Second objet angles {start, end}
   * @returns {boolean} true si les angles sont identiques
   */
  _haveEqualAngles: function(angles1, angles2) {
    // Si l'un des objets est undefined, vérifier s'ils sont tous les deux undefined
    if (!angles1 || !angles2) {
      return (!angles1 && !angles2);
    }
    
    // Comparer les angles start et end
    return (
      Math.abs(angles1.start - angles2.start) < 0.001 && 
      Math.abs(angles1.end - angles2.end) < 0.001
    );
  },
  
  /**
   * Réorganise une structure après des modifications
   * @private
   * @param {Object} structure - Structure à réorganiser (pieces ou motherBars)
   * @param {string} model - Modèle à réorganiser
   */
  _reorganizeStructure: function(structure, model) {
    if (!structure[model]) return;
    
    // Reconstruire la structure pour ce modèle à partir de barsList
    const bars = this.data.barsList.filter(bar => 
      bar.model === model && 
      ((bar.type === 'fille' && structure === this.data.pieces) || 
       ((bar.type === 'mother' || bar.type === 'mere') && structure === this.data.motherBars))
    );
    
    if (bars.length > 0) {
      structure[model] = bars;
    } else {
      delete structure[model];
    }
  }
};