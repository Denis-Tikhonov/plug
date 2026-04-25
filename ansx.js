// =============================================================
// ansx.js — Парсер ru.anysex.com для AdultJS
// Version  : 1.0.0
// Site     : https://ru.anysex.com
// Engine   : KVS (Kernel Video Sharing)
// Strategy : SSR каталог, <source title="1080p"> для qualities
// Worker   : ru.anysex.com, ahcdn.com, vcdn.anysex.com
//            — все должны быть в ALLOWED_TARGETS
// Headers  : Referer: https://ru.anysex.com/  (обязателен)
// CDN      : ip*.ahcdn.com → JWT-подписанные URL, следовать 302
// AGE GATE : js-overlay — Worker посылает запрос без JS,
//            overlay не активируется, HTML получаем сразу
// Qualities: <source src="/get_file/1/{hash}/..." title="1080p">
//            метод title-attr (KVS стандарт)
// =============================================================
// Изменения:
//   [1.0.0] Начальная версия
//           Каталог: .item + fallback a[href*="/video/"]
//           Qualities: S1 <source title-attr> (DOMParser + regex)
//                      S2 video_url / kt_player
//                      S3 JSON sources
//                      S4 mp4-brute
//           Search: /search/?q={query}
//           Cat:    /categories/{slug}/
//           Channel:/channels/{slug}/
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.0.0';
  var NAME    = 'ansx';
  var HOST    = 'https://ru.anysex.com';
  var TAG     = '[' + NAME + ' v' + VERSION + ']';

  // ============================================================
  // §1. КАТЕГОРИИ (из JSON — отобраны основные видео-категории,
  //     slug "categories" и "ai" исключены — это разделы сайта)
  // ============================================================
  var CATEGORIES = [
    { title: 'Amateur',        slug: 'amateur'        },
    { title: 'Anal',           slug: 'anal'           },
    { title: 'Asian',          slug: 'asian'          },
    { title: 'BBW',            slug: 'bbw'            },
    { title: 'BDSM',           slug: 'bdsm'           },
    { title: 'Big Ass',        slug: 'big-ass'        },
    { title: 'Big Tits',       slug: 'big-tits'       },
    { title: 'Blowjob',        slug: 'blowjob'        },
    { title: 'Casting',        slug: 'casting'        },
    { title: 'Compilation',    slug: 'compilation'    },
    { title: 'Creampie',       slug: 'creampie'       },
    { title: 'Cumshot',        slug: 'cumshot'        },
    { title: 'Ebony',          slug: 'ebony'          },
    { title: 'Facial',         slug: 'facial'         },
    { title: 'Gangbang',       slug: 'gangbang'       },
    { title: 'Granny',         slug: 'granny'         },
    { title: 'Group Sex',      slug: 'group-sex'      },
    { title: 'Hardcore',       slug: 'hardcore'       },
    { title: 'Interracial',    slug: 'interracial'    },
    { title: 'Latina',         slug: 'latina'         },
    { title: 'Lesbian',        slug: 'lesbian'        },
    { title: 'Massage',        slug: 'massage'        },
    { title: 'Masturbation',   slug: 'masturbation'   },
    { title: 'Mature',         slug: 'mature'         },
    { title: 'MILF',           slug: 'milf'           },
    { title: 'Old & Young',    slug: 'old-young'      },
    { title: 'Outdoor',        slug: 'outdoor'        },
    { title: 'POV',            slug: 'pov'            },
    { title: 'Public',         slug: 'public'         },
    { title: 'Russian',        slug: 'russian'        },
    { title: 'Squirt',         slug: 'squirt'         },
    { title: 'Stockings',      slug: 'stockings'      },
    { title: 'Teen (18+)',     slug: 'teen'           },
    { title: 'Threesome',      slug: 'threesome'      },
  ];

  // ============================================================
  // §2. КАНАЛЫ
  // ============================================================
  var CHANNELS = [
    { title: 'Bang Bros Network',    slug: 'bang-bros-network'    },
    { title: 'Step Siblings Caught', slug: 'step-siblings-caught' },
    { title: 'Teen Mega World',      slug: 'teen-mega-world'      },
    { title: 'Family Strokes',       slug: 'family-strokes'       },
    { title: 'The Habib Show',       slug: 'the-habib-show'       },
    { title: 'My Pervy Family',      slug: 'my-pervy-family'      },
  ];

  // ============================================================
  // §3. ТРАНСПОРТ
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
  // §4. cleanUrl
  // anysex: /get_file/1/... — относительные пути, нужен HOST
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
  // §5. extractQualities
  // anysex: KVS <source src="/get_file/1/..." title="1080p">
  //         метод title-attr — основной
  //
  // S1: DOMParser → source[title] внутри video
  // S2: regex <source src="..." title="...">
  // S3: video_url / kt_player fallback
  // S4: JSON sources
  // S5: mp4-brute
  // ============================================================
  function extractQualities(html) {
    var q = {};

    // S1 — DOMParser: <source src title>
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var containers = [
        doc.querySelector('video'),
        doc,
      ];
      for (var ci = 0; ci < containers.length; ci++) {
        if (!containers[ci]) continue;
        var srcs = containers[ci].querySelectorAll('source[src][title]');
        for (var si = 0; si < srcs.length; si++) {
          var src = srcs[si].getAttribute('src') || '';
          if (!src) continue;
          src = cleanUrl(src);
          if (!src || src.indexOf('http') !== 0) continue;
          var label = (srcs[si].getAttribute('title') || '').trim();
          if (!label) label = 'HD';
          // Нормализуем "1080" → "1080p"
          if (/^\d+$/.test(label)) label = label + 'p';
          if (!q[label]) q[label] = src;
        }
        if (Object.keys(q).length) break;
      }
    } catch (e) {
      console.warn(TAG, 'S1 DOMParser error:', e.message || e);
    }

    // S2 — regex для <source> (оба порядка атрибутов)
    if (!Object.keys(q).length) {
      try {
        var re1 = /<source[^>]+src="([^"]+)"[^>]+title="([^"]+)"/gi;
        var re2 = /<source[^>]+title="([^"]+)"[^>]+src="([^"]+)"/gi;
        var m;
        while ((m = re1.exec(html)) !== null) {
          var u = cleanUrl(m[1]);
          var lbl = m[2].trim();
          if (/^\d+$/.test(lbl)) lbl = lbl + 'p';
          if (u && u.indexOf('http') === 0 && !q[lbl]) q[lbl] = u;
        }
        if (!Object.keys(q).length) {
          while ((m = re2.exec(html)) !== null) {
            var u = cleanUrl(m[2]);
            var lbl = m[1].trim();
            if (/^\d+$/.test(lbl)) lbl = lbl + 'p';
            if (u && u.indexOf('http') === 0 && !q[lbl]) q[lbl] = u;
          }
        }
      } catch (e) {
        console.warn(TAG, 'S2 source-regex error:', e.message || e);
      }
    }

    // S3 — video_url / kt_player
    if (!Object.keys(q).length) {
      try {
        var patterns = [
          /video_url\s*[:=]\s*['"]([^'"]+)['"]/i,
          /video_url_text\s*[:=]\s*['"]([^'"]+)['"]/i,
          /"video_url"\s*:\s*"([^"]+)"/i,
        ];
        for (var pi = 0; pi < patterns.length; pi++) {
          var pm = html.match(patterns[pi]);
          if (pm && pm[1]) {
            var u = cleanUrl(pm[1]);
            if (u && u.indexOf('http') === 0) {
              if (!q['High Quality']) q['High Quality'] = u;
              var qlm = u.match(/_(\d+)(?:p)?\.mp4/i);
              if (qlm && !q[qlm[1] + 'p']) q[qlm[1] + 'p'] = u;
              break;
            }
          }
        }
        // Мультикачество video_url_1080p / video_url_720p
        var resRe = /video_url_(\w+)\s*[:=]\s*['"]([^'"]+)['"]/gi;
        var rm;
        while ((rm = resRe.exec(html)) !== null) {
          var lbl = rm[1];
          var url = cleanUrl(rm[2]);
          if (url && url.indexOf('http') === 0 && !q[lbl]) q[lbl] = url;
        }
      } catch (e) {
        console.warn(TAG, 'S3 video_url error:', e.message || e);
      }
    }

    // S4 — JSON sources / files
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
            for (var ci2 = aStart; ci2 < lim; ci2++) {
              var ch = html[ci2];
              if (ch === '[' || ch === '{') depth++;
              else if (ch === ']' || ch === '}') {
                depth--;
                if (depth === 0) { aEnd = ci2; break; }
              }
            }
            if (aEnd !== -1) {
              var arr = JSON.parse(html.substring(aStart, aEnd + 1).replace(/\\\//g, '/'));
              arr.forEach(function (s) {
                var u = cleanUrl(s.file || s.url || s.src || '');
                if (!u || u.indexOf('http') !== 0) return;
                var lbl = String(s.label || s.quality || s.res || 'HD');
                if (/^\d+$/.test(lbl)) lbl = lbl + 'p';
                if (!q[lbl]) q[lbl] = u;
              });
            }
          }
        }
      } catch (e) {
        console.warn(TAG, 'S4 JSON sources error:', e.message || e);
      }
    }

    // S5 — mp4-brute
    if (!Object.keys(q).length) {
      var mp4Re = /["'](https?:(?:\\\/|\/)[^"'\s]+?\.mp4[^"'\s]*?)["']/gi;
      var mp4m, cnt = 0;
      while ((mp4m = mp4Re.exec(html)) !== null && cnt < 8) {
        var u = cleanUrl(mp4m[1]);
        if (!u || u.indexOf('{') !== -1) continue;
        var qm  = u.match(/_(\d+p?)\.mp4/i);
        var key = qm ? (/^\d+$/.test(qm[1]) ? qm[1] + 'p' : qm[1]) : ('HD' + (cnt || ''));
        if (!q[key]) { q[key] = u; cnt++; }
      }
    }

    return q;
  }

  // ============================================================
  // §6. ПАРСИНГ КАРТОЧЕК
  // anysex: .item с a[href*="/video/"]
  // Постер: i2.anysex.com / i4.anysex.com (img[src])
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
                pic.indexOf('data:') === 0 || pic.length < 10)) pic = '';
    return pic;
  }

  function parsePlaylist(html) {
    var results = [];
    var seen    = {};
    try {
      var doc   = new DOMParser().parseFromString(html, 'text/html');
      var items = doc.querySelectorAll('.item');

      if (!items || !items.length) {
        console.log(TAG, 'parsePlaylist → fallback a[href*="/video/"]');
        var links = doc.querySelectorAll('a[href*="/video/"]');
        for (var j = 0; j < links.length; j++) {
          var href = links[j].getAttribute('href') || '';
          if (!href || href === '#' || seen[href]) continue;
          if (href.indexOf('http') !== 0) href = HOST + (href.charAt(0) === '/' ? '' : '/') + href;
          seen[href] = true;
          var picA  = getPicture(links[j].querySelector('img'));
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
    if (href.indexOf('http') !== 0) href = HOST + (href.charAt(0) === '/' ? '' : '/') + href;

    var name = (linkEl.getAttribute('title') || '').trim();
    if (!name) {
      var tEl = el.querySelector('.title') || el.querySelector('.name') || el.querySelector('strong');
      if (tEl) name = tEl.textContent.replace(/\s+/g, ' ').trim();
    }
    if (!name) name = slugToTitle(href);
    if (!name) return null;

    var pic  = getPicture(el.querySelector('img'));
    var durEl = el.querySelector('.duration') || el.querySelector('.time') || el.querySelector('[class*="dur"]');
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
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); }).trim();
  }

  // ============================================================
  // §7. URL BUILDER
  // Main:    https://ru.anysex.com/video/
  // Search:  https://ru.anysex.com/search/?q={query}&page=N
  // Cat:     https://ru.anysex.com/categories/{slug}/?page=N
  // Channel: https://ru.anysex.com/channels/{slug}/?page=N
  // Pag:     ?page=N / &page=N
  // ============================================================
  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    var base, sep;
    if (type === 'search') {
      base = HOST + '/search/?q=' + encodeURIComponent(value);
      return page > 1 ? base + '&page=' + page : base;
    }
    if (type === 'cat') {
      base = HOST + '/categories/' + value + '/';
      return page > 1 ? base + '?page=' + page : base;
    }
    if (type === 'channel') {
      base = HOST + '/channels/' + value + '/';
      return page > 1 ? base + '?page=' + page : base;
    }
    // main
    base = HOST + '/video/';
    return page > 1 ? base + '?page=' + page : base;
  }

  // ============================================================
  // §8. МЕНЮ
  // ============================================================
  function buildMenu() {
    var catItems = CATEGORIES.map(function (c) {
      return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
    });
    var chItems = CHANNELS.map(function (c) {
      return { title: c.title, playlist_url: NAME + '/channel/' + c.slug };
    });
    return [
      { title: '🔍 Поиск',    search_on: true, playlist_url: NAME + '/search/' },
      { title: '📂 Категории', playlist_url: 'submenu', submenu: catItems },
      { title: '📺 Каналы',    playlist_url: 'submenu', submenu: chItems  },
    ];
  }

  // ============================================================
  // §9. РОУТИНГ
  // ============================================================
  function routeView(url, page, success, error) {
    console.log(TAG, 'routeView →', url, 'page=' + page);
    var sm = url.match(/[?&]search=([^&]*)/);
    if (sm) return loadPage(buildUrl('search', decodeURIComponent(sm[1]), page), page, success, error);
    if (url.indexOf(NAME + '/cat/') === 0) {
      return loadPage(buildUrl('cat', url.replace(NAME + '/cat/', '').split('?')[0], page), page, success, error);
    }
    if (url.indexOf(NAME + '/channel/') === 0) {
      return loadPage(buildUrl('channel', url.replace(NAME + '/channel/', '').split('?')[0], page), page, success, error);
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
      success({ results: results, collection: true, total_pages: results.length >= 28 ? page + 1 : page, menu: buildMenu() });
    }, error);
  }

  // ============================================================
  // §10. ПУБЛИЧНЫЙ API
  // ============================================================
  var AnsxParser = {
    main: function (p, s, e) { routeView(NAME, 1, s, e); },
    view: function (p, s, e) { routeView(p.url || NAME, p.page || 1, s, e); },
    search: function (p, s, e) {
      var q = (p.query || '').trim(), pg = parseInt(p.page, 10) || 1;
      if (!q) { s({ title: '', results: [], collection: true, total_pages: 1 }); return; }
      httpGet(buildUrl('search', q, pg), function (html) {
        var r = parsePlaylist(html);
        s({ title: 'AnySex: ' + q, results: r, collection: true, total_pages: r.length >= 28 ? pg + 1 : pg });
      }, e);
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
          console.warn(TAG, 'html.length =',      html.length);
          console.warn(TAG, '<source> cnt =',     (html.match(/<source/gi) || []).length);
          console.warn(TAG, 'get_file found =',   html.indexOf('get_file') !== -1);
          console.warn(TAG, '.mp4 cnt =',         (html.match(/\.mp4/gi) || []).length);
          error('Видео не найдено — проверьте Worker (ahcdn.com в whitelist)');
        }
      }, error);
    },
  };

  // ============================================================
  // §11. РЕГИСТРАЦИЯ
  // ============================================================
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, AnsxParser);
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
