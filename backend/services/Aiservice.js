// // services/claudeAI.js
// // All AI-powered operations using Anthropic Claude API
// // Accepts API key dynamically from request OR falls back to .env

// const Anthropic = require('@anthropic-ai/sdk');
// const config = require('../core/config');

// // Creates a client using the provided key or .env fallback
// function getClient(apiKey) {
//   const key = apiKey || config.ANTHROPIC_API_KEY;
//   if (!key) throw new Error('No Anthropic API key provided. Enter your key on the upload page.');
//   return new Anthropic({ apiKey: key });
// }

// // Calculate match score (1-10) with reasoning
// async function calculateMatchScore(resumeText, jobDescription, jobTitle, apiKey) {
//   const client = getClient(apiKey);

//   const prompt = `Analyze this resume against the job description and provide a match score.

// JOB TITLE: ${jobTitle}

// JOB DESCRIPTION:
// ${jobDescription}

// RESUME:
// ${resumeText}

// Respond ONLY with valid JSON (no markdown, no extra text):
// {
//   "match_score": <integer 1-10>,
//   "reasoning": "<detailed explanation>",
//   "summary": "<brief one-line assessment>",
//   "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
//   "gaps": ["<gap 1>", "<gap 2>", "<gap 3>"]
// }`;

//   const message = await client.messages.create({
//     model: config.ANTHROPIC_MODEL,
//     max_tokens: 1500,
//     messages: [{ role: 'user', content: prompt }]
//   });

//   try {
//     return JSON.parse(message.content[0].text);
//   } catch {
//     return {
//       match_score: 5,
//       reasoning: message.content[0].text,
//       summary: 'Analysis completed',
//       strengths: [],
//       gaps: []
//     };
//   }
// }

// // Extract top missing keywords
// async function extractMissingKeywords(resumeText, jobDescription, maxKeywords = 10, apiKey) {
//   const client = getClient(apiKey);

//   const prompt = `Find the top ${maxKeywords} most important keywords from the job description that are MISSING from the resume.

// JOB DESCRIPTION:
// ${jobDescription}

// RESUME:
// ${resumeText}

// Respond ONLY with a JSON array of strings (no markdown, no extra text):
// ["keyword1", "keyword2", ...]

// Focus on: technical skills, tools, certifications, required competencies.`;

//   const message = await client.messages.create({
//     model: config.ANTHROPIC_MODEL,
//     max_tokens: 400,
//     messages: [{ role: 'user', content: prompt }]
//   });

//   try {
//     const keywords = JSON.parse(message.content[0].text);
//     return keywords.slice(0, maxKeywords);
//   } catch {
//     const lines = message.content[0].text.split('\n');
//     return lines
//       .map(l => l.replace(/^[-"'\[\]•\d.]+/, '').trim())
//       .filter(Boolean)
//       .slice(0, maxKeywords);
//   }
// }

// // Rewrite experience section with achievement-based formatting
// async function rewriteExperience(experienceText, jobDescription, missingKeywords, apiKey) {
//   const client = getClient(apiKey);
//   const keywords = (missingKeywords || []).slice(0, 5).join(', ');

//   const prompt = `Rewrite this experience section using achievement-based formatting.

// ORIGINAL EXPERIENCE:
// ${experienceText}

// TARGET JOB DESCRIPTION:
// ${jobDescription}

// KEYWORDS TO INTEGRATE: ${keywords}

// Rules:
// - Use formula: "Achieved [result] by [action] resulting in [impact]"
// - Add 2-3 quantified achievements per role (use % or numbers)
// - Integrate keywords naturally
// - Use strong action verbs
// - Keep company names, dates, and job titles intact

// Write ONLY the rewritten experience section, no extra commentary:`;

//   const message = await client.messages.create({
//     model: config.ANTHROPIC_MODEL,
//     max_tokens: 2000,
//     messages: [{ role: 'user', content: prompt }]
//   });

//   return message.content[0].text.trim();
// }

// module.exports = { calculateMatchScore, extractMissingKeywords, rewriteExperience };

// services/aiService.js
// AI operations — works with ANY Anthropic API key and ANY model name
// Change MODEL_NAME below to switch models anytime

// ─────────────────────────────────────────────
//  CONFIGURE HERE — change model name freely
// ─────────────────────────────────────────────
// const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
// Other options:
// 'claude-opus-4-20250514'
// 'claude-haiku-4-20251001'
// 'claude-3-5-sonnet-20241022'
// 'claude-3-haiku-20240307'
// ─────────────────────────────────────────────

// const Anthropic = require('@anthropic-ai/sdk');

// Build a client from any key passed in


// services/aiService.js
// AI operations powered by Anthropic
// To change API key → update ANTHROPIC_API_KEY in .env
// To change model  → update DEFAULT_MODEL below

// services/aiService.js
// AI operations powered by Anthropic
// To change API key → update ANTHROPIC_API_KEY in .env
// To change model  → update DEFAULT_MODEL below

const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

// ─── Change model name here ───────────────────
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
// 'claude-opus-4-20250514'
// 'claude-haiku-4-20251001'
// 'claude-3-5-sonnet-20241022'
// ─────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.GEMINI_API_KEY });

async function calculateMatchScore(resumeText, jobDescription, jobTitle) {
  const prompt = `Analyze this resume against the job description and provide a match score.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "match_score": <integer 1-10>,
  "reasoning": "<detailed explanation>",
  "summary": "<brief one-line assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>", "<gap 3>"]
}`;

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    return JSON.parse(message.content[0].text);
  } catch {
    return {
      match_score: 5,
      reasoning: message.content[0].text,
      summary: 'Analysis completed',
      strengths: [],
      gaps: []
    };
  }
}

async function extractMissingKeywords(resumeText, jobDescription, maxKeywords = 10) {
  const prompt = `Find the top ${maxKeywords} most important keywords from the job description that are MISSING from the resume.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

Respond ONLY with a JSON array of strings (no markdown, no extra text):
["keyword1", "keyword2", ...]

Focus on: technical skills, tools, certifications, required competencies.`;

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    return JSON.parse(message.content[0].text).slice(0, maxKeywords);
  } catch {
    return message.content[0].text
      .split('\n')
      .map(l => l.replace(/^[-"'\[\]•\d.]+/, '').trim())
      .filter(Boolean)
      .slice(0, maxKeywords);
  }
}

async function rewriteExperience(experienceText, jobDescription, missingKeywords) {
  const keywords = (missingKeywords || []).slice(0, 5).join(', ');

  const prompt = `Rewrite this experience section using achievement-based formatting.

ORIGINAL EXPERIENCE:
${experienceText}

TARGET JOB DESCRIPTION:
${jobDescription}

KEYWORDS TO INTEGRATE: ${keywords}

Rules:
- Use formula: "Achieved [result] by [action] resulting in [impact]"
- Add 2-3 quantified achievements per role (use % or numbers)
- Integrate keywords naturally
- Use strong action verbs
- Keep company names, dates, and job titles intact

Write ONLY the rewritten experience section, no extra commentary:`;

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0].text.trim();
}

module.exports = { calculateMatchScore, extractMissingKeywords, rewriteExperience };