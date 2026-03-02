/**
 * Instagram content script — Distraction Blocker
 * TODO: Add proper selectors for Instagram UI elements.
 */

const INSTAGRAM_SELECTORS = {
  stories: '',   // TODO: add selector
  suggestions: '', // TODO: add selector
  explore: '',   // TODO: add selector
  reels: ''      // TODO: add selector
};

// Initialize the blocker using shared utils
initSiteBlocker('instagram', INSTAGRAM_SELECTORS);
