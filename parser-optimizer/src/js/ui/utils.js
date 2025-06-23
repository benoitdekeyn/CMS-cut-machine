/**
 * Utilitaires pour l'interface utilisateur
 */
export const UIUtils = {
  /**
   * Affiche l'overlay de chargement
   */
  showLoadingOverlay: function() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  },
  
  /**
   * Masque l'overlay de chargement
   */
  hideLoadingOverlay: function() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
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