/**
 * Parser pour fichiers NC2
 */
const Parser = {
  // Configuration des valeurs à extraire
  carteValeurs: {
    general: {
      'nom': {
        ligne: 2,
        formule: (x) => String(x).replace('**', '').trim(),
      },
      'quantite': {
        ligne: 8,
        formule: (x) => parseInt(String(x).trim(), 10) || 1,
      },
      'profil': {
        ligne: 9,
        formule: (x) => String(x).trim().substring(0, 3),
      },
    },
    cas: {
      1: {
        'description': "A plat - Angles de même sens",
        'valeur_a_plat': {
          ligne: 13,
          formule: (x) => Math.round(parseFloat(x)) * 10**4,
        },
        'longueur': {
          position: [2, 1, 2], 
          formule: (x) => Math.round(x * 10000) / 10000
        },
        'angle_54': {
          position: [1, 4, 4], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        },
        'angle_55': {
          position: [1, 4, 2], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        }
      },
      2: {
        'description': "A plat - Angles de sens opposé",
        'valeur_a_plat': {
          ligne: 13,
          formule: (x) => Math.round(parseFloat(x)) * 10**4,
        },
        'longueur': {
          position: [2, 1, 2], 
          formule: (x) => Math.round(x * 10000) / 10000
        },
        'angle_54': {
          position: [1, 4, 4], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        },
        'angle_55': {
          position: [1, 4, 2], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        }
      },
      3: {
        'description': "Debout - Angles de même sens",
        'valeur_a_plat': {
          ligne: 12,
          formule: (x) => Math.round(parseFloat(x)) * 10**4,
        },
        'longueur': {
          position: [1, 1, 2], 
          formule: (x) => Math.round(x * 10000) / 10000
        },
        'angle_54': {
          position: [3, 4, 4], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        },
        'angle_55': {
          position: [3, 4, 2], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        }
      },
      4: {
        'description': "Debout - Angles de sens opposé",
        'valeur_a_plat': {
          ligne: 12,
          formule: (x) => Math.round(parseFloat(x)) * 10**4,
        },
        'longueur': {
          position: [1, 1, 2], 
          formule: (x) => Math.round(x * 10000) / 10000
        },
        'angle_54': {
          position: [3, 4, 4], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        },
        'angle_55': {
          position: [3, 4, 2], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        }
      },
      5: {
        'description': "90 degres",
        'valeur_a_plat': {
          ligne: 12,
          formule: (x) => Math.round(parseFloat(x)) * 10**4,
        },
        'longueur': {
          position: [2, 1, 3], 
          formule: (x) => Math.round(x * 10000) / 10000
        },
        'angle_54': {
          position: [1, 4, 4], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        },
        'angle_55': {
          position: [1, 4, 2], 
          formule: (x) => Math.round(x * 10) / 10 + 90
        }
      }
    }
  },

  // Configuration pour le tableau AK
  AK_index: {
    'paragraphes': 3,
    'colonnes': 6,
    'lignes': 5,
    'default': -0.00
  },

  /**
   * Parse un fichier NC2
   * @param {string} content - Contenu du fichier NC2
   * @returns {Object} - Données extraites
   */
  parseNC2: function(content) {
    try {
      console.log("Analyse du fichier NC2...");
      
      // Stockage des lignes du fichier
      const lignes = content.split('\n').map(ligne => ligne.trim());
      if (lignes.length < 10) {
        throw new Error("Le fichier contient trop peu de lignes");
      }
      
      // Créer l'objet de données extraites
      const donneesExtraites = {
        general: {},
        cas: 0,
        valeurs_specifiques: {}
      };
      
      // Extraire les données générales
      for (const [cle, info] of Object.entries(this.carteValeurs.general)) {
        const ligneContenu = lignes[info.ligne - 1] || '';
        donneesExtraites.general[cle] = info.formule(ligneContenu);
        console.log(`${cle}: ${donneesExtraites.general[cle]}`);
      }
      
      // Extraire le nom complet du profil à partir de la ligne 9
      const ligneProfilComplet = lignes[8] || '';
      const profilComplet = ligneProfilComplet.trim();
      
      // Construire le tableau AK 3D
      const AK_valeurs = this.construireTableauAK3D(lignes);
      
      // Déterminer le cas
      donneesExtraites.cas = this.detecterCas(AK_valeurs);
      console.log(`Cas détecté: ${donneesExtraites.cas}`);
      
      if (donneesExtraites.cas === 0) {
        throw new Error("Impossible de détecter le cas du fichier NC2");
      }
      
      const casInfo = this.carteValeurs.cas[donneesExtraites.cas];
      
      // Extraire les valeurs spécifiques
      for (const [cle, info] of Object.entries(casInfo)) {
        if (cle !== 'description') {
          let valeurBrute;
          
          if (cle === 'valeur_a_plat') {
            const ligneContenu = lignes[info.ligne - 1] || '0';
            valeurBrute = parseFloat(ligneContenu);
          } else {
            const [paraIdx, colIdx, ligneIdx] = info.position;
            valeurBrute = AK_valeurs[paraIdx-1][colIdx-1][ligneIdx-1];
          }
          
          // Si la valeur n'est pas par défaut, on la traite
          if (valeurBrute !== this.AK_index.default) {
            // Conserver la valeur originale et la valeur transformée pour les angles
            if (cle === 'angle_54' || cle === 'angle_55') {
              const originalAngle = valeurBrute; // Valeur brute sans transformation
              const transformedAngle = info.formule(valeurBrute); // Valeur transformée
              
              donneesExtraites.valeurs_specifiques[cle] = transformedAngle;
              donneesExtraites.valeurs_specifiques[cle + '_original'] = originalAngle;
              
              console.log(`${cle}: ${transformedAngle} (original: ${originalAngle})`);
            } else {
              donneesExtraites.valeurs_specifiques[cle] = info.formule(valeurBrute);
              console.log(`${cle}: ${donneesExtraites.valeurs_specifiques[cle]}`);
            }
          }
        }
      }
      
      // Déterminer l'orientation à partir du cas
      let orientation;
      if (donneesExtraites.cas === 1 || donneesExtraites.cas === 2) {
        orientation = "a-plat";
      } else {
        orientation = "debout"; // Cas 3, 4 et 5 sont tous "debout"
      }
      
      // Formatter les données pour le DataManager - structure unifiée des barres
      return {
        profile: donneesExtraites.general.profil, // Nom court pour F4C (ex: "HEA")
        profileFull: profilComplet,               // Nom complet pour l'UI (ex: "HEA100")
        length: donneesExtraites.valeurs_specifiques.longueur || 0,
        quantity: donneesExtraites.general.quantite,
        flatValue: donneesExtraites.valeurs_specifiques.valeur_a_plat || 0,
        angles: {
          start: donneesExtraites.valeurs_specifiques.angle_54 || 90,
          end: donneesExtraites.valeurs_specifiques.angle_55 || 90,
          originalStart: donneesExtraites.valeurs_specifiques.angle_54_original,
          originalEnd: donneesExtraites.valeurs_specifiques.angle_55_original
        },
        orientation: orientation,                 // Orientation déterminée à partir du cas
        type: 'fille',
        cas: donneesExtraites.cas,                // Numéro du cas pour la génération F4C
        originalData: donneesExtraites            // Conservation des données brutes complètes
      };
      
    } catch (error) {
      console.error('Erreur de parsing NC2:', error);
      throw new Error(`Erreur de parsing NC2: ${error.message}`);
    }
  },
  
  /**
   * Construire un tableau 3D pour les valeurs AK
   * @param {Array<string>} lignes - Lignes du fichier NC2
   * @returns {Array} - Tableau 3D des valeurs AK
   */
  construireTableauAK3D: function(lignes) {
    
    // Initialiser le tableau AK_valeurs
    const AK_valeurs = new Array(this.AK_index.paragraphes);
    for (let i = 0; i < this.AK_index.paragraphes; i++) {
      AK_valeurs[i] = new Array(this.AK_index.colonnes);
      for (let j = 0; j < this.AK_index.colonnes; j++) {
        AK_valeurs[i][j] = new Array(this.AK_index.lignes);
        for (let k = 0; k < this.AK_index.lignes; k++) {
          AK_valeurs[i][j][k] = this.AK_index.default;
        }
      }
    }
    
    // Remplir le tableau AK_valeurs avec les données du fichier NC
    let paragraphe_courant = -1;
    let ligne_dans_paragraphe = -1;
    let dans_paragraphe_AK = false;
    
    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      
      // Détecter le début d'un paragraphe AK
      if (ligne.startsWith('AK')) {
        dans_paragraphe_AK = true;
        paragraphe_courant++;
        
        // Vérifier qu'on ne dépasse pas le nombre de paragraphes définis
        if (paragraphe_courant >= this.AK_index.paragraphes) break;
        
        ligne_dans_paragraphe = 0;
        continue;
      }
      
      // Détecter la fin d'un paragraphe AK
      if (ligne.startsWith('EN')) {
        dans_paragraphe_AK = false;
        continue;
      }
      
      // Traiter les lignes à l'intérieur d'un paragraphe AK
      if (dans_paragraphe_AK && ligne.trim() !== '') {
        // Limiter au nombre de lignes défini
        if (ligne_dans_paragraphe >= this.AK_index.lignes) continue;
        
        // Séparer les valeurs et supprimer l'identifiant (v, o, u)
        let valeurs = ligne.trim().split(/\s+/);
        if (valeurs.length > 0 && /^[a-zA-Z]/.test(valeurs[0])) {
          valeurs.shift();
        }
        
        // Stocker chaque valeur
        for (let col = 0; col < valeurs.length && col < this.AK_index.colonnes; col++) {
          let valeur = valeurs[col];
          
          // Supprimer une lettre à la fin si présente
          valeur = valeur.replace(/[a-zA-Z]$/, '');
          
          // Convertir en nombre et stocker
          AK_valeurs[paragraphe_courant][col][ligne_dans_paragraphe] = parseFloat(valeur) || 0;
        }
        
        ligne_dans_paragraphe++;
      }
    }
    
    return AK_valeurs;
  },
  
  /**
   * Détecte le cas de figure du fichier NC2
   * @param {Array} AK_valeurs - Tableau 3D des valeurs AK
   * @returns {number} - Numéro du cas (1-5)
   */
  detecterCas: function(AK_valeurs) {
    
    let cas_possibles = [];
    
    // Vérifier si le cas est 1 ou 2 (valeurs dans la colonne 4 du 1er paragraphe AK)
    for (let i = 0; i < this.AK_index.lignes; i++) {
      if (AK_valeurs[0][3][i] !== this.AK_index.default) {
        console.log("Cas 1 ou 2");
        cas_possibles = [1, 2];
        break;
      }
    }
    
    // Vérifier si le cas est 3 ou 4 (valeurs dans la colonne 4 du 3ème paragraphe AK)
    if (cas_possibles.length === 0) {
      for (let i = 0; i < this.AK_index.lignes; i++) {
        if (AK_valeurs[2][3][i] !== this.AK_index.default) {
          console.log("Cas 3 ou 4");
          cas_possibles = [3, 4];
          break;
        }
      }
    }
    
    // Si aucune valeur n'est trouvée, c'est le cas 5
    if (cas_possibles.length === 0) {
      console.log("Cas 5");
      return 5;
    }
    
    // Déterminer si angles de même sens ou sens opposé
    const paraIdx = cas_possibles[0] - 1;
    if (AK_valeurs[paraIdx][3][1] * AK_valeurs[paraIdx][3][3] > 0) {
      // Même sens
      return cas_possibles[0];
    } else {
      // Sens opposé
      return cas_possibles[1];
    }
  }
};

// Exporter le module
export { Parser };