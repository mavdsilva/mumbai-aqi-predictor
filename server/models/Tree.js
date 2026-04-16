const mongoose = require('mongoose');

const TreeSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  sponsorType: { type: String, enum: ['points', 'money'], required: true },
  sponsorName: { type: String, default: 'Anonymous' },
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tree', TreeSchema);
