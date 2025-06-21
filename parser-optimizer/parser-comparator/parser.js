//================================== CONFIGURATION ================================



// Definition de la carte des valeurs

// -  ligne ou position où se trouvent les données dans le nc2
// -  formule mathématique à appliquer à la valeur à extraire

// la position [x, y, z] indiquent :
//      -  x : le numero de paragraphe AK
//      -  y : la colonne du paragraphe AK
//      -  z : la ligne de la colonne

const carte_valeurs = {
    general: {
        'nom': {
            ligne: 2,
            formule: (x) => String(x).replace('**', '').trim(),
        },
        'quantite': {
            ligne: 8,
            formule: (x) => String(x).trim(),
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
                formule: (x) => Math.round(x) * 10**4,
            },
            'longueur': {
                position: [2, 1, 2], 
                formule: (x) => Math.round(x) * 10**4
            },
            'angle_54': {
                position: [1, 4, 4], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            },
            'angle_55': {
                position: [1, 4, 2], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            }
        },
        2: {
            'description': "A plat - Angles de sens opposé",
            'valeur_a_plat': {
                ligne: 13,
                formule: (x) => Math.round(x) * 10**4,
            },
            'longueur': {
                position: [2, 1, 2], 
                formule: (x) => Math.round(x) * 10**4
            },
            'angle_54': {
                position: [1, 4, 4], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            },
            'angle_55': {
                position: [1, 4, 2], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            }
        },
        3: {
            'description': "Debout - Angles de même sens",
            'valeur_a_plat': {
                ligne: 12,
                formule: (x) => Math.round(x) * 10**4,
            },
            'longueur': {
                position: [1, 1, 2], 
                formule: (x) => Math.round(x) * 10**4
            },
            'angle_54': {
                position: [3, 4, 4], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            },
            'angle_55': {
                position: [3, 4, 2], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            }
        },
        4: {
            'description': "Debout - Angles de sens opposé",
            'valeur_a_plat': {
                ligne: 12,
                formule: (x) => Math.round(x) * 10**4,
            },
            'longueur': {
                position: [1, 1, 2], 
                formule: (x) => Math.round(x) * 10**4
            },
            'angle_54': {
                position: [3, 4, 4], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            },
            'angle_55': {
                position: [3, 4, 2], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            }
        },
        5: {
            'description': "90 degres",
            'valeur_a_plat': {
                ligne: 12,
                formule: (x) => Math.round(x) * 10**4,
            },
            'longueur': {
                position: [2, 1, 3], 
                formule: (x) => Math.round(x) * 10**4
            },
            'angle_54': {
                position: [1, 4, 4], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            },
            'angle_55': {
                position: [1, 4, 2], 
                formule: (x) => Math.round((Math.round(x * 10) / 10 + 90) * 100)
            }
        }
    }
};


// Carte des sections du fichier F4C

// Les valeurs non déduites sont indiquées par des *
// Les valeurs à déduire sont mises à 'undefined'

const champs_f4c = {
    body: {
        B001: "        ",         // *
        B002: "700",              // *
        B003: "3",                // *
        B004: "0",                // *
        B005: "0",                // *
        B006: "0",                // *
        B007: "0",                // *
        B008: "0",                // *
        B009: "0",                // *
        B010: "0",                // *
        B011: "0",                // *
        B012: "0",                // *
        B013: "0",                // *
        B021: "undefined",        // NOM DU PROFIL
        B022: "0",                // *
        B023: "0",                // *
        B024: "0",                // *
        B025: "0",                // *
        B041: "0",                // *
        B026: "0",                // *
        B027: "0",                // *
        B030: "        ",         // *
        B031: "                ", // *
        B032: "                ", // *
        B033: "        ",         // *
        B034: "0",                // *
        B035: "undefined",        // VALEUR PROFIL A PLAT
        B037: "                ", // *
        B036: "0",                // *
        B090: "                ", // *
        B100: "1"                 // *
    },
    step: {
        S051: "undefined",        // LONGUEUR BARRE
        S052: "undefined",        // QUANTITE
        S053: "undefined",        // QUANTITE
        S054: "undefined",        // ANGLE DE COUPE
        S055: "undefined",        // ANGLE DE COUPE
        S056: "1",                // *
        S057: "1",                // *
        S058: "1",                // *
        S060: "0",                // *
        S061: "0",                // *
        S070: "0",                // *
        S071: "0",                // *
        S072: "0",                // *
        S073: "0",                // *
        S074: "0",                // *
        S075: "0",                // *
        S094: "0"                 // *
    }
};

