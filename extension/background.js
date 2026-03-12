// ShieldNet Background Service Worker

// Initialize default state on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    shieldNetActive: true,
    flaggedCount: 0,
    scannedCount: 0,
    recentDetections: []
  });
  console.log("ShieldNet installed and active.");
});

const analysisCache = new Map();
let storageQueue = Promise.resolve();

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
      const textHash = simpleHash(responseData.post_text + responseData.author);
      
      // Duplicate check
      if (!detections.some(d => simpleHash(d.post_text + d.author) === textHash)) {
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
      }, () => {
        console.log(`[ShieldNet] Storage updated. Total Scanned: ${scanned}, Flagged: ${flagged}`);
        resolve();
      });
    });
  }));
}

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
      body: JSON.stringify({ text, platform: platform.toLowerCase() })
    });

    if (!response.ok) throw new Error('Backend analysis failed');

    const data = await response.json();
    
    const result = {
      platform: platform,
      author: author,
      post_text: text,
      risk_score: data.fakeScore,
      category: data.fakeScore >= 70 ? 'misinformation' : 'normal',
      explanation: data.explanation,
      flagged: data.fakeScore >= 70
    };

    console.log("[ShieldNet Analysis Result]:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("[ShieldNet Error]:", error);
    return {
      platform, author, post_text: text,
      risk_score: 0, category: 'error',
      explanation: "Unable to connect to ShieldNet AI. Please check if the backend is running.",
      flagged: false
    };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyze_post") {
    console.log(`[ShieldNet] Received analyze_post from ${sender.tab?.url}`);
    const textHash = simpleHash(message.text + message.author);
    
    if (analysisCache.has(textHash)) {
      console.log(`[ShieldNet] Using cached result for post from ${message.author}`);
      sendResponse(analysisCache.get(textHash));
      return true;
    }
    
    chrome.storage.local.get(['shieldNetActive'], async (result) => {
      if (result.shieldNetActive === false) {
        console.log("[ShieldNet] Extension disabled, skipping analysis");
        sendResponse({ success: false, reason: "disabled" });
        return;
      }
      
      const responseData = await analyzePostContent(message);
      
      // Use the atomic storage queue
      updateStorage(responseData);

      analysisCache.set(textHash, responseData);
      sendResponse(responseData);
    });

    return true; 
  }
  
  if (message.action === "report_post") {
    console.log("Reporting post to ShieldNet API:", message.postData);
    setTimeout(() => {
      sendResponse({ success: true, message: "Post reported successfully." });
    }, 300);
    return true;
  }
});
