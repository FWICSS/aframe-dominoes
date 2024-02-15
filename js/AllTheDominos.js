// Fonction pour ajouter des points à un domino
function addDots(domino, positions, yOffset) {
    positions.forEach(function(position) {
        const dot = document.createElement('a-sphere');
        // Réduit le rayon des points pour correspondre à la nouvelle échelle des dominos
        dot.setAttribute('position', `${position[0] * 0.5} ${yOffset + position[1] * 0.5} ${0.05}`);
        dot.setAttribute('radius', '0.025'); // Rayon réduit
        dot.setAttribute('color', '#000000');
        domino.appendChild(dot);
    });
}

// Générer un domino avec des numéros spécifiés sur chaque côté
function generateDomino(num1, num2, posX, posY, posZ) {
    const domino = document.createElement('a-entity');

    // Attributs pour l'interaction et la physique, inchangés
    domino.setAttribute('class', 'interactive');
    domino.setAttribute('grabbable', '');
    domino.setAttribute('dynamic-body', 'shape: box');
    domino.setAttribute('position', `${posX} ${posY} ${posZ}`);
    domino.setAttribute('collision-filter', 'group: dominos; collidesWith: default,dominos,hand');

    const base = document.createElement('a-box');
    // Réduction des dimensions de la base du domino
    base.setAttribute('color', '#FFFFFF');
    base.setAttribute('width', '0.35'); // Largeur réduite
    base.setAttribute('height', '0.7'); // Hauteur réduite
    base.setAttribute('depth', '0.1'); // Profondeur réduite
    domino.appendChild(base);

    const centerLine = document.createElement('a-box');
    // Réduction des dimensions et ajustement de la position de la ligne centrale
    centerLine.setAttribute('position', '0 0 0.05');
    centerLine.setAttribute('color', '#000000');
    centerLine.setAttribute('width', '0.35'); // Largeur réduite
    centerLine.setAttribute('height', '0.025'); // Hauteur réduite
    centerLine.setAttribute('depth', '0.05'); // Profondeur réduite
    domino.appendChild(centerLine);

    // Ajout des points ajustés
    addDots(domino, dotPositions(num1), 0.35 * 0.5); // Ajustement pour le côté num1
    addDots(domino, dotPositions(num2), -0.35 * 0.5); // Ajustement pour le côté num2

    document.querySelector('a-scene').appendChild(domino);
}

function dotPositions(number) {
    // Les positions des points ajustées pour les dominos réduits
    const layouts = {
        // Positions ajustées (réduites de moitié par rapport aux valeurs originales)
        0: [],
        1: [[0, 0]],
        2: [[-0.125, -0.125], [0.125, 0.125]],
        3: [[-0.125, -0.125], [0, 0], [0.125, 0.125]],
        4: [[-0.125, -0.125], [-0.125, 0.125], [0.125, -0.125], [0.125, 0.125]],
        5: [[-0.125, -0.125], [-0.125, 0.125], [0, 0], [0.125, -0.125], [0.125, 0.125]],
        6: [[-0.125, -0.15], [-0.125, 0], [-0.125, 0.15], [0.125, -0.15], [0.125, 0], [0.125, 0.15]],
    };
    return layouts[number] || [];
}

let tableHeight = 1.20; // The height of the tabletop above the ground
let dominoHeight = 0.7; // The full height of the domino
let posY = tableHeight + dominoHeight; // Position on the table surface


let posX = -2, posZ = -3;
let dominoCount = 0;

for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
        generateDomino(i, j, posX, posY, posZ);
        // Ajuste l'espacement entre les dominos en fonction de leur nouvelle taille
        posX += 0.75; // Espacement réduit
        dominoCount++;
        if (dominoCount % 7 === 0) {
            posX = -2;
            posZ -= 0.75; // Ajuste le décalage Z pour les lignes suivantes
        }
    }
}


// Ce code génère et place tous les dominos sur la table