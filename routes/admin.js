const express = require('express');
const router = express.Router();
const multer = require('multer');
const AdmZip = require('adm-zip');
const xlsx = require('xlsx');

const fs = require('fs');
const path = require('path');

const Admin = require('../models/Admin');
const Student = require('../models/Student');
const AnswerKey = require('../models/AnswerKey');
const ObjectionDocument = require('../models/ObjectionDocument');
const Config = require('../models/Config');
const { requireAuth, redirectIfAuth } = require('../middleware/auth');
const { validateAdminLogin, validateStudent, handleValidationErrors } = require('../middleware/validate');
const { createResults, validateResultData, getScoreBreakdown } = require('../utils/scoreCalculator');



// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = 'uploads/';

    // Create specific folders for different file types
    if (file.fieldname === 'omrFile' || file.fieldname === 'zipFile') {
      uploadDir = 'uploads/omr/';
    } else if (file.fieldname === 'answerKeyFile') {
      uploadDir = 'uploads/answer-keys/';
    } else if (file.fieldname === 'objectionFile') {
      uploadDir = 'uploads/objection-docs/';
    } else if (file.fieldname === 'excelFile') {
      uploadDir = 'uploads/temp/';
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);

    if (file.fieldname === 'omrFile') {
      // For individual OMR files, use roll number if available
      const rollNo = req.body.rollNo || 'unknown';
      cb(null, `omr_${rollNo}_${timestamp}${extension}`);
    } else if (file.fieldname === 'answerKeyFile') {
      cb(null, `answer_key_${timestamp}${extension}`);
    } else if (file.fieldname === 'objectionFile') {
      cb(null, `objection_${timestamp}${extension}`);
    } else {
      cb(null, `${timestamp}_${file.originalname}`);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 250 * 1024 * 1024 // 250MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'zipFile') {
      if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
        cb(null, true);
      } else {
        cb(new Error('Only ZIP files are allowed for OMR upload'));
      }
    } else if (file.fieldname === 'excelFile') {
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files are allowed'));
      }
    } else if (file.fieldname === 'answerKeyFile') {
      if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only image or PDF files are allowed for answer key'));
      }
    } else if (file.fieldname === 'objectionFile') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for objection documents'));
      }
    } else {
      cb(null, true);
    }
  }
});


// Admin login page
router.get('/login', redirectIfAuth, (req, res) => {
  const errors = req.session.errors || [];
  req.session.errors = null;
  res.render('admin/login', { errors });
});

// Handle admin login
router.post('/login', validateAdminLogin, handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin || !(await admin.comparePassword(password))) {
      req.session.errors = [{ msg: 'Invalid username or password' }];
      return res.redirect('/admin/login');
    }

    req.session.adminId = admin._id;
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    req.session.errors = [{ msg: 'An error occurred during login' }];
    res.redirect('/admin/login');
  }
});

