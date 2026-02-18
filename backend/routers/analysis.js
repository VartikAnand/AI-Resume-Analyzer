// // routers/analysis.js
// // Resume analysis routes

// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { v4: uuidv4 } = require('uuid');
// const { validationResult } = require('express-validator');

// const config = require('../core/config');
// const { requireAuth } = require('../core/security');
// const { Resume } = require('../models/resume');
// const { Analysis } = require('../models/analysis');
// const { UsageLimit } = require('../models/usage_limit');
// const resumeParser = require('../services/resumeParser');
// const claudeAI = require('../services/claudeAI');
// const atsScanner = require('../services/atsScanner');
// const { analysisSchema } = require('../schemas/analysis');

// const router = express.Router();

// // Multer setup for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, config.UPLOAD_DIR),
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname).toLowerCase();
//     cb(null, `${uuidv4()}${ext}`);
//   }
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: config.MAX_FILE_SIZE },
//   fileFilter: (req, file, cb) => {
//     const ext = path.extname(file.originalname).toLowerCase();
//     if (config.ALLOWED_EXTENSIONS.includes(ext)) {
//       cb(null, true);
//     } else {
//       cb(new Error(`Unsupported file type. Allowed: ${config.ALLOWED_EXTENSIONS.join(', ')}`));
//     }
//   }
// });

// // POST /api/analysis/complete
// router.post('/complete', requireAuth, upload.single('resume'), analysisSchema, async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     if (req.file) fs.unlinkSync(req.file.path);
//     return res.status(400).json({ detail: errors.array()[0].msg });
//   }

//   if (!req.file) {
//     return res.status(400).json({ detail: 'Resume file is required' });
//   }

//   const filePath = req.file.path;
//   const { job_title, job_description, company_name } = req.body;

//   // Get API key from request body OR from .env
//   const apiKey = req.body.api_key || config.ANTHROPIC_API_KEY;

//   if (!apiKey) {
//     fs.unlinkSync(filePath);
//     return res.status(400).json({ detail: 'Anthropic API key is required. Enter it on the upload form.' });
//   }

//   try {
//     // Check usage limits
//     let usage = await UsageLimit.findOne({ where: { user_id: req.user.id } });
//     if (!usage) usage = await UsageLimit.create({ user_id: req.user.id });

//     if (!usage.canAnalyze()) {
//       fs.unlinkSync(filePath);
//       return res.status(403).json({
//         detail: `Analysis limit reached. Used ${usage.analyses_used}/${usage.analyses_limit}. Resets on ${usage.reset_date}`
//       });
//     }

//     // 1. Parse resume
//     const parsed = await resumeParser.parseFile(filePath);
//     const resumeText = parsed.raw_text;

//     // 2. Save resume to DB
//     const dbResume = await Resume.create({
//       user_id: req.user.id,
//       filename: req.file.originalname,
//       file_path: filePath,
//       file_type: path.extname(req.file.originalname).toLowerCase(),
//       parsed_text: resumeText,
//       metadata: parsed.metadata
//     });

//     // 3. Match score (pass apiKey)
//     const matchResult = await claudeAI.calculateMatchScore(resumeText, job_description, job_title, apiKey);

//     // 4. Missing keywords (pass apiKey)
//     const missingKeywords = await claudeAI.extractMissingKeywords(resumeText, job_description, 10, apiKey);

//     // 5. ATS scan
//     const atsResult = atsScanner.scanResume(filePath, resumeText);

//     // 6. Save analysis
//     const analysis = await Analysis.create({
//       user_id: req.user.id,
//       resume_id: dbResume.id,
//       job_title,
//       company_name: company_name || null,
//       job_description,
//       match_score: matchResult.match_score,
//       match_reasoning: matchResult.reasoning,
//       match_summary: matchResult.summary,
//       strengths: matchResult.strengths || [],
//       gaps: matchResult.gaps || [],
//       missing_keywords: missingKeywords,
//       ats_score: atsResult.compatibility_score,
//       ats_issues: atsResult.issues,
//       ats_warnings: atsResult.warnings,
//       ats_recommendations: atsResult.recommendations
//     });

