/**
 * Service de notification
 * Gère l'affichage des notifications à l'utilisateur
 */
export const NotificationService = {
  /**
   * Initialise le service de notification
   */
  init: function() {
    // Vérifier si un conteneur de notification existe
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      document.body.appendChild(container);
    }
  },
  
  /**
   * Affiche une notification à l'utilisateur
   * @param {string} message - Message à afficher
   * @param {string} type - Type de notification ('success', 'warning', 'error', 'info')
   */
  show: function(message, type = 'info') {
    // Obtenir le conteneur de notification
    const notifContainer = document.getElementById('notification-container');
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    `;
    
    // Ajouter la notification au conteneur
    notifContainer.appendChild(notification);
    
    // Configurer le bouton de fermeture
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.add('hiding');
      setTimeout(() => {
        if (notification.parentNode) {
          notifContainer.removeChild(notification);
        }
      }, 300);
    });
    
    // Auto-fermeture après 5 secondes pour les notifications non-erreur
    if (type !== 'error') {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.classList.add('hiding');
          setTimeout(() => {
            if (notification.parentNode) {
              notifContainer.removeChild(notification);
            }
          }, 300);
        }
      }, 5000);
    }
  }
};