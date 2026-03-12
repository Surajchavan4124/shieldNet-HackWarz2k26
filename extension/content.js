// ShieldNet Content Script - Multi-Platform Monitor
console.info("ShieldNet: Content script initialized and running.");

const DEBUG = true;
function log(...args) {
    if (DEBUG) {
        try {
            console.log("[ShieldNet]", ...args);
        } catch (e) {
            // Even console can fail in weird detached states
        }
    }
}

// Global state for cleanup
let observer = null;
let heartbeatInterval = null;

function stopAllOperations() {
    log("SHIELDNET SHUTDOWN: Stopping all observers and timers.");
    try {
        if (observer) observer.disconnect();
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        observer = null;
        heartbeatInterval = null;
    } catch (e) {}
}

function isContextValid() {
    try {
        if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
            stopAllOperations();
            return false;
        }
        return true;
    } catch (e) {
        stopAllOperations();
        return false;
    }
}

// Site-specific configurations
const SITE_CONFIGS = {
  'twitter.com': {
    platform: 'twitter',
    postSelector: 'article[data-testid="tweet"]',
    getAuthor: (post) => {
      const authorElement = post.querySelector('[data-testid="User-Name"]');
      return authorElement ? authorElement.innerText.split('\n')[0] : 'Unknown User';
    },
    getContent: (post) => post.innerText
  },
  'x.com': {
    platform: 'twitter',
    postSelector: 'article[data-testid="tweet"]',
    getAuthor: (post) => {
      const authorElement = post.querySelector('[data-testid="User-Name"]');
      return authorElement ? authorElement.innerText.split('\n')[0] : 'Unknown User';
    },
    getContent: (post) => post.innerText
  },
  'instagram.com': {
    platform: 'instagram',
    postSelector: 'article, div._ab3k',
    getAuthor: (post) => {
      const authorElement = post.querySelector('header h2, a[role="link"]');
      return authorElement ? authorElement.innerText : 'Unknown User';
    },
    getContent: (post) => post.innerText
  },
  'facebook.com': {
    platform: 'facebook',
    postSelector: 'div[role="article"]',
    getAuthor: (post) => {
      const authorElement = post.querySelector('strong a, h3 a');
      return authorElement ? authorElement.innerText : 'Unknown User';
    },
    getContent: (post) => post.innerText
  },
  'reddit.com': {
    platform: 'reddit',
    postSelector: 'shreddit-post, faceplate-tracker, .Post, [id^="t3_"]',
    getAuthor: (post) => {
      // Shreddit feed
      const subreddit = post.getAttribute('subreddit-prefixed-name');
      if (subreddit) return subreddit;
      const author = post.getAttribute('author');
      if (author) return `u/${author}`;

      // Search results
      const subLink = post.querySelector('a[href*="/r/"]:not([href*="/u/"]), a[class*="font-semibold"]');
      if (subLink) {
          const text = subLink.innerText.trim();
          if (text.startsWith('r/')) return text;
          if (text.length > 0 && !text.includes(' ') && text.length < 25) return `r/${text.replace(/^r\//, '')}`;
      }

      return 'r/unknown';
    },
    getContent: (post) => {
      const titleAttr = post.getAttribute('post-title');
      let text = post.innerText || '';
      
      // If we have a title attribute (shreddit-post), combine it
      if (titleAttr && !text.includes(titleAttr)) {
          text = `${titleAttr}\n${text}`;
      }
      
      return text;
    }
  }
};

function getSiteConfig() {
  try {
    const hostname = window.location.hostname;
    for (const domain in SITE_CONFIGS) {
      if (hostname.includes(domain)) return SITE_CONFIGS[domain];
    }
  } catch (e) {}
  return null;
}

const currentConfig = getSiteConfig();

function scanPosts() {
  if (!isContextValid()) return;
  if (!currentConfig) return;

  try {
      const posts = document.querySelectorAll(currentConfig.postSelector);
      log(`Heartbeat scan: Found ${posts.length} potential posts`);
      
      posts.forEach(post => {
        if (post.dataset.snScanned === "true" || post.dataset.snScanned === "loading") return;
        
        if (post.tagName.toLowerCase() === 'shreddit-post' && !post.getAttribute('author')) {
            return; // Wait for metadata
        }

        scanSpecificPost(post);
      });
  } catch (e) {
      log("Scan failed:", e.message);
  }
}

function scanSpecificPost(post) {
    if (!isContextValid()) return;
    if (post.dataset.snScanned === "true" || post.dataset.snScanned === "loading") return;
    post.dataset.snScanned = "loading"; 

    try {
        const text = currentConfig.getContent(post);
        const author = currentConfig.getAuthor(post);
        
        if (!text || text.trim().length < 5) {
            post.dataset.snScanned = ""; 
            return;
        }

        log(`Processing post by ${author}: "${text.substring(0, 30)}..."`);

        chrome.runtime.sendMessage({ 
          action: "analyze_post", 
          text: text.trim(),
          author: author,
          platform: currentConfig.platform,
          url: window.location.href
        }, (response) => {
          if (!isContextValid()) return;
          const error = chrome.runtime.lastError;
          if (error) {
              post.dataset.snScanned = ""; 
              return;
          }

          log(`Received response for ${author}: flagged=${response?.flagged}`);
          post.dataset.snScanned = "true";
          
          if (response && response.flagged) {
            applyBlurOverlay(post, response.explanation);
          }
        });
    } catch (e) {
        log("Post scan failed (likely context error):", e.message);
        post.dataset.snScanned = ""; 
    }
}

function applyBlurOverlay(postElement, explanation) {
  try {
      postElement.style.position = 'relative';
      const contentChild = postElement.firstElementChild;
      if (!contentChild) return;

      if (contentChild.classList.contains('sn-blurred-post')) return;
      contentChild.classList.add('sn-blurred-post');

      const overlay = document.createElement('div');
      overlay.className = 'sn-overlay-wrapper';
      overlay.innerHTML = `
        <div class="sn-warning-box">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Potential Misinformation
          </h3>
          <p>${explanation || "This post was flagged by ShieldNet."}</p>
          <button class="sn-reveal-btn">Show Anyway</button>
        </div>
      `;

      overlay.querySelector('.sn-reveal-btn').addEventListener('click', (e) => {
        e.stopPropagation(); 
        contentChild.classList.remove('sn-blurred-post');
        overlay.remove();
      });

      postElement.appendChild(overlay);
  } catch (e) {}
}

// Initialization and Event Listeners
try {
    if (isContextValid()) {
        observer = new MutationObserver((mutations) => {
          if (!isContextValid()) return;
          if (mutations.some(m => m.addedNodes.length > 0)) scanPosts();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!isContextValid()) return;
            if (message.action === "FORCE_SCAN") {
                document.querySelectorAll(currentConfig.postSelector).forEach(p => {
                    if (p.dataset.snScanned === "true") p.dataset.snScanned = "";
                });
                scanPosts();
                sendResponse({ success: true });
            }
        });

        heartbeatInterval = setInterval(scanPosts, 3000);
        setTimeout(scanPosts, 1000);
        setTimeout(scanPosts, 3000);
    }
} catch (e) {
    log("Initialization failed:", e.message);
}
