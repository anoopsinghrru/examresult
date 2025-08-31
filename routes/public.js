const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const Student = require('../models/Student');
const AnswerKey = require('../models/AnswerKey');
const ObjectionDocument = require('../models/ObjectionDocument');
const Config = require('../models/Config');
const { validateStudentAuth, handleValidationErrors } = require('../middleware/validate');
const { getScoreBreakdown } = require('../utils/scoreCalculator');

// Rate limiting for OMR access
const omrRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 OMR requests per windowMs
  message: { error: 'Too many OMR access attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Home page - Student authentication form
router.get('/', (req, res) => {
  // Clear any existing authentication session when returning to home
  req.session.authenticatedStudent = null;
  
  const errors = req.session.errors || [];
  req.session.errors = null;
  res.render('index', { errors });
});

// Handle student authentication and display results
router.post('/view', validateStudentAuth, handleValidationErrors, async (req, res) => {
  try {
    let { rollNo, dob, mobile } = req.body;
    
    // Server-side date conversion from YYYY-MM-DD to DD/MM/YYYY
    if (dob && dob.includes('-')) {
      // HTML5 date input sends YYYY-MM-DD format
      const dateParts = dob.split('-');
      if (dateParts.length === 3) {
        dob = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // Convert to DD/MM/YYYY
      }
    }
    
    // Find student by roll number
    const student = await Student.findOne({ rollNo: rollNo.toUpperCase() });
    
    if (!student) {
      req.session.errors = [{ msg: 'Please check your details and try again.' }];
      return res.redirect('/');
    }
    
    // Verify authentication - prioritize DOB if both are provided
    let isAuthenticated = false;
    
    if (dob) {
      // Convert DD/MM/YYYY to Date object
      const parts = dob.split('/');
      const inputDate = new Date(parts[2], parts[1] - 1, parts[0]); // Year, Month (0-indexed), Day
      const studentDob = new Date(student.dob);
      isAuthenticated = inputDate.toDateString() === studentDob.toDateString();
    } else if (mobile) {
      // Clean mobile number for comparison (remove any non-digits)
      const cleanInputMobile = mobile.replace(/\D/g, '');
      const cleanStudentMobile = student.mobile.replace(/\D/g, '');
      isAuthenticated = cleanStudentMobile === cleanInputMobile;
    }
    
    if (!isAuthenticated) {
      req.session.errors = [{ msg: 'Please check your details and try again.' }];
      return res.redirect('/');
    }
    
    // Store authenticated student in session for secure file access
    req.session.authenticatedStudent = {
      rollNo: student.rollNo,
      name: student.name,
      authenticatedAt: new Date()
    };
    
    // Check data existence first
    const hasOMR = student.omrImageUrl && student.omrImageUrl.trim() !== '';
    const hasResults = student.results && student.results.finalScore !== undefined;
    
    // If no data exists at all, deny login
    if (!hasOMR && !hasResults) {
      req.session.errors = [{ msg: 'No data available for your roll number. Please contact the nearby municipality or check back later.' }];
      return res.redirect('/');
    }
    
    // Check public/private settings
    const omrPublicConfig = await Config.findOne({ key: 'omrPublic' });
    const resultsPublicConfig = await Config.findOne({ key: 'resultsPublic' });
    
    const isOmrPublic = omrPublicConfig ? omrPublicConfig.value : false;
    const isResultsPublic = resultsPublicConfig ? resultsPublicConfig.value : false;
    
    // If data exists but nothing is public, deny login
    const hasPublicOMR = hasOMR && isOmrPublic;
    const hasPublicResults = hasResults && isResultsPublic;
    
    if (!hasPublicOMR && !hasPublicResults) {
      req.session.errors = [{ msg: 'No data available for your roll number. Please contact the nearby municipality or check back later.' }];
      return res.redirect('/');
    }
    
    // Get score breakdown if results exist
    let scoreBreakdown = null;
    if (hasResults) {
      scoreBreakdown = getScoreBreakdown(student.results);
    }
    
    res.render('result', {
      student,
      isOmrPublic,
      isResultsPublic,
      hasOMR,
      hasResults,
      scoreBreakdown
    });
    
  } catch (error) {
    console.error('Authentication error:', error);
    req.session.errors = [{ msg: 'An error occurred while processing your request. Please try again.' }];
    res.redirect('/');
  }
});

// Secure OMR image serving - requires student authentication
router.get('/secure/omr/:rollNo', omrRateLimit, async (req, res) => {
  try {
    const requestedRollNo = req.params.rollNo.toUpperCase();
    
    // Check if student is authenticated in session
    if (!req.session.authenticatedStudent || 
        req.session.authenticatedStudent.rollNo !== requestedRollNo) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    // Find the student to get their OMR file path
    const student = await Student.findOne({ rollNo: requestedRollNo });
    if (!student || !student.omrImageUrl) {
      return res.status(404).json({ error: 'OMR image not found' });
    }
    
    // Check if OMR is public
    const omrPublicConfig = await Config.findOne({ key: 'omrPublic' });
    const isOmrPublic = omrPublicConfig ? omrPublicConfig.value : false;
    
    if (!isOmrPublic) {
      return res.status(403).json({ error: 'OMR access is currently disabled' });
    }
    
    // Construct file path
    const filePath = path.join(__dirname, '..', student.omrImageUrl.replace(/^\//, ''));
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'OMR file not found on server' });
    }
    
    // Serve the file
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Secure OMR access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Student logout route
router.get('/logout', (req, res) => {
  req.session.authenticatedStudent = null;
  res.redirect('/');
});



// Public answer key page
router.get('/answer-key', async (req, res) => {
  try {
    const { post } = req.query;
    
    // Get objection documents
    const objectionDocs = await ObjectionDocument.find({ isActive: true }).sort({ documentType: 1 });
    
    if (post && ['DCP', 'FCD', 'LFM', 'DFO', 'SFO', 'WLO'].includes(post)) {
      // Get answer key for specific post
      const answerKey = await AnswerKey.findOne({ postType: post, isPublished: true });
      res.render('answer-key', { answerKey, post, answerKeys: null, objectionDocs });
    } else {
      // Get all published answer keys
      const answerKeys = await AnswerKey.find({ isPublished: true }).sort({ postType: 1 });
      res.render('answer-key', { answerKeys, answerKey: null, post: null, objectionDocs });
    }
  } catch (error) {
    console.error('Answer key fetch error:', error);
    res.render('answer-key', { answerKey: null, answerKeys: null, post: null, objectionDocs: [] });
  }
});

module.exports = router;