function buildClient(apiKey) {
  const key = (apiKey || '').trim();
  if (!key) {
    throw new Error('Anthropic API key is missing. Please enter it in the upload form.');
  }
  return new Anthropic({ apiKey: key });
}

// Pick model: use what's passed in, else DEFAULT_MODEL above
function resolveModel(model) {
  return (model || '').trim() || DEFAULT_MODEL;
}

// ─── Match Score ──────────────────────────────────────────────────────────────
async function calculateMatchScore(resumeText, jobDescription, jobTitle, apiKey, model) {
  const client = buildClient(apiKey);
  const modelName = resolveModel(model);

  console.log(`[aiService] calculateMatchScore → model: ${modelName}, key: ${apiKey.slice(0, 12)}...`);

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
    model: modelName,
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

// ─── Missing Keywords ─────────────────────────────────────────────────────────
async function extractMissingKeywords(resumeText, jobDescription, maxKeywords = 10, apiKey, model) {
  const client = buildClient(apiKey);
  const modelName = resolveModel(model);

  console.log(`[aiService] extractMissingKeywords → model: ${modelName}`);

  const prompt = `Find the top ${maxKeywords} most important keywords from the job description that are MISSING from the resume.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

Respond ONLY with a JSON array of strings (no markdown, no extra text):
["keyword1", "keyword2", ...]

Focus on: technical skills, tools, certifications, required competencies.`;

  const message = await client.messages.create({
    model: modelName,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    const keywords = JSON.parse(message.content[0].text);
    return keywords.slice(0, maxKeywords);
  } catch {
    return message.content[0].text
      .split('\n')
      .map(l => l.replace(/^[-"'\[\]•\d.]+/, '').trim())
      .filter(Boolean)
      .slice(0, maxKeywords);
  }
}

// ─── Rewrite Experience ───────────────────────────────────────────────────────
async function rewriteExperience(experienceText, jobDescription, missingKeywords, apiKey, model) {
  const client = buildClient(apiKey);
  const modelName = resolveModel(model);
  const keywords = (missingKeywords || []).slice(0, 5).join(', ');

  console.log(`[aiService] rewriteExperience → model: ${modelName}`);

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
    model: modelName,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content[0].text.trim();
}

module.exports = {
  calculateMatchScore,
  extractMissingKeywords,
  rewriteExperience,
  DEFAULT_MODEL
};