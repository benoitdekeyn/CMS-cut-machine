/**
 * DataManager - Handles all data operations for pieces and mother bars
 */
export const DataManager = {
  // Application data store
  data: {
    pieces: {},
    motherBars: {}
  },
  
  /**
   * Initialize or reset data
   * @returns {Object} Empty data structure
   */
  initData: function() {
    this.data = {
      pieces: {},
      motherBars: {}
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
      
      if (type === 'mere' || type === 'mother') {
        this.addMotherBar(model, length, quantity, data);
      } else if (type === 'fille' || type === 'daughter' || type === 'piece') {
        this.addPiece(model, length, quantity, data);
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
   * @returns {boolean} Success state
   * @throws {Error} If model or length is invalid
   */
  addPiece: function(model, length, quantity, data) {
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
    } else {
      // Add new piece
      targetData.pieces[model].push({
        length,
        quantity
      });
    }
    
    return true;
  },
  
  /**
   * Add or update a mother bar
   * @param {string} model - Bar model
   * @param {number} length - Bar length
   * @param {number} quantity - Bar quantity
   * @param {Object} [data] - Optional data object to update
   * @returns {boolean} Success state
   * @throws {Error} If model or length is invalid
   */
  addMotherBar: function(model, length, quantity, data) {
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
    } else {
      // Add new bar
      targetData.motherBars[model].push({
        length,
        quantity
      });
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