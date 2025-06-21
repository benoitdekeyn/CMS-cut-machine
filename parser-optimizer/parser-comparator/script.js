// Éléments DOM
const nc2Upload = document.getElementById('nc2-upload');
const nc2Input = document.getElementById('nc2-file');
const f4cUpload = document.getElementById('f4c-upload');
const f4cInput = document.getElementById('f4c-file');
const opacitySlider = document.getElementById('opacity-slider');
const opacityControl = document.getElementById('opacity-control');
const generatedPreview = document.getElementById('generated-preview');
const referencePreview = document.getElementById('reference-preview');
const generatedContent = document.querySelector('#generated-preview .preview-content');
const referenceContent = document.querySelector('#reference-preview .preview-content');
const sourceContent = document.getElementById('source-content');
const editButton = document.getElementById('edit-button');
const undoButton = document.getElementById('undo-button');
const redoButton = document.getElementById('redo-button');
const downloadButton = document.getElementById('download-button');
const sourceEditButton = document.getElementById('source-edit-button');
const sourceUndoButton = document.getElementById('source-undo-button');
const sourceRedoButton = document.getElementById('source-redo-button');
const convertButton = document.getElementById('convert-button');

// Ajout des éléments DOM pour le contrôle du retour à la ligne
const wordWrapCheckbox = document.getElementById('word-wrap-checkbox');

// État de l'application
let currentNC2File = null;
let currentF4CFile = null;
let isEditing = false;
let isSourceEditing = false;
let undoStack = [];
let redoStack = [];
let sourceUndoStack = [];
let sourceRedoStack = [];
let lastContent = '';
let initialContent = '';
let lastSourceContent = '';
let initialSourceContent = '';

// Gestionnaires d'événements pour le drag & drop
function setupDragAndDrop(dropZone, input, acceptedTypes) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = '#1976D2';
            dropZone.style.backgroundColor = 'rgba(33, 150, 243, 0.05)';
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = '#2196F3';
            dropZone.style.backgroundColor = '#ffffff';
        });
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const fileExt = file.name.toLowerCase().split('.').pop();
            if (acceptedTypes.includes(`.${fileExt}`)) {
                input.files = files;
                handleFileSelect(input);
            }
        }
    });
}

// Configuration du drag & drop
setupDragAndDrop(nc2Upload, nc2Input, ['.nc1', '.nc2']);
setupDragAndDrop(f4cUpload, f4cInput, ['.f4c']);

// Gestionnaire de sélection de fichier
function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    if (input === nc2Input) {
        currentNC2File = file;
        nc2Upload.querySelector('span').textContent = `Fichier sélectionné: ${file.name}`;
        parseNCFile(file);
    } else if (input === f4cInput) {
        currentF4CFile = file;
        f4cUpload.querySelector('span').textContent = `Fichier sélectionné: ${file.name}`;
        loadF4CPreview(file);
    }
}

// Écouteurs d'événements pour la sélection de fichier
nc2Input.addEventListener('change', () => handleFileSelect(nc2Input));
f4cInput.addEventListener('change', () => handleFileSelect(f4cInput));

// Fonction pour parser le fichier NC
async function parseNCFile(file) {
    try {
        const content = await file.text();
        // Afficher le contenu source
        sourceContent.textContent = content;
        initialSourceContent = content;
        
        // Afficher la section source
        document.querySelector('.source-preview').classList.remove('hidden');
        
        // Activer le bouton de conversion
        convertButton.disabled = false;
        
        // Afficher la section comparateur avec le warning approprié
        const comparisonSection = document.getElementById('comparison-section');
        comparisonSection.classList.remove('hidden');
        updateComparisonWarning();
        
        // Faire défiler jusqu'à la section source
        document.querySelector('.source-preview').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors du traitement du fichier');
    }
}

