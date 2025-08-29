const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const Student = require('../models/Student');
const AnswerKey = require('../models/AnswerKey');
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
    
    // Enhanced logging for mobile debugging
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    console.log('=== AUTHENTICATION DEBUG START ===');
    console.log('Raw Request Body:', req.body);
    console.log('Device Info:', { isMobile, userAgent: userAgent.substring(0, 100) });
    
    // Server-side date conversion from YYYY-MM-DD to DD/MM/YYYY
    if (dob && dob.includes('-')) {
      // HTML5 date input sends YYYY-MM-DD format
      const dateParts = dob.split('-');
      if (dateParts.length === 3) {
        dob = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // Convert to DD/MM/YYYY
        console.log('Server-side date conversion:', { original: req.body.dob, converted: dob });
      }
    }
    
    console.log('Final values:', { rollNo, dob, mobile });
    console.log('=== AUTHENTICATION DEBUG END ===');
    
    // Find student by roll number
    const student = await Student.findOne({ rollNo: rollNo.toUpperCase() });
    
    if (!student) {
      console.log('Student not found:', rollNo?.toUpperCase());
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
      console.log('DOB authentication:', { inputDate: inputDate.toDateString(), studentDob: studentDob.toDateString(), isAuthenticated });
    } else if (mobile) {
      // Clean mobile number for comparison (remove any non-digits)
      const cleanInputMobile = mobile.replace(/\D/g, '');
      const cleanStudentMobile = student.mobile.replace(/\D/g, '');
      isAuthenticated = cleanStudentMobile === cleanInputMobile;
      console.log('Mobile authentication:', { 
        inputMobile: mobile, 
        cleanInputMobile, 
        studentMobile: student.mobile, 
        cleanStudentMobile,
        isAuthenticated 
      });
    }
    
    if (!isAuthenticated) {
      console.log('Authentication failed for student:', rollNo?.toUpperCase());
      req.session.errors = [{ msg: 'Please check your details and try again.' }];
      return res.redirect('/');
    }
    
    console.log('Student authenticated successfully:', rollNo?.toUpperCase());
    
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
      console.log('No data available for student:', rollNo?.toUpperCase());
      req.session.errors = [{ msg: 'No data available for your roll number. Please contact the nearby municipality or check back later.' }];
      return res.redirect('/');
    }
    
    // Check public/private settings
    const omrPublicConfig = await Config.findOne({ key: 'omrPublic' });
    const resultsPublicConfig = await Config.findOne({ key: 'resultsPublic' });
    
    const isOmrPublic = omrPublicConfig ? omrPublicConfig.value : false;
    const isResultsPublic = resultsPublicConfig ? resultsPublicConfig.value : false;
    
    // Get score breakdown if results exist
    let scoreBreakdown = null;
    if (hasResults) {
      scoreBreakdown = getScoreBreakdown(student.results);
    }
    
    console.log('Rendering result page:', { hasOMR, hasResults, isOmrPublic, isResultsPublic });
    
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
    
    // Log access for audit
    console.log(`OMR access: ${requestedRollNo} at ${new Date().toISOString()}`);
    
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

// Debug endpoint to test form submission
router.post('/debug', (req, res) => {
  console.log('=== DEBUG ENDPOINT ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('User Agent:', req.get('User-Agent'));
  res.json({
    success: true,
    received: req.body,
    userAgent: req.get('User-Agent')
  });
});

// Public answer key page
router.get('/answer-key', async (req, res) => {
  try {
    const { post } = req.query;
    
    if (post && ['DCO', 'FCD', 'LFM', 'DFO', 'SFO', 'WLO'].includes(post)) {
      // Get answer key for specific post
      const answerKey = await AnswerKey.findOne({ postType: post, isPublished: true });
      res.render('answer-key', { answerKey, post, answerKeys: null });
    } else {
      // Get all published answer keys
      const answerKeys = await AnswerKey.find({ isPublished: true }).sort({ postType: 1 });
      res.render('answer-key', { answerKeys, answerKey: null, post: null });
    }
  } catch (error) {
    console.error('Answer key fetch error:', error);
    res.render('answer-key', { answerKey: null, answerKeys: null, post: null });
  }
});

module.exports = router;