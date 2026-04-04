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

  try {
    chrome.storage.sync.get(storageKey, (result) => {
      if (chrome.runtime.lastError) return; // context invalidated mid-call
      const saved = result[storageKey] || {};
      const merged = { ...defaults, ...saved };
      callback(merged);
    });
  } catch {
    // Extension was reloaded while the tab was open — context is gone, do nothing
  }
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
 * Returns the count of elements currently hidden.
 * @param {Object} selectorMap - { sectionKey: cssSelector | [cssSelector, ...] }
 * @param {Object} preferences - { sectionKey: true/false } (true = hidden)
 * @returns {number} count of hidden elements
 */
function applyVisibility(selectorMap, preferences) {
  let hiddenCount = 0;
  for (const [key, selectors] of Object.entries(selectorMap)) {
    if (!selectors) continue;

    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    const shouldHide = preferences[key] === true; // only hide when explicitly enabled

    selectorList.forEach((selector) => {
      if (!selector) return;
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        el.style.setProperty('display', shouldHide ? 'none' : '', 'important');
        if (shouldHide) hiddenCount++;
      });
    });
  }
  return hiddenCount;
}

/**
 * Returns true if the given schedule is currently active.
 * @param {Object} schedule
 * @returns {boolean}
 */
function isScheduleActive(schedule) {
  if (!schedule || !schedule.enabled) return false;
  const now = new Date();
  const day = now.getDay(); // 0=Sun … 6=Sat
  if (!schedule.days || !schedule.days.includes(day)) return false;
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = (schedule.startHour ?? 9) * 60 + (schedule.startMin ?? 0);
  const endMins   = (schedule.endHour   ?? 17) * 60 + (schedule.endMin   ?? 0);
  return currentMins >= startMins && currentMins < endMins;
}

/**
 * Sets up a content script for a given site.
 * Handles initial load, MutationObserver for dynamic content, and live storage changes.
 * @param {string} siteName
 * @param {Object} selectorMap - { sectionKey: cssSelector | [cssSelector, ...] }
 */
/**
 * Injects (or removes) a <style> tag that hides custom user-defined selectors.
 * @param {string} customStr - newline-separated CSS selectors
 */
function applyCustomSelectors(customStr) {
  const STYLE_ID = 'db-custom-selectors';
  let style = document.getElementById(STYLE_ID);
  const selectors = (customStr || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (selectors.length === 0) {
    if (style) style.remove();
    return;
  }
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = selectors.map(s => `${s}{display:none!important}`).join('\n');
}

function initSiteBlocker(siteName, selectorMap) {
  const storageKey     = `prefs_${siteName}`;
  const masterKey      = `master_${siteName}`;
  const customKey      = `custom_selectors_${siteName}`;
  const urlPatternsKey = `url_patterns_${siteName}`;

  function showAll() {
    // Remove all blocking for this site
    const allShown = {};
    for (const key of Object.keys(getDefaults(siteName))) allShown[key] = false;
    applyVisibility(selectorMap, allShown);
    applyCustomSelectors('');
    reportBadge(0);
  }

  function apply() {
    try {
      chrome.storage.sync.get([storageKey, 'schedule', masterKey, customKey, urlPatternsKey], (result) => {
        if (chrome.runtime.lastError) return;

        // 1. Master switch — default true; show everything when off
        const masterEnabled = result[masterKey] !== false;
        if (!masterEnabled) { showAll(); return; }

        // 2. URL patterns — if set, only block on matching pages
        const urlPatternsStr = result[urlPatternsKey] || '';
        const patterns = urlPatternsStr.split('\n').map(s => s.trim()).filter(Boolean);
        if (patterns.length > 0 && !patterns.some(p => window.location.href.includes(p))) {
          showAll(); return;
        }

        // 3. Schedule — force-hide all sections when active
        const defaults = getDefaults(siteName);
        const saved = result[storageKey] || {};
        const prefs = { ...defaults, ...saved };
        const schedule = result['schedule'] || null;

        let hiddenCount = 0;
        if (isScheduleActive(schedule)) {
          const forced = {};
          for (const key of Object.keys(prefs)) forced[key] = true;
          hiddenCount = applyVisibility(selectorMap, forced);
        } else {
          hiddenCount = applyVisibility(selectorMap, prefs);
        }

        // 4. Custom selectors (always applied when master is on)
        applyCustomSelectors(result[customKey] || '');

        // 5. Report count to background for badge + all-time stats
        reportBadge(hiddenCount);
      });
    } catch {
      // Extension context invalidated after reload
    }
  }

  function reportBadge(count) {
    try {
      if (!chrome.runtime?.id) return;
      chrome.runtime.sendMessage({ type: 'badge-update', count });
      // Increment all-time counter in local storage
      if (count > 0) {
        chrome.storage.local.get('alltime_hidden', (r) => {
          if (chrome.runtime.lastError) return;
          chrome.storage.local.set({ alltime_hidden: (r.alltime_hidden || 0) + count });
        });
      }
    } catch {}
  }

  // Initial application
  apply();

  // Re-apply on DOM mutations (debounced — dynamic sites like Instagram fire
  // hundreds of mutations/sec; without debounce, storage reads hit Chrome's
  // rate limit and cause errors)
  let mutationTimer;
  const observer = new MutationObserver(() => {
    // Stop if extension was reloaded while the tab stayed open
    if (!chrome.runtime?.id) {
      observer.disconnect();
      return;
    }
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(apply, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Re-apply when any relevant storage key changes from the popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && (
      changes[storageKey] || changes['schedule'] ||
      changes[masterKey]  || changes[customKey]  || changes[urlPatternsKey]
    )) {
      apply();
    }
  });
}