// Fonction pour charger et afficher le fichier F4C de référence
async function loadF4CPreview(file) {
    try {
        const content = await file.text();
        
        // Afficher la section comparateur
        const comparisonSection = document.getElementById('comparison-section');
        comparisonSection.classList.remove('hidden');
        comparisonSection.classList.add('has-reference');
        
        // Afficher d'abord le contenu de référence
        displayReferencePreview(content);
        opacityControl.classList.remove('hidden');
        referencePreview.classList.remove('hidden');
        
        // Si on a un fichier source, le convertir
        if (sourceContent.textContent) {
            const ncXContent = sourceContent.textContent;
            const f4cContent = Parser.to_F4C(ncXContent);
            displayGeneratedPreview(f4cContent);
            downloadButton.disabled = false;
            comparisonSection.classList.add('has-generated');
        }
        
        // Mettre à jour le warning
        updateComparisonWarning();
        
        // Régler l'opacité
        opacitySlider.value = 100;
        opacitySlider.dispatchEvent(new Event('input'));

        // Faire défiler jusqu'au comparateur
        comparisonSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Erreur lors de la lecture du fichier F4C:', error);
        alert('Erreur lors de la lecture du fichier F4C');
    }
}

// Fonction pour comparer les textes et ajouter les highlights
function highlightDifferences(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);
    
    const result1 = [];
    const result2 = [];
    
    for (let i = 0; i < maxLines; i++) {
        const line1 = lines1[i] || '';
        const line2 = lines2[i] || '';
        
        if (line1 === line2) {
            result1.push(escapeHtml(line1));
            result2.push(escapeHtml(line2));
            continue;
        }
        
        const chars1 = [...line1];
        const chars2 = [...line2];
        const maxChars = Math.max(chars1.length, chars2.length);
        let diffLine1 = '';
        let diffLine2 = '';
        
        for (let j = 0; j < maxChars; j++) {
            const char1 = escapeHtml(chars1[j] || ' ');
            const char2 = escapeHtml(chars2[j] || ' ');
            
            if (char1 !== char2) {
                diffLine1 += `<span class="diff">${char1}</span>`;
                diffLine2 += `<span class="diff">${char2}</span>`;
            } else {
                diffLine1 += char1;
                diffLine2 += char2;
            }
        }
        
        result1.push(diffLine1);
        result2.push(diffLine2);
    }
    
    return {
        text1: result1.join('\n'),
        text2: result2.join('\n')
    };
}

// Fonction pour échapper les caractères HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fonctions d'affichage des previews
function displayGeneratedPreview(content) {
    if (!referencePreview.classList.contains('hidden') && referenceContent.textContent) {
        const highlighted = highlightDifferences(content, referenceContent.textContent);
        generatedContent.innerHTML = highlighted.text1;
        referenceContent.innerHTML = highlighted.text2;
    } else {
        generatedContent.textContent = content;
    }
    downloadButton.disabled = false;
}

function displayReferencePreview(content) {
    const highlighted = highlightDifferences(generatedContent.textContent, content);
    generatedContent.innerHTML = highlighted.text1;
    referenceContent.innerHTML = highlighted.text2;
}

// Gestionnaire du slider d'opacité
opacitySlider.addEventListener('input', (e) => {
    const value = e.target.value / 100;
    // Appliquer l'opacité à la preview de référence (contenu et titre)
    referencePreview.style.opacity = value;
    
    // Appliquer l'opacité inverse à la preview générée (contenu et titre)
    generatedContent.style.opacity = 1 - value;
    generatedPreview.querySelector('h3').style.opacity = 1 - value;
});

// Synchronisation du défilement entre les previews
generatedContent.addEventListener('scroll', () => {
    referenceContent.scrollLeft = generatedContent.scrollLeft;
    referenceContent.scrollTop = generatedContent.scrollTop;
});

referenceContent.addEventListener('scroll', () => {
    generatedContent.scrollLeft = referenceContent.scrollLeft;
    generatedContent.scrollTop = referenceContent.scrollTop;
});

// Fonction pour mettre à jour l'état des boutons
function updateButtonStates() {
    undoButton.disabled = undoStack.length === 0 || generatedContent.textContent.trim() === '';
    redoButton.disabled = redoStack.length === 0;
}

