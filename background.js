// ShieldNet Background Service Worker

// Initialize default state on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    shieldNetActive: true,
    flaggedCount: 0,
    scannedCount: 0
  });
  console.log("ShieldNet installed and active.");
});

// A local cache to prevent redundant API calls for text we've already checked
const analysisCache = new Map();

// Generate a simple hash of a string for caching purposes
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; 
  }
  return hash.toString();
}

// Function to increment scan count in storage
function incrementScanCount() {
  chrome.storage.local.get(['scannedCount'], (result) => {
    let count = result.scannedCount || 0;
    chrome.storage.local.set({ scannedCount: count + 1 });
  });
}

// Function to increment flagged count in storage
function incrementFlaggedCount() {
  chrome.storage.local.get(['flaggedCount'], (result) => {
    let count = result.flaggedCount || 0;
    chrome.storage.local.set({ flaggedCount: count + 1 });
  });
}

// Mock analysis logic for misinformation detection (Pending API integration)
function mockAnalysisLogic(text) {
  const lowerText = text.toLowerCase();
  
  // Specific keywords that trigger our mock AI
  const triggerWords = ["fake news", "miracle cure", "government mind control", "5g causes", "earth is flat"];
  
  let isFlagged = false;
  let probability = Math.floor(Math.random() * 30); // Base probability 0-30%
  
  for (const word of triggerWords) {
    if (lowerText.includes(word)) {
      isFlagged = true;
      probability = 75 + Math.floor(Math.random() * 20); // 75-94% probability if matched
      break;
    }
  }

  if (isFlagged) {
    return {
      success: true,
      isFlagged: true,
      probability: probability,
      explanation: "There is no scientific evidence supporting this claim. Verified medical and scientific guidelines indicate that the information is misleading.",
      sources: [
        { title: "World Health Organization Data", url: "https://who.int" },
        { title: "Reuters Fact Check", url: "https://reuters.com" }
      ]
    };
  } else {
    return {
      success: true,
      isFlagged: false,
      probability: probability
    };
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyze_post") {
    // Generate an ID for the prompt logic
    const textHash = simpleHash(message.text);
    
    // Check if we have cached results for this exact text to save bandwidth
    if (analysisCache.has(textHash)) {
      sendResponse(analysisCache.get(textHash));
      return true; // Needed for async response
    }
    
    // Handle processing
    chrome.storage.local.get(['shieldNetActive'], (result) => {
      // If extension is disabled, skip analysis
      if (result.shieldNetActive === false) {
        sendResponse({ success: false, reason: "disabled" });
        return;
      }
      
      // We are scanning a post
      incrementScanCount();

      // MOCK API CALL TO OUR FUTURE Node.js Server
      // Mocking 1.5 second delay to simulate real network latency
      setTimeout(() => {
        const responseData = mockAnalysisLogic(message.text);
        
        if (responseData.isFlagged) {
          incrementFlaggedCount();
        }

        analysisCache.set(textHash, responseData);
        sendResponse(responseData);
      }, 1500);
    });

    return true; // Keep the message channel open for async response
  }
  
  if (message.action === "report_post") {
    console.log("Reporting post to backend API:", message.postData);
    
    // Mock successful report logic
    setTimeout(() => {
      sendResponse({ success: true, message: "Post reported successfully." });
    }, 500);
    
    return true;
  }
});
