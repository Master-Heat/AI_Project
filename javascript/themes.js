
(function () {
  'use strict';

  // ─── Theme Definitions ──────────────────────────────────────
  // Each entry drives both the CSS-variable sync and the swatch
  // active-state highlight.
  var THEMES = {
    classic: {
      light: '#ffffff',
      dark:  '#8B7355'          // visual proxy; actual squares use the jpg
    },
    slate: {
      light: '#d6dfe8',
      dark:  '#4a6fa5'
    },
    forest: {
      light: '#edf2e9',
      dark:  '#4a7c59'
    },
    coral: {
      light: '#fdf0ec',
      dark:  '#c0614a'
    },
    midnight: {
      light: '#c8c9d4',
      dark:  '#2c2f4a'
    },
    sand: {
      light: '#f5e6c8',
      dark:  '#b58a3e'
    }
  };

  // ─── State ──────────────────────────────────────────────────
  var currentTheme = 'classic';

  // ─── DOM References (resolved after DOMContentLoaded) ───────
  var triggerBtn  = null;
  var palette     = null;
  var swatches    = null;
  var root        = document.documentElement;

  // ─── Core: Apply a Theme ────────────────────────────────────
  /**
   * applyTheme(name)
   * Sets the data-theme attribute on <body> (drives all CSS
   * overrides), syncs CSS variables (drives preview squares),
   * and updates swatch active states.
   */
  function applyTheme(name) {
    if (!THEMES[name]) {
      console.warn('[theme.js] Unknown theme:', name);
      return;
    }

    currentTheme = name;
    var theme = THEMES[name];

    // 1. Drive all board-square colours via the body attribute
    document.body.setAttribute('data-theme', name);

    // 2. Sync CSS variables so test-sq-* preview boxes update
    root.style.setProperty('--light-square',      theme.light);
    root.style.setProperty('--dark-square-color', theme.dark);

    // 3. Mark the correct swatch as active
    if (swatches) {
      swatches.forEach(function (sw) {
        sw.classList.toggle(
          'swatch-active',
          sw.getAttribute('data-theme') === name
        );
      });
    }

    // 4. Persist choice across page reloads
    try {
      localStorage.setItem('chess-board-theme', name);
    } catch (e) { /* private-browsing — silently ignore */ }
  }

  // ─── Toggle Palette Visibility ───────────────────────────────
  function openPalette()  { palette.classList.add('open');    }
  function closePalette() { palette.classList.remove('open'); }
  function togglePalette() {
    palette.classList.contains('open') ? closePalette() : openPalette();
  }

  // ─── Close on Outside Click ───────────────────────────────────
  function onDocumentClick(e) {
    var wrapper = document.querySelector('.theme-switcher-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      closePalette();
    }
  }

  // ─── Initialise ──────────────────────────────────────────────
  function init() {
    triggerBtn = document.getElementById('themeTriggerBtn');
    palette    = document.getElementById('themePalette');
    swatches   = Array.prototype.slice.call(
                   document.querySelectorAll('.theme-swatch')
                 );

    if (!triggerBtn || !palette) {
      console.warn('[theme.js] Trigger or palette element not found.');
      return;
    }

    // Restore saved theme (or fall back to classic)
    var saved = null;
    try { saved = localStorage.getItem('chess-board-theme'); } catch(e) {}
    var initialTheme = (saved && THEMES[saved]) ? saved : 'classic';

    // Attach swatch click handlers
    swatches.forEach(function (sw) {
      sw.addEventListener('click', function () {
        var name = sw.getAttribute('data-theme');
        applyTheme(name);
        // Keep palette open so user can compare themes easily;
        // they close it by clicking the trigger again or clicking away.
      });
    });

    // Attach trigger click
    triggerBtn.addEventListener('click', function (e) {
      e.stopPropagation();   // prevent doc-click from closing immediately
      togglePalette();
    });

    // Close on outside click
    document.addEventListener('click', onDocumentClick);

    // Apply initial theme (no-flash: runs before first paint on
    // DOMContentLoaded, which fires before images/scripts load)
    applyTheme(initialTheme);
  }

  // ─── Expose public API (optional, useful for debugging) ──────
  window.boardTheme = {
    apply : applyTheme,
    toggle: togglePalette,
    current: function () { return currentTheme; }
  };

  // ─── Boot ────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();   // already loaded
  }

})();



//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************       pieces themes      ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */
//********************************                          ************************************** */


var PIECE_THEMES = {
  classic: {
    white: { primary: '#f0f0f0', secondary: '#ffffff', outline: '#000000' },
    black: { primary: '#262322', secondary: '#453f3d', outline: '#1a1817' }
  },
  slate: {
    white: { primary: '#e2e8f0', secondary: '#ffffff', outline: '#1e293b' },
    black: { primary: '#0f172a', secondary: '#334155', outline: '#020617' }
  },
  forest: {
    white: { primary: '#f1f5f0', secondary: '#ffffff', outline: '#1a2e1a' },
    black: { primary: '#132a13', secondary: '#2d4a2d', outline: '#0a140a' }
  },
  coral: {
    white: { primary: '#ffffff', secondary: '#fff5f2', outline: '#3d1a11' },
    black: { primary: '#451a03', secondary: '#78350f', outline: '#2d0f02' }
  },
  midnight: {
    white: { primary: '#ffffff', secondary: '#e2e2e2', outline: '#000000' },
    black: { primary: '#0a0a0f', secondary: '#1e1e2e', outline: '#ffffff' } // Silver outline for visibility
  },
  sand: {
    white: { primary: '#fffcf5', secondary: '#ffffff', outline: '#423115' },
    black: { primary: '#3d2b1f', secondary: '#5c4333', outline: '#241a13' }
  }
};