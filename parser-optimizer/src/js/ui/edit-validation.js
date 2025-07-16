/**
 * Validation et utilitaires pour l'édition
 */
export const EditValidation = {
  
  /**
   * Convertit une valeur en millimètres
   */
  parseLengthFromDisplay: function(displayValue) {
    if (!displayValue || displayValue.trim() === '') return null;
    
    const cleanValue = displayValue.replace(/\s/g, '');
    const normalizedValue = cleanValue.replace(',', '.');
    const milimeters = parseFloat(normalizedValue);
    
    if (isNaN(milimeters) || milimeters <= 0) return null;
    
    return Math.round(milimeters);
  },

  /**
   * Valide les données d'une barre fille
   */
  validatePieceData: function(data) {
    const errors = [];
    
    if (data.nom && data.nom.length > 50) {
      errors.push('Nom trop long (max 50 caractères)');
    }
    
    if (!data.profile || data.profile.trim() === '') {
      errors.push('Profil obligatoire');
    } else if (data.profile.length > 20) {
      errors.push('Profil trop long (max 20 caractères)');
    }
    
    if (!data.length || isNaN(data.length) || data.length <= 0) {
      errors.push('Longueur invalide');
    } else if (data.length > 100000) {
      errors.push('Longueur trop grande (max 100 m)');
    } else if (data.length < 100) {
      errors.push('Longueur minimale 10 cm');
    }
    
    if (!data.quantity || isNaN(data.quantity) || data.quantity <= 0) {
      errors.push('Quantité invalide');
    } else if (!Number.isInteger(data.quantity)) {
      errors.push('Quantité doit être un entier');
    } else if (data.quantity > 10000) {
      errors.push('Quantité trop élevée (max 10 000)');
    }
    
    if (data.angles) {
      if (isNaN(data.angles[1]) || data.angles[1] < -360 || data.angles[1] > 360) {
        errors.push('Angle 1 invalide (-360 à 360°)');
      }
      if (isNaN(data.angles[2]) || data.angles[2] < -360 || data.angles[2] > 360) {
        errors.push('Angle 2 invalide (-360 à 360°)');
      }
    }
    
    if (data.orientation && !['a-plat', 'debout'].includes(data.orientation)) {
      errors.push('Orientation invalide');
    }
    
    return errors;
  },

  /**
   * Valide les données d'une barre mère
   */
  validateMotherBarData: function(data) {
    const errors = [];
    
    if (!data.profile || data.profile.trim() === '') {
      errors.push('Profil obligatoire');
    } else if (data.profile.length > 20) {
      errors.push('Profil trop long (max 20 caractères)');
    }
    
    if (!data.length || isNaN(data.length) || data.length <= 0) {
      errors.push('Longueur invalide');
    } else if (data.length > 100000) {
      errors.push('Longueur trop grande (max 100 m)');
    } else if (data.length < 100) {
      errors.push('Longueur minimale 10 cm');
    }
    
    if (!data.quantity || isNaN(data.quantity) || data.quantity <= 0) {
      errors.push('Quantité invalide');
    } else if (!Number.isInteger(data.quantity)) {
      errors.push('Quantité doit être un entier');
    } else if (data.quantity > 1000000) {
      errors.push('Quantité trop élevée (max 1 000 000)');
    }
    
    return errors;
  }
};