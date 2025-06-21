/**
 * UIController - Manages user interface interactions and events
 */
export const UIController = {
  // Dependencies
  dataManager: null,
  algorithmService: null,
  resultsRenderer: null,
  data: null,
  
  /**
   * Initialize the UI controller
   * @param {Object} options - Initialization options with dependencies
   */
  init: function(options) {
    // Set dependencies
    this.dataManager = options.dataManager;
    this.algorithmService = options.algorithmService;
    this.resultsRenderer = options.resultsRenderer;
    this.data = options.data;
    
    // Initialize UI components
    this.setupNavigation();
    this.setupImportModal();
    this.setupTableActions();
    this.setupAlgorithmButtons();
    this.renderTables();
  },
  
  /**
   * Set up navigation between sections
   */
  setupNavigation: function() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Hide all content sections
        document.querySelectorAll('.content-section').forEach(section => {
          section.classList.remove('active');
        });
        
        // Show target content section
        const targetSection = btn.getAttribute('data-section');
        document.getElementById(targetSection).classList.add('active');
      });
    });
  },
  
  /**
   * Set up the CSV import modal
   */
  setupImportModal: function() {
    // Import button opens modal
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-modal').classList.remove('hidden');
    });

    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('import-modal').classList.add('hidden');
      });
    });

    // File input displays filename
    document.getElementById('csv-file-input').addEventListener('change', (e) => {
      const fileName = e.target.files[0]?.name || '';
      if (fileName) {
        e.target.nextElementSibling.querySelector('.file-prompt').textContent = fileName;
      }
    });

    // Import button in modal
    document.getElementById('confirm-import').addEventListener('click', () => {
      const fileInput = document.getElementById('csv-file-input');
      const file = fileInput.files[0];
      
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            // Parse CSV content
            this.dataManager.parsePiecesCSV(e.target.result);
            
            // Update UI
            this.renderTables();
            
            // Close modal
            document.getElementById('import-modal').classList.add('hidden');
          } catch (error) {
            alert(`Erreur lors de l'importation: ${error.message}`);
          }
        };
        reader.readAsText(file);
      } else {
        alert("Veuillez d'abord sélectionner un fichier.");
      }
    });
  },
  
  /**
   * Set up table actions (add, edit, delete)
   */
  setupTableActions: function() {
    this.setupStockBarsTableActions();
    this.setupPiecesTableActions();
  },
  
  /**
   * Set up actions for the stock bars table
   */
  setupStockBarsTableActions: function() {
    const stockTable = document.getElementById('stock-bars-table');
    
    // Event delegation for clicks on the table
    stockTable.addEventListener('click', (e) => {
      // Delete button
      if (e.target.classList.contains('delete-btn')) {
        const tr = e.target.closest('tr');
        const model = tr.getAttribute('data-model');
        const length = parseInt(tr.getAttribute('data-length'), 10);
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer cette barre mère ${model} de longueur ${length}?`)) {
          this.dataManager.deleteMotherBar(model, length);
          this.renderTables();
        }
      }
      
      // Editable cell
      if (e.target.classList.contains('editable-cell')) {
        this.activateEditCell(e.target, 'stock');
      }
    });
    
    // Add new stock bar row at the end
    const addRow = document.createElement('tr');
    addRow.classList.add('add-row');
    addRow.innerHTML = `
      <td><input type="text" placeholder="Modèle" id="add-stock-model"></td>
      <td><input type="number" placeholder="Longueur" id="add-stock-length"></td>
      <td><input type="number" placeholder="Quantité" id="add-stock-quantity"></td>
      <td class="delete-cell">
        <button id="add-stock-bar-btn" class="btn btn-sm btn-success">+</button>
      </td>
    `;
    stockTable.appendChild(addRow);
    
    // Add stock bar button
    document.getElementById('add-stock-bar-btn').addEventListener('click', () => {
      this.addMotherBarFromInputs();
    });
    
    // Add on Enter key in the inputs
    document.getElementById('add-stock-model').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addMotherBarFromInputs();
    });
    document.getElementById('add-stock-length').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addMotherBarFromInputs();
    });
    document.getElementById('add-stock-quantity').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addMotherBarFromInputs();
    });
  },
  
  /**
   * Add a mother bar from the input fields
   */
  addMotherBarFromInputs: function() {
    const modelInput = document.getElementById('add-stock-model');
    const lengthInput = document.getElementById('add-stock-length');
    const quantityInput = document.getElementById('add-stock-quantity');
    
    const model = modelInput.value.trim();
    const length = parseInt(lengthInput.value, 10);
    const quantity = parseInt(quantityInput.value, 10);
    
    try {
      if (this.dataManager.addMotherBar(model, length, quantity)) {
        // Clear inputs
        modelInput.value = '';
        lengthInput.value = '';
        quantityInput.value = '';
        
        // Update table
        this.renderTables();
      }
    } catch (error) {
      alert(error.message);
    }
  },
  
  /**
   * Set up actions for the pieces table
   */
  setupPiecesTableActions: function() {
    const piecesTable = document.getElementById('pieces-table');
    
    // Event delegation for clicks on the table
    piecesTable.addEventListener('click', (e) => {
      // Delete button
      if (e.target.classList.contains('delete-btn')) {
        const tr = e.target.closest('tr');
        const model = tr.getAttribute('data-model');
        const length = parseInt(tr.getAttribute('data-length'), 10);
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer cette pièce ${model} de longueur ${length}?`)) {
          this.dataManager.deletePiece(model, length);
          this.renderTables();
        }
      }
      
      // Editable cell
      if (e.target.classList.contains('editable-cell')) {
        this.activateEditCell(e.target, 'pieces');
      }
    });
    
    // Add new piece row at the end
    const addRow = document.createElement('tr');
    addRow.classList.add('add-row');
    addRow.innerHTML = `
      <td><input type="text" placeholder="Modèle" id="add-piece-model"></td>
      <td><input type="number" placeholder="Longueur" id="add-piece-length"></td>
      <td><input type="number" placeholder="Quantité" id="add-piece-quantity"></td>
      <td class="delete-cell">
        <button id="add-piece-btn" class="btn btn-sm btn-success">+</button>
      </td>
    `;
    piecesTable.appendChild(addRow);
    
    // Add piece button
    document.getElementById('add-piece-btn').addEventListener('click', () => {
      this.addPieceFromInputs();
    });
    
    // Add on Enter key in the inputs
    document.getElementById('add-piece-model').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addPieceFromInputs();
    });
    document.getElementById('add-piece-length').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addPieceFromInputs();
    });
    document.getElementById('add-piece-quantity').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addPieceFromInputs();
    });
  },
  
  /**
   * Add a piece from the input fields
   */
  addPieceFromInputs: function() {
    const modelInput = document.getElementById('add-piece-model');
    const lengthInput = document.getElementById('add-piece-length');
    const quantityInput = document.getElementById('add-piece-quantity');
    
    const model = modelInput.value.trim();
    const length = parseInt(lengthInput.value, 10);
    const quantity = parseInt(quantityInput.value, 10);
    
    try {
      if (this.dataManager.addPiece(model, length, quantity)) {
        // Clear inputs
        modelInput.value = '';
        lengthInput.value = '';
        quantityInput.value = '';
        
        // Update table
        this.renderTables();
      }
    } catch (error) {
      alert(error.message);
    }
  },
  
  /**
   * Activate editing for a table cell
   * @param {HTMLElement} cell - The cell to edit
   * @param {string} type - Table type ('stock' or 'pieces')
   */
  activateEditCell: function(cell, type) {
    const tr = cell.parentElement;
    const currentValue = cell.textContent;
    const fieldName = cell.getAttribute('data-field');
    const model = tr.getAttribute('data-model');
    const length = parseInt(tr.getAttribute('data-length'), 10);
    
    // Already editing
    if (cell.classList.contains('editing')) return;
    
    // Add editing class
    cell.classList.add('editing');
    
    // Save original content to restore if needed
    cell.setAttribute('data-original', currentValue);
    
    // Create input element
    const input = document.createElement('input');
    input.type = fieldName === 'model' ? 'text' : 'number';
    input.value = currentValue;
    
    // Clear cell and add input
    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
    
    // Handle input events
    input.addEventListener('blur', () => {
      this.saveEditCell(cell, type, model, length, fieldName);
    });
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        input.blur(); // Trigger blur to save
      } else if (e.key === 'Escape') {
        cell.textContent = cell.getAttribute('data-original');
        cell.classList.remove('editing');
      }
    });
  },
  
  /**
   * Save the edited cell value
   * @param {HTMLElement} cell - The edited cell
   * @param {string} type - Table type ('stock' or 'pieces')
   * @param {string} originalModel - Original model name
   * @param {number} originalLength - Original length value
   * @param {string} fieldName - Field name being edited
   */
  saveEditCell: function(cell, type, originalModel, originalLength, fieldName) {
    if (!cell.classList.contains('editing')) return;
    
    const input = cell.querySelector('input');
    const value = input.type === 'number' ? parseInt(input.value, 10) : input.value.trim();
    
    try {
      if (type === 'stock') {
        this.updateStockBarValue(originalModel, originalLength, fieldName, value);
      } else {
        this.updatePieceValue(originalModel, originalLength, fieldName, value);
      }
      
      // Update UI
      cell.textContent = value;
      cell.classList.remove('editing');
      this.renderTables();
    } catch (error) {
      alert(error.message);
      cell.textContent = cell.getAttribute('data-original');
      cell.classList.remove('editing');
    }
  },
  
  /**
   * Update a stock bar value
   * @param {string} model - Original model name
   * @param {number} length - Original length
   * @param {string} field - Field to update
   * @param {string|number} value - New value
   */
  updateStockBarValue: function(model, length, field, value) {
    const data = this.dataManager.getData();
    
    // Validate input
    if ((field === 'length' || field === 'quantity') && (isNaN(value) || value <= 0)) {
      throw new Error("La valeur doit être un nombre positif.");
    }
    
    if (field === 'model' && !value) {
      throw new Error("Le modèle ne peut pas être vide.");
    }
    
    // Find the bar
    if (!data.motherBars[model] || !data.motherBars[model].some(b => b.length === length)) {
      throw new Error(`Barre mère ${model} de longueur ${length} non trouvée.`);
    }
    
    // Special case: changing the model
    if (field === 'model') {
      // Create a copy with the new model
      const bar = data.motherBars[model].find(b => b.length === length);
      this.dataManager.addMotherBar(value, bar.length, bar.quantity);
      
      // Remove the old bar
      this.dataManager.deleteMotherBar(model, length);
    } 
    // Special case: changing the length
    else if (field === 'length') {
      // Create a copy with the new length
      const bar = data.motherBars[model].find(b => b.length === length);
      this.dataManager.addMotherBar(model, value, bar.quantity);
      
      // Remove the old bar
      this.dataManager.deleteMotherBar(model, length);
    }
    // Updating quantity
    else if (field === 'quantity') {
      const barIndex = data.motherBars[model].findIndex(b => b.length === length);
      if (barIndex !== -1) {
        data.motherBars[model][barIndex].quantity = value;
      }
    }
  },
  
  /**
   * Update a piece value
   * @param {string} model - Original model name
   * @param {number} length - Original length
   * @param {string} field - Field to update
   * @param {string|number} value - New value
   */
  updatePieceValue: function(model, length, field, value) {
    const data = this.dataManager.getData();
    
    // Validate input
    if ((field === 'length' || field === 'quantity') && (isNaN(value) || value <= 0)) {
      throw new Error("La valeur doit être un nombre positif.");
    }
    
    if (field === 'model' && !value) {
      throw new Error("Le modèle ne peut pas être vide.");
    }
    
    // Find the piece
    if (!data.pieces[model] || !data.pieces[model].some(p => p.length === length)) {
      throw new Error(`Pièce ${model} de longueur ${length} non trouvée.`);
    }
    
    // Special case: changing the model
    if (field === 'model') {
      // Create a copy with the new model
      const piece = data.pieces[model].find(p => p.length === length);
      this.dataManager.addPiece(value, piece.length, piece.quantity);
      
      // Remove the old piece
      this.dataManager.deletePiece(model, length);
    } 
    // Special case: changing the length
    else if (field === 'length') {
      // Create a copy with the new length
      const piece = data.pieces[model].find(p => p.length === length);
      this.dataManager.addPiece(model, value, piece.quantity);
      
      // Remove the old piece
      this.dataManager.deletePiece(model, length);
    }
    // Updating quantity
    else if (field === 'quantity') {
      const pieceIndex = data.pieces[model].findIndex(p => p.length === length);
      if (pieceIndex !== -1) {
        data.pieces[model][pieceIndex].quantity = value;
      }
    }
  },
  
  /**
   * Set up event handlers for algorithm buttons
   */
  setupAlgorithmButtons: function() {
    // First-Fit Decreasing button
    document.getElementById('run-ffd-btn').addEventListener('click', () => {
      this.executeAlgorithm('ffd');
    });
    
    // ILP button
    document.getElementById('run-ilp-btn').addEventListener('click', () => {
      this.executeAlgorithm('ilp');
    });
    
    // Compare button
    document.getElementById('run-compare-btn').addEventListener('click', () => {
      this.executeAlgorithm('compare');
    });
  },
  
  /**
   * Execute an algorithm and handle results
   * @param {string} type - Algorithm type ('ffd', 'ilp', 'compare')
   */
  executeAlgorithm: function(type) {
    try {
      // Validate data
      this.dataManager.validateData();
      
      // Show loading overlay
      document.getElementById('loading-overlay').classList.remove('hidden');
      
      // Navigate to results section if not comparing
      if (type !== 'compare') {
        document.querySelectorAll('.nav-btn')[1].click();
      }
      
      // Set algorithm name in result header
      const algorithmName = type === 'greedy' || type === 'ffd' ? 'First-Fit Decreasing' : 
                           (type === 'ilp' ? 'Programmation Linéaire (ILP)' : 'Comparaison');
      document.getElementById('result-algorithm').textContent = algorithmName;
      
      // Execute algorithm with a small delay to allow UI update
      setTimeout(() => {
        try {
          // Get algorithm results
          const results = this.algorithmService.runAlgorithm(type, this.dataManager.getData());
          
          // Navigate to results tab if it was a comparison
          if (type === 'compare') {
            document.querySelectorAll('.nav-btn')[1].click();
            
            // Update algorithm name based on results
            const bestAlgoName = results.bestAlgorithm === 'ffd' ? 
                'First-Fit Decreasing (meilleur)' : 'Programmation Linéaire (meilleur)';
            document.getElementById('result-algorithm').textContent = bestAlgoName;
          }
          
          // Render the results
          this.resultsRenderer.renderResults(results, this.algorithmService);
          
        } catch (error) {
          console.error('Algorithm execution error:', error);
          const container = document.getElementById('results-container');
          this.resultsRenderer.renderErrorMessage(
            container,
            "Erreur lors de l'exécution",
            error.message || "Une erreur s'est produite"
          );
        } finally {
          // Hide loading overlay
          document.getElementById('loading-overlay').classList.add('hidden');
        }
      }, 100);
    } catch (error) {
      alert(error.message);
    }
  },
  
  /**
   * Render both tables with current data
   */
  renderTables: function() {
    this.renderStockBarsTable();
    this.renderPiecesTable();
  },
  
  /**
   * Render the stock bars table
   */
  renderStockBarsTable: function() {
    const table = document.getElementById('stock-bars-table');
    const data = this.dataManager.getData();
    
    // Create header
    let html = `
      <thead>
        <tr>
          <th>Modèle</th>
          <th>Longueur</th>
          <th>Quantité</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
    `;
    
    // Add rows for each mother bar
    for (const model in data.motherBars) {
      for (const bar of data.motherBars[model]) {
        html += `
          <tr data-model="${model}" data-length="${bar.length}">
            <td class="editable-cell" data-field="model">${model}</td>
            <td class="editable-cell" data-field="length">${bar.length}</td>
            <td class="editable-cell" data-field="quantity">${bar.quantity}</td>
            <td class="delete-cell">
              <button class="btn btn-sm btn-danger delete-btn">×</button>
            </td>
          </tr>
        `;
      }
    }
    
    // Close tbody
    html += `</tbody>`;
    
    // Save add row
    const addRow = table.querySelector('.add-row');
    
    // Update table
    table.innerHTML = html;
    
    // Add back the add row
    if (addRow) {
      table.appendChild(addRow);
    }
  },
  
  /**
   * Render the pieces table
   */
  renderPiecesTable: function() {
    const table = document.getElementById('pieces-table');
    const data = this.dataManager.getData();
    
    // Create header
    let html = `
      <thead>
        <tr>
          <th>Modèle</th>
          <th>Longueur</th>
          <th>Quantité</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
    `;
    
    // Add rows for each piece
    for (const model in data.pieces) {
      for (const piece of data.pieces[model]) {
        html += `
          <tr data-model="${model}" data-length="${piece.length}">
            <td class="editable-cell" data-field="model">${model}</td>
            <td class="editable-cell" data-field="length">${piece.length}</td>
            <td class="editable-cell" data-field="quantity">${piece.quantity}</td>
            <td class="delete-cell">
              <button class="btn btn-sm btn-danger delete-btn">×</button>
            </td>
          </tr>
        `;
      }
    }
    
    // Close tbody
    html += `</tbody>`;
    
    // Save add row
    const addRow = table.querySelector('.add-row');
    
    // Update table
    table.innerHTML = html;
    
    // Add back the add row
    if (addRow) {
      table.appendChild(addRow);
    }
  }
};