//     // 7. Increment usage
//     await usage.increment('analyses_used');

//     res.json({
//       success: true,
//       data: {
//         analysis_id: analysis.id,
//         resume_filename: req.file.originalname,
//         job_title,
//         company_name: company_name || null,
//         match_score: {
//           score: matchResult.match_score,
//           out_of: 10,
//           percentage: matchResult.match_score * 10,
//           reasoning: matchResult.reasoning,
//           summary: matchResult.summary
//         },
//         strengths: matchResult.strengths || [],
//         gaps: matchResult.gaps || [],
//         missing_keywords: missingKeywords,
//         ats_compatibility: {
//           score: atsResult.compatibility_score,
//           total_issues: atsResult.total_issues,
//           total_warnings: atsResult.total_warnings,
//           issues: atsResult.issues,
//           warnings: atsResult.warnings,
//           recommendations: atsResult.recommendations
//         },
//         usage: {
//           analyses_used: usage.analyses_used + 1,
//           analyses_remaining: usage.analyses_limit - usage.analyses_used - 1
//         }
//       }
//     });

//   } catch (err) {
//     if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//     console.error('Analysis error:', err);
//     res.status(500).json({ detail: `Analysis failed: ${err.message}` });
//   }
// });

// // GET /api/analysis/history
// router.get('/history', requireAuth, async (req, res) => {
//   try {
//     const analyses = await Analysis.findAll({
//       where: { user_id: req.user.id },
//       order: [['created_at', 'DESC']],
//       attributes: ['id', 'job_title', 'company_name', 'match_score', 'created_at']
//     });

//     res.json({
//       success: true,
//       data: analyses.map(a => ({
//         id: a.id,
//         job_title: a.job_title,
//         company_name: a.company_name,
//         match_score: a.match_score,
//         created_at: a.created_at
//       }))
//     });
//   } catch (err) {
//     res.status(500).json({ detail: 'Failed to load history' });
//   }
// });

// // GET /api/analysis/:id
// router.get('/:id', requireAuth, async (req, res) => {
//   try {
//     const analysis = await Analysis.findOne({
//       where: { id: req.params.id, user_id: req.user.id }
//     });

//     if (!analysis) return res.status(404).json({ detail: 'Analysis not found' });

//     res.json({
//       success: true,
//       data: {
//         id: analysis.id,
//         job_title: analysis.job_title,
//         company_name: analysis.company_name,
//         match_score: {
//           score: analysis.match_score,
//           reasoning: analysis.match_reasoning,
//           summary: analysis.match_summary
//         },
//         strengths: analysis.strengths,
//         gaps: analysis.gaps,
//         missing_keywords: analysis.missing_keywords,
//         ats_compatibility: {
//           score: analysis.ats_score,
//           issues: analysis.ats_issues,
//           warnings: analysis.ats_warnings,
//           recommendations: analysis.ats_recommendations
//         },
//         created_at: analysis.created_at
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ detail: 'Failed to load analysis' });
//   }
// });

// module.exports = router;


// routers/analysis.js
// Resume analysis routes

// routers/analysis.js
// Resume analysis routes


// routers/analysis.js
// Resume analysis routes

// routers/analysis.js
// Resume analysis routes

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');

