const mongoose = require('mongoose');

const answerKeySchema = new mongoose.Schema({
  postType: {
    type: String,
    required: true,
    enum: ['DCO', 'FCD', 'LFM', 'DFO', 'SFO', 'WLO']
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AnswerKey', answerKeySchema);