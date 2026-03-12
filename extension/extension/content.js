// ShieldNet Content Script
console.log("ShieldNet: Content script loaded for real-time scanning");

// Example list of keywords that trigger the mock misinformation flag
const BAD_WORDS = [
  "scam", 
  "crypto 1000x", 
  "drinking bleach", 
  "cure cancer with salt",
  "table salt cures cancer",
  "buy this token",
  "guaranteed returns"
];

function scanPosts() {
  // Select Twitter/X posts (articles with data-testid="tweet")
  const posts = document.querySelectorAll('article[data-testid="tweet"]');
  
  posts.forEach(post => {
    // Check if we already processed this post
    if (post.dataset.snScanned) return;
    post.dataset.snScanned = "true";

    const text = post.innerText.toLowerCase();
    
    // Check for bad words
    const isFlagged = BAD_WORDS.some(word => text.includes(word));
    
    if (isFlagged) {
      applyBlurOverlay(post);
    } else {
      // Optional: Add a subtle verified safe badge for mock purposes
      addSafeBadge(post);
    }
  });
}

function applyBlurOverlay(postElement) {
  // Ensure the post container can hold our absolute overlay
  postElement.style.position = 'relative';

  // Get the main content container inside the article
  const contentChild = postElement.firstElementChild;
  if (!contentChild) return;

  // Add the blur class to the content itself
  contentChild.classList.add('sn-blurred-post');

  // Create the warning overlay
  const overlay = document.createElement('div');
  overlay.className = 'sn-overlay-wrapper';
  
  overlay.innerHTML = `
    <div class="sn-warning-box">
      <h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Potential Misinformation
      </h3>
      <p>This post was flagged by ShieldNet for containing unverified or potentially harmful claims.</p>
      <button class="sn-reveal-btn">Show Anyway</button>
    </div>
  `;

  // Handle the 'Show Anyway' button click
  const btn = overlay.querySelector('.sn-reveal-btn');
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent opening the tweet
    contentChild.classList.remove('sn-blurred-post');
    overlay.remove();
  });

  // Append overlay to the post container
  postElement.appendChild(overlay);
}

function addSafeBadge(postElement) {
  // Just a simple mock function, could attach a small green checkmark icon to the post header
  // Currently we just let safe posts pass through transparently
}

// Observe DOM mutations to catch new tweets as the user scrolls
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

// Start observing the body for injected tweets
observer.observe(document.body, { childList: true, subtree: true });

// Run an initial scan after a short delay to let the page load
setTimeout(scanPosts, 2000);
