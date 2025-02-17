const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');

function validateDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function validateTime(timeStr) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr);
}

/**
 * Traite un fichier CSV et ajoute les propriétés id_personne et id_affaire
 */
function processCsvFile(csvFile, id_personne, id_affaire) {
  return new Promise((resolve, reject) => {
    const documents = [];
    fs.createReadStream(csvFile)
      .pipe(csv({ separator: ',' }))
      .on('data', (row) => {
        if (validateDate(row.date) && validateTime(row.heure)) {
          const datetimeString = `${row.date}T${row.heure}`;
          const datetime = new Date(datetimeString);
          if (!isNaN(datetime.getTime())) {
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
                id_personne,
                id_affaire
              };
              documents.push(document);
            }
          } else {
            console.warn(`Datetime invalide : ${datetimeString} dans ${csvFile}`);
          }
        } else {
          console.warn(`Date ou heure invalide : ${row.date}, ${row.heure} dans ${csvFile}`);
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

/**
 * Importe dans MongoDB tous les CSV du répertoire et attribue l'id_affaire
 */
async function importMongoDBFadettes(directory, uri, dbName) {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collectionName = 'Fadettes';
    const collection = db.collection(collectionName);

    // Supprime la collection si elle existe déjà
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length > 0) {
      await collection.drop();
      console.log(`Collection ${collectionName} supprimée.`);
    }

    const files = fs.readdirSync(directory).filter(file => path.extname(file) === '.csv');
    files.sort();
    let allDocuments = [];
    for (const file of files) {
      const filePath = path.join(directory, file);
      const match = file.match(/person([A-L])\.csv/);
      let id_affaire;
      if (match) {
        const letter = match[1].toUpperCase();
        if ("ABCDEF".includes(letter)) {
          id_affaire = "a_001";
        } else if ("GHIJKL".includes(letter)) {
          id_affaire = "a_002";
        } else {
          id_affaire = "a_001";
        }
      } else {
        id_affaire = "a_001";
      }
      const id_personne = `p_${path.basename(file, path.extname(file))}`; // ex: p_fadette_A
      const documents = await processCsvFile(filePath, id_personne, id_affaire);
      allDocuments = allDocuments.concat(documents);
    }

    if (allDocuments.length > 0) {
      await collection.insertMany(allDocuments);
      console.log(`Import terminé : ${allDocuments.length} documents insérés dans ${collectionName}`);
    } else {
      console.warn(`Aucun document valide trouvé dans ${directory}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

module.exports = { importMongoDBFadettes };
