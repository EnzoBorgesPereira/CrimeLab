require('dotenv').config({ path: '../../../.env' });
const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');

/**
 * Vide la base Neo4j en supprimant tous les nœuds et relations.
 */
async function clearNeo4j(neo4jUri, neo4jUser, neo4jPassword) {
  const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));
  const session = driver.session();
  try {
    console.log("Nettoyage de la base Neo4j en cours...");
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("Base Neo4j effacée.");
  } catch (error) {
    console.error("Erreur lors du nettoyage de Neo4j :", error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

/**
 * Récupère la liste distincte des id_antenne_relais utilisés dans les fadettes
 * pour une affaire donnée.
 */
async function getDistinctAntennaIds(mongoClient, dbName, affaire) {
  const db = mongoClient.db(dbName);
  const fadettesColl = db.collection("Fadettes");
  const rawIds = await fadettesColl.distinct("id_antenne_relais", { id_affaire: affaire });
  const ids = rawIds
    .map(val => parseInt(parseFloat(val)))
    .filter(id => !isNaN(id));
  return ids;
}

/**
 * Importe dans Neo4j les sites dont l'id_station_anfr figure dans neededAntennaIds.
 */
async function importNeededSites(mongoUri, dbName, collectionName, neo4jUri, neo4jUser, neo4jPassword, neededAntennaIds) {
  const mongoClient = new MongoClient(mongoUri);
  try {
    await mongoClient.connect();
    console.log('Connexion à MongoDB réussie (Sites).');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB (Sites) :', error);
    throw error;
  }
  const db = mongoClient.db(dbName);
  const collection = db.collection(collectionName);
  console.log(`Utilisation de la collection '${collectionName}' dans MongoDB.`);

  let driver;
  try {
    driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));
    const testSession = driver.session();
    await testSession.run('RETURN 1 AS test');
    console.log('Connexion à Neo4j réussie (Sites).');
    await testSession.close();
  } catch (error) {
    console.error('Erreur de connexion à Neo4j (Sites) :', error);
    throw error;
  }

  const session = driver.session();
  try {
    console.log('Import des sites (filtrés) dans Neo4j...');
    const queryFilter = { id_station_anfr: { $in: neededAntennaIds } };
    const sites = await collection.find(queryFilter).toArray();
    if (!sites || sites.length === 0) {
      console.warn(`Aucun site trouvé dans '${collectionName}' pour les antennes spécifiées.`);
      return;
    }
    console.log(`Nombre de sites récupérés : ${sites.length}`);
    for (const item of sites) {
      const { nom_op, id_station_anfr, latitude, longitude, nom_com } = item;
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
      console.log(`Site importé : ${nom_com}`);
    }
    console.log("Import des sites terminé.");
  } catch (error) {
    console.error("Erreur lors de l'import des sites dans Neo4j :", error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
    await mongoClient.close();
    console.log("Fermeture des connexions (Sites) terminée.");
  }
}

/**
 * Importe les fadettes depuis la collection "Fadettes" de MongoDB dans Neo4j,
 * en ne sélectionnant que celles correspondant à l'affaire donnée.
 */
async function importNeo4jFadettes(mongoUri, dbName, neo4jUri, neo4jUser, neo4jPassword, affaire) {
  const mongoClient = new MongoClient(mongoUri);
  try {
    await mongoClient.connect();
    console.log("Connexion à MongoDB réussie (Fadettes).");
  } catch (error) {
    console.error("Erreur de connexion à MongoDB (Fadettes) :", error);
    throw error;
  }
  const db = mongoClient.db(dbName);
  const collection = db.collection("Fadettes");
  console.log(`Utilisation de la collection 'Fadettes' dans MongoDB pour l'affaire ${affaire}.`);

  let driver;
  try {
    driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));
    const testSession = driver.session();
    await testSession.run('RETURN 1 AS test');
    console.log("Connexion à Neo4j réussie (Fadettes).");
    await testSession.close();
  } catch (error) {
    console.error("Erreur de connexion à Neo4j (Fadettes) :", error);
    throw error;
  }

  const session = driver.session();
  try {
    console.log("Import des fadettes dans Neo4j...");
    const fadettes = await collection.find({ id_affaire: affaire }).toArray();
    if (!fadettes || fadettes.length === 0) {
      console.warn(`Aucun document trouvé dans 'Fadettes' pour l'affaire ${affaire}.`);
      return;
    }
    console.log(`Nombre de fadettes récupérés pour l'affaire ${affaire} : ${fadettes.length}`);
    for (const record of fadettes) {
      const date = record.date || "";
      const heure = record.heure || "";
      const type = record.type || "";
      const duree = parseInt(record.duree) || 0;
      const idAntenne = parseInt(record.id_antenne_relais) || null;
      const source = record.source;
      const destination = record.destination;
      if (!source || !destination) {
        console.warn("Enregistrement ignoré (source ou destination manquant) :", record);
        continue;
      }
      
      const query = `
        MERGE (p1:Person {numero: $source})
        MERGE (p2:Person {numero: $destination})
        CREATE (p1)-[:COMMUNIQUE_AVEC {
            date: $date,
            heure: $heure,
            type: $type,
            duree: $duree,
            id_antenne: $idAntenne,
            id_affaire: "${affaire}"
        }]->(p2)
        WITH p1, p2, $date AS date, $idAntenne AS idAntenne
        MATCH (s:Site { id_station_anfr: idAntenne })
        MERGE (p1)-[:UTILISE { date: date, id_affaire: "${affaire}" }]->(s)
        MERGE (p2)-[:UTILISE { date: date, id_affaire: "${affaire}" }]->(s)
      `;
      const params = { source, destination, date, heure, type, duree, idAntenne };
      await session.run(query, params);
      console.log(`Fadette importé : ${source} -> ${destination} via antenne ${idAntenne}`);
    }
    console.log("Import des fadettes terminé avec succès.");
  } catch (error) {
    console.error("Erreur lors de l'import des fadettes dans Neo4j :", error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
    await mongoClient.close();
    console.log("Fermeture des connexions (Fadettes) terminée.");
  }
}

