/**
 * PGM Manager - Gère la création d'objets PGM à partir des schémas de coupe
 * Chaque objet PGM représente une barre mère à découper avec les références des pièces
 */
export const PgmManager = {
  /**
   * Génère les objets PGM à partir des résultats d'optimisation
   * @param {Object} optimizationResults - Résultats de l'optimisation
   * @param {Object} dataManager - Instance du DataManager
   * @returns {Array} Liste d'objets PGM
   */
  generatePgmObjects: function(optimizationResults, dataManager) {
    console.log('🔧 Génération des objets PGM...');
    
    const pgmObjects = [];
    const modelResults = optimizationResults.modelResults || {};
    
    // Pour chaque modèle (profil + orientation)
    for (const modelKey in modelResults) {
      const modelResult = modelResults[modelKey];
      const layouts = modelResult.layouts || [];
      
      // Extraire le profil et l'orientation du modèle
      const { profile, orientation } = this.parseModelKey(modelKey);
      
      console.log(`  📋 Traitement du modèle: ${profile} (${orientation})`);
      
      // Pour chaque schéma de coupe (layout)
      layouts.forEach((layout, layoutIndex) => {
        const count = layout.count || 1;
        
        // Créer autant d'objets PGM que de barres de ce layout
        for (let i = 0; i < count; i++) {
          const pgmObject = this.createPgmObject(
            profile, 
            orientation, 
            layout, 
            layoutIndex, 
            i, 
            dataManager
          );
          
          if (pgmObject) {
            pgmObjects.push(pgmObject);
          }
        }
      });
    }
    
    console.log(`✅ ${pgmObjects.length} objets PGM générés`);
    return pgmObjects;
  },
  
  /**
   * Analyse la clé de modèle pour extraire le profil et l'orientation
   * @param {string} modelKey - Clé du modèle (ex: "HEA100_a-plat")
   * @returns {Object} Profil et orientation
   */
  parseModelKey: function(modelKey) {
    const parts = modelKey.split('_');
    const profile = parts[0];
    const orientation = parts[1] || 'undefined';
    
    return { profile, orientation };
  },
  
  /**
   * Crée un objet PGM pour une barre mère spécifique
   * @param {string} profile - Profil de la barre
   * @param {string} orientation - Orientation des pièces
   * @param {Object} layout - Layout/schéma de coupe
   * @param {number} layoutIndex - Index du layout
   * @param {number} barIndex - Index de la barre dans ce layout
   * @param {Object} dataManager - Instance du DataManager
   * @returns {Object|null} Objet PGM ou null si erreur
   */
  createPgmObject: function(profile, orientation, layout, layoutIndex, barIndex, dataManager) {
    try {
      // Récupérer les dimensions de la barre mère
      const motherBarLength = layout.barLength || layout.originalLength || 0;
      const waste = layout.waste || layout.remainingLength || 0;
      
      // Récupérer les coupes de ce layout
      const cuts = layout.cuts || layout.pieces || [];
      
      // Assigner les références des barres à découper aux coupes
      const pieceReferences = this.assignPieceReferences(
        cuts, 
        profile, 
        orientation, 
        dataManager
      );
      
      // Créer l'objet PGM
      const pgmObject = {
        // Identifiant unique
        id: `${profile}_${orientation}_${layoutIndex}_${barIndex}_${Date.now()}`,
        
        // Informations de la barre mère
        motherBar: {
          profile: profile,
          orientation: orientation,
          length: motherBarLength,
          waste: waste
        },
        
        // Liste des pièces à découper avec leurs références
        pieces: pieceReferences,
        
        // Métadonnées
        metadata: {
          layoutIndex: layoutIndex,
          barIndex: barIndex,
          layoutCount: layout.count || 1,
          totalPieces: cuts.length,
          efficiency: this.calculateEfficiency(motherBarLength, waste)
        }
      };
      
      console.log(`    🔹 PGM créé: ${cuts.length} pièces, efficacité ${pgmObject.metadata.efficiency}%`);
      
      return pgmObject;
      
    } catch (error) {
      console.error(`❌ Erreur lors de la création de l'objet PGM:`, error);
      return null;
    }
  },
  
  /**
   * Assigne les références des barres à découper aux coupes
   * @param {Array} cuts - Liste des longueurs des coupes
   * @param {string} profile - Profil recherché
   * @param {string} orientation - Orientation recherchée
   * @param {Object} dataManager - Instance du DataManager
   * @returns {Array} Liste des références de pièces
   */
  assignPieceReferences: function(cuts, profile, orientation, dataManager) {
    console.log(`    🔍 Attribution des références pour ${cuts.length} coupes`);
    
    const pieceReferences = [];
    const data = dataManager.getData();
    
    // Récupérer toutes les pièces du profil correspondant
    const availablePieces = data.pieces[profile] || [];
    
    // Filtrer par orientation et créer une map par longueur
    const piecesByLength = new Map();
    availablePieces.forEach(piece => {
      const pieceOrientation = piece.orientation || 'undefined';
      if (pieceOrientation === orientation) {
        const length = piece.length;
        if (!piecesByLength.has(length)) {
          piecesByLength.set(length, []);
        }
        piecesByLength.get(length).push(piece);
      }
    });
    
    // Assigner chaque coupe à une référence de pièce
    cuts.forEach((cutLength, index) => {
      const matchingPieces = piecesByLength.get(cutLength);
      // Les pièces existent forcément d'après les résultats d'optimisation
      const selectedPiece = matchingPieces[0];
      
      pieceReferences.push({
        cutIndex: index,
        length: cutLength,
        pieceReference: {
          id: selectedPiece.id,
          nom: selectedPiece.nom,
          profile: selectedPiece.profile,
          orientation: selectedPiece.orientation,
          angles: selectedPiece.angles || { 1: 90, 2: 90 },
          f4cData: selectedPiece.f4cData || {},
          quantity: selectedPiece.quantity
        }
      });
      
      console.log(`      ✓ Coupe ${index+1}: ${cutLength}cm → ${selectedPiece.nom || selectedPiece.id}`);
    });
    
    return pieceReferences;
  },
  
  /**
   * Calcule l'efficacité d'une barre mère
   * @param {number} totalLength - Longueur totale de la barre
   * @param {number} waste - Longueur de chute
   * @returns {number} Efficacité en pourcentage
   */
  calculateEfficiency: function(totalLength, waste) {
    if (totalLength <= 0) return 0;
    const usedLength = totalLength - waste;
    return Math.round((usedLength / totalLength) * 100);
  },
  
  /**
   * Groupe les objets PGM par profil et orientation
   * @param {Array} pgmObjects - Liste des objets PGM
   * @returns {Object} Objets PGM groupés
   */
  groupPgmObjectsByModel: function(pgmObjects) {
    const grouped = {};
    
    pgmObjects.forEach(pgm => {
      const modelKey = `${pgm.motherBar.profile}_${pgm.motherBar.orientation}`;
      
      if (!grouped[modelKey]) {
        grouped[modelKey] = {
          profile: pgm.motherBar.profile,
          orientation: pgm.motherBar.orientation,
          pgmObjects: []
        };
      }
      
      grouped[modelKey].pgmObjects.push(pgm);
    });
    
    return grouped;
  },
  
  /**
   * Génère un rapport de synthèse des objets PGM
   * @param {Array} pgmObjects - Liste des objets PGM
   * @returns {Object} Rapport de synthèse
   */
  generateSummaryReport: function(pgmObjects) {
    const report = {
      totalPgmObjects: pgmObjects.length,
      totalPieces: 0,
      totalMotherBarLength: 0,
      totalWaste: 0,
      averageEfficiency: 0,
      profileBreakdown: {},
      orientationBreakdown: {}
    };
    
    let totalEfficiency = 0;
    
    pgmObjects.forEach(pgm => {
      // Compter les pièces
      report.totalPieces += pgm.pieces.length;
      
      // Additionner les longueurs et chutes
      report.totalMotherBarLength += pgm.motherBar.length;
      report.totalWaste += pgm.motherBar.waste;
      
      // Additionner l'efficacité
      totalEfficiency += pgm.metadata.efficiency;
      
      // Compter par profil
      const profile = pgm.motherBar.profile;
      if (!report.profileBreakdown[profile]) {
        report.profileBreakdown[profile] = 0;
      }
      report.profileBreakdown[profile]++;
      
      // Compter par orientation
      const orientation = pgm.motherBar.orientation;
      if (!report.orientationBreakdown[orientation]) {
        report.orientationBreakdown[orientation] = 0;
      }
      report.orientationBreakdown[orientation]++;
    });
    
    // Calculer l'efficacité moyenne
    if (pgmObjects.length > 0) {
      report.averageEfficiency = Math.round(totalEfficiency / pgmObjects.length);
    }
    
    return report;
  }
};