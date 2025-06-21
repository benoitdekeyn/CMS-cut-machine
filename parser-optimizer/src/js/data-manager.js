import { UIComponents } from './ui-components';

export const DataManager = {
    // Application data store
    data: {
        pieces: {},
        motherBars: {}
    },
    
    // Initialize or reset data
    initData: function() {
        this.data = {
            pieces: {},
            motherBars: {}
        };
        return this.data;
    },
    
    // Get current data
    getData: function() {
        return this.data;
    },
    
    // Parse CSV data
    parsePiecesCSV: function(csvContent, existingData) {
        // Si un objet de données existant est fourni, le mettre à jour au lieu de réinitialiser
        const data = existingData || this.initData();
        
        // Le reste de la fonction reste identique, mais utilise 'data' au lieu de 'this.data'
        const lines = csvContent.split('\n');
        
        // Skip header and empty lines
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Split by comma and trim each value
            const values = line.split(',').map(v => v.trim());
            
            if (values.length < 4) continue;
            
            const type = values[0].toLowerCase();
            const model = values[1];
            const length = parseInt(values[2]);
            const quantity = parseInt(values[3]);
            
            if (isNaN(length) || isNaN(quantity)) continue;
            
            if (type === 'mere') {
                this.addMotherBar(model, length, quantity, data);
            } else if (type === 'fille') {
                this.addPiece(model, length, quantity, data);
            }
        }
        
        // Si aucun objet de données existant n'a été fourni, mettre à jour this.data
        if (!existingData) {
            this.data = data;
        }
        
        return data;
    },
    
    // Add or update a piece
    addPiece: function(model, length, quantity, data) {
        if (!model) {
            console.error('Model is required');
            return false;
        }
        
        if (!length || length <= 0) {
            console.error('Length must be a positive number');
            return false;
        }
        
        // Use provided data object or default to internal data
        const targetData = data || this.data;
        
        // Add piece to data
        if (!targetData.pieces[model]) {
            targetData.pieces[model] = [];
        }
        
        const existingPiece = targetData.pieces[model].find(p => p.length === length);
        if (existingPiece) {
            existingPiece.quantity = quantity;
        } else {
            targetData.pieces[model].push({ length, quantity });
        }
        
        return true;
    },
    
    // Add or update a mother bar
    addMotherBar: function(model, length, quantity, data) {
        if (!model) {
            console.error('Model is required');
            return false;
        }
        
        if (!length || length <= 0) {
            console.error('Length must be a positive number');
            return false;
        }
        
        // Use provided data object or default to internal data
        const targetData = data || this.data;
        
        // Add mother bar to data
        if (!targetData.motherBars[model]) {
            targetData.motherBars[model] = [];
        }
        
        const existingBar = targetData.motherBars[model].find(b => b.length === length);
        if (existingBar) {
            existingBar.quantity = quantity;
        } else {
            targetData.motherBars[model].push({ length, quantity });
        }
        
        return true;
    },
    
    // Delete a piece
    deletePiece: function(model, length, data) {
        // Use provided data object or default to internal data
        const targetData = data || this.data;
        
        if (targetData.pieces[model]) {
            const pieceIndex = targetData.pieces[model].findIndex(p => p.length === length);
            if (pieceIndex !== -1) {
                targetData.pieces[model].splice(pieceIndex, 1);
                
                // Remove empty model
                if (targetData.pieces[model].length === 0) {
                    delete targetData.pieces[model];
                }
                
                return true;
            }
        }
        return false;
    },
    
    // Delete a mother bar
    deleteMotherBar: function(model, length, data) {
        // Use provided data object or default to internal data
        const targetData = data || this.data;
        
        if (targetData.motherBars[model]) {
            const barIndex = targetData.motherBars[model].findIndex(b => b.length === length);
            if (barIndex !== -1) {
                targetData.motherBars[model].splice(barIndex, 1);
                
                // Remove empty model
                if (targetData.motherBars[model].length === 0) {
                    delete targetData.motherBars[model];
                }
                
                return true;
            }
        }
        return false;
    }
};