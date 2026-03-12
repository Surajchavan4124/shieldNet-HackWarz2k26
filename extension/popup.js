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
    const avgRisk = res.scannedCount ? Math.round(((res.flaggedCount || 0) / res.scannedCount) * 100) : 0;
    statsRisk.textContent = `${avgRisk}%`;
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
      
      const riskColor = det.risk_score > 70 ? 'var(--red)' : (det.risk_score > 40 ? 'var(--amber)' : 'var(--cyan)');
      const riskTextClass = det.risk_score > 70 ? 'text-red' : (det.risk_score > 40 ? 'text-amber' : 'text-cyan');

      item.innerHTML = `
        <div class="detect-header">
          <span class="handle">${det.author}</span>
          <span class="time">${det.time || 'now'}</span>
        </div>
        <div class="snippet">"${det.post_text.substring(0, 50)}${det.post_text.length > 50 ? '...' : ''}"</div>
        <div class="risk-info">
          <div class="risk-bar-container">
            <div class="risk-bar" style="width: ${det.risk_score}%; background-color: ${riskColor};"></div>
          </div>
          <div class="risk-score ${riskTextClass}">${det.risk_score}%</div>
        </div>
      `;
      detectionsList.appendChild(item);
    });
  }

  // Handle Rez-Scan Button
  const rescanBtn = document.getElementById('rescan-btn');
  if (rescanBtn) {
      rescanBtn.addEventListener('click', () => {
          rescanBtn.textContent = 'SCANNING...';
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                  chrome.tabs.sendMessage(tabs[0].id, { action: "FORCE_SCAN" }, (response) => {
                      setTimeout(() => rescanBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>', 1000);
                  });
              }
          });
      });
  }
});
