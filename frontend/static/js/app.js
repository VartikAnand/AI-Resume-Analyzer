console.log("✅ app.js loaded");
// Complete JavaScript for Resume ATS Optimizer
// This file contains all frontend logic for upload, dashboard, and results pages

// API_BASE is now defined in common.js

// ============================================================================
// UPLOAD PAGE (upload.html)
// ============================================================================

if (window.location.pathname === '/upload') {
    console.log('📄 Upload page detected');
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
    }

    // userEmail update is now handled by common.js

    // File upload handling
    const resumeFile = document.getElementById('resumeFile');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const uploadForm = document.getElementById('uploadForm');

    console.log('Elements found:', {
        resumeFile: !!resumeFile,
        fileUploadArea: !!fileUploadArea,
        uploadForm: !!uploadForm
    });

    if (!uploadForm) {
        console.error('❌ uploadForm not found!');
    }

    resumeFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            document.querySelector('.upload-placeholder').style.display = 'none';
            document.getElementById('fileInfo').style.display = 'flex';
            document.getElementById('fileName').textContent = file.name;
        }
    });

    // Form submission
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted!');

            const analyzeBtn = document.getElementById('analyzeBtn');
            const btnText = analyzeBtn.querySelector('.btn-text');
            const btnLoading = analyzeBtn.querySelector('.btn-loading');
            const errorDiv = document.getElementById('errorMessage');

            // Hide any previous errors
            errorDiv.style.display = 'none';

            // Validate file
            if (!resumeFile.files[0]) {
                errorDiv.textContent = 'Please select a resume file.';
                errorDiv.style.display = 'block';
                return;
            }

            console.log('File:', resumeFile.files[0].name);
            console.log('Token:', token ? 'exists' : 'MISSING');

            // Get form data
            const formData = new FormData();
            formData.append('resume', resumeFile.files[0]);
            formData.append('job_title', document.getElementById('jobTitle').value);
            formData.append('company_name', document.getElementById('companyName').value);
            formData.append('job_description', document.getElementById('jobDescription').value);

            // Show loading
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
            analyzeBtn.disabled = true;

            try {
                console.log('Sending request...');
                const response = await fetch(`${API_BASE}/analysis/complete`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                console.log('Response status:', response.status);
                const result = await response.json();
                console.log('Response data:', result);

                if (response.ok) {
                    console.log('Success! Redirecting...');
                    localStorage.setItem('latestAnalysis', JSON.stringify(result.data || result));
                    window.location.href = '/results';
                } else {
                    errorDiv.textContent = result.detail || 'Analysis failed';
                    errorDiv.style.display = 'block';
                    console.error('Server error:', result);
                }
            } catch (error) {
                console.error('Network/parsing error:', error);
                errorDiv.textContent = `Error: ${error.message}`;
                errorDiv.style.display = 'block';
            } finally {
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
                analyzeBtn.disabled = false;
            }
        });

    }
}

// Remove file function
function removeFile() {
    document.getElementById('resumeFile').value = '';
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
}

// ============================================================================
// DASHBOARD PAGE (dashboard.html)
// ============================================================================

if (window.location.pathname === '/dashboard') {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
    }

    // Display user info
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = user.name || 'User';

            const userEmailEl = document.getElementById('userEmail');
            if (userEmailEl) userEmailEl.textContent = user.email || '';
        }
    } catch (e) {
        console.error('Error parsing user data:', e);
    }

    // Load usage stats (placeholder - would come from API)
    document.getElementById('analysesUsed').textContent = '1';
    document.getElementById('analysesRemaining').textContent = '1 remaining';
    document.getElementById('rewritesUsed').textContent = '0';
    document.getElementById('rewritesRemaining').textContent = '1 remaining';
    document.getElementById('resetDays').textContent = '15';

    // Load recent analyses
    loadRecentAnalyses();
}

