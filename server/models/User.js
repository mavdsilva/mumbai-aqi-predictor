const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // We'll just use a 'demo-user' ID
  carbonPoints: { type: Number, default: 0 },
  actionHistory: [{
    action: String,    // e.g., 'Walked 5km', 'Planted Tree'
    points: Number,    // Positive for earned, negative for spent
    timestamp: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('User', UserSchema);
