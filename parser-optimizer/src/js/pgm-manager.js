/**
 * PGM Manager - Gère la création d'objets PGM à partir des schémas de coupe
 * Chaque objet PGM représente une barre mère à découper avec les références des pièces
 */

import { DataManager } from './data-manager.js';

export const PgmManager = {
  /**
   * Génère les objets PGM à partir des résultats d'optimisation
   * @param {Object} optimizationResults - Résultats de l'optimisation
   * @returns {Array} Liste d'objets PGM
   */
  generatePgmObjects: function(optimizationResults) {
    const pools = this.createPools(optimizationResults);
    const pgmObjects = this.createPgmFromPools(pools);
    return pgmObjects;
  },

  /**
   * Crée les pools à partir des résultats d'optimisation
   * @param {Object} optimizationResults - Résultats de l'optimisation  
   * @returns {Array} Liste de pools
   */
  createPools: function(optimizationResults) {
    const pools = [];
    const modelResults = optimizationResults.modelResults;
    const modelNames = Object.keys(modelResults);
    
    for (const modelName of modelNames) {      
      const [profile, orientation] = modelName.split('_');
      const pool = this.createNewPool();
      pool.profile = profile;
      pool.orientation = orientation;
      
      const modelData = modelResults[modelName];
      if (modelData.layouts && Array.isArray(modelData.layouts)) {
        for (const layout of modelData.layouts) {
          for (let i = 0; i < layout.count; i++) {
            const layout_object = {
              length: layout.originalLength || layout.length,
              cuts: layout.cuts
            };
            pool.layouts.push(layout_object);
          }
        }
      }
      
      pool.pieces = DataManager.getPiecesByModel(pool.profile, pool.orientation);
      pools.push(pool);
    }
    
    return pools;
  },

  /**
   * Crée les objets PGM finaux à partir des pools
   * @param {Array} pools - Les pools générés précédemment
   * @returns {Array} Liste d'objets PGM
   */
  createPgmFromPools: function(pools) {
    console.log('Création des PGM à partir des pools...');
    const pgmList = [];
    
    for (const pool of pools) {
      // Créer une copie des pièces disponibles pour cette pool
      let availablePieces = [...pool.pieces];
      
      // Pour chaque layout, créer un PGM
      for (const layout of pool.layouts) {
        const pgm = {
          profile: pool.profile,
          length: layout.length,
          orientation: pool.orientation,
          B035: 0, // Sera défini par la première pièce
          B021: 0, // Sera défini par la première pièce
          pieces: []
        };
        
        // Assigner les pièces aux cuts du layout
        for (const cutLength of layout.cuts) {
          // Trouver une pièce correspondante dans les pièces disponibles
          const pieceIndex = availablePieces.findIndex(piece => piece.length === cutLength);
          
          if (pieceIndex !== -1) {
            // Assigner cette pièce au PGM
            const assignedPiece = availablePieces[pieceIndex];
            pgm.pieces.push({...assignedPiece}); // Copie de la pièce
            
            // Si c'est la première pièce, définir B035 et B021
            if (pgm.pieces.length === 1 && assignedPiece.f4cData) {
              pgm.B035 = assignedPiece.f4cData.B035 || "0";
              pgm.B021 = assignedPiece.f4cData.B021 || "0";
            }
            
            // Réduire la quantité ou retirer la pièce si quantité = 1
            if (assignedPiece.quantity > 1) {
              assignedPiece.quantity--;
            } else {
              availablePieces.splice(pieceIndex, 1);
            }
          } else {
            console.warn(`Aucune pièce trouvée pour la coupe de longueur ${cutLength}`);
          }
        }
        
        pgmList.push(pgm);
      }
    }
    
    console.log('PGM créés:', pgmList);
    return pgmList;
  },

  /**
   * Génère un rapport de synthèse des objets PGM
   * @param {Array} pgmObjects - Liste des objets PGM (nouveau format)
   * @returns {Object} Rapport de synthèse
   */
  generateSummaryReport: function(pgmObjects) {
    if (!pgmObjects || pgmObjects.length === 0) {
      return {
        totalPgm: 0,
        totalPieces: 0,
        byProfile: {},
        byOrientation: {},
        summary: "Aucun PGM généré"
      };
    }

    const report = {
      totalPgm: pgmObjects.length,
      totalPieces: 0,
      byProfile: {},
      byOrientation: {},
      details: []
    };

    // Analyser chaque PGM
    pgmObjects.forEach((pgm, index) => {
      const piecesCount = pgm.pieces ? pgm.pieces.length : 0;
      report.totalPieces += piecesCount;

      // Compter par profil
      if (!report.byProfile[pgm.profile]) {
        report.byProfile[pgm.profile] = { count: 0, pieces: 0 };
      }
      report.byProfile[pgm.profile].count++;
      report.byProfile[pgm.profile].pieces += piecesCount;

      // Compter par orientation
      if (!report.byOrientation[pgm.orientation]) {
        report.byOrientation[pgm.orientation] = { count: 0, pieces: 0 };
      }
      report.byOrientation[pgm.orientation].count++;
      report.byOrientation[pgm.orientation].pieces += piecesCount;

      // Détails par PGM
      report.details.push({
        index: index + 1,
        profile: pgm.profile,
        orientation: pgm.orientation,
        length: pgm.length,
        piecesCount: piecesCount,
        B035: pgm.B035,
        B021: pgm.B021,
        pieceNames: pgm.pieces ? pgm.pieces.map(p => p.nom).join(', ') : ''
      });
    });

    // Générer le résumé textuel
    const profileSummary = Object.entries(report.byProfile)
      .map(([profile, data]) => `${profile}: ${data.count} PGM(s), ${data.pieces} pièce(s)`)
      .join(' | ');

    const orientationSummary = Object.entries(report.byOrientation)
      .map(([orientation, data]) => `${orientation}: ${data.count} PGM(s), ${data.pieces} pièce(s)`)
      .join(' | ');

    report.summary = `${report.totalPgm} PGM(s) générés avec ${report.totalPieces} pièce(s) au total. Profils: ${profileSummary}. Orientations: ${orientationSummary}.`;

    return report;
  },

  /**
   * Nouvel Objet PGM
   * @returns {Object} Un nouvel objet PGM
   */
  createNewPool: function() {
    return {
      profile: "",
      orientation: "",
      pieces: [],
      layouts: [],
    };
  },
};