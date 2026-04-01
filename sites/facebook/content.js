/**
 * Facebook content script — Distraction Blocker
 */

const FACEBOOK_SELECTORS = {
  // Top navigation bar
  header: [
    '[data-pagelet="NavBar"]',
    'div[role="banner"]',
  ],
  // Left navigation sidebar (shortcuts, groups, marketplace links)
  leftSidebar: [
    '[data-pagelet="LeftRail"]',
    'div[role="navigation"]',
  ],
  // Right sidebar (sponsored, suggested people/groups)
  rightSidebar: [
    '[data-pagelet="RightRail"]',
    'aside',
  ],
  // Stories row at the top of the home feed
  stories: [
    '[data-pagelet="Stories"]',
    'div[aria-label="Stories"]',
  ],
  // Reels section in the feed
  reels: [
    '[aria-label="Reels"]',
    '[data-pagelet*="Reels"]',
    'div[aria-label*="Reels"]',
  ],
};

// Initialize the blocker using shared utils
initSiteBlocker('facebook', FACEBOOK_SELECTORS);
