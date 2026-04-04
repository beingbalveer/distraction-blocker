/**
 * Element picker — injected on demand via chrome.scripting.executeScript
 * Lets the user click any element on the page to generate a CSS selector.
 * Result is saved to storage so the popup can pick it up on next open.
 */

(function () {
  if (window.__dbPickerActive) return; // prevent double-injection
  window.__dbPickerActive = true;

  // ── Overlay banner ──────────────────────────────────────────────────────
  const banner = document.createElement('div');
  banner.id = 'db-picker-banner';
  Object.assign(banner.style, {
    position: 'fixed', top: '0', left: '0', right: '0',
    zIndex: '2147483647',
    background: '#e94560', color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: '13px', fontWeight: '600',
    padding: '10px 16px',
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    cursor: 'default',
    userSelect: 'none'
  });
  banner.textContent = '🎯 Click any element to hide it  ·  ESC to cancel';
  document.body.appendChild(banner);

  // ── Highlight style ─────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'db-picker-style';
  style.textContent = `
    body { cursor: crosshair !important; }
    .db-picker-highlight {
      outline: 2px solid #e94560 !important;
      outline-offset: 2px !important;
      background: rgba(233,69,96,0.08) !important;
    }
  `;
  document.head.appendChild(style);

  let highlighted = null;

  // ── Hover highlight ─────────────────────────────────────────────────────
  function onMouseOver(e) {
    if (e.target === banner || banner.contains(e.target)) return;
    if (highlighted) highlighted.classList.remove('db-picker-highlight');
    highlighted = e.target;
    highlighted.classList.add('db-picker-highlight');
  }

  // ── Selector generation ─────────────────────────────────────────────────
  function generateSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.dataset.pagelet) return `[data-pagelet="${el.dataset.pagelet}"]`;
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return `[aria-label="${ariaLabel}"]`;
    const role = el.getAttribute('role');
    const tag = el.tagName.toLowerCase();
    const classes = Array.from(el.classList).filter(c => !c.startsWith('db-')).slice(0, 3);
    if (role && classes.length) return `${tag}[role="${role}"].${classes[0]}`;
    if (role) return `${tag}[role="${role}"]`;
    if (classes.length) return `${tag}.${classes.join('.')}`;
    return tag;
  }

  // ── Click to pick ───────────────────────────────────────────────────────
  function onClick(e) {
    if (e.target === banner || banner.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    const selector = generateSelector(e.target);

    // Save result to storage for popup to read on next open
    chrome.storage.local.set({
      picker_result: { selector, hostname: location.hostname, ts: Date.now() }
    });

    cleanup();

    // Brief confirmation flash
    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'fixed', top: '0', left: '0', right: '0',
      zIndex: '2147483647',
      background: '#34c759', color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '13px', fontWeight: '600',
      padding: '10px 16px',
      textAlign: 'center',
      transition: 'opacity 0.4s ease'
    });
    flash.textContent = `✓ Selector saved — reopen the extension to apply`;
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; }, 1800);
    setTimeout(() => { flash.remove(); }, 2300);
  }

  // ── ESC to cancel ───────────────────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === 'Escape') cleanup();
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────
  function cleanup() {
    window.__dbPickerActive = false;
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    if (highlighted) highlighted.classList.remove('db-picker-highlight');
    banner.remove();
    style.remove();
  }

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
})();
