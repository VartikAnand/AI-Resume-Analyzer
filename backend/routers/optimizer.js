// // routers/optimizer.js
// // Resume optimization and rewriting routes

// const express = require('express');
// const { body, validationResult } = require('express-validator');
// const { requireAuth } = require('../core/security');
// const { Analysis } = require('../models/analysis');
// const { OptimizedResume } = require('../models/optimized_resume');
// const { UsageLimit } = require('../models/usage_limit');
// const claudeAI = require('../services/claudeAI');

// const router = express.Router();

// // POST /api/optimizer/rewrite
// router.post('/rewrite', requireAuth, [
//   body('analysis_id').notEmpty().withMessage('analysis_id is required'),
//   body('experience_text').notEmpty().withMessage('experience_text is required')
// ], async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ detail: errors.array()[0].msg });
//   }

//   const { analysis_id, experience_text } = req.body;

//   try {
//     // Check usage limits
//     const usage = await UsageLimit.findOne({ where: { user_id: req.user.id } });

//     if (!usage || !usage.canRewrite()) {
//       return res.status(403).json({
//         detail: `Rewrite limit reached. Used ${usage?.rewrites_used}/${usage?.rewrites_limit}.`
//       });
//     }

//     // Get analysis (for job description and keywords)
//     const analysis = await Analysis.findOne({
//       where: { id: analysis_id, user_id: req.user.id }
//     });

//     if (!analysis) {
//       return res.status(404).json({ detail: 'Analysis not found' });
//     }

//     // Rewrite using Claude
//     const rewritten = await claudeAI.rewriteExperience(
//       experience_text,
//       analysis.job_description,
//       analysis.missing_keywords || []
//     );

//     // Save optimized resume
//     const optimized = await OptimizedResume.create({
//       analysis_id: analysis.id,
//       user_id: req.user.id,
//       content: { experience: rewritten },
//       formatted_text: rewritten,
//       version: 'A'
//     });

//     // Increment usage
//     await usage.increment('rewrites_used');

//     res.json({
//       success: true,
//       data: {
//         optimized_id: optimized.id,
//         original: experience_text,
//         rewritten,
//         keywords_integrated: (analysis.missing_keywords || []).slice(0, 5),
//         usage: {
//           rewrites_used: usage.rewrites_used + 1,
//           rewrites_remaining: usage.rewrites_limit - usage.rewrites_used - 1
//         }
//       }
//     });

//   } catch (err) {
//     console.error('Rewrite error:', err);
//     res.status(500).json({ detail: `Rewrite failed: ${err.message}` });
//   }
// });

// // GET /api/optimizer/:id
// router.get('/:id', requireAuth, async (req, res) => {
//   try {
//     const optimized = await OptimizedResume.findOne({
//       where: { id: req.params.id, user_id: req.user.id }
//     });

//     if (!optimized) {
//       return res.status(404).json({ detail: 'Optimized resume not found' });
//     }

//     res.json({
//       success: true,
//       data: {
//         id: optimized.id,
//         content: optimized.content,
//         formatted_text: optimized.formatted_text,
//         version: optimized.version,
//         created_at: optimized.created_at
//       }
//     });
//   } catch (err) {
//     res.status(500).json({ detail: 'Failed to load optimized resume' });
//   }
// });

// module.exports = router;


// routers/optimizer.js
// Resume optimization and rewriting routes

const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../core/security');
const { Analysis } = require('../models/analysis');
const { OptimizedResume } = require('../models/optimized_resume');
const { UsageLimit } = require('../models/usage_limit');
const aiService = require('../services/Aiservice');

const router = express.Router();

// POST /api/optimizer/rewrite
router.post('/rewrite', requireAuth, [
  body('analysis_id').notEmpty().withMessage('analysis_id is required'),
  body('experience_text').notEmpty().withMessage('experience_text is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ detail: errors.array()[0].msg });
  }

  const { analysis_id, experience_text } = req.body;

  try {
    // Check usage limits
    const usage = await UsageLimit.findOne({ where: { user_id: req.user.id } });

    if (!usage || !usage.canRewrite()) {
      return res.status(403).json({
        detail: `Rewrite limit reached. Used ${usage?.rewrites_used}/${usage?.rewrites_limit}.`
      });
    }

    // Get analysis (for job description and keywords)
    const analysis = await Analysis.findOne({
      where: { id: analysis_id, user_id: req.user.id }
    });

    if (!analysis) {
      return res.status(404).json({ detail: 'Analysis not found' });
    }

    // Rewrite using Claude
    const rewritten = await aiService.rewriteExperience(
      experience_text,
      analysis.job_description,
      analysis.missing_keywords || []
    );

    // Save optimized resume
    const optimized = await OptimizedResume.create({
      analysis_id: analysis.id,
      user_id: req.user.id,
      content: { experience: rewritten },
      formatted_text: rewritten,
      version: 'A'
    });

    // Increment usage
    await usage.increment('rewrites_used');

    res.json({
      success: true,
      data: {
        optimized_id: optimized.id,
        original: experience_text,
        rewritten,
        keywords_integrated: (analysis.missing_keywords || []).slice(0, 5),
        usage: {
          rewrites_used: usage.rewrites_used + 1,
          rewrites_remaining: usage.rewrites_limit - usage.rewrites_used - 1
        }
      }
    });

  } catch (err) {
    console.error('Rewrite error:', err);
    res.status(500).json({ detail: `Rewrite failed: ${err.message}` });
  }
});

// GET /api/optimizer/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const optimized = await OptimizedResume.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!optimized) {
      return res.status(404).json({ detail: 'Optimized resume not found' });
    }

    res.json({
      success: true,
      data: {
        id: optimized.id,
        content: optimized.content,
        formatted_text: optimized.formatted_text,
        version: optimized.version,
        created_at: optimized.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ detail: 'Failed to load optimized resume' });
  }
});

module.exports = router;