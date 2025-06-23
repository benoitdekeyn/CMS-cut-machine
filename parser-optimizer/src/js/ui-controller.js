/**
 * Contrôleur d'interface utilisateur
 */
export const UIController = {
  // Références aux services
  dataManager: null,
  algorithmService: null,
  resultsRenderer: null,
  importManager: null,
  pgmGenerator: null,
  
  /**
   * Initialise le contrôleur UI avec les dépendances
   * @param {Object} options - Options d'initialisation
   */
  init: function(options) {
    // Stocke les références aux services
    this.dataManager = options.dataManager;
    this.algorithmService = options.algorithmService;
    this.resultsRenderer = options.resultsRenderer;
    this.importManager = options.importManager;
    this.pgmGenerator = options.pgmGenerator;
    
    // Initialiser les gestionnaires d'événements
    this.initEventHandlers();
    
    // Initialiser les sections
    this.initImportSection();
  },
  
  /**
   * Initialise tous les gestionnaires d'événements
   */
  initEventHandlers: function() {
    // Navigation entre sections
    document.querySelectorAll('.nav-btn').forEach(button => {
      button.addEventListener('click', () => {
        const sectionId = button.getAttribute('data-section');
        this.navigateToSection(sectionId);
      });
    });
    
    // Boutons d'optimisation
    document.getElementById('run-ffd-btn').addEventListener('click', () => this.runOptimization('ffd'));
    document.getElementById('run-ilp-btn').addEventListener('click', () => this.runOptimization('ilp'));
    document.getElementById('run-compare-btn').addEventListener('click', () => this.runOptimization('compare'));
    
    // Bouton de retour à l'édition
    document.getElementById('back-to-edit-btn').addEventListener('click', () => this.navigateToSection('edit-section'));
    
    // Bouton pour importer plus de fichiers
    document.getElementById('import-more-btn').addEventListener('click', () => this.navigateToSection('import-section'));
    
    // Bouton de téléchargement de tous les PGM
    document.getElementById('download-all-pgm').addEventListener('click', () => this.downloadAllPgm());
  },
  
  /**
   * Initialise la section d'import
   */
  initImportSection: function() {
    // Configurer le drag & drop pour l'import
    const dropZone = document.querySelector('.file-drop-zone');
    const fileInput = document.getElementById('nc2-files-input');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('active');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('active');
      });
    });
    
    dropZone.addEventListener('drop', async e => {
      const files = e.dataTransfer.files;
      await this.processImportedFiles(files);
    });
    
    fileInput.addEventListener('change', async () => {
      const files = fileInput.files;
      await this.processImportedFiles(files);
    });
  },
  
  /**
   * Traite les fichiers importés
   * @param {FileList} files - Liste des fichiers à traiter
   */
  processImportedFiles: async function(files) {
    if (files.length === 0) return;
    
    console.log('Processing files:', files);
    document.getElementById('loading-overlay').classList.remove('hidden');
    
    try {
      // Utiliser ImportManager pour traiter les fichiers
      const importedBars = await this.importManager.processMultipleFiles(files);
      console.log('Imported bars:', importedBars);
      
      if (importedBars && importedBars.length > 0) {
        // Ajouter les barres importées au DataManager
        this.dataManager.addBars(importedBars);
        
        // Naviguer vers la section d'édition et afficher les données
        this.navigateToSection('edit-section');
        this.renderEditSection();
        
        console.log(`${importedBars.length} pièce(s) importée(s) avec succès`);
      } else {
        console.warn('Aucune pièce valide n\'a été trouvée dans les fichiers');
      }
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      document.getElementById('loading-overlay').classList.add('hidden');
    }
  },
  
  /**
   * Affiche la section spécifiée
   * @param {string} sectionId - ID de la section à afficher
   */
  navigateToSection: function(sectionId) {
    // Mettre à jour les boutons de navigation
    document.querySelectorAll('.nav-btn').forEach(button => {
      if (button.getAttribute('data-section') === sectionId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Afficher la section correspondante
    document.querySelectorAll('.content-section').forEach(section => {
      if (section.id === sectionId) {
        section.classList.add('active');
        
        // Si c'est la section d'édition, mettre à jour le rendu
        if (sectionId === 'edit-section') {
          this.renderEditSection();
        }
      } else {
        section.classList.remove('active');
      }
    });
  },
  
  /**
   * Rend la section d'édition avec les données actuelles
   */
  renderEditSection: function() {
    // Afficher les barres filles
    this.renderPiecesTable();
    
    // Afficher les barres mères
    this.renderStockBarsTable();
    
    // Initialiser le modal d'ajout de barre mère
    this.initAddMotherBarModal();
  },
  
  /**
   * Rend le tableau des barres filles
   */
  renderPiecesTable: function() {
    const tableBody = document.querySelector('#pieces-table tbody');
    const data = this.dataManager.getData();
    let html = '';
    
    // Générer une ligne pour chaque type de pièce
    for (const model in data.pieces) {
      for (const piece of data.pieces[model]) {
        // Utiliser le nom complet du profil pour l'affichage
        const displayName = piece.profileFull || model;
        
        html += `
          <tr data-model="${model}" data-length="${piece.length}">
            <td class="editable-cell" data-field="model" title="Modèle court: ${model}">${displayName}</td>
            <td class="editable-cell" data-field="length">${piece.length}</td>
            <td class="editable-cell" data-field="quantity">${piece.quantity}</td>
            <td class="delete-cell">
              <button class="btn btn-sm btn-danger delete-piece-btn" data-model="${model}" data-length="${piece.length}">×</button>
            </td>
          </tr>
        `;
      }
    }
    
    tableBody.innerHTML = html;
    
    // Ajouter les gestionnaires d'événements pour les cellules éditables
    this.initEditableCells(tableBody, 'piece');
    
    // Ajouter les gestionnaires d'événements pour les boutons de suppression
    tableBody.querySelectorAll('.delete-piece-btn').forEach(button => {
      button.addEventListener('click', () => {
        const model = button.getAttribute('data-model');
        const length = parseFloat(button.getAttribute('data-length'));
        this.dataManager.deletePiece(model, length);
        this.renderPiecesTable();
      });
    });
  },
  
  /**
   * Rend le tableau des barres mères
   */
  renderStockBarsTable: function() {
    const tableBody = document.querySelector('#stock-bars-table tbody');
    const data = this.dataManager.getData();
    let html = '';
    
    // Générer une ligne pour chaque type de barre mère
    for (const model in data.motherBars) {
      for (const bar of data.motherBars[model]) {
        // Utiliser le nom complet du profil pour l'affichage
        const displayName = bar.profileFull || model;
        
        html += `
          <tr data-model="${model}" data-length="${bar.length}">
            <td class="editable-cell" data-field="model" title="Modèle court: ${model}">${displayName}</td>
            <td class="editable-cell" data-field="length">${bar.length}</td>
            <td class="editable-cell" data-field="quantity">${bar.quantity}</td>
            <td class="delete-cell">
              <button class="btn btn-sm btn-danger delete-stock-btn" data-model="${model}" data-length="${bar.length}">×</button>
            </td>
          </tr>
        `;
      }
    }
    
    // Ajouter une ligne pour le bouton d'ajout
    html += `
      <tr class="add-row">
        <td colspan="4">
          <button id="add-mother-bar-btn" class="btn btn-sm btn-primary">+ Ajouter une barre mère</button>
        </td>
      </tr>
    `;
    
    tableBody.innerHTML = html;
    
    // Ajouter les gestionnaires d'événements pour les cellules éditables
    this.initEditableCells(tableBody, 'stock');
    
    // Ajouter les gestionnaires d'événements pour les boutons de suppression
    tableBody.querySelectorAll('.delete-stock-btn').forEach(button => {
      button.addEventListener('click', () => {
        const model = button.getAttribute('data-model');
        const length = parseFloat(button.getAttribute('data-length'));
        this.dataManager.removeMotherBar(model, length);
        this.renderStockBarsTable();
      });
    });
    
    // Ajouter le gestionnaire pour le bouton d'ajout
    document.getElementById('add-mother-bar-btn').addEventListener('click', () => {
      this.openAddMotherBarModal();
    });
  },
  
  /**
   * Initialise les cellules éditables d'une table
   * @param {HTMLElement} tableBody - Élément tbody de la table
   * @param {string} type - Type d'élément ('piece' ou 'stock')
   */
  initEditableCells: function(tableBody, type) {
    tableBody.querySelectorAll('.editable-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        // Ne pas rendre éditable si déjà en mode édition
        if (cell.classList.contains('editing')) return;
        
        const value = cell.textContent;
        const field = cell.getAttribute('data-field');
        const row = cell.parentNode;
        const model = row.getAttribute('data-model');
        const length = parseFloat(row.getAttribute('data-length'));
        
        // Créer un champ de saisie
        cell.classList.add('editing');
        const input = document.createElement('input');
        input.type = field === 'quantity' ? 'number' : field === 'length' ? 'number' : 'text';
        input.value = value;
        input.min = field === 'quantity' || field === 'length' ? '1' : '';
        input.step = field === 'length' ? '0.1' : '1';
        
        // Remplacer le contenu par le champ
        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
        
        // Gérer la validation
        const handleValidation = () => {
          const newValue = input.value.trim();
          cell.classList.remove('editing');
          
          // Si la valeur a changé, mettre à jour les données
          if (newValue !== value && newValue !== '') {
            if (type === 'piece') {
              if (field === 'quantity') {
                this.dataManager.updatePieceQuantity(model, length, parseInt(newValue, 10));
              } else if (field === 'length') {
                this.dataManager.updatePieceLength(model, length, parseFloat(newValue));
              } else if (field === 'model') {
                this.dataManager.updatePieceModel(model, length, newValue);
              }
              this.renderPiecesTable();
            } else if (type === 'stock') {
              if (field === 'quantity') {
                this.dataManager.updateMotherBarQuantity(model, length, parseInt(newValue, 10));
              } else if (field === 'length') {
                this.dataManager.updateMotherBarLength(model, length, parseFloat(newValue));
              } else if (field === 'model') {
                this.dataManager.updateMotherBarModel(model, length, newValue);
              }
              this.renderStockBarsTable();
            }
          } else {
            // Si la valeur n'a pas changé, restaurer le texte
            cell.textContent = value;
          }
        };
        
        // Event listeners pour la validation
        input.addEventListener('blur', handleValidation);
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleValidation();
          }
        });
      });
    });
  },
  
  /**
   * Initialise le modal d'ajout de barre mère
   */
  initAddMotherBarModal: function() {
    const modal = document.getElementById('add-mother-bar-modal');
    const closeButtons = modal.querySelectorAll('.close-modal');
    
    // Gestionnaires pour fermer le modal
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    });
    
    // Remplir le select avec les modèles disponibles
    const select = document.getElementById('mother-bar-profile');
    select.innerHTML = '';
    
    // Récupérer tous les modèles uniques (barres filles et mères)
    const data = this.dataManager.getData();
    const models = new Set();
    
    // Ajouter les modèles des barres filles
    for (const model in data.pieces) {
      models.add(model);
    }
    
    // Ajouter les modèles des barres mères
    for (const model in data.motherBars) {
      models.add(model);
    }
    
    // Créer les options
    for (const model of models) {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      select.appendChild(option);
    }
    
    // Gestionnaire pour le bouton d'ajout
    document.getElementById('confirm-add-mother-bar').addEventListener('click', () => {
      const model = select.value;
      const length = parseFloat(document.getElementById('mother-bar-length').value);
      const quantity = parseInt(document.getElementById('mother-bar-quantity').value, 10);
      
      if (model && length && quantity) {
        this.dataManager.addMotherBar(model, length, quantity);
        this.renderStockBarsTable();
        modal.classList.add('hidden');
      } else {
        alert('Veuillez remplir tous les champs correctement.');
      }
    });
  },
  
  /**
   * Ouvre le modal d'ajout de barre mère
   */
  openAddMotherBarModal: function() {
    const modal = document.getElementById('add-mother-bar-modal');
    modal.classList.remove('hidden');
    
    // Réinitialiser les champs
    document.getElementById('mother-bar-length').value = '';
    document.getElementById('mother-bar-quantity').value = '1';
  },
  
  /**
   * Exécute l'algorithme d'optimisation
   * @param {string} type - Type d'algorithme ('ffd', 'ilp', 'compare')
   */
  runOptimization: function(type) {
    try {
      // Valider les données
      this.dataManager.validateData();
      
      const data = this.dataManager.getData();
      console.log('Running optimization with data:', data);
      
      document.getElementById('loading-overlay').classList.remove('hidden');
      
      setTimeout(() => {
        try {
          let result;
          
          if (type === 'ffd') {
            result = this.algorithmService.runAlgorithm('ffd', data);
          } else if (type === 'ilp') {
            result = this.algorithmService.runAlgorithm('ilp', data);
          } else if (type === 'compare') {
            result = this.algorithmService.compareAlgorithms(data);
          } else {
            throw new Error("Type d'algorithme inconnu");
          }
          
          console.log('Optimization result:', result);
          
          // Naviguer vers la section des résultats
          this.navigateToSection('results-section');
          
          // Afficher les résultats
          this.resultsRenderer.renderResults(result, type);
          
          // Générer les aperçus PGM
          this.generatePgmPreviews(result);
        } catch (error) {
          console.error('Optimization error:', error);
        } finally {
          document.getElementById('loading-overlay').classList.add('hidden');
        }
      }, 100);
    } catch (error) {
      console.error(error.message);
    }
  },
  
  /**
   * Génère les aperçus des fichiers PGM
   * @param {Object} results - Résultats de l'optimisation
   */
  generatePgmPreviews: function(results) {
    try {
      const container = document.getElementById('pgm-files-list');
      let html = '';
      
      // Pour chaque modèle
      for (const model in results.modelResults) {
        const modelResults = results.modelResults[model];
        
        // Pour chaque schéma de coupe
        modelResults.layouts.forEach((layout, index) => {
          const fileName = `${model}_${Math.round(layout.barLength)}.pgm`;
          
          html += `
            <div class="pgm-file-item">
              <div class="pgm-file-info">
                <span class="pgm-file-name">${fileName}</span>
                <span class="pgm-file-model">${model}</span>
                <span class="pgm-file-length">Longueur: ${layout.barLength}</span>
                <span class="pgm-file-pieces">Pièces: ${layout.cuts ? layout.cuts.length : 0}</span>
              </div>
              <button class="btn btn-sm btn-primary download-pgm-btn" 
                      data-model="${model}" 
                      data-index="${index}">
                Télécharger
              </button>
            </div>
          `;
        });
      }
      
      container.innerHTML = html;
      
      // Configurer les boutons de téléchargement
      container.querySelectorAll('.download-pgm-btn').forEach(button => {
        button.addEventListener('click', () => {
          const model = button.getAttribute('data-model');
          const index = parseInt(button.getAttribute('data-index'), 10);
          
          const layout = results.modelResults[model].layouts[index];
          const pgmContent = this.pgmGenerator.generatePgm(layout, model);
          
          // Télécharger le fichier
          this.downloadFile(pgmContent, `${model}_${Math.round(layout.barLength)}.pgm`, 'text/plain');
        });
      });
    } catch (error) {
      console.error('Erreur lors de la génération des aperçus PGM:', error);
      document.getElementById('pgm-files-list').innerHTML = '<p class="error-text">Une erreur est survenue lors de la génération des aperçus PGM.</p>';
    }
  },
  
  /**
   * Télécharge tous les fichiers PGM
   */
  downloadAllPgm: async function() {
    try {
      document.getElementById('loading-overlay').classList.remove('hidden');
      
      // Obtenir les résultats actuels
      const resultsContainer = document.getElementById('results-display');
      if (!resultsContainer.dataset.results) {
        console.error('Aucun résultat disponible');
        return;
      }
      
      const results = JSON.parse(resultsContainer.dataset.results);
      
      // Générer le ZIP avec tous les fichiers PGM
      const blob = await this.pgmGenerator.generateAllPgmFiles(results, this.dataManager);
      
      // Télécharger le ZIP
      this.downloadFile(blob, 'pgm_files.zip', 'application/zip');
      
      console.log('Fichiers PGM téléchargés avec succès');
    } catch (error) {
      console.error('Error generating PGM files:', error);
    } finally {
      document.getElementById('loading-overlay').classList.add('hidden');
    }
  },
  
  /**
   * Télécharge un fichier
   * @param {Blob|string} content - Contenu du fichier
   * @param {string} filename - Nom du fichier
   * @param {string} type - Type MIME
   */
  downloadFile: function(content, filename, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};