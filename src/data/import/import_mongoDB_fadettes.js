const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');

// Fonction pour valider le format de la date (YYYY-MM-DD)
function validateDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// Fonction pour valider le format de l'heure (HH:mm ou HH:mm:ss)
function validateTime(timeStr) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr);
}

// Fonction qui traite un fichier CSV et retourne une promesse résolue avec les documents extraits
// On lui fournit également les id_personne et id_affaire à ajouter à chaque document
function processCsvFile(csvFile, id_personne, id_affaire) {
  return new Promise((resolve, reject) => {
    const documents = [];
    fs.createReadStream(csvFile)
      .pipe(csv({ separator: ',' }))
      .on('data', (row) => {
        // Vérifier le format de la date et de l'heure
        if (validateDate(row.date) && validateTime(row.heure)) {
          const datetimeString = `${row.date}T${row.heure}`;
          const datetime = new Date(datetimeString);
          if (!isNaN(datetime.getTime())) {
            // Conversion des champs numériques
            const source = parseInt(row.source, 10);
            const destination = parseInt(row.destination, 10);
            if (!isNaN(source) && !isNaN(destination)) {
              const document = {
                datetime,
                type: row.type,
                duree: parseFloat(row.duree),
                id_antenne_relais: parseInt(row.id_antenne_relais, 10),
                source,
                destination,
                // Ajout des id personnalisés
                id_personne,  // Par exemple "p_001"
                id_affaire    // Par exemple "a_001"
              };
              documents.push(document);
            }
          } else {
            console.warn(`Datetime invalide : ${datetimeString} dans le fichier ${csvFile}`);
          }
        } else {
          console.warn(`Date ou heure invalide : ${row.date}, ${row.heure} dans le fichier ${csvFile}`);
        }
      })
      .on('end', () => {
        console.log(`Fichier ${csvFile} traité avec ${documents.length} documents valides.`);
        resolve(documents);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function importMongoDBFadettes(directory, uri, dbName) {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    // Utilisation d'une collection unique
    const collectionName = 'Fadettes';
    const collection = db.collection(collectionName);

    // Supprimer la collection si elle existe déjà
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length > 0) {
      await collection.drop();
      console.log(`Collection ${collectionName} supprimée.`);
    }

    // Récupérer tous les fichiers CSV du répertoire
    const files = fs.readdirSync(directory).filter(file => path.extname(file) === '.csv');

    let allDocuments = [];
    // Tri optionnel pour un ordre déterministe
    files.sort();

    // Pour chaque fichier, on attribue des id simples pour id_personne et id_affaire
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id_personne = `p_${String(i + 1).padStart(3, '0')}`; // p_001, p_002, ...
      const id_affaire  = `a_${String(i + 1).padStart(3, '0')}`;  // a_001, a_002, ...
      const filePath = path.join(directory, file);
      const documents = await processCsvFile(filePath, id_personne, id_affaire);
      allDocuments = allDocuments.concat(documents);
    }

    // Insertion de tous les documents dans la collection unique
    if (allDocuments.length > 0) {
      await collection.insertMany(allDocuments);
      console.log(`Import terminé : ${allDocuments.length} documents insérés dans la collection ${collectionName}`);
    } else {
      console.warn(`Aucun document valide à importer depuis le répertoire ${directory}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

module.exports = { importMongoDBFadettes };