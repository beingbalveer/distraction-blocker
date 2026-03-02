/**
 * Facebook content script — Distraction Blocker
 * TODO: Add proper selectors for Facebook UI elements.
 */

const FACEBOOK_SELECTORS = {
  header: '',      // TODO: add selector
  leftSidebar: '', // TODO: add selector
  rightSidebar: '', // TODO: add selector
  stories: '',     // TODO: add selector
  reels: ''        // TODO: add selector
};

// Initialize the blocker using shared utils
initSiteBlocker('facebook', FACEBOOK_SELECTORS);
