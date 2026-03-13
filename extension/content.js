// ShieldNet: Automatic Batch Scanner — No button, no clicks needed.
console.info('[ShieldNet] Auto-batch scanner active.');

const BACKEND_BATCH_URL = 'http://localhost:8080/api/analyze/batch';

// ─── Site Config ──────────────────────────────────────────────────────────────
const SITE_CONFIG = {
  'twitter.com': {
    platform: 'twitter',
    postSelector: 'article[data-testid="tweet"]',
    getContent: el => ({
      text: el.innerText?.trim() || '',
      author: el.querySelector('[data-testid="User-Name"] span')?.innerText?.trim() || 'unknown'
    })
  },
  'x.com': {
    platform: 'twitter',
    postSelector: 'article[data-testid="tweet"]',
    getContent: el => ({
      text: el.innerText?.trim() || '',
      author: el.querySelector('[data-testid="User-Name"] span')?.innerText?.trim() || 'unknown'
    })
  },
  'reddit.com': {
    platform: 'reddit',
    postSelector: 'shreddit-post, .Post, [id^="t3_"]',
    getContent: el => {
      const title = el.getAttribute('post-title') || el.querySelector('h1,h2,h3')?.innerText || '';
      const body  = el.querySelector('[data-click-id="text"]')?.innerText || '';
      const author = el.getAttribute('author')
        || el.querySelector('a[href*="/user/"],a[href*="/u/"]')?.innerText?.replace('u/','').trim()
        || 'unknown';
      return { text: (title + ' ' + body).trim(), author };
    }
  }
};

const site = Object.entries(SITE_CONFIG)
  .find(([domain]) => window.location.hostname.includes(domain))?.[1];

if (!site) {
  console.info('[ShieldNet] Unsupported site — scanner idle.');
}

// ─── Batch Queue ──────────────────────────────────────────────────────────────
const BATCH_SIZE      = 10;   // Posts per API call
const BATCH_DELAY_MS  = 1500; // Wait this long before sending a partial batch
let   pendingBatch    = [];
let   batchTimer      = null;
let   totalCallsMade  = 0;
const MAX_CALLS       = 200;

function queuePost(post, text, author) {
  if (totalCallsMade >= MAX_CALLS) return; // Hard session cap

  pendingBatch.push({ post, text, author });
  clearTimeout(batchTimer);

  if (pendingBatch.length >= BATCH_SIZE) {
    flushBatch();                            // Full batch — send immediately
  } else {
    batchTimer = setTimeout(flushBatch, BATCH_DELAY_MS); // Partial — wait
  }
}

async function flushBatch() {
  if (pendingBatch.length === 0) return;
  if (totalCallsMade >= MAX_CALLS) return;

  const chunk = pendingBatch.splice(0, BATCH_SIZE);
  totalCallsMade++;

  const payload = chunk.map(({ text, author }) => ({
    text, author, platform: site.platform
  }));

  console.log(`[ShieldNet] Batch call #${totalCallsMade} — ${chunk.length} posts`);

  try {
    const response = await fetch(BACKEND_BATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts: payload })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { results } = await response.json();

    // Debug: log what the API returned
    console.log('[ShieldNet] Batch results:', results?.map(r => ({
      score: r.fakeScore, verdict: r.verdict, flagged: r.flagged
    })));

    // Notify background.js for popup stats
    chrome.runtime.sendMessage({ action: 'batch_results', results }).catch(() => {});

    // Apply results to DOM
    chunk.forEach(({ post }, i) => {
      const result = results?.[i];
      if (!result) return;
      post.dataset.snResult = JSON.stringify(result);
      applyResult(post, result);
    });

  } catch (err) {
    console.warn('[ShieldNet] Batch error:', err.message);
    chunk.forEach(({ post }) => { post.dataset.snPending = null; });
  }
}

