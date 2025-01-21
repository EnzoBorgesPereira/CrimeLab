const neo4j = require('neo4j-driver');
require('dotenv').config(); 

let driver;

const connectNeo4j = () => {
    try {
        if (!driver) {
            driver = neo4j.driver(
                process.env.NEO4J_URI,
                neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
            );
            console.log('Connexion à Neo4j réussie.');
        }
        return driver;
    } catch (error) {
        console.error('Erreur de connexion à Neo4j:', error.message);
        process.exit(1);
    }
};

const getSession = () => {
    if (!driver) {
        throw new Error('Neo4j driver non initialisé. Appelez connectNeo4j() en premier.');
    }
    return driver.session();
};

module.exports = {
    connectNeo4j,
    getSession,
};