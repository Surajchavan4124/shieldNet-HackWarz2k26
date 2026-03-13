document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
  });

  // UI Elements
  const mainToggle = document.getElementById('main-toggle');
  const platformDetect = document.querySelector('.platform-detect');
  const platformText = document.querySelector('.platform-text');
  const dot = document.querySelector('.dot');
  const detectionsList = document.getElementById('detections-list');
  const statsScanned = document.getElementById('stats-scanned');
  const statsFlagged = document.getElementById('stats-flagged');
  const statsRisk = document.getElementById('stats-risk');

  // Load Initial State
  chrome.storage.local.get(['shieldNetActive', 'scannedCount', 'flaggedCount', 'recentDetections'], (result) => {
    console.log("[ShieldNet Popup] Initial storage state:", result);
    const isActive = result.shieldNetActive !== false;
    mainToggle.checked = isActive;
    
    detectPlatform();
    updateStatsUI(result);
    renderDetections(result.recentDetections || []);
  });

  // Listen for storage changes to update UI in real-time
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      console.log("[ShieldNet Popup] Storage changed:", changes);
      chrome.storage.local.get(['scannedCount', 'flaggedCount', 'recentDetections'], (result) => {
        updateStatsUI(result);
        renderDetections(result.recentDetections || []);
      });
    }
  });

  mainToggle.addEventListener('change', (e) => {
    const isActive = e.target.checked;
    chrome.storage.local.set({ shieldNetActive: isActive });
  });

  function detectPlatform() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      const url = tabs[0].url || "";
      let platform = "General Browsing";
      let isActiveSite = false;

      if (url.includes("twitter.com") || url.includes("x.com")) {
        platform = "Twitter/X";
        isActiveSite = true;
      } else if (url.includes("reddit.com")) {
        platform = "Reddit";
        isActiveSite = true;
      } else if (url.includes("facebook.com")) {
        platform = "Facebook";
        isActiveSite = true;
      } else if (url.includes("instagram.com")) {
        platform = "Instagram";
        isActiveSite = true;
      }

      chrome.storage.local.get(['shieldNetActive'], (res) => {
        const active = res.shieldNetActive !== false;
        if (active && isActiveSite) {
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

  function updateStatsUI(res) {
    statsScanned.textContent = res.scannedCount || 0;
    statsFlagged.textContent = res.flaggedCount || 0;
    // Show average risk_score from recent detections (not flagged/scanned ratio which is always ~0%)
    const detections = res.recentDetections || [];
    const validDetections = detections.filter(d => d.risk_score >= 0);
    const avgRisk = validDetections.length > 0
      ? Math.round(validDetections.reduce((sum, d) => sum + (d.risk_score || 0), 0) / validDetections.length)
      : 0;
    
    // Only show percentage if there is actual risk (avg > 0)
    statsRisk.textContent = avgRisk > 0 ? `${avgRisk}%` : 'Clear';
  }

  function renderDetections(detections) {
    if (!detections || detections.length === 0) {
      detectionsList.innerHTML = '<div class="empty-state">No detections yet. Start scrolling!</div>';
      return;
    }

    detectionsList.innerHTML = '';
    detections.slice(0, 10).forEach(det => {
      const item = document.createElement('div');
      item.className = 'detection-item glass';
      
      const isError = det.risk_score === -1;
      const isClear = det.risk_score === 0;
      
      let displayScore = `${det.risk_score}%`;
      if (isError) displayScore = 'OFFLINE';
      if (isClear) displayScore = 'Clear';
      
      const riskColor = isError ? 'var(--red)' : (det.risk_score > 70 ? 'var(--red)' : (det.risk_score > 40 ? 'var(--amber)' : 'var(--cyan)'));
      const riskTextClass = isError ? 'text-red' : (det.risk_score > 70 ? 'text-red' : (det.risk_score > 40 ? 'text-amber' : 'text-cyan'));

      item.innerHTML = `
        <div class="detect-header">
          <span class="handle">${det.author}</span>
          <span class="time">${det.time || 'now'}</span>
        </div>
        <div class="snippet">"${det.post_text.substring(0, 50)}${det.post_text.length > 50 ? '...' : ''}"</div>
        <div class="risk-info">
          <div class="risk-bar-container">
            <div class="risk-bar" style="width: ${isError ? 100 : det.risk_score}%; background-color: ${riskColor}; opacity: ${isError ? 0.3 : 1}"></div>
          </div>
          <div class="risk-score ${riskTextClass}" style="${isError ? 'font-size:10px; font-weight:900;' : ''}">${displayScore}</div>
        </div>
      `;
      detectionsList.appendChild(item);
    });
  }

});
