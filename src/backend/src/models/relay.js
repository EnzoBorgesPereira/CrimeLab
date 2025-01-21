const mongoose = require('mongoose');

const relaySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
}, { timestamps: true });

relaySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Relay', relaySchema);