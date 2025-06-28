/**
 * Service de notification
 * Gère l'affichage des notifications à l'utilisateur
 */
export const NotificationService = {
  /**
   * Initialise le service de notification
   */
  init: function() {
    this.createNotificationContainer();
  },
  
  /**
   * Crée le conteneur de notifications
   */
  createNotificationContainer: function() {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
  },
  
  /**
   * Obtient l'icône pour chaque type
   */
  getIcon: function(type) {
    // Pas d'icônes, retourner une chaîne vide
    return '';
  },
  
  /**
   * Affiche une notification
   * @param {string} message - Message à afficher
   * @param {string} type - Type de notification ('success', 'warning', 'error', 'info')
   */
  show: function(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      background: ${this.getBackgroundColor(type)};
      color: ${this.getTextColor(type)};
      border: 1px solid ${this.getBorderColor(type)};
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: auto;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    // Ajouter le message (sans icône)
    const content = document.createElement('div');
    content.style.flex = '1';
    content.textContent = message; // Utiliser textContent au lieu de innerHTML
    
    // Bouton de fermeture
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: inherit;
      font-size: 18px;
      cursor: pointer;
      margin-left: 12px;
      padding: 0;
      line-height: 1;
    `;
    
    notification.appendChild(content);
    notification.appendChild(closeBtn);
    
    // Ajouter au conteneur
    const container = document.getElementById('notification-container');
    container.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Fermeture automatique et manuelle
    const autoRemove = setTimeout(() => {
      this.removeNotification(notification);
    }, type === 'error' ? 6000 : 4000); // Réduit les durées
    
    closeBtn.addEventListener('click', () => {
      clearTimeout(autoRemove);
      this.removeNotification(notification);
    });
    
    // Log console pour les erreurs
    if (type === 'error') {
      console.error(message);
    }
  },
  
  /**
   * Supprime une notification avec animation
   */
  removeNotification: function(notification) {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  },
  
  /**
   * Obtient la couleur de fond pour chaque type
   */
  getBackgroundColor: function(type) {
    const colors = {
      success: '#d4edda',
      warning: '#fff3cd',
      error: '#f8d7da',
      info: '#d1ecf1'
    };
    return colors[type] || colors.info;
  },
  
  /**
   * Obtient la couleur du texte pour chaque type
   */
  getTextColor: function(type) {
    const colors = {
      success: '#155724',
      warning: '#856404',
      error: '#721c24',
      info: '#0c5460'
    };
    return colors[type] || colors.info;
  },
  
  /**
   * Obtient la couleur de bordure pour chaque type
   */
  getBorderColor: function(type) {
    const colors = {
      success: '#c3e6cb',
      warning: '#ffeeba',
      error: '#f5c6cb',
      info: '#bee5eb'
    };
    return colors[type] || colors.info;
  }
};