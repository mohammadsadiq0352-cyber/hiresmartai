// --- Global State ---
let currentUser = null;
let selectedResumes = [];
let jdText = "";
let jdFile = null;
let jdMode = "paste"; // "paste" or "upload"
let analysisRunning = false;

// --- Dashboard Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  const userJson = localStorage.getItem('user');
  if (!userJson) {
    window.location.href = 'auth.html?role=user';
    return;
  }

  currentUser = JSON.parse(userJson);

  // Strict Role Check
  const isHR = currentUser.role === 'hr';
  const pathname = window.location.pathname;

  if (isHR && pathname.includes('candidate-dashboard.html')) {
    window.location.href = 'hr-dashboard.html';
    return;
  } else if (!isHR && pathname.includes('hr-dashboard.html')) {
    window.location.href = 'candidate-dashboard.html';
    return;
  }

  initDashboard(currentUser);
  initDragAndDrop();

  // Wire up the analyze button via JS only (avoid double-binding with onclick attr)
  const analyzeBtn = document.getElementById('btn-run-analysis');
  if (analyzeBtn) {
    // Remove inline onclick to prevent double-firing
    analyzeBtn.removeAttribute('onclick');
    analyzeBtn.addEventListener('click', runAnalysis);
  }

  // Entry animation
  const main = document.querySelector('main');
  if (main) {
    main.style.opacity = '0';
    main.style.transform = 'translateY(10px)';
    setTimeout(() => {
      main.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      main.style.opacity = '1';
      main.style.transform = 'translateY(0)';
    }, 100);
  }
});

// --- Drag & Drop ---
function initDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  if (!dropZone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
  });

  dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files), false);
}

// --- Init Dashboard Labels ---
function initDashboard(user) {
  const isHR = user.role === 'hr';

  const set = (id, val, html = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (html) el.innerHTML = val; else el.innerText = val;
  };

  set('portal-title', isHR ? 'HireSmart - HR Portal' : 'HireSmart - Candidate Portal');
  set('tool-title',   isHR ? 'Bulk Resume Screener'  : 'Resume Matching Tool');
  set('upload-title', isHR ? '📁 Upload Candidate Resumes' : '📄 Upload Your Resume');
  set('upload-description',
    isHR ? '<strong>Bulk Mode:</strong> You can select and upload multiple resumes at once'
         : 'Upload your resume in PDF, DOC, or DOCX format', true);
  set('analyze-btn-text', isHR ? 'Analyze & Rank All Resumes' : 'Analyze Match');
  set('user-initial', user.name.charAt(0).toUpperCase());

  const fileInput = document.getElementById('file-input');
  if (fileInput && isHR) fileInput.setAttribute('multiple', 'true');
}

// --- Logout ---
function logout() {
  const userJson = localStorage.getItem('user');
  let redirectUrl = 'index.html';
  if (userJson) {
    const user = JSON.parse(userJson);
    redirectUrl = user.role === 'user' ? 'auth.html?role=user' : 'auth.html?role=hr';
  }
  localStorage.clear();
  window.location.href = redirectUrl;
}

// --- Wizard Navigation ---
function goToStep(step) {
  if (step === 2 && selectedResumes.length === 0) {
    showInlineError("Please select at least one resume first.");
    return;
  }
  if (step === 3 && !jdText && !jdFile) {
    showInlineError("Please provide a job description first.");
    return;
  }

  document.querySelectorAll('.step-card').forEach(card => card.classList.remove('step-active'));
  const target = document.getElementById(`step-${step}-card`);
  if (target) {
    target.classList.add('step-active');
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

// --- File Handling ---
function handleFileSelect(input) {
  handleFiles(input.files);
  input.value = ''; // reset so same file can be re-selected
}

function handleFiles(files) {
  const fileArray = Array.from(files);
  const isHR = currentUser && currentUser.role === 'hr';

  for (const file of fileArray) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      showInlineError(`"${file.name}" is not a valid resume format (PDF, DOC, DOCX only).`);
      continue;
    }
    if (isHR) {
      const exists = selectedResumes.some(f => f.name === file.name && f.size === file.size);
      if (!exists) selectedResumes.push(file);
    } else {
      selectedResumes = [file];
    }
  }

  renderFileList();
}

