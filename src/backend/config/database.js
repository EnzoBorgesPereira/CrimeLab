const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // URL MongoDB
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB connecté : ${conn.connection.host}`);
    } catch (err) {
        console.error(`Erreur de connexion à MongoDB : ${err.message}`);
        process.exit(1); // Arrêt du serveur
    }
};

module.exports = connectDB;