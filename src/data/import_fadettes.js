const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');

// Fonction pour valider les formats date et heure
function validateDate(dateStr) {
  // Vérifie si la date est au format YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function validateTime(timeStr) {
  // Vérifie si l'heure est au format HH:mm ou HH:mm:ss
  return /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr);
}

async function importFadettes(csvFile, uri, dbName) {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);
  const collectionName = `Fadette_${path.basename(csvFile, path.extname(csvFile))}`;
  const collection = db.collection(collectionName);

  // Supprimer la collection si elle existe
  const collections = await db.listCollections({ name: collectionName }).toArray();
  if (collections.length > 0) {
    await collection.drop();
  }

  const documents = [];
  fs.createReadStream(csvFile)
    .pipe(csv({ separator: ',' }))
    .on('data', (row) => {
      // Valider et combiner date et heure
      if (validateDate(row.date) && validateTime(row.heure)) {
        const datetimeString = `${row.date}T${row.heure}`; // Utilise directement l'heure fournie
        const datetime = new Date(datetimeString);

        // Si datetime est valide, ajouter le document
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
            };
            documents.push(document);
          }
        } else {
          console.warn(`Invalid datetime: ${datetimeString}`);
        }
      } else {
        console.warn(`Invalid date or time: ${row.date}, ${row.heure}`);
      }
    })
    .on('end', async () => {
      try {
        if (documents.length > 0) {
          await collection.insertMany(documents);
          console.log(`Import terminé pour ${csvFile}`);
        } else {
          console.warn(`Aucun document valide à importer pour ${csvFile}`);
        }
      } catch (error) {
        console.error(error);
      } finally {
        await client.close();
      }
    });
}

async function importAllFadettes(directory, uri, dbName) {
  const files = fs.readdirSync(directory).filter(file => path.extname(file) === '.csv');
  for (const file of files) {
    await importFadettes(path.join(directory, file), uri, dbName);
  }
}

module.exports = { importAllFadettes };
