const fs = require('fs');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');

async function importData(csvFile, uri, dbName, collectionName) {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  fs.createReadStream(csvFile)
    .pipe(csv({ separator: ';' }))
    .on('data', async (row) => {
      const document = {
        nom_op: row.nom_op,
        id_station_anfr: row.id_station_anfr,
        latitude: row.latitude,
        longitude: row.longitude,
        nom_reg: row.nom_reg,
        nom_dep: row.nom_dep,
        insee_dep: row.insee_dep,
        nom_com: row.nom_com,
      };
      try {
        await collection.insertOne(document);
      } catch (error) {
        console.error(error);
      }
    })
    .on('end', async () => {
      await client.close();
      console.log('Import completed');
    });
}

module.exports = { importData };