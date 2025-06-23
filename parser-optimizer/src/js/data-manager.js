/**
 * DataManager - Handles all data operations for pieces and mother bars
 */
export const DataManager = {
  // Application data store
  data: {
    pieces: {},      // Format groupé par modèle pour l'UI classique
    motherBars: {},  // Format groupé par modèle pour l'UI classique
    barsList: []     // Liste complète des barres avec toutes les informations
  },
  
  /**
   * Initialize or reset data
   * @returns {Object} Empty data structure
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
   * Get current data
   * @returns {Object} Current application data
   */
  getData: function() {
    return this.data;
  },
  
  /**
   * Add bars to the data store
   * @param {Array} bars - List of bar objects to add
   */
  addBars: function(bars) {
    if (!Array.isArray(bars) || bars.length === 0) return;
    
    // For each bar in the list
    bars.forEach(bar => {
      // Add to barsList
      this.data.barsList.push(bar);
      
      // Also add to the appropriate structure for UI compatibility
      if (bar.type === 'fille') {
        this.addPiece(bar.model, bar.length, bar.quantity, this.data, bar);
      } else if (bar.type === 'mere' || bar.type === 'mother') {
        this.addMotherBar(bar.model, bar.length, bar.quantity, this.data, bar);
      }
    });
  },
  
  /**
   * Parse CSV data and return updated data structure
   * @param {string} csvContent - CSV content to parse
   * @param {Object} [existingData] - Optional existing data to update
   * @returns {Object} Updated data structure
   */
  parsePiecesCSV: function(csvContent, existingData) {
    // Use provided data object or initialize new one
    const data = existingData || this.initData();
    const lines = csvContent.split('\n');
    
    // Skip header row and process each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length < 4) continue;
      
      const type = parts[0].trim().toLowerCase();
      const model = parts[1].trim();
      const length = parseInt(parts[2].trim(), 10);
      const quantity = parseInt(parts[3].trim(), 10);
      
      if (isNaN(length) || isNaN(quantity) || length <= 0 || quantity <= 0) continue;
      
      const barObject = {
        model,
        length,
        quantity,
        type: type === 'mere' || type === 'mother' ? 'mother' : 'fille',
        angles: { start: 90, end: 90 },
        flatValue: 0,
        id: `csv_${model}_${length}_${Date.now()}`
      };
      
      // Add to barsList
      data.barsList.push(barObject);
      
      if (type === 'mere' || type === 'mother') {
        this.addMotherBar(model, length, quantity, data, barObject);
      } else if (type === 'fille' || type === 'daughter' || type === 'piece') {
        this.addPiece(model, length, quantity, data, barObject);
      }
    }
    
    // If no existing data provided, update internal data
    if (!existingData) {
      this.data = data;
    }
    
    return data;
  },
  
  /**
   * Add or update a piece
   * @param {string} model - Piece model
   * @param {number} length - Piece length
   * @param {number} quantity - Piece quantity
   * @param {Object} [data] - Optional data object to update
   * @param {Object} [fullBarObject] - Full bar object with additional properties
   * @returns {boolean} Success state
   * @throws {Error} If model or length is invalid
   */
  addPiece: function(model, length, quantity, data, fullBarObject = null) {
    if (!model) {
      throw new Error("Le modèle est requis pour ajouter une pièce.");
    }
    
    if (!length || length <= 0) {
      throw new Error("La longueur doit être un nombre positif.");
    }
    
    // Use provided data object or default to internal data
    const targetData = data || this.data;
    
    // Create model array if it doesn't exist
    if (!targetData.pieces[model]) {
      targetData.pieces[model] = [];
    }
    
    // Check if piece already exists
    const existingPiece = targetData.pieces[model].find(p => p.length === length);
    if (existingPiece) {
      // Update quantity of existing piece
      existingPiece.quantity = quantity;
      
      // Update full bar properties if provided
      if (fullBarObject) {
        Object.assign(existingPiece, {
          angles: fullBarObject.angles || existingPiece.angles,
          flatValue: fullBarObject.flatValue || existingPiece.flatValue,
          cas: fullBarObject.cas || existingPiece.cas,
          originalData: fullBarObject.originalData || existingPiece.originalData,
          originalFile: fullBarObject.originalFile || existingPiece.originalFile,
          profileFull: fullBarObject.profileFull || existingPiece.profileFull || model
        });
      }
    } else {
      // Add new piece
      if (fullBarObject) {
        // Use the full bar object with all properties
        targetData.pieces[model].push({
          ...fullBarObject,
          // S'assurer que le modèle correspond à la clé dans pieces[model]
          model: model
        });
      } else {
        // Create a minimal piece object
        targetData.pieces[model].push({
          length,
          quantity,
          model,
          profileFull: model,    // Par défaut, utiliser le même nom pour le profil complet
          angles: { start: 90, end: 90 },
          flatValue: 0,
          type: 'fille',
          cas: 5,                // Cas par défaut (90 degrés)
          id: `piece_${model}_${length}_${Date.now()}`
        });
      }
    }
    
    return true;
  },
  
  /**
   * Add or update a mother bar
   * @param {string} model - Bar model
   * @param {number} length - Bar length
   * @param {number} quantity - Bar quantity
   * @param {Object} [data] - Optional data object to update
   * @param {Object} [fullBarObject] - Full bar object with additional properties
   * @returns {boolean} Success state
   * @throws {Error} If model or length is invalid
   */
  addMotherBar: function(model, length, quantity, data, fullBarObject = null) {
    if (!model) {
      throw new Error("Le modèle est requis pour ajouter une barre mère.");
    }
    
    if (!length || length <= 0) {
      throw new Error("La longueur doit être un nombre positif.");
    }
    
    // Use provided data object or default to internal data
    const targetData = data || this.data;
    
    // Create model array if it doesn't exist
    if (!targetData.motherBars[model]) {
      targetData.motherBars[model] = [];
    }
    
    // Check if bar already exists
    const existingBar = targetData.motherBars[model].find(b => b.length === length);
    if (existingBar) {
      // Update quantity of existing bar
      existingBar.quantity = quantity;
      
      // Update full bar properties if provided
      if (fullBarObject) {
        Object.assign(existingBar, {
          angles: fullBarObject.angles || existingBar.angles,
          flatValue: fullBarObject.flatValue || existingBar.flatValue,
          profileFull: fullBarObject.profileFull || existingBar.profileFull || model
        });
      }
    } else {
      // Add new bar
      if (fullBarObject) {
        // Use the full bar object with all properties
        targetData.motherBars[model].push({
          ...fullBarObject,
          // S'assurer que le modèle correspond à la clé dans motherBars[model]
          model: model
        });
      } else {
        // Create a minimal bar object
        targetData.motherBars[model].push({
          length,
          quantity,
          model,
          profileFull: model,    // Par défaut, utiliser le même nom pour le profil complet
          angles: { start: 90, end: 90 },
          flatValue: 0,
          type: 'mother',
          cas: 5,                // Cas par défaut (90 degrés)
          id: `mother_${model}_${length}_${Date.now()}`
        });
      }
    }
    
    return true;
  },
  
  /**
   * Delete a piece
   * @param {string} model - Piece model
   * @param {number} length - Piece length
   * @param {Object} [data] - Optional data object to update
   * @returns {boolean} Success state
   */
  deletePiece: function(model, length, data) {
    // Use provided data object or default to internal data
    const targetData = data || this.data;
    
    // Remove from barsList
    targetData.barsList = targetData.barsList.filter(bar => 
      !(bar.type === 'fille' && bar.model === model && bar.length === length)
    );
    
    if (targetData.pieces[model]) {
      const index = targetData.pieces[model].findIndex(p => p.length === length);
      if (index !== -1) {
        targetData.pieces[model].splice(index, 1);
        
        // Remove model if no pieces left
        if (targetData.pieces[model].length === 0) {
          delete targetData.pieces[model];
        }
        
        return true;
      }
    }
    return false;
  },
  
  /**
   * Delete a mother bar
   * @param {string} model - Bar model
   * @param {number} length - Bar length
   * @param {Object} [data] - Optional data object to update
   * @returns {boolean} Success state
   */
  deleteMotherBar: function(model, length, data) {
    // Use provided data object or default to internal data
    const targetData = data || this.data;
    
    // Remove from barsList
    targetData.barsList = targetData.barsList.filter(bar => 
      !(bar.type === 'mother' && bar.model === model && bar.length === length)
    );
    
    if (targetData.motherBars[model]) {
      const index = targetData.motherBars[model].findIndex(b => b.length === length);
      if (index !== -1) {
        targetData.motherBars[model].splice(index, 1);
        
        // Remove model if no bars left
        if (targetData.motherBars[model].length === 0) {
          delete targetData.motherBars[model];
        }
        
        return true;
      }
    }
    return false;
  },
  
  /**
   * Get all bars of a specific model
   * @param {string} model - Model name to filter
   * @param {string} [type] - Optional type filter ('fille' or 'mother')
   * @returns {Array} - List of bars matching the criteria
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
   * Validate data for algorithm processing
   * @throws {Error} If data is invalid
   */
  validateData: function() {
    // Check if there are any pieces defined
    if (Object.keys(this.data.pieces).length === 0) {
      throw new Error("Veuillez d'abord importer ou ajouter des pièces à découper.");
    }
    
    // Check if there are any mother bars defined
    if (Object.keys(this.data.motherBars).length === 0) {
      throw new Error("Veuillez définir des barres mères avant de continuer.");
    }
    
    // Check if there are actual pieces with quantities
    let hasPieces = false;
    for (const model in this.data.pieces) {
      if (this.data.pieces[model] && this.data.pieces[model].length > 0) {
        hasPieces = true;
        break;
      }
    }
    
    if (!hasPieces) {
      throw new Error("Veuillez d'abord ajouter des pièces à découper.");
    }
  }
};