const AK_index = {
    'paragraphes': 3,
    'colonnes': 6,
    'lignes': 5,
    'default': -0.00
};








//=================================== FONCTIONS ================================= 





// Initialiser et reset le tableau AK_valeurs
function init_AK_valeurs() {

    let AK_valeurs;
    // Structure: AK_valeurs[paragraphe][colonne][ligne]

    AK_valeurs = new Array(AK_index.paragraphes);
    for (let i = 0; i < AK_index.paragraphes; i++) {
        AK_valeurs[i] = new Array(AK_index.colonnes);
        for (let j = 0; j < AK_index.colonnes; j++) {
            AK_valeurs[i][j] = new Array(AK_index.lignes);
            for (let k = 0; k < AK_index.lignes; k++) {
                AK_valeurs[i][j][k] = AK_index.default;
            }
        }
    }

    console.log("AK_valeurs initialisé");
    return AK_valeurs;
}

// Fonction pour détecter le cas de figure
function detecterCas(AK_valeurs) {
    console.log("Détection du cas...");

    let cas_possibles = [];

    // Vérifier si le cas est 1 ou 2 (valeurs dans la colonne 4 du 1er paragraphe AK)
    for (let i = 0; i < AK_index.lignes; i++) {
        if (AK_valeurs[1-1][4-1][i] !== AK_index.default) {
            console.log("valeur trouvé dans le 1er paragraphe\nCas 1 ou 2");
            cas_possibles = [1, 2];
            break;
        }
    }

    // Vérifier si le cas est 3 ou 4 (valeurs dans la colonne 4 du 3eme paragraphe AK)
    if (cas_possibles.length == 0) {
        for (let i = 0; i < AK_index.lignes; i++) {
            if (AK_valeurs[3-1][4-1][i] !== AK_index.default) {
                console.log("valeur trouvé dans le 3eme paragraphe\nCas 3 ou 4");
                cas_possibles = [3, 4];
                break;
            }
        }
    }

    // Si aucune valeur n'est trouvée,c'est le cas 5
    if (cas_possibles.length == 0) {
        console.log("Aucune valeur trouvée dans les paragraphes 1 et 3 \nCas 5");
        return 5;
    }

    // si on est sur les cas [1,2], on check dans le paragraphe 1,
    // si on est sur les cas [3,4], on check dans le paragraphe 3,
    // donc on se sert du cas possible [0] comme index de pragraphe
    // et on regarde si les 2 valeurs d'angles sont de même sens ou opposé
    if (AK_valeurs[cas_possibles[0]-1][4-1][2-1] * AK_valeurs[cas_possibles[0]-1][4-1][4-1] > 0) {
        // Même sens
        console.log("Angles de même signes");
        return cas_possibles[0];
    } else {
        // Sens opposé
        console.log("Angles de signes opposés");
        return cas_possibles[1];
    }
}

