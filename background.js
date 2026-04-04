/**
 * Background service worker — Distraction Blocker
 * Handles: onboarding, keyboard shortcuts, badge counter, element picker results
 */

// Map hostname → site key (duplicated from popup for SW context)
const HOST_TO_SITE = {
  'www.reddit.com': 'reddit', 'reddit.com': 'reddit',
  'www.youtube.com': 'youtube', 'youtube.com': 'youtube', 'm.youtube.com': 'youtube',
  'www.instagram.com': 'instagram', 'instagram.com': 'instagram',
  'www.facebook.com': 'facebook', 'facebook.com': 'facebook', 'm.facebook.com': 'facebook'
};

// In-memory badge counts (resets when SW hibernates — content scripts resend on next mutation)
const tabCounts = {};

// ── Onboarding ──────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  }
});

// ── Keyboard shortcut ───────────────────────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-blocking') return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.url) return;
    try {
      const { hostname } = new URL(tabs[0].url);
      const site = HOST_TO_SITE[hostname];
      if (!site) return;

      const key = `master_${site}`;
      chrome.storage.sync.get(key, (result) => {
        // Default is true (enabled); toggle to opposite
        const current = result[key] !== false;
        chrome.storage.sync.set({ [key]: !current });
      });
    } catch {}
  });
});

// ── Message handler ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Content script reporting hidden element count → update badge
  if (message.type === 'badge-update' && sender.tab) {
    const tabId = sender.tab.id;
    const count = message.count || 0;
    tabCounts[tabId] = count;

    const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#e94560', tabId });
  }

  // Popup requesting count for current tab
  if (message.type === 'get-count') {
    sendResponse({ count: tabCounts[message.tabId] || 0 });
    return true; // async response
  }

  // Popup requesting session-wide total (sum across all tabs)
  if (message.type === 'get-total-count') {
    const total = Object.values(tabCounts).reduce((a, b) => a + b, 0);
    sendResponse({ total });
    return true;
  }
});

// ── Clear badge on navigation ───────────────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    delete tabCounts[tabId];
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabCounts[tabId];
});
