/**
 * Gestionnaire d'import pour fichiers NC2 et ZIP (SANS ID)
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
          const barre = this.convertToBarre(parsedData, file.name);
          if (barre) {
            barres.push(barre);
          }
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
   * Vérifie si un fichier est valide (pas un fichier système macOS)
   * @param {string} path - Chemin du fichier
   * @returns {boolean} - True si le fichier est valide
   */
  isValidFile: function(path) {
    const lowerPath = path.toLowerCase();
    
    // Filtrer les fichiers système macOS
    if (path.includes('__MACOSX') || path.startsWith('._')) {
      return false;
    }
    
    // Filtrer les fichiers cachés et système
    if (path.startsWith('.DS_Store') || path.includes('/.DS_Store')) {
      return false;
    }
    
    // Vérifier l'extension
    return lowerPath.endsWith('.nc2') || lowerPath.endsWith('.nc1');
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
      
      // Traiter chaque fichier NC2/NC1 valide
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        
        // Vérifier si le fichier est valide
        if (!this.isValidFile(path)) {
          console.log(`Fichier ignoré: ${path}`);
          continue;
        }
        
        const content = await zipEntry.async('string');
        try {
          const parsedData = Parser.parseNC2(content);
          const barre = this.convertToBarre(parsedData, path);
          if (barre) {
            barres.push(barre);
          }
        } catch (error) {
          console.error(`Erreur parsing ${path}:`, error);
        }
      }
      
      return barres;
    } catch (error) {
      console.error(`Erreur traitement ZIP:`, error);
      throw error;
    }
  },
  
  /**
   * Convertit les données parsées en objet barre (SANS ID)
   * @param {Object} parsedData - Données parsées du fichier NC2
   * @param {string} filename - Nom du fichier source
   * @returns {Object|null} - Objet barre ou null si invalide
   */
  convertToBarre: function(parsedData, filename) {
    if (!parsedData || !parsedData.profil || parsedData.profil.trim() === '') {
      console.error(`Données invalides: ${filename}`);
      return null;
    }
    
    const shortName = filename.split('/').pop();
    
    // Format adapté à la nouvelle structure du parser (SANS ID)
    return {
      nom: parsedData.nom || shortName.replace(/\.[^/.]+$/, ""),
      profile: parsedData.profil || 'INCONNU',
      length: parsedData.longueur || 0,
      quantity: parsedData.quantite || 1,
      orientation: parsedData.orientation || "a-plat",
      type: 'fille',
      angles: {
        1: parsedData.angle_1 || 90,
        2: parsedData.angle_2 || 90
      },
      // Propriétés F4C pour la génération F4C
      f4cData: {
        B021: parsedData.B021 || '',
        B035: parsedData.B035 || '',
        S051: parsedData.S051 || '',
        S052: parsedData.S052 || '',
        S053: parsedData.S053 || '',
        S054: parsedData.S054 || '',
        S055: parsedData.S055 || '',
        S058: parsedData.S058 || '' 
      },
      // SUPPRIMÉ: Plus d'ID ni originalFile
      originalFile: shortName
    };
  }
};