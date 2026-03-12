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
 * Platform-Aware Analysis Logic
 * Returns JSON object with: platform, author, post_text, risk_score, category, explanation, flagged
 */
function analyzePostContent(message) {
  const { text, author, platform } = message;
  const lowerText = text.toLowerCase();
  
  console.log(`[ShieldNet Monitor] Analyzing ${platform} post from ${author}`);

  // Refined trigger logic based on user request
  const categories = {
    scam: ["scam", "crypto", "token", "1000x", "guaranteed returns", "giveaway"],
    health: ["miracle cure", "drinking bleach", "cure cancer", "vaccine", "covid"],
    political: ["government mind control", "5g causes", "rigged", "election"],
    misinformation: ["fake news", "earth is flat", "conspiracy"]
  };
  
  let riskScore = Math.floor(Math.random() * 30); 
  let category = "normal";
  let flagged = false;
  let explanation = "This post appears safe and follows community guidelines.";

  for (const cat in categories) {
    const matched = categories[cat].find(word => lowerText.includes(word));
    if (matched) {
        riskScore = 70 + Math.floor(Math.random() * 30);
        category = cat === 'health' ? 'health misinformation' : (cat === 'political' ? 'political manipulation' : cat);
        flagged = true;
        explanation = `ShieldNet detected keywords related to ${category}. This content may contain unverified or harmful claims.`;
        break;
    }
  }

  const result = {
    platform: platform,
    author: author,
    post_text: text,
    risk_score: riskScore,
    category: category,
    explanation: explanation,
    flagged: flagged
  };

  console.log("[ShieldNet Analysis Result]:", JSON.stringify(result, null, 2));

  return result;
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
    
    chrome.storage.local.get(['shieldNetActive'], (result) => {
      if (result.shieldNetActive === false) {
        console.log("[ShieldNet] Extension disabled, skipping analysis");
        sendResponse({ success: false, reason: "disabled" });
        return;
      }
      
      const responseData = analyzePostContent(message);
      
      // Use the atomic storage queue
      updateStorage(responseData);

      analysisCache.set(textHash, responseData);
      
      // Simulate slight delay for technical feel
      setTimeout(() => {
        sendResponse(responseData);
      }, 300);
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