// Admin dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    const answerKeys = await AnswerKey.find().sort({ uploadedAt: -1 });
    const objectionDocs = await ObjectionDocument.find().sort({ uploadedAt: -1 });
    const omrPublicConfig = await Config.findOne({ key: 'omrPublic' });
    const resultsPublicConfig = await Config.findOne({ key: 'resultsPublic' });
    const isOmrPublic = omrPublicConfig ? omrPublicConfig.value : false;
    const isResultsPublic = resultsPublicConfig ? resultsPublicConfig.value : false;

    // Calculate statistics
    const activeStudents = students.filter(s => s.active);
    const inactiveStudents = students.filter(s => !s.active);
    const studentsWithOMR = students.filter(s => s.omrImageUrl && s.omrImageUrl.trim()).length;
    const studentsWithResults = students.filter(s => s.results && typeof s.results === 'object' && s.results.finalScore !== undefined).length;

    // Group answer keys by post
    const answerKeysByPost = {};
    const posts = ['DCP', 'DCO', 'FCD', 'LFM', 'DFO', 'SFO', 'WLO'];
    posts.forEach(post => {
      answerKeysByPost[post] = answerKeys.find(ak => ak.postType === post) || null;
    });

    // Group objection documents by type
    const objectionDocsByType = {};
    objectionDocs.forEach(doc => {
      objectionDocsByType[doc.documentType] = doc;
    });

    // Calculate post-wise statistics
    const postStats = {};
    posts.forEach(post => {
      const postStudents = students.filter(s => s.postApplied === post);
      postStats[post] = {
        total: postStudents.length,
        withOMR: postStudents.filter(s => s.omrImageUrl && s.omrImageUrl.trim()).length,
        withResults: postStudents.filter(s => s.results && typeof s.results === 'object' && s.results.finalScore !== undefined).length
      };
    });

    const success = req.session.success || null;
    const errors = req.session.errors || [];
    req.session.success = null;
    req.session.errors = null;

    res.render('admin/dashboard', {
      students,
      activeStudents,
      inactiveStudents,
      answerKeys,
      answerKeysByPost,
      objectionDocs,
      objectionDocsByType,
      posts,
      postStats,
      isOmrPublic,
      isResultsPublic,
      studentsWithOMR,
      studentsWithResults,
      success,
      errors
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('admin/dashboard', {
      students: [],
      answerKeys: [],
      answerKeysByPost: {},
      objectionDocs: [],
      objectionDocsByType: {},
      posts: ['DCP', 'DCO', 'FCD', 'LFM', 'DFO', 'SFO', 'WLO'],
      postStats: {},
      isOmrPublic: false,
      isResultsPublic: false,
      studentsWithOMR: 0,
      studentsWithResults: 0,
      success: null,
      errors: [{ msg: 'Error loading dashboard' }]
    });
  }
});

// Add single student
router.post('/students', requireAuth, validateStudent, handleValidationErrors, async (req, res) => {
  try {
    const { rollNo, name, dob, mobile, postApplied } = req.body;

    const existingStudent = await Student.findOne({ rollNo: rollNo.toUpperCase() });
    if (existingStudent) {
      req.session.errors = [{ msg: 'Student with this roll number already exists' }];
      return res.redirect('/admin/dashboard');
    }

    // Convert DD/MM/YYYY to Date object
    const dobParts = dob.split('/');
    const dobDate = new Date(Date.UTC(parseInt(dobParts[2], 10), parseInt(dobParts[1], 10) - 1, parseInt(dobParts[0], 10))); // Year, Month (0-indexed), Day

    const student = new Student({
      rollNo: rollNo.toUpperCase(),
      name,
      dob: dobDate,
      mobile,
      postApplied
    });

    await student.save();
    req.session.success = 'Student added successfully';
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Add student error:', error);
    req.session.errors = [{ msg: 'Error adding student' }];
    res.redirect('/admin/dashboard');
  }
});

