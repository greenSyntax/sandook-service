const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  originalName: String,
  uploadedName: String,
  size: Number,
  mimeType: String,
  extension: String,
  encoding: String,
  uploadedAt: { type: Date, default: Date.now },
  gps: {
    latitude: Number,
    longitude: Number
  }
});

module.exports = mongoose.model('Photo', photoSchema);