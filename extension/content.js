// ShieldNet Professional: Ultimate Protection
console.info("ShieldNet: System Active");

const SITE_CONFIG = {
  'twitter.com': { 
    platform: 'twitter', 
    postSelector: 'article[data-testid="tweet"]',
    headerSelector: '[data-testid="User-Name"]',
    getContent: el => ({
      text: el.innerText,
      author: el.querySelector('[data-testid="User-Name"] span')?.innerText?.trim() || 'unknown'
    })
  },
  'x.com': { 
    platform: 'twitter', 
    postSelector: 'article[data-testid="tweet"]',
    headerSelector: '[data-testid="User-Name"]',
    getContent: el => ({
      text: el.innerText,
      author: el.querySelector('[data-testid="User-Name"] span')?.innerText?.trim() || 'unknown'
    })
  },
  'reddit.com': { 
    platform: 'reddit', 
    postSelector: 'shreddit-post, .Post, [id^="t3_"]',
    headerSelector: 'shreddit-post, shreddit-post-header, .Post__header, [data-testid="post-header-container"]',
    getContent: el => {
      const title = el.getAttribute('post-title') || el.querySelector('h1, h2, h3')?.innerText || '';
      const body = el.querySelector('[data-click-id="text"]')?.innerText || '';
      const author = el.getAttribute('author') 
        || el.querySelector('a[href*="/user/"], a[href*="/u/"]')?.innerText?.replace('u/', '').trim()
        || 'unknown';
      return { text: (title + " " + body).trim(), author };
    }
  }
};

const site = Object.entries(SITE_CONFIG).find(([domain]) => window.location.hostname.includes(domain))?.[1];

// ─── SCANNING ────────────────────────────────────────────────────────────────
function scanPosts() {
  if (!site) return;
  const posts = document.querySelectorAll(site.postSelector);
  posts.forEach(post => {
    if (post.dataset.snScanned) return;
    post.dataset.snScanned = "done";
    const badge = getOrCreateBadge(post);
    updateBadge(badge, 'dormant');
    reveal(post);
  });
}

// manual=true = triggered by user clicking badge — never auto-blur, but DO blur if genuinely flagged
async function processPost(post, force = false, manual = false) {
  if (force) delete post.dataset.snResult;

  const { text, author } = site.getContent(post);
  if (!text || text.length < 15) { reveal(post); return; }

  const badge = getOrCreateBadge(post);
  updateBadge(badge, 'scanning');

  chrome.runtime.sendMessage({
    action: "analyze_post",
    text, author,
    platform: site.platform,
    force
  }, (response) => {
    if (chrome.runtime.lastError || !response) {
      updateBadge(badge, 'error');
      reveal(post);
      return;
    }

    post.dataset.snResult = JSON.stringify(response);
    const risk = response.risk_score || 0;
    const flagged = response.flagged && risk >= 35;

    if (flagged) {
      // Auto-scan: always blur. Manual click: blur only if high confidence (≥55%)
      // This catches real misinfo on click while preventing false-positive blurring
      if (!manual || risk >= 55) {
        applyProtection(post, response);
      }
      updateBadge(badge, 'risk', risk);
    } else {
      updateBadge(badge, 'safe');
    }

    if (!manual) reveal(post);
  });
}