// Bulk add students via Excel
router.post('/students/bulk', requireAuth, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      req.session.errors = [{ msg: 'Please select an Excel file' }];
      return res.redirect('/admin/dashboard');
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const row of data) {
      try {
        // Validate required fields - support both rollNo and rollNo for backward compatibility
        const rollNumber = row.rollNo || row.rollNo;
        if (!rollNumber || !row.name || !row.dob || !row.mobile || !row.postApplied) {
          errors.push(`Row with roll number ${rollNumber || 'unknown'}: Missing required fields`);
          errorCount++;
          continue;
        }

        // Check if student already exists
        const existingStudent = await Student.findOne({ rollNo: rollNumber.toString().toUpperCase() });
        if (existingStudent) {
          errors.push(`Student with roll number ${rollNumber} already exists`);
          errorCount++;
          continue;
        }

        // Handle date format - could be DD/MM/YYYY, DD-MM-YYYY string or Excel date
        let dobDate;

        if (typeof row.dob === 'string' && row.dob.trim() && (row.dob.includes('/') || row.dob.includes('-'))) {
          // DD/MM/YYYY or DD-MM-YYYY format
          const dobParts = row.dob.includes('/') ? row.dob.split('/') : row.dob.split('-');

          if (dobParts.length === 3) {
            const day = parseInt(dobParts[0].trim(), 10);
            const month = parseInt(dobParts[1].trim(), 10);
            const year = parseInt(dobParts[2].trim(), 10);

            // Validate the parsed values
            if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
              day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
              // Use UTC to avoid timezone issues
              dobDate = new Date(Date.UTC(year, month - 1, day));

              // Double check the date is valid (handles invalid dates like Feb 30)
              if (dobDate.getUTCFullYear() === year && dobDate.getUTCMonth() === month - 1 && dobDate.getUTCDate() === day) {
                // Date is valid
              } else {
                throw new Error(`Invalid date for ${row.name}: ${row.dob}`);
              }
            } else {
              throw new Error(`Invalid date format for ${row.name}: ${row.dob}`);
            }
          } else {
            throw new Error(`Invalid date format for ${row.name}: ${row.dob} - expected DD/MM/YYYY or DD-MM-YYYY`);
          }
        } else if (row.dob) {
          // Excel date or other format
          if (typeof row.dob === 'number') {
            // Excel serial date number - use xlsx utility to convert
            dobDate = xlsx.SSF.parse_date_code(row.dob);
            dobDate = new Date(Date.UTC(dobDate.y, dobDate.m - 1, dobDate.d));
          } else {
            dobDate = new Date(row.dob);
          }

          if (isNaN(dobDate.getTime())) {
            throw new Error(`Invalid date for ${row.name}: ${row.dob}`);
          }
        } else {
          throw new Error(`Missing date of birth for ${row.name}`);
        }

        const student = new Student({
          rollNo: rollNumber.toString().toUpperCase(),
          name: row.name,
          dob: dobDate,
          mobile: row.mobile.toString(),
          postApplied: row.postApplied
        });

        await student.save();
        successCount++;
      } catch (error) {
        errors.push(`Error processing roll number ${rollNumber}: ${error.message}`);
        errorCount++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (successCount > 0) {
      req.session.success = `Successfully added ${successCount} students`;
    }
    if (errorCount > 0) {
      req.session.errors = errors.slice(0, 10); // Show first 10 errors
    }

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Bulk add students error:', error);
    req.session.errors = [{ msg: 'Error processing Excel file' }];
    res.redirect('/admin/dashboard');
  }
});

// Update student
router.put('/students/:rollNo', requireAuth, async (req, res) => {
  try {
    const { name, dob, mobile, postApplied } = req.body;
    const rollNo = req.params.rollNo.toUpperCase();

    // Convert DD/MM/YYYY to Date object
    const dobParts = dob.split('/');
    const dobDate = new Date(Date.UTC(parseInt(dobParts[2], 10), parseInt(dobParts[1], 10) - 1, parseInt(dobParts[0], 10)));

    const result = await Student.updateOne(
      { rollNo },
      {
        name,
        dob: dobDate,
        mobile,
        postApplied
      }
    );

    if (result.matchedCount > 0) {
      res.json({ success: true, message: 'Student updated successfully' });
    } else {
      res.json({ success: false, message: 'Student not found' });
    }
  } catch (error) {
    console.error('Update student error:', error);
    res.json({ success: false, message: 'Error updating student' });
  }
});

// Get individual student data
router.get('/students/:rollNo', requireAuth, async (req, res) => {
  try {
    const student = await Student.findOne({ rollNo: req.params.rollNo.toUpperCase() });
    if (student) {
      res.json({ success: true, student });
    } else {
      res.json({ success: false, message: 'Student not found' });
    }
  } catch (error) {
    console.error('Get student error:', error);
    res.json({ success: false, message: 'Error fetching student data' });
  }
});

// Get student results
router.get('/students/:rollNo/results', requireAuth, async (req, res) => {
  try {
    const student = await Student.findOne({ rollNo: req.params.rollNo.toUpperCase() });
    if (student && student.results && typeof student.results === 'object' && student.results.finalScore !== undefined) {
      const breakdown = getScoreBreakdown(student.results);
      res.json({ success: true, results: student.results, breakdown });
    } else {
      res.json({ success: false, message: 'No results found' });
    }
  } catch (error) {
    console.error('Get student results error:', error);
    res.json({ success: false, message: 'Error fetching results' });
  }
});

