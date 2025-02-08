require('dotenv').config({ path: '../../../.env' });
const { importNeo4jSites } = require('./import_neo4j_sites');

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;

if (!uri || !user || !password) {
    console.error('Missing required environment variables');
    process.exit(1);
}

(async () => {
    try {
        await importNeo4jSites(uri, user, password);
        console.log('Data import completed');
    } catch (error) {
        console.error('Error during the import process:', error);
        process.exit(1);
    }
})();
