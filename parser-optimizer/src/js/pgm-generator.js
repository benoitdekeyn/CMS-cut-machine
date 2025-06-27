/**
 * Générateur de fichiers PGM à partir des objets PGM
 */
import JSZip from 'jszip';

export const PgmGenerator = {
  /**
   * Génère un fichier PGM à partir d'un objet PGM
   * @param {Object} pgmObject - Objet PGM créé par le PGM-Manager
   * @param {Object} dataManager - Instance du DataManager
   * @returns {string} - Contenu du fichier PGM
   */
  generatePgmFromObject: function(pgmObject, dataManager) {
    console.log(`🔧 Génération PGM pour ${pgmObject.id}`);
    
    try {
      // Récupérer les informations de base
      const motherBar = pgmObject.motherBar;
      const pieces = pgmObject.pieces;
      
      if (!pieces || pieces.length === 0) {
        throw new Error('Aucune pièce à découper dans l\'objet PGM');
      }
      
      // Prendre les données F4C de la première pièce comme base pour le BODY
      const firstPiece = pieces[0].pieceReference;
      
      // Générer le BODY avec les données de la première pièce
      const bodyContent = this.generateBody(firstPiece, motherBar);
      
      // Grouper les pièces identiques pour optimiser les STEPs
      const groupedSteps = this.groupIdenticalSteps(pieces);
      
      // Générer les STEPs
      const stepsContent = groupedSteps.map(group => 
        this.generateStep(group.piece, group.quantity)
      ).join('\n');
      
      // Assembler le contenu final
      const pgmContent = `<!--CEB-->\n${bodyContent}\n${stepsContent}`;
      
      console.log(`✅ PGM généré: ${groupedSteps.length} steps pour ${pieces.length} pièces`);
      
      return pgmContent;
      
    } catch (error) {
      console.error(`❌ Erreur génération PGM ${pgmObject.id}:`, error);
      throw error;
    }
  },
  
  /**
   * Génère le contenu du BODY
   * @param {Object} pieceReference - Référence de la première pièce
   * @param {Object} motherBar - Informations de la barre mère
   * @returns {string} - Contenu du BODY
   */
  generateBody: function(pieceReference, motherBar) {
    const f4cData = pieceReference.f4cData || {};
    
    // Template par défaut pour le BODY
    const bodyTemplate = {
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
      B021: "HEA     ", // Sera remplacé par les données de la pièce
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
      B035: "1000000", // Sera remplacé par les données de la pièce
      B037: "                ",
      B036: "0",
      B090: "                ",
      B100: "1"
    };
    
    // Appliquer les données F4C de la pièce
    if (f4cData.B021) {
      bodyTemplate.B021 = f4cData.B021.padEnd(8, ' ');
    } else {
      // Générer B021 à partir du profil
      bodyTemplate.B021 = pieceReference.profile.substring(0, 3).padEnd(8, ' ');
    }
    
    if (f4cData.B035) {
      bodyTemplate.B035 = f4cData.B035;
    } else {
      // Valeur par défaut basée sur le profil
      bodyTemplate.B035 = "10000";
    }
    
    // Construire la chaîne BODY
    const bodyParts = [];
    for (const [key, value] of Object.entries(bodyTemplate)) {
      bodyParts.push(`${key}="${value}"`);
    }
    
    return `<BODY ${bodyParts.join(' ')} ></BODY>`;
  },
  
  /**
   * Groupe les pièces identiques pour optimiser les STEPs
   * @param {Array} pieces - Liste des pièces à découper
   * @returns {Array} - Groupes de pièces identiques avec leur quantité
   */
  groupIdenticalSteps: function(pieces) {
    const groups = new Map();
    
    pieces.forEach(piece => {
      const pieceRef = piece.pieceReference;
      
      // Créer une clé unique basée sur les propriétés importantes
      const key = JSON.stringify({
        length: piece.length,
        angles: pieceRef.angles,
        f4cData: {
          S051: pieceRef.f4cData?.S051,
          S054: pieceRef.f4cData?.S054,
          S055: pieceRef.f4cData?.S055
        }
      });
      
      if (groups.has(key)) {
        groups.get(key).quantity++;
      } else {
        groups.set(key, {
          piece: piece,
          quantity: 1
        });
      }
    });
    
    return Array.from(groups.values());
  },
  
  /**
   * Génère un STEP pour une pièce
   * @param {Object} piece - Pièce à découper
   * @param {number} quantity - Quantité de pièces identiques
   * @returns {string} - Contenu du STEP
   */
  generateStep: function(piece, quantity) {
    const pieceRef = piece.pieceReference;
    const f4cData = pieceRef.f4cData || {};
    
    // Template par défaut pour le STEP
    const stepTemplate = {
      S051: "15000000", // Longueur en micromètres - sera remplacé
      S052: "1",        // Quantité - sera remplacé
      S053: "1",        // Quantité - sera remplacé
      S054: "9000",     // Angle début en centièmes - sera remplacé
      S055: "9000",     // Angle fin en centièmes - sera remplacé
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
    
    // Appliquer les données F4C de la pièce
    if (f4cData.S051) {
      stepTemplate.S051 = f4cData.S051;
    } else {
      // Convertir la longueur en micromètres (cm → µm)
      stepTemplate.S051 = Math.round(piece.length * 10000).toString();
    }
    
    // Quantités
    stepTemplate.S052 = quantity.toString();
    stepTemplate.S053 = quantity.toString();
    
    // Angles
    if (f4cData.S054) {
      stepTemplate.S054 = f4cData.S054;
    } else {
      // Convertir l'angle en centièmes de degré
      const angle1 = pieceRef.angles?.[1] || 90;
      stepTemplate.S054 = Math.round(angle1 * 100).toString();
    }
    
    if (f4cData.S055) {
      stepTemplate.S055 = f4cData.S055;
    } else {
      // Convertir l'angle en centièmes de degré
      const angle2 = pieceRef.angles?.[2] || 90;
      stepTemplate.S055 = Math.round(angle2 * 100).toString();
    }
    
    // Construire la chaîne STEP
    const stepParts = [];
    for (const [key, value] of Object.entries(stepTemplate)) {
      stepParts.push(`${key}="${value}"`);
    }
    
    return `<STEP ${stepParts.join(' ')} ></STEP>`;
  },
  
  /**
   * Génère le nom de fichier PGM
   * @param {Object} pgmObject - Objet PGM
   * @returns {string} - Nom du fichier
   */
  generatePgmFileName: function(pgmObject) {
    const motherBar = pgmObject.motherBar;
    const pieces = pgmObject.pieces;
    
    // Profil
    const profil = motherBar.profile;
    
    // Longueur en mètres (arrondie)
    const longueurMetres = Math.round(motherBar.length / 100);
    
    // Orientation
    const orientation = motherBar.orientation;
    
    // Noms des barres (limiter à 5 pour éviter des noms trop longs)
    const nomsPieces = pieces.slice(0, 5).map(piece => {
      const nom = piece.pieceReference.nom;
      if (nom && nom.trim() !== '') {
        // Nettoyer le nom (supprimer caractères spéciaux)
        return nom.replace(/[^a-zA-Z0-9]/g, '');
      } else {
        // Utiliser le profil + longueur si pas de nom
        return `${piece.pieceReference.profile}${piece.length}`;
      }
    });
    
    // Ajouter "..." si plus de 5 pièces
    if (pieces.length > 5) {
      nomsPieces.push('...');
    }
    
    // Assembler le nom
    const nomFichier = `${profil}_${longueurMetres}m_${orientation}_${nomsPieces.join('+')}.pgm`;
    
    // Nettoyer le nom final (supprimer caractères interdits dans les noms de fichier)
    return nomFichier.replace(/[<>:"/\\|?*]/g, '_');
  },
  
  /**
   * Génère un ZIP avec tous les fichiers PGM à partir des objets PGM
   * @param {Array} pgmObjects - Liste des objets PGM
   * @param {Object} dataManager - Instance du DataManager
   * @returns {Promise<Blob>} - Blob du fichier ZIP
   */
  generateAllPgmFromObjects: async function(pgmObjects, dataManager) {
    console.log(`🏗️ Génération de ${pgmObjects.length} fichiers PGM...`);
    
    if (!pgmObjects || pgmObjects.length === 0) {
      throw new Error('Aucun objet PGM fourni');
    }
    
    const zip = new JSZip();
    const fileNames = new Set(); // Pour éviter les doublons
    
    try {
      // Générer chaque fichier PGM
      for (let i = 0; i < pgmObjects.length; i++) {
        const pgmObject = pgmObjects[i];
        
        try {
          // Générer le contenu PGM
          const pgmContent = this.generatePgmFromObject(pgmObject, dataManager);
          
          // Générer le nom de fichier
          let fileName = this.generatePgmFileName(pgmObject);
          
          // Gérer les doublons en ajoutant un numéro
          let counter = 1;
          let uniqueFileName = fileName;
          while (fileNames.has(uniqueFileName)) {
            const nameParts = fileName.split('.pgm');
            uniqueFileName = `${nameParts[0]}_${counter}.pgm`;
            counter++;
          }
          
          fileNames.add(uniqueFileName);
          
          // Ajouter au ZIP
          zip.file(uniqueFileName, pgmContent);
          
          console.log(`  ✅ ${uniqueFileName} (${pgmObject.pieces.length} pièces)`);
          
        } catch (error) {
          console.error(`❌ Erreur génération PGM ${i + 1}:`, error);
          
          // Créer un fichier d'erreur pour continuer le processus
          const errorFileName = `ERREUR_PGM_${i + 1}.txt`;
          const errorContent = `Erreur lors de la génération du PGM:\n${error.message}\n\nObjet PGM:\n${JSON.stringify(pgmObject, null, 2)}`;
          zip.file(errorFileName, errorContent);
        }
      }
      
      // Ajouter un fichier de résumé
      const summary = this.generateSummaryFile(pgmObjects);
      zip.file('RESUME_GENERATION.txt', summary);
      
      // Générer le ZIP
      console.log('📦 Création du fichier ZIP...');
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });
      
      console.log(`✅ ZIP généré avec succès (${fileNames.size} fichiers PGM)`);
      return blob;
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération du ZIP:', error);
      throw error;
    }
  },
  
  /**
   * Génère un fichier de résumé pour le ZIP
   * @param {Array} pgmObjects - Liste des objets PGM
   * @returns {string} - Contenu du fichier de résumé
   */
  generateSummaryFile: function(pgmObjects) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR');
    
    let summary = `RÉSUMÉ DE GÉNÉRATION PGM\n`;
    summary += `========================\n\n`;
    summary += `Date de génération: ${dateStr} à ${timeStr}\n`;
    summary += `Nombre total de fichiers PGM: ${pgmObjects.length}\n\n`;
    
    // Statistiques par profil
    const profileStats = {};
    pgmObjects.forEach(pgm => {
      const profile = pgm.motherBar.profile;
      if (!profileStats[profile]) {
        profileStats[profile] = {
          count: 0,
          totalPieces: 0,
          totalLength: 0,
          totalWaste: 0
        };
      }
      
      profileStats[profile].count++;
      profileStats[profile].totalPieces += pgm.pieces.length;
      profileStats[profile].totalLength += pgm.motherBar.length;
      profileStats[profile].totalWaste += pgm.motherBar.waste;
    });
    
    summary += `STATISTIQUES PAR PROFIL:\n`;
    summary += `------------------------\n`;
    for (const [profile, stats] of Object.entries(profileStats)) {
      const efficiency = Math.round((1 - stats.totalWaste / stats.totalLength) * 100);
      summary += `${profile}:\n`;
      summary += `  - ${stats.count} barres mères\n`;
      summary += `  - ${stats.totalPieces} pièces à découper\n`;
      summary += `  - ${Math.round(stats.totalLength)} cm de barres\n`;
      summary += `  - ${Math.round(stats.totalWaste)} cm de chutes\n`;
      summary += `  - Efficacité: ${efficiency}%\n\n`;
    }
    
    // Liste détaillée des fichiers
    summary += `LISTE DES FICHIERS:\n`;
    summary += `------------------\n`;
    pgmObjects.forEach((pgm, index) => {
      const fileName = this.generatePgmFileName(pgm);
      summary += `${index + 1}. ${fileName}\n`;
      summary += `   Profil: ${pgm.motherBar.profile} (${pgm.motherBar.orientation})\n`;
      summary += `   Longueur: ${Math.round(pgm.motherBar.length)} cm\n`;
      summary += `   Pièces: ${pgm.pieces.length}\n`;
      summary += `   Efficacité: ${pgm.metadata.efficiency}%\n\n`;
    });
    
    return summary;
  }
};