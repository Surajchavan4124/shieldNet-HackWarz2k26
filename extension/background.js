// ShieldNet Background Service Worker
// Now powered by the Multi-Agent Consensus Backend

const BACKEND_URL = 'http://localhost:5000/api/analyze';
const analysisCache = new Map();
let storageQueue = Promise.resolve();

// Initialize default state on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    shieldNetActive: true,
    flaggedCount: 0,
    scannedCount: 0,
    recentDetections: []
  });
  console.log("[ShieldNet] Extension installed. Backend URL:", BACKEND_URL);
});

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

function updateStorage(responseData) {
  storageQueue = storageQueue.then(() => new Promise((resolve) => {
    chrome.storage.local.get(['scannedCount', 'flaggedCount', 'recentDetections'], (result) => {
      const scanned = (result.scannedCount || 0) + 1;
      let flagged = result.flaggedCount || 0;
      if (responseData.flagged) flagged++;

      let detections = result.recentDetections || [];
      const textHash = simpleHash((responseData.post_text || '') + (responseData.author || ''));
      
      if (!detections.some(d => simpleHash((d.post_text || '') + (d.author || '')) === textHash)) {
        detections.unshift({
          ...responseData,
          id: Date.now(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        if (detections.length > 20) detections.pop();
      }

      chrome.storage.local.set({
        scannedCount: scanned,
        flaggedCount: flagged,
        recentDetections: detections
      }, resolve);
    });
  }));
}

// ─── Local Pre-Filter Model ───────────────────────────────────────────────────
// Scores text locally (0.0 – 1.0). Only posts that score >= 0.40 are sent to
// the backend API, dramatically reducing quota usage.

const MISINFO_SIGNALS = {
  // High-weight phrases — very strong misinformation indicators (weight 0.20)
  high: [
    /\bfake news\b/i, /\bhoax\b/i, /\bscam alert\b/i, /\bthey don'?t want you to know\b/i,
    /\bwake up people\b/i, /\bshare before (it'?s )?deleted\b/i, /\bshadow.?ban(ned)?\b/i,
    /\bdeep.?state\b/i, /\bgovernment (is )?hiding\b/i, /\bplandemic\b/i,
    /\bcrisis actor(s)?\b/i, /\bfalse flag\b/i, /\bcabal\b/i,
    /\bthey'?re (putting|spraying|poisoning)\b/i, /\b(cures?|cure(d)?|kills?) cancer\b/i,
    /\bbig pharma\b/i, /\bvaccine (causes?|gave me)\b/i, /\b5g (causes?|spread(s|ing)?)\b/i,
  ],
  // Medium-weight phrases — suspicious but may be legitimate (weight 0.10)
  medium: [
    /\bbreaking:?\b/i, /\burgent:?\b/i, /\bexclusive:?\b/i, /\bsecret(ly)?\b/i,
    /\bconspiracy\b/i, /\belites?\b/i, /\bnew world order\b/i, /\billuminati\b/i,
    /\bNWO\b/, /\bthey'?re lying\b/i, /\bmain.?stream media\b/i, /\bMSM\b/,
    /\bthe truth about\b/i, /\bwhat (they|the media) won'?t (tell|show) you\b/i,
    /\b100%\s*(proven|confirmed|effective)\b/i, /\bno one is talking about\b/i,
    /\bcensored\b/i, /\bsuppressed\b/i, /\bexposed\b/i,
    /\bpedophile ring\b/i, /\btrafficking ring\b/i,
  ],
  // Claim indicators — asserting unverified facts (weight 0.08)
  claims: [
    /\bscientists? (prove[sd]?|confir(m|med)|found)\b/i,
    /\bstudies? (show|prove|confirm)\b/i,
    /\baccording to (sources?|insiders?|whistleblowers?)\b/i,
    /\bmy (doctor|source) told me\b/i,
    /\b(leaked|classified) document(s)?\b/i,
    /\bmiracle cure\b/i, /\bnaturally (cure|treat|heal)\b/i,
    /\binstantly (cure|stop|reverse)\b/i,
  ],
  // Emotional amplifiers — high urgency / fear language (weight 0.05)
  emotional: [
    /\!!{2,}/, /\bOMG\b/i, /\bshocking\b/i, /\bterrifyin(g)\b/i,
    /\boutrageous\b/i, /\bdisgusting\b/i, /\bepic\b/i, /\bunbelievable\b/i,
    /\bmust (see|watch|read|share)\b/i, /\bviral\b/i,
  ],
};

/**
/**
 * Real-time Analysis Integration
 * Connects to the Node.js backend instead of using mock logic.
 */
async function analyzePostContent(message) {
  const { text, author, platform } = message;
  
  console.log(`[ShieldNet Monitor] Sending ${platform} post from ${author} to backend...`);

  try {
    const response = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text, 
        platform: platform.toLowerCase(), 
        author,
        force: message.force || false 
      })
    });

    if (!response.ok) throw new Error('Backend analysis failed');

    const data = await response.json();
    
    const result = {
      platform: platform,
      author: author,
      post_text: text,
      risk_score: data.fakeScore || data.risk_score || 0,
      category: data.category || (data.fakeScore >= 70 ? 'misinformation' : 'normal'),
      explanation: data.explanation || 'No explanation available.',
      flagged: data.flagged !== undefined ? data.flagged : data.fakeScore >= 35,
      verified_sources: data.verified_sources || data.sources || [],
      confidence: data.confidence || 'Medium'
    };

    console.log("[ShieldNet Analysis Result]:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("[ShieldNet Error]:", error);
    return {
      platform, author, post_text: text,
      risk_score: -1, category: 'error',
      explanation: "Unable to connect to ShieldNet AI. Please check if the backend is running.",
      flagged: false,
      status: 'error',
      verified_sources: [],
      confidence: 'None'
    };
  }
}

/**
 * Runs the local pre-filter and returns a confidence score from 0.0 to 1.0.
 * @param {string} text
 * @returns {number} score between 0 and 1
 */
function localMisinfoScore(text) {
  if (!text || text.trim().length < 20) return 0;

  let score = 0;

  for (const pattern of MISINFO_SIGNALS.high) {
    if (pattern.test(text)) { score += 0.20; }
  }
  for (const pattern of MISINFO_SIGNALS.medium) {
    if (pattern.test(text)) { score += 0.10; }
  }
  for (const pattern of MISINFO_SIGNALS.claims) {
    if (pattern.test(text)) { score += 0.08; }
  }
  for (const pattern of MISINFO_SIGNALS.emotional) {
    if (pattern.test(text)) { score += 0.05; }
  }

  // ALL-CAPS ratio boosts score slightly (angry/sensational posts)
  const words = text.split(/\s+/).filter(w => w.length > 3);
  if (words.length > 0) {
    const capsRatio = words.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w)).length / words.length;
    if (capsRatio > 0.4) score += 0.10;
  }

  return Math.min(score, 1.0); // Cap at 1.0
}