// ─── Apply Result to Post ─────────────────────────────────────────────────────
function applyResult(post, result) {
  const score = result?.fakeScore ?? result?.risk_score ?? 0;
  // Lower threshold to 30 so borderline content gets flagged
  const flagged = result?.flagged || score >= 30;

  console.log(`[ShieldNet] Post result: score=${score} flagged=${flagged} verdict=${result?.verdict}`);

  if (flagged) {
    applyBlurOverlay(post, result, score);
  }
}

// ─── Blur Overlay (fixed — no wrapper div, overlay is a direct child of post) ──
function applyBlurOverlay(post, result, score) {
  if (post.classList.contains('sn-protected')) return;
  post.classList.add('sn-protected');

  const riskLevel = score >= 70 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';
  const accent    = score >= 70 ? '#e11d48' : score >= 50 ? '#f59e0b' : '#f97316';

  // ── Step 1: blur all direct children of the post (safer than blurring post itself) ──
  Array.from(post.children).forEach(child => {
    child.style.filter = 'blur(5px)';
    child.style.pointerEvents = 'none';
    child.style.userSelect = 'none';
  });

  // ── Step 2: make post a positioning context ──
  const existingPos = window.getComputedStyle(post).position;
  if (existingPos === 'static') post.style.position = 'relative';

  // ── Step 3: inject overlay directly inside post ──
  const overlay = document.createElement('div');
  overlay.className = 'sn-shield-overlay';
  overlay.style.cssText = [
    'position:absolute',
    'top:0', 'left:0', 'right:0', 'bottom:0',
    'z-index:9999',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(15,23,42,0.75)',
    'backdrop-filter:blur(3px)',
    '-webkit-backdrop-filter:blur(3px)',
    'border-radius:inherit',
    'min-height:80px',
  ].join(';');

  overlay.innerHTML = `
    <div style="text-align:center;padding:16px 20px;max-width:320px">
      <div style="font-size:28px;margin-bottom:6px">⚠️</div>
      <div style="font-weight:800;font-size:14px;color:${accent};letter-spacing:0.5px;margin-bottom:4px">
        ${riskLevel} RISK &mdash; ${score}%
      </div>
      <p style="font-size:12px;color:#cbd5e1;margin:0 0 12px 0;line-height:1.5">
        ShieldNet flagged this as potentially <b style="color:white">${result.verdict || 'MISLEADING'}</b>.
      </p>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="sn-why-btn" style="
          padding:7px 16px;background:${accent};color:white;
          border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;
          box-shadow:0 2px 8px ${accent}55;">
          Why? 🔍
        </button>
        <button class="sn-dismiss-btn" style="
          padding:7px 16px;background:rgba(255,255,255,0.1);color:white;
          border:1px solid rgba(255,255,255,0.2);border-radius:8px;
          cursor:pointer;font-size:12px;font-weight:600;">
          Dismiss
        </button>
      </div>
    </div>
  `;

  overlay.querySelector('.sn-why-btn').addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    showAnalysisModal(result);
  });

  overlay.querySelector('.sn-dismiss-btn').addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    // Unblur children
    Array.from(post.children).forEach(child => {
      if (child === overlay) return;
      child.style.filter = '';
      child.style.pointerEvents = '';
      child.style.userSelect = '';
    });
    overlay.remove();
    post.classList.remove('sn-protected');
  });

  post.appendChild(overlay);

}

