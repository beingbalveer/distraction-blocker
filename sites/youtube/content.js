/**
 * YouTube content script — Distraction Blocker
 *
 * Toggles are controlled via the extension popup.
 */

const YOUTUBE_SELECTORS = {
  header: [
    'ytd-masthead',
    '#masthead-container'
  ],
  sidebar: [
    'ytd-guide-renderer',       // Full expanded sidebar
    'ytd-mini-guide-renderer',  // Mini sidebar (collapsed)
    '#guide',                   // Common container ID
    'tp-yt-app-drawer#guide'    // App drawer wrapper
  ],
  recommendations: [
    'ytd-watch-next-secondary-results-renderer', // Right sidebar on watch page
    '#secondary'                                  // Secondary content area
  ],
  comments: [
    'ytd-comments#comments',
    '#comments'
  ],
  shorts: [
    'ytd-reel-shelf-renderer',
    'ytd-rich-shelf-renderer[is-shorts]'
  ]
};

// Initialize the blocker using shared utils
initSiteBlocker('youtube', YOUTUBE_SELECTORS);
