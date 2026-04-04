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

// Schedule defaults
const SCHEDULE_DEFAULTS = {
  enabled: false,
  days: [1, 2, 3, 4, 5], // Mon–Fri (0=Sun … 6=Sat)
  startHour: 9,
  startMin: 0,
  endHour: 17,
  endMin: 0
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

const ALL_SITES = Object.keys(SITE_DEFAULTS);

let currentSite = null;
let currentPrefs = {};
let currentSchedule = { ...SCHEDULE_DEFAULTS };

document.addEventListener('DOMContentLoaded', () => {
  // Load schedule and profiles (independent of tab detection)
  initSchedule();
  initProfiles();

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

    // Show master switch and advanced section
    document.getElementById('master-toggle-wrap').style.display = '';
    document.getElementById('acc-advanced').style.display = '';

    // Load prefs + master + custom + url patterns all at once
    const storageKey     = `prefs_${currentSite}`;
    const masterKey      = `master_${currentSite}`;
    const customKey      = `custom_selectors_${currentSite}`;
    const urlPatternsKey = `url_patterns_${currentSite}`;

    chrome.storage.sync.get([storageKey, masterKey, customKey, urlPatternsKey], (result) => {
      const defaults = SITE_DEFAULTS[currentSite] || {};
      const saved = result[storageKey] || {};
      currentPrefs = { ...defaults, ...saved };

      // Master switch — restore persisted state (default false)
      const masterOn = result[masterKey] === true;
      document.getElementById('master-enabled').checked = masterOn;

      // Advanced fields
      document.getElementById('custom-selectors').value = result[customKey] || '';
      document.getElementById('url-patterns').value = result[urlPatternsKey] || '';

      renderToggles();
    });
  });

  // Master switch — toggles all sections on/off and persists its own state
  document.getElementById('master-enabled').addEventListener('change', (e) => {
    if (!currentSite) return;
    chrome.storage.sync.set({ [`master_${currentSite}`]: e.target.checked });
    setAll(e.target.checked);
  });

  // Custom selectors
  document.getElementById('custom-selectors').addEventListener('change', (e) => {
    if (!currentSite) return;
    chrome.storage.sync.set({ [`custom_selectors_${currentSite}`]: e.target.value });
  });

  // URL patterns
  document.getElementById('url-patterns').addEventListener('change', (e) => {
    if (!currentSite) return;
    chrome.storage.sync.set({ [`url_patterns_${currentSite}`]: e.target.value });
  });

  // Element picker
  document.getElementById('btn-picker').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['sites/picker.js']
      });
      window.close(); // close popup so picker is usable
    });
  });

  // Light/dark theme toggle
  chrome.storage.local.get('theme', (result) => {
    if (result.theme === 'light') document.body.classList.add('light');
    updateThemeBtn();
  });
  document.getElementById('btn-theme').addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });
    updateThemeBtn();
  });

  // Options page
  document.getElementById('btn-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Check for picker result and pre-fill custom selectors
  checkPickerResult();

  // Accordions
  initAccordions();

  // Schedule toggle
  document.getElementById('schedule-enabled').addEventListener('change', (e) => {
    currentSchedule.enabled = e.target.checked;
    updateScheduleStatus();
    saveSchedule();
  });

  // Time inputs
  document.getElementById('schedule-start').addEventListener('change', (e) => {
    const [h, m] = e.target.value.split(':').map(Number);
    currentSchedule.startHour = h;
    currentSchedule.startMin = m;
    saveSchedule();
    updateScheduleStatus();
  });

  document.getElementById('schedule-end').addEventListener('change', (e) => {
    const [h, m] = e.target.value.split(':').map(Number);
    currentSchedule.endHour = h;
    currentSchedule.endMin = m;
    saveSchedule();
    updateScheduleStatus();
  });
});

function showUnsupported() {
  document.getElementById('toggles-container').style.display = 'none';
  document.getElementById('acc-advanced').style.display = 'none';
  document.getElementById('unsupported-message').style.display = 'flex';
  document.getElementById('site-name').textContent = 'Not supported';
  document.querySelector('.site-dot').style.background = '#e94560';
}

