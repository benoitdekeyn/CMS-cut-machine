/**
 * Gestionnaire d'import pour fichiers NC2 et ZIP
 * Se concentre uniquement sur le parsing des fichiers, sans manipulation des données
 */
import JSZip from 'jszip';
import { Parser } from './index.js';

export const ImportManager = {
  /**
   * Traite plusieurs fichiers NC2 ou un ZIP
   * @param {FileList} files - Liste des fichiers à traiter
   * @returns {Promise<Array>} - Tableau d'objets barre
   */
  processMultipleFiles: async function(files) {
    const barres = [];
    
    try {
      for(const file of files) {
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.nc2') || fileName.endsWith('.nc1')) {
          // Fichier NC simple
          const content = await this.readFileAsText(file);
          const parsedData = Parser.parseNC2(content);
          barres.push(this.convertToBarre(parsedData, file.name));
        } else if (fileName.endsWith('.zip')) {
          // Fichier ZIP
          const zipBarres = await this.processZipFile(file);
          barres.push(...zipBarres);
        }
      }
      
      return barres;
    } catch (error) {
      console.error('Erreur traitement fichiers:', error);
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
      reader.onerror = (e) => reject(new Error(`Erreur lecture ${file.name}`));
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
    
    try {
      // Lire le ZIP
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Erreur lecture ZIP`));
        reader.readAsArrayBuffer(zipFile);
      });
      
      // Décompresser le ZIP
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Traiter chaque fichier NC2/NC1
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        
        const lowerPath = path.toLowerCase();
        if (lowerPath.endsWith('.nc2') || lowerPath.endsWith('.nc1')) {
          const content = await zipEntry.async('string');
          try {
            const parsedData = Parser.parseNC2(content);
            barres.push(this.convertToBarre(parsedData, path));
          } catch (error) {
            console.error(`Erreur parsing ${path}:`, error);
          }
        }
      }
      
      return barres;
    } catch (error) {
      console.error(`Erreur traitement ZIP:`, error);
      throw error;
    }
  },
  
  /**
   * Convertit les données parsées en objet barre
   * @param {Object} parsedData - Données parsées du fichier NC2
   * @param {string} filename - Nom du fichier source
   * @returns {Object} - Objet barre
   */
  convertToBarre: function(parsedData, filename) {
    if (!parsedData || !parsedData.profil) {
      console.error(`Données invalides: ${filename}`);
      return null;
    }
    
    const shortName = filename.split('/').pop();
    
    // Format adapté à la nouvelle structure du parser
    return {
      nom: parsedData.nom || shortName.replace(/\.[^/.]+$/, ""), // Nom de la barre sans extension
      profile: parsedData.profil || 'INCONNU',
      length: parsedData.longueur || 0,
      quantity: parsedData.quantite || 1,
      orientation: parsedData.orientation || "a-plat",
      type: 'fille',
      angles: {
        1: parsedData.angle_1 || 90,
        2: parsedData.angle_2 || 90
      },
      // Propriétés F4C pour la génération PGM
      f4cData: {
        B021: parsedData.B021 || '',
        B035: parsedData.B035 || '',
        S051: parsedData.S051 || '',
        S052: parsedData.S052 || '',
        S053: parsedData.S053 || '',
        S054: parsedData.S054 || '',
        S055: parsedData.S055 || ''
      },
      id: `${shortName.replace(/\W/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      originalFile: shortName
    };
  }
};