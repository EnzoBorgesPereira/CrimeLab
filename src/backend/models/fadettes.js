const mongoose = require('mongoose');

const fadetteSchema = new mongoose.Schema({
    datetime: { type: Date, required: true },
    type: { type: String, enum: ['appel entrant', 'appel sortant', 'sms entrant', 'sms sortant'], required: true },
    duree: { type: Number, default: 0 }, 
    id_antenne_relais: { type: mongoose.Schema.Types.ObjectId, ref: 'Relay', required: true },
    source: { type: String, required: true }, 
    destination: { type: String, required: true }, 
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Individu', required: true }, 
}, { timestamps: true });

module.exports = mongoose.model('Fadette', fadetteSchema);