// ── Accordions ───────────────────────────────────────────────────────────────

function initAccordions(defaults = {}) {
  document.querySelectorAll('.accordion-section').forEach((section) => {
    const key  = section.dataset.accKey;
    const btn  = section.querySelector('.accordion-header');
    const body = section.querySelector('.accordion-body');
    if (!btn || !body) return;

    const stored = localStorage.getItem(key);
    const isOpen = stored !== null ? stored === 'true' : (defaults[key] === true);
    setAccordionState(btn, body, isOpen);

    btn.addEventListener('click', (e) => {
      if (e.target.closest('.accordion-extras')) return;
      const nowOpen = body.hasAttribute('hidden');
      setAccordionState(btn, body, nowOpen);
      localStorage.setItem(key, String(nowOpen));
    });
  });
}

function setAccordionState(btn, body, open) {
  const chevron = btn.querySelector('.accordion-chevron');
  if (open) {
    body.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    body.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
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
  const checkboxes = document.querySelectorAll('#toggles-container input[type="checkbox"]');
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

// ── Schedule ────────────────────────────────────────────────────────────────

function initSchedule() {
  chrome.storage.sync.get('schedule', (result) => {
    currentSchedule = { ...SCHEDULE_DEFAULTS, ...(result.schedule || {}) };
    renderScheduleUI();
  });
}

function renderScheduleUI() {
  const enabledCheckbox = document.getElementById('schedule-enabled');

  enabledCheckbox.checked = currentSchedule.enabled;

  // Day buttons
  const daysContainer = document.getElementById('schedule-days');
  daysContainer.innerHTML = '';
  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  DAY_LABELS.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.className = 'day-btn' + (currentSchedule.days.includes(i) ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      const idx = currentSchedule.days.indexOf(i);
      if (idx >= 0) currentSchedule.days.splice(idx, 1);
      else currentSchedule.days.push(i);
      btn.classList.toggle('active', currentSchedule.days.includes(i));
      saveSchedule();
      updateScheduleStatus();
    });
    daysContainer.appendChild(btn);
  });

  // Time inputs
  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('schedule-start').value =
    `${pad(currentSchedule.startHour)}:${pad(currentSchedule.startMin)}`;
  document.getElementById('schedule-end').value =
    `${pad(currentSchedule.endHour)}:${pad(currentSchedule.endMin)}`;

  updateScheduleStatus();
}

function updateScheduleStatus() {
  const status = document.getElementById('schedule-status');
  if (!currentSchedule.enabled) {
    status.textContent = '';
    status.className = 'schedule-status';
    return;
  }
  if (isScheduleActiveLocal(currentSchedule)) {
    status.textContent = '⚡ Blocking active now';
    status.className = 'schedule-status active';
  } else {
    status.textContent = 'Outside scheduled hours';
    status.className = 'schedule-status inactive';
  }
}

function isScheduleActiveLocal(schedule) {
  if (!schedule.enabled) return false;
  const now = new Date();
  const day = now.getDay();
  if (!schedule.days.includes(day)) return false;
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = schedule.startHour * 60 + schedule.startMin;
  const endMins = schedule.endHour * 60 + schedule.endMin;
  return currentMins >= startMins && currentMins < endMins;
}

function saveSchedule() {
  chrome.storage.sync.set({ schedule: currentSchedule });
}

// ── Profiles ─────────────────────────────────────────────────────────────────

function initProfiles() {
  chrome.storage.sync.get('profiles', (result) => {
    renderProfilesUI(result.profiles || {});
  });

  document.getElementById('btn-profile-save').addEventListener('click', saveProfile);
  document.getElementById('btn-profile-load').addEventListener('click', loadProfile);
  document.getElementById('btn-profile-delete').addEventListener('click', deleteProfile);
}

function renderProfilesUI(profiles) {
  const select = document.getElementById('profiles-select');
  const current = select.value;
  select.innerHTML = '';

  const names = Object.keys(profiles);
  if (names.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— no saved profiles —';
    select.appendChild(opt);
  } else {
    names.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    // Restore selection if it still exists
    if (current && profiles[current]) select.value = current;
  }
}

