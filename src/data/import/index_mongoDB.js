require('dotenv').config({ path: '../../../.env' });
const { importMongoDBFadettes } = require('./import_mongoDB_fadettes');
const { importMongoDBSites } = require('./import_mongoDB_sites');

const directoryFadettes = "../fadettes";
const directorySites = "../sites";
const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;

if (!directoryFadettes || !directorySites || !uri || !dbName) {
  console.error('Missing required environment variables');
  process.exit(1);
}

(async () => {
  try {
    // Import des fadettes dans MongoDB
    await importMongoDBFadettes(directoryFadettes, uri, dbName);
    console.log('Fadettes data import completed');

    // Import des sites dans MongoDB
    await importMongoDBSites(directorySites, uri, dbName);
    console.log('Sites data import completed');
  } catch (error) {
    console.error('Error during the import process:', error);
    process.exit(1);
  }
})();
