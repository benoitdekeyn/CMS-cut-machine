/**
 * Service de notification
 * Gère l'affichage des notifications à l'utilisateur
 */
export const NotificationService = {
  /**
   * Initialise le service de notification
   */
  init: function() {
    // Plus besoin de créer un conteneur de notification
    // Les notifications sont maintenant uniquement dans la console
  },
  
  /**
   * Affiche une notification dans la console uniquement
   * @param {string} message - Message à afficher
   * @param {string} type - Type de notification ('success', 'warning', 'error', 'info')
   */
  show: function(message, type = 'info') {
    // Afficher seulement les erreurs dans la console
    if (type === 'error') {
      console.error('❌', message);
    }
    // Les autres types de notifications sont ignorés
    // (pas d'affichage visuel ni de log console pour success, warning, info)
  }
};