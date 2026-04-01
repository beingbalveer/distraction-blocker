/**
 * Instagram content script — Distraction Blocker
 */

const INSTAGRAM_SELECTORS = {
  // Stories tray at the top of the home feed
  stories: [
    '[data-pagelet="story_tray"]',
  ],
  // "Suggested for you" panel — identified by its unique "See all" link to /explore/people/
  suggestions: [
    'div:has(> div > a[href*="/explore/people"])',
  ],
  // Explore nav link in left sidebar
  explore: [
    'a[href="/explore/"]',
    'a[href*="/explore"]',
  ],
  // Reels nav link in left sidebar
  reels: [
    'a[href="/reels/"]',
    'a[href*="/reels"]',
  ],
};

// Initialize the blocker using shared utils
initSiteBlocker('instagram', INSTAGRAM_SELECTORS);
