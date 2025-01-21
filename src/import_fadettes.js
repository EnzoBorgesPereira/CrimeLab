const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');

async function importFadettes(csvFile, uri, dbName) {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);
  const collectionName = `Fadette_${path.basename(csvFile, path.extname(csvFile))}`;
  const collection = db.collection(collectionName);

  // Drop the collection if it exists
  const collections = await db.listCollections({ name: collectionName }).toArray();
  if (collections.length > 0) {
    await collection.drop();
  }

  const documents = [];
  fs.createReadStream(csvFile)
    .pipe(csv({ separator: ',' }))
    .on('data', (row) => {
      const document = {
        date: row.date,
        heure: row.heure,
        type: row.type,
        duree: row.duree,
        id_antenne_relais: row.id_antenne_relais,
        source: row.source,
        destination: row.destination,
      };
      documents.push(document);
    })
    .on('end', async () => {
      try {
        await collection.insertMany(documents);
        console.log(`Import completed for ${csvFile}`);
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