const neo4j = require('neo4j-driver');

let driver;
if (!process.env.NEO4J_URI || !process.env.NEO4J_USERNAME) {
    console.error('Variables d\'environnement Neo4j non définies.');
}

const connectNeo4j = () => {
    if (!driver) {
        try {

            driver = neo4j.driver(
                process.env.NEO4J_URI,
                neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
            );
            console.log('Connexion à Neo4j réussie.');
        } catch (error) {
            console.error('Erreur de connexion à Neo4j:', error.message);
            process.exit(1);
        }
    }
    return driver;
};

const getSession = () => {
    if (!driver) {
        throw new Error('Neo4j driver non initialisé. Appelez connectNeo4j() avant.');
    }
    return driver.session();
};

module.exports = { connectNeo4j, getSession };