async function main() {
  const {
    MONGO_URI,
    MONGO_DB_NAME,
    NEO4J_URI,
    NEO4J_USERNAME,
    NEO4J_PASSWORD
  } = process.env;

  const affaire = process.argv[2] || "a_001";

  if (!MONGO_URI || !MONGO_DB_NAME || !NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
    console.log('Liste des variables d\'environnement :');
    console.log(MONGO_URI, MONGO_DB_NAME, NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD);
    console.error("Les variables d'environnement nécessaires ne sont pas définies.");
    process.exit(1);
  }

  try {
    // Étape 0 : Nettoyer la base Neo4j
    await clearNeo4j(NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD);

    // Étape 1 : Récupérer la liste des antennes utilisées dans les fadettes pour l'affaire donnée
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    console.log("Connexion à MongoDB réussie (pour récupérer les antennes nécessaires).");
    const neededAntennaIds = await getDistinctAntennaIds(mongoClient, MONGO_DB_NAME, affaire);
    console.log(`Antenne IDs nécessaires pour l'affaire ${affaire} :`, neededAntennaIds);
    await mongoClient.close();

    // Étape 2 : Importer les sites nécessaires depuis "Site_sem"
    await importNeededSites(
      MONGO_URI,
      MONGO_DB_NAME,
      "Site_sem",
      NEO4J_URI,
      NEO4J_USERNAME,
      NEO4J_PASSWORD,
      neededAntennaIds
    );

    // Étape 3 : Importer les fadettes pour l'affaire depuis "Fadettes"
    await importNeo4jFadettes(
      MONGO_URI,
      MONGO_DB_NAME,
      NEO4J_URI,
      NEO4J_USERNAME,
      NEO4J_PASSWORD,
      affaire
    );

    console.log("Importation complète terminée pour l'affaire", affaire, ". Vous pouvez maintenant interroger Neo4j.");
  } catch (error) {
    console.error("Erreur lors du processus d'importation :", error);
    process.exit(1);
  }
}

main();
