/**
 * Générateur de fichiers F4C à partir des objets F4C
 */
import JSZip from 'jszip';

export const F4CGenerator = {
  /**
   * MODIFIÉ: Formate une longueur en mètres avec décimales précises (POINT comme séparateur pour les noms de fichiers)
   * @param {number} lengthInMm - Longueur en centimètres
   * @param {boolean} useComma - Si true, utilise la virgule, sinon le point
   * @returns {string} - Longueur formatée en mètres
   */
  

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
   * MODIFIÉ: Génère le nom de fichier F4C adapté au nouveau format
   * @param {Object} F4CObject - Objet F4C (nouveau format)
   * @returns {string} - Nom du fichier
   */
  generateF4CFileName: function(F4CObject) {
    const profil = F4CObject.profile;
    const longueurMm = F4CObject.length;
    const orientation = F4CObject.orientation;
    const pieces = F4CObject.pieces || [];


    // Noms des barres (toutes, sans limite)
    const nomsPieces = pieces.map(piece => {
      const nom = piece.nom;
      if (nom && nom.trim() !== '') {
        // Nettoyer le nom (supprimer caractères spéciaux)
        return nom.replace(/[^a-zA-Z0-9]/g, '');
      } else {
        // Utiliser le profil + longueur si pas de nom
        return `${piece.profile}${piece.length}`;
      }
    });

    // Assembler le nom avec longueur précise (point décimal)
    let nomFichier = `${profil}_${longueurMm}mm_${orientation}__${nomsPieces.join('-')}.F4C`;

    // Nettoyer le nom final (supprimer caractères interdits dans les noms de fichier)
    nomFichier = nomFichier.replace(/[<>:"/\\|?*]/g, '_');

    // Optionnel : tronquer à 120 caractères avant l'extension
    const maxLen = 120;
    if (nomFichier.length > maxLen + 4) { // 4 pour ".F4C"
      const ext = '.F4C';
      nomFichier = nomFichier.slice(0, maxLen) + ext;
    }

    return nomFichier;
  },

  /**
   * Génère un fichier F4C à partir d'un objet F4C (nouveau format)
   * @param {Object} F4CObject - Objet F4C (nouveau format)
   * @param {Object} dataManager - Instance du DataManager
   * @returns {string} - Contenu du fichier F4C
   */
  generateF4CFromObject: function(F4CObject, dataManager) {
    console.log(`🔧 Génération F4C pour ${F4CObject.profile}_${F4CObject.orientation}`);
    
    try {
      // NOUVEAU FORMAT : accès direct aux propriétés
      const pieces = F4CObject.pieces || [];
      const barLength = F4CObject.length;
      
      if (!pieces || pieces.length === 0) {
        throw new Error('Aucune pièce à découper dans l\'objet F4C');
      }
      
      // Prendre les données F4C de la première pièce comme base pour le BODY
      const firstPiece = pieces[0];
      
      // Générer le BODY avec les données de la première pièce
      const bodyContent = this.generateBody(firstPiece, {
        profile: F4CObject.profile,
        length: barLength,
        orientation: F4CObject.orientation
      });
      
      // CORRIGÉ: Générer un STEP par pièce (pas de groupement)
      const stepsContent = pieces.map(piece => 
        this.generateStep(piece, 1) // Toujours quantité 1 par STEP
      ).join('\n');
      
      // Assembler le contenu final
      const F4CContent = `<!--CEB-->\n${bodyContent}\n${stepsContent}`;
      
      console.log(`✅ F4C généré: ${pieces.length} steps pour ${pieces.length} pièces`);
      
      return F4CContent;
      
    } catch (error) {
      console.error(`❌ Erreur génération F4C ${F4CObject.profile}_${F4CObject.orientation}:`, error);
      throw error;
    }
  },
  
  /**
   * MODIFIÉ: Génère le contenu du BODY (adapté au nouveau format)
   * @param {Object} firstPiece - Première pièce du F4C
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
      B021: "1", // Profil ?
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
    
    // // Appliquer les données F4C de la pièce
    // if (f4cData.B021) {
    //   bodyTemplate.B021 = f4cData.B021.padEnd(8, ' ');
    // } else {
    //   // Générer B021 à partir du profil
    //   bodyTemplate.B021 = firstPiece.profile.substring(0, 3).padEnd(8, ' ');
    // }
    
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
   * MODIFIÉ: Génère un STEP pour une pièce (toujours quantité 1)
   * @param {Object} piece - Pièce à découper
   * @param {number} quantity - Quantité de pièces identiques (toujours 1 maintenant)
   * @returns {string} - Contenu du STEP
   */
  generateStep: function(piece, quantity = 1) {
    const f4cData = piece.f4cData || {};
    
    // Template par défaut pour le STEP
    let stepTemplate = {
      S051: "15000000", // Longueur en micromètres - sera remplacé
      S052: "1",        // Quantité - toujours 1
      S053: "0",        
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
    stepTemplate.S051 = f4cData.S051;
    
    // Angles
    stepTemplate.S054 = f4cData.S054;
    stepTemplate.S055 = f4cData.S055;
    
    // Gestion de S058
    stepTemplate.S058 = f4cData.S058;
    
    // Construire la chaîne STEP
    const stepParts = [];
    for (const [key, value] of Object.entries(stepTemplate)) {
      stepParts.push(`${key}="${value}"`);
    }
    
    return `<STEP ${stepParts.join(' ')} ></STEP>`;
  },
  
  /**
   * CORRIGÉ: Génère le nom du fichier ZIP au format demandé
   * @param {Array} F4CObjects - Liste des objets F4C
   * @returns {string} - Nom du fichier ZIP
   */
  generateZipFileName: function(F4CObjects) {
    // Date au format AAAA-MM-JJ_HH-mm
    const now = new Date();
    const dateStr = this.formatDateTimeForFileName(now);

    // Compter le nombre total de barres uniques
    const barNames = new Set();

    F4CObjects.forEach(F4C => {
      F4C.pieces.forEach(piece => {
        // Correction : fallback si pieceReference absent
        let barName = '';
        if (piece.pieceReference && piece.pieceReference.nom && piece.pieceReference.nom.trim() !== '') {
          barName = piece.pieceReference.nom.trim();
        } else if (piece.nom && piece.nom.trim() !== '') {
          barName = piece.nom.trim();
        } else if (piece.profile && piece.length) {
          barName = `${piece.profile}_${piece.length} mm`;
        } else {
          barName = 'barre_inconnue';
        }
        barNames.add(barName);
      });
    });

    const nombreBarres = barNames.size;

    // MODIFIÉ: Format final avec nombre de barres avant la date
    const fileName = `lot_F4C_${nombreBarres}_barres_${dateStr}.zip`;

    // Nettoyer le nom final (supprimer caractères interdits dans les noms de fichier)
    return fileName.replace(/[<>:"/\\|?*]/g, '_');
  },

  /**
   * MODIFIÉ: Génère un ZIP avec tous les fichiers F4C à partir des objets F4C
   * @param {Array} F4CObjects - Liste des objets F4C
   * @param {Object} dataManager - Instance du DataManager
   * @returns {Promise<{blob: Blob, fileName: string}>} - Blob et nom du fichier ZIP
   */
  generateAllF4CFromObjects: async function(F4CObjects, dataManager) {
    console.log(`🏗️ Génération de ${F4CObjects.length} fichiers F4C...`);
    
    if (!F4CObjects || F4CObjects.length === 0) {
      throw new Error('Aucun objet F4C fourni');
    }
    
    const zip = new JSZip();
    const fileNames = new Set(); // Pour éviter les doublons
    
    try {
      // Générer chaque fichier F4C
      for (let i = 0; i < F4CObjects.length; i++) {
        const F4CObject = F4CObjects[i];
        
        try {
          // Générer le contenu F4C
          const F4CContent = this.generateF4CFromObject(F4CObject, dataManager);
          
          // Générer le nom de fichier
          let fileName = this.generateF4CFileName(F4CObject);
          
          // Gérer les doublons en ajoutant un numéro
          let counter = 1;
          let uniqueFileName = fileName;
          while (fileNames.has(uniqueFileName)) {
            const nameParts = fileName.split('.F4C');
            uniqueFileName = `${nameParts[0]}_${counter}.F4C`;
            counter++;
          }
          
          fileNames.add(uniqueFileName);
          
          // Ajouter au ZIP
          zip.file(uniqueFileName, F4CContent);
          
          console.log(`  ✅ ${uniqueFileName} (${F4CObject.pieces.length} pièces)`);
          
        } catch (error) {
          console.error(`❌ Erreur génération F4C ${i + 1}:`, error);
          
          // Créer un fichier d'erreur pour continuer le processus
          const errorFileName = `ERREUR_F4C_${i + 1}.txt`;
          const errorContent = `Erreur lors de la génération du F4C:\n${error.message}\n\nObjet F4C:\n${JSON.stringify(F4CObject, null, 2)}`;
          zip.file(errorFileName, errorContent);
        }
      }
      
      // Ajouter un fichier de résumé
      const summary = this.generateSummaryFile(F4CObjects);
      zip.file('RESUME_GENERATION.txt', summary);
      
      // Générer le nom du fichier ZIP
      const zipFileName = this.generateZipFileName(F4CObjects);
      
      // Générer le ZIP
      console.log('📦 Création du fichier ZIP...');
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });
      
      console.log(`✅ ZIP généré avec succès: ${zipFileName} (${fileNames.size} fichiers F4C)`);
      
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
   * @param {Array} F4CObjects - Liste des objets F4C
   * @returns {string} - Contenu du fichier de résumé
   */
  generateSummaryFile: function(F4CObjects) {
    const now = new Date();
    const dateStr = this.formatDate(now);
    const timeStr = now.toLocaleTimeString('fr-FR');

    let summary = `RÉSUMÉ DE GÉNÉRATION F4C\n`;
    summary += `========================\n\n`;
    summary += `Date de génération: ${dateStr} à ${timeStr}\n`;
    summary += `Nombre total de fichiers F4C: ${F4CObjects.length}\n\n`;

    // Statistiques par profil
    const profileStats = {};
    F4CObjects.forEach(F4C => {
      const profile = F4C.profile;
      if (!profileStats[profile]) {
        profileStats[profile] = {
          count: 0,
          totalPieces: 0,
          totalLength: 0,
          totalWaste: 0
        };
      }
      profileStats[profile].count++;
      profileStats[profile].totalPieces += F4C.pieces.length;
      profileStats[profile].totalLength += F4C.length;
      // Si tu as la chute sur le F4C, ajoute-la ici
      if (typeof F4C.waste === 'number') {
        profileStats[profile].totalWaste += F4C.waste;
      } else {
        // Sinon, calcule-la
        const totalPiecesLength = F4C.pieces.reduce((sum, piece) => sum + piece.length, 0);
        profileStats[profile].totalWaste += F4C.length - totalPiecesLength;
      }
    });

    summary += `STATISTIQUES PAR PROFIL:\n`;
    summary += `------------------------\n`;
    for (const [profile, stats] of Object.entries(profileStats)) {
      const efficiency = Math.round((1 - stats.totalWaste / stats.totalLength) * 100);
      const totalWasteCm = Math.round(stats.totalWaste);

      summary += `${profile}:\n`;
      summary += `  - ${stats.count} barres mères\n`;
      summary += `  - ${stats.totalPieces} pièces à découper\n`;
      summary += `  - ${stats.totalLength} mm de barres\n`;
      summary += `  - ${totalWasteCm} mm de chutes\n`;
      summary += `  - Efficacité: ${efficiency}%\n\n`;
    }

    // DÉTAIL DES BARRES À DÉCOUPER PAR F4C
    summary += `DÉTAIL DES BARRES À DÉCOUPER:\n`;
    summary += `=============================\n\n`;

    F4CObjects.forEach((F4C, F4CIndex) => {
      const fileName = this.generateF4CFileName(F4C);

      summary += `╔${'═'.repeat(80)}\n`;
      summary += `║ F4C ${F4CIndex + 1}: ${fileName}\n`;
      summary += `╚${'═'.repeat(80)}\n\n`;

      const totalPiecesLength = F4C.pieces.reduce((sum, piece) => sum + piece.length, 0);
      const waste = F4C.length - totalPiecesLength;

      summary += `Profil: ${F4C.profile}\n`;
      summary += `Orientation: ${F4C.orientation}\n`;
      summary += `Longueur: ${F4C.length} mm\n`;
      summary += `Chute: ${waste} mm\n`;

      // Efficacité
      const efficiency = F4C.length > 0 ? Math.round((totalPiecesLength / F4C.length) * 100) : 0;
      summary += `Efficacité: ${efficiency}%\n\n`;

      summary += `Barres à découper:\n`;
      summary += `${'─'.repeat(50)}\n`;

      if (F4C.pieces && F4C.pieces.length > 0) {
        F4C.pieces.forEach((piece, pieceIndex) => {
          const pieceName = piece.nom && piece.nom.trim() !== '' 
            ? piece.nom 
            : `${piece.profile}_${piece.length} mm`;
          const angle1 = piece.angles?.[1] || 90;
          const angle2 = piece.angles?.[2] || 90;
          const angleInfo = (angle1 !== 90 || angle2 !== 90) 
            ? ` - Angles: ${angle1}°/${angle2}°`
            : '';
          summary += `  ${(pieceIndex + 1).toString().padStart(2, ' ')}. ${pieceName} - ${piece.length} mm${angleInfo}\n`;
        });
      } else {
        summary += `  Aucune pièce à découper\n`;
      }

      summary += `\n\n`;
    });

    return summary;
  }
};