/**
 * Générateur de fichiers PGM à partir des objets PGM
 */
import JSZip from 'jszip';

export const PgmGenerator = {
  /**
   * MODIFIÉ: Formate une longueur en mètres avec décimales précises (POINT comme séparateur pour les noms de fichiers)
   * @param {number} lengthInCm - Longueur en centimètres
   * @param {boolean} useComma - Si true, utilise la virgule, sinon le point
   * @returns {string} - Longueur formatée en mètres
   */
  formatLengthInMeters: function(lengthInCm, useComma = false) {
    const meters = lengthInCm / 100;
    
    // Si c'est un nombre entier, pas de décimales
    if (meters % 1 === 0) {
      return meters.toString();
    }
    
    // Sinon, formatage avec jusqu'à 3 décimales en supprimant les zéros inutiles
    const formatted = meters.toFixed(3);
    const cleanFormatted = parseFloat(formatted).toString();
    
    // Utiliser virgule ou point selon le paramètre
    return useComma ? cleanFormatted.replace('.', ',') : cleanFormatted;
  },

  /**
   * NOUVEAU: Formate une date au format AAAA-MM-JJ_HH-mm pour les noms de fichiers
   * @param {Date} date - Date à formater
   * @returns {string} - Date formatée pour nom de fichier
   */
  formatDateTimeForFileName: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}`;
  },

  /**
   * MODIFIÉ: Formate une date au format JJ/MM/AAAA
   * @param {Date} date - Date à formater
   * @returns {string} - Date formatée
   */
  formatDate: function(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  },

  /**
   * MODIFIÉ: Formate une date pour les noms de fichiers (sans slashes)
   * @param {Date} date - Date à formater
   * @returns {string} - Date formatée pour nom de fichier
   */
  formatDateForFileName: function(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  },

  /**
   * MODIFIÉ: Génère le nom de fichier PGM adapté au nouveau format
   * @param {Object} pgmObject - Objet PGM (nouveau format)
   * @returns {string} - Nom du fichier
   */
  generatePgmFileName: function(pgmObject) {
    // NOUVEAU FORMAT : accès direct aux propriétés
    const profil = pgmObject.profile;
    const longueurCm = pgmObject.length;
    const orientation = pgmObject.orientation;
    const pieces = pgmObject.pieces || [];
    
    // Longueur en mètres avec POINT décimal pour les noms de fichiers
    const longueurMetres = this.formatLengthInMeters(longueurCm, false); // false = utiliser le point
    
    // Noms des barres (limiter à 5 pour éviter des noms trop longs)
    const nomsPieces = pieces.slice(0, 5).map(piece => {
      const nom = piece.nom;
      if (nom && nom.trim() !== '') {
        // Nettoyer le nom (supprimer caractères spéciaux)
        return nom.replace(/[^a-zA-Z0-9]/g, '');
      } else {
        // Utiliser le profil + longueur si pas de nom
        return `${piece.profile}${piece.length}`;
      }
    });
    
    // Ajouter "..." si plus de 5 pièces
    if (pieces.length > 5) {
      nomsPieces.push('...');
    }
    
    // Assembler le nom avec longueur précise (point décimal)
    const nomFichier = `${profil}_${longueurMetres}m_${orientation}__${nomsPieces.join('-')}.pgm`;
    
    // Nettoyer le nom final (supprimer caractères interdits dans les noms de fichier)
    return nomFichier.replace(/[<>:"/\\|?*]/g, '_');
  },

  /**
   * Génère un fichier PGM à partir d'un objet PGM (nouveau format)
   * @param {Object} pgmObject - Objet PGM (nouveau format)
   * @param {Object} dataManager - Instance du DataManager
   * @returns {string} - Contenu du fichier PGM
   */
  generatePgmFromObject: function(pgmObject, dataManager) {
    console.log(`🔧 Génération PGM pour ${pgmObject.profile}_${pgmObject.orientation}`);
    
    try {
      // NOUVEAU FORMAT : accès direct aux propriétés
      const pieces = pgmObject.pieces || [];
      const barLength = pgmObject.length;
      
      if (!pieces || pieces.length === 0) {
        throw new Error('Aucune pièce à découper dans l\'objet PGM');
      }
      
      // Prendre les données F4C de la première pièce comme base pour le BODY
      const firstPiece = pieces[0];
      
      // Générer le BODY avec les données de la première pièce
      const bodyContent = this.generateBody(firstPiece, {
        profile: pgmObject.profile,
        length: barLength,
        orientation: pgmObject.orientation
      });
      
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
      console.error(`❌ Erreur génération PGM ${pgmObject.profile}_${pgmObject.orientation}:`, error);
      throw error;
    }
  },
  
  /**
   * MODIFIÉ: Génère le contenu du BODY (adapté au nouveau format)
   * @param {Object} firstPiece - Première pièce du PGM
   * @param {Object} motherBarInfo - Informations de la barre mère
   * @returns {string} - Contenu du BODY
   */
  generateBody: function(firstPiece, motherBarInfo) {
    const f4cData = firstPiece.f4cData || {};
    
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
      bodyTemplate.B021 = firstPiece.profile.substring(0, 3).padEnd(8, ' ');
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
   * MODIFIÉ: Groupe les pièces identiques pour optimiser les STEPs (adapté au nouveau format)
   * @param {Array} pieces - Liste des pièces à découper
   * @returns {Array} - Groupes de pièces identiques avec leur quantité
   */
  groupIdenticalSteps: function(pieces) {
    const groups = new Map();
    
    pieces.forEach(piece => {
      // Créer une clé unique basée sur les propriétés importantes
      const key = JSON.stringify({
        length: piece.length,
        angles: piece.angles,
        f4cData: {
          S051: piece.f4cData?.S051,
          S054: piece.f4cData?.S054,
          S055: piece.f4cData?.S055
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
   * MODIFIÉ: Génère un STEP pour une pièce (adapté au nouveau format)
   * @param {Object} piece - Pièce à découper
   * @param {number} quantity - Quantité de pièces identiques
   * @returns {string} - Contenu du STEP
   */
  generateStep: function(piece, quantity) {
    const f4cData = piece.f4cData || {};
    
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
      const angle1 = piece.angles?.[1] || 90;
      stepTemplate.S054 = Math.round(angle1 * 100).toString();
    }
    
    if (f4cData.S055) {
      stepTemplate.S055 = f4cData.S055;
    } else {
      // Convertir l'angle en centièmes de degré
      const angle2 = piece.angles?.[2] || 90;
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
   * CORRIGÉ: Génère le nom du fichier ZIP au format demandé
   * @param {Array} pgmObjects - Liste des objets PGM
   * @returns {string} - Nom du fichier ZIP
   */
  generateZipFileName: function(pgmObjects) {
    // Date au format AAAA-MM-JJ_HH-mm
    const now = new Date();
    const dateStr = this.formatDateTimeForFileName(now);
    
    // Compter le nombre total de barres uniques
    const barNames = new Set();
    
    pgmObjects.forEach(pgm => {
      pgm.pieces.forEach(piece => {
        const pieceRef = piece.pieceReference;
        let barName = '';
        
        if (pieceRef.nom && pieceRef.nom.trim() !== '') {
          // Utiliser le nom de la barre
          barName = pieceRef.nom.trim();
        } else {
          // Générer un nom unique à partir du profil et de la longueur
          barName = `${pieceRef.profile}_${piece.length}cm`;
        }
        
        if (barName) {
          barNames.add(barName);
        }
      });
    });
    
    const nombreBarres = barNames.size;
    
    // MODIFIÉ: Format final avec nombre de barres avant la date
    const fileName = `lot_PGM_${nombreBarres}_barres_${dateStr}.zip`;
    
    // Nettoyer le nom final (supprimer caractères interdits dans les noms de fichier)
    return fileName.replace(/[<>:"/\\|?*]/g, '_');
  },

  /**
   * MODIFIÉ: Génère un ZIP avec tous les fichiers PGM à partir des objets PGM
   * @param {Array} pgmObjects - Liste des objets PGM
   * @param {Object} dataManager - Instance du DataManager
   * @returns {Promise<{blob: Blob, fileName: string}>} - Blob et nom du fichier ZIP
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
      
      // Générer le nom du fichier ZIP
      const zipFileName = this.generateZipFileName(pgmObjects);
      
      // Générer le ZIP
      console.log('📦 Création du fichier ZIP...');
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });
      
      console.log(`✅ ZIP généré avec succès: ${zipFileName} (${fileNames.size} fichiers PGM)`);
      
      // Retourner le blob et le nom du fichier
      return {
        blob: blob,
        fileName: zipFileName
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération du ZIP:', error);
      throw error;
    }
  },
  
  /**
   * MODIFIÉ: Génère un fichier de résumé pour le ZIP avec virgules décimales et format de date français
   * @param {Array} pgmObjects - Liste des objets PGM
   * @returns {string} - Contenu du fichier de résumé
   */
  generateSummaryFile: function(pgmObjects) {
    const now = new Date();
    const dateStr = this.formatDate(now);
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
      // VIRGULE pour le contenu du fichier de résumé
      const totalLengthMeters = this.formatLengthInMeters(stats.totalLength, true); // true = utiliser la virgule
      const totalWasteCm = Math.round(stats.totalWaste);
      
      summary += `${profile}:\n`;
      summary += `  - ${stats.count} barres mères\n`;
      summary += `  - ${stats.totalPieces} pièces à découper\n`;
      summary += `  - ${totalLengthMeters} m de barres\n`;
      summary += `  - ${totalWasteCm} cm de chutes\n`;
      summary += `  - Efficacité: ${efficiency}%\n\n`;
    }
    
    // DÉTAIL DES BARRES À DÉCOUPER PAR PGM
    summary += `DÉTAIL DES BARRES À DÉCOUPER:\n`;
    summary += `=============================\n\n`;
    
    pgmObjects.forEach((pgm, pgmIndex) => {
      const fileName = this.generatePgmFileName(pgm);
      
      // En-tête du PGM avec délimitation claire
      summary += `╔${'═'.repeat(80)}\n`;
      summary += `║ PGM ${pgmIndex + 1}: ${fileName}\n`;
      summary += `╚${'═'.repeat(80)}\n\n`;
      
      // VIRGULE pour le contenu du fichier de résumé
      const motherBarLengthMeters = this.formatLengthInMeters(pgm.motherBar.length, true); // true = utiliser la virgule
      const wasteCm = Math.round(pgm.motherBar.waste);
      
      summary += `Profil: ${pgm.motherBar.profile}\n`;
      summary += `Orientation: ${pgm.motherBar.orientation}\n`;
      summary += `Longueur: ${motherBarLengthMeters} m\n`;
      summary += `Chute: ${wasteCm} cm\n`;
      summary += `Efficacité: ${pgm.metadata.efficiency}%\n\n`;
      
      // Liste des barres à découper
      summary += `Barres à découper:\n`;
      summary += `${'─'.repeat(50)}\n`;
      
      if (pgm.pieces && pgm.pieces.length > 0) {
        pgm.pieces.forEach((piece, pieceIndex) => {
          const pieceRef = piece.pieceReference;
          const pieceName = pieceRef.nom && pieceRef.nom.trim() !== '' 
            ? pieceRef.nom 
            : `${pieceRef.profile}_${piece.length}cm`;
          
          // Angles si différents de 90°
          const angle1 = pieceRef.angles?.[1] || 90;
          const angle2 = pieceRef.angles?.[2] || 90;
          const angleInfo = (angle1 !== 90 || angle2 !== 90) 
            ? ` - Angles: ${angle1}°/${angle2}°`
            : '';
          
          summary += `  ${(pieceIndex + 1).toString().padStart(2, ' ')}. ${pieceName} - ${piece.length} cm${angleInfo}\n`;
        });
      } else {
        summary += `  Aucune pièce à découper\n`;
      }
      
      summary += `\n\n`;
    });
    
    return summary;
  }
};