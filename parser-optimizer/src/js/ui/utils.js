/**
 * Utilitaires pour l'interface utilisateur
 */
export const UIUtils = {
  /**
   * Affiche l'overlay de chargement avec étapes (pour l'optimisation)
   */
  showLoadingOverlay: function() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      this.resetLoadingSteps();
    }
  },
  
  /**
   * Masque l'overlay de chargement (pour l'optimisation)
   */
  hideLoadingOverlay: function() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      this.resetLoadingSteps();
    }
  },

  /**
   * NOUVEAU: Affiche le simple overlay de chargement (pour l'upload)
   */
  showSimpleLoadingOverlay: function(message = 'Traitement des fichiers en cours...') {
    const overlay = document.getElementById('simple-loading-overlay');
    if (overlay) {
      const textElement = overlay.querySelector('.simple-loading-text');
      if (textElement) {
        textElement.textContent = message;
      }
      overlay.classList.remove('hidden');
    }
  },

  /**
   * NOUVEAU: Masque le simple overlay de chargement (pour l'upload)
   */
  hideSimpleLoadingOverlay: function() {
    const overlay = document.getElementById('simple-loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  },
  
  /**
   * Met à jour le progrès et l'étape active
   */
  updateLoadingProgress: function(stepId, percentage = null, completed = false) {
    // Mettre à jour le pourcentage si fourni
    if (percentage !== null) {
      const progressText = document.getElementById('progress-percentage');
      const progressFill = document.getElementById('progress-fill');
      
      if (progressText) {
        progressText.textContent = `${Math.round(percentage)}%`;
      }
      
      if (progressFill) {
        progressFill.style.width = `${percentage}%`;
      }
    }
    
    // Mettre à jour l'étape active
    if (stepId) {
      // Réinitialiser toutes les étapes
      document.querySelectorAll('.loading-step').forEach(step => {
        step.classList.remove('active');
      });
      
      // Marquer les étapes précédentes comme complétées
      const currentStep = document.getElementById(stepId);
      if (currentStep) {
        const steps = document.querySelectorAll('.loading-step');
        const currentIndex = Array.from(steps).indexOf(currentStep);
        
        steps.forEach((step, index) => {
          if (index < currentIndex) {
            step.classList.add('completed');
            step.classList.remove('active');
          } else if (index === currentIndex) {
            step.classList.add('active');
            step.classList.remove('completed');
            if (completed) {
              step.classList.add('completed');
              step.classList.remove('active');
            }
          } else {
            step.classList.remove('active', 'completed');
          }
        });
      }
    }
  },
  
  /**
   * Remet à zéro les étapes de chargement
   */
  resetLoadingSteps: function() {
    document.querySelectorAll('.loading-step').forEach(step => {
      step.classList.remove('active', 'completed');
    });
    
    const progressText = document.getElementById('progress-percentage');
    const progressFill = document.getElementById('progress-fill');
    
    if (progressText) {
      progressText.textContent = '0%';
    }
    
    if (progressFill) {
      progressFill.style.width = '0%';
    }
  },
  
  /**
   * Télécharge un fichier
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
  },
  
  /**
   * Affiche le texte de l'étape courante dans le loading overlay (mode dynamique)
   * @param {string} stepText - Texte à afficher (ex: "ILP pour le modèle 2/3")
   */
  setLoadingStepText: function(stepText) {
    const subtitle = document.querySelector('#loading-overlay .loading-subtitle');
    if (subtitle) {
      subtitle.textContent = stepText;
    }
  },

  /**
   * Cache la barre de progression et les étapes (mode dynamique)
   */
  hideLoadingProgressBar: function() {
    const progress = document.querySelector('#loading-overlay .loading-progress');
    const steps = document.querySelector('#loading-overlay .loading-steps');
    if (progress) progress.style.display = 'none';
    if (steps) steps.style.display = 'none';
  },

  /**
   * Réaffiche la barre de progression et les étapes (pour la fin ou le reset)
   */
  showLoadingProgressBar: function() {
    const progress = document.querySelector('#loading-overlay .loading-progress');
    const steps = document.querySelector('#loading-overlay .loading-steps');
    if (progress) progress.style.display = '';
    if (steps) steps.style.display = '';
  },

  /**
   * Transforme "debout" en "Debout" et "a-plat" en "À plat"
   */
  formatOrientation: function(orientation) {
    if (!orientation) return '';
    const formatted = orientation.replace('a-plat', 'À plat').replace('debout', 'Debout');
    return formatted;
  },

  /**
   * Formate les longueurs en mm pour qu'il y ait des espaces tous les 3 chiffres (en partant de la droite)
   */
  formatLenght: function(lengthInMm){
    if (!lengthInMm && lengthInMm !== 0) return '';
    
    const lengthString = lengthInMm.toString();
    let formatedLengthString = "";
    
    // Parcourir la chaîne de droite à gauche pour ajouter des espaces tous les 3 chiffres
    for (let i = lengthString.length - 1; i >= 0; i--) {
      formatedLengthString = lengthString[i] + formatedLengthString;
      
      // Ajouter un espace tous les 3 chiffres (mais pas au début)
      const positionFromRight = lengthString.length - i;
      if (positionFromRight % 3 === 0 && i > 0) {
        formatedLengthString = " " + formatedLengthString;
      }
    }
    
    return formatedLengthString;
  },

  /**
   * Nettoie les espaces d'un objet de données de formulaire
   * @param {Object} data - Objet contenant les données du formulaire
   * @returns {Object} - Objet avec les valeurs nettoyées
   */
  trimFormData: function(data) {
    const trimmedData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        trimmedData[key] = value.trim();
      } else {
        trimmedData[key] = value;
      }
    }
    
    return trimmedData;
  }
};