// =============================================================
// xtit.js — Парсер www.xtits.xxx для AdultJS
// Version  : 1.0.0
// Site     : https://www.xtits.xxx
// Engine   : KVS (Kernel Video Sharing)
// Strategy : SSR каталог, video_url / kt_player для qualities
// Worker   : www.xtits.xxx, ahcdn.com, vcdn4.xtits.xxx
//            — все должны быть в ALLOWED_TARGETS
// Cookie   : mature=1  (Age Gate)
// CDN      : ip*.ahcdn.com → JWT-подписанные URL, 302 redirect
// Карточки : .thumb-item (НЕ .item!) a[href*="/videos/"]
//            Постер: img[data-original]  (lazy-load xtits)
// Qualities: video_url / video_url_720p в kt_player
//            get_file: /get_file/5/{hash}/...
// =============================================================
// Изменения:
//   [1.0.0] Начальная версия
//           Карточки: .thumb-item + fallback a[href*="/videos/"]
//           Постер: data-original (основной), data-src, src
//           Qualities: S1 video_url / video_url_{q}
//                      S2 JSON sources
//                      S3 mp4-brute (ahcdn.com CDN)
//           Search: /search/?q={query}
//           Cat:    /categories/{slug}/
//           КАТЕГОРИЙ 300+ — в CATEGORIES передаём полный список
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.0.0';
  var NAME    = 'xtit';
  var HOST    = 'https://www.xtits.xxx';
  var TAG     = '[' + NAME + ' v' + VERSION + ']';

  // ============================================================
  // §1. КАТЕГОРИИ (отобраны основные из 300+ в JSON)
  // ============================================================
  var CATEGORIES = [
    { title: 'Amateur',          slug: 'amateur'          },
    { title: 'Anal',             slug: 'anal'             },
    { title: 'Asian',            slug: 'asian'            },
    { title: 'Asian Tits',       slug: 'asian-tits'       },
    { title: 'BDSM',             slug: 'bdsm'             },
    { title: 'Big Ass',          slug: 'big-ass'          },
    { title: 'Blowjob',          slug: 'blowjob'          },
    { title: 'Camgirl',          slug: 'camgirl'          },
    { title: 'Casting',          slug: 'casting'          },
    { title: 'Celebrity',        slug: 'celebrity'        },
    { title: 'CFNM',             slug: 'cfnm'             },
    { title: 'Compilation',      slug: 'compilation'      },
    { title: 'Cum Swapping',     slug: 'cum-swapping'     },
    { title: 'Doctor',           slug: 'doctor'           },
    { title: 'Double Vaginal',   slug: 'double-vaginal'   },
    { title: 'Dry-Hump',         slug: 'dry-hump'         },
    { title: 'Femdom',           slug: 'femdom'           },
    { title: 'Female Friendly',  slug: 'female-friendly'  },
    { title: 'Fuck Machine',     slug: 'fuck-machine'     },
    { title: 'GILF',             slug: 'gilf'             },
    { title: 'Gothic',           slug: 'gothic'           },
    { title: 'Granny',           slug: 'granny'           },
    { title: 'Groping',          slug: 'groping'          },
    { title: 'Hentai 18+',       slug: 'hentai-18'        },
    { title: 'High Heels',       slug: 'high-heels'       },
    { title: 'Hogtied',          slug: 'hogtied'          },
    { title: 'Humiliation',      slug: 'humiliation'      },
    { title: 'Interactive',      slug: 'interactive'      },
    { title: 'Interview',        slug: 'interview'        },
    { title: 'Japanese',         slug: 'japanese'         },
    { title: 'Korean',           slug: 'korean'           },
    { title: 'Lesbian',          slug: 'lesbian'          },
    { title: 'Medium Natural Tits', slug: 'medium-natural-tits' },
    { title: 'Military',         slug: 'military'         },
    { title: 'Milking',          slug: 'milking'          },
    { title: 'Monster Cock',     slug: 'monster-cock'     },
    { title: 'Mouthful',         slug: 'mouthful'         },
    { title: 'Muscular Men',     slug: 'muscular-men'     },
    { title: 'Nipple Fucking',   slug: 'nipple-fucking'   },
    { title: 'Nipple Play',      slug: 'nipple-play'      },
    { title: 'Nude',             slug: 'nude'             },
    { title: 'Old/Young',        slug: 'old-young'        },
    { title: 'Piercing',         slug: 'piercing'         },
    { title: 'Pissing',          slug: 'pissing'          },
    { title: 'POV',              slug: 'pov'              },
    { title: 'Preggo',           slug: 'preggo'           },
    { title: 'Pregnant',         slug: 'pregnant'         },
    { title: 'Public',           slug: 'public'           },
    { title: 'Punishment',       slug: 'punishment'       },
    { title: 'Russian',          slug: 'russian'          },
    { title: 'Schoolgirl',       slug: 'schoolgirl'       },
    { title: 'Scissoring',       slug: 'scissoring'       },
    { title: 'Selfie',           slug: 'selfie'           },
    { title: 'Slave',            slug: 'slave'            },
    { title: 'Small Nipples',    slug: 'small-nipples'    },
    { title: 'Spy Cams',         slug: 'spy-cams'         },
    { title: 'Squirt',           slug: 'squirt'           },
    { title: 'Step Fantasy',     slug: 'step-fantasy'     },
    { title: 'Stockings',        slug: 'stockings'        },
    { title: 'Straight Sex',     slug: 'straight-sex'     },
    { title: 'Swingers',         slug: 'swingers'         },
    { title: 'Taboo',            slug: 'taboo'            },
    { title: 'Teasing',          slug: 'teasing'          },
    { title: 'Teen (18+)',       slug: 'teen'             },
    { title: 'Threesome',        slug: 'threesome'        },
    { title: 'Thighjob',         slug: 'thighjob'         },
    { title: 'Tied Up',          slug: 'tied-up'          },
    { title: 'Topless',          slug: 'topless'          },
    { title: 'Top Rated',        slug: 'top-rated'        },
    { title: 'Ukrainian',        slug: 'ukrainian'        },
    { title: 'Verified Amateurs',slug: 'verified-amateurs'},
    { title: 'Verified Couples', slug: 'verified-couples' },
    { title: 'Verified Models',  slug: 'verified-models'  },
    { title: 'Webcam',           slug: 'webcam'           },
    { title: 'Wife Sharing',     slug: 'wife-sharing'     },
    { title: '3D',               slug: '3d'               },
    { title: '720p',             slug: '720p'             },
    { title: '60FPS',            slug: '60fps'            },
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
  // xtits: протокол "add-protocol" — может быть //domain/path
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
  // xtits: kt_player, get_file/5/..., ahcdn.com CDN
  // ============================================================
  function extractQualities(html) {
    var q = {};

    // S1 — video_url / video_url_{quality}
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
            var qlm = u.match(/_(\d+p?)\.mp4/i);
            if (qlm && !q[qlm[1]]) q[qlm[1]] = u;
            break;
          }
        }
      }
      // Мультикачество: video_url_720p, video_url_1080p ...
      var resRe = /video_url_(\w+)\s*[:=]\s*['"]([^'"]+)['"]/gi;
      var rm;
      while ((rm = resRe.exec(html)) !== null) {
        var url = cleanUrl(rm[2]);
        if (url && url.indexOf('http') === 0 && !q[rm[1]]) q[rm[1]] = url;
      }
    } catch (e) { console.warn(TAG, 'S1 error:', e.message || e); }

    // S2 — JSON sources
    if (!Object.keys(q).length) {
      try {
        var bestIdx = -1;
        ['"sources":[', '"files":['].forEach(function (sk) {
          var i2 = 0;
          while (i2 < html.length) {
            var p2 = html.indexOf(sk, i2);
            if (p2 === -1) break;
            if (p2 > bestIdx) bestIdx = p2;
            i2 = p2 + 1;
          }
        });
        if (bestIdx !== -1) {
          var aStart = html.indexOf('[', bestIdx);
          if (aStart !== -1) {
            var depth = 0, aEnd = -1, lim = Math.min(html.length, aStart + 50000);
            for (var ci = aStart; ci < lim; ci++) {
              var ch = html[ci];
              if (ch === '[' || ch === '{') depth++;
              else if (ch === ']' || ch === '}') { depth--; if (depth === 0) { aEnd = ci; break; } }
            }
            if (aEnd !== -1) {
              JSON.parse(html.substring(aStart, aEnd + 1).replace(/\\\//g, '/')).forEach(function (s) {
                var u = cleanUrl(s.file || s.url || s.src || '');
                if (!u || u.indexOf('http') !== 0) return;
                var lbl = String(s.label || s.quality || s.res || 'HD');
                if (/^\d+$/.test(lbl)) lbl = lbl + 'p';
                if (!q[lbl]) q[lbl] = u;
              });
            }
          }
        }
      } catch (e) { console.warn(TAG, 'S2 JSON error:', e.message || e); }
    }

    // S3 — mp4-brute (xtits get_file URL)
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
  // §5. ПАРСИНГ КАРТОЧЕК
  // КЛЮЧЕВОЕ ОТЛИЧИЕ: .thumb-item  (не .item как у KVS-стандарта!)
  // Постер: img[data-original]  (xtits lazy-load)
  // Ссылка: /videos/{id}/{slug}/
  // ============================================================
  function getPicture(imgEl) {
    if (!imgEl) return '';
    var pic = cleanUrl(
      imgEl.getAttribute('data-original') ||
      imgEl.getAttribute('data-src')      ||
      imgEl.getAttribute('data-lazy-src') ||
      imgEl.getAttribute('src')           || ''
    );
    if (pic && (pic.indexOf('spacer') !== -1 || pic.indexOf('blank') !== -1 ||
                pic.indexOf('data:') === 0 || pic.length < 10)) pic = '';
    return pic;
  }

  function parsePlaylist(html) {
    var results = [], seen = {};
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      // xtits: .thumb-item — основной
      var items = doc.querySelectorAll('.thumb-item');
      if (!items || !items.length) items = doc.querySelectorAll('.item');

      if (!items || !items.length) {
        console.log(TAG, 'fallback a[href*="/videos/"]');
        var links = doc.querySelectorAll('a[href*="/videos/"]');
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
        if (card && !seen[card.video]) { seen[card.video] = true; results.push(card); }
      }
    } catch (e) { console.warn(TAG, 'parsePlaylist error:', e.message || e); }
    console.log(TAG, 'parsePlaylist → карточек:', results.length);
    return results;
  }

  function parseCard(el) {
    var linkEl = el.querySelector('a[href*="/videos/"]');
    if (!linkEl) linkEl = el.querySelector('a[href*="/video/"]');
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
    // xtits: .time (из JSON CARD_SELECTORS.duration = ".time")
    var durEl = el.querySelector('.time') || el.querySelector('.duration');
    var time  = durEl ? durEl.textContent.replace(/[^\d:]/g, '').trim() : '';

    return makeCard(name, href, pic, time);
  }

  function makeCard(name, href, pic, time) {
    return {
      name: name, video: href, picture: pic, img: pic, poster: pic,
      background_image: pic, preview: null, time: time || '',
      quality: 'HD', json: true, source: NAME,
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
  // §6. URL BUILDER
  // Main:   https://www.xtits.xxx/
  // Search: https://www.xtits.xxx/search/?q={query}&page=N
  // Cat:    https://www.xtits.xxx/categories/{slug}/?page=N
  // ============================================================
  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    var base;
    if (type === 'search') {
      base = HOST + '/search/?q=' + encodeURIComponent(value);
      return page > 1 ? base + '&page=' + page : base;
    }
    if (type === 'cat') {
      base = HOST + '/categories/' + value + '/';
      return page > 1 ? base + '?page=' + page : base;
    }
    base = HOST + '/';
    return page > 1 ? base + '?page=' + page : base;
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
    if (url.indexOf(NAME + '/search/') === 0) {
      var rawQ = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      if (rawQ) return loadPage(buildUrl('search', rawQ, page), page, success, error);
    }
    loadPage(buildUrl('main', null, page), page, success, error);
  }

  function loadPage(fetchUrl, page, success, error) {
    console.log(TAG, 'loadPage →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      var r = parsePlaylist(html);
      if (!r.length) { error('Контент не найден'); return; }
      success({ results: r, collection: true, total_pages: r.length >= 28 ? page + 1 : page, menu: buildMenu() });
    }, error);
  }

  var XtitParser = {
    main: function (p, s, e) { routeView(NAME, 1, s, e); },
    view: function (p, s, e) { routeView(p.url || NAME, p.page || 1, s, e); },
    search: function (p, s, e) {
      var q = (p.query || '').trim(), pg = parseInt(p.page, 10) || 1;
      if (!q) { s({ title: '', results: [], collection: true, total_pages: 1 }); return; }
      httpGet(buildUrl('search', q, pg), function (html) {
        var r = parsePlaylist(html);
        s({ title: 'XTits: ' + q, results: r, collection: true, total_pages: r.length >= 28 ? pg + 1 : pg });
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
          console.warn(TAG, 'html.length =',    html.length);
          console.warn(TAG, 'video_url found =', html.indexOf('video_url') !== -1);
          console.warn(TAG, 'get_file found =',  html.indexOf('get_file') !== -1);
          error('Видео не найдено — проверьте Worker (ahcdn.com, vcdn4.xtits.xxx в whitelist)');
        }
      }, error);
    },
  };

  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, XtitParser);
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