// Fonction pour sauvegarder l'état actuel dans l'historique
function saveToHistory(force = false) {
    const currentContent = generatedContent.textContent;
    // Ne sauvegarder que si le contenu a changé par rapport au contenu initial ou au dernier état
    if (force || (currentContent !== lastContent && currentContent !== initialContent)) {
        undoStack.push(lastContent);
        redoStack = []; // Vider la pile redo quand une nouvelle modification est faite
        lastContent = currentContent;
        updateButtonStates();
    }
}

// Fonction pour annuler la dernière modification
function undo() {
    if (undoStack.length > 0) {
        const currentContent = generatedContent.textContent;
        // Empêcher l'effacement complet du texte
        const previousContent = undoStack[undoStack.length - 1];
        if (previousContent.trim() === '') {
            return;
        }
        
        redoStack.push(currentContent);
        undoStack.pop();
        generatedContent.textContent = previousContent;
        lastContent = previousContent;
        
        // Mettre à jour la comparaison si nécessaire
        if (!referencePreview.classList.contains('hidden') && referenceContent.textContent) {
            const highlighted = highlightDifferences(previousContent, referenceContent.textContent);
            generatedContent.innerHTML = highlighted.text1;
            referenceContent.innerHTML = highlighted.text2;
        }
        
        updateButtonStates();
    }
}

// Fonction pour rétablir la dernière modification annulée
function redo() {
    if (redoStack.length > 0) {
        const currentContent = generatedContent.textContent;
        undoStack.push(currentContent);
        const nextContent = redoStack.pop();
        generatedContent.textContent = nextContent;
        lastContent = nextContent;
        
        // Mettre à jour la comparaison si nécessaire
        if (!referencePreview.classList.contains('hidden') && referenceContent.textContent) {
            const highlighted = highlightDifferences(nextContent, referenceContent.textContent);
            generatedContent.innerHTML = highlighted.text1;
            referenceContent.innerHTML = highlighted.text2;
        }
        
        updateButtonStates();
    }
}

// Gestionnaire d'événements pour la sauvegarde automatique lors de l'édition
generatedContent.addEventListener('input', () => {
    if (isEditing) {
        downloadButton.disabled = false;
        // Empêcher l'effacement complet du texte
        if (generatedContent.textContent.trim() === '') {
            generatedContent.textContent = lastContent;
            return;
        }
        saveToHistory();
    }
});

// Gestionnaire des raccourcis clavier global
document.addEventListener('keydown', (e) => {
    // Ne pas intercepter les raccourcis si on est dans un champ de texte (sauf le contenu généré)
    if (e.target.tagName === 'INPUT' || (e.target.tagName === 'PRE' && e.target !== generatedContent)) {
        return;
    }
    
    // Cmd+Z ou Ctrl+Z pour Undo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }
    
    // Cmd+Shift+Z ou Ctrl+Y pour Redo
    if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) || 
        ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        e.preventDefault();
        redo();
    }
});

// Fonction pour activer/désactiver le mode édition
function toggleEditMode() {
    if (!isEditing) {
        // Sauvegarder l'état initial avant d'entrer en mode édition
        initialContent = generatedContent.textContent;
        lastContent = initialContent;
        undoStack = []; // Réinitialiser la pile d'annulation
        redoStack = []; // Réinitialiser la pile de rétablissement
    } else {
        // Sauvegarder l'état final après l'édition si des changements ont été faits
        if (generatedContent.textContent !== initialContent) {
            saveToHistory(true);
        }
    }
    
    isEditing = !isEditing;
    generatedContent.contentEditable = isEditing;
    
    // Activer/désactiver les boutons undo/redo
    undoButton.style.display = isEditing ? 'block' : 'none';
    redoButton.style.display = isEditing ? 'block' : 'none';
    updateButtonStates();
    
    try {
        const editIcon = editButton.querySelector('img');
        if (editIcon) {
            editIcon.src = isEditing ? 'assets/save.svg' : 'assets/edit.svg';
            editIcon.alt = isEditing ? 'Sauvegarder' : 'Éditer';
            editIcon.onerror = function() {
                this.onerror = null;
                editButton.innerHTML = isEditing ? '💾' : '✏️';
            };
        } else {
            editButton.innerHTML = isEditing ? '💾' : '✏️';
        }
    } catch (e) {
        editButton.innerHTML = isEditing ? '💾' : '✏️';
    }
    
    editButton.title = isEditing ? 'Sauvegarder' : 'Éditer';
    
    if (isEditing) {
        generatedContent.textContent = generatedContent.textContent;
        generatedContent.focus();
        opacitySlider.value = 10;
        const event = new Event('input');
        opacitySlider.dispatchEvent(event);
    } else {
        if (!referencePreview.classList.contains('hidden') && referenceContent.textContent) {
            const highlighted = highlightDifferences(
                generatedContent.textContent,
                referenceContent.textContent
            );
            generatedContent.innerHTML = highlighted.text1;
            referenceContent.innerHTML = highlighted.text2;
        }
    }
}

