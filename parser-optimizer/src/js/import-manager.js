/**
 * Gestionnaire d'import pour fichiers NC2 et ZIP
 */
import JSZip from 'jszip';
import { Parser } from './index.js';

const ImportManager = {
  /**
   * Traite plusieurs fichiers NC2 ou un ZIP
   * @param {FileList} files - Liste des fichiers à traiter
   * @returns {Promise<Array>} - Tableau d'objets barre
   */
  processMultipleFiles: async function(files) {
    const barres = [];
    
    try {
      for(const file of files) {
        if (file.name.toLowerCase().endsWith('.nc2') || file.name.toLowerCase().endsWith('.nc1')) {
          const content = await this.readFileAsText(file);
          const parsedData = Parser.parseNC2(content);
          const barreObjs = this.convertToBarres(parsedData, file.name);
          barres.push(...barreObjs);
        } else if (file.name.toLowerCase().endsWith('.zip')) {
          const zipBarres = await this.processZipFile(file);
          barres.push(...zipBarres);
        }
      }
      
      return barres;
    } catch (error) {
      console.error('Erreur de traitement des fichiers:', error);
      throw error;
    }
  },
  
  /**
   * Lit un fichier comme texte
   * @param {File} file - Fichier à lire
   * @returns {Promise<string>} - Contenu du fichier
   */
  readFileAsText: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Erreur de lecture du fichier ${file.name}`));
      reader.readAsText(file);
    });
  },
  
  /**
   * Traite un fichier ZIP contenant des fichiers NC2
   * @param {File} zipFile - Fichier ZIP à traiter
   * @returns {Promise<Array>} - Tableau d'objets barre
   */
  processZipFile: async function(zipFile) {
    const barres = [];
    const arrayBuffer = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Parcourir tous les fichiers du ZIP
    for (const filename of Object.keys(zip.files)) {
      // Ne traiter que les fichiers .nc2
      if (filename.toLowerCase().endsWith('.nc2') || filename.toLowerCase().endsWith('.nc1')) {
        const content = await zip.file(filename).async('string');
        const parsedData = Parser.parseNC2(content);
        const barreObjs = this.convertToBarres(parsedData, filename);
        barres.push(...barreObjs);
      }
    }
    
    return barres;
  },
  
  /**
   * Convertit les données parsées en objets barre
   * @param {Object} parsedData - Données parsées du fichier NC2
   * @param {string} filename - Nom du fichier source
   * @returns {Array} - Tableau d'objets barre
   */
  convertToBarres: function(parsedData, filename) {
    if (!parsedData || !parsedData.profile) {
      console.error(`Données invalides dans le fichier ${filename}`);
      return [];
    }
    
    // On considère qu'un fichier NC2 contient une barre avec une certaine quantité
    // On crée une barre unique avec les informations complètes
    return [{
      model: parsedData.profile || 'INCONNU',      // Nom court du profil pour F4C
      profileFull: parsedData.profileFull || parsedData.profile || 'INCONNU', // Nom complet pour l'UI
      length: parsedData.length || 0,
      quantity: parsedData.quantity || 1,
      flatValue: parsedData.flatValue || 0,
      originalFile: filename,
      type: 'fille',
      angles: {
        start: parsedData.angles?.start || 90,
        end: parsedData.angles?.end || 90
      },
      cas: parsedData.cas || 0,                    // Conserver le numéro du cas
      id: `${filename}_${Date.now()}`,
      originalData: parsedData.originalData || null
    }];
  }
};

// Exporter le module
export { ImportManager };