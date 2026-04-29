(function () {
  'use strict';

  // ============================================================
  // §1. КОНФИГУРАЦИЯ И СТРАТЕГИЯ
  // ============================================================
  var NAME    = 'vprn';
  var VERSION = '1.3.0';
  var HOST    = 'https://www.winporn.com';
  var TAG     = 'WINPO';

  // Регулярные выражения для Block 1 (S1)
  var VIDEO_RULES = [
    { name: 'Direct MP4',  re: /"(https?:[^"]+\.mp4(?:\?[^"]+)?)"/gi, quality: 'HD' },
    { name: 'KVS Config',  re: /video_url:\s*'([^']+)'/gi,            quality: 'HD' },
    { name: 'HLS Stream',  re: /"(https?:[^"]+\.m3u8(?:\?[^"]+)?)"/gi, quality: 'HLS' }
  ];

  var CATEGORIES = [
    { title: 'Anal', slug: 'anal' },
    { title: 'Asian', slug: 'asian' },
    { title: 'Big Tits', slug: 'big-tits' },
    { title: 'Blowjob', slug: 'blowjob' },
    { title: 'Creampie', slug: 'creampie' },
    { title: 'Milf', slug: 'milf' },
    { title: 'Teen', slug: 'teen' }
  ];

  var CHANNELS = [];

  // ============================================================
  // §2. DEBUG И ЛОГИРОВАНИЕ
  // ============================================================
  var DEBUG_MODE    = true;
  var DEBUG_COLORS   = true;
  var DEBUG_URL_LEN  = 100;

  function logInfo(tag, msg) {
    if (!DEBUG_MODE) return;
    if (DEBUG_COLORS) console.log('%c[' + tag + ']%c ' + msg, 'color:#44aaff;font-weight:bold', 'color:#88ccff');
    else console.log('[' + tag + '] ' + msg);
  }

  function logSuccess(tag, msg) {
    if (!DEBUG_MODE) return;
    if (DEBUG_COLORS) console.log('%c[' + tag + ' OK]%c ' + msg, 'color:#44ff44;font-weight:bold', 'color:#88ff88');
    else console.log('[' + tag + ' OK] ' + msg);
  }

  function logWarn(tag, msg) {
    if (!DEBUG_MODE) return;
    if (DEBUG_COLORS) console.log('%c[' + tag + ' WARN]%c ' + msg, 'color:#ffaa00;font-weight:bold', 'color:#ffdd44');
    else console.log('[' + tag + ' WARN] ' + msg);
  }

  function truncate(str, len) {
    len = len || DEBUG_URL_LEN;
    return (str && str.length > len) ? str.substring(0, len) + '...' : str;
  }

  // ============================================================
  // §3. ТРАНСПОРТ И HELPERS
  // ============================================================
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function(r){ return r.text(); }).then(success).catch(error);
    }
  }

  function cleanUrl(u) {
    if (!u) return '';
    try {
      u = u.replace(/\\\//g, '/').replace(/\\/g, '').trim();
      if (u.indexOf('//') === 0) u = 'https:' + u;
      if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
      return u;
    } catch (e) { return u; }
  }

  function cleanMp4Url(url) {
    return url.replace(/[?&](rnd|br|_)=\d+/g, '').replace(/[?&]+$/g, '');
  }

  function slugToTitle(url) {
    var parts = url.split('/').filter(Boolean);
    var slug = parts.pop() || '';
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, function(l){ return l.toUpperCase(); });
  }

  // ============================================================
  // §5. EXTRACT QUALITIES (The Core)
  // ============================================================
  function extractQualities(html, pageUrl) {
    var q = {};
    var checked = [];
    var have = function () { return Object.keys(q).length > 0; };
    var add = function (lbl, url) { 
      var u = cleanUrl(url);
      if (u && !q[lbl]) q[lbl] = u; 
    };

    // S1. VIDEO_RULES
    VIDEO_RULES.forEach(function(rule) {
        var m; while ((m = rule.re.exec(html)) !== null) { add(rule.quality, m[1]); }
    });
    checked.push({ s: 1, name: 'VIDEO_RULES', found: have() });

    // S3. og:video
    if (!have()) {
      var og = html.match(/property="og:video"[^>]+content="([^"]+)"/i);
      if (og) add('HD', og[1]);
    }
    checked.push({ s: 3, name: 'og:video', found: have() });

    // S4. HLS m3u8 detection
    if (!have()) {
      var hls = html.match(/['"](https?:[^'"]+\.m3u8[^'"]*)['"]/i);
      if (hls) add('HLS', hls[1]);
    }
    checked.push({ s: 4, name: 'HLS', found: have() });

    // S12. KVS multi-url
    if (!have()) {
        var kvs = html.match(/video_url(?:_\d+p)?:\s*'([^']+)'/gi);
        if (kvs) {
            kvs.forEach(function(line) {
                var urlMatch = line.match(/'([^']+)'/);
                var labelMatch = line.match(/_(\d+p):/);
                if (urlMatch) add(labelMatch ? labelMatch[1] : 'HD', urlMatch[1]);
            });
        }
    }
    checked.push({ s: 12, name: 'KVS Multi', found: have() });

    return { qualities: q, checked: checked };
  }

  // ============================================================
  // §6. ПАРСИНГ ПЛЕЙЛИСТА
  // ============================================================
  var CARD_SELECTORS = ['.item', '.video-block', '.thumb-item', '.video-item'];

  function parsePlaylist(html) {
    var results = [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = null;

    for (var i = 0; i < CARD_SELECTORS.length; i++) {
      items = doc.querySelectorAll(CARD_SELECTORS[i]);
      if (items && items.length > 0) break;
    }

    if (!items || items.length === 0) {
        // Fallback a[href*="/video/"]
        var links = doc.querySelectorAll('a[href*="/video/"]');
        links.forEach(function(a) {
            var href = cleanUrl(a.getAttribute('href'));
            if (href && results.filter(function(r){return r.video === href}).length === 0) {
               results.push(makeCard(a.title || slugToTitle(href), href, '', ''));
            }
        });
        return results;
    }

    items.forEach(function(el) {
      var link = el.querySelector('a[href*="/video/"]');
      if (!link) return;
      var href = cleanUrl(link.getAttribute('href'));
      var img = el.querySelector('img');
      var pic = img ? (img.getAttribute('data-original') || img.getAttribute('src')) : '';
      var title = el.querySelector('.title, .video-title, a[title]') || link;
      var name = (title.getAttribute('title') || title.textContent).trim();
      var dur = el.querySelector('.duration, .time');
      
      results.push(makeCard(name, href, cleanUrl(pic), dur ? dur.textContent.trim() : ''));
    });

    return results;
  }

  function makeCard(name, href, pic, time) {
    return { name: name, video: href, picture: pic, time: time, quality: 'HD', json: true, source: NAME };
  }

  // ============================================================
  // §7-9. URL BUILDER & ROUTING
  // ============================================================
  function buildUrl(type, value, page) {
    var url = HOST;
    if (type === 'search') url += '/?q=' + encodeURIComponent(value) + '&page=' + page;
    else if (type === 'cat') url += '/category/' + value + '/?page=' + page;
    else url += '/?page=' + page;
    return url;
  }

  function routeView(url, page, success, error) {
    var fetchUrl = buildUrl('main', null, page);
    if (url.indexOf('search=') !== -1) {
        fetchUrl = buildUrl('search', decodeURIComponent(url.split('search=')[1]), page);
    } else if (url.indexOf('/cat/') !== -1) {
        fetchUrl = buildUrl('cat', url.split('/cat/')[1], page);
    }
    
    logInfo(TAG, 'Route: ' + fetchUrl);
    httpGet(fetchUrl, function(html) {
      var res = parsePlaylist(html);
      if (res.length === 0) return error('No content');
      success({
        results: res,
        collection: true,
        total_pages: res.length >= 20 ? page + 1 : page,
        menu: buildMenu()
      });
    }, error);
  }

  function buildMenu() {
