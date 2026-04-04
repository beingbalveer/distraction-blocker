/**
 * Options page script — Distraction Blocker
 */

const SITE_CONFIG = {
  reddit:    { label: 'Reddit',    sections: { header: 'Header', leftSidebar: 'Left Sidebar', rightSidebar: 'Right Sidebar' } },
  youtube:   { label: 'YouTube',   sections: { header: 'Header', sidebar: 'Sidebar', recommendations: 'Recommendations', comments: 'Comments', shorts: 'Shorts' } },
  instagram: { label: 'Instagram', sections: { stories: 'Stories', suggestions: 'Suggestions', explore: 'Explore', reels: 'Reels' } },
  facebook:  { label: 'Facebook',  sections: { header: 'Header', leftSidebar: 'Left Sidebar', rightSidebar: 'Right Sidebar', stories: 'Stories', reels: 'Reels' } }
};

const SITE_DEFAULTS = {
  reddit:    { header: false, leftSidebar: false, rightSidebar: false },
  youtube:   { header: false, sidebar: false, recommendations: false, comments: false, shorts: false },
  instagram: { stories: false, suggestions: false, explore: false, reels: false },
  facebook:  { header: false, leftSidebar: false, rightSidebar: false, stories: false, reels: false }
};

const ALL_SITES = Object.keys(SITE_DEFAULTS);

const SCHEDULE_DEFAULTS = { enabled: false, days: [1,2,3,4,5], startHour: 9, startMin: 0, endHour: 17, endMin: 0 };

const EXPORT_KEYS = [
  ...ALL_SITES.flatMap(s => [`prefs_${s}`, `master_${s}`, `custom_selectors_${s}`, `url_patterns_${s}`]),
  'schedule', 'profiles'
];

let currentSchedule = { ...SCHEDULE_DEFAULTS };
let prefs = {};

// ── Tab navigation ──────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(`tab-${tab}`)?.classList.add('active');

    if (tab === 'stats') refreshStats();
  });
});

// ── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadAllPrefs();
  initSchedule();
  initProfiles();
  initImportExport();

  // Version badge
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version-badge').textContent = `v${manifest.version}`;
});

// ── Site toggles ────────────────────────────────────────────────────────────
function loadAllPrefs() {
  const keys = ALL_SITES.map(s => `prefs_${s}`);
  chrome.storage.sync.get(keys, (result) => {
    ALL_SITES.forEach(site => {
      const saved = result[`prefs_${site}`] || {};
      prefs[site] = { ...SITE_DEFAULTS[site], ...saved };
      renderSiteToggles(site);
    });
  });
}

function renderSiteToggles(site) {
  const container = document.getElementById(`toggles-${site}`);
  if (!container) return;
  container.innerHTML = '';
  const sections = SITE_CONFIG[site].sections;
  for (const [key, label] of Object.entries(sections)) {
    const row = document.createElement('div');
    row.className = 'toggle-row';

    const lbl = document.createElement('span');
    lbl.className = 'toggle-label';
    lbl.textContent = label;

    const sw = document.createElement('label');
    sw.className = 'toggle-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = prefs[site][key] === true;
    input.addEventListener('change', () => {
      prefs[site][key] = input.checked;
      chrome.storage.sync.set({ [`prefs_${site}`]: prefs[site] });
    });

    const slider = document.createElement('span');
    slider.className = 'toggle-slider';

    sw.appendChild(input);
    sw.appendChild(slider);
    row.appendChild(lbl);
    row.appendChild(sw);
    container.appendChild(row);
  }
}

// ── Schedule ────────────────────────────────────────────────────────────────
function initSchedule() {
  chrome.storage.sync.get('schedule', (result) => {
    currentSchedule = { ...SCHEDULE_DEFAULTS, ...(result.schedule || {}) };
    renderSchedule();
  });

  document.getElementById('schedule-enabled').addEventListener('change', (e) => {
    currentSchedule.enabled = e.target.checked;
    saveSchedule();
    updateScheduleStatus();
  });

  document.getElementById('schedule-start').addEventListener('change', (e) => {
    const [h, m] = e.target.value.split(':').map(Number);
    currentSchedule.startHour = h; currentSchedule.startMin = m;
    saveSchedule(); updateScheduleStatus();
  });

  document.getElementById('schedule-end').addEventListener('change', (e) => {
    const [h, m] = e.target.value.split(':').map(Number);
    currentSchedule.endHour = h; currentSchedule.endMin = m;
    saveSchedule(); updateScheduleStatus();
  });
}

function renderSchedule() {
  document.getElementById('schedule-enabled').checked = currentSchedule.enabled;
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('schedule-start').value = `${pad(currentSchedule.startHour)}:${pad(currentSchedule.startMin)}`;
  document.getElementById('schedule-end').value = `${pad(currentSchedule.endHour)}:${pad(currentSchedule.endMin)}`;

  const daysContainer = document.getElementById('schedule-days');
  daysContainer.innerHTML = '';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach((label, i) => {
    const btn = document.createElement('button');
    btn.className = 'day-btn' + (currentSchedule.days.includes(i) ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      const idx = currentSchedule.days.indexOf(i);
      if (idx >= 0) currentSchedule.days.splice(idx, 1);
      else currentSchedule.days.push(i);
      btn.classList.toggle('active', currentSchedule.days.includes(i));
      saveSchedule(); updateScheduleStatus();
    });
    daysContainer.appendChild(btn);
  });

  updateScheduleStatus();
}

