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
    document.getElementById('advanced-section').style.display = '';

    // Load prefs + master + custom + url patterns all at once
    const storageKey     = `prefs_${currentSite}`;
    const masterKey      = `master_${currentSite}`;
    const customKey      = `custom_selectors_${currentSite}`;
    const urlPatternsKey = `url_patterns_${currentSite}`;

    chrome.storage.sync.get([storageKey, masterKey, customKey, urlPatternsKey], (result) => {
      const defaults = SITE_DEFAULTS[currentSite] || {};
      const saved = result[storageKey] || {};
      currentPrefs = { ...defaults, ...saved };

      // Master switch
      const masterEnabled = result[masterKey] !== false;
      document.getElementById('master-enabled').checked = masterEnabled;
      updateTogglesDisabledState(!masterEnabled);

      // Advanced fields
      document.getElementById('custom-selectors').value = result[customKey] || '';
      document.getElementById('url-patterns').value = result[urlPatternsKey] || '';

      renderToggles();
    });
  });

  // Footer buttons
  document.getElementById('btn-hide-all').addEventListener('click', () => setAll(true));
  document.getElementById('btn-show-all').addEventListener('click', () => setAll(false));

  // Master switch
  document.getElementById('master-enabled').addEventListener('change', (e) => {
    if (!currentSite) return;
    updateTogglesDisabledState(!e.target.checked);
    chrome.storage.sync.set({ [`master_${currentSite}`]: e.target.checked });
  });

  // Advanced section toggle
  document.getElementById('advanced-toggle-btn').addEventListener('click', () => {
    const content = document.getElementById('advanced-content');
    const btn = document.getElementById('advanced-toggle-btn');
    const open = content.style.display === 'none';
    content.style.display = open ? 'flex' : 'none';
    btn.textContent = open ? '⚙ Advanced ▴' : '⚙ Advanced';
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

  // Import / Export
  document.getElementById('btn-export').addEventListener('click', exportSettings);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importSettings);

  // Schedule toggle
  document.getElementById('schedule-enabled').addEventListener('change', (e) => {
    currentSchedule.enabled = e.target.checked;
    document.getElementById('schedule-config').style.display = e.target.checked ? 'flex' : 'none';
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
  document.getElementById('popup-footer').style.display = 'none';
  document.getElementById('advanced-section').style.display = 'none';
  document.getElementById('unsupported-message').style.display = 'flex';
  document.getElementById('site-name').textContent = 'Not supported';
  document.querySelector('.site-dot').style.background = '#e94560';
}

function updateTogglesDisabledState(disabled) {
  const container = document.getElementById('toggles-container');
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.disabled = disabled;
  });
  container.style.opacity = disabled ? '0.4' : '';
  container.style.pointerEvents = disabled ? 'none' : '';
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
  const config = document.getElementById('schedule-config');

  enabledCheckbox.checked = currentSchedule.enabled;
  config.style.display = currentSchedule.enabled ? 'flex' : 'none';

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

// ── Import / Export ──────────────────────────────────────────────────────────

const EXPORT_KEYS = [
  ...ALL_SITES.flatMap(s => [
    `prefs_${s}`, `master_${s}`, `custom_selectors_${s}`, `url_patterns_${s}`
  ]),
  'schedule', 'profiles'
];

function exportSettings() {
  chrome.storage.sync.get(EXPORT_KEYS, (result) => {
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'distraction-blocker-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}

function importSettings(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      const toWrite = {};
      EXPORT_KEYS.forEach(k => { if (k in data) toWrite[k] = data[k]; });
      if (Object.keys(toWrite).length === 0) return;
      chrome.storage.sync.set(toWrite, () => { location.reload(); });
    } catch {
      // Invalid JSON — silently ignore
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // reset so same file can be re-imported
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