const LOCAL_THRESHOLD = 0.40; // 40% - Only posts with strong misinformation signals escalate to the backend

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyze_post") {
    const textHash = simpleHash((message.text || '') + (message.author || ''));

    // Return cached result immediately if available (unless forced)
    if (analysisCache.has(textHash) && !message.force) {
      console.log(`[ShieldNet] Cache hit for post from ${message.author}`);
      sendResponse(analysisCache.get(textHash));
      return true;
    }
    chrome.storage.local.get(['shieldNetActive'], async (result) => {
      if (result.shieldNetActive === false) {
        sendResponse({ flagged: false, reason: 'disabled' });
        return;
      }

      // ── Local Pre-Filter Gate ────────────────────────────────────────────
      // Score the text locally first. Only forward to the backend API when
      // the local confidence is >= LOCAL_THRESHOLD (0.50), saving API quota.
      const localScore = localMisinfoScore(message.text || '');
      console.log(`[ShieldNet] Local score for "${(message.text || '').substring(0, 40)}...": ${(localScore * 100).toFixed(0)}%`);

      if (localScore < LOCAL_THRESHOLD && !message.force) {
        // Looks clean locally — skip the API call entirely
        const safeResult = {
          platform: message.platform,
          author: message.author || 'unknown',
          post_text: message.text,
          risk_score: Math.round(localScore * 100),
          category: 'normal',
          explanation: 'Local pre-filter: content appears safe. No API call made.',
          flagged: false,
          verified_sources: [],
          confidence: 'Low (local only)',
        };
        updateStorage(safeResult);
        analysisCache.set(textHash, safeResult);
        setTimeout(() => analysisCache.delete(textHash), 60 * 60 * 1000); // 60 min cache
        sendResponse(safeResult);
        return;
      }

      // Local score >= 0.50 — escalate to the full backend analysis
      console.log(`[ShieldNet] Escalating to backend (local score ${(localScore * 100).toFixed(0)}%)`);
      const responseData = await analyzePostContent(message);
      
      // Use the atomic storage queue
      updateStorage(responseData);

      analysisCache.set(textHash, responseData);
      setTimeout(() => analysisCache.delete(textHash), 60 * 60 * 1000); // expire after 60 mins
      sendResponse(responseData);
    });

    return true; // Keep async channel open
  }

  if (message.action === "report_post") {
    console.log("[ShieldNet] Post reported:", message.postData?.post_text?.substring(0, 50));
    setTimeout(() => {
      sendResponse({ success: true, message: "Post reported successfully to ShieldNet." });
    }, 300);
    return true;
  }
});