function renderFileList() {
  const container = document.getElementById('file-list');
  const status    = document.getElementById('file-status');
  if (!container || !status) return;

  const isHR = currentUser && currentUser.role === 'hr';
  container.innerHTML = '';

  if (selectedResumes.length > 0) {
    status.innerHTML = isHR
      ? `<span style="color:var(--primary);font-weight:800;">✓ ${selectedResumes.length} Resume(s) Selected</span>`
      : `<span style="color:var(--primary);">✓ Resume Selected</span>`;

    selectedResumes.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <div class="file-info">
          <span>📄</span>
          <span>${file.name}</span>
          <span style="font-size:11px;color:var(--text-muted)">(${(file.size / 1024).toFixed(1)} KB)</span>
        </div>
        <button class="btn-remove" onclick="removeFile(${index})" title="Remove">✕</button>
      `;
      container.appendChild(item);
    });

    const analyzeText = document.getElementById('analyze-btn-text');
    if (analyzeText && isHR) {
      analyzeText.innerText = selectedResumes.length > 1
        ? `Analyze & Rank ${selectedResumes.length} Resumes`
        : 'Analyze & Rank Resume';
    }

    const next1 = document.getElementById('next-1');
    if (next1) next1.classList.add('enabled');
  } else {
    status.innerText = isHR ? 'Choose resumes to analyze' : 'Choose your resume file';
    const next1 = document.getElementById('next-1');
    if (next1) next1.classList.remove('enabled');
    const analyzeText = document.getElementById('analyze-btn-text');
    if (analyzeText && isHR) analyzeText.innerText = 'Analyze & Rank All Resumes';
  }
}

function removeFile(index) {
  selectedResumes.splice(index, 1);
  renderFileList();
}

// --- JD Mode Toggle ---
function setJDMode(mode) {
  jdMode = mode;
  document.getElementById('btn-paste').classList.toggle('active', mode === 'paste');
  document.getElementById('btn-upload-jd').classList.toggle('active', mode === 'upload');
  document.getElementById('jd-paste-area').style.display  = mode === 'paste'   ? 'block' : 'none';
  document.getElementById('jd-upload-area').style.display = mode === 'upload'  ? 'block' : 'none';
  checkJD();
}

function handleJDFileSelect(input) {
  jdFile = input.files.length > 0 ? input.files[0] : null;
  const statusEl = document.getElementById('jd-file-status');
  if (statusEl) statusEl.innerText = jdFile ? jdFile.name : 'Select Job Description PDF';
  checkJD();
}

function checkJD() {
  const jdEl = document.getElementById('jd-text');
  jdText = jdEl ? jdEl.value.trim() : '';
  const next2 = document.getElementById('next-2');
  if (!next2) return;
  const valid = (jdMode === 'paste' && jdText.length > 50) || (jdMode === 'upload' && jdFile);
  next2.classList.toggle('enabled', !!valid);
}

// --- Analysis ---
async function runAnalysis() {
  // Hard guard — never run twice simultaneously
  if (analysisRunning) return;

  hideInlineError();

  if (selectedResumes.length === 0) {
    showInlineError("Please select at least one resume before analyzing.");
    return;
  }

  const jdValue = document.getElementById('jd-text') ? document.getElementById('jd-text').value.trim() : '';
  if (jdMode === 'paste' && jdValue.length < 10 && !jdFile) {
    showInlineError("Please provide a job description (at least 10 characters).");
    return;
  }

  // Lock
  analysisRunning = true;

  const btn = document.getElementById('btn-run-analysis');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `<div class="loader-dots"><span></span><span></span><span></span></div>&nbsp;Analyzing...`;
  btn.disabled = true;
  btn.classList.add('btn-processing');

  const formData = new FormData();
  formData.append('userId', currentUser.email);

  if (jdMode === 'paste') {
    formData.append('jobDescription', jdValue);
  } else if (jdFile) {
    formData.append('jdFile', jdFile);
  }

  selectedResumes.forEach(file => formData.append('resumes', file));

  try {
    const res = await fetch('http://localhost:5000/analyze', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server error (HTTP ${res.status})`);
    }

    const data = await res.json();
    displayResults(data);

  } catch (err) {
    console.error('Analysis error:', err);
    showInlineError('Analysis failed: ' + err.message + '. Make sure the backend server is running.');
  } finally {
    // Always restore the button — success or failure
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    btn.classList.remove('btn-processing');
    analysisRunning = false;
  }
}

// --- Inline Error (no alert popups) ---
function showInlineError(msg) {
  let el = document.getElementById('analysis-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'analysis-error';
    el.style.cssText = [
      'margin-top:16px',
      'padding:12px 18px',
      'background:rgba(239,68,68,0.12)',
      'border:1px solid rgba(239,68,68,0.35)',
      'border-radius:10px',
      'color:#fca5a5',
      'font-size:14px',
      'font-weight:600',
      'line-height:1.5'
    ].join(';');
    // Append inside the analyze bar / step-3 card
    const anchor = document.getElementById('step-3-card') || document.querySelector('.analyze-bar');
    if (anchor) anchor.appendChild(el);
    else document.body.appendChild(el);
  }
  el.textContent = '❌  ' + msg;
  el.style.display = 'block';
}

