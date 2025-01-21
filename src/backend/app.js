const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Charger les variables d'environnement
dotenv.config();

// Connexion à MongoDB
connectDB();

const app = express();

app.use(express.json());


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});