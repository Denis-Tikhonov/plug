// =============================================================
// vprn.js — WinPorn (winporn.club) Parser for AdultJS
// =============================================================
// Version  : 2.0.0
// Strategy : JSON-config-driven, Occam's Razor applied
// Base on  : UNIVERSAL_TEMPLATE v1.4.0
// Changes  :
//   [2.0.0] JSON-driven rewrite: only S2+S6/S7 strategies
//           (Block 1 reduced). All Block 2-4 removed per
//           vprn.json debugReport (all zeros except mp4:19).
//           Exact selectors from JSON: .thumb, [class*="title"],
//           [class*="duration"]. HOST updated to winporn.club.
//   [1.0.0] Initial UT-based stub
//
// INTEGRATION CHECKLIST:
//   menu.json:     { "title": "WinPorn", "playlist_url": "vprn" } ✅
//   DOMAIN_MAP:    'winporn.club': 'vprn' ✅ (SS.js v1.6.0)
//   Worker:        'www.winporn.club', 'wppsn.com' ✅ (v1.9.0)
//   FORCE_REFERER_MAP: wppsn.com → https://www.winporn.club/ ✅
// =============================================================

(function () {
  'use strict';

  // ============================================================
  // §1. CONFIG — JSON-derived constants
  // ============================================================

  var HOST      = 'https://www.winporn.club';
  var SITE_NAME = 'WinPorn';
  var NAME      = 'vprn';          // menu.json playlist_url value
  var VERSION   = '2.0.0';
  var TAG       = '[' + NAME + ']';

  // JSON-config derived settings (vprn.json parserConfig)
  var SEARCH_PARAM  = 'q';        // search pattern: /?q={query}
  var PAGE_PARAM    = 'page';     // pagination: ?page={N}

  // Worker-mandated headers (vprn.json REQUIRED_HEADERS)
  // Cookie: mature=1 → covered by Worker BYPASS_COOKIES
  // Referer: https://www.winporn.com/ → covered by FORCE_REFERER_MAP

  // ============================================================
  // §2. DEBUG — minimal JSON-driven logging
  // ============================================================

  var DEBUG_MODE   = true;
  var DEBUG_URL_LEN = 90;

  function logInfo(msg)  { if (DEBUG_MODE) console.log(TAG + ' ' + msg); }
  function logWarn(msg)  { if (DEBUG_MODE) console.warn(TAG + ' [WARN] ' + msg); }
  function logError(msg) { if (DEBUG_MODE) console.error(TAG + ' [ERR] ' + msg); }

  function truncate(str, len) {
    len = len || DEBUG_URL_LEN;
    return str && str.length > len ? str.substring(0, len) + '…' : (str || '');
  }

  // ============================================================
  // §3. cleanUrl — UT standard (covers JSON cleanUrlRules)
  //
  // vprn.json rules: ["unescape-backslash", "prepend-host"]
  // UT covers:  \\/, prepend-host, decodeURIComponent, protocol-
  //             relative fix, function/N/ strip.
  // NO custom WinPorn rules needed (Occam's Razor).
  // ============================================================

  function cleanUrl(raw) {
    if (!raw) return '';
    try {
      var u = raw;

      // 1. Unescape backslash-slash (\/ → /)  [JSON rule #1]
      u = u.replace(/\\\//g, '/').replace(/\\/g, '');

      // 2. URL-decode
      if (u.indexOf('%') !== -1) {
        try { u = decodeURIComponent(u); } catch (e) {}
      }

      // 3. Protocol-relative
      if (u.indexOf('//') === 0) u = 'https:' + u;

      // 4. Strip function/N/ wrapper
      var funcMatch = u.match(/^https?:\/\/[^/]+\/function\/\d+\/(https?:\/\/.+)$/);
      if (funcMatch) u = funcMatch[1];
      var funcRel = u.match(/^\/??function\/\d+\/(https?:\/\/.+)$/);
      if (funcRel) u = funcRel[1];

      // 5. Prepend HOST for relative paths  [JSON rule #2]
      if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
      if (u.length > 0 && u.indexOf('http') !== 0 && u.charAt(0) !== '/') {
        u = HOST + '/' + u;
      }

      return u;
    } catch (e) {
      return raw;
    }
  }

  function cleanMp4Url(url) {
    if (!url) return '';
    return url
      .replace(/[?&]rnd=\d+/g, '')
      .replace(/[?&]br=\d+/g, '')
      .replace(/[?&]_=\d+/g, '')
      .replace(/[?&]+$/g, '')
      .replace(/\/+$/, '');
  }

  function normalizeLabel(label, url) {
    if (!url) return label;
    if (url.indexOf('_1080p') !== -1) return '1080p';
    if (url.indexOf('_720p')  !== -1) return '720p';
    if (url.indexOf('_480p')  !== -1) return '480p';
    if (url.indexOf('_360p')  !== -1) return '360p';
    if (url.indexOf('_240p')  !== -1) return '240p';
    return label;
  }

  // ============================================================
  // §4. TRANSPORT — AdultPlugin.networkRequest with fallback
  // ============================================================

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(success)
        .catch(error);
    }
  }

  // ============================================================
  // §5. extractQualities — OCCAM'S RAZOR: only applicable strategies
  //
  // vprn.json debugReport:  mp4:19 | everything else: 0
  // sStrategies:            [{s:2, name:"direct_mp4", block:1}]
  // recommendedBlock:       1
  //
  // Applied Razor:
  //   KEPT:   S2  (direct_mp4 brute)      — primary, mp4:19
  //   KEPT:   S6  (<source size>)           — minimal fallback
  //   KEPT:   S7  (<source label>)          — minimal fallback
  //   KEPT:   S8  (DOMParser source)        — micro fallback
  //   REMOVED: S1,S3,S4,S5 (report=0)
  //   REMOVED: S9-S28 (Block 2-4, report=0 or irrelevant)
  // ============================================================

  function extractQualities(html) {
    var q = {};
    var have = function () { return Object.keys(q).length > 0; };
    var add = function (label, url) {
      var u = cleanUrl(url);
      if (!u || u.indexOf('{') !== -1 || u.indexOf('spacer') !== -1) return;
      // Skip thumbnail previews (tmb path) — they're short clips
      if (u.indexOf('/tmb/') !== -1 && u.indexOf('/videos/tmb/') !== -1) {
        // Allow if nothing else found, but mark as preview
        if (have()) return;
      }
      var nl = normalizeLabel(label, u);
      if (!q[nl]) q[nl] = u;
    };

    var m, checked = [];

    // ── S2: direct_mp4 brute (PRIMARY — vprn.json mp4:19) ──
    var s2count = 0;
    var allMp4 = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi);
    if (allMp4) {
      // Filter out thumbnail preview mp4s and duplicates
      var seen = {};
      allMp4.forEach(function (u) {
        if (u.indexOf('{') !== -1) return;
        // Skip obvious preview/thumbnail clips (pattern from JSON: .../tmb/{id}/{id}.mp4)
        if (/\/tmb\/\d+\/\d+\.mp4/.test(u)) return;
        // Skip if already seen base URL
        var base = u.split('?')[0];
        if (seen[base]) return;
        seen[base] = true;
        var qm = u.match(/_(\d+)\.mp4/);
        add(qm ? qm[1] + 'p' : ('src' + s2count), u);
        s2count++;
      });
    }
    checked.push({ s: 2, name: 'direct_mp4', found: have(), cnt: s2count });

    // ── S6: <source src="..." size="480"> ──
    var s6count = 0;
    if (!have()) {
      var re6a = /<source[^>]+src="([^"]+)"[^>]+size="([^"]+)"/gi;
      var re6b = /<source[^>]+size="([^"]+)"[^>]+src="([^"]+)"/gi;
      while ((m = re6a.exec(html)) !== null) {
        if (m[2] !== 'preview' && m[1].indexOf('.mp4') !== -1) { add(m[2] + 'p', m[1]); s6count++; }
      }
      if (!have()) {
        while ((m = re6b.exec(html)) !== null) {
          if (m[1] !== 'preview' && m[2].indexOf('.mp4') !== -1) { add(m[1] + 'p', m[2]); s6count++; }
        }
      }
    }
    checked.push({ s: 6, name: '<source size>', found: have(), cnt: s6count });

    // ── S7: <source src="..." label="480p"> ──
    var s7count = 0;
    if (!have()) {
      var re7a = /<source[^>]+src="([^"]+)"[^>]+label="([^"]+)"/gi;
      var re7b = /<source[^>]+label="([^"]+)"[^>]+src="([^"]+)"/gi;
      while ((m = re7a.exec(html)) !== null) {
        if (m[1].indexOf('.mp4') !== -1) { add(m[2], m[1]); s7count++; }
      }
      if (!have()) {
        while ((m = re7b.exec(html)) !== null) {
          if (m[2].indexOf('.mp4') !== -1) { add(m[1], m[2]); s7count++; }
        }
      }
    }
    checked.push({ s: 7, name: '<source label>', found: have(), cnt: s7count });

    // ── S8: DOMParser fallback (micro) ──
    var s8count = 0;
    if (!have()) {
      try {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var sources = doc.querySelectorAll('video source[src]');
        for (var si = 0; si < sources.length; si++) {
          var src = sources[si].getAttribute('src') || '';
          var lbl = sources[si].getAttribute('title') ||
                    sources[si].getAttribute('label') ||
                    sources[si].getAttribute('size')  || 'auto';
          if (!src || src.indexOf('blob:') === 0) continue;
          add(lbl.toLowerCase() === 'auto' ? 'auto' : lbl, src);
          s8count++;
        }
      } catch (e) {}
    }
    checked.push({ s: 8, name: 'DOMParser', found: have(), cnt: s8count });

    // ── Diagnostic output ──
    if (DEBUG_MODE) {
      console.log('─'.repeat(50));
      logInfo('QUALITIES ROADMAP (Occam filtered)');
      checked.forEach(function (item) {
        var st = item.found ? 'FOUND' : '—';
        var col = item.found ? 'color:#4caf50' : 'color:#888';
        console.log('%c  S' + item.s + ' ' + item.name + ': ' + st + ' (' + item.cnt + ')', col);
      });
      console.log('─'.repeat(50));
      logInfo('Result: ' + Object.keys(q).length + ' qualities');
    }

    return { qualities: q, checked: checked };
  }

  // ============================================================
  // §6. CARD PARSING — Exact selectors from vprn.json
  //
  // JSON CARD_SELECTORS:
  //   container:      ".thumb"
  //   link:           ".thumb a[href*=\"/video/\"]"
  //   title:          ".thumb [class*=\"title\"]"
  //   thumbnail:      ".thumb img", attr: src
  //   duration:       ".thumb [class*=\"duration\"]"
  // ============================================================

  function getPicture(imgEl) {
    if (!imgEl) return '';
    var pic = cleanUrl(
      imgEl.getAttribute('data-original') ||
      imgEl.getAttribute('data-src')       ||
      imgEl.getAttribute('data-lazy-src') ||
      imgEl.getAttribute('src')           || ''
    );
    if (pic && (pic.indexOf('spacer') !== -1 ||
                pic.indexOf('blank') !== -1  ||
                pic.indexOf('data:') === 0   ||
                pic.length < 10)) pic = '';
    return pic;
  }

  function slugToTitle(url) {
    if (!url) return '';
    var parts = url.replace(/\?.*/, '').replace(/\/+$/, '').split('/').filter(Boolean);
    var slug = parts[parts.length - 1] || '';
    if (/^\d+$/.test(slug) && parts.length > 1) slug = parts[parts.length - 2] || '';
    return slug.replace(/[-_]/g, ' ')
               .replace(/\b\w/g, function (l) { return l.toUpperCase(); })
               .trim();
  }

  function parsePlaylist(html) {
    var results = [];
    var doc;
    try {
      doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
      logError('DOMParser failed: ' + e.message);
      return results;
    }

    // JSON exact selector: .thumb (80 cards found during analysis)
    var items = doc.querySelectorAll('.thumb');
    logInfo('parsePlaylist: .thumb found: ' + items.length);

    if (!items || items.length === 0) {
      // Fallback only if exact selector fails
      logWarn('parsePlaylist: .thumb empty, fallback a[href*="/video/"]');
      items = doc.querySelectorAll('a[href*="/video/"]');
      for (var j = 0; j < items.length; j++) {
        var aEl  = items[j];
        var href = cleanUrl(aEl.getAttribute('href') || '');
        if (!href) continue;
        var picA = getPicture(aEl.querySelector('img'));
        var nameA = (aEl.getAttribute('title') || aEl.textContent || '').replace(/\s+/g, ' ').trim() || slugToTitle(href);
        results.push(makeCard(nameA, href, picA, ''));
      }
      logInfo('parsePlaylist fallback: ' + results.length + ' cards');
      return results;
    }

    for (var i = 0; i < items.length; i++) {
      var card = parseCard(items[i]);
      if (card) results.push(card);
    }

    logInfo('parsePlaylist: ' + results.length + ' cards parsed');
    return results;
  }

  function parseCard(el) {
    // JSON exact selector for link
    var linkEl = el.querySelector('a[href*="/video/"]') ||
                 el.querySelector('a[href]');
    if (!linkEl) return null;

    var href = cleanUrl(linkEl.getAttribute('href') || '');
    if (!href) return null;

    // JSON exact selector for thumbnail: .thumb img, attr src
    var imgEl = el.querySelector('img');
    var pic   = getPicture(imgEl);

    // JSON exact selector for title: .thumb [class*="title"]
    var titleEl = el.querySelector('[class*="title"]');
    var name    = '';
    if (titleEl) name = (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
    if (!name)   name = (linkEl.getAttribute('title') || '').trim();
    if (!name)   name = slugToTitle(href);
    name = name.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!name) return null;

    // JSON exact selector for duration: .thumb [class*="duration"]
    var durEl = el.querySelector('[class*="duration"]');
    var time  = durEl ? durEl.textContent.replace(/[^\d:]/g, '').trim() : '';

    // Preview video (if available)
    var vidEl = el.querySelector('video[data-preview]') || el.querySelector('a[data-clip]');
    var preview = '';
    if (vidEl) {
      preview = cleanUrl(vidEl.getAttribute('data-preview') || vidEl.getAttribute('data-clip') || '');
    }

    return makeCard(name, href, pic, time, preview);
  }

  function makeCard(name, href, pic, time, preview) {
    return {
      name:             name,
      video:            href,
      picture:          pic,
      img:              pic,
      poster:           pic,
      background_image: pic,
      preview:          preview || null,
      time:             time  || '',
      quality:          'HD',
      json:             true,
      source:           NAME,
    };
  }

  // ============================================================
  // §7. URL BUILDER — JSON derived patterns
  //
  // search:     HOST + /?q={query}          (vprn.json)
  // pagination:  ?page={N}                   (vprn.json)
  // main:        HOST + /?page=N            (derived)
  // ============================================================

  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    var url = HOST;

    if (type === 'search') {
      url += '/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&' + PAGE_PARAM + '=' + page;
    } else {
      // Main page / pagination
      if (page > 1) url += '/?' + PAGE_PARAM + '=' + page;
    }

    return url;
  }

  // ============================================================
  // §8. MENU — Minimal (Occam: no categories/channels per JSON)
  //
  // vprn.json: CATEGORIES=[], CHANNELS=[], SORT_OPTIONS=[]
  // Therefore menu contains only Search + New (main)
  // ============================================================

  function buildMenu() {
    return [
      {
        title:        'Поиск',
        search_on:    true,
        playlist_url: NAME + '/search/',
      },
      {
        title:        'Новинки',
        playlist_url: NAME + '/new',
      },
    ];
  }

  // ============================================================
  // §9. ROUTING
  // ============================================================

  function routeView(url, page, success, error) {
    var fetchUrl;

    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      fetchUrl = buildUrl('search', decodeURIComponent(searchMatch[1]), page);
      return loadPage(fetchUrl, page, success, error);
    }

    if (url.indexOf(NAME + '/search/') === 0) {
      var rawQ = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      if (rawQ) {
        fetchUrl = buildUrl('search', rawQ, page);
        return loadPage(fetchUrl, page, success, error);
      }
    }

    loadPage(buildUrl('main', null, page), page, success, error);
  }

  function loadPage(fetchUrl, page, success, error) {
    logInfo('loadPage: ' + truncate(fetchUrl, DEBUG_URL_LEN));
    httpGet(fetchUrl, function (html) {
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }
      success({
        results:     results,
        collection:  true,
        total_pages: results.length >= 20 ? page + 1 : page,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ============================================================
  // §10. PUBLIC API
  // ============================================================

  var WinPornParser = {

    main: function (params, success, error) {
      routeView(NAME + '/new', 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var page  = parseInt(params.page, 10) || 1;
      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }
      httpGet(buildUrl('search', query, page), function (html) {
        var results = parsePlaylist(html);
        success({
          title:       SITE_NAME + ': ' + query,
          results:     results,
          collection:  true,
          total_pages: results.length >= 20 ? page + 1 : page,
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      logInfo('qualities: ' + truncate(videoPageUrl, DEBUG_URL_LEN));

      httpGet(videoPageUrl, function (html) {
        if (!html || html.length < 500) {
          logError('HTML too short (' + (html ? html.length : 0) + ' bytes)');
          logWarn('Possible: age gate, CF block, bad URL');
          error('HTML < 500 bytes');
          return;
        }

        var result = extractQualities(html);
        var found  = result.qualities;
        var keys   = Object.keys(found);

        logInfo('Found ' + keys.length + ' qualities: ' + keys.join(', '));

        if (keys.length > 0) {
          // Clean trailing params from mp4 URLs
          keys.forEach(function (k) {
            if (found[k].indexOf('.mp4') !== -1) {
              found[k] = cleanMp4Url(found[k]);
            }
          });
          success({ qualities: found });
        } else {
          logWarn('No video qualities found');
          error('Video not found');
        }
      }, error);
    },
  };

  // ============================================================
  // §11. REGISTRATION
  // ============================================================

  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, WinPornParser);
      logInfo('v' + VERSION + ' registered successfully');
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var poll = setInterval(function () {
      if (tryRegister()) clearInterval(poll);
    }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }

})();
