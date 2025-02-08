const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');

// Configuration MongoDB et Neo4j
const neo4jUri = process.env.NEO4J_URI;
const neo4jUser = process.env.NEO4J_USERNAME;
const neo4jPassword = process.env.NEO4J_PASSWORD;

async function importNeo4jSites(mongoUri, dbName) {
  // Connexion à MongoDB
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db(dbName);
  const collection = db.collection('Sites');

  // Connexion à Neo4j
  const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));
  const session = driver.session();

  try {
    console.log('Fetching data from MongoDB...');
    const data = await collection.find({}).toArray();

    console.log('Importing data to Neo4j...');
    for (const item of data) {
      const { nom_op, id_station_anfr, latitude, longitude, nom_com } = item;

      // Création des noeuds dans Neo4j
      await session.run(
        `CREATE (s:Site {
          nom_op: $nom_op,
          id_station_anfr: $id_station_anfr,
          latitude: $latitude,
          longitude: $longitude,
          nom_com: $nom_com
        })`,
        { nom_op, id_station_anfr, latitude, longitude, nom_com }
      );
      console.log(`Imported site: ${nom_com}`);
    }

    console.log('All data successfully imported to Neo4j');
  } catch (error) {
    console.error('Error during Neo4j import:', error);
  } finally {
    // Fermer les connexions
    await session.close();
    await driver.close();
    await mongoClient.close();
  }
}

module.exports = { importNeo4jSites };
