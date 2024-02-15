// Fonction pour ajouter des points à un domino
function ajouterPoints(domino, positions, decalageY) {
    positions.forEach(function(position) {
        const point = document.createElement('a-sphere'); // Crée un élément de type sphère pour représenter un point
        point.setAttribute('position', `${position[0] * 0.5} ${decalageY + position[1] * 0.5} ${0.05}`); // Définit la position du point en ajustant sa position
        point.setAttribute('radius', '0.025');
        point.setAttribute('color', '#000000');
        domino.appendChild(point);
    });
}

// Génère un domino avec des numéros spécifiés sur chaque côté
function genererDomino(num1, num2, posX, posY, posZ) {
    const domino = document.createElement('a-entity'); // Crée un nouvel élément pour le domino

    // Attributs pour l'interaction et la physique, inchangés
    domino.setAttribute('class', 'interactive');
    domino.setAttribute('grabbable', ''); // Rend le domino saisissable
    domino.setAttribute('dynamic-body', 'shape: box'); // Ajoute une physique de forme boîte
    domino.setAttribute('position', `${posX} ${posY} ${posZ}`);
    domino.setAttribute('collision-filter', 'group: dominos; collidesWith: default,dominos,main');

    const base = document.createElement('a-box'); // Crée la base du domino
    base.setAttribute('color', '#FFFFFF');
    base.setAttribute('width', '0.35');
    base.setAttribute('height', '0.7');
    base.setAttribute('depth', '0.1');
    domino.appendChild(base);

    const ligneCentre = document.createElement('a-box'); // Crée la ligne centrale du domino
    ligneCentre.setAttribute('position', '0 0 0.05');
    ligneCentre.setAttribute('color', '#000000');
    ligneCentre.setAttribute('width', '0.35');
    ligneCentre.setAttribute('height', '0.025');
    ligneCentre.setAttribute('depth', '0.05');
    domino.appendChild(ligneCentre);

    // Ajoute les points ajustés
    ajouterPoints(domino, positionsPoints(num1), 0.35 * 0.5); // Ajoute les points pour le côté num1
    ajouterPoints(domino, positionsPoints(num2), -0.35 * 0.5); // Ajoute les points pour le côté num2

    document.querySelector('a-scene').appendChild(domino); // Ajoute le domino à la scène
}

function positionsPoints(nombre) {
    // Positions des points ajustées pour les dominos réduits
    const dispositions = {
        0: [],
        1: [[0, 0]],
        2: [[-0.125, -0.125], [0.125, 0.125]],
        3: [[-0.125, -0.125], [0, 0], [0.125, 0.125]],
        4: [[-0.125, -0.125], [-0.125, 0.125], [0.125, -0.125], [0.125, 0.125]],
        5: [[-0.125, -0.125], [-0.125, 0.125], [0, 0], [0.125, -0.125], [0.125, 0.125]],
        6: [[-0.125, -0.15], [-0.125, 0], [-0.125, 0.15], [0.125, -0.15], [0.125, 0], [0.125, 0.15]],
    };
    return dispositions[nombre] || []; // Retourne les positions des points pour le numéro donné
}

// Fonction pour mélanger les dominoes de manière aléatoire
function melanger(array) {
    let i = array.length, indiceAleatoire;
    // Tant qu'il reste des éléments à mélanger...
    while (i != 0) {
        // Sélectionne un élément restant...
        indiceAleatoire = Math.floor(Math.random() * i);
        i--;
        // Et l'échange avec l'élément courant.
        [array[i], array[indiceAleatoire]] = [
            array[indiceAleatoire], array[i]];
    }
    return array; // Retourne le tableau mélangé
}

// Configuration initiale
let hauteurTable = 1.20; // La hauteur de la table par rapport au sol
let hauteurDomino = 0.7; // La hauteur totale du domino
let posY = hauteurTable + hauteurDomino; // Position ajustée sur la surface de la table
let allTheDominos = []; // Tous les dominos

// Génère toutes les paires possibles de dominos
for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
        allTheDominos.push([i, j]); // Ajoute la paire de nombres au tableau
    }
}

// Mélange les dominos pour une distribution aléatoire
allTheDominos = melanger(allTheDominos);

let compteurDomino = 0; // Compteur de dominos
let posX = -2, posZ = -3; // Positions de départ

// Place les dominos aléatoirement devant le joueur
for (let i = 0; i < 7; i++) { // Seulement les 7 premiers dominos pour le joueur
    let [num1, num2] = allTheDominos[i];
    genererDomino(num1, num2, posX, posY, posZ); // Génère et place un domino
    posX += 0.75; // Ajuste l'espacement entre les dominos
}

// Ce code génère et place les 7 premiers dominos mélangés devant le joueur.
