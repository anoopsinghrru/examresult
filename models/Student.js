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
      validator: function (v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Mobile number must be exactly 10 digits'
    }
  },
  postApplied: {
    type: String,
    required: true,
    enum: ['DCP', 'DCO', 'FCD', 'LFM', 'DFO', 'SFO', 'WLO'],
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
      type: Number,
      required: function () { return this.results && (this.results.correctAnswers !== undefined || this.results.wrongAnswers !== undefined); }
    },
    totalQuestions: {
      type: Number,
      default: 100
    },
    percentage: {
      type: Number
    }
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
studentSchema.index({ rollNo: 1 });
studentSchema.index({ active: 1 });
studentSchema.index({ postApplied: 1, active: 1 });

module.exports = mongoose.model('Student', studentSchema);