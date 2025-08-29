const { body, validationResult } = require('express-validator');

// 🛡️ Enhanced validation rules for student authentication with NoSQL injection prevention
const validateStudentAuth = [
  body('rollNo')
    .notEmpty()
    .withMessage('Roll number is required')
    .trim()
    .escape()
    .isLength({ max: 20 })
    .withMessage('Roll number too long')
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('Roll number contains invalid characters')
    .custom((value) => {
      // Additional NoSQL injection prevention
      const dangerousPatterns = [
        /\$where/i, /\$ne/i, /\$gt/i, /\$lt/i, /\$in/i, /\$nin/i,
        /\$regex/i, /\$exists/i, /\$or/i, /\$and/i, /javascript:/i
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(value))) {
        throw new Error('Invalid characters detected in roll number');
      }
      return true;
    }),
  body('dob')
    .optional()
    .custom((value) => {
      if (value) {
        // Handle both YYYY-MM-DD (HTML5 date input) and DD/MM/YYYY formats
        let day, month, year;
        
        if (value.includes('-')) {
          // YYYY-MM-DD format from HTML5 date input
          const parts = value.split('-');
          if (parts.length === 3) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
          } else {
            throw new Error('Invalid date format');
          }
        } else if (value.includes('/')) {
          // DD/MM/YYYY format
          const parts = value.split('/');
          if (parts.length === 3) {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
          } else {
            throw new Error('Invalid date format');
          }
        } else {
          throw new Error('Invalid date format');
        }
        
        // Validate date components
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
          throw new Error('Please enter a valid date of birth');
        }
        
        // Validate that it's not a future date
        const inputDate = new Date(year, month - 1, day);
        const today = new Date();
        if (inputDate > today) {
          throw new Error('Date of birth cannot be in the future');
        }
      }
      return true;
    }),
  body('mobile')
    .optional()
    .custom((value) => {
      if (value) {
        // Clean mobile number (remove any non-digits) for validation
        const cleanMobile = value.replace(/\D/g, '');
        
        // Validate mobile number (10 digits)
        if (!/^\d{10}$/.test(cleanMobile)) {
          throw new Error('Mobile number must be exactly 10 digits');
        }
        
        // Update the value with cleaned version
        return cleanMobile;
      }
      return true;
    })
    .customSanitizer((value) => {
      // Clean mobile number in sanitizer as well
      return value ? value.replace(/\D/g, '') : value;
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

// 🛡️ Enhanced validation rules for admin login with security hardening
const validateAdminLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim()
    .escape()
    .isLength({ max: 50 })
    .withMessage('Username too long')
    .matches(/^[A-Za-z0-9_]+$/)
    .withMessage('Username contains invalid characters')
    .custom((value) => {
      // Prevent NoSQL injection in username
      const dangerousPatterns = [
        /\$where/i, /\$ne/i, /\$gt/i, /\$lt/i, /\$in/i, /\$nin/i,
        /\$regex/i, /\$exists/i, /\$or/i, /\$and/i, /javascript:/i,
        /<script/i, /eval\(/i, /function\(/i
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(value))) {
        throw new Error('Invalid characters detected in username');
      }
      return true;
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6-128 characters')
    .custom((value) => {
      // Basic password security check
      if (value.includes('<script') || value.includes('javascript:')) {
        throw new Error('Invalid characters in password');
      }
      return true;
    })
];

// 🛡️ Enhanced validation rules for adding student with comprehensive security
const validateStudent = [
  body('rollNo')
    .notEmpty()
    .withMessage('Roll number is required')
    .trim()
    .escape()
    .isLength({ max: 20 })
    .withMessage('Roll number too long')
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('Roll number contains invalid characters')
    .custom((value) => {
      // NoSQL injection prevention
      const dangerousPatterns = [
        /\$where/i, /\$ne/i, /\$gt/i, /\$lt/i, /\$in/i, /\$nin/i,
        /\$regex/i, /\$exists/i, /\$or/i, /\$and/i
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(value))) {
        throw new Error('Invalid characters detected in roll number');
      }
      return true;
    }),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Name too long')
    .matches(/^[A-Za-z\s.'-]+$/)
    .withMessage('Name contains invalid characters')
    .custom((value) => {
      // XSS and injection prevention in names
      const dangerousPatterns = [
        /<script/i, /javascript:/i, /vbscript:/i, /onload=/i, /onerror=/i,
        /\$where/i, /\$ne/i, /eval\(/i, /function\(/i
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(value))) {
        throw new Error('Invalid characters detected in name');
      }
      return true;
    }),
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

// 🛡️ Enhanced middleware to handle validation errors with security logging
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation failures for security monitoring
    console.warn(`🚨 Validation Error Detected:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: typeof err.value === 'string' ? err.value.substring(0, 50) : err.value
      })),
      timestamp: new Date().toISOString()
    });
    
    // Check for potential security threats in validation errors
    const securityThreats = errors.array().filter(error => 
      error.msg.includes('Invalid characters') || 
      error.msg.includes('injection') ||
      error.msg.includes('dangerous')
    );
    
    if (securityThreats.length > 0) {
      console.error(`🚨 SECURITY THREAT DETECTED:`, {
        ip: req.ip,
        threats: securityThreats,
        timestamp: new Date().toISOString()
      });
    }
    
    // For API requests, return JSON
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
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