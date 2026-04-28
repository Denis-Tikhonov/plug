// =============================================================
// xham.js — Парсер xhamster.com для AdultJS
// Version  : 1.2.0
// =============================================================
// Изменения:
//   [1.0.0] Начальная версия
//   [1.1.0] BUGFIX: лимит window.initials 600K → 1500K
//   [1.1.0] BUGFIX: total_pages порог 50 → 28
//   [1.1.0] BUGFIX: доп. CSS-селекторы карточек
//   [1.1.0] BUGFIX: getPicture() с xhcdn lazy-load атрибутами
//   [1.1.0] BUGFIX: depth-счётчик только { }
//   [1.1.0] IMPROVE: S2 ищет все "sources":[ и берёт последнее
//   [1.2.0] BUGFIX: qualities() — прямой fetch для страницы видео.
//           SS.js v1.6.0 proxyVideoUrl() оборачивает element.video
//           в Worker URL перед вызовом qualities(). Worker загружает
//           страницу и возвращает HTML — это правильно. НО плеер
//           Lampa делает preflight HEAD/GET на страницу видео сам,
//           с Referer = Worker URL. xHamster видит Worker как Referer
//           и отдаёт ECHO/страницу без window.initials.
//           Решение: qualities() всегда использует оригинальный URL
//           (без Worker), загружая страницу прямым fetch TV-браузера.
//           xHamster доступен напрямую с Android TV.
//           CDN URL из window.initials (xhcdn.com) передаются в плеер
//           через proxyVideoUrl — Worker с правильным Referer.
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.2.0';
  var NAME    = 'xham';
  var HOST    = 'https://xhamster.com';
  var TAG     = '[' + NAME + ' v' + VERSION + ']';

  var CATEGORIES = [
    { title: '18 Year Old',         slug: '18-year-old'         },
    { title: 'Amateur',             slug: 'amateur'             },
    { title: 'Anal',                slug: 'anal'                },
    { title: 'Arab',                slug: 'arab'                },
    { title: 'Asian',               slug: 'asian'               },
    { title: 'BBW',                 slug: 'bbw'                 },
    { title: 'BDSM',                slug: 'bdsm'                },
    { title: 'Big Ass',             slug: 'big-ass'             },
    { title: 'Big Cock',            slug: 'big-cock'            },
    { title: 'Big Natural Tits',    slug: 'big-natural-tits'    },
    { title: 'Big Tits',            slug: 'big-tits'            },
    { title: 'Bisexual',            slug: 'bisexual'            },
    { title: 'Black',               slug: 'black'               },
    { title: 'Blonde',              slug: 'blonde'              },
    { title: 'Blowjob',             slug: 'blowjob'             },
    { title: 'British',             slug: 'british'             },
    { title: 'Cartoon',             slug: 'cartoon'             },
    { title: 'Cheating',            slug: 'cheating'            },
    { title: 'Close-up',            slug: 'close-up'            },
    { title: 'Compilation',         slug: 'compilation'         },
    { title: 'Cougar',              slug: 'cougar'              },
    { title: 'Creampie',            slug: 'creampie'            },
    { title: 'Cuckold',             slug: 'cuckold'             },
    { title: 'Cumshot',             slug: 'cumshot'             },
    { title: 'Desi',                slug: 'desi'                },
    { title: 'Eating Pussy',        slug: 'eating-pussy'        },
    { title: 'Femdom',              slug: 'femdom'              },
    { title: 'First Time',          slug: 'first-time'          },
    { title: 'Gangbang',            slug: 'gangbang'            },
    { title: 'Granny',              slug: 'granny'              },
    { title: 'Group Sex',           slug: 'group-sex'           },
    { title: 'Hairy',               slug: 'hairy'               },
    { title: 'Handjob',             slug: 'handjob'             },
    { title: 'Hardcore',            slug: 'hardcore'            },
    { title: 'Hentai',              slug: 'hentai'              },
    { title: 'Homemade',            slug: 'homemade'            },
    { title: 'Indian',              slug: 'indian'              },
    { title: 'Interracial',         slug: 'interracial'         },
    { title: 'Lesbian',             slug: 'lesbian'             },
    { title: 'Massage',             slug: 'massage'             },
    { title: 'Mature',              slug: 'mature'              },
    { title: 'MILF',                slug: 'milf'                },
    { title: 'Mom',                 slug: 'mom'                 },
    { title: 'Nude',                slug: 'nude'                },
    { title: 'Old & Young',         slug: 'old-young'           },
    { title: 'Retro',               slug: 'retro'               },
    { title: 'Solo',                slug: 'solo'                },
    { title: 'Squirting',           slug: 'squirting'           },
    { title: 'Stockings',           slug: 'stockings'           },
    { title: 'Threesome',           slug: 'threesome'           },
    { title: 'Toys',                slug: 'toys'                },
    { title: 'Webcam',              slug: 'webcam'              },
  ];

  // ============================================================
  // §2. ТРАНСПОРТ
  // httpGet      — каталог, поиск (через Worker)
  // httpGetDirect — video-страница (прямой fetch TV-браузера)
  // ============================================================
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(success)
        .catch(error);
    }
  }

  // [1.2.0] Прямой fetch — xHamster доступен напрямую с Android TV
  // Используется в qualities() чтобы получить window.initials без
  // искажений от Worker (ECHO-статус, неправильный Referer).
  function httpGetDirect(url, success, error) {
    if (typeof fetch === 'undefined') { httpGet(url, success, error); return; }
    console.log(TAG, 'httpGetDirect →', url);
    fetch(url, {
      method: 'GET',
      headers: {
        'Referer':    HOST + '/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      }
    })
      .then(function (r) {
        if (!r.ok) {
          console.warn(TAG, 'direct HTTP', r.status, '→ fallback Worker');
          httpGet(url, success, error);
          return null;
        }
        return r.text();
      })
      .then(function (text) { if (text) success(text); })
      .catch(function (e) {
        console.warn(TAG, 'direct failed:', e.message, '→ fallback Worker');
        httpGet(url, success, error);
      });
  }

  // [1.2.0] Извлечь оригинальный URL из проксированного Worker URL
  function unwrapWorkerUrl(url) {
    if (!url) return url;
    var w = (window.AdultPlugin && window.AdultPlugin.workerUrl)
      ? window.AdultPlugin.workerUrl : '';
    if (!w) return url;
    if (w.charAt(w.length - 1) !== '=') w = w + '=';
    if (url.indexOf(w) === 0) {
      try { return decodeURIComponent(url.substring(w.length)); } catch (e) {}
    }
    return url;
  }

  function cleanUrl(raw) {
    if (!raw) return '';
    try {
      var u = raw;
      u = u.replace(/\\\//g, '/').replace(/\\/g, '');
      if (u.indexOf('%') !== -1) { try { u = decodeURIComponent(u); } catch (e) {} }
      if (u.indexOf('//') === 0) u = 'https:' + u;
      if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
      return u;
    } catch (e) { return raw; }
  }

  // ============================================================
  // §4. extractQualities
  // xhamster: window.initials → xhVideoPage.videoModel.sources[]
  // ============================================================
  function extractQualities(html) {
    var q = {};

    // S1 — window.initials
    try {
      var idxInit = html.indexOf('window.initials');
      if (idxInit !== -1) {
        var braceStart = html.indexOf('{', idxInit);
        if (braceStart !== -1) {
          var depth = 0, braceEnd = -1;
          var limit = Math.min(html.length, braceStart + 1500000);
          for (var ci = braceStart; ci < limit; ci++) {
            var ch = html[ci];
            if (ch === '{') depth++;
            else if (ch === '}') { depth--; if (depth === 0) { braceEnd = ci; break; } }
          }
          if (braceEnd !== -1) {
            var rawJson = html.substring(braceStart, braceEnd + 1).replace(/\\\//g, '/');
            var init = JSON.parse(rawJson);
            var vms = [
              init.xhVideoPage  && init.xhVideoPage.videoModel,
              init.videoPage    && init.videoPage.videoModel,
              init.pageProps    && init.pageProps.videoModel,
              init.videoModel,
            ];
            for (var vi = 0; vi < vms.length; vi++) {
              var vm = vms[vi];
              if (!vm) continue;
              var sources = vm.sources || vm.streams || vm.qualities || [];
              if (!Array.isArray(sources) || !sources.length) continue;
              sources.forEach(function (s) {
                if (!s) return;
                var u = s.url || s.src || s.file || '';
                if (!u || u.indexOf('http') !== 0) return;
                var ql  = String(s.quality || s.label || s.res || 'HD');
                var key = /^\d+$/.test(ql) ? ql + 'p' : ql;
                if (!q[key]) q[key] = u;
              });
              if (Object.keys(q).length) break;
            }
          }
        }
      }
    } catch (e) { console.warn(TAG, 'S1 window.initials error:', e.message || e); }

    // S2 — последнее "sources":[ или "streams":[
    if (!Object.keys(q).length) {
      try {
        var bestIdx = -1;
        ['\"sources\":[', '\"streams\":['].forEach(function (sk) {
          var i = 0;
          while (i < html.length) {
            var pos = html.indexOf(sk, i); if (pos === -1) break;
            if (pos > bestIdx) bestIdx = pos; i = pos + 1;
          }
        });
        if (bestIdx !== -1) {
          var arrStart = html.indexOf('[', bestIdx);
          if (arrStart !== -1) {
            var depth2 = 0, arrEnd = -1, lim2 = Math.min(html.length, arrStart + 80000);
            for (var ci2 = arrStart; ci2 < lim2; ci2++) {
              var c2 = html[ci2];
              if (c2 === '[' || c2 === '{') depth2++;
              else if (c2 === ']' || c2 === '}') { depth2--; if (depth2 === 0) { arrEnd = ci2; break; } }
            }
            if (arrEnd !== -1) {
              JSON.parse(html.substring(arrStart, arrEnd + 1).replace(/\\\//g, '/')).forEach(function (s) {
                if (!s) return;
                var u = s.url || s.src || s.file || '';
                if (!u || u.indexOf('http') !== 0) return;
                var ql = String(s.quality || s.label || s.res || 'HD');
                var key = /^\d+$/.test(ql) ? ql + 'p' : ql;
                if (!q[key]) q[key] = u;
              });
            }
          }
        }
      } catch (e) { console.warn(TAG, 'S2 sources error:', e.message || e); }
    }

    // S3 — xhP.setVideoConfig
    if (!Object.keys(q).length) {
      try {
        var cfgRe = /xhP\.setVideoConfig\((\{[\s\S]+?\})\)/;
        var cfgM  = html.match(cfgRe);
        if (cfgM) {
          var cfg = JSON.parse(cfgM[1].replace(/\\\//g, '/'));
          var ss  = cfg.sources || cfg.streams || [];
          ss.forEach(function (s) {
            var u = s.src || s.url || s.file || '';
            if (!u) return;
            var ql = String(s.label || s.quality || 'HD');
            if (!q[ql]) q[ql] = u.replace(/\\\//g, '/');
          });
        }
      } catch (e) { console.warn(TAG, 'S3 xhP error:', e.message || e); }
    }

    // S4 — mp4 brute
    if (!Object.keys(q).length) {
      var mp4Re = /["'](https?:(?:\\\/|\/)[^"'\s]+?\.mp4[^"'\s]*?)["']/gi;
      var mp4m, cnt = 0;
      while ((mp4m = mp4Re.exec(html)) !== null && cnt < 6) {
        var u = cleanUrl(mp4m[1]);
        if (!u || u.indexOf('{') !== -1) continue;
        var qm  = u.match(/_(\d+)[pP]?\.mp4/i);
        var key = qm ? qm[1] + 'p' : ('HD' + (cnt || ''));
        if (!q[key]) { q[key] = u; cnt++; }
      }
    }

    return q;
  }

  // ============================================================
  // §5. ПАРСИНГ КАРТОЧЕК
  // ============================================================
  function getPicture(imgEl) {
    if (!imgEl) return '';
    var pic = cleanUrl(
      imgEl.getAttribute('data-src')      ||
      imgEl.getAttribute('data-original') ||
      imgEl.getAttribute('data-thumb')    ||
      imgEl.getAttribute('data-lazy-src') ||
      imgEl.getAttribute('src')           || ''
    );
    if (pic && (pic.indexOf('spacer') !== -1 || pic.indexOf('blank') !== -1 ||
                pic.indexOf('data:') === 0 || pic.length < 12)) pic = '';
    return pic;
  }

  function parsePlaylist(html) {
    var results = [], seen = {};
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var items = doc.querySelectorAll('.video-thumb');
      if (!items || !items.length) items = doc.querySelectorAll('.thumb-list__item');
      if (!items || !items.length) items = doc.querySelectorAll('.video-thumb-block');

      if (!items || !items.length) {
        var links = doc.querySelectorAll('a[href*="/videos/"]');
        for (var j = 0; j < links.length; j++) {
          var lhref = links[j].getAttribute('href') || '';
          if (!lhref || seen[lhref]) continue;
          seen[lhref] = true;
          var lname = (links[j].getAttribute('title') || links[j].textContent || '').replace(/\s+/g, ' ').trim();
          if (lname) results.push(makeCard(lname, lhref, getPicture(links[j].querySelector('img')), ''));
        }
        return results;
      }

      for (var i = 0; i < items.length; i++) {
        var card = parseCard(items[i]);
        if (card && !seen[card.video]) { seen[card.video] = true; results.push(card); }
      }
    } catch (e) { console.warn(TAG, 'parsePlaylist error:', e.message || e); }
    console.log(TAG, 'parsePlaylist → карточек:', results.length);
    return results;
  }

  function parseCard(el) {
    var linkEl = el.querySelector('a[href*="/videos/"]');
    if (!linkEl) linkEl = el.querySelector('a[href]');
    if (!linkEl) return null;

    var href = linkEl.getAttribute('href') || '';
    if (!href) return null;
    if (href.indexOf('http') !== 0) href = HOST + (href.charAt(0) === '/' ? '' : '/') + href;

    var name = (linkEl.getAttribute('title') || '').trim();
    if (!name) { var ta = el.querySelector('a[title]'); if (ta) name = (ta.getAttribute('title') || '').trim(); }
    if (!name) { var la = el.querySelector('[aria-label]'); if (la) name = (la.getAttribute('aria-label') || '').trim(); }
    if (!name) name = (linkEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (!name) return null;

    var pic  = getPicture(el.querySelector('img'));
    var durEl = el.querySelector('[class*="duration"]') || el.querySelector('.duration');
    var time  = durEl ? durEl.textContent.replace(/[^\d:]/g, '').trim() : '';
    return makeCard(name, href, pic, time);
  }

  function makeCard(name, href, pic, time) {
    if (href && href.indexOf('http') !== 0) href = HOST + (href.charAt(0) === '/' ? '' : '/') + href;
    return { name: name, video: href, picture: pic, img: pic, poster: pic, background_image: pic, preview: null, time: time || '', quality: 'HD', json: true, source: NAME };
  }

  function slugToTitle(url) {
    if (!url) return '';
    var parts = url.replace(/\?.*/, '').replace(/\/+$/, '').split('/').filter(Boolean);
    var slug = parts[parts.length - 1] || '';
    if (/^\d+$/.test(slug) && parts.length > 1) slug = parts[parts.length - 2] || '';
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); }).trim();
  }

  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    if (type === 'search') { var u = HOST + '/search/video?q=' + encodeURIComponent(value); return page > 1 ? u + '&page=' + page : u; }
    if (type === 'cat')    { var u = HOST + '/categories/' + value; return page > 1 ? u + '?page=' + page : u; }
    var u = HOST + '/videos/'; return page > 1 ? u + '?page=' + page : u;
  }

  function buildMenu() {
    return [
      { title: '🔍 Search',    search_on: true, playlist_url: NAME + '/search/' },
      { title: '📂 Categories', playlist_url: 'submenu', submenu: CATEGORIES.map(function (c) { return { title: c.title, playlist_url: NAME + '/cat/' + c.slug }; }) },
    ];
  }

  function routeView(url, page, success, error) {
    var sm = url.match(/[?&]search=([^&]*)/);
    if (sm) return loadPage(buildUrl('search', decodeURIComponent(sm[1]), page), page, success, error);
    if (url.indexOf(NAME + '/cat/')    === 0) return loadPage(buildUrl('cat',    url.replace(NAME + '/cat/',    '').split('?')[0], page), page, success, error);
    if (url.indexOf(NAME + '/search/') === 0) { var rawQ = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim(); if (rawQ) return loadPage(buildUrl('search', rawQ, page), page, success, error); }
    loadPage(buildUrl('main', null, page), page, success, error);
  }

  function loadPage(fetchUrl, page, success, error) {
    console.log(TAG, 'loadPage →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }
      success({ results: results, collection: true, total_pages: results.length >= 28 ? page + 1 : page, menu: buildMenu() });
    }, error);
  }

  var XhamParser = {
    main:   function (p, s, e) { routeView(NAME, 1, s, e); },
    view:   function (p, s, e) { routeView(p.url || NAME, p.page || 1, s, e); },
    search: function (p, s, e) {
      var q = (p.query || '').trim(), pg = parseInt(p.page, 10) || 1;
      if (!q) { s({ title: '', results: [], collection: true, total_pages: 1 }); return; }
      httpGet(buildUrl('search', q, pg), function (html) {
        var r = parsePlaylist(html);
        s({ title: 'xHamster: ' + q, results: r, collection: true, total_pages: r.length >= 28 ? pg + 1 : pg });
      }, e);
    },

    // [1.2.0] BUGFIX: qualities() получает originalUrl без Worker-обёртки.
    // SS.js v1.6.0 proxyVideoUrl() мог передать сюда уже проксированный URL.
    // Разворачиваем его → загружаем страницу прямым fetch TV-браузера.
    // Это даёт чистый HTML с window.initials без ECHO-артефактов Worker.
    qualities: function (videoPageUrl, success, error) {
      // Снимаем Worker-обёртку если есть
      var originalUrl = unwrapWorkerUrl(videoPageUrl);
      console.log(TAG, 'qualities() →', originalUrl);

      httpGetDirect(originalUrl, function (html) {
        if (!html || html.length < 500) { error('Страница видео недоступна'); return; }
        var found = extractQualities(html);
        var keys  = Object.keys(found);
        console.log(TAG, 'qualities() найдено:', keys.length, JSON.stringify(keys));
        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn(TAG, 'html.length=', html.length, 'window.initials=', html.indexOf('window.initials') !== -1, 'sources=', (html.match(/"sources"/g)||[]).length);
          error('Видео не найдено — возможно premium-контент');
        }
      }, error);
    },
  };

  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, XhamParser);
      console.log(TAG, 'зарегистрирован');
      return true;
    }
    return false;
  }
  if (!tryRegister()) {
    var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }
})();
