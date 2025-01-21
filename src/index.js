require('dotenv').config();
const { importData } = require('./import');

const csvFile = process.env.CSV_FILE_PATH;
const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION_NAME;

importData(csvFile, uri, dbName, collectionName)
  .then(() => console.log('Data import initiated'))
  .catch((error) => console.error('Error importing data:', error));