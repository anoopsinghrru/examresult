const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const AnswerKey = require('../models/AnswerKey');
const Config = require('../models/Config');
const { validateStudentAuth, handleValidationErrors } = require('../middleware/validate');
const { getScoreBreakdown } = require('../utils/scoreCalculator');

// Home page - Student authentication form
router.get('/', (req, res) => {
  const errors = req.session.errors || [];
  req.session.errors = null;
  res.render('index', { errors });
});

// Handle student authentication and display results
router.post('/view', validateStudentAuth, handleValidationErrors, async (req, res) => {
  try {
    const { rollNo, dob, mobile } = req.body;
    
    console.log('Student authentication attempt:', { rollNo: rollNo?.toUpperCase(), hasDob: !!dob, hasMobile: !!mobile });
    
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
      isAuthenticated = student.mobile === mobile;
      console.log('Mobile authentication:', { inputMobile: mobile, studentMobile: student.mobile, isAuthenticated });
    }
    
    if (!isAuthenticated) {
      console.log('Authentication failed for student:', rollNo?.toUpperCase());
      req.session.errors = [{ msg: 'Please check your details and try again.' }];
      return res.redirect('/');
    }
    
    console.log('Student authenticated successfully:', rollNo?.toUpperCase());
    
    // Check data existence first
    const hasOMR = student.omrImageUrl && student.omrImageUrl.trim() !== '';
    const hasResults = student.results && student.results.finalScore !== undefined;
    
    // If no data exists at all, deny login
    if (!hasOMR && !hasResults) {
      console.log('No data available for student:', rollNo?.toUpperCase());
      req.session.errors = [{ msg: 'No data available for your roll number. Please contact the administration or check back later.' }];
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