// ─── Analysis Modal (View why) ────────────────────────────────────────────────
function showAnalysisModal(data) {
  document.querySelector('.sn-modal-root')?.remove();

  const score     = data.fakeScore ?? data.risk_score ?? 0;
  const accent    = score >= 70 ? '#e11d48' : score >= 40 ? '#f59e0b' : '#10b981';
  const bgColor   = score >= 70 ? '#fff1f2' : score >= 40 ? '#fffbeb' : '#f0fdf4';
  const verdict   = data.verdict || (score >= 70 ? 'FAKE' : score >= 40 ? 'MISLEADING' : 'SAFE');

  const root = document.createElement('div');
  root.className = 'sn-modal-root';
  root.style.cssText = `
    position:fixed;inset:0;z-index:2147483647;
    background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;

  root.innerHTML = `
    <div style="
      background:white;border-radius:20px;max-width:480px;width:100%;
      box-shadow:0 25px 60px rgba(0,0,0,0.25);overflow:hidden;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #f1f5f9;">
        <div style="display:flex;align-items:center;gap:10px;font-weight:700;color:#0f172a;font-size:15px;">
          <div style="background:#4f46e5;color:white;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          ShieldNet — Fact Check
        </div>
        <div id="sn-close" style="cursor:pointer;color:#94a3b8;font-size:22px;line-height:1;padding:4px 8px;">&times;</div>
      </div>

      <!-- Verdict Card -->
      <div style="margin:16px 20px;background:${bgColor};border:1px solid ${accent}33;border-radius:14px;padding:20px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-40px;right:-40px;width:120px;height:120px;background:${accent};filter:blur(50px);opacity:0.12;border-radius:50%;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;position:relative;z-index:1;">
          <div>
            <div style="font-size:11px;font-weight:700;color:${accent}99;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">Verdict</div>
            <div style="font-size:26px;font-weight:900;color:${accent};">${verdict}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;font-weight:700;color:${accent}99;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">Risk Score</div>
            <div style="font-size:38px;font-weight:900;color:${accent};line-height:1;">${score}%</div>
          </div>
        </div>
        <div style="height:7px;background:rgba(0,0,0,0.06);border-radius:4px;overflow:hidden;position:relative;z-index:1;">
          <div style="height:100%;width:${score}%;background:${accent};border-radius:4px;transition:width 0.8s cubic-bezier(0.16,1,0.3,1);"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-top:10px;font-weight:500;position:relative;z-index:1;">
          <span>Analyzed by ShieldNet AI</span>
          <span>Confidence: ${data.confidence || 'Medium'}</span>
        </div>
      </div>

      <!-- Explanation -->
      <div style="padding:0 20px 16px;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Why is this flagged?</div>
        <p style="font-size:14px;color:#334155;line-height:1.65;margin:0;">${data.explanation || 'No explanation available.'}</p>
      </div>

      <!-- Sources -->
      ${(data.verified_sources || []).length > 0 ? `
      <div style="padding:0 20px 16px;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Sources</div>
        ${(data.verified_sources).map(s => {
          let host = '#'; try { host = new URL(s.url).hostname.replace('www.',''); } catch(_){}
          return `<a href="${s.url}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;text-decoration:none;margin-bottom:8px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><polyline points="16 3 21 3 21 8"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <div><div style="font-weight:600;color:#0f172a;font-size:12px;">${s.title}</div><div style="font-size:11px;color:#64748b;">${host}</div></div>
          </a>`;
        }).join('')}
      </div>` : ''}

      <!-- Footer -->
      <div style="padding:12px 20px 16px;border-top:1px solid #f1f5f9;">
        <button id="sn-close-btn" style="
          width:100%;padding:10px;background:#f1f5f9;border:none;
          border-radius:10px;font-size:13px;font-weight:600;color:#475569;
          cursor:pointer;transition:background 0.2s;">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(root);
  const close = () => root.remove();
  root.querySelector('#sn-close').onclick = close;
  root.querySelector('#sn-close-btn').onclick = close;
  root.addEventListener('click', e => { if (e.target === root) close(); });
}

// ─── Scanner ──────────────────────────────────────────────────────────────────
function scanPosts() {
  if (!site) return;

  document.querySelectorAll(site.postSelector).forEach(post => {
    if (post.dataset.snPending || post.dataset.snResult) return; // Already handled
    post.dataset.snPending = 'true';

    const { text, author } = site.getContent(post);
    if (!text || text.length < 20) {
      delete post.dataset.snPending;
      return;
    }

    queuePost(post, text, author);
  });
}

// ─── Observe DOM for new posts (infinite scroll) ──────────────────────────────
let debounceTimer;
new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(scanPosts, 400);
}).observe(document.body, { childList: true, subtree: true });

scanPosts(); // Initial scan