const config = require('../core/config');
const { requireAuth } = require('../core/security');
const { Resume } = require('../models/resume');
const { Analysis } = require('../models/analysis');
const { UsageLimit } = require('../models/usage_limit');
const resumeParser = require('../services/resumeParser');
const aiService = require('../services/aiService');
const atsScanner = require('../services/atsScanner');
const { analysisSchema } = require('../schemas/analysis');

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (config.ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Allowed: ${config.ALLOWED_EXTENSIONS.join(', ')}`));
    }
  }
});

// POST /api/analysis/complete
router.post('/complete', requireAuth, upload.single('resume'), analysisSchema, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ detail: errors.array()[0].msg });
  }

  if (!req.file) {
    return res.status(400).json({ detail: 'Resume file is required' });
  }

  const filePath = req.file.path;
  const { job_title, job_description, company_name } = req.body;


  try {
    // Check usage limits
    let usage = await UsageLimit.findOne({ where: { user_id: req.user.id } });
    if (!usage) usage = await UsageLimit.create({ user_id: req.user.id });

    if (!usage.canAnalyze()) {
      fs.unlinkSync(filePath);
      return res.status(403).json({
        detail: `Analysis limit reached. Used ${usage.analyses_used}/${usage.analyses_limit}. Resets on ${usage.reset_date}`
      });
    }

    // 1. Parse resume
    const parsed = await resumeParser.parseFile(filePath);
    const resumeText = parsed.raw_text;

    // 2. Save resume to DB
    const dbResume = await Resume.create({
      user_id: req.user.id,
      filename: req.file.originalname,
      file_path: filePath,
      file_type: path.extname(req.file.originalname).toLowerCase(),
      parsed_text: resumeText,
      metadata: parsed.metadata
    });

    // 3. Match score (pass apiKey)
    const matchResult = await aiService.calculateMatchScore(resumeText, job_description, job_title);

    // 4. Missing keywords (pass apiKey)
    const missingKeywords = await aiService.extractMissingKeywords(resumeText, job_description, 10);

    // 5. ATS scan
    const atsResult = atsScanner.scanResume(filePath, resumeText);

    // 6. Save analysis
    const analysis = await Analysis.create({
      user_id: req.user.id,
      resume_id: dbResume.id,
      job_title,
      company_name: company_name || null,
      job_description,
      match_score: matchResult.match_score,
      match_reasoning: matchResult.reasoning,
      match_summary: matchResult.summary,
      strengths: matchResult.strengths || [],
      gaps: matchResult.gaps || [],
      missing_keywords: missingKeywords,
      ats_score: atsResult.compatibility_score,
      ats_issues: atsResult.issues,
      ats_warnings: atsResult.warnings,
      ats_recommendations: atsResult.recommendations
    });

    // 7. Increment usage
    await usage.increment('analyses_used');

    res.json({
      success: true,
      data: {
        analysis_id: analysis.id,
        resume_filename: req.file.originalname,
        job_title,
        company_name: company_name || null,
        match_score: {
          score: matchResult.match_score,
          out_of: 10,
          percentage: matchResult.match_score * 10,
          reasoning: matchResult.reasoning,
          summary: matchResult.summary
        },
        strengths: matchResult.strengths || [],
        gaps: matchResult.gaps || [],
        missing_keywords: missingKeywords,
        ats_compatibility: {
          score: atsResult.compatibility_score,
          total_issues: atsResult.total_issues,
          total_warnings: atsResult.total_warnings,
          issues: atsResult.issues,
          warnings: atsResult.warnings,
          recommendations: atsResult.recommendations
        },
        usage: {
          analyses_used: usage.analyses_used + 1,
          analyses_remaining: usage.analyses_limit - usage.analyses_used - 1
        }
      }
    });

  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Analysis error:', err);
    res.status(500).json({ detail: `Analysis failed: ${err.message}` });
  }
});

// GET /api/analysis/history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const analyses = await Analysis.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'job_title', 'company_name', 'match_score', 'created_at']
    });

    res.json({
      success: true,
      data: analyses.map(a => ({
        id: a.id,
        job_title: a.job_title,
        company_name: a.company_name,
        match_score: a.match_score,
        created_at: a.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ detail: 'Failed to load history' });
  }
});

// GET /api/analysis/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!analysis) return res.status(404).json({ detail: 'Analysis not found' });

    res.json({
      success: true,
      data: {
        id: analysis.id,
        job_title: analysis.job_title,
        company_name: analysis.company_name,
        match_score: {
          score: analysis.match_score,
          reasoning: analysis.match_reasoning,
          summary: analysis.match_summary
        },
        strengths: analysis.strengths,
        gaps: analysis.gaps,
        missing_keywords: analysis.missing_keywords,
        ats_compatibility: {
          score: analysis.ats_score,
          issues: analysis.ats_issues,
          warnings: analysis.ats_warnings,
          recommendations: analysis.ats_recommendations
        },
        created_at: analysis.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ detail: 'Failed to load analysis' });
  }
});

module.exports = router;