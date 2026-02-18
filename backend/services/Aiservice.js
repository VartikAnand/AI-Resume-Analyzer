// services/aiService.js
// AI operations powered by Google Gemini AI
// To change API key or model → update .env or backend/core/config.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../core/config');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: config.GEMINI_MODEL || 'gemini-2.5-flash'
});

/**
 * Calculate match score (1-10) with reasoning using Gemini
 */
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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse JSON
    try {
      // Clean up text in case Gemini wraps it in markdown blocks despite config
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Gemini JSON Parse Error:', parseError, 'Raw text:', text);
      return {
        match_score: 5,
        reasoning: "Failed to parse AI response. " + text.substring(0, 500),
        summary: 'Analysis partially completed',
        strengths: [],
        gaps: []
      };
    }
  } catch (err) {
    console.error('Gemini API Error:', err);
    throw err;
  }
}

/**
 * Extract top missing keywords using Gemini
 */
async function extractMissingKeywords(resumeText, jobDescription, maxKeywords = 10) {
  const prompt = `Find the top ${maxKeywords} most important keywords from the job description that are MISSING from the resume.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

Respond ONLY with a JSON array of strings (no markdown, no extra text):
["keyword1", "keyword2", ...]

Focus on: technical skills, tools, certifications, required competencies.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const keywords = JSON.parse(cleanText);
      return Array.isArray(keywords) ? keywords.slice(0, maxKeywords) : [];
    } catch {
      // Fallback for non-JSON response
      return text.split('\n')
        .map(l => l.replace(/^[-"'\[\]•\d.]+/, '').trim())
        .filter(Boolean)
        .slice(0, maxKeywords);
    }
  } catch (err) {
    console.error('Gemini API Error (Keywords):', err);
    return [];
  }
}

/**
 * Rewrite experience section using Gemini
 */
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

Write ONLY the rewritten experience section, no extra commentary. 
Response should be plain text, not JSON.`;

  // For rewriting, we might want a slightly different config if we don't want JSON
  const rewriteModel = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

  try {
    const result = await rewriteModel.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (err) {
    console.error('Gemini API Error (Rewrite):', err);
    return experienceText; // Return original as fallback
  }
}

module.exports = { calculateMatchScore, extractMissingKeywords, rewriteExperience };