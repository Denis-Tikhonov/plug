// =============================================================
// vprn.js — Парсер winporn.club для AdultJS
// Version  : 1.0.0
// Site     : https://www.winporn.club
// Engine   : KVS (Kernel Video Sharing)
// Strategy : SSR каталог, mp4-brute для qualities (прямые CDN)
// Worker   : www.winporn.club, g5.wppsn.com, g*.wppsn.com
//            — все должны быть в ALLOWED_TARGETS
// Cookie   : mature=1  (Age Gate — обязателен)
// ВАЖНО    : Главная (/categories) — страница выбора языка (LI.langs-item),
//            не содержит видео. Каталог начинается с /most-popular/
//            или /?c=... Парсер использует /most-popular/ как главную.
//            CDN постеров и видео: g1.wppsn.com … g9.wppsn.com
// =============================================================
// Изменения:
//   [1.0.0] Начальная версия
//           Каталог: .item (KVS) + fallback a[href*="/video/"]
//           Qualities: S1 video_url / kt_player
//                      S2 JSON sources
//                      S3 mp4-brute (основной, CDN g*.wppsn.com)
//           Пагинация: &page=N (KVS-стандарт)
//           Cookie mature=1 пробрасывается через Worker BYPASS_COOKIES
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.0.0';
  var NAME    = 'vprn';
  var HOST    = 'https://www.winporn.club';
  var TAG     = '[' + NAME + ' v' + VERSION + ']';

  // ============================================================
  // §1. КАТЕГОРИИ
  // winporn — KVS-сайт, slug-категории из стандартных разделов
  // ============================================================
  var CATEGORIES = [
    { title: 'Amateur',      slug: 'amateur'      },
    { title: 'Anal',         slug: 'anal'         },
    { title: 'Asian',        slug: 'asian'        },
    { title: 'BBW',          slug: 'bbw'          },
    { title: 'BDSM',         slug: 'bdsm'         },
    { title: 'Big Ass',      slug: 'big-ass'      },
    { title: 'Big Tits',     slug: 'big-tits'     },
    { title: 'Blowjob',      slug: 'blowjob'      },
    { title: 'Casting',      slug: 'casting'      },
    { title: 'Compilation',  slug: 'compilation'  },
    { title: 'Creampie',     slug: 'creampie'     },
    { title: 'Cumshot',      slug: 'cumshot'      },
    { title: 'Double Penetration', slug: 'double-penetration' },
    { title: 'Ebony',        slug: 'ebony'        },
    { title: 'Facial',       slug: 'facial'       },
    { title: 'Gangbang',     slug: 'gangbang'     },
    { title: 'Hardcore',     slug: 'hardcore'     },
    { title: 'Interracial',  slug: 'interracial'  },
    { title: 'Latina',       slug: 'latina'       },
    { title: 'Lesbian',      slug: 'lesbian'      },
    { title: 'Masturbation', slug: 'masturbation' },
    { title: 'Mature',       slug: 'mature'       },
    { title: 'MILF',         slug: 'milf'         },
    { title: 'Orgy',         slug: 'orgy'         },
    { title: 'POV',          slug: 'pov'          },
    { title: 'Public',       slug: 'public'       },
    { title: 'Russian',      slug: 'russian'      },
    { title: 'Squirt',       slug: 'squirt'       },
    { title: 'Teen (18+)',   slug: 'teen'         },
    { title: 'Threesome',    slug: 'threesome'    },
  ];

  // ============================================================
  // §2. ТРАНСПОРТ
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

  // ============================================================
  // §3. cleanUrl
  // ============================================================
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
  // winporn CDN: g1.wppsn.com … g9.wppsn.com
  // Видео лежат по пути /media/videos/tmb/{id}/{id}.mp4
  // Плеер KVS kt_player, но CDN прямые (без редиректов).
  //
  // S1: video_url / video_url_360p и т.д.
  // S2: JSON sources:[{file,label}]
  // S3: mp4-brute — wppsn.com CDN (основной путь)
  // ============================================================
  function extractQualities(html) {
    var q = {};

    // S1 — kt_player video_url
    try {
      var patterns = [
        /video_url\s*[:=]\s*['"]([^'"]+)['"]/i,
        /video_url_text\s*[:=]\s*['"]([^'"]+)['"]/i,
        /"video_url"\s*:\s*"([^"]+)"/i,
        /flashvars\.video_url\s*=\s*['"]([^'"]+)['"]/i,
      ];
      for (var pi = 0; pi < patterns.length; pi++) {
        var pm = html.match(patterns[pi]);
        if (pm && pm[1]) {
          var u = cleanUrl(pm[1]);
          if (u && u.indexOf('http') === 0) {
            if (!q['High Quality']) q['High Quality'] = u;
            var qlm = u.match(/_(\d+p)\.mp4/i);
            if (qlm && !q[qlm[1]]) q[qlm[1]] = u;
            break;
          }
        }
      }
      // Мульти-качество: video_url_360p, video_url_720p ...
      var resRe = /video_url_(\w+)\s*[:=]\s*['"]([^'"]+)['"]/gi;
      var rm;
      while ((rm = resRe.exec(html)) !== null) {
        var label = rm[1];
        var url   = cleanUrl(rm[2]);
        if (url && url.indexOf('http') === 0 && !q[label]) q[label] = url;
      }
    } catch (e) {
      console.warn(TAG, 'S1 kt_player error:', e.message || e);
    }

    // S2 — JSON sources
    if (!Object.keys(q).length) {
      try {
        var bestIdx = -1;
        var srcKeys = ['"sources":[', '"files":['];
        for (var ki = 0; ki < srcKeys.length; ki++) {
          var idx2 = 0;
          while (idx2 < html.length) {
            var pos = html.indexOf(srcKeys[ki], idx2);
            if (pos === -1) break;
            if (pos > bestIdx) bestIdx = pos;
            idx2 = pos + 1;
          }
        }
        if (bestIdx !== -1) {
          var aStart = html.indexOf('[', bestIdx);
          if (aStart !== -1) {
            var depth = 0, aEnd = -1;
            var lim = Math.min(html.length, aStart + 50000);
            for (var ci = aStart; ci < lim; ci++) {
              var ch = html[ci];
              if (ch === '[' || ch === '{') depth++;
              else if (ch === ']' || ch === '}') {
                depth--;
                if (depth === 0) { aEnd = ci; break; }
              }
            }
            if (aEnd !== -1) {
              var arr = JSON.parse(html.substring(aStart, aEnd + 1).replace(/\\\//g, '/'));
              arr.forEach(function (s) {
                var u = cleanUrl(s.file || s.url || s.src || '');
                if (!u || u.indexOf('http') !== 0) return;
                var lbl = String(s.label || s.quality || s.res || 'HD');
                var key = /^\d+$/.test(lbl) ? lbl + 'p' : lbl;
                if (!q[key]) q[key] = u;
              });
            }
          }
        }
      } catch (e) {
        console.warn(TAG, 'S2 sources error:', e.message || e);
      }
    }

    // S3 — mp4-brute (wppsn.com CDN)
    // winporn CDN: https://g5.wppsn.com/media/videos/tmb/{id}/{id}.mp4
    if (!Object.keys(q).length) {
      var mp4Re = /["'](https?:(?:\\\/|\/)[^"'\s]+?\.mp4[^"'\s]*?)["']/gi;
      var mp4m, cnt = 0;
      while ((mp4m = mp4Re.exec(html)) !== null && cnt < 8) {
        var u = cleanUrl(mp4m[1]);
        if (!u || u.indexOf('{') !== -1) continue;
        // Предпочитаем wppsn.com
        var isWppsn = u.indexOf('wppsn.com') !== -1;
        var qm  = u.match(/_(\d+p?)\.mp4/i);
        var key = qm ? (/^\d+$/.test(qm[1]) ? qm[1] + 'p' : qm[1]) :
                  (isWppsn ? 'HD' + (cnt || '') : 'src' + cnt);
        if (!q[key]) { q[key] = u; cnt++; }
      }
    }

    return q;
  }

  // ============================================================
  // §5. ПАРСИНГ КАРТОЧЕК
  // KVS стандарт: .item
  // ВАЖНО: LI.langs-item — это языковой переключатель, не видео!
  //        Они намеренно исключаются (проверка href на /video/)
  // Постер: img[src] / data-src (CDN g*.wppsn.com)
  // ============================================================
  function getPicture(imgEl) {
    if (!imgEl) return '';
    var pic = cleanUrl(
      imgEl.getAttribute('data-src')      ||
      imgEl.getAttribute('data-original') ||
      imgEl.getAttribute('data-lazy-src') ||
      imgEl.getAttribute('src')           || ''
    );
    if (pic && (pic.indexOf('spacer') !== -1 || pic.indexOf('blank') !== -1 ||
                pic.indexOf('data:') === 0 || pic.length < 10)) {
      pic = '';
    }
    // Дополнительно: отбрасываем иконки флагов (не видео-постеры)
    if (pic && pic.indexOf('flag_icons') !== -1) pic = '';
    return pic;
  }

  function parsePlaylist(html) {
    var results = [];
    var seen    = {};
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      // KVS стандарт
      var items = doc.querySelectorAll('.item');

      if (!items || !items.length) {
        console.log(TAG, 'parsePlaylist → fallback a[href*="/video/"]');
        var links = doc.querySelectorAll('a[href*="/video/"]');
        for (var j = 0; j < links.length; j++) {
          var href = links[j].getAttribute('href') || '';
          if (!href || href === '#' || href.indexOf('javascript') === 0 || seen[href]) continue;
          if (href.indexOf('http') !== 0) href = HOST + (href.charAt(0) === '/' ? '' : '/') + href;
          seen[href] = true;
          var imgA  = links[j].querySelector('img');
          var picA  = getPicture(imgA);
          var nameA = (links[j].getAttribute('title') || links[j].textContent || '').replace(/\s+/g, ' ').trim();
          if (!nameA) nameA = slugToTitle(href);
          if (nameA) results.push(makeCard(nameA, href, picA, ''));
        }
        return results;
      }

      for (var i = 0; i < items.length; i++) {
        var card = parseCard(items[i]);
        if (card && !seen[card.video]) {
          seen[card.video] = true;
          results.push(card);
        }
      }
    } catch (e) {
      console.warn(TAG, 'parsePlaylist error:', e.message || e);
    }
    console.log(TAG, 'parsePlaylist → карточек:', results.length);
    return results;
  }

  function parseCard(el) {
    var linkEl = el.querySelector('a[href*="/video/"]');
    if (!linkEl) linkEl = el.querySelector('a[href]');
    if (!linkEl) return null;

    var href = linkEl.getAttribute('href') || '';
    if (!href || href === '#' || href.indexOf('javascript') === 0) return null;
    // Исключаем языковые переключатели (langs-item)
    if (href.indexOf('void(0)') !== -1) return null;
    if (href.indexOf('http') !== 0) href = HOST + (href.charAt(0) === '/' ? '' : '/') + href;

    var name = (linkEl.getAttribute('title') || '').trim();
    if (!name) {
      var tEl = el.querySelector('.title') || el.querySelector('.name') || el.querySelector('strong');
      if (tEl) name = tEl.textContent.replace(/\s+/g, ' ').trim();
    }
    if (!name) {
      var aTitle = el.querySelector('a[title]');
      if (aTitle) name = (aTitle.getAttribute('title') || '').trim();
    }
    if (!name) name = slugToTitle(href);
    if (!name) return null;

    var imgEl = el.querySelector('img');
    var pic   = getPicture(imgEl);

    var durEl = el.querySelector('.time') || el.querySelector('.duration') || el.querySelector('[class*="time"]');
    var time  = durEl ? durEl.textContent.replace(/[^\d:]/g, '').trim() : '';

    return makeCard(name, href, pic, time);
  }

  function makeCard(name, href, pic, time) {
    return {
      name:             name,
      video:            href,
      picture:          pic,
      img:              pic,
      poster:           pic,
      background_image: pic,
      preview:          null,
      time:             time || '',
      quality:          'HD',
      json:             true,
      source:           NAME,
    };
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

  // ============================================================
  // §6. URL BUILDER
  // Main:   https://www.winporn.club/most-popular/
  //         (главная /categories — языковой switcher, не видео!)
  // Search: https://www.winporn.club/?q={query}&page=N
  // Cat:    https://www.winporn.club/?c={slug}&page=N
  // Pag:    &page=N
  // ============================================================
  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    var base;
    if (type === 'search') {
      base = HOST + '/?q=' + encodeURIComponent(value);
      return page > 1 ? base + '&page=' + page : base;
    }
    if (type === 'cat') {
      base = HOST + '/?c=' + encodeURIComponent(value);
      return page > 1 ? base + '&page=' + page : base;
    }
    // main — most-popular (содержит реальные видео в отличие от /categories)
    base = HOST + '/most-popular/';
    return page > 1 ? base + '?page=' + page : base;
  }

  // ============================================================
  // §7. МЕНЮ
  // ============================================================
  function buildMenu() {
    return [
      {
        title:        '🔍 Search',
        search_on:    true,
        playlist_url: NAME + '/search/',
      },
      {
        title:        '📂 Categories',
        playlist_url: 'submenu',
        submenu:      CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ============================================================
  // §8. РОУТИНГ
  // ============================================================
  function routeView(url, page, success, error) {
    console.log(TAG, 'routeView →', url, 'page=' + page);
    var sm = url.match(/[?&]search=([^&]*)/);
    if (sm) {
      return loadPage(buildUrl('search', decodeURIComponent(sm[1]), page), page, success, error);
    }
    if (url.indexOf(NAME + '/cat/') === 0) {
      var cat = url.replace(NAME + '/cat/', '').split('?')[0];
      return loadPage(buildUrl('cat', cat, page), page, success, error);
    }
    if (url.indexOf(NAME + '/search/') === 0) {
      var rawQ = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      if (rawQ) return loadPage(buildUrl('search', rawQ, page), page, success, error);
    }
    loadPage(buildUrl('main', null, page), page, success, error);
  }

  function loadPage(fetchUrl, page, success, error) {
    console.log(TAG, 'loadPage →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }
      success({
        results:     results,
        collection:  true,
        total_pages: results.length >= 28 ? page + 1 : page,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ============================================================
  // §9. ПУБЛИЧНЫЙ API
  // ============================================================
  var VprnParser = {

    main: function (params, success, error) {
      routeView(NAME, 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var q = (params.query || '').trim();
      var p = parseInt(params.page, 10) || 1;
      if (!q) { success({ title: '', results: [], collection: true, total_pages: 1 }); return; }
      httpGet(buildUrl('search', q, p), function (html) {
        var results = parsePlaylist(html);
        success({
          title:       'WinPorn: ' + q,
          results:     results,
          collection:  true,
          total_pages: results.length >= 28 ? p + 1 : p,
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);
      httpGet(videoPageUrl, function (html) {
        if (!html || html.length < 500) { error('Страница видео недоступна'); return; }
        var found = extractQualities(html);
        var keys  = Object.keys(found);
        console.log(TAG, 'qualities() найдено:', keys.length, JSON.stringify(keys));
        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn(TAG, 'html.length =',     html.length);
          console.warn(TAG, 'video_url found =', html.indexOf('video_url') !== -1);
          console.warn(TAG, 'wppsn found =',     html.indexOf('wppsn.com') !== -1);
          console.warn(TAG, '.mp4 cnt =',        (html.match(/\.mp4/gi) || []).length);
          error('Видео не найдено — проверьте Worker (g*.wppsn.com в whitelist)');
        }
      }, error);
    },
  };

  // ============================================================
  // §10. РЕГИСТРАЦИЯ
  // ============================================================
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, VprnParser);
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