function saveProfile() {
  const name = document.getElementById('profile-name-input').value.trim();
  if (!name) return;

  // Read all site prefs from storage, then save the snapshot as a profile
  const keys = ALL_SITES.map((s) => `prefs_${s}`);
  chrome.storage.sync.get(['profiles', ...keys], (result) => {
    const profiles = result.profiles || {};
    const snapshot = {};
    ALL_SITES.forEach((site) => {
      const defaults = SITE_DEFAULTS[site] || {};
      const saved = result[`prefs_${site}`] || {};
      snapshot[site] = { ...defaults, ...saved };
    });
    profiles[name] = snapshot;
    chrome.storage.sync.set({ profiles }, () => {
      document.getElementById('profile-name-input').value = '';
      renderProfilesUI(profiles);
      document.getElementById('profiles-select').value = name;
    });
  });
}

function loadProfile() {
  const name = document.getElementById('profiles-select').value;
  if (!name) return;

  chrome.storage.sync.get('profiles', (result) => {
    const profiles = result.profiles || {};
    const profile = profiles[name];
    if (!profile) return;

    // Write each site's prefs from the profile into storage
    const updates = {};
    ALL_SITES.forEach((site) => {
      if (profile[site]) updates[`prefs_${site}`] = profile[site];
    });

    chrome.storage.sync.set(updates, () => {
      // If we're on a supported site, refresh the toggles immediately
      if (currentSite && profile[currentSite]) {
        currentPrefs = { ...SITE_DEFAULTS[currentSite], ...profile[currentSite] };
        renderToggles();
      }
    });
  });
}

function deleteProfile() {
  const name = document.getElementById('profiles-select').value;
  if (!name) return;

  chrome.storage.sync.get('profiles', (result) => {
    const profiles = result.profiles || {};
    delete profiles[name];
    chrome.storage.sync.set({ profiles }, () => {
      renderProfilesUI(profiles);
    });
  });
}

// ── Theme ────────────────────────────────────────────────────────────────────
const SVG_SUN  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const SVG_MOON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

function updateThemeBtn() {
  const btn = document.getElementById('btn-theme');
  const isLight = document.body.classList.contains('light');
  btn.innerHTML = isLight ? SVG_MOON : SVG_SUN;
  btn.title = isLight ? 'Switch to dark theme' : 'Switch to light theme';
}

// ── Element picker result ─────────────────────────────────────────────────────
function checkPickerResult() {
  chrome.storage.local.get('picker_result', (result) => {
    if (!result.picker_result) return;
    const { selector, hostname, ts } = result.picker_result;
    // Only apply if fresh (< 5 min) and on same hostname as current site
    if (Date.now() - ts > 5 * 60 * 1000) return;
    if (!currentSite) return;

    // Check if hostname matches current site
    const siteHosts = Object.entries({
      'www.reddit.com': 'reddit', 'reddit.com': 'reddit',
      'www.youtube.com': 'youtube', 'youtube.com': 'youtube', 'm.youtube.com': 'youtube',
      'www.instagram.com': 'instagram', 'instagram.com': 'instagram',
      'www.facebook.com': 'facebook', 'facebook.com': 'facebook', 'm.facebook.com': 'facebook'
    });
    const matchedSite = siteHosts.find(([h]) => h === hostname)?.[1];
    if (matchedSite !== currentSite) return;

    // Append selector to custom selectors field
    const customKey = `custom_selectors_${currentSite}`;
    chrome.storage.sync.get(customKey, (r) => {
      const existing = (r[customKey] || '').trim();
      const newVal = existing ? `${existing}\n${selector}` : selector;
      document.getElementById('custom-selectors').value = newVal;
      chrome.storage.sync.set({ [customKey]: newVal });
      // Open the Advanced accordion so user sees the result
      const advSection = document.getElementById('acc-advanced');
      const advBtn  = advSection?.querySelector('.accordion-header');
      const advBody = advSection?.querySelector('.accordion-body');
      if (advBtn && advBody) {
        setAccordionState(advBtn, advBody, true);
        localStorage.setItem('acc-advanced', 'true');
      }
    });
    // Clear picker result
    chrome.storage.local.remove('picker_result');
  });
}
