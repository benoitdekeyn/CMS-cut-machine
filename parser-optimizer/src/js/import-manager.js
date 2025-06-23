/**
 * Gestionnaire d'import pour fichiers NC2 et ZIP
 * Se concentre uniquement sur le parsing des fichiers, sans manipulation des données
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
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith('.nc2') || fileName.endsWith('.nc1')) {
          // Traiter les fichiers NC2/NC1
          const content = await this.readFileAsText(file);
          const parsedData = Parser.parseNC2(content);
          const barreObjs = this.convertToBarres(parsedData, file.name);
          barres.push(...barreObjs);
          
        } else if (fileName.endsWith('.zip')) {
          // Traiter les fichiers ZIP
          console.log(`Traitement du fichier ZIP: ${file.name}`);
          const zipBarres = await this.processZipFile(file);
          console.log(`Barres extraites du ZIP: ${zipBarres.length}`);
          barres.push(...zipBarres);
        } else {
          console.warn(`Type de fichier non supporté: ${file.name}`);
        }
      }
      
      console.log(`Total des barres importées: ${barres.length}`);
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
      reader.onerror = (e) => reject(new Error(`Erreur de lecture du fichier ${file.name}: ${e.target.error}`));
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
      // Lire le fichier ZIP comme ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(zipFile);
      
      // Charger et décompresser le ZIP
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Récupérer la liste des fichiers dans le ZIP
      const filePromises = [];
      let fileCount = 0;
      
      zip.forEach((relativePath, zipEntry) => {
        // Ignorer les dossiers
        if (zipEntry.dir) return;
        
        // Ne traiter que les fichiers .nc2/.nc1
        const lowerPath = relativePath.toLowerCase();
        if (lowerPath.endsWith('.nc2') || lowerPath.endsWith('.nc1')) {
          fileCount++;
          
          // Créer une promesse pour traiter ce fichier
          const filePromise = zipEntry.async('string')
            .then(content => {
              console.log(`Parsing du fichier ZIP: ${relativePath}`);
              
              try {
                const parsedData = Parser.parseNC2(content);
                if (parsedData) {
                  const barreObjs = this.convertToBarres(parsedData, relativePath);
                  return barreObjs;
                } else {
                  console.error(`Parsing échoué pour ${relativePath}`);
                  return [];
                }
              } catch (error) {
                console.error(`Erreur de parsing pour ${relativePath}:`, error);
                return [];
              }
            })
            .catch(error => {
              console.error(`Erreur lors de l'extraction de ${relativePath}:`, error);
              return [];
            });
          
          filePromises.push(filePromise);
        }
      });
      
      // Si aucun fichier NC2/NC1 trouvé
      if (fileCount === 0) {
        console.warn(`Aucun fichier NC2/NC1 trouvé dans le ZIP ${zipFile.name}`);
        return [];
      }
      
      // Attendre que tous les fichiers soient traités
      const results = await Promise.all(filePromises);
      
      // Fusionner tous les résultats
      for (const result of results) {
        barres.push(...result);
      }
      
      console.log(`Fichiers traités dans le ZIP: ${fileCount}, barres extraites: ${barres.length}`);
      return barres;
      
    } catch (error) {
      console.error(`Erreur lors du traitement du ZIP ${zipFile.name}:`, error);
      throw new Error(`Erreur lors du traitement du ZIP: ${error.message}`);
    }
  },
  
  /**
   * Lit un fichier comme ArrayBuffer (nécessaire pour JSZip)
   * @param {File} file - Fichier à lire
   * @returns {Promise<ArrayBuffer>} - Contenu du fichier
   */
  readFileAsArrayBuffer: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(new Error(`Erreur de lecture du fichier ${file.name}: ${e.target.error}`));
      reader.readAsArrayBuffer(file);
    });
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
    
    // Extraire le nom de fichier sans chemin (pour les fichiers dans des sous-dossiers ZIP)
    const shortName = filename.split('/').pop();
    
    // Déterminer l'orientation si elle n'est pas déjà définie
    let orientation = parsedData.orientation;
    if (!orientation) {
      const cas = parsedData.cas || 0;
      if (cas === 1 || cas === 2) {
        orientation = "a-plat";
      } else if (cas === 3 || cas === 4) {
        orientation = "debout";
      } else {
        orientation = "90-degres";
      }
    }
    
    // On crée une barre unique avec les informations complètes
    return [{
      model: parsedData.profile || 'INCONNU',      // Nom court du profil pour F4C
      profileFull: parsedData.profileFull || parsedData.profile || 'INCONNU', // Nom complet pour l'UI
      length: parsedData.length || 0,
      quantity: parsedData.quantity || 1,
      flatValue: parsedData.flatValue || 0,
      originalFile: shortName || filename,
      type: 'fille',
      orientation: orientation,
      angles: {
        start: parsedData.angles?.start || 90,
        end: parsedData.angles?.end || 90
      },
      cas: parsedData.cas || 0,                    // Conserver le numéro du cas
      id: `${shortName.replace(/\W/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      originalData: parsedData.originalData || null
    }];
  }
};

// Exporter le module
export { ImportManager };