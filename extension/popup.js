document.addEventListener('DOMContentLoaded', () => {
  // ── Tab Switching ──────────────────────────────────────────────────────────
  const tabBtns    = document.querySelectorAll('.tab-btn');
  const tabContents= document.querySelectorAll('.tab-content');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
  });

  // ── UI refs ────────────────────────────────────────────────────────────────
  const mainToggle     = document.getElementById('main-toggle');
  const platformDetect = document.querySelector('.platform-detect');
  const platformText   = document.querySelector('.platform-text');
  const dot            = document.querySelector('.dot');
  const detectionsList = document.getElementById('detections-list');
  const statsScanned   = document.getElementById('stats-scanned');
  const statsFlagged   = document.getElementById('stats-flagged');
  const statsRisk      = document.getElementById('stats-risk');

  // ── Load state ─────────────────────────────────────────────────────────────
  chrome.storage.local.get(
    ['shieldNetActive','scannedCount','flaggedCount','recentDetections'],
    (result) => {
      mainToggle.checked = result.shieldNetActive !== false;
      detectPlatform();
      updateStatsUI(result);
      renderDetections(result.recentDetections || []);
    }
  );

  // ── Live updates ───────────────────────────────────────────────────────────
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      chrome.storage.local.get(
        ['scannedCount','flaggedCount','recentDetections'],
        (result) => { updateStatsUI(result); renderDetections(result.recentDetections || []); }
      );
    }
  });

  mainToggle.addEventListener('change', e =>
    chrome.storage.local.set({ shieldNetActive: e.target.checked })
  );

  // ── Platform detection ─────────────────────────────────────────────────────
  function detectPlatform() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      const url = tabs[0].url || '';
      let platform = 'General Browsing';
      let supported = false;
      if (url.includes('twitter.com') || url.includes('x.com'))   { platform = 'Twitter/X';  supported = true; }
      else if (url.includes('reddit.com'))                          { platform = 'Reddit';     supported = true; }
      else if (url.includes('facebook.com'))                        { platform = 'Facebook';   supported = true; }

      chrome.storage.local.get(['shieldNetActive'], (res) => {
        const active = res.shieldNetActive !== false;
        if (active && supported) {
          platformDetect.className = 'platform-detect active glass';
          platformText.textContent = `Active on ${platform}`;
          dot.className = 'dot green';
        } else if (!active) {
          platformDetect.className = 'platform-detect inactive glass';
          platformText.textContent = 'Protection Disabled';
          dot.className = 'dot red';
        } else {
          platformDetect.className = 'platform-detect neutral glass';
          platformText.textContent = `Monitoring ${platform}`;
          dot.className = 'dot gray';
        }
      });
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  function updateStatsUI(res) {
    statsScanned.textContent = res.scannedCount || 0;
    statsFlagged.textContent = res.flaggedCount || 0;

    const detections = res.recentDetections || [];
    const withScore  = detections.filter(d => (d.risk_score || 0) > 0);
    const avg = withScore.length
      ? Math.round(withScore.reduce((s, d) => s + (d.risk_score || 0), 0) / withScore.length)
      : 0;
    statsRisk.textContent = avg > 0 ? `${avg}%` : 'Clear';
  }

  // ── Render detection cards ────────────────────────────────────────────────
  function renderDetections(detections) {
    if (!detections || detections.length === 0) {
      detectionsList.innerHTML =
        '<div class="empty-state">No detections yet. Start scrolling!</div>';
      return;
    }

    detectionsList.innerHTML = '';

    // Show up to 15 — flagged first, then safe
    const sorted = [...detections].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
    sorted.slice(0, 15).forEach(det => {
      const score    = det.risk_score ?? 0;
      const isError  = score === -1;
      const isSafe   = !det.flagged && score < 30;
      const postText = (det.post_text || det.text || '').trim();
      const snippet  = postText.length > 55
        ? postText.substring(0, 55) + '…'
        : (postText || '(no content)');

      const displayScore = isError ? 'ERROR' : isSafe ? 'Safe' : `${score}%`;
      const riskColor    = isError ? 'var(--red)'
        : score >= 70 ? 'var(--red)'
        : score >= 40 ? 'var(--amber)'
        : 'var(--cyan)';
      const riskClass    = isError || score >= 70 ? 'text-red'
        : score >= 40 ? 'text-amber' : 'text-cyan';

      const item = document.createElement('div');
      item.className = 'detection-item glass';
      item.style.borderLeft = `3px solid ${riskColor}`;

      item.innerHTML = `
        <div class="detect-header">
          <span class="handle" style="color:${riskColor};font-weight:700;">
            ${isError ? '⚠' : isSafe ? '✓' : '🚨'} ${det.verdict || (isSafe ? 'SAFE' : 'FLAGGED')}
          </span>
          <span class="time">${det.time || 'now'}</span>
        </div>
        <div class="snippet">"${snippet}"</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;">
          u/${det.author || 'unknown'}
        </div>
        <div class="risk-info" style="margin-top:6px;">
          <div class="risk-bar-container">
            <div class="risk-bar" style="width:${isError ? 100 : Math.min(score,100)}%;background:${riskColor};opacity:${isError ? 0.3 : 1}"></div>
          </div>
          <div class="risk-score ${riskClass}" style="min-width:44px;text-align:right;font-weight:800;">
            ${displayScore}
          </div>
        </div>
        ${det.explanation && !isSafe ? `
        <div style="font-size:10px;color:#94a3b8;margin-top:5px;line-height:1.4;border-top:1px solid rgba(255,255,255,0.05);padding-top:5px;">
          ${det.explanation.substring(0, 80)}${det.explanation.length > 80 ? '…' : ''}
        </div>` : ''}
      `;

      detectionsList.appendChild(item);
    });
  }
});
