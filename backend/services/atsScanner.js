// services/atsScanner.js
// ATS compatibility scanning and scoring

const path = require('path');
const fs = require('fs');

class ATSScannerService {

  scanResume(filePath, resumeText) {
    const ext = path.extname(filePath).toLowerCase();
    const issues = [];
    const warnings = [];

    // Run all checks
    issues.push(...this._checkFileFormat(filePath, ext));
    issues.push(...this._checkStructure(resumeText));
    warnings.push(...this._checkContent(resumeText));

    const score = this._calculateScore(issues, warnings, resumeText);

    return {
      compatibility_score: score,
      total_issues: issues.length,
      total_warnings: warnings.length,
      issues,
      warnings,
      recommendations: this._buildRecommendations(issues, warnings)
    };
  }

  _checkFileFormat(filePath, ext) {
    const issues = [];

    if (!['.pdf', '.docx', '.doc'].includes(ext)) {
      issues.push({
        category: 'File Format',
        severity: 'high',
        description: `Unsupported format: ${ext}`,
        recommendation: 'Use PDF or DOCX format'
      });
    }

    // Check file is not empty
    const stats = fs.statSync(filePath);
    if (stats.size < 1000) {
      issues.push({
        category: 'File Size',
        severity: 'high',
        description: 'File appears to be empty or too small',
        recommendation: 'Ensure resume has sufficient content'
      });
    }

    return issues;
  }

  _checkStructure(text) {
    const issues = [];
    const lower = text.toLowerCase();

    if (!lower.includes('experience') && !lower.includes('work')) {
      issues.push({
        category: 'Missing Section',
        severity: 'high',
        description: "No 'Experience' section found",
        recommendation: "Add a clearly labeled 'Professional Experience' section"
      });
    }

    if (!lower.includes('education')) {
      issues.push({
        category: 'Missing Section',
        severity: 'medium',
        description: "No 'Education' section found",
        recommendation: "Add a clearly labeled 'Education' section"
      });
    }

    if (!/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(text)) {
      issues.push({
        category: 'Contact Info',
        severity: 'high',
        description: 'No email address found',
        recommendation: 'Include your email address in the contact section'
      });
    }

    return issues;
  }

  _checkContent(text) {
    const warnings = [];
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    if (wordCount < 200) {
      warnings.push({
        category: 'Content Length',
        severity: 'medium',
        description: `Resume is short (${wordCount} words)`,
        recommendation: 'Expand with more details about your experience and skills'
      });
    }

    if (wordCount > 1000) {
      warnings.push({
        category: 'Content Length',
        severity: 'low',
        description: `Resume is long (${wordCount} words)`,
        recommendation: 'Consider condensing to 1-2 pages for better ATS parsing'
      });
    }

    const specialChars = ['©', '®', '™', '★', '→'];
    const found = specialChars.filter(c => text.includes(c));
    if (found.length) {
      warnings.push({
        category: 'Special Characters',
        severity: 'low',
        description: `Special characters found: ${found.join(' ')}`,
        recommendation: 'Replace with standard text equivalents'
      });
    }

    return warnings;
  }

  _calculateScore(issues, warnings, text) {
    let score = 100;

    for (const issue of issues) {
      if (issue.severity === 'high') score -= 15;
      else if (issue.severity === 'medium') score -= 8;
      else score -= 3;
    }

    for (const warning of warnings) {
      if (warning.severity === 'medium') score -= 5;
      else score -= 2;
    }

    // Bonus for good practices
    if (/@/.test(text)) score += 5;
    if (text.split(/\s+/).length >= 300) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  _buildRecommendations(issues, warnings) {
    const recs = [];

    issues
      .filter(i => i.severity === 'high')
      .forEach(i => recs.push(i.recommendation));

    issues
      .filter(i => i.severity === 'medium')
      .forEach(i => recs.push(i.recommendation));

    warnings
      .slice(0, 2)
      .forEach(w => recs.push(w.recommendation));

    return recs;
  }
}

module.exports = new ATSScannerService();
