const mongoose = require('mongoose');

const fadetteSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    time: { type: String, required: true },
    type: { type: String, enum: ['appel', 'sms'], required: true },
    direction: { type: String, enum: ['entrant', 'sortant'], required: true },
    duration: { type: Number }, 
    relayId: { type: String, required: true }, 
    source: { type: String, required: true }, 
    destination: { type: String, required: true }, 
}, { timestamps: true });

module.exports = mongoose.model('Fadette', fadetteSchema);