// Fonction pour créer et télécharger le fichier
async function downloadF4C() {
    const content = generatedContent.textContent;
    
    // Get the filename
    let outputFilename = 'generated.F4C';
    if (currentNC2File) {
        outputFilename = currentNC2File.name.replace(/\.nc[12]$/i, '.F4C');
        if (!outputFilename.toLowerCase().endsWith('.f4c')) {
            outputFilename += '.F4C';
        }
    }

    // Check if we're in Electron or web environment
    if (window.require) {
        // Electron environment
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('save-file', {
            content: content,
            filename: outputFilename
        });

        ipcRenderer.once('file-saved', (event, { success, filePath }) => {
            if (success) {
                ipcRenderer.send('show-in-folder', { filePath });
            }
        });
    } else {
        // Web environment
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

// Gestionnaire du bouton d'édition
editButton.addEventListener('click', toggleEditMode);

// Gestionnaire du bouton de téléchargement
downloadButton.addEventListener('click', downloadF4C);

// Gestionnaires des boutons undo/redo
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);

// Fonction pour mettre à jour l'état des boutons source
function updateSourceButtonStates() {
    sourceUndoButton.disabled = sourceUndoStack.length === 0 || sourceContent.textContent.trim() === '';
    sourceRedoButton.disabled = sourceRedoStack.length === 0;
    convertButton.disabled = sourceContent.textContent === initialSourceContent;
}

// Fonction pour sauvegarder l'état actuel de la source dans l'historique
function saveSourceToHistory(force = false) {
    const currentContent = sourceContent.textContent;
    if (force || (currentContent !== lastSourceContent && currentContent !== initialSourceContent)) {
        sourceUndoStack.push(lastSourceContent);
        sourceRedoStack = [];
        lastSourceContent = currentContent;
        updateSourceButtonStates();
    }
}

// Fonction pour annuler la dernière modification de la source
function sourceUndo() {
    if (sourceUndoStack.length > 0) {
        const currentContent = sourceContent.textContent;
        const previousContent = sourceUndoStack[sourceUndoStack.length - 1];
        if (previousContent.trim() === '') {
            return;
        }
        
        sourceRedoStack.push(currentContent);
        sourceUndoStack.pop();
        sourceContent.textContent = previousContent;
        lastSourceContent = previousContent;
        updateSourceButtonStates();
    }
}

// Fonction pour rétablir la dernière modification annulée de la source
function sourceRedo() {
    if (sourceRedoStack.length > 0) {
        const currentContent = sourceContent.textContent;
        sourceUndoStack.push(currentContent);
        const nextContent = sourceRedoStack.pop();
        sourceContent.textContent = nextContent;
        lastSourceContent = nextContent;
        updateSourceButtonStates();
    }
}

// Fonction pour activer/désactiver le mode édition de la source
function toggleSourceEditMode() {
    if (!isSourceEditing) {
        initialSourceContent = sourceContent.textContent;
        lastSourceContent = initialSourceContent;
        sourceUndoStack = [];
        sourceRedoStack = [];
    } else {
        if (sourceContent.textContent !== initialSourceContent) {
            saveSourceToHistory(true);
        }
    }
    
    isSourceEditing = !isSourceEditing;
    sourceContent.contentEditable = isSourceEditing;
    
    sourceUndoButton.style.display = isSourceEditing ? 'block' : 'none';
    sourceRedoButton.style.display = isSourceEditing ? 'block' : 'none';
    updateSourceButtonStates();
    
    try {
        const editIcon = sourceEditButton.querySelector('img');
        if (editIcon) {
            editIcon.src = isSourceEditing ? 'assets/save.svg' : 'assets/edit.svg';
            editIcon.alt = isSourceEditing ? 'Sauvegarder' : 'Éditer';
            editIcon.onerror = function() {
                this.onerror = null;
                sourceEditButton.innerHTML = isSourceEditing ? '💾' : '✏️';
            };
        } else {
            sourceEditButton.innerHTML = isSourceEditing ? '💾' : '✏️';
        }
    } catch (e) {
        sourceEditButton.innerHTML = isSourceEditing ? '💾' : '✏️';
    }
    
    sourceEditButton.title = isSourceEditing ? 'Sauvegarder' : 'Éditer';
    
    if (isSourceEditing) {
        sourceContent.focus();
    }
}

// Fonction pour convertir le contenu source modifié
function convertSource() {
    try {
        const ncXContent = sourceContent.textContent;
        const f4cContent = Parser.to_F4C(ncXContent);
        
        // Afficher la section comparateur
        const comparisonSection = document.getElementById('comparison-section');
        comparisonSection.classList.remove('hidden');
        comparisonSection.classList.add('has-generated');
        
        // Afficher le contenu généré
        displayGeneratedPreview(f4cContent);
        downloadButton.disabled = false;
        
        // Mettre à jour le warning
        updateComparisonWarning();
        
        // Faire défiler jusqu'au comparateur
        comparisonSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Erreur lors de la conversion:', error);
        alert('Une erreur est survenue lors de la conversion du fichier');
    }
}

// Gestionnaire d'événements pour la sauvegarde automatique lors de l'édition de la source
sourceContent.addEventListener('input', () => {
    if (isSourceEditing) {
        if (sourceContent.textContent.trim() === '') {
            sourceContent.textContent = lastSourceContent;
            return;
        }
        saveSourceToHistory();
    }
});

// Gestionnaires des boutons source
sourceEditButton.addEventListener('click', toggleSourceEditMode);
sourceUndoButton.addEventListener('click', sourceUndo);
sourceRedoButton.addEventListener('click', sourceRedo);
convertButton.addEventListener('click', convertSource);

// Gestionnaire pour le retour automatique à la ligne
wordWrapCheckbox.addEventListener('change', function() {
    const previewContent = document.querySelector('#generated-preview .preview-content');
    if (this.checked) {
        previewContent.classList.add('word-wrap');
    } else {
        previewContent.classList.remove('word-wrap');
    }
    
    // Si on a un contenu de référence visible, appliquer le même style
    if (!referencePreview.classList.contains('hidden')) {
        if (this.checked) {
            referenceContent.classList.add('word-wrap');
        } else {
            referenceContent.classList.remove('word-wrap');
        }
    }
});

function updateComparisonWarning() {
    const warningBox = document.getElementById('comparison-warning');
    const hasGeneratedContent = !generatedContent.classList.contains('hidden') && generatedContent.textContent.trim() !== '';
    const hasReferenceContent = !referencePreview.classList.contains('hidden') && referenceContent.textContent.trim() !== '';
    const hasSourceFile = sourceContent.textContent.trim() !== '';
    
    console.log('État des contenus:', {
        hasGeneratedContent,
        hasReferenceContent,
        hasSourceFile,
        generatedText: generatedContent.textContent.trim().length,
        referenceText: referenceContent.textContent.trim().length,
        generatedHidden: generatedContent.classList.contains('hidden'),
        referenceHidden: referencePreview.classList.contains('hidden')
    });
    
    if (!hasGeneratedContent || !hasReferenceContent) {
        warningBox.classList.remove('hidden');
        warningBox.querySelector('.warning-message').textContent = 
            !hasSourceFile ? 
                "Aucun fichier source (.nc1 ou .nc2) n'a été ajouté !" :
            !hasGeneratedContent && hasSourceFile ? 
                "Comparaison inactive: Le fichier source n'a pas encore été converti !" :
                "Pour activer la comparaison, veuillez ajouter un fichier F4C de référence";
    } else {
        warningBox.classList.add('hidden');
    }
}