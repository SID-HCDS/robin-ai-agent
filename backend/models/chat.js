// Simple Chat model (replace with DB code as needed)
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  message: { type: String, required: true },
  reply: { type: String, required: true },
  lang: { type: String },
  email: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
