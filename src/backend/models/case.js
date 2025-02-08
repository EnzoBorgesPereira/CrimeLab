const mongoose = require('mongoose');

const affaireSchema = new mongoose.Schema({
    caseId: { type: String, required: true, unique: true },
    title: { type: String, required: true }, 
    description: { type: String }, 
    dateOpened: { type: Date, required: true, default: Date.now }, 
    status: { type: String, enum: ['ouverte', 'en cours', 'fermée'], default: 'ouverte' }, 
    fadettes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Fadette' }], 
    suspects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Individu' }], 
    witnesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Individu' }], 
    locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Relay' }], 
}, { timestamps: true });

module.exports = mongoose.model('Affaire', affaireSchema);