// Update results for single student
router.put('/students/:rollNo/results', requireAuth, async (req, res) => {
  try {
    const { correctAnswers, wrongAnswers, unattempted, finalScore, percentage } = req.body;
    const rollNo = req.params.rollNo.toUpperCase();

    const student = await Student.findOne({ rollNo });
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    // Validate input data
    const correct = parseInt(correctAnswers) || 0;
    const wrong = parseInt(wrongAnswers) || 0;
    const unatt = parseInt(unattempted) || 0;
    const score = parseFloat(finalScore);
    const percent = percentage ? parseFloat(percentage) : null;

    if (!validateResultData(correct, wrong, unatt, score)) {
      return res.json({ success: false, message: 'Invalid data: Answer counts must total 100 questions and final score is required' });
    }

    // Create results using utility function
    const results = createResults(correct, wrong, unatt, score, percent);
    student.results = results;

    await student.save();
    res.json({ success: true, message: 'Results updated successfully', results });
  } catch (error) {
    console.error('Update student results error:', error);
    res.json({ success: false, message: error.message || 'Error updating results' });
  }
});

// Delete results for single student
router.delete('/students/:rollNo/results', requireAuth, async (req, res) => {
  try {
    const rollNo = req.params.rollNo.toUpperCase();

    const student = await Student.findOne({ rollNo });
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    // Use $unset to completely remove the results field
    const updateResult = await Student.updateOne(
      { rollNo },
      { $unset: { results: 1 } }
    );

    res.json({ success: true, message: 'Results deleted successfully' });
  } catch (error) {
    console.error('Delete student results error:', error);
    res.json({ success: false, message: 'Error deleting results' });
  }
});

// Delete student
router.delete('/students/:rollNo', requireAuth, async (req, res) => {
  try {
    const result = await Student.deleteOne({ rollNo: req.params.rollNo.toUpperCase() });
    if (result.deletedCount > 0) {
      res.json({ success: true, message: 'Student deleted successfully' });
    } else {
      res.json({ success: false, message: 'Student not found' });
    }
  } catch (error) {
    console.error('Delete student error:', error);
    res.json({ success: false, message: 'Error deleting student' });
  }
});

