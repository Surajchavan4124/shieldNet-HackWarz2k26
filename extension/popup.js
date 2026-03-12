document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active to clicked
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
  });

  // Main Toggle Logic
  const mainToggle = document.getElementById('main-toggle');
  const platformDetect = document.querySelector('.platform-detect');
  const platformText = document.querySelector('.platform-text');
  const dot = document.querySelector('.dot');

  // Load from storage
  chrome.storage.local.get(['shieldNetActive'], (result) => {
    const isActive = result.shieldNetActive !== false;
    mainToggle.checked = isActive;
    updateStatusUI(isActive);
  });

  mainToggle.addEventListener('change', (e) => {
    const isActive = e.target.checked;
    chrome.storage.local.set({ shieldNetActive: isActive });
    updateStatusUI(isActive);
  });

  function updateStatusUI(isActive) {
    if (isActive) {
      platformDetect.className = 'platform-detect active glass';
      platformText.textContent = 'Active on Twitter/X';
      platformText.className = 'platform-text text-green';
      dot.className = 'dot green';
    } else {
      platformDetect.className = 'platform-detect inactive glass';
      platformText.textContent = 'Protection Disabled';
      platformText.className = 'platform-text text-red';
      dot.className = 'dot red';
    }
    platformDetect.style = '';
    platformText.style = '';
    dot.style = '';
  }

  // Range Slider Logic
  const slider = document.querySelector('.range-slider');
  const sliderValue = document.querySelector('.slider-value');
  
  slider.addEventListener('input', (e) => {
    sliderValue.textContent = `${e.target.value}%`;
    // Would save to chrome.storage here
  });

  // Action Buttons
  document.getElementById('rescan-btn').addEventListener('click', () => {
    const btn = document.getElementById('rescan-btn');
    btn.textContent = 'SCANNING...';
    setTimeout(() => btn.textContent = 'RE-SCAN', 1000);
  });

  document.getElementById('dashboard-btn').addEventListener('click', () => {
    // Open full dashboard in new tab
    chrome.tabs.create({ url: 'dashboard.html' });
  });
});
