/**
 * Popup script for Distraction Blocker.
 * Detects the current tab's site, renders toggles, and saves preferences.
 */

// Site configurations — must match SITE_DEFAULTS in shared/utils.js
const SITE_CONFIG = {
  reddit: {
    label: 'Reddit',
    sections: {
      header: 'Header',
      leftSidebar: 'Left Sidebar',
      rightSidebar: 'Right Sidebar'
    }
  },
  youtube: {
    label: 'YouTube',
    sections: {
      header: 'Header',
      sidebar: 'Sidebar',
      recommendations: 'Recommendations',
      comments: 'Comments',
      shorts: 'Shorts'
    }
  },
  instagram: {
    label: 'Instagram',
    sections: {
      stories: 'Stories',
      suggestions: 'Suggestions',
      explore: 'Explore',
      reels: 'Reels'
    }
  },
  facebook: {
    label: 'Facebook',
    sections: {
      header: 'Header',
      leftSidebar: 'Left Sidebar',
      rightSidebar: 'Right Sidebar',
      stories: 'Stories',
      reels: 'Reels'
    }
  }
};

// Map hostnames to site keys
const HOST_TO_SITE = {
  'www.reddit.com': 'reddit',
  'reddit.com': 'reddit',
  'www.youtube.com': 'youtube',
  'youtube.com': 'youtube',
  'm.youtube.com': 'youtube',
  'www.instagram.com': 'instagram',
  'instagram.com': 'instagram',
  'www.facebook.com': 'facebook',
  'facebook.com': 'facebook',
  'm.facebook.com': 'facebook'
};

// Default preferences (all visible — nothing hidden until user enables)
const SITE_DEFAULTS = {
  reddit: { header: false, leftSidebar: false, rightSidebar: false },
  youtube: { header: false, sidebar: false, recommendations: false, comments: false, shorts: false },
  instagram: { stories: false, suggestions: false, explore: false, reels: false },
  facebook: { header: false, leftSidebar: false, rightSidebar: false, stories: false, reels: false }
};

let currentSite = null;
let currentPrefs = {};

document.addEventListener('DOMContentLoaded', () => {
  // Detect current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0] || !tabs[0].url) {
      showUnsupported();
      return;
    }

    try {
      const url = new URL(tabs[0].url);
      currentSite = HOST_TO_SITE[url.hostname] || null;
    } catch {
      currentSite = null;
    }

    if (!currentSite || !SITE_CONFIG[currentSite]) {
      showUnsupported();
      return;
    }

    // Update site badge
    document.getElementById('site-name').textContent = SITE_CONFIG[currentSite].label;

    // Load preferences and render toggles
    const storageKey = `prefs_${currentSite}`;
    chrome.storage.sync.get(storageKey, (result) => {
      const defaults = SITE_DEFAULTS[currentSite] || {};
      const saved = result[storageKey] || {};
      currentPrefs = { ...defaults, ...saved };
      renderToggles();
    });
  });

  // Footer buttons
  document.getElementById('btn-hide-all').addEventListener('click', () => setAll(true));
  document.getElementById('btn-show-all').addEventListener('click', () => setAll(false));
});

function showUnsupported() {
  document.getElementById('toggles-container').style.display = 'none';
  document.getElementById('popup-footer').style.display = 'none';
  document.getElementById('unsupported-message').style.display = 'flex';
  document.getElementById('site-name').textContent = 'Not supported';
  document.querySelector('.site-dot').style.background = '#e94560';
}

function renderToggles() {
  const container = document.getElementById('toggles-container');
  container.innerHTML = '';

  const sections = SITE_CONFIG[currentSite].sections;

  for (const [key, label] of Object.entries(sections)) {
    const row = document.createElement('div');
    row.className = 'toggle-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'toggle-label';
    labelEl.textContent = label;

    const switchEl = document.createElement('label');
    switchEl.className = 'toggle-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = currentPrefs[key] === true; // ON = hidden
    input.dataset.key = key;

    input.addEventListener('change', (e) => {
      currentPrefs[key] = e.target.checked;
      savePreferences();
    });

    const slider = document.createElement('span');
    slider.className = 'toggle-slider';

    switchEl.appendChild(input);
    switchEl.appendChild(slider);

    row.appendChild(labelEl);
    row.appendChild(switchEl);
    container.appendChild(row);
  }
}

function setAll(hidden) {
  const checkboxes = document.querySelectorAll('.toggle-switch input');
  checkboxes.forEach((cb) => {
    cb.checked = hidden;
    currentPrefs[cb.dataset.key] = hidden;
  });
  savePreferences();
}

function savePreferences() {
  if (!currentSite) return;
  const storageKey = `prefs_${currentSite}`;
  chrome.storage.sync.set({ [storageKey]: currentPrefs });
}
