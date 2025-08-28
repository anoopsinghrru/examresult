const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
require('dotenv').config();

const app = express();

// Trust proxy for production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 🛡️ HELMET SECURITY HEADERS - XSS & Clickjacking Protection
app.use(helmet({
  // Content Security Policy - Prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Required for Bootstrap inline styles
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", // Required for inline scripts in EJS templates
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: [
        "'self'", 
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"], // Prevents clickjacking
      objectSrc: ["'none'"], // Prevents object/embed attacks
      mediaSrc: ["'self'"],
      formAction: ["'self'"] // Prevents form hijacking
    }
  },
  // Cross-Origin Embedder Policy (disabled for file uploads)
  crossOriginEmbedderPolicy: false,
  // HTTP Strict Transport Security - Forces HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  // X-Frame-Options - Prevents clickjacking
  frameguard: { action: 'deny' },
  // X-Content-Type-Options - Prevents MIME sniffing
  noSniff: true,
  // X-XSS-Protection - XSS filter
  xssFilter: true,
  // Referrer Policy - Controls referrer information
  referrerPolicy: { policy: 'same-origin' }
}));

// 🛡️ MONGODB SANITIZATION - NoSQL Injection Prevention
app.use(mongoSanitize({
  replaceWith: '_', // Replace dangerous characters with underscore
  onSanitize: ({ req, key }) => {
    // Log sanitization attempts for security monitoring
    console.warn(`🚨 NoSQL Injection Attempt Blocked:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      sanitizedKey: key,
      timestamp: new Date().toISOString()
    });
  }
}));

// Enhanced rate limiting with different limits for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 100, // Stricter in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip successful requests to reduce false positives
  skipSuccessfulRequests: true,
  // Custom key generator for better IP tracking
  keyGenerator: (req) => {
    return req.ip;
  }
});

app.use(limiter);
// Body parsing with size limits to prevent DoS attacks
app.use(express.json({ 
  limit: '10mb',
  // Additional security for JSON parsing
  verify: (req, res, buf) => {
    // Log large payloads for monitoring
    if (buf.length > 1024 * 1024) { // 1MB
      console.warn(`🚨 Large JSON payload detected:`, {
        ip: req.ip,
        size: buf.length,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  // Prevent parameter pollution
  parameterLimit: 100
}));
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files statically (excluding sensitive OMR files)
app.use('/uploads/answer-keys', express.static(path.join(__dirname, 'uploads/answer-keys')));
app.use('/uploads/temp', express.static(path.join(__dirname, 'uploads/temp')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb:/examresult:Dca@240031101631008@/127.0.0.1:27017/examresult',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY !== 'false',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb:/examresult:Dca@240031101631008@/127.0.0.1:27017/examresult')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    error: {}
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});

module.exports = app;