async function loadRecentAnalyses() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE}/analysis/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok && result.data && result.data.length > 0) {
            const analysesList = document.getElementById('recentAnalyses');
            analysesList.innerHTML = result.data.map(analysis => `
                <div class="analysis-item" onclick="viewAnalysis('${analysis.id}')">
                    <div>
                        <h4>${analysis.job_title}</h4>
                        <p>${analysis.company_name || 'Company'}</p>
                    </div>
                    <div class="analysis-score">
                        <span class="score">${analysis.match_score}/10</span>
                        <small>${new Date(analysis.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('recentAnalyses').innerHTML = '<p>No analyses yet. Start your first analysis!</p>';
        }
    } catch (error) {
        document.getElementById('recentAnalyses').innerHTML = '<p>Error loading analyses</p>';
    }
}

function viewAnalysis(analysisId) {
    window.location.href = `/results?id=${analysisId}`;
}

// ============================================================================
// RESULTS PAGE (results.html)
// ============================================================================

if (window.location.pathname === '/results') {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
    }

    // Load analysis results
    const analysisData = JSON.parse(localStorage.getItem('latestAnalysis'));

    if (analysisData) {
        displayResults(analysisData);
    } else {
        document.querySelector('.results-page').innerHTML = '<p>No analysis data found</p>';
    }
}

function displayResults(data) {
    // Job info
    document.getElementById('jobTitle').textContent = data.job_title;
    document.getElementById('companyName').textContent = data.company_name || '';

    // Match score
    const matchScore = data.match_score.score;
    document.getElementById('matchScore').textContent = matchScore;
    document.getElementById('scoreSummary').textContent = data.match_score.summary;
    document.getElementById('scoreReasoning').textContent = data.match_score.reasoning;

    // Score bar
    document.getElementById('scoreFill').style.width = `${data.match_score.percentage}%`;

    // Strengths
    const strengthsList = document.getElementById('strengthsList');
    strengthsList.innerHTML = data.strengths.map(s => `<li>${s}</li>`).join('');

    // Gaps
    const gapsList = document.getElementById('gapsList');
    gapsList.innerHTML = data.gaps.map(g => `<li>${g}</li>`).join('');

    // Missing keywords
    const keywordsList = document.getElementById('keywordsList');
    keywordsList.innerHTML = data.missing_keywords.map(k =>
        `<span class="keyword-chip">${k}</span>`
    ).join('');

    // ATS compatibility
    const atsScore = data.ats_compatibility.score;
    document.getElementById('atsScore').textContent = atsScore;

    // ATS circle progress
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (atsScore / 100) * circumference;
    document.getElementById('atsCircle').style.strokeDashoffset = offset;

    // ATS issues
    if (data.ats_compatibility.issues && data.ats_compatibility.issues.length > 0) {
        document.getElementById('atsIssues').innerHTML = '<h3>Issues Found:</h3>' +
            data.ats_compatibility.issues.map(issue => `
                <div class="ats-issue">
                    <strong>${issue.category}</strong>: ${issue.description}
                </div>
            `).join('');
    }

    // ATS recommendations
    if (data.ats_compatibility.recommendations && data.ats_compatibility.recommendations.length > 0) {
        document.getElementById('atsRecommendations').innerHTML = '<h3>Recommendations:</h3><ul>' +
            data.ats_compatibility.recommendations.map(rec => `<li>${rec}</li>`).join('') +
            '</ul>';
    }

    // Store analysis ID for rewrite
    window.currentAnalysisId = data.analysis_id;
}

function showRewriteForm() {
    document.getElementById('rewriteSection').style.display = 'block';
    document.getElementById('rewriteSection').scrollIntoView({ behavior: 'smooth' });
}

// Handle rewrite form submission
const rewriteForm = document.getElementById('rewriteForm');
if (rewriteForm) {
    rewriteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        const rewriteBtn = document.getElementById('rewriteBtn');
        const btnText = rewriteBtn.querySelector('.btn-text');
        const btnLoading = rewriteBtn.querySelector('.btn-loading');

        const experienceText = document.getElementById('experienceText').value;

        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        rewriteBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/optimizer/rewrite?analysis_id=${window.currentAnalysisId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `experience_text=${encodeURIComponent(experienceText)}`
            });

            const result = await response.json();

            if (response.ok) {
                document.getElementById('optimizedText').textContent = result.data.rewritten;
                document.getElementById('rewriteResult').style.display = 'block';
                window.optimizedText = result.data.rewritten;
            } else {
                alert(result.detail || 'Rewrite failed');
            }
        } catch (error) {
            alert('Error occurred during rewrite');
        } finally {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            rewriteBtn.disabled = false;
        }
    });
}

function copyToClipboard() {
    navigator.clipboard.writeText(window.optimizedText);
    alert('Copied to clipboard!');
}

// ============================================================================
// GLOBAL FUNCTIONS
// ============================================================================

// logout() is now defined in common.js

// Toggle API key visibility
// toggleKeyVisibility() is now defined in common.js