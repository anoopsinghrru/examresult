const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  mobile: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Mobile number must be exactly 10 digits'
    }
  },
  postApplied: {
    type: String,
    required: true,
    enum: ['DCO', 'FCD', 'LFM', 'DFO', 'SFO', 'WLO'],
    trim: true
  },
  omrImageUrl: {
    type: String,
    default: ''
  },
  results: {
    correctAnswers: {
      type: Number
    },
    wrongAnswers: {
      type: Number
    },
    unattempted: {
      type: Number
    },
    finalScore: {
      type: Number
    },
    totalQuestions: {
      type: Number
    },
    percentage: {
      type: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
studentSchema.index({ rollNo: 1 });

module.exports = mongoose.model('Student', studentSchema);