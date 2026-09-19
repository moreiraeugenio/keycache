/**
 * Fills in the download links from the latest GitHub release, and highlights
 * the visitor's platform.
 *
 * The release assets are version-stamped (Keycache-0.4.1-arm64.dmg and so on),
 * so GitHub's /releases/latest/download/<asset> shortcut cannot resolve them —
 * that only works for fixed filenames. We ask the API for the latest release
 * instead and rewrite the hrefs.
 *
 * Every link in the markup already points at the releases page, so if this
 * script never runs, or the request fails, or the visitor is rate limited,
 * the page still gets people to a download.
 */
(function () {
  'use strict';

  var RELEASES_API = 'https://api.github.com/repos/moreiraeugenio/keycache/releases/latest';
  var CACHE_KEY = 'keycache:latest-release';
  var CACHE_TTL_MS = 60 * 60 * 1000;

  /** Matchers for the artifact names produced by electron-builder. */
  var ASSET_PATTERNS = {
    'mac-arm64': /-arm64\.dmg$/i,
    'mac-x64': /-x64\.dmg$/i,
    win: /\.exe$/i,
    linux: /\.AppImage$/i,
  };

  /** Which asset the big button should point at, per platform. */
  var PRIMARY_ASSET = {
    mac: 'mac-arm64',
    windows: 'win',
    linux: 'linux',
  };

  var PLATFORM_LABEL = {
    mac: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
  };

  function detectPlatform() {
    var hints = navigator.userAgentData;
    var raw = (hints && hints.platform) || navigator.platform || navigator.userAgent || '';
    var value = raw.toLowerCase();

    // Order matters: iPadOS reports "macintosh", and we would rather send a
    // tablet visitor to the releases page than to a .dmg. Touch-capable Macs
    // do not exist, so maxTouchPoints separates the two.
    if (/iphone|ipad|ipod|android/.test(value) || navigator.maxTouchPoints > 1) return null;
    if (/mac/.test(value)) return 'mac';
    if (/win/.test(value)) return 'windows';
    if (/linux|x11|cros/.test(value)) return 'linux';
    return null;
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || Date.now() - entry.at > CACHE_TTL_MS) return null;
      return entry.release;
    } catch (err) {
      return null;
    }
  }

  function writeCache(release) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), release: release }));
    } catch (err) {
      // Private browsing, or storage is full. The page works without it.
    }
  }

  function fetchRelease() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);

    return fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('GitHub API returned ' + response.status);
        return response.json();
      })
      .then(function (release) {
        // Keep only what the page needs, so the cache entry stays small.
        var slim = {
          tag_name: release.tag_name,
          assets: (release.assets || []).map(function (asset) {
            return { name: asset.name, browser_download_url: asset.browser_download_url };
          }),
        };
        writeCache(slim);
        return slim;
      });
  }

  function resolveAssets(release) {
    var urls = {};
    Object.keys(ASSET_PATTERNS).forEach(function (key) {
      var match = release.assets.filter(function (asset) {
        return ASSET_PATTERNS[key].test(asset.name);
      })[0];
      if (match) urls[key] = match.browser_download_url;
    });
    return urls;
  }

  function applyRelease(release, platform) {
    var urls = resolveAssets(release);

    document.querySelectorAll('[data-asset]').forEach(function (link) {
      var url = urls[link.dataset.asset];
      if (url) link.href = url;
    });

    var primaryKey = PRIMARY_ASSET[platform];
    var primary = document.getElementById('primary-download');
    if (primary && primaryKey && urls[primaryKey]) {
      primary.href = urls[primaryKey];
    }

    var version = (release.tag_name || '').replace(/^v/, '');
    var note = document.getElementById('version-note');
    if (note && version) {
      note.innerHTML =
        'Version ' +
        version +
        ' · <a href="https://github.com/moreiraeugenio/keycache/releases/latest">release notes</a>';
    }
  }

  function applyPlatform(platform) {
    if (!platform) return;

    var label = document.getElementById('primary-download-label');
    if (label) label.textContent = 'Download for ' + PLATFORM_LABEL[platform];

    var row = document.querySelector('.download-list li[data-platform="' + platform + '"]');
    if (row) row.classList.add('is-current');

    if (platform === 'mac') {
      var note = document.getElementById('cta-note');
      if (note) note.textContent = 'Free and open source. Apple Silicon — Intel build below.';
    }
  }

  function setupCopyButtons() {
    document.querySelectorAll('[data-copy-target]').forEach(function (button) {
      var source = document.getElementById(button.dataset.copyTarget);
      if (!source || !navigator.clipboard) return;

      button.addEventListener('click', function () {
        navigator.clipboard.writeText(source.textContent.trim()).then(function () {
          var original = button.textContent;
          button.textContent = 'Copied';
          button.classList.add('copied');
          setTimeout(function () {
            button.textContent = original;
            button.classList.remove('copied');
          }, 1600);
        });
      });
    });
  }

  var platform = detectPlatform();
  applyPlatform(platform);
  setupCopyButtons();

  fetchRelease()
    .then(function (release) {
      applyRelease(release, platform);
    })
    .catch(function () {
      // Links stay pointed at the releases page, which is a fine fallback.
    });
})();
