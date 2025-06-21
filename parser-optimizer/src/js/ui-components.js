import { DataManager } from './data-manager.js';
import { AlgorithmHandler } from './algorithm-handler.js';

export const UIComponents = {
    init: function(data) {
        this.setupNavigation();
        this.setupImportModal();
        this.setupTableActions(data);
        this.setupAlgorithmButtons(data);
        this.renderTables(data);
    },

    setupNavigation: function() {
        // Setup navigation between sections
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all nav buttons
                document.querySelectorAll('.nav-btn').forEach(navBtn => {
                    navBtn.classList.remove('active');
                });
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Show corresponding section
                const sectionId = btn.dataset.section;
                
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                document.getElementById(sectionId).classList.add('active');
            });
        });
    },

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
            const fileName = e.target.files[0] ? e.target.files[0].name : '';
            const fileNameElement = document.querySelector('.file-name');
            
            if (fileName) {
                fileNameElement.textContent = fileName;
                fileNameElement.classList.add('active');
            } else {
                fileNameElement.textContent = '';
                fileNameElement.classList.remove('active');
            }
        });

        // Import button in modal
        document.getElementById('confirm-import').addEventListener('click', () => {
            const fileInput = document.getElementById('csv-file-input');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Veuillez sélectionner un fichier CSV');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    // Process the CSV content
                    DataManager.parsePiecesCSV(event.target.result);
                    
                    // Close the modal and update the UI
                    document.getElementById('import-modal').classList.add('hidden');
                    this.renderTables(DataManager.getData());
                    
                    // Navigate to the data section
                    document.querySelectorAll('.nav-btn')[0].click();
                } catch (error) {
                    alert(`Erreur lors de l'importation: ${error.message}`);
                }
            };
            
            reader.readAsText(file);
        });
    },

    setupTableActions: function(data) {
        // Add stock bar button
        document.getElementById('add-stock-bar-btn').addEventListener('click', () => {
            document.getElementById('add-stock-bar-row').classList.remove('hidden');
            document.getElementById('new-stock-model').focus();
        });

        // Cancel add stock bar
        document.getElementById('cancel-add-stock').addEventListener('click', () => {
            document.getElementById('add-stock-bar-row').classList.add('hidden');
            document.getElementById('new-stock-model').value = '';
            document.getElementById('new-stock-length').value = '';
            document.getElementById('new-stock-quantity').value = '100000';
        });

        // Confirm add stock bar
        document.getElementById('confirm-add-stock').addEventListener('click', () => {
            const model = document.getElementById('new-stock-model').value.trim();
            const length = parseInt(document.getElementById('new-stock-length').value);
            const quantity = parseInt(document.getElementById('new-stock-quantity').value) || 100000;
            
            if (!model) {
                alert('Le modèle est requis');
                return;
            }
            
            if (!length || length <= 0) {
                alert('La longueur doit être un nombre positif');
                return;
            }
            
            if (DataManager.addMotherBar(model, length, quantity, data)) {
                this.renderStockBarsTable(data);
                document.getElementById('add-stock-bar-row').classList.add('hidden');
                document.getElementById('new-stock-model').value = '';
                document.getElementById('new-stock-length').value = '';
                document.getElementById('new-stock-quantity').value = '100000';
            }
        });

        // Add piece button
        document.getElementById('add-piece-btn').addEventListener('click', () => {
            document.getElementById('add-piece-row').classList.remove('hidden');
            document.getElementById('new-piece-model').focus();
        });

        // Cancel add piece
        document.getElementById('cancel-add-piece').addEventListener('click', () => {
            document.getElementById('add-piece-row').classList.add('hidden');
            document.getElementById('new-piece-model').value = '';
            document.getElementById('new-piece-length').value = '';
            document.getElementById('new-piece-quantity').value = '1';
        });

        // Confirm add piece
        document.getElementById('confirm-add-piece').addEventListener('click', () => {
            const model = document.getElementById('new-piece-model').value.trim();
            const length = parseInt(document.getElementById('new-piece-length').value);
            const quantity = parseInt(document.getElementById('new-piece-quantity').value) || 1;
            
            if (!model) {
                alert('Le modèle est requis');
                return;
            }
            
            if (!length || length <= 0) {
                alert('La longueur doit être un nombre positif');
                return;
            }
            
            if (DataManager.addPiece(model, length, quantity, data)) {
                this.renderPiecesTable(data);
                document.getElementById('add-piece-row').classList.add('hidden');
                document.getElementById('new-piece-model').value = '';
                document.getElementById('new-piece-length').value = '';
                document.getElementById('new-piece-quantity').value = '1';
            }
        });
    },

    setupAlgorithmButtons: function(data) {
        // Single algorithm buttons
        document.getElementById('run-ffd-btn').addEventListener('click', () => {
            AlgorithmHandler.runAlgorithm('greedy', DataManager.getData());
        });

        document.getElementById('run-ilp-btn').addEventListener('click', () => {
            AlgorithmHandler.runAlgorithm('ilp', DataManager.getData());
        });
        
        // Compare button
        document.getElementById('run-compare-btn').addEventListener('click', () => {
            AlgorithmHandler.runAlgorithm('compare', DataManager.getData());
        });
    },

    renderTables: function(data) {
        this.renderStockBarsTable(data);
        this.renderPiecesTable(data);
    },

    renderStockBarsTable: function(data) {
        const tbody = document.querySelector('#stock-bars-table tbody');
        tbody.innerHTML = '';

        // Créer un datalist pour les suggestions de modèles
        let datalistId = 'model-suggestions-bars';
        let datalist = document.getElementById(datalistId);
        
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            document.body.appendChild(datalist);
        } else {
            datalist.innerHTML = '';
        }
        
        // Ajouter tous les modèles existants
        const allModels = new Set([
            ...Object.keys(data.motherBars),
            ...Object.keys(data.pieces)
        ]);
        
        allModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            datalist.appendChild(option);
        });

        // Associer le datalist au champ d'entrée de nouveau modèle
        const newModelInput = document.getElementById('new-stock-model');
        if (newModelInput) {
            newModelInput.setAttribute('list', datalistId);
        }

        if (Object.keys(data.motherBars).length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" class="text-center">Aucune barre mère définie</td>`;
            tbody.appendChild(tr);
            return;
        }

        // Render each stock bar
        for (const model in data.motherBars) {
            data.motherBars[model].forEach(bar => {
                const tr = document.createElement('tr');
                tr.dataset.model = model;
                tr.dataset.length = bar.length;
                
                tr.innerHTML = `
                    <td class="editable-cell" data-field="model">${model}</td>
                    <td class="editable-cell" data-field="length">${bar.length}</td>
                    <td class="editable-cell" data-field="quantity">${bar.quantity}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-danger delete-stock-btn">✕</button>
                        </div>
                    </td>
                `;
                
                tbody.appendChild(tr);
                
                // Add event listener for delete button
                tr.querySelector('.delete-stock-btn').addEventListener('click', () => {
                    if (DataManager.deleteMotherBar(model, bar.length, data)) {
                        this.renderStockBarsTable(data);
                    }
                });
                
                // Add event listeners for editable cells
                tr.querySelectorAll('.editable-cell').forEach(cell => {
                    cell.addEventListener('click', () => {
                        // Only one cell can be edited at a time
                        if (document.querySelector('.editing')) return;
                        
                        const field = cell.dataset.field;
                        const currentValue = cell.textContent;
                        
                        cell.classList.add('editing');
                        cell.innerHTML = `<input type="text" value="${currentValue}">`;
                        
                        const input = cell.querySelector('input');
                        input.focus();
                        input.select();
                        
                        // Handle Enter key
                        input.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                this.updateStockBarValue(tr, field, input.value, data);
                            }
                        });
                        
                        // Handle blur (clicking outside)
                        input.addEventListener('blur', () => {
                            this.updateStockBarValue(tr, field, input.value, data);
                        });
                    });
                });
            });
        }
    },

    updateStockBarValue: function(tr, field, value, data) {
        const oldModel = tr.dataset.model;
        const oldLength = parseInt(tr.dataset.length);
        let newModel = oldModel;
        let newLength = oldLength;
        let newQuantity = 0;
        
        if (field === 'model') {
            newModel = value.trim();
            if (!newModel) {
                alert('Le modèle ne peut pas être vide');
                this.renderStockBarsTable(data);
                return;
            }
        } else if (field === 'length') {
            newLength = parseInt(value);
            if (!newLength || newLength <= 0) {
                alert('La longueur doit être un nombre positif');
                this.renderStockBarsTable(data);
                return;
            }
        } else if (field === 'quantity') {
            newQuantity = parseInt(value);
            if (!newQuantity || newQuantity <= 0) {
                alert('La quantité doit être un nombre positif');
                this.renderStockBarsTable(data);
                return;
            }
        }
        
        // First delete the old bar
        if (DataManager.deleteMotherBar(oldModel, oldLength, data)) {
            // Then add the updated one
            if (field === 'quantity') {
                DataManager.addMotherBar(oldModel, oldLength, newQuantity, data);
            } else if (field === 'model') {
                const oldQuantity = data.motherBars[oldModel]?.find(b => b.length === oldLength)?.quantity || 100000;
                DataManager.addMotherBar(newModel, oldLength, oldQuantity, data);
            } else if (field === 'length') {
                const oldQuantity = data.motherBars[oldModel]?.find(b => b.length === oldLength)?.quantity || 100000;
                DataManager.addMotherBar(oldModel, newLength, oldQuantity, data);
            }
            
            // Refresh the table
            this.renderStockBarsTable(data);
        } else {
            alert('Erreur lors de la mise à jour');
            this.renderStockBarsTable(data);
        }
    },

    renderPiecesTable: function(data) {
        const tbody = document.querySelector('#pieces-table tbody');
        tbody.innerHTML = '';

        // Créer un datalist pour les suggestions de modèles
        let datalistId = 'model-suggestions-pieces';
        let datalist = document.getElementById(datalistId);
        
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            document.body.appendChild(datalist);
        } else {
            datalist.innerHTML = '';
        }
        
        // Ajouter tous les modèles existants
        const allModels = new Set([
            ...Object.keys(data.motherBars),
            ...Object.keys(data.pieces)
        ]);
        
        allModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            datalist.appendChild(option);
        });

        // Associer le datalist au champ d'entrée de nouveau modèle
        const newModelInput = document.getElementById('new-piece-model');
        if (newModelInput) {
            newModelInput.setAttribute('list', datalistId);
        }

        if (Object.keys(data.pieces).length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" class="text-center">Aucune pièce définie</td>`;
            tbody.appendChild(tr);
            return;
        }

        // Render each piece
        for (const model in data.pieces) {
            data.pieces[model].forEach(piece => {
                const tr = document.createElement('tr');
                tr.dataset.model = model;
                tr.dataset.length = piece.length;
                
                tr.innerHTML = `
                    <td class="editable-cell" data-field="model">${model}</td>
                    <td class="editable-cell" data-field="length">${piece.length}</td>
                    <td class="editable-cell" data-field="quantity">${piece.quantity}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-danger delete-piece-btn">✕</button>
                        </div>
                    </td>
                `;
                
                tbody.appendChild(tr);
                
                // Add event listener for delete button
                tr.querySelector('.delete-piece-btn').addEventListener('click', () => {
                    if (DataManager.deletePiece(model, piece.length, data)) {
                        this.renderPiecesTable(data);
                    }
                });
                
                // Add event listeners for editable cells
                tr.querySelectorAll('.editable-cell').forEach(cell => {
                    cell.addEventListener('click', () => {
                        // Only one cell can be edited at a time
                        if (document.querySelector('.editing')) return;
                        
                        const field = cell.dataset.field;
                        const currentValue = cell.textContent;
                        
                        cell.classList.add('editing');
                        cell.innerHTML = `<input type="text" value="${currentValue}">`;
                        
                        const input = cell.querySelector('input');
                        input.focus();
                        input.select();
                        
                        // Handle Enter key
                        input.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                this.updatePieceValue(tr, field, input.value, data);
                            }
                        });
                        
                        // Handle blur (clicking outside)
                        input.addEventListener('blur', () => {
                            this.updatePieceValue(tr, field, input.value, data);
                        });
                    });
                });
            });
        }
    },

    updatePieceValue: function(tr, field, value, data) {
        const oldModel = tr.dataset.model;
        const oldLength = parseInt(tr.dataset.length);
        let newModel = oldModel;
        let newLength = oldLength;
        let newQuantity = 0;
        
        if (field === 'model') {
            newModel = value.trim();
            if (!newModel) {
                alert('Le modèle ne peut pas être vide');
                this.renderPiecesTable(data);
                return;
            }
        } else if (field === 'length') {
            newLength = parseInt(value);
            if (!newLength || newLength <= 0) {
                alert('La longueur doit être un nombre positif');
                this.renderPiecesTable(data);
                return;
            }
        } else if (field === 'quantity') {
            newQuantity = parseInt(value);
            if (!newQuantity || newQuantity <= 0) {
                alert('La quantité doit être un nombre positif');
                this.renderPiecesTable(data);
                return;
            }
        }
        
        // First delete the old piece
        if (DataManager.deletePiece(oldModel, oldLength, data)) {
            // Then add the updated one
            if (field === 'quantity') {
                DataManager.addPiece(oldModel, oldLength, newQuantity, data);
            } else if (field === 'model') {
                const oldQuantity = data.pieces[oldModel]?.find(p => p.length === oldLength)?.quantity || 1;
                DataManager.addPiece(newModel, oldLength, oldQuantity, data);
            } else if (field === 'length') {
                const oldQuantity = data.pieces[oldModel]?.find(p => p.length === oldLength)?.quantity || 1;
                DataManager.addPiece(oldModel, newLength, oldQuantity, data);
            }
            
            // Refresh the table
            this.renderPiecesTable(data);
        } else {
            alert('Erreur lors de la mise à jour');
            this.renderPiecesTable(data);
        }
    },


    // Create input sections for adding pieces and mother bars
    createInputSections: function(models, options) {
        const { manualPiecesSection, motherBarsSection, data } = options;
        
        // Vider les sections existantes
        manualPiecesSection.innerHTML = '<h2>Ajouter des Barres à Découper</h2>';
        motherBarsSection.innerHTML = '<h2>Ajouter des Barres Mères</h2>';
        
        // Créer les sélecteurs de modèles
        const pieceModelSelector = this.createModelSelector('piece-model', models);
        const motherModelSelector = this.createModelSelector('mother-model', models);
        
        // Section pour ajouter des barres filles
        const pieceForm = document.createElement('div');
        pieceForm.className = 'form-row';
        pieceForm.innerHTML = `
            <label for="piece-model">Modèle:</label>
            <label for="piece-length">Longueur:</label>
            <input type="number" id="piece-length" min="1" step="1">
            <label for="piece-quantity">Quantité:</label>
            <input type="number" id="piece-quantity" min="1" step="1" value="1">
            <button id="add-piece" class="secondary-btn">Ajouter</button>
        `;
        pieceForm.insertBefore(pieceModelSelector, pieceForm.firstChild);
        manualPiecesSection.appendChild(pieceForm);
        
        // Section pour ajouter des barres mères
        const motherForm = document.createElement('div');
        motherForm.className = 'form-row';
        motherForm.innerHTML = `
            <label for="mother-model">Modèle:</label>
            <label for="mother-length">Longueur:</label>
            <input type="number" id="mother-length" min="1" step="1">
            <label for="mother-quantity">Quantité:</label>
            <input type="number" id="mother-quantity" min="1" step="1" value="100000">
            <button id="add-mother" class="secondary-btn">Ajouter</button>
        `;
        motherForm.insertBefore(motherModelSelector, motherForm.firstChild);
        motherBarsSection.appendChild(motherForm);
        
        // Ajouter les gestionnaires d'événements
        this.setupEventHandlers(data);
    },

    // Create a model selector dropdown
    createModelSelector: function(id, models) {
        const select = document.createElement('select');
        select.id = id;
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            select.appendChild(option);
        });
        
        return select;
    },

    // Setup event handlers for the form inputs
    setupEventHandlers: function(data) {
        // Gestionnaire pour l'ajout de barres filles
        const addPieceBtn = document.getElementById('add-piece');
        const pieceModelSelect = document.getElementById('piece-model');
        const pieceLengthInput = document.getElementById('piece-length');
        const pieceQuantityInput = document.getElementById('piece-quantity');
        
        addPieceBtn.addEventListener('click', () => {
            this.addPieceFromForm(data);
        });
        
        pieceLengthInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addPieceFromForm(data);
            }
        });
        
        // Gestionnaire pour l'ajout de barres mères
        const addMotherBtn = document.getElementById('add-mother');
        const motherLengthInput = document.getElementById('mother-length');
        
        addMotherBtn.addEventListener('click', () => {
            this.addMotherBarFromForm(data);
        });
        
        motherLengthInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addMotherBarFromForm(data);
            }
        });
    },

    // Add piece from form
    addPieceFromForm: function(data) {
        const model = document.getElementById('piece-model').value;
        const length = parseInt(document.getElementById('piece-length').value, 10);
        const quantity = parseInt(document.getElementById('piece-quantity').value, 10) || 1;
        
        if (DataManager.addPiece(model, length, quantity, data)) {
            // Réinitialiser les champs
            document.getElementById('piece-length').value = '';
            document.getElementById('piece-quantity').value = '1';
            document.getElementById('piece-length').focus();
            
            // Mettre à jour l'affichage
            this.updateAllDisplays(data);
        }
    },

    // Add mother bar from form
    addMotherBarFromForm: function(data) {
        const model = document.getElementById('mother-model').value;
        const length = parseInt(document.getElementById('mother-length').value, 10);
        const quantity = parseInt(document.getElementById('mother-quantity').value, 10) || 100000;
        
        if (DataManager.addMotherBar(model, length, quantity, data)) {
            // Réinitialiser les champs
            document.getElementById('mother-length').value = '';
            document.getElementById('mother-quantity').value = '100000';
            document.getElementById('mother-length').focus();
            
            // Mettre à jour l'affichage
            this.updateAllDisplays(data);
        }
    },

    // Show data sections
    showDataSections: function(manualPiecesSection, motherBarsSection, dataOverviewSection, algorithmSelectionSection) {
        manualPiecesSection.classList.remove('hidden');
        motherBarsSection.classList.remove('hidden');
        dataOverviewSection.classList.remove('hidden');
        algorithmSelectionSection.classList.remove('hidden');
    },

    // Update all data displays
    updateAllDisplays: function(data) {
        this.updateDataOverview(data);
    },

    // Create data overview section with tabs
    createDataOverviewSection: function(dataOverviewSection, data) {
        // Mettre à jour l'HTML de la section d'aperçu
        dataOverviewSection.innerHTML = `
            <h2>Aperçu des Données</h2>
            <div class="tabs">
                <button class="tab-btn active" data-tab="pieces-tab">Barres à Découper</button>
                <button class="tab-btn" data-tab="mother-bars-tab">Barres Mères</button>
            </div>
            <div id="pieces-tab" class="tab-content active">
                <div id="pieces-overview"></div>
            </div>
            <div id="mother-bars-tab" class="tab-content">
                <div id="mother-bars-overview"></div>
            </div>
        `;
        
        // Références aux éléments
        const tabBtns = dataOverviewSection.querySelectorAll('.tab-btn');
        const tabContents = dataOverviewSection.querySelectorAll('.tab-content');
        
        // Activer les onglets
        tabBtns.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and contents
                tabBtns.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Show corresponding content
                const tabId = button.dataset.tab;
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Mettre à jour l'affichage des données
        this.updateDataOverview(data);
    },

    // Update the data overview display
    updateDataOverview: function(data) {
        const piecesOverview = document.getElementById('pieces-overview');
        const motherBarsOverview = document.getElementById('mother-bars-overview');
        
        if (!piecesOverview || !motherBarsOverview) return;
        
        // Update pieces overview
        piecesOverview.innerHTML = '';
        
        if (Object.keys(data.pieces).length === 0) {
            piecesOverview.innerHTML = '<p>Aucune donnée de barres disponible.</p>';
        } else {
            Object.keys(data.pieces).forEach(model => {
                const modelDiv = document.createElement('div');
                modelDiv.className = 'model-section';
                
                const modelHeader = document.createElement('div');
                modelHeader.className = 'model-header';
                modelHeader.textContent = `Modèle: ${model}`;
                modelDiv.appendChild(modelHeader);
                
                const table = document.createElement('table');
                table.className = 'data-table';
                
                // Create header row
                const headerRow = document.createElement('tr');
                ['Longueur', 'Quantité', ''].forEach(text => {
                    const th = document.createElement('th');
                    th.textContent = text;
                    if (text === '') th.className = 'delete-cell';
                    headerRow.appendChild(th);
                });
                table.appendChild(headerRow);
                
                // Create data rows
                data.pieces[model].forEach(piece => {
                    const row = document.createElement('tr');
                    
                    const lengthCell = document.createElement('td');
                    lengthCell.textContent = piece.length;
                    row.appendChild(lengthCell);
                    
                    const quantityCell = document.createElement('td');
                    quantityCell.textContent = piece.quantity;
                    row.appendChild(quantityCell);
                    
                    // Delete icon cell at the end
                    const deleteCell = document.createElement('td');
                    deleteCell.className = 'delete-cell';
                    const deleteIcon = document.createElement('span');
                    deleteIcon.className = 'delete-icon';
                    deleteIcon.innerHTML = '&#10005;'; // Croix noire
                    deleteIcon.addEventListener('click', () => {
                        if (DataManager.deletePiece(model, piece.length, data)) {
                            this.updateAllDisplays(data);
                            this.updatePieceModelDropdown(data);
                        }
                    });
                    deleteCell.appendChild(deleteIcon);
                    row.appendChild(deleteCell);
                    
                    table.appendChild(row);
                });
                
                modelDiv.appendChild(table);
                piecesOverview.appendChild(modelDiv);
            });
        }
        
        // Update mother bars overview
        motherBarsOverview.innerHTML = '';
        
        if (Object.keys(data.motherBars).length === 0) {
            motherBarsOverview.innerHTML = '<p>Aucune donnée de barres mères disponible.</p>';
        } else {
            Object.keys(data.motherBars).forEach(model => {
                const modelDiv = document.createElement('div');
                modelDiv.className = 'model-section';
                
                const modelHeader = document.createElement('div');
                modelHeader.className = 'model-header';
                modelHeader.textContent = `Modèle: ${model}`;
                modelDiv.appendChild(modelHeader);
                
                const table = document.createElement('table');
                table.className = 'data-table';
                
                // Create header row
                const headerRow = document.createElement('tr');
                ['Longueur', 'Quantité', ''].forEach(text => {
                    const th = document.createElement('th');
                    th.textContent = text;
                    if (text === '') th.className = 'delete-cell';
                    headerRow.appendChild(th);
                });
                table.appendChild(headerRow);
                
                // Create data rows
                data.motherBars[model].forEach(bar => {
                    const row = document.createElement('tr');
                    
                    const lengthCell = document.createElement('td');
                    lengthCell.textContent = bar.length;
                    row.appendChild(lengthCell);
                    
                    const quantityCell = document.createElement('td');
                    quantityCell.textContent = bar.quantity;
                    row.appendChild(quantityCell);
                    
                    // Delete icon cell at the end
                    const deleteCell = document.createElement('td');
                    deleteCell.className = 'delete-cell';
                    const deleteIcon = document.createElement('span');
                    deleteIcon.className = 'delete-icon';
                    deleteIcon.innerHTML = '&#10005;'; // Croix noire
                    deleteIcon.addEventListener('click', () => {
                        if (DataManager.deleteMotherBar(model, bar.length, data)) {
                            this.updateAllDisplays(data);
                        }
                    });
                    deleteCell.appendChild(deleteIcon);
                    row.appendChild(deleteCell);
                    
                    table.appendChild(row);
                });
                
                modelDiv.appendChild(table);
                motherBarsOverview.appendChild(modelDiv);
            });
        }
    },

    // Update piece model dropdown
    updatePieceModelDropdown: function(data) {
        const pieceModelSelect = document.getElementById('piece-model');
        if (!pieceModelSelect) return;
        
        pieceModelSelect.innerHTML = '';
        
        Object.keys(data.pieces).forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            pieceModelSelect.appendChild(option);
        });
    }
};