function reveal(post) {
  post.dataset.snScanned = "done";
  post.style.visibility = "visible";
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
// Returns existing badge on this post, or creates a new one. Prevents duplicates.
function getOrCreateBadge(post) {
  const existing = post.querySelector('.sn-header-badge');
  if (existing) return existing;
  return injectBadge(post);
}

function injectBadge(post) {
  const header = post.querySelector(site.headerSelector);
  if (!header) return null;

  const badge = document.createElement('span');
  badge.className = 'sn-header-badge sn-badge-dormant';
  badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" class="sn-svg-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Analyze`;

  // Placement
  if (site.platform === 'twitter') {
    // Append at the end of the username block so it sits naturally next to the handle
    header.appendChild(badge);
  } else if (site.platform === 'reddit') {
    let container = null;
    if (header.tagName === 'SHREDDIT-POST' && header.shadowRoot) {
      const shHeader = header.shadowRoot.querySelector('shreddit-post-header');
      if (shHeader?.shadowRoot) {
        container = shHeader.shadowRoot.querySelector('.flex.items-center') || shHeader.shadowRoot.querySelector('div');
      }
    }
    if (!container) {
      const authorLink = header.querySelector('a[href*="/user/"], a[href*="/u/"]');
      if (authorLink) container = authorLink.parentElement;
    }
    if (!container) container = header.querySelector('[data-testid="post-header-container"]') || header.querySelector('.Post__header');
    if (container) container.appendChild(badge); else header.prepend(badge);
  } else {
    header.appendChild(badge);
  }

  badge.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const data = post.dataset.snResult ? JSON.parse(post.dataset.snResult) : null;

    if (data && (data.isDeep || (data.explanation && data.explanation.length > 80))) {
      // Already have full analysis — show instantly
      showModal(data, post);
    } else {
      // Trigger deep analysis — manual=true
      updateBadge(badge, 'scanning');
      processPost(post, true, true);
      showModal(null, post);
    }
  };

  return badge;
}

function updateBadge(badge, state, score = 0) {
  if (!badge) return;
  if (state === 'risk') {
    badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" class="sn-svg-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> ${score}%`;
  } else if (state === 'safe') {
    badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" class="sn-svg-icon"><polyline points="20 6 9 17 4 12"></polyline></svg> Clear`;
  } else if (state === 'error') {
    badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" class="sn-svg-icon"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  } else if (state === 'dormant') {
    badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" class="sn-svg-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Analyze`;
  } else {
    badge.innerHTML = `<span class="sn-spin-inline"></span>`;
  }
}

// ─── PROTECTION OVERLAY ───────────────────────────────────────────────────────
function applyProtection(post, data) {
  if (post.classList.contains('sn-protected')) return;
  post.classList.add('sn-protected', 'sn-high-risk-blur');

  const wrap = document.createElement('div');
  wrap.className = 'sn-wrap';
  wrap.style.position = 'relative';
  post.parentNode.insertBefore(wrap, post);
  wrap.appendChild(post);

  const overlay = document.createElement('div');
  overlay.className = 'sn-overlay';
  overlay.innerHTML = `
    <div class="sn-warn-box">
      <div style="font-size:28px;margin-bottom:8px">⚠️</div>
      <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#1e293b">Potential Misinformation</h3>
      <p style="font-size:13px;color:#64748b;margin-bottom:16px">ShieldNet flagged this content as potentially false or misleading.</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="sn-btn-p" id="view-r">View Analysis</button>
        <button class="sn-btn-s" id="hide-r">Dismiss</button>
      </div>
    </div>
  `;

  overlay.querySelector('#view-r').onclick = () => {
    const current = post.dataset.snResult ? JSON.parse(post.dataset.snResult) : data;
    if (current?.isDeep) {
      showModal(current, post);
    } else {
      processPost(post, true, true);
      showModal(null, post);
    }
  };
  overlay.querySelector('#hide-r').onclick = () => {
    post.classList.remove('sn-high-risk-blur');
    overlay.remove();
  };

  wrap.appendChild(overlay);
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function showModal(data, postEl) {
  document.querySelector('.sn-modal-root')?.remove();

  const root = document.createElement('div');
  root.className = 'sn-modal-root';
  root.innerHTML = `
    <div class="sn-modal-c">
      <div class="sn-modal-h">
        <div style="display:flex;align-items:center;gap:12px;font-weight:700;color:#1e293b;font-size:16px;">
          <div style="background:#4f46e5;color:white;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          ShieldNet Analysis
        </div>
        <div id="close-m" style="cursor:pointer;color:#94a3b8;font-size:24px;line-height:1;transition:color 0.2s:hover{color:#0f172a}">&times;</div>
      </div>
      <div class="sn-modal-b">
        ${data ? getModalBody(data) : getLoadingBody()}
      </div>
      <div class="sn-modal-f">
        <button class="sn-btn-s" id="close-btn" style="flex:1">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(root);
  root.querySelector('#close-m').onclick = () => root.remove();
  root.querySelector('#close-btn').onclick = () => root.remove();

  if (!data) {
    const poll = setInterval(() => {
      if (postEl?.dataset.snResult) {
        const newData = JSON.parse(postEl.dataset.snResult);
        if (newData.isDeep || newData.explanation?.length > 80) {
          clearInterval(poll);
          const modalBody = root.querySelector('.sn-modal-b');
          if (modalBody) modalBody.innerHTML = getModalBody(newData);
        }
      }
    }, 500);

    setTimeout(() => {
      clearInterval(poll);
      const modalBody = root.querySelector('.sn-modal-b');
      if (modalBody?.querySelector('.sn-spin')) {
        const fallback = postEl?.dataset.snResult ? JSON.parse(postEl.dataset.snResult) : null;
        modalBody.innerHTML = fallback
          ? getModalBody(fallback)
          : `<div style="text-align:center;padding:40px 20px;color:#64748b">
               <div style="font-size:28px;margin-bottom:10px">⏱️</div>
               <b>Taking longer than expected</b>
               <p style="margin-top:8px;font-size:13px">The backend may be busy. Close and try again.</p>
             </div>`;
      }
    }, 35000);
  }
}

function getLoadingBody() {
  return `<div style="text-align:center;padding:50px 20px">
    <div class="sn-spin" style="margin:0 auto 16px"></div>
    <b style="color:#1e293b">Analyzing content...</b>
    <p style="color:#94a3b8;font-size:13px;margin-top:8px">Cross-checking with fact-check databases.</p>
  </div>`;
}

function getModalBody(data) {
  const risk = data.risk_score ?? 0;
  const isFlagged = risk >= 35;
  const isConsensus = data.breakdown && data.breakdown.consensus > 0;
  
  const accentColor = isFlagged ? '#e11d48' : '#10b981';
  const bgColor = isFlagged ? '#fff1f2' : '#ecfdf5';
  let verdict = data.verdict || (isFlagged ? 'MISLEADING' : 'CLEAR');
  if (verdict === 'SAFE') verdict = 'CLEAR';
  
  // Progress bar segments
  const barColor = risk >= 70 ? '#e11d48' : risk >= 40 ? '#f59e0b' : '#10b981';

  return `
    <div style="background:${bgColor};border:1px solid ${accentColor}33;border-radius:16px;padding:24px;margin-bottom:24px;position:relative;overflow:hidden">
      <!-- subtle background glow -->
      <div style="position:absolute;top:-50%;right:-10%;width:200px;height:200px;background:${accentColor};filter:blur(60px);opacity:0.1;border-radius:50%"></div>
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;position:relative;z-index:1">
        <div>
           <div style="font-size:12px;font-weight:700;color:${accentColor}99;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Verdict</div>
           <div style="font-size:24px;font-weight:800;color:${accentColor};letter-spacing:-0.5px">${verdict}</div>
        </div>
        <div style="text-align:right">
           <div style="font-size:12px;font-weight:700;color:${accentColor}99;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px">Risk</div>
           <div style="font-size:32px;font-weight:900;color:${accentColor};line-height:1;letter-spacing:-1px">${risk}%</div>
        </div>
      </div>
      <div style="height:8px;background:rgba(0,0,0,0.05);border-radius:4px;overflow:hidden;position:relative;z-index:1">
        <div style="height:100%;width:${risk}%;background:${barColor};border-radius:4px;transition:width 1s cubic-bezier(0.16, 1, 0.3, 1)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-top:12px;font-weight:500;position:relative;z-index:1">
        <span>${isConsensus ? 'Multi-Source Consensus' : 'AI Analysis'}</span>
        <span>Confidence: ${data.confidence || 'Medium'}</span>
      </div>
    </div>

    <div style="margin-bottom:24px">
      <div class="sn-label">ANALYSIS</div>
      <div style="color:#334155;font-size:15px;line-height:1.6;font-weight:400">
        ${cleanText(data.explanation)}
      </div>
    </div>

    ${(data.verified_sources || []).length > 0 ? `
    <div>
      <div class="sn-label">SOURCES</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${(data.verified_sources).map(s => {
          let hostname = '#';
          try { hostname = new URL(s.url).hostname.replace('www.', ''); } catch(e) {}
          return `<a href="${s.url}" target="_blank" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;text-decoration:none;transition:all 0.2s" onmouseover="this.style.borderColor='#cbd5e1';this.style.background='#f1f5f9';" onmouseout="this.style.borderColor='#e2e8f0';this.style.background='#f8fafc';">
            <div style="background:white;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(0,0,0,0.05);flex-shrink:0">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><polyline points="16 3 21 3 21 8"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;color:#0f172a;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px">${s.title}</div>
              <div style="font-size:12px;color:#64748b;font-weight:500">${hostname}</div>
            </div>
          </a>`;
        }).join('')}
      </div>
    </div>` : ''}
  `;
}

// Strip markdown formatting — just show plain readable text
function cleanText(text = "") {
  return text
    .replace(/###\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\n\n/g, '</p><p style="margin:10px 0 0">')
    .replace(/^/, '<p style="margin:0">')
    .replace(/$/, '</p>');
}

let timer;
const obs = new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(scanPosts, 300);
});
obs.observe(document.body, { childList: true, subtree: true });
scanPosts();
