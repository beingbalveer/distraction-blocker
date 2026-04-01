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

let currentSite = null;
let currentPrefs = {};
let currentSchedule = { ...SCHEDULE_DEFAULTS };

document.addEventListener('DOMContentLoaded', () => {
  // Load schedule first (independent of tab detection)
  initSchedule();

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