// Fonction pour construire un tableau 3D pour les valeurs AK
function construireTableauAK3D(lignes) {
    console.log("Construction du tableau AK 3D...");

    // Initialiser le tableau AK_valeurs
    const AK_valeurs = init_AK_valeurs();

    // Remplir le tableau AK_valeurs avec les données du fichier NC
    let paragraphe_courant = -1;
    let ligne_dans_paragraphe = -1;
    let dans_paragraphe_AK = false;
    
    for (let i = 0; i < lignes.length; i++) {
        const ligne = lignes[i];
        
        // Détecter le début d'un paragraphe AK
        if (ligne.startsWith('AK')) {
            // Si on était déjà dans un paragraphe AK, on passe au suivant
            dans_paragraphe_AK = true;
            paragraphe_courant++;
            
            // Vérifier qu'on ne dépasse pas le nombre de paragraphes définis
            if (paragraphe_courant >= AK_index.paragraphes) {
                console.warn(`Limite du nombre de paragraphes AK atteinte (${AK_index.paragraphes})`);
                break;
            }
            
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
            // Limiter au nombre de lignes défini dans AK_index
            if (ligne_dans_paragraphe >= AK_index.lignes) {
                console.warn(`Limite de lignes dans le paragraphe AK ${paragraphe_courant + 1} atteinte (limite: ${AK_index.lignes})`);
                continue;
            }
            
            // Séparer les valeurs et supprimer l'identifiant (v, o, u) s'il est présent
            let valeurs = ligne.trim().split(/\s+/);
            if (valeurs.length > 0 && /^[a-zA-Z]/.test(valeurs[0])) {
                valeurs.shift(); // Supprimer l'identifiant (v, o, u)
            }
            
            // Stocker chaque valeur dans le tableau AK_valeurs
            for (let col = 0; col < valeurs.length && col < AK_index.colonnes; col++) {
                let valeur = valeurs[col];
                
                // Supprimer une quelconque lettre à la fin si présente
                if (valeur.length > 0) {
                    valeur = valeur.replace(/[a-zA-Z]$/, '');
                }
                
                // Convertir en nombre et stocker
                AK_valeurs[paragraphe_courant][col][ligne_dans_paragraphe] = parseFloat(valeur) || 0;
            }
            
            ligne_dans_paragraphe++;
        }
    }

    console.log("Construction du tableau AK 3D terminée");
    return AK_valeurs;
}

// Fonction pour rediriger l'analyse du contenu d'un fichier NC (NC1 ou NC2)
function analyseurNC(contenu) {

    console.log("Analyse du fichier NC...");

    // Stockage des lignes du fichier
    const lignes = contenu.split('\n').map(ligne => ligne.trim());
    if (lignes.length < 44) {
        return "Le fichier est incomplet : il contient moins de 44 lignes !";
    }
    
    // Créer l'objet donnees_extraites qui sera mise a jour par l'analyseur
    const donnees_extraites = {
        general: {},
        cas: 0,
        valeurs_specifiques: {}
    };
    
    // Extraire le nom du fichier grace a carte_valeurs et le stocker dans donnees_extraites
    const nom_fichier = lignes[carte_valeurs.general.nom.ligne - 1];
    donnees_extraites.general.nom = carte_valeurs.general.nom.formule(nom_fichier);
    console.log(`Nom du fichier extrait: ${donnees_extraites.general.nom}`);
    
    
    if (donnees_extraites.general.nom.includes('.nc2')) {
        console.log("Fichier NC2 détecté.");
        return analyseurNC2(lignes, donnees_extraites);
    }
    
    return "Seuls les fichiers NC2 sont pris en charge pour le moment.";
}

