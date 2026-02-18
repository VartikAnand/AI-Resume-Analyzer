// services/resumeParser.js
// Extract text and structure from PDF and DOCX files

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');

class ResumeParserService {

  async parseFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    let text = '';

    if (ext === '.pdf') {
      text = await this._parsePDF(filePath);
    } else if (ext === '.docx' || ext === '.doc') {
      text = await this._parseDOCX(filePath);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    return {
      raw_text: text,
      metadata: this._extractMetadata(text),
      sections: this._extractSections(text),
      word_count: text.split(/\s+/).filter(Boolean).length
    };
  }

  async _parsePDF(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text.trim();
    } catch (err) {
      throw new Error(`Error parsing PDF: ${err.message}`);
    }
  }

  async _parseDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.trim();
    } catch (err) {
      throw new Error(`Error parsing DOCX: ${err.message}`);
    }
  }

  _extractMetadata(text) {
    const metadata = {};

    // Email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch) metadata.email = emailMatch[0];

    // Phone
    const phoneMatch = text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) metadata.phone = phoneMatch[0];

    // LinkedIn
    const linkedinMatch = text.toLowerCase().match(/linkedin\.com\/in\/[\w-]+/);
    if (linkedinMatch) metadata.linkedin = linkedinMatch[0];

    return metadata;
  }

  _extractSections(text) {
    const sections = {};
    const headers = ['experience', 'education', 'skills', 'summary'];
    const lines = text.split('\n');

    let currentSection = 'other';
    let currentContent = [];

    for (const line of lines) {
      const lower = line.trim().toLowerCase();
      let isHeader = false;

      for (const header of headers) {
        if (lower.includes(header) && line.trim().length < 50) {
          if (currentContent.length) {
            sections[currentSection] = currentContent.join('\n').trim();
          }
          currentSection = header;
          currentContent = [];
          isHeader = true;
          break;
        }
      }

      if (!isHeader && line.trim()) {
        currentContent.push(line);
      }
    }

    if (currentContent.length) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  }
}

module.exports = new ResumeParserService();
