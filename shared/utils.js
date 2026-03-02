/**
 * Shared utilities for Distraction Blocker extension.
 * Loaded as an additional content script alongside each site's content.js.
 */

/**
 * Default section definitions per site.
 * Each key is a human-readable section name; value is the default hidden state.
 * false = visible (default), true = hidden.
 */
const SITE_DEFAULTS = {
  reddit: {
    header: false,
    leftSidebar: false,
    rightSidebar: false
  },
  youtube: {
    header: false,
    sidebar: false,
    recommendations: false,
    comments: false,
    shorts: false
  },
  instagram: {
    stories: false,
    suggestions: false,
    explore: false,
    reels: false
  },
  facebook: {
    header: false,
    leftSidebar: false,
    rightSidebar: false,
    stories: false,
    reels: false
  }
};

/**
 * Returns the default preferences for a site.
 * @param {string} siteName
 * @returns {Object} defaults map
 */
function getDefaults(siteName) {
  return SITE_DEFAULTS[siteName] || {};
}

/**
 * Loads user preferences for a site from chrome.storage.sync,
 * merged with defaults so new sections always have a value.
 * @param {string} siteName
 * @param {function} callback - receives merged preferences object
 */
function loadPreferences(siteName, callback) {
  const defaults = getDefaults(siteName);
  const storageKey = `prefs_${siteName}`;

  chrome.storage.sync.get(storageKey, (result) => {
    const saved = result[storageKey] || {};
    // Merge: saved values override defaults
    const merged = { ...defaults, ...saved };
    callback(merged);
  });
}

/**
 * Saves user preferences for a site to chrome.storage.sync.
 * @param {string} siteName
 * @param {Object} preferences
 * @param {function} [callback]
 */
function savePreferences(siteName, preferences, callback) {
  const storageKey = `prefs_${siteName}`;
  chrome.storage.sync.set({ [storageKey]: preferences }, callback);
}

/**
 * Applies visibility rules based on preferences.
 * @param {Object} selectorMap - { sectionKey: cssSelector | [cssSelector, ...] }
 * @param {Object} preferences - { sectionKey: true/false } (true = hidden)
 */
function applyVisibility(selectorMap, preferences) {
  for (const [key, selectors] of Object.entries(selectorMap)) {
    if (!selectors) continue;
    
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    const shouldHide = preferences[key] === true; // only hide when explicitly enabled

    selectorList.forEach((selector) => {
      if (!selector) return;
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        el.style.setProperty('display', shouldHide ? 'none' : '', 'important');
      });
    });
  }
}

/**
 * Sets up a content script for a given site.
 * Handles initial load, MutationObserver for dynamic content, and live storage changes.
 * @param {string} siteName
 * @param {Object} selectorMap - { sectionKey: cssSelector | [cssSelector, ...] }
 */
function initSiteBlocker(siteName, selectorMap) {
  function apply() {
    loadPreferences(siteName, (prefs) => {
      applyVisibility(selectorMap, prefs);
    });
  }

  // Initial application
  apply();

  // Re-apply on DOM mutations (for dynamically loaded content)
  const observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true });

  // Re-apply when preferences change from the popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[`prefs_${siteName}`]) {
      apply();
    }
  });
}
