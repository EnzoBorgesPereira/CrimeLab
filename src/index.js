const { importData } = require('./import');

const csvFile = '../data/sem-data.csv';
const uri = 'your_mongodb_uri';
const dbName = 'your_database_name';
const collectionName = 'your_collection_name';

importData(csvFile, uri, dbName, collectionName)
  .then(() => console.log('Data import initiated'))
  .catch((error) => console.error('Error importing data:', error));