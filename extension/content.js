// ShieldNet: Automatic Batch Scanner — No button, no clicks needed.
console.info('[ShieldNet] Auto-batch scanner active.');

const BACKEND_BATCH_URL = 'http://localhost:8080/api/analyze/batch';

// ─── Site Config ──────────────────────────────────────────────────────────────
const SITE_CONFIG = {
  'twitter.com': {
    platform: 'twitter',
    postSelector: 'article[data-testid="tweet"]',
    getContent: el => ({
      text: el.querySelector('[data-testid="tweetText"]')?.innerText?.trim() || el.innerText?.trim() || '',
      author: el.querySelector('[data-testid="User-Name"] span')?.innerText?.trim() || 'unknown'
    })
  },
  'x.com': {
    platform: 'twitter',
    postSelector: 'article[data-testid="tweet"]',
    getContent: el => ({
      text: el.querySelector('[data-testid="tweetText"]')?.innerText?.trim() || el.innerText?.trim() || '',
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

// ─── LOCAL KEYWORD SCORER (runs instantly, no API needed) ───────────────────
const MISINFO_SIGNALS = {
  // +25 each — blatant misinformation or scam indicators
  high: [
    // ── BLATANT FAKE NEWS & SCAMS (Force Blur) ──
    /\bfake news\b/i, /\bhoax\b/i, /\bscam alert\b/i, /they don'?t want you to know/i,
    /\bwake up people\b/i, /share before (it'?s )?deleted/i, /\bdeep.?state\b/i,
    /government (is )?hiding/i, /\bplandemic\b/i, /\bcrisis actor/i, /\bfalse flag\b/i,
    /stolen election/i, /election was rigged/i, /shadow government/i,
    /confirmed by (bbc|reuters) to be fake/i, /debunked by/i, /\bthis is fake/i,
    /\bscam\b/i, /\bfraud\b/i, /\bphishing\b/i, /\bit.?s a (scam|trap|fraud)/i,
    /click (here|this link).{0,20}(win|free|prize)/i,
    /\bgift card.{0,20}(pay|send|buy)/i, /\bsend.{0,15}bitcoin/i,
  ],
  // +12 each — suspicious signals
  medium: [
    /\bconspiracy\b/i, /\belites?\b/i, /\bthey'?re lying\b/i, /\bcensored\b/i,
    /\bsuppressed\b/i, /\bexposed\b/i, /what (they|media) won'?t (tell|show)/i,
    /\b100%\s*(proven|confirmed|effective)/i, /no one is talking about/i,
    /\bbreaking:?\b/i, /\burgent:?\b/i, /\bexclusive:?\b/i,
    /the truth about/i, /mainstream media (lies|hiding)/i,
    /\bsteal(ing)? (your|my).{0,15}(money|identity|account)/i,
    /report.{0,20}(transaction|fraud|scam)/i,
    /\bsuspicious (activity|link|email|message)/i,
    /\bdo not (click|open|reply)/i,
    /\bthis is (a|not) legitimate/i,
  ],
  // +8 each — claim indicators
  claims: [
    /scientists? (prove[sd]?|confir(m|med)|found)\b/i,
    /studies? (show|prove|confirm)/i,
    /according to (sources?|insiders?|whistleblower)/i,
    /(leaked|classified) document/i, /miracle cure/i,
    /naturally (cure|treat|heal)/i, /instantly (cure|stop|reverse)/i,
  ],
  // +6 each — emotional amplifiers
  emotional: [
    /!!{2,}/, /\bOMG\b/i, /\bshocking\b/i, /\bterrifyin/i,
    /\boutrageous\b/i, /\bmust (see|watch|read|share)/i, /\bviral\b/i,
    /BREAKING/,
  ]
};

function localScore(text) {
  if (!text || text.length < 15) return { score: 0, reason: '' };
  let score = 0;
  let hits = [];

  const check = (list, val, label) => {
    let found = false;
    for (const p of list) {
      if (p.test(text)) {
        score += val;
        found = true;
      }
    }
    if (found) hits.push(label);
  };

  // Check specific categories for better "Why?" info
  // ── Scams ──
  const scamPatterns = [
    /\bscam\b/i, /\bfraud\b/i, /\bphishing\b/i, /\bsim.?swap/i, /\bidentity theft/i,
    /sent.{0,15}by mistake/i, /send.{0,15}back/i, /wire transfer/i, /gift card/i, /bitcoin/i
  ];
  let isScam = false;
  for (const p of scamPatterns) if (p.test(text)) { isScam = true; score += 25; break; }
  if (isScam) hits.push("Common scam or phishing pattern detected");

  // ── Conspiracies ──
  const conspiracyPatterns = [
    /\bdeep.?state\b/i, /\bplandemic\b/i, /\b5g\b/i, /\bmicrochip\b/i, /\bcabal\b/i,
    /new world order/i, /stolen election/i, /chemtrail/i, /shadow government/i
  ];
  let isConspiracy = false;
  for (const p of conspiracyPatterns) if (p.test(text)) { isConspiracy = true; score += 25; break; }
  if (isConspiracy) hits.push("Known conspiracy theory keywords identified");

  // ── General Signals ──
  check(MISINFO_SIGNALS.medium, 12, "Suspicious or sensationalist language");
  check(MISINFO_SIGNALS.claims, 8, "Unverified scientific or medical claims");
  check(MISINFO_SIGNALS.emotional, 6, "Alarmist or highly emotional tone");

  // ALL-CAPS boost
  const words = text.split(/\s+/).filter(w => w.length > 3);
  if (words.length > 0) {
    const capsRatio = words.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w)).length / words.length;
    if (capsRatio > 0.35) {
      score += 15;
      hits.push("Aggressive use of capitalization (All-Caps)");
    }
  }

  const finalScore = Math.min(score, 100);
  let reason = hits.length > 0
    ? `ShieldNet local analysis found: ${hits.join(', ')}.`
    : "ShieldNet detected patterns commonly associated with misleading or malicious content.";

  return { score: finalScore, reason };
}

// ─── Batch Queue ──────────────────────────────────────────────────────────────
const BATCH_SIZE      = 10;   // Posts per API call
const BATCH_DELAY_MS  = 1500; // Wait this long before sending a partial batch
let   pendingBatch    = [];
let   batchTimer      = null;
let   totalCallsMade  = 0;
const MAX_CALLS       = 200;

// ── Visual Indicator for User ───────────────────────────────────────────────
function injectStatusIndicator() {
  if (document.getElementById('sn-status-indicator')) return;
  const div = document.createElement('div');
  div.id = 'sn-status-indicator';
  div.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#4f46e5;color:white;padding:8px 16px;border-radius:30px;font-size:12px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;gap:8px;pointer-events:none;transition:all 0.3s;';
  div.innerHTML = '<span style="width:8px;height:8px;background:#10b981;border-radius:50%;box-shadow:0 0 8px #10b981;"></span> ShieldNet Live';
  document.body.appendChild(div);
}

function queuePost(post, text, author) {
  if (totalCallsMade >= MAX_CALLS) return;
  injectStatusIndicator();

  // ── INSTANT local check — threshold 20: super aggressive for immediate feedback ──
  const { score: ls, reason: lsReason } = localScore(text);
  if (ls >= 20 && !post.classList.contains('sn-protected')) {
    const localResult = {
      text, author,
      fakeScore:   ls,
      risk_score:  ls,
      verdict:     ls >= 70 ? 'FAKE' : 'MISLEADING',
      confidence:  ls >= 70 ? 'High' : 'Medium',
      explanation: lsReason,
      flagged:     true
    };
    post.dataset.snLocalResult = JSON.stringify(localResult);
    applyBlurOverlay(post, localResult, ls);
    console.log(`[ShieldNet] LOCAL BLUR: score=${ls} on "${text.substring(0,40)}..."`);
  }

  pendingBatch.push({ post, text, author, localScore: ls, localReason: lsReason });
  clearTimeout(batchTimer);

  if (pendingBatch.length >= BATCH_SIZE) {
    flushBatch();
  } else {
    batchTimer = setTimeout(flushBatch, BATCH_DELAY_MS);
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

  console.log(`[ShieldNet] Requesting analysis for ${chunk.length} posts via background bridge...`);

  // Delegate fetch to background.js (proxy) to bypass Mixed Content blocks
  chrome.runtime.sendMessage({ 
    action: 'execute_batch_analysis', 
    posts: payload 
  }, (response) => {
    try {
      if (!response || !response.ok) {
        console.error('[ShieldNet] API bridge error:', response?.error || 'No response');
        chunk.forEach(item => { item.post.dataset.snPending = null; });
        return;
      }

      const { results } = response;
      console.log(`[ShieldNet] API response received for ${results.length} posts.`);

      // Apply results to DOM — take HIGHER of local vs API score
      const enriched = chunk.map(({ post, text, author, localScore: ls, localReason: lr }, i) => {
        const apiResult = results?.[i];
        const apiScore  = apiResult?.fakeScore ?? 0;
        const bestScore = Math.max(ls || 0, apiScore);
        return {
          post,
          result: {
            text, author,
            fakeScore:   bestScore,
            risk_score:  bestScore,
            verdict:     apiResult?.verdict  || (bestScore >= 70 ? 'FAKE' : bestScore >= 40 ? 'MISLEADING' : 'SAFE'),
            confidence:  apiResult?.confidence || (bestScore >= 60 ? 'High' : 'Medium'),
            explanation: apiResult?.explanation || lr || 'Local pattern analysis flagged this content.',
            flagged:     bestScore >= 30,
          }
        };
      });

      // Notify background.js
      chrome.runtime.sendMessage({ action: 'batch_results', results: enriched.map(e => e.result) }).catch(() => {});

      // Apply to DOM
      enriched.forEach(({ post, result }) => {
        post.dataset.snResult = JSON.stringify(result);
        const prevScore = post.dataset.snLocalResult
          ? (JSON.parse(post.dataset.snLocalResult).fakeScore || 0) : 0;
        if (result.fakeScore > prevScore) {
          post.querySelector('.sn-shield-overlay')?.remove();
          post.classList.remove('sn-protected');
          Array.from(post.children).forEach(c => {
            c.style.filter = ''; c.style.pointerEvents = ''; c.style.userSelect = '';
          });
        }
        applyResult(post, result);
      });
    } catch (err) {
      console.warn('[ShieldNet] Batch process error:', err.message);
      chunk.forEach(item => { item.post.dataset.snPending = null; });
    }
  });
}

// ─── Apply Result to Post ─────────────────────────────────────────────────────
function applyResult(post, result) {
  const score = result?.fakeScore ?? result?.risk_score ?? 0;
  // Lower threshold to 20 so borderline content gets flagged immediately
  const flagged = result?.flagged || score >= 20;

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

  // ── Step 1: blur all children with !important to defeat X's native styles ──
  Array.from(post.children).forEach(child => {
    child.style.setProperty('filter', 'blur(12px) grayscale(80%)', 'important');
    child.style.setProperty('pointer-events', 'none', 'important');
    child.style.setProperty('user-select', 'none', 'important');
  });

  // ── Step 2: make post a positioning context ──
  post.style.setProperty('position', 'relative', 'important');

  // ── Step 3: inject overlay directly inside post ──
  const overlay = document.createElement('div');
  overlay.className = 'sn-shield-overlay';
  overlay.style.cssText = [
    'position:absolute !important',
    'top:0 !important', 'left:0 !important', 'right:0 !important', 'bottom:0 !important',
    'z-index:2147483646 !important',
    'display:flex !important',
    'flex-direction:column !important',
    'align-items:center !important',
    'justify-content:center !important',
    'background:rgba(15,23,42,0.92) !important',
    'backdrop-filter:blur(8px) !important',
    'border-radius:inherit !important',
    'padding:20px !important'
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
    e.stopPropagation(); e.preventDefault();
    showAnalysisModal(result);
  });

  overlay.querySelector('.sn-dismiss-btn').addEventListener('click', e => {
    e.stopPropagation(); e.preventDefault();
    overlay.remove();
    post.classList.remove('sn-protected');
    post.dataset.snDismissed = 'true';
    Array.from(post.children).forEach(child => {
      child.style.filter = ''; child.style.pointerEvents = ''; child.style.userSelect = '';
    });
  });

  post.appendChild(overlay);

  // ── Step 4: Re-render Protection (Critical for X/React) ──
  // If X's React engine removes our overlay or resets styles, this observer pulls it back.
  const observer = new MutationObserver(() => {
    if (post.dataset.snDismissed === 'true') { observer.disconnect(); return; }
    if (!post.contains(overlay)) post.appendChild(overlay);
    Array.from(post.children).forEach(child => {
      if (child !== overlay && !child.style.filter.includes('blur')) {
        child.style.setProperty('filter', 'blur(12px) grayscale(80%)', 'important');
      }
    });
  });
  observer.observe(post, { childList: true, subtree: true, attributes: true });
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

      <!-- Analyzed Content Section -->
      <div style="margin:0 20px 16px; padding:15px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; position:relative;">
        <div style="font-size:10px; font-weight:700; color:#94a3b8; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px; display:flex; justify-content:space-between;">
          <span>Analyzed Content</span>
          <span style="color:#64748b;">u/${data.author || 'unknown'}</span>
        </div>
        <p style="font-size:13px; color:#475569; line-height:1.5; margin:0; font-style:italic;">
          "${data.text || 'No content captured.'}"
        </p>
      </div>

      <!-- Explanation -->
      <div style="padding:0 20px 16px;">
        <div style="font-size:10px; font-weight:700; color:#4f46e5; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px;">ShieldNet Analysis Explanation</div>
        <div style="display:flex; gap:12px;">
          <div style="flex-shrink:0; width:2px; background:#4f46e5; border-radius:2px;"></div>
          <p style="font-size:14px; color:#1e293b; line-height:1.6; margin:0; font-weight:500;">
            ${data.explanation || 'Our AI is flagging this content based on detected misinformation patterns related to scams or false claims.'}
          </p>
        </div>
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
