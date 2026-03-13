// ShieldNet Background Service Worker
// Handles API calls to localhost:8080 to bypass Mixed Content (HTTPS -> HTTP) blocks 
// on production sites like Twitter/X and Reddit.
const BACKEND_BATCH_URL = 'http://localhost:8080/api/analyze/batch';

// Initialize state on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    shieldNetActive: true,
    flaggedCount: 0,
    scannedCount: 0,
    recentDetections: []
  });
  console.log('[ShieldNet] Extension installed.');
});

// ─── API Proxy ───────────────────────────────────────────────────────────────
async function proxyAnalyzeBatch(posts) {
  try {
    const response = await fetch(BACKEND_BATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error('[ShieldNet background] API Fetch Error:', err.message);
    throw err;
  }
}

// ─── Message Router ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // New action: Request analysis from background
  if (message.action === 'execute_batch_analysis') {
    proxyAnalyzeBatch(message.posts)
      .then(data => sendResponse({ ok: true, results: data.results }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // Keep channel open for async
  }

  // content.js tells us a batch result arrived
  if (message.action === 'batch_results') {
    const { results } = message;
    if (!Array.isArray(results)) { sendResponse({ ok: true }); return true; }

    chrome.storage.local.get(['scannedCount', 'flaggedCount', 'recentDetections'], (stored) => {
      const scanned  = (stored.scannedCount  || 0) + results.length;
      const newFlags = results.filter(r => r.flagged || (r.fakeScore ?? r.risk_score ?? 0) >= 30);
      const flagged  = (stored.flaggedCount  || 0) + newFlags.length;
      let detections = stored.recentDetections || [];

      // Normalize fields → popup.js uses post_text & risk_score
      newFlags.forEach(r => {
        const normalised = {
          post_text:   r.text || r.post_text || '(no text)',
          author:      r.author  || 'unknown',
          risk_score:  r.fakeScore ?? r.risk_score ?? 0,
          verdict:     r.verdict  || 'MISLEADING',
          explanation: r.explanation || '',
          flagged:     true,
          id:          Date.now() + Math.random(),
          time:        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        // Deduplicate by text prefix
        const prefix = normalised.post_text.substring(0, 40);
        if (!detections.some(d => (d.post_text || '').startsWith(prefix))) {
          detections.unshift(normalised);
        }
      });

      // Also count ALL scanned posts (flagged + safe)
      results.filter(r => !(r.flagged || (r.fakeScore ?? 0) >= 30)).forEach(r => {
        const normalised = {
          post_text:  r.text || r.post_text || '(no text)',
          author:     r.author || 'unknown',
          risk_score: r.fakeScore ?? r.risk_score ?? 0,
          verdict:    r.verdict || 'SAFE',
          flagged:    false,
          id:         Date.now() + Math.random(),
          time:       new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const prefix = normalised.post_text.substring(0, 40);
        if (!detections.some(d => (d.post_text || '').startsWith(prefix))) {
          detections.unshift(normalised);
        }
      });

      if (detections.length > 30) detections = detections.slice(0, 30);

      chrome.storage.local.set({ scannedCount: scanned, flaggedCount: flagged, recentDetections: detections });
    });
    sendResponse({ ok: true });
    return true;
  }

  // content.js tells us a post was dismissed (user clicked "Dismiss")
  if (message.action === 'post_dismissed') {
    sendResponse({ ok: true });
    return true;
  }

  // Popup: reset counters
  if (message.action === 'reset_stats') {
    chrome.storage.local.set({ scannedCount: 0, flaggedCount: 0, recentDetections: [] });
    sendResponse({ ok: true });
    return true;
  }
});
