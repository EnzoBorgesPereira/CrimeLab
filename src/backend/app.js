const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });

const express = require('express');
const connectDB = require('./config/database');
const { connectNeo4j } = require('./config/neo4j');

// Connect to databases
connectDB();
connectNeo4j();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});