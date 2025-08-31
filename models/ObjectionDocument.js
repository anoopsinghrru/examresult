const mongoose = require('mongoose');

const objectionDocumentSchema = new mongoose.Schema({
  documentType: {
    type: String,
    required: true,
    enum: ['guidelines', 'form']
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ObjectionDocument', objectionDocumentSchema);