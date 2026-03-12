// ShieldNet Content Script - Multi-Platform Monitor
console.info("ShieldNet: Content script initialized and running.");

const DEBUG = true;
function log(...args) {
    if (DEBUG) {
        try { console.log("[ShieldNet]", ...args); } catch (e) {}
    }
}

// Global state for cleanup
let observer = null;
let heartbeatInterval = null;

function stopAllOperations() {
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

// ─── Site Configs ────────────────────────────────────────────────────────────
const SITE_CONFIGS = {
  'twitter.com': {
    platform: 'twitter',
    postSelector: 'article[data-testid="tweet"]',
    getAuthor: (post) => {
      const el = post.querySelector('[data-testid="User-Name"]');
      return el ? el.innerText.split('\n')[0] : 'Unknown User';
    },
    getContent: (post) => post.innerText
  },
  'x.com': {
    platform: 'twitter',
    postSelector: 'article[data-testid="tweet"]',
    getAuthor: (post) => {
      const el = post.querySelector('[data-testid="User-Name"]');
      return el ? el.innerText.split('\n')[0] : 'Unknown User';
    },
    getContent: (post) => post.innerText
  },
  'instagram.com': {
    platform: 'instagram',
    postSelector: 'article, div._ab3k',
    getAuthor: (post) => {
      const el = post.querySelector('header h2, a[role="link"]');
      return el ? el.innerText : 'Unknown User';
    },
    getContent: (post) => post.innerText
  },
  'facebook.com': {
    platform: 'facebook',
    postSelector: 'div[role="article"]',
    getAuthor: (post) => {
      const el = post.querySelector('strong a, h3 a');
      return el ? el.innerText : 'Unknown User';
    },
    getContent: (post) => post.innerText
  },
  'reddit.com': {
    platform: 'reddit',
    postSelector: 'shreddit-post, faceplate-tracker, .Post, [id^="t3_"]',
    getAuthor: (post) => {
      const subreddit = post.getAttribute('subreddit-prefixed-name');
      if (subreddit) return subreddit;
      const author = post.getAttribute('author');
      if (author) return `u/${author}`;
      const subLink = post.querySelector('a[href*="/r/"]:not([href*="/u/"])');
      if (subLink) {
          const t = subLink.innerText.trim();
          if (t.startsWith('r/')) return t;
          if (t.length > 0 && t.length < 25) return `r/${t.replace(/^r\//, '')}`;
      }
      return 'r/unknown';
    },
    getContent: (post) => {
      const titleAttr = post.getAttribute('post-title');
      let text = post.innerText || '';
      if (titleAttr && !text.includes(titleAttr)) text = `${titleAttr}\n${text}`;
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

// ─── Scanning ─────────────────────────────────────────────────────────────────
function scanPosts() {
  if (!isContextValid() || !currentConfig) return;
  try {
    const posts = document.querySelectorAll(currentConfig.postSelector);
    if (posts.length > 0) log(`Heartbeat scan: Found ${posts.length} potential posts`);
    posts.forEach(post => {
      if (post.dataset.snScanned === "true" || post.dataset.snScanned === "loading") return;
      if (post.tagName.toLowerCase() === 'shreddit-post') {
        if (!post.getAttribute('author') && !post.getAttribute('post-title')) return;
      }
      scanSpecificPost(post);
    });
  } catch (e) { log("Scan failed:", e.message); }
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

        log(`Processing post by ${author}: "${text.substring(0, 40).replace(/\n/g, ' ')}..."`);

        chrome.runtime.sendMessage({
          action: "analyze_post",
          text: text.trim(),
          author: author,
          platform: currentConfig.platform,
          url: window.location.href
        }, (response) => {
          if (!isContextValid()) return;
          if (chrome.runtime.lastError) {
              log(`Message failed:`, chrome.runtime.lastError.message);
              post.dataset.snScanned = "";
              return;
          }
          log(`Response for ${author}: flagged=${response?.flagged}`);
          // Store full result on element for modal access
          try { post.dataset.snResult = JSON.stringify(response); } catch(e) {}
          post.dataset.snScanned = "true";
          if (response && response.flagged) {
            applyBlurOverlay(post, response);
          }
        });
    } catch (e) {
        log("Post scan failed:", e.message);
        post.dataset.snScanned = "";
    }
}

// ─── Blur Overlay ─────────────────────────────────────────────────────────────
function applyBlurOverlay(postElement, analysisData) {
  try {
    if (postElement.dataset.snOverlayApplied === 'true') return;
    postElement.dataset.snOverlayApplied = 'true';

    const author = analysisData.author || 'Unknown';
    log(`Applying overlay for ${author}`);

    const parent = postElement.parentElement;
    if (!parent) return;

    // Wrap the ENTIRE postElement in a container so the overlay
    // has a guaranteed, properly-sized bounding box.
    const container = document.createElement('div');
    container.className = 'sn-post-container';
    container.style.cssText = 'position: relative; display: block; width: 100%;';

    parent.insertBefore(container, postElement);
    container.appendChild(postElement);

    // Blur the whole post (not just a child) to cover all content types
    postElement.style.filter = 'blur(12px) grayscale(40%)';
    postElement.style.opacity = '0.6';
    postElement.style.pointerEvents = 'none';
    postElement.style.userSelect = 'none';
    postElement.style.transition = 'filter 0.3s ease, opacity 0.3s ease';

    // Build overlay
    const overlay = document.createElement('div');
    overlay.className = 'sn-overlay-wrapper';
    overlay.innerHTML = `
      <div class="sn-warning-box">
        <h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Potential Misinformation Detected
        </h3>
        <p>Content has been hidden for your safety.</p>
        <div class="sn-blur-actions">
          <button class="sn-action-btn sn-analysis-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            View Analysis
          </button>
          <button class="sn-action-btn sn-ignore-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Show Anyway
          </button>
        </div>
      </div>
    `;

    overlay.querySelector('.sn-analysis-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      let data = analysisData;
      try { const s = postElement.dataset.snResult; if (s) data = JSON.parse(s); } catch(err) {}
      showAnalysisReport(data);
    });

    overlay.querySelector('.sn-ignore-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      // Restore post and remove container
      postElement.style.filter = '';
      postElement.style.opacity = '';
      postElement.style.pointerEvents = '';
      postElement.style.userSelect = '';
      parent.insertBefore(postElement, container);
      container.remove();
      log(`Post revealed for ${author}`);
    });

    container.appendChild(overlay);
    log(`Overlay applied for ${author}`);
  } catch (e) { log("Overlay failed:", e.message); }
}



// ─── Analysis Report Modal ────────────────────────────────────────────────────
function showAnalysisReport(data) {
    const riskColor = data.risk_score > 80 ? '#ef4444' : '#f59e0b';
    const radius = 37;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((data.risk_score || 0) / 100) * circumference;

    const categoryLabel = (data.category || 'normal')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    const authorInitials = (data.author || 'UN').substring(0, 2).toUpperCase();
    const platformLabel = (data.platform || '').charAt(0).toUpperCase() + (data.platform || '').slice(1);

    const postTextSafe = (data.post_text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 400);

    const sources = data.verified_sources || [];
    const sourcesHtml = sources.length > 0 ? sources.map(s => {
        let domain = s.url;
        try { domain = new URL(s.url).hostname; } catch(e) {}
        return `
          <a href="${s.url}" target="_blank" class="sn-source-card">
            <div class="sn-source-left">
              <div class="sn-source-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <div class="sn-source-info"><b>${s.title}</b><small>${domain}</small></div>
            </div>
            <svg class="sn-source-link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>`;
    }).join('') : `<p style="color:#64748b;font-size:13px;margin:0;">No sources available for this category.</p>`;

    const modal = document.createElement('div');
    modal.className = 'sn-modal-overlay';
    modal.innerHTML = `
      <div class="sn-modal-container">
        <div class="sn-modal-header">
          <h2>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="${riskColor}">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            ShieldNet Analysis Report
          </h2>
          <button class="sn-modal-close" id="sn-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="sn-modal-body">
          <div class="sn-section-label">Original Post</div>
          <div class="sn-original-post-box">
            <div class="sn-post-author">
              <div class="sn-author-avatar">${authorInitials}</div>
              <div class="sn-author-info">
                <span>${data.author || 'Unknown'}</span>
                <small>${platformLabel}</small>
              </div>
            </div>
            <div class="sn-post-content">${postTextSafe}</div>
          </div>

          <div class="sn-analysis-grid">
            <div class="sn-gauge-wrapper">
              <svg class="sn-gauge-svg" width="90" height="90">
                <circle class="sn-gauge-bg" cx="45" cy="45" r="${radius}"></circle>
                <circle class="sn-gauge-fill" cx="45" cy="45" r="${radius}"
                  style="stroke:${riskColor}; stroke-dashoffset:${offset}"></circle>
              </svg>
              <div class="sn-gauge-text">
                <b style="color:${riskColor}">${data.risk_score || 0}%</b>
                <small>Fake Prob.</small>
              </div>
            </div>
            <div class="sn-analysis-overview">
              <h3 style="color:${riskColor}">${categoryLabel} Detected</h3>
              <p>ShieldNet AI has analyzed this content and detected potentially misleading claims with high confidence.</p>
              <div class="sn-tags">
                <span class="sn-tag" style="color:${riskColor};border-color:${riskColor}33;background:${riskColor}11">HIGH RISK</span>
                <span class="sn-tag sn-tag-conf">High Confidence</span>
              </div>
            </div>
          </div>

          <div class="sn-section-label">AI Explanation</div>
          <div class="sn-explanation-box" style="border-left-color:${riskColor}">
            <div class="sn-section-title" style="color:${riskColor}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              AI Analysis Result
            </div>
            <div class="sn-explanation-text">${data.explanation || 'This post has been flagged by ShieldNet.'}</div>
          </div>

          <div class="sn-section-label">Verified Sources</div>
          <div class="sn-sources-list">${sourcesHtml}</div>
        </div>
        <div class="sn-modal-footer">
          <button class="sn-footer-btn sn-btn-report" id="sn-report-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              <line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
            Report Post
          </button>
          <button class="sn-footer-btn sn-btn-dismiss" id="sn-dismiss-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Dismiss
          </button>
        </div>
      </div>
    `;

    const closeModal = () => modal.remove();

    modal.querySelector('#sn-close-btn').addEventListener('click', closeModal);
    modal.querySelector('#sn-dismiss-btn').addEventListener('click', closeModal);
    modal.querySelector('#sn-report-btn').addEventListener('click', () => {
        if (!isContextValid()) return;
        chrome.runtime.sendMessage({ action: "report_post", postData: data }, (res) => {
            alert(res?.message || "Post reported.");
            closeModal();
        });
    });
    // Clicking outside container closes modal
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    // Prevent inside click from propagating
    modal.querySelector('.sn-modal-container').addEventListener('click', (e) => e.stopPropagation());

    document.body.appendChild(modal);
}

// ─── Initialization ───────────────────────────────────────────────────────────
try {
    if (isContextValid()) {
        observer = new MutationObserver((mutations) => {
          if (!isContextValid()) return;
          if (mutations.some(m => m.addedNodes.length > 0)) scanPosts();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!isContextValid()) return;
            if (message.action === "FORCE_SCAN" && currentConfig) {
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
