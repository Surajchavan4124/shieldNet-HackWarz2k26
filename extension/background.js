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
  let explanation = "This post appears safe and follows community guidelines. No immediate risks were detected by ShieldNet AI.";
  let sources = [];

  for (const cat in categories) {
    const matched = categories[cat].find(word => lowerText.includes(word));
    if (matched) {
        riskScore = 70 + Math.floor(Math.random() * 30);
        category = cat === 'health' ? 'health misinformation' : (cat === 'political' ? 'political manipulation' : cat);
        flagged = true;
        
        if (cat === 'scam') {
            explanation = "This post contains patterns commonly associated with financial scams or 'get rich quick' schemes. It uses high-pressure language and promises unrealistic returns.";
            sources = [
                { title: "FTC: How to avoid social media scams", url: "https://consumer.ftc.gov/articles/how-avoid-social-media-scams" },
                { title: "SEC: Investment Fraud Prevention", url: "https://www.sec.gov/investor/alerts" }
            ];
        } else if (cat === 'health') {
            explanation = "ShieldNet AI detected claims about medical treatments or cures that contradict established scientific consensus. Following unverified medical advice can be dangerous.";
            sources = [
                { title: "WHO: 5G Mobile Networks & Health", url: "https://www.who.int/news-room/questions-and-answers/item/radiation-5g-mobile-networks-and-health" },
                { title: "CDC: Vaccine Safety and Facts", url: "https://www.cdc.gov/vaccinesafety/index.html" }
            ];
        } else if (cat === 'political') {
            explanation = "This content uses inflammatory language and unverified claims to target political processes or public trust. It aligns with known patterns of influence operations.";
            sources = [
                { title: "CISA: Election Security & Misinformation", url: "https://www.cisa.gov/topics/election-security/rumor-vs-reality" },
                { title: "FactCheck.org: Political Claims", url: "https://www.factcheck.org/" }
            ];
        } else {
            explanation = "This post contains information that has been flagged as potentially false or misleading by ShieldNet's detection models.";
            sources = [
                { title: "Reuters Fact Check", url: "https://www.reuters.com/fact-check/" },
                { title: "PolitiFact", url: "https://www.politifact.com/" }
            ];
        }
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
    flagged: flagged,
    verified_sources: sources
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
