/**
 * Générateur de fichiers PGM
 */
import JSZip from 'jszip';

const PgmGenerator = {
  /**
   * Génère un fichier PGM à partir d'un schéma de coupe
   * @param {Object} layout - Schéma de coupe
   * @param {string} modelName - Nom du modèle/profil
   * @param {Object} pieceDataMap - Map des données complètes des pièces
   * @returns {string} - Contenu du fichier PGM
   */
  generatePgm: function(layout, modelName, pieceDataMap = {}) {
    // Valeur à plat par défaut - utiliser la première pièce si disponible
    const firstPieceId = layout.cuts?.[0]?.pieceId;
    const firstPiece = pieceDataMap[firstPieceId];
    const flatValue = firstPiece?.flatValue || 0;
    
    // Utiliser le modèle court pour le B021 (nom du profil dans F4C)
    const profileShortName = firstPiece?.model || modelName;
    
    // Header F4C commun à toutes les barres
    const bodyAttrs = {
      B001: "        ",
      B002: "700",
      B003: "3",
      B004: "0",
      B005: "0",
      B006: "0",
      B007: "0",
      B008: "0",
      B009: "0",
      B010: "0",
      B011: "0",
      B012: "0",
      B013: "0",
      B021: profileShortName.padEnd(8, ' '), // Nom court du profil pour F4C
      B022: "0",
      B023: "0",
      B024: "0",
      B025: "0",
      B041: "0",
      B026: "0",
      B027: "0",
      B030: "        ",
      B031: "                ",
      B032: "                ",
      B033: "        ",
      B034: "0",
      B035: flatValue.toString(), // Valeur à plat du profil
      B037: "                ",
      B036: "0",
      B090: "                ",
      B100: "1"
    };
    
    // Début du fichier PGM
    let pgmContent = `<!--CEB-->\n<BODY ${Object.entries(bodyAttrs).map(([key, value]) => `${key}="${value}"`).join(' ')} ></BODY>\n`;
    
    // Récupérer la liste des pièces coupées
    const cuts = layout.cuts || [];
    
    // Ajouter une balise STEP pour chaque pièce à couper
    for (const piece of cuts) {
      // Récupérer les données complètes de la pièce si disponibles
      const pieceData = pieceDataMap[piece.pieceId] || {};
      
      // Utiliser les angles originaux ou des valeurs par défaut
      const startAngle = pieceData.angles?.start || 90;
      const endAngle = pieceData.angles?.end || 90;
      
      const stepAttrs = {
        S051: Math.round(piece.length * 10000).toString(),  // Longueur multipliée par 10000
        S052: piece.count.toString(),                       // Quantité de cette pièce
        S053: "1",                                          // Une pièce à la fois
        S054: Math.round(startAngle * 100).toString(),      // Angle de début converti
        S055: Math.round(endAngle * 100).toString(),        // Angle de fin converti
        S056: "1",
        S057: "1",
        S058: "1",
        S060: "0",
        S061: "0",
        S070: "0",
        S071: "0",
        S072: "0",
        S073: "0",
        S074: "0",
        S075: "0",
        S094: "0"
      };
      
      pgmContent += `<STEP ${Object.entries(stepAttrs).map(([key, value]) => `${key}="${value}"`).join(' ')} ></STEP>\n`;
    }
    
    return pgmContent;
  },
  
  /**
   * Génère un fichier ZIP contenant tous les fichiers PGM
   * @param {Object} cutResults - Résultats de l'optimisation
   * @param {Object} dataManager - Instance du DataManager pour accéder aux données complètes
   * @returns {Promise<Blob>} - Blob du fichier ZIP
   */
  generateAllPgmFiles: async function(cutResults, dataManager) {
    const zip = new JSZip();
    
    // Créer un map des pièces par ID pour un accès rapide
    const pieceDataMap = {};
    dataManager.data.barsList.forEach(bar => {
      if (bar.type === 'fille' && bar.id) {
        pieceDataMap[bar.id] = bar;
      }
    });
    
    // Pour chaque modèle
    for (const model in cutResults.modelResults) {
      // Trouver le profileFull correspondant au modèle
      const firstPieceWithModel = dataManager.data.barsList.find(bar => bar.model === model);
      const profileFull = firstPieceWithModel?.profileFull || model;
      
      // Pour chaque schéma de coupe
      cutResults.modelResults[model].layouts.forEach((layout, index) => {
        // Générer le contenu PGM avec les données complètes des pièces
        const pgmContent = this.generatePgm(layout, model, pieceDataMap);
        
        // Utiliser le nom complet du profil pour le nom du fichier
        const filename = `${profileFull}_${Math.round(layout.barLength || layout.originalLength)}_${index+1}.pgm`;
        zip.file(filename, pgmContent);
      });
    }
    
    // Générer le ZIP
    const blob = await zip.generateAsync({type: "blob"});
    return blob;
  }
};

// Exporter le module
export { PgmGenerator };