// Fonction pour analyser le contenu d'un fichier NC2
function analyseurNC2(lignes, donnees_extraites) {
    console.log("Analyse du fichier NC2...");

    // Construire le tableau AK_valeurs
    const AK_valeurs = construireTableauAK3D(lignes);
    
    // Déterminer le cas
    donnees_extraites.cas = detecterCas(AK_valeurs);
    if (donnees_extraites.cas === -1) {
        return "Erreur: Cas non détecté ou non pris en charge.";
    }
    const cas_description = carte_valeurs.cas[donnees_extraites.cas].description;
    console.log(`Cas détecté: ${donnees_extraites.cas} (${cas_description})`);
    const cas_info = carte_valeurs.cas[donnees_extraites.cas];
    

    // Extraire les données générales (sauf le nom qui est déjà extrait)
    console.log("Données générales extraites:");
    for (const [cle, info] of Object.entries(carte_valeurs.general)) {
        // Ignorer le nom car il est déjà extrait
        if (cle === 'nom') continue;
        const ligne_contenu = lignes[info.ligne - 1];
        let valeur_brute = ligne_contenu;
        donnees_extraites.general[cle] = info.formule(valeur_brute);
        console.log(`  ${cle}: ${donnees_extraites.general[cle]}`);
    }
    
    // Extraire les valeurs spécifiques selon le cas
    console.log("Données spécifiques extraites:");
    for (const [cle, info] of Object.entries(cas_info)) {
        if (cle !== 'description') {
            
            if (cle === 'valeur_a_plat') {
                const ligne_contenu = lignes[info.ligne - 1];
                let valeur_brute = parseFloat(ligne_contenu);
                donnees_extraites.valeurs_specifiques[cle] = info.formule(valeur_brute);
                console.log(`  ${cle}: ${donnees_extraites.valeurs_specifiques[cle]}`);
                continue;
            }

            const [para_idx, col_idx, ligne_idx] = info.position;
            console.log(`Extraction de ${cle} à la position [${para_idx}, ${col_idx}, ${ligne_idx}]:`);
            
            // Vérifier les bornes des indices
            if (para_idx <= AK_index.paragraphes && 
                col_idx <= AK_index.colonnes && 
                ligne_idx <= AK_index.lignes) {
                
                // Attention : les indices dans position sont basés sur 1, mais les tableaux sont basés sur 0
                const valeur_brute = AK_valeurs[para_idx-1][col_idx-1][ligne_idx-1];
                console.log(`  Valeur brute extraite: ${valeur_brute}`);
                
                // Modifier la condition pour accepter la valeur 0
                // Vérifier si la valeur n'est pas strictement égale à la valeur par défaut 
                // ou si c'est un zéro valide
                const est_defaut = Number.isNaN(valeur_brute) || 
                                   Object.is(valeur_brute, AK_index.default);
                
                if (!est_defaut) {
                    const valeur_transformee = info.formule(valeur_brute);
                    console.log(`  Valeur après transformation: ${valeur_transformee}`);
                    donnees_extraites.valeurs_specifiques[cle] = valeur_transformee;
                } else {
                    console.error(`  Erreur: Position [${para_idx}, ${col_idx}, ${ligne_idx}] contient la valeur par défaut`);
                }
            } else {
                console.error(`  Erreur: Position [${para_idx}, ${col_idx}, ${ligne_idx}] hors limites (max: [${AK_index.paragraphes}, ${AK_index.colonnes}, ${AK_index.lignes}])`);
            }
        }
    }
    
    return donnees_extraites;
}

// Fonction pour construire le contenu F4C
function constructeurF4C(donnees_extraites) {
    // Vérifier si données_extraites est une chaîne d'erreur
    if (typeof donnees_extraites === 'string') {
        return donnees_extraites; // Retourner le message d'erreur
    }
    
    console.log("Construction du contenu F4C...");
    
    // Créer des copies des objets de champs à remplir
    const body = {...champs_f4c.body};
    const step = {...champs_f4c.step};
    
    // Remplir les champs du BODY
    body.B021 = donnees_extraites.general.profil.padEnd(8, ' ');
    body.B035 = donnees_extraites.valeurs_specifiques.valeur_a_plat.toString();
    
    // Remplir les champs du STEP
    step.S051 = donnees_extraites.valeurs_specifiques.longueur.toString();
    step.S052 = donnees_extraites.general.quantite.toString();
    step.S053 = donnees_extraites.general.quantite.toString();
    step.S054 = donnees_extraites.valeurs_specifiques.angle_54.toString();
    step.S055 = donnees_extraites.valeurs_specifiques.angle_55.toString();
    
    // Construire le contenu F4C
    const contenu_f4c = 
        `<!--CEB-->\n<BODY ${Object.entries(body).map(([key, value]) => `${key}="${value}"`).join(' ')} ></BODY>\n` +
        `<STEP ${Object.entries(step).map(([key, value]) => `${key}="${value}"`).join(' ')} ></STEP>`;
    
    console.log("Construction F4C terminée");
    return contenu_f4c;
}

// Fonction pour générer le contenu F4C
function to_F4C(contenu) {
    console.log("Démarrage de la conversion NC2 vers F4C");
    const donnees_extraites = analyseurNC(contenu);
    
    if (typeof donnees_extraites === 'string') {
        console.error("Erreur lors de l'analyse:", donnees_extraites);
        return donnees_extraites;
    }
    
    const f4c_content = constructeurF4C(donnees_extraites);
    console.log("Conversion terminée avec succès");
    return f4c_content;
}

// Exporter les fonctions pour une utilisation dans le script de la page web
window.Parser = {
    to_F4C
};
