/**
 * Reddit content script — Distraction Blocker
 *
 * Current state: Toggles are controlled via the extension popup.
 */

const REDDIT_SELECTORS = {
  header: [
    'reddit-header-large',
    'header.v2'
  ],
  leftSidebar: [
    '#left-sidebar',
    'reddit-sidebar-nav'
  ],
  rightSidebar: [
    '#right-sidebar-container',
    '.right-sidebar'
  ]
};

// Initialize the blocker using shared utils.
// This handles all visibility toggling (including favicons).
initSiteBlocker('reddit', REDDIT_SELECTORS);