function updateScheduleStatus() {
  const el = document.getElementById('schedule-status');
  if (!currentSchedule.enabled) { el.textContent = ''; el.className = 'schedule-status'; return; }
  const active = isScheduleActive(currentSchedule);
  el.textContent = active ? '⚡ Blocking active now' : 'Outside scheduled hours';
  el.className = `schedule-status ${active ? 'active' : 'inactive'}`;
}

function isScheduleActive(s) {
  if (!s.enabled) return false;
  const now = new Date();
  if (!s.days.includes(now.getDay())) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= s.startHour * 60 + s.startMin && cur < s.endHour * 60 + s.endMin;
}

function saveSchedule() {
  chrome.storage.sync.set({ schedule: currentSchedule });
}

// ── Profiles ────────────────────────────────────────────────────────────────
function initProfiles() {
  loadProfiles();
  document.getElementById('btn-save-profile').addEventListener('click', saveProfile);
}

function loadProfiles() {
  chrome.storage.sync.get('profiles', (result) => renderProfilesList(result.profiles || {}));
}

function renderProfilesList(profiles) {
  const container = document.getElementById('profiles-list');
  container.innerHTML = '';
  const names = Object.keys(profiles);

  if (names.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:16px;color:var(--text-ter);font-size:12px;text-align:center';
    empty.textContent = 'No saved profiles yet.';
    container.appendChild(empty);
    return;
  }

  names.forEach(name => {
    const row = document.createElement('div');
    row.className = 'toggle-row';
    row.style.gap = '8px';

    const lbl = document.createElement('span');
    lbl.className = 'toggle-label';
    lbl.textContent = name;

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn';
    loadBtn.textContent = 'Load';
    loadBtn.style.padding = '4px 10px';
    loadBtn.addEventListener('click', () => loadProfile(name, profiles));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn';
    delBtn.textContent = '✕';
    delBtn.style.cssText = 'padding:4px 10px;color:var(--accent)';
    delBtn.addEventListener('click', () => deleteProfile(name));

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);
    row.appendChild(lbl);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function saveProfile() {
  const name = document.getElementById('profile-name').value.trim();
  if (!name) return;
  const keys = ALL_SITES.map(s => `prefs_${s}`);
  chrome.storage.sync.get(['profiles', ...keys], (result) => {
    const profiles = result.profiles || {};
    const snapshot = {};
    ALL_SITES.forEach(site => {
      snapshot[site] = { ...SITE_DEFAULTS[site], ...(result[`prefs_${site}`] || {}) };
    });
    profiles[name] = snapshot;
    chrome.storage.sync.set({ profiles }, () => {
      document.getElementById('profile-name').value = '';
      renderProfilesList(profiles);
    });
  });
}

function loadProfile(name, profiles) {
  const profile = profiles[name];
  if (!profile) return;
  const updates = {};
  ALL_SITES.forEach(site => { if (profile[site]) updates[`prefs_${site}`] = profile[site]; });
  chrome.storage.sync.set(updates, () => loadAllPrefs());
}

function deleteProfile(name) {
  chrome.storage.sync.get('profiles', (result) => {
    const profiles = result.profiles || {};
    delete profiles[name];
    chrome.storage.sync.set({ profiles }, () => renderProfilesList(profiles));
  });
}

// ── Import / Export ─────────────────────────────────────────────────────────
function initImportExport() {
  document.getElementById('btn-export').addEventListener('click', () => {
    chrome.storage.sync.get(EXPORT_KEYS, (result) => {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'distraction-blocker-settings.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const toWrite = {};
        EXPORT_KEYS.forEach(k => { if (k in data) toWrite[k] = data[k]; });
        if (Object.keys(toWrite).length === 0) return;
        chrome.storage.sync.set(toWrite, () => location.reload());
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

// ── Statistics ───────────────────────────────────────────────────────────────
function refreshStats() {
  // Session total from background
  chrome.runtime.sendMessage({ type: 'get-total-count' }, (response) => {
    const total = response?.total ?? 0;
    document.getElementById('stat-total').textContent = total;
  });

  // All-time counter from storage
  chrome.storage.local.get('alltime_hidden', (result) => {
    document.getElementById('stat-alltime').textContent = (result.alltime_hidden || 0).toLocaleString();
  });

  // Count configured sites (at least one section enabled)
  const keys = ALL_SITES.map(s => `prefs_${s}`);
  chrome.storage.sync.get(keys, (result) => {
    let sitesConfigured = 0;
    const breakdown = document.getElementById('stats-breakdown');
    breakdown.innerHTML = '';

    ALL_SITES.forEach(site => {
      const saved = result[`prefs_${site}`] || {};
      const enabled = Object.values(saved).filter(Boolean).length;
      if (enabled > 0) sitesConfigured++;

      const row = document.createElement('div');
      row.className = 'toggle-row';
      row.style.cursor = 'default';

      const lbl = document.createElement('span');
      lbl.className = 'toggle-label';
      lbl.textContent = SITE_CONFIG[site].label;

      const count = document.createElement('span');
      count.style.cssText = `font-size:12px;font-weight:600;color:${enabled > 0 ? 'var(--accent)' : 'var(--text-ter)'}`;
      count.textContent = enabled > 0 ? `${enabled} section${enabled > 1 ? 's' : ''} blocked` : 'Nothing blocked';

      row.appendChild(lbl);
      row.appendChild(count);
      breakdown.appendChild(row);
    });

    document.getElementById('stat-sites').textContent = sitesConfigured;
  });
}
