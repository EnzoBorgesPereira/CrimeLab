const mongoose = require('mongoose');

const individuSchema = new mongoose.Schema({
    fullName: { type: String, required: true }, 
    birthDate: { type: Date }, // Date de naissance
    phoneNumbers: [{ type: String, required: true }], 
    address: { type: String }, // Adresse connue de l'individu
    role: { type: String, enum: ['suspect', 'témoin', 'victime', 'autre'], required: true }, // Statut dans une affaire
    cases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Affaire' }], // Liste des affaires où l'individu est impliqué
    fadettes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fadette' }], // Fadettes liées à l'individu
    knownAssociates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Individu' }], // Relations connues avec d'autres individus
}, { timestamps: true });

module.exports = mongoose.model('Individu', individuSchema);