// ShieldNet Content Script - Multi-Platform Monitor
console.log("ShieldNet: Real-time screen monitor active");

const DEBUG = true;
function log(...args) {
    if (DEBUG) console.log("[ShieldNet]", ...args);
}

// Site-specific configurations for post detection and content extraction
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
    postSelector: 'article, div._ab3k', // Instagram post containers
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
    postSelector: 'shreddit-post, .Post, #siteTable [class*="thing"]',
    getAuthor: (post) => {
      const subreddit = post.getAttribute('subreddit-prefixed-name');
      if (subreddit) return subreddit;
      const author = post.getAttribute('author');
      if (author) return `u/${author}`;
      
      const subLink = post.querySelector('a[href^="/r/"], a[data-click-id="subreddit"]');
      if (subLink) return subLink.innerText;
      
      return 'r/unknown';
    },
    getContent: (post) => {
      const title = post.getAttribute('post-title') || '';
      const text = post.innerText || '';
      
      if (text.length < 10) {
          const desc = post.querySelector('[slot="description"], .usertext-body');
          if (desc) return title + '\n' + desc.innerText;
      }
      
      return `${title}\n${text}`;
    }
  }
};

function getSiteConfig() {
  const hostname = window.location.hostname;
  log(`Checking config for ${hostname}`);
  for (const domain in SITE_CONFIGS) {
    if (hostname.includes(domain)) {
      return SITE_CONFIGS[domain];
    }
  }
  return null;
}

const currentConfig = getSiteConfig();
if (currentConfig) log(`Config found for ${currentConfig.platform}`);

function scanPosts() {
  if (!currentConfig) return;

  const posts = document.querySelectorAll(currentConfig.postSelector);
  if (posts.length > 0) log(`Found ${posts.length} potential posts`);
  
  posts.forEach(post => {
    if (post.dataset.snScanned === "true" || post.dataset.snScanned === "loading") return;
    
    // For shreddit-post, wait for attributes if missing
    if (post.tagName.toLowerCase() === 'shreddit-post' && !post.getAttribute('author')) {
        // Try again in 500ms
        setTimeout(() => scanSpecificPost(post), 500);
        return;
    }

    scanSpecificPost(post);
  });
}

function scanSpecificPost(post) {
    if (post.dataset.snScanned === "true" || post.dataset.snScanned === "loading") return;
    post.dataset.snScanned = "loading"; 

    const text = currentConfig.getContent(post);
    const author = currentConfig.getAuthor(post);
    
    if (!text || text.trim().length < 5) {
        log(`Skipping short post from ${author}`);
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
      const error = chrome.runtime.lastError;
      if (error) {
          console.error(`[ShieldNet] Message failed: ${error.message}`);
          post.dataset.snScanned = ""; 
          return;
      }

      log(`Received response for post by ${author}: flagged=${response?.flagged}`);
      post.dataset.snScanned = "true";
      
      if (response && response.flagged) {
        applyBlurOverlay(post, response.explanation);
      }
    });
}

function applyBlurOverlay(postElement, explanation) {
  postElement.style.position = 'relative';

  const contentChild = postElement.firstElementChild;
  if (!contentChild) return;

  contentChild.classList.add('sn-blurred-post');

  const overlay = document.createElement('div');
  overlay.className = 'sn-overlay-wrapper';
  
  overlay.innerHTML = `
    <div class="sn-warning-box">
      <h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Potential Misinformation
      </h3>
      <p>${explanation || "This post was flagged by ShieldNet for containing unverified or potentially harmful claims."}</p>
      <button class="sn-reveal-btn">Show Anyway</button>
    </div>
  `;

  const btn = overlay.querySelector('.sn-reveal-btn');
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    contentChild.classList.remove('sn-blurred-post');
    overlay.remove();
  });

  postElement.appendChild(overlay);
}

// Observe DOM mutations to catch new posts as the user scrolls
const observer = new MutationObserver((mutations) => {
  let shouldScan = false;
  for (let mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldScan = true;
      break;
    }
  }
  if (shouldScan) {
    scanPosts();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Listen for forced scans from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "FORCE_SCAN") {
        log("Forced scan requested");
        // Reset scanned markers for current view to allow re-processing if content changed
        document.querySelectorAll(currentConfig.postSelector).forEach(p => {
            if (p.dataset.snScanned === "true") p.dataset.snScanned = "";
        });
        scanPosts();
        sendResponse({ success: true });
    }
});

// Run initial scans
setTimeout(scanPosts, 1000);
setTimeout(scanPosts, 3000);
setTimeout(scanPosts, 5000); // Extra safety scan
