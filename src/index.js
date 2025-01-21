require('dotenv').config({ path: '../.env' });
const { importAllFadettes } = require('./import_fadettes');
const { importAllSites } = require('./import_sites');

const directoryFadettes = process.env.CSV_DIRECTORY_PATH_FADETTES;
const directorySites = process.env.CSV_DIRECTORY_PATH_SITES;
const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;

if (!directoryFadettes || !directorySites || !uri || !dbName) {
  console.error('Missing required environment variables');
  process.exit(1);
}

importAllFadettes(directoryFadettes, uri, dbName)
  .then(() => console.log('Fadettes data import initiated'))
  .catch((error) => console.error('Error importing fadettes data:', error));

importAllSites(directorySites, uri, dbName)
  .then(() => console.log('Sites data import initiated'))
  .catch((error) => console.error('Error importing sites data:', error));