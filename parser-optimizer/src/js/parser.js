/**
 * Analyseur pour fichiers .nc2
 * Suit l'algorithme du diagramme de flux pour déterminer l'orientation et calculer les angles
 */

// Configuration pour la structure du tableau 3D des valeurs AK
const AK_index = {
  'paragraphes': 3,
  'colonnes': 6,
  'lignes': 5,
  'defaut': -0.00
};

export const Parser = {
  /**
   * Analyse un fichier .nc2 en suivant l'algorithme du diagramme de flux
   * @param {string} contenu - Contenu du fichier .nc2
   * @returns {Object} - Barre analysée
   */
  parseNC2: function(contenu) {
    console.log("Analyse du fichier NC2...");
    const lignes = contenu.split('\n').map(ligne => ligne.trim());
    let barreActuelle = this.initialiserNouvelleBarre();
    
    // Analyser les premières valeurs par lignes
    this.analyserInfosDeBaseBarre(barreActuelle, lignes);

    // Analyser les tableaux des sections AK
    const AK_valeurs = this.construireTableauAK3D(lignes);

    // Récupérer les angles et l'orientation depuis AK
    this.analyserAnglesEtOrientation(barreActuelle, AK_valeurs);

    // Générer les codes F4C
    this.genererCodesF4C(barreActuelle, AK_valeurs);

    // Afficher la barre analysée pour le débogage
    console.log("Barre analysée:", barreActuelle);

    return barreActuelle;
  },
  
  /**
   * Initialise une nouvelle barre
   * @returns {Object} - Objet barre initialisé
   */
  initialiserNouvelleBarre: function() {
    return {
      nom: '',
      profil: '',
      quantite: 1,
      longueur: 0,
      hauteur: 0,
      largeur: 0,
      orientation: '',
      angle_1: 0,
      angle_2: 0,
      // Propriétés pour F4C
      B021: '',
      B035: '',
      S051: '',
      S052: '',
      S053: '',
      S054: '',
      S055: '',
      S058: '',
    };
  },
  
  /**
   * Analyse les informations de base d'une barre
   * @param {Object} barreActuelle - Barre en cours de traitement
   * @param {Array} lignes - Toutes les lignes du fichier
   */
  analyserInfosDeBaseBarre: function(barreActuelle, lignes) {
    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      const indexLigne = i + 1; // Pour l'indexation base 1
      
      // Nom de la barre
      if (indexLigne == 2) {
        barreActuelle.nom = ligne.replace('**', '').split('.nc')[0].trim();
      }
      
      // Quantité
      if (indexLigne == 8) {
        const quantite = parseInt(ligne.split('.')[0].trim());
        if (!isNaN(quantite)) {
          barreActuelle.quantite = quantite;
        }
      }

      // Profil (ex: HEA100, IPE200, etc.)
      if (indexLigne == 9) {
        barreActuelle.profil = ligne.trim();
      }
      
      // Longueur
      if (indexLigne == 11) {
        const longueur = parseInt(ligne.split('.')[0].trim());
        barreActuelle.longueur = longueur;
      }
      
      // Hauteur
      if (indexLigne == 12) {
        const hauteur = parseInt(ligne.split('.')[0].trim());
        barreActuelle.hauteur = hauteur;
      }

      // Largeur
      if (indexLigne == 13) {
        const largeur = parseInt(ligne.split('.')[0].trim());
        barreActuelle.largeur = largeur;
      }
    }
  },
  
  /**
   * Analyse les angles et l'orientation de la barre à partir des valeurs AK
   * @param {Object} barre - Barre à traiter
   * @param {Array} AK_valeurs - Tableau 3D des valeurs AK
   */
  analyserAnglesEtOrientation: function(barre, AK_valeurs) {

    const AK_v4 = AK_valeurs[1][4]; // Première section AK, colonne 4
    const AK_o4 = AK_valeurs[2][4]; // Deuxième section AK, colonne 4

    if (AK_v4[2] != 0 || AK_v4[4] != 0) {
      barre.angle_1 = AK_v4[4];
      barre.angle_2 = AK_v4[2];
      barre.orientation = 'debout';
    } else if (AK_o4[1] != 0 || AK_o4[3] != 0) {
      barre.angle_1 = AK_o4[1] != 0 ? -AK_o4[1] : AK_o4[1];
      barre.angle_2 = AK_o4[3] != 0 ? -AK_o4[3] : AK_o4[3];
      barre.orientation = 'a-plat';
    } else {
      barre.angle_1 = 0.00;
      barre.angle_2 = 0.00;
      barre.orientation = 'a-plat';
    }
  },
    
  /**
   * Génère les codes F4C
   * @param {Object} barre - Barre à traiter
   * @param {Array} AK_valeurs - Tableau 3D des valeurs AK
   */
  genererCodesF4C: function(barre, AK_valeurs) {

    // B021 = Code profilé à 3 lettres + 5 espaces
    barre.B021 = barre.profil.substring(0, 3) + '     ';

    // B035 = Longueur du profil en centimètres
    let racine_B035 = barre.orientation == 'debout' ? barre.largeur : barre.hauteur;
    barre.B035 = Math.round(racine_B035 * 10000).toString();

    // S052 et S053 = Quantité
    barre.S052 = barre.quantite.toString();
    barre.S053 = barre.quantite.toString();
    
    // S054 et S055 = Angles (en centièmes de degré)
    barre.S054 = Math.round((90 + barre.angle_1) * 100).toString();
    barre.S055 = Math.round((90 + barre.angle_2) * 100).toString();

    // S058 = 1 sauf si les angles sont opposes = 2
    barre.S058 = (barre.angle_1 * barre.angle_2 < 0) ? '2' : '1';

    // S051 = longueur en fonction des angles
    let position_AK_S051 = [0, 0, 0];
    if (barre.orientation === 'a-plat') {
      if (barre.angle_1 > 0) {
        position_AK_S051 = [1, 1, 4]; // AK v(1;4)
      } else {
        position_AK_S051 = [1, 1, 2]; // AK v(1;2)
      }
    } else if (barre.orientation === 'debout') {
      if (barre.angle_1 < 0) {
        position_AK_S051 = [2, 1, 2]; // AK o(1;2)
      } else if ((barre.angle_2 > 0) || (barre.angle_1 > 0 && barre.angle_2 < 0)) {
        position_AK_S051 = [2, 1, 4]; // AK o(1;4)
      } else {
        position_AK_S051 = [2, 1, 3]; // AK o(1;3)
      }
    }
    barre.S051 = Math.round(AK_valeurs[position_AK_S051[0]][position_AK_S051[1]][position_AK_S051[2]] * 10000).toString();
  },

  /**
   * Initialise un tableau 3D pour les valeurs AK avec indexation base 1
   * @returns {Array} - Tableau 3D initialisé
   */
  initialiserValeursAK: function() {
      let AK_valeurs;
      // Structure: AK_valeurs[paragraphe][colonne][ligne] (indexation base 1)

      // Créer des tableaux avec +1 de taille pour accommoder l'indexation base 1
      AK_valeurs = new Array(AK_index.paragraphes + 1);
      for (let i = 0; i <= AK_index.paragraphes; i++) {
          AK_valeurs[i] = new Array(AK_index.colonnes + 1);
          for (let j = 0; j <= AK_index.colonnes; j++) {
              AK_valeurs[i][j] = new Array(AK_index.lignes + 1);
              for (let k = 0; k <= AK_index.lignes; k++) {
                  AK_valeurs[i][j][k] = AK_index.defaut;
              }
          }
      }

      return AK_valeurs;
  },

  /**
   * Construit le tableau AK 3D à partir des lignes du fichier NC avec indexation base 1
   * @param {Array} lignes - Lignes du fichier NC
   * @returns {Array} - Tableau AK 3D rempli
   */
  construireTableauAK3D: function(lignes) {

      // Initialiser le tableau AK_valeurs
      const AK_valeurs = this.initialiserValeursAK();

      // Remplir le tableau AK_valeurs avec les données du fichier NC
      let paragrapheActuel = 0; // Commence à 0, sera incrémenté à 1
      let ligneDansParagraphe = 0; // Sera incrémenté à 1
      let dansParagrapheAK = false;
      
      for (let i = 0; i < lignes.length; i++) {
          const ligne = lignes[i];
          
          // Détecter le début d'un paragraphe AK
          if (ligne.startsWith('AK')) {
              dansParagrapheAK = true;
              paragrapheActuel++; // Incrémenter pour obtenir une indexation base 1 (1, 2, 3)
              
              // Vérifier qu'on ne dépasse pas le nombre de paragraphes définis
              if (paragrapheActuel > AK_index.paragraphes) {
                  console.warn(`Limite du nombre de paragraphes AK atteinte (${AK_index.paragraphes})`);
                  break;
              }
              
              ligneDansParagraphe = 0; // Réinitialiser le compteur de lignes
              continue;
          }
          
          // Détecter la fin d'un paragraphe AK
          if (ligne.startsWith('EN')) {
              dansParagrapheAK = false;
              continue;
          }
          
          // Traiter les lignes à l'intérieur d'un paragraphe AK
          if (dansParagrapheAK && ligne.trim() !== '') {
              ligneDansParagraphe++; // Incrémenter pour obtenir une indexation base 1
              
              // Limiter au nombre de lignes défini dans AK_index
              if (ligneDansParagraphe > AK_index.lignes) {
                  console.warn(`Limite de lignes dans le paragraphe AK ${paragrapheActuel} atteinte (limite: ${AK_index.lignes})`);
                  continue;
              }
              
              // Séparer les valeurs et supprimer l'identifiant (v, o, u) s'il est présent
              let valeurs = ligne.trim().split(/\s+/);
              if (valeurs.length > 0 && /^[a-zA-Z]/.test(valeurs[0])) {
                  valeurs.shift(); // Supprimer l'identifiant (v, o, u)
              }
              
              // Stocker chaque valeur dans le tableau AK_valeurs avec indexation base 1
              for (let col = 0; col < valeurs.length && col < AK_index.colonnes; col++) {
                  let valeur = valeurs[col];
                  
                  // Supprimer une quelconque lettre à la fin si présente
                  if (valeur.length > 0) {
                      valeur = valeur.replace(/[a-zA-Z]$/, '');
                  }
                  
                  // Convertir en nombre et stocker avec indexation base 1
                  AK_valeurs[paragrapheActuel][col + 1][ligneDansParagraphe] = parseFloat(valeur) || 0;
              }
          }
      }

      return AK_valeurs;
  }
};