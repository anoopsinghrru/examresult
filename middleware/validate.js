const { body, validationResult } = require('express-validator');

// Validation rules for student authentication
const validateStudentAuth = [
  body('rollNo')
    .notEmpty()
    .withMessage('Roll number is required')
    .trim()
    .escape(),
  body('dob')
    .optional()
    .custom((value) => {
      if (value) {
        // Validate date format DD/MM/YYYY
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
          throw new Error('Date must be in DD/MM/YYYY format');
        }
        
        // Validate if it's a valid date
        const parts = value.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
          throw new Error('Please enter a valid date of birth');
        }
      }
      return true;
    }),
  body('mobile')
    .optional()
    .custom((value) => {
      if (value) {
        // Validate mobile number (10 digits)
        if (!/^\d{10}$/.test(value)) {
          throw new Error('Mobile number must be exactly 10 digits');
        }
      }
      return true;
    }),
  body()
    .custom((value, { req }) => {
      // At least one authentication method must be provided
      if (!req.body.dob && !req.body.mobile) {
        throw new Error('Please provide either date of birth or mobile number');
      }
      return true;
    })
];

// Validation rules for admin login
const validateAdminLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim()
    .escape(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Validation rules for adding student
const validateStudent = [
  body('rollNo')
    .notEmpty()
    .withMessage('Roll number is required')
    .trim()
    .escape(),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .escape(),
  body('dob')
    .custom((value) => {
      // Validate DD/MM/YYYY format
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        throw new Error('Date of birth must be in DD/MM/YYYY format');
      }
      
      // Validate if it's a valid date
      const parts = value.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
        throw new Error('Please enter a valid date of birth');
      }
      
      return true;
    }),
  body('mobile')
    .matches(/^\d{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),
  body('postApplied')
    .notEmpty()
    .withMessage('Post applied is required')
    .trim()
    .escape()
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // For API requests, return JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // For form submissions, flash errors and redirect
    req.session.errors = errors.array();
    return res.redirect('back');
  }
  next();
};

module.exports = {
  validateStudentAuth,
  validateAdminLogin,
  validateStudent,
  handleValidationErrors
};