function hideInlineError() {
  const el = document.getElementById('analysis-error');
  if (el) el.style.display = 'none';
}

// --- Display Results ---
async function displayResults(results) {
  const overlay = document.getElementById('results-overlay');
  const content = document.getElementById('results-content');
  if (!overlay || !content) return;

  overlay.style.display = 'flex';
  content.innerHTML = '';

  if (!Array.isArray(results) || results.length === 0) {
    content.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px;">No results found.</p>`;
    return;
  }

  const sorted = [...results].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  // Quick Overview
  let html = `
    <div style="margin-bottom:40px;background:#f8fafc;padding:30px;border-radius:16px;border:1px solid #e2e8f0;">
      <h2 style="margin-bottom:20px;font-size:22px;color:var(--text-main);display:flex;align-items:center;gap:10px;">
        <span>📋</span> Quick Overview
      </h2>
      <div style="display:grid;gap:12px;">
  `;

  sorted.forEach(r => {
    if (r.error) return;
    const name = r.candidateName || r.fileName;
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;background:white;padding:15px 25px;border-radius:12px;border:1px solid #edf2f7;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
        <div style="font-weight:700;color:var(--text-main);font-size:16px;">👤 ${name}</div>
        <div style="display:flex;align-items:center;gap:20px;">
          <span class="tag match" style="margin:0;font-size:12px;padding:4px 12px;">${r.classification}</span>
          <span style="font-weight:800;color:var(--primary);font-size:16px;">${r.matchScore}%</span>
        </div>
      </div>
    `;
  });

  html += `</div></div>`;

  // Detailed Analysis
  html += `
    <h2 style="margin-bottom:30px;font-size:22px;color:var(--text-main);display:flex;align-items:center;gap:10px;padding-left:10px;">
      <span>🔍</span> Detailed Analysis
    </h2>
  `;

  sorted.forEach(r => {
    if (r.error) {
      html += `
        <div class="candidate-result-card" style="border-left:4px solid #ef4444;">
          <div class="candidate-header">
            <div class="candidate-name">👤 ${r.fileName}</div>
            <span class="tag" style="background:#fee2e2;color:#ef4444;">Processing Error</span>
          </div>
          <div class="summary-text" style="color:#ef4444;">Error: ${r.error}</div>
        </div>
      `;
    } else {
      const name = r.candidateName || r.fileName;
      html += `
        <div class="candidate-result-card">
          <div class="candidate-header" style="flex-direction:column;align-items:flex-start;gap:10px;">
            <div class="candidate-name" style="font-size:24px;color:var(--primary);">👤 ${name}</div>
            <div style="display:flex;align-items:center;gap:15px;width:100%;border-top:1px solid #f1f5f9;padding-top:10px;">
              <span style="font-weight:700;color:var(--text-muted);font-size:14px;text-transform:uppercase;">Suitability:</span>
              <span class="tag match" style="margin:0;">${r.classification}</span>
              <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
                <span style="font-weight:600;font-size:14px;">Match Score:</span>
                <div class="score-circle-result" style="width:50px;height:50px;font-size:14px;margin:0;border-width:2px;">${r.matchScore}%</div>
              </div>
            </div>
          </div>
          <div class="summary-text" style="margin-top:15px;">${r.summary || ''}</div>
          ${renderDetailedAnalysis(r)}
        </div>
      `;
    }
  });

  content.innerHTML = html;
}

function renderDetailedAnalysis(r) {
  const jdSkills      = r.jdSkills      || [];
  const matchedSkills = r.matchedSkills  || [];

  return `
    <div class="results-detail-grid">
      <div class="detail-column">
        <h3>Job Requirements</h3>
        ${jdSkills.length
          ? jdSkills.map(skill => `
              <div class="skill-box">
                <span>${skill.toUpperCase()}</span>
                <span class="status-dot ${matchedSkills.includes(skill) ? 'match' : 'missing'}"></span>
              </div>`).join('')
          : '<p style="color:#64748b;font-size:14px;">No specific skills identified in JD.</p>'
        }
      </div>
      <div class="detail-column">
        <h3>Candidate Qualifications</h3>
        ${matchedSkills.length
          ? matchedSkills.map(skill => `
              <div class="skill-box">
                <span>${skill.toUpperCase()}</span>
                <span style="color:#10b981;font-size:12px;font-weight:bold;">FOUND</span>
              </div>`).join('')
          : '<p style="color:#64748b;font-size:14px;">No matching skills found.</p>'
        }
      </div>
    </div>
  `;
}

function closeResults() {
  const overlay = document.getElementById('results-overlay');
  if (overlay) overlay.style.display = 'none';
}
