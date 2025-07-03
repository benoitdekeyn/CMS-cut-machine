/**
 * F4C Manager - Gère la création d'objets F4C à partir des schémas de coupe
 * Chaque objet F4C représente une barre mère à découper avec les références des pièces
 */

import { DataManager } from './data-manager.js';

export const F4CManager = {
  /**
   * Génère les objets F4C à partir des résultats d'optimisation
   * @param {Object} optimizationResults - Résultats de l'optimisation
   * @returns {Array} Liste d'objets F4C
   */
  generateF4CObjects: function(optimizationResults) {
    const pools = this.createPools(optimizationResults);
    const F4CObjects = this.createF4CFromPools(pools);
    return F4CObjects;
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
   * Crée les objets F4C finaux à partir des pools
   * @param {Array} pools - Les pools générés précédemment
   * @returns {Array} Liste d'objets F4C
   */
  createF4CFromPools: function(pools) {
    console.log('Création des F4C à partir des pools...');
    const F4CList = [];
    
    for (const pool of pools) {
      // Créer une copie des pièces disponibles pour cette pool
      let availablePieces = [...pool.pieces];
      
      // Pour chaque layout, créer un F4C
      for (const layout of pool.layouts) {
        const F4C = {
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
            // Assigner cette pièce au F4C
            const assignedPiece = availablePieces[pieceIndex];
            F4C.pieces.push({...assignedPiece}); // Copie de la pièce
            
            // Si c'est la première pièce, définir B035 et B021
            if (F4C.pieces.length === 1 && assignedPiece.f4cData) {
              F4C.B035 = assignedPiece.f4cData.B035 || "0";
              F4C.B021 = assignedPiece.f4cData.B021 || "0";
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
        
        F4CList.push(F4C);
      }
    }
    
    console.log('F4C créés:', F4CList);
    return F4CList;
  },

  /**
   * Génère un rapport de synthèse des objets F4C
   * @param {Array} F4CObjects - Liste des objets F4C (nouveau format)
   * @returns {Object} Rapport de synthèse
   */
  generateSummaryReport: function(F4CObjects) {
    if (!F4CObjects || F4CObjects.length === 0) {
      return {
        totalF4C: 0,
        totalPieces: 0,
        byProfile: {},
        byOrientation: {},
        summary: "Aucun F4C généré"
      };
    }

    const report = {
      totalF4C: F4CObjects.length,
      totalPieces: 0,
      byProfile: {},
      byOrientation: {},
      details: []
    };

    // Analyser chaque F4C
    F4CObjects.forEach((F4C, index) => {
      const piecesCount = F4C.pieces ? F4C.pieces.length : 0;
      report.totalPieces += piecesCount;

      // Compter par profil
      if (!report.byProfile[F4C.profile]) {
        report.byProfile[F4C.profile] = { count: 0, pieces: 0 };
      }
      report.byProfile[F4C.profile].count++;
      report.byProfile[F4C.profile].pieces += piecesCount;

      // Compter par orientation
      if (!report.byOrientation[F4C.orientation]) {
        report.byOrientation[F4C.orientation] = { count: 0, pieces: 0 };
      }
      report.byOrientation[F4C.orientation].count++;
      report.byOrientation[F4C.orientation].pieces += piecesCount;

      // Détails par F4C
      report.details.push({
        index: index + 1,
        profile: F4C.profile,
        orientation: F4C.orientation,
        length: F4C.length,
        piecesCount: piecesCount,
        B035: F4C.B035,
        B021: F4C.B021,
        pieceNames: F4C.pieces ? F4C.pieces.map(p => p.nom).join(', ') : ''
      });
    });

    // Générer le résumé textuel
    const profileSummary = Object.entries(report.byProfile)
      .map(([profile, data]) => `${profile}: ${data.count} F4C(s), ${data.pieces} pièce(s)`)
      .join(' | ');

    const orientationSummary = Object.entries(report.byOrientation)
      .map(([orientation, data]) => `${orientation}: ${data.count} F4C(s), ${data.pieces} pièce(s)`)
      .join(' | ');

    report.summary = `${report.totalF4C} F4C(s) générés avec ${report.totalPieces} pièce(s) au total. Profils: ${profileSummary}. Orientations: ${orientationSummary}.`;

    return report;
  },

  /**
   * Nouvel Objet F4C
   * @returns {Object} Un nouvel objet F4C
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