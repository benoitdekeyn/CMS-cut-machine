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
    
    // NOUVEAU: Créer un système de réservation des barres par modèle
    const reservationSystem = this.createReservationSystem(dataManager, modelResults);
    
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
          const pgmObject = this.createPgmObjectWithReservation(
            profile, 
            orientation, 
            layout, 
            layoutIndex, 
            i, 
            dataManager,
            reservationSystem
          );
          
          if (pgmObject) {
            pgmObjects.push(pgmObject);
          }
        }
      });
    }
    
    // Afficher un rapport de réservation
    this.reportReservationStatus(reservationSystem);
    
    console.log(`✅ ${pgmObjects.length} objets PGM générés`);
    return pgmObjects;
  },
  
  /**
   * NOUVEAU: Crée un système de réservation des barres
   * @param {Object} dataManager - Instance du DataManager
   * @param {Object} modelResults - Résultats par modèle
   * @returns {Object} Système de réservation
   */
  createReservationSystem: function(dataManager, modelResults) {
    const data = dataManager.getData();
    const reservationSystem = {};
    
    // Pour chaque modèle, créer un pool de barres disponibles
    for (const modelKey in modelResults) {
      const { profile, orientation } = this.parseModelKey(modelKey);
      
      // Récupérer toutes les pièces du profil correspondant
      const availablePieces = data.pieces[profile] || [];
      
      // Filtrer par orientation et créer des pools par longueur
      const piecePoolsByLength = new Map();
      
      availablePieces.forEach(piece => {
        const pieceOrientation = piece.orientation || 'undefined';
        if (pieceOrientation === orientation) {
          const length = piece.length;
          
          if (!piecePoolsByLength.has(length)) {
            piecePoolsByLength.set(length, []);
          }
          
          // Créer autant d'instances que la quantité de la pièce
          for (let i = 0; i < piece.quantity; i++) {
            piecePoolsByLength.get(length).push({
              ...piece,
              instanceId: `${piece.id}_${i}`,
              originalPieceId: piece.id,
              reserved: false,
              usedInPgm: null
            });
          }
        }
      });
      
      reservationSystem[modelKey] = {
        profile,
        orientation,
        piecePoolsByLength
      };
      
      console.log(`    🏪 Pool créé pour ${modelKey}:`);
      for (const [length, instances] of piecePoolsByLength.entries()) {
        console.log(`      📏 ${length}cm: ${instances.length} instances disponibles`);
      }
    }
    
    return reservationSystem;
  },
  
  /**
   * NOUVEAU: Crée un objet PGM avec système de réservation
   * @param {string} profile - Profil de la barre
   * @param {string} orientation - Orientation des pièces
   * @param {Object} layout - Layout/schéma de coupe
   * @param {number} layoutIndex - Index du layout
   * @param {number} barIndex - Index de la barre dans ce layout
   * @param {Object} dataManager - Instance du DataManager
   * @param {Object} reservationSystem - Système de réservation
   * @returns {Object|null} Objet PGM ou null si erreur
   */
  createPgmObjectWithReservation: function(profile, orientation, layout, layoutIndex, barIndex, dataManager, reservationSystem) {
    try {
      // CORRECTION: Récupérer les dimensions correctement
      const motherBarLength = layout.originalLength || layout.barLength || 0;
      const waste = Math.max(0, layout.remainingLength || layout.waste || 0);
      
      // Récupérer les coupes de ce layout
      const cuts = layout.cuts || layout.pieces || [];
      
      // CORRECTION: Vérifier la cohérence des données
      const totalCutsLength = cuts.reduce((sum, cut) => sum + cut, 0);
      const calculatedWaste = motherBarLength - totalCutsLength;
      
      // Utiliser la chute calculée si elle est cohérente
      const finalWaste = Math.abs(calculatedWaste - waste) < 1 ? calculatedWaste : waste;
      
      // Assigner les références des barres à découper aux coupes avec réservation
      const modelKey = `${profile}_${orientation}`;
      const pieceReferences = this.assignPieceReferencesWithReservation(
        cuts, 
        modelKey,
        reservationSystem,
        `${layoutIndex}_${barIndex}`
      );
      
      if (!pieceReferences || pieceReferences.length === 0) {
        console.warn(`    ⚠️ Impossible d'assigner les pièces pour PGM ${layoutIndex}_${barIndex}`);
        return null;
      }
      
      // CORRECTION: Calcul d'efficacité correct
      const efficiency = this.calculateEfficiency(motherBarLength, finalWaste);
      
      // Créer l'objet PGM
      const pgmObject = {
        // Identifiant unique
        id: `${profile}_${orientation}_${layoutIndex}_${barIndex}_${Date.now()}`,
        
        // Informations de la barre mère
        motherBar: {
          profile: profile,
          orientation: orientation,
          length: motherBarLength,
          waste: finalWaste
        },
        
        // Liste des pièces à découper avec leurs références
        pieces: pieceReferences,
        
        // Métadonnées
        metadata: {
          layoutIndex: layoutIndex,
          barIndex: barIndex,
          layoutCount: layout.count || 1,
          totalPieces: cuts.length,
          efficiency: efficiency
        }
      };
      
      console.log(`    🔹 PGM créé: ${cuts.length} pièces, efficacité ${efficiency}%`);
      
      return pgmObject;
      
    } catch (error) {
      console.error(`❌ Erreur lors de la création de l'objet PGM:`, error);
      return null;
    }
  },
  
  /**
   * NOUVEAU: Assigne les références des barres à découper avec système de réservation
   * @param {Array} cuts - Liste des longueurs des coupes
   * @param {string} modelKey - Clé du modèle
   * @param {Object} reservationSystem - Système de réservation
   * @param {string} pgmId - Identifiant du PGM pour le tracking
   * @returns {Array} Liste des références de pièces
   */
  assignPieceReferencesWithReservation: function(cuts, modelKey, reservationSystem, pgmId) {
    console.log(`    🔍 Attribution avec réservation pour ${cuts.length} coupes (PGM ${pgmId})`);
    
    const pieceReferences = [];
    const modelReservation = reservationSystem[modelKey];
    
    if (!modelReservation) {
      console.error(`    ❌ Pas de système de réservation pour ${modelKey}`);
      return [];
    }
    
    // Assigner chaque coupe à une instance de pièce disponible
    cuts.forEach((cutLength, index) => {
      const availableInstances = modelReservation.piecePoolsByLength.get(cutLength);
      
      if (!availableInstances || availableInstances.length === 0) {
        console.error(`    ❌ Pas d'instances disponibles pour ${cutLength}cm`);
        return;
      }
      
      // Trouver la première instance non réservée
      const availableInstance = availableInstances.find(instance => !instance.reserved);
      
      if (!availableInstance) {
        console.error(`    ❌ Toutes les instances de ${cutLength}cm sont déjà réservées`);
        return;
      }
      
      // Réserver cette instance
      availableInstance.reserved = true;
      availableInstance.usedInPgm = pgmId;
      
      // Créer la référence de pièce
      pieceReferences.push({
        cutIndex: index,
        length: cutLength,
        pieceReference: {
          id: availableInstance.originalPieceId,
          instanceId: availableInstance.instanceId,
          nom: availableInstance.nom,
          profile: availableInstance.profile,
          orientation: availableInstance.orientation,
          angles: availableInstance.angles || { 1: 90, 2: 90 },
          f4cData: availableInstance.f4cData || {},
          quantity: 1, // Chaque instance représente une seule pièce
          originalQuantity: availableInstance.quantity
        }
      });
      
      console.log(`      ✓ Coupe ${index+1}: ${cutLength}cm → ${availableInstance.instanceId} (${availableInstance.nom || availableInstance.originalPieceId})`);
    });
    
    return pieceReferences;
  },
  
  /**
   * NOUVEAU: Génère un rapport du statut des réservations
   * @param {Object} reservationSystem - Système de réservation
   */
  reportReservationStatus: function(reservationSystem) {
    console.log(`📊 Rapport de réservation des barres:`);
    
    for (const [modelKey, modelReservation] of Object.entries(reservationSystem)) {
      console.log(`  📋 Modèle ${modelKey}:`);
      
      let totalInstances = 0;
      let reservedInstances = 0;
      
      for (const [length, instances] of modelReservation.piecePoolsByLength.entries()) {
        const reserved = instances.filter(i => i.reserved).length;
        const available = instances.length - reserved;
        
        totalInstances += instances.length;
        reservedInstances += reserved;
        
        console.log(`    📏 ${length}cm: ${reserved}/${instances.length} utilisées (${available} restantes)`);
        
        if (available > 0) {
          console.log(`      ⚠️ ${available} pièces de ${length}cm non utilisées`);
        }
      }
      
      const utilizationRate = totalInstances > 0 ? ((reservedInstances / totalInstances) * 100).toFixed(1) : 0;
      console.log(`    📈 Taux d'utilisation: ${utilizationRate}% (${reservedInstances}/${totalInstances})`);
    }
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
   * CORRECTION: Calcule l'efficacité d'une barre mère correctement
   * @param {number} totalLength - Longueur totale de la barre
   * @param {number} waste - Longueur de chute
   * @returns {number} Efficacité en pourcentage
   */
  calculateEfficiency: function(totalLength, waste) {
    if (totalLength <= 0) return 0;
    
    // CORRECTION: S'assurer que waste n'est jamais négatif
    const actualWaste = Math.max(0, waste);
    const usedLength = totalLength - actualWaste;
    
    // CORRECTION: S'assurer que l'efficacité ne dépasse jamais 100%
    const efficiency = Math.min(100, Math.round((usedLength / totalLength) * 100));
    
    return efficiency;
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
   * CORRECTION: Génère un rapport de synthèse avec calculs corrects
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
      
      // Additionner les longueurs et chutes avec vérification
      const motherBarLength = pgm.motherBar.length || 0;
      const waste = Math.max(0, pgm.motherBar.waste || 0);
      
      report.totalMotherBarLength += motherBarLength;
      report.totalWaste += waste;
      
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
    
    // CORRECTION: Vérification de cohérence
    console.log(`📊 Rapport de synthèse PGM:`);
    console.log(`  • Total barres: ${report.totalPgmObjects}`);
    console.log(`  • Total pièces: ${report.totalPieces}`);
    console.log(`  • Longueur totale: ${report.totalMotherBarLength}cm`);
    console.log(`  • Chutes totales: ${report.totalWaste}cm`);
    console.log(`  • Efficacité moyenne: ${report.averageEfficiency}%`);
    
    return report;
  }
};