// Upload single OMR sheet
router.post('/omr/single', requireAuth, upload.single('omrFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, message: 'Please select an OMR file' });
    }

    const { rollNo } = req.body;

    // Find student
    const student = await Student.findOne({ rollNo: rollNo.toUpperCase() });
    if (!student) {
      // Clean up uploaded file if student not found
      fs.unlinkSync(req.file.path);
      return res.json({ success: false, message: 'Student not found' });
    }

    // If student already has an OMR file, delete the old one
    if (student.omrImageUrl) {
      const oldFilePath = path.join(__dirname, '..', student.omrImageUrl.replace(/^\//, ''));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Create final filename with roll number
    const extension = path.extname(req.file.originalname);
    const finalFilename = `omr_${rollNo.toUpperCase()}${extension}`;
    const finalPath = path.join('uploads/omr', finalFilename);

    // Move file to final location with proper name
    fs.renameSync(req.file.path, finalPath);

    // Update student record with local file path
    student.omrImageUrl = `/uploads/omr/${finalFilename}`;
    await student.save();

    res.json({ success: true, message: 'OMR sheet uploaded successfully' });
  } catch (error) {
    console.error('Single OMR upload error:', error);
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.json({ success: false, message: 'Error uploading OMR sheet' });
  }
});

// Delete OMR sheet for a student
router.delete('/omr/:rollNo', requireAuth, async (req, res) => {
  try {
    const rollNo = req.params.rollNo.toUpperCase();

    // Find student
    const student = await Student.findOne({ rollNo });
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    if (!student.omrImageUrl) {
      return res.json({ success: false, message: 'No OMR sheet found for this student' });
    }

    // Delete the physical file
    const filePath = path.join(__dirname, '..', student.omrImageUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove OMR URL from student record
    student.omrImageUrl = '';
    await student.save();

    res.json({ success: true, message: 'OMR sheet deleted successfully' });
  } catch (error) {
    console.error('Delete OMR error:', error);
    res.json({ success: false, message: 'Error deleting OMR sheet' });
  }
});

// Upload OMR sheets in bulk via ZIP
router.post('/omr/bulk', requireAuth, upload.single('zipFile'), async (req, res) => {
  try {
    if (!req.file) {
      req.session.errors = [{ msg: 'Please select a ZIP file' }];
      return res.redirect('/admin/dashboard');
    }

    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const entry of zipEntries) {
      try {
        if (entry.isDirectory) continue;

        const fileName = entry.entryName;
        const fileNameWithoutExt = path.parse(fileName).name;
        let rollNo = fileNameWithoutExt.includes('_')
          ? fileNameWithoutExt.split('_').pop().toUpperCase()
          : fileNameWithoutExt.toUpperCase();

        // Map DCO001-DCO300 to DCP001-DCP300 - COMMENTED OUT since DCO is now a proper post type
        // if (rollNo.startsWith('DCO') && rollNo.length === 6) {
        //   const numberPart = rollNo.substring(3); // Get the number part (001-300)
        //   const num = parseInt(numberPart, 10);
        //   if (num >= 1 && num <= 300) {
        //     rollNo = 'DCP' + numberPart; // Replace DCO with DCP, keep the number part
        //   }
        // } 

        const fileExtension = path.parse(fileName).ext.toLowerCase();

        // Check if file is an image
        if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(fileExtension)) {
          errors.push(`${fileName}: Unsupported file format`);
          errorCount++;
          continue;
        }

        // Find student
        const student = await Student.findOne({ rollNo });
        if (!student) {
          errors.push(`${fileName}: No student found with roll number ${rollNo}`);
          errorCount++;
          continue;
        }

        // If student already has an OMR file, delete the old one
        if (student.omrImageUrl) {
          const oldFilePath = path.join(__dirname, '..', student.omrImageUrl.replace(/^\//, ''));
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

        // Extract file and save locally
        const fileBuffer = entry.getData();
        const finalFilename = `omr_${rollNo}${fileExtension}`;
        const finalPath = path.join('uploads/omr', finalFilename);

        // Write file to local storage
        fs.writeFileSync(finalPath, fileBuffer);

        // Update student record with local file path
        student.omrImageUrl = `/uploads/omr/${finalFilename}`;
        await student.save();

        successCount++;
      } catch (error) {
        errors.push(`${entry.entryName}: ${error.message}`);
        errorCount++;
      }
    }

    // Clean up uploaded ZIP file
    fs.unlinkSync(req.file.path);

    if (successCount > 0) {
      req.session.success = `Successfully uploaded ${successCount} OMR sheets`;
    }
    if (errorCount > 0) {
      req.session.errors = errors.slice(0, 10); // Show first 10 errors
    }

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('OMR bulk upload error:', error);
    req.session.errors = [{ msg: 'Error processing ZIP file' }];
    res.redirect('/admin/dashboard');
  }
});

// Toggle OMR public status
router.put('/omr/public', requireAuth, async (req, res) => {
  try {
    const { isPublic } = req.body;

    // Handle both boolean and string values
    const publicValue = isPublic === true || isPublic === 'true';

    await Config.findOneAndUpdate(
      { key: 'omrPublic' },
      { key: 'omrPublic', value: publicValue, updatedAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true, message: `OMR sheets are now ${publicValue ? 'public' : 'private'}` });
  } catch (error) {
    console.error('Toggle OMR public error:', error);
    res.json({ success: false, message: 'Error updating OMR public status' });
  }
});

// Toggle Results public status
router.put('/results/public', requireAuth, async (req, res) => {
  try {
    const { isPublic } = req.body;

    // Handle both boolean and string values
    const publicValue = isPublic === true || isPublic === 'true';

    await Config.findOneAndUpdate(
      { key: 'resultsPublic' },
      { key: 'resultsPublic', value: publicValue, updatedAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true, message: `Results are now ${publicValue ? 'public' : 'private'}` });
  } catch (error) {
    console.error('Toggle Results public error:', error);
    res.json({ success: false, message: 'Error updating Results public status' });
  }
});

// Upload answer key
router.post('/answer-key', requireAuth, upload.single('answerKeyFile'), async (req, res) => {
  try {
    if (!req.file) {
      req.session.errors = [{ msg: 'Please select an answer key file' }];
      return res.redirect('/admin/dashboard');
    }

    const { postType, publish } = req.body;

    if (!postType || !['DCP', 'DCO', 'FCD', 'LFM', 'DFO', 'SFO', 'WLO'].includes(postType)) {
      req.session.errors = [{ msg: 'Please select a valid post type' }];
      return res.redirect('/admin/dashboard');
    }

    // Keep the file in its uploaded location
    const relativePath = req.file.path.replace(/\\/g, '/'); // Normalize path separators
    const publicPath = `/${relativePath}`;

    // Check if answer key already exists for this post
    const existingAnswerKey = await AnswerKey.findOne({ postType });

    if (existingAnswerKey) {
      // Delete old file
      const oldFilePath = path.join(__dirname, '..', existingAnswerKey.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      // Update existing answer key
      existingAnswerKey.fileUrl = publicPath;
      existingAnswerKey.fileName = req.file.originalname;
      existingAnswerKey.isPublished = publish === 'true';
      existingAnswerKey.uploadedAt = new Date();
      await existingAnswerKey.save();
    } else {
      // Create new answer key
      const answerKey = new AnswerKey({
        postType,
        fileUrl: publicPath,
        fileName: req.file.originalname,
        isPublished: publish === 'true'
      });
      await answerKey.save();
    }

    req.session.success = `Answer key for ${postType} uploaded ${publish === 'true' ? 'and published' : 'successfully'}`;
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Answer key upload error:', error);
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    req.session.errors = [{ msg: 'Error uploading answer key' }];
    res.redirect('/admin/dashboard');
  }
});

// Toggle answer key publication
router.put('/answer-key/publish', requireAuth, async (req, res) => {
  try {
    const { isPublished, postType } = req.body;

    if (!postType) {
      return res.json({ success: false, message: 'Post type is required' });
    }

    const answerKey = await AnswerKey.findOne({ postType });
    if (!answerKey) {
      return res.json({ success: false, message: `No answer key found for ${postType}` });
    }

    answerKey.isPublished = isPublished === true || isPublished === 'true';
    await answerKey.save();

    const action = (isPublished === true || isPublished === 'true') ? 'published' : 'unpublished';
    res.json({ success: true, message: `Answer key for ${postType} ${action} successfully` });
  } catch (error) {
    console.error('Toggle answer key publication error:', error);
    res.json({ success: false, message: 'Error updating answer key publication status' });
  }
});

// Toggle all answer keys publication
router.put('/answer-key/publish-all', requireAuth, async (req, res) => {
  try {
    const { isPublished } = req.body;

    // Update all existing answer keys
    const result = await AnswerKey.updateMany({}, { isPublished: isPublished === true });

    const action = isPublished === true ? 'published' : 'unpublished';
    const message = result.modifiedCount > 0
      ? `${result.modifiedCount} answer key(s) ${action} successfully`
      : `No answer keys found to ${action.slice(0, -2)}`;

    res.json({ success: true, message });
  } catch (error) {
    console.error('Toggle all answer keys publication error:', error);
    res.json({ success: false, message: 'Error updating answer key publication status' });
  }
});

// Secure OMR access for admins
router.get('/secure/omr/:rollNo', requireAuth, async (req, res) => {
  try {
    const rollNo = req.params.rollNo.toUpperCase();

    // Find the student to get their OMR file path
    const student = await Student.findOne({ rollNo });
    if (!student || !student.omrImageUrl) {
      return res.status(404).json({ error: 'OMR image not found' });
    }

    // Construct file path
    const filePath = path.join(__dirname, '..', student.omrImageUrl.replace(/^\//, ''));

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'OMR file not found on server' });
    }

    console.log(`OMR access: ${rollNo} at ${new Date().toISOString()}`);

    // Serve the file
    res.sendFile(filePath);

  } catch (error) {
    console.error('Admin OMR access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete answer key
router.delete('/answer-key/delete', requireAuth, async (req, res) => {
  try {
    const { postType } = req.body;
    console.log('Delete answer key request:', { postType });

    if (!postType) {
      return res.json({ success: false, message: 'Post type is required' });
    }

    const answerKey = await AnswerKey.findOne({ postType });
    if (!answerKey) {
      return res.json({ success: false, message: `No answer key found for ${postType}` });
    }

    // Delete the file from filesystem
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', answerKey.fileUrl.replace(/^\//, ''));

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('File deleted:', filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await AnswerKey.deleteOne({ postType });

    res.json({ success: true, message: `Answer key for ${postType} deleted successfully` });
  } catch (error) {
    console.error('Delete answer key error:', error);
    res.json({ success: false, message: 'Error deleting answer key' });
  }
});

// Add results for single student
router.post('/results/single', requireAuth, async (req, res) => {
  try {
    const { rollNo, correctAnswers, wrongAnswers, unattempted, finalScore, percentage } = req.body;

    const student = await Student.findOne({ rollNo: rollNo.toUpperCase() });
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    // Validate input data
    const correct = parseInt(correctAnswers) || 0;
    const wrong = parseInt(wrongAnswers) || 0;
    const unatt = parseInt(unattempted) || 0;
    const score = parseFloat(finalScore);
    const percent = percentage ? parseFloat(percentage) : null;

    if (!validateResultData(correct, wrong, unatt, score)) {
      return res.json({ success: false, message: 'Invalid data: Answer counts must total 100 questions and final score is required' });
    }

    // Create results using utility function
    const results = createResults(correct, wrong, unatt, score, percent);
    student.results = results;

    await student.save();
    res.json({ success: true, message: 'Results added successfully', results });
  } catch (error) {
    console.error('Single results add error:', error);
    res.json({ success: false, message: error.message || 'Error adding results' });
  }
});

// Upload results in bulk via Excel
router.post('/results/bulk', requireAuth, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      req.session.errors = [{ msg: 'Please select an Excel file' }];
      return res.redirect('/admin/dashboard');
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const row of data) {
      try {
        // Handle both rollNo and rollNo column names for backward compatibility
        const rollNumber = row.rollNo || row.rollNo;
        if (!rollNumber) {
          errors.push('Missing roll number in row');
          errorCount++;
          continue;
        }

        const student = await Student.findOne({ rollNo: rollNumber.toString().toUpperCase() });
        if (!student) {
          errors.push(`No student found with roll number ${rollNumber}`);
          errorCount++;
          continue;
        }

        // Extract data from Excel (including final score and percentage)
        const correctAnswers = parseInt(row.correctAnswers) || 0;
        const wrongAnswers = parseInt(row.wrongAnswers) || 0;
        const unattempted = parseInt(row.unattempted) || 0;
        const finalScore = parseFloat(row.finalScore);
        const percentage = row.percentage ? parseFloat(row.percentage) : null;

        // Validate required data
        if (!validateResultData(correctAnswers, wrongAnswers, unattempted, finalScore)) {
          errors.push(`${rollNumber}: Invalid data - Answer counts must total 100 questions and final score is required (got ${correctAnswers + wrongAnswers + unattempted} answers, finalScore: ${finalScore})`);
          errorCount++;
          continue;
        }

        // Create results using utility function (no calculations)
        const results = createResults(correctAnswers, wrongAnswers, unattempted, finalScore, percentage);
        student.results = results;

        await student.save();
        successCount++;
      } catch (error) {
        errors.push(`Error processing roll number ${rollNumber}: ${error.message}`);
        errorCount++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (successCount > 0) {
      req.session.success = `Successfully updated results for ${successCount} students`;
    }
    if (errorCount > 0) {
      req.session.errors = errors.slice(0, 10); // Show first 10 errors
    }

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Bulk results upload error:', error);
    req.session.errors = [{ msg: 'Error processing results file' }];
    res.redirect('/admin/dashboard');
  }
});

// Upload objection document
router.post('/objection-docs', requireAuth, upload.single('objectionFile'), async (req, res) => {
  try {
    if (!req.file) {
      req.session.errors = [{ msg: 'Please select a PDF file' }];
      return res.redirect('/admin/dashboard');
    }

    const { documentType } = req.body;

    if (!documentType || !['guidelines', 'form'].includes(documentType)) {
      req.session.errors = [{ msg: 'Please select a valid document type' }];
      return res.redirect('/admin/dashboard');
    }

    // Keep the file in its uploaded location
    const relativePath = req.file.path.replace(/\\/g, '/'); // Normalize path separators
    const publicPath = `/${relativePath}`;

    // Check if document already exists for this type
    const existingDoc = await ObjectionDocument.findOne({ documentType });

    if (existingDoc) {
      // Delete old file
      const oldFilePath = path.join(__dirname, '..', existingDoc.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      // Update existing document
      existingDoc.fileUrl = publicPath;
      existingDoc.fileName = req.file.originalname;
      existingDoc.uploadedAt = new Date();
      await existingDoc.save();
    } else {
      // Create new document
      const objectionDoc = new ObjectionDocument({
        documentType,
        fileUrl: publicPath,
        fileName: req.file.originalname
      });
      await objectionDoc.save();
    }

    const docTypeName = documentType === 'guidelines' ? 'Guidelines' : 'Form';
    req.session.success = `Objection ${docTypeName} uploaded successfully`;
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Objection document upload error:', error);
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    req.session.errors = [{ msg: 'Error uploading objection document' }];
    res.redirect('/admin/dashboard');
  }
});

// Toggle objection document active status
router.put('/objection-docs/toggle', requireAuth, async (req, res) => {
  try {
    const { isActive, documentType } = req.body;

    if (!documentType) {
      return res.json({ success: false, message: 'Document type is required' });
    }

    const objectionDoc = await ObjectionDocument.findOne({ documentType });
    if (!objectionDoc) {
      return res.json({ success: false, message: `No ${documentType} document found` });
    }

    objectionDoc.isActive = isActive === true || isActive === 'true';
    await objectionDoc.save();

    const action = (isActive === true || isActive === 'true') ? 'activated' : 'deactivated';
    const docTypeName = documentType === 'guidelines' ? 'Guidelines' : 'Form';
    res.json({ success: true, message: `Objection ${docTypeName} ${action} successfully` });
  } catch (error) {
    console.error('Toggle objection document error:', error);
    res.json({ success: false, message: 'Error updating objection document status' });
  }
});

// Delete objection document
router.delete('/objection-docs/:documentType', requireAuth, async (req, res) => {
  try {
    const { documentType } = req.params;

    if (!['guidelines', 'form'].includes(documentType)) {
      return res.json({ success: false, message: 'Invalid document type' });
    }

    const objectionDoc = await ObjectionDocument.findOne({ documentType });
    if (!objectionDoc) {
      return res.json({ success: false, message: `No ${documentType} document found` });
    }

    // Delete the file from filesystem
    const filePath = path.join(__dirname, '..', objectionDoc.fileUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
      }
    }

    // Delete from database
    await ObjectionDocument.deleteOne({ documentType });

    const docTypeName = documentType === 'guidelines' ? 'Guidelines' : 'Form';
    res.json({ success: true, message: `Objection ${docTypeName} deleted successfully` });
  } catch (error) {
    console.error('Delete objection document error:', error);
    res.json({ success: false, message: 'Error deleting objection document' });
  }
});

// Bulk toggle students active status (must come before individual route)
router.put('/students/bulk/active', requireAuth, async (req, res) => {
  try {
    const { isActive, filter } = req.body;
    let query = {};

    // Apply filters
    if (filter.postApplied && filter.postApplied !== 'all') {
      query.postApplied = filter.postApplied;
    }

    if (filter.dateRange && filter.dateRange.start && filter.dateRange.end) {
      query.createdAt = {
        $gte: new Date(filter.dateRange.start),
        $lte: new Date(filter.dateRange.end)
      };
    }

    const result = await Student.updateMany(
      query,
      { active: isActive === true || isActive === 'true' }
    );

    const status = (isActive === true || isActive === 'true') ? 'activated' : 'deactivated';
    res.json({
      success: true,
      message: `${result.modifiedCount} students ${status} successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk toggle students active error:', error);
    res.json({ success: false, message: 'Error updating students status' });
  }
});

// Toggle student active status
router.put('/students/:rollNo/active', requireAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const rollNo = req.params.rollNo.toUpperCase();

    const result = await Student.updateOne(
      { rollNo },
      { active: isActive === true || isActive === 'true' }
    );

    if (result.matchedCount > 0) {
      const status = (isActive === true || isActive === 'true') ? 'activated' : 'deactivated';
      res.json({ success: true, message: `Student ${rollNo} ${status} successfully` });
    } else {
      res.json({ success: false, message: 'Student not found' });
    }
  } catch (error) {
    console.error('Toggle student active error:', error);
    res.json({ success: false, message: 'Error updating student status' });
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin/login');
  });
});

module.exports = router;