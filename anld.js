// =============================================================
// anld.js — Парсер www.analdin.com для AdultJS
// Version  : 1.1.0
// Site     : https://www.analdin.com
// Engine   : KVS + flowplayer (PLAYER: "flowplayer")
// Strategy : SSR каталог /videos/, flowplayer / kt_player qualities
// Worker   : www.analdin.com, i.analdin.com
//            — оба должны быть в ALLOWED_TARGETS
// Cookie   : mature=1  (Age Gate)
// CDN      : i.analdin.com — постеры (прямые img)
//            Видео CDN: неизвестен без анализа страницы —
//            парсер использует mp4-brute + flowplayer fallback
// Карточки : .item a[href*="/videos/"]
//            Постер: img[data-original] (lazy-load)
//            Длит.:  не указана в JSON (duration: null)
// ПРИМЕЧАНИЕ: VIDEO_RULES пустые в JSON → нужен mp4-brute
//             PLAYER: flowplayer → ищем playlist / clip.url
// =============================================================
// Изменения:
//   Version  : 1.0.1
//   [1.0.1] BUGFIX: главная /videos/ → 404, исправлено на /
//   [1.0.0] Начальная версия
//           Карточки: .item + fallback a[href*="/videos/"]
//           Qualities: S1 flowplayer playlist/clip.url
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
  var NAME    = 'anld';
  var HOST    = 'https://www.analdin.com';
  var TAG     = '[' + NAME + ' v' + VERSION + ']';

  // ============================================================
  // §1. КАТЕГОРИИ (отобраны из 500+ в JSON)
  // ============================================================
  var CATEGORIES = [
    { title: '18 Years Old',     slug: '18-years-old'     },
    { title: '4K Ultra HD',      slug: '4k-ultra-hd'      },
    { title: 'Amateur',          slug: 'amateurs'         },
    { title: 'Anal',             slug: 'anal'             },
    { title: 'Anal Fisting',     slug: 'anal-fisting'     },
    { title: 'Ass to Mouth',     slug: 'ass-to-mouth'     },
    { title: 'Asian',            slug: 'asian'            },
    { title: 'Babes',            slug: 'babes'            },
    { title: 'Babysitter',       slug: 'babysitter'       },
    { title: 'BBC',              slug: 'bbc'              },
    { title: 'BBW',              slug: 'bbw'              },
    { title: 'BDSM',             slug: 'bdsm'             },
    { title: 'Big Ass',          slug: 'big-ass'          },
    { title: 'Big Boobs',        slug: 'big-boobs'        },
    { title: 'Big Cock',         slug: 'big-cock'         },
    { title: 'Big Natural Tits', slug: 'big-natural-tits' },
    { title: 'Blondes',          slug: 'blondes'          },
    { title: 'Blowjobs',         slug: 'blowjobs'         },
    { title: 'Brazilian',        slug: 'brazilian'        },
    { title: 'Brazzers',         slug: 'brazzers'         },
    { title: 'Brunettes',        slug: 'brunettes'        },
    { title: 'Bubble Butt',      slug: 'bubble-butt'      },
    { title: 'Casting',          slug: 'casting'          },
    { title: 'CFNM',             slug: 'cfnm'             },
    { title: 'Cheating',         slug: 'cheating'         },
    { title: 'Chubby',           slug: 'chubby'           },
    { title: 'Close Up',         slug: 'close-up'         },
    { title: 'Compilation',      slug: 'compilation'      },
    { title: 'Creampie',         slug: 'creampie'         },
    { title: 'Cumshot',          slug: 'cumshot'          },
    { title: 'Czech',            slug: 'czech'            },
    { title: 'Ebony',            slug: 'ebony'            },
    { title: 'Facial',           slug: 'facial'           },
    { title: 'Fake Taxi',        slug: 'fake-taxi'        },
    { title: 'Family Strokes',   slug: 'family-strokes'   },
    { title: 'Femdom',           slug: 'femdom'           },
    { title: 'Gangbang',         slug: 'gangbang'         },
    { title: 'German',           slug: 'german'           },
    { title: 'Granny',           slug: 'granny'           },
    { title: 'Hardcore',         slug: 'hardcore'         },
    { title: 'Indian',           slug: 'indian'           },
    { title: 'Interracial',      slug: 'interracial'      },
    { title: 'Japanese',         slug: 'japanese'         },
    { title: 'Latina',           slug: 'latina'           },
    { title: 'Lesbian',          slug: 'lesbian'          },
    { title: 'Massage',          slug: 'massage'          },
    { title: 'Mature',           slug: 'mature'           },
    { title: 'MILF',             slug: 'milf'             },
    { title: 'Old & Young',      slug: 'old-young'        },
    { title: 'Outdoor',          slug: 'outdoor'          },
    { title: 'POV',              slug: 'pov'              },
    { title: 'Pissing',          slug: 'pissing'          },
    { title: 'Public',           slug: 'public'           },
    { title: 'Russian',          slug: 'russian'          },
    { title: 'Squirting',        slug: 'squirting'        },
    { title: 'Stockings',        slug: 'stockings'        },
    { title: 'Swallow',          slug: 'swallow'          },
    { title: 'Teen (18+)',       slug: 'teen'             },
    { title: 'Threesome',        slug: 'threesome'        },
    { title: 'Toys',             slug: 'toys'             },
    { title: 'Voyeur',           slug: 'voyeur'           },
    { title: 'Webcam',           slug: 'webcam'           },
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
  // CLEAN_URL_RULES: unescape-backslash, add-protocol, prepend-host
  // ============================================================
  function cleanUrl(raw) {
    if (!raw) return '';
    try {
      var u = raw;
      u = u.replace(/\\\//g, '/').replace(/\\/g, '');   // unescape-backslash
      if (u.indexOf('%') !== -1) { try { u = decodeURIComponent(u); } catch (e) {} }
      if (u.indexOf('//') === 0) u = 'https:' + u;      // add-protocol
      if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u; // prepend-host
      return u;
    } catch (e) { return raw; }
  }

  // ============================================================
  // §4. extractQualities
  // analdin: flowplayer (PLAYER: "flowplayer") — основной плеер
  //
  // S1: flowplayer playlist[{sources:[{src,type}]}] / clip.url
  // S2: flowplayer.conf / flashvars.config (JSON blob)
  // S3: video_url / kt_player (KVS fallback)
  // S4: JSON sources
  // S5: mp4-brute (основной при неизвестном CDN)
  // ============================================================
  function extractQualities(html) {
    var q = {};

    // S1 — flowplayer: playlist / clip.url
    try {
      // Вариант A: flowplayer("...", {..., playlist:[{sources:[{src, type}]}]})
      var fpRe1 = /playlist\s*:\s*\[(\{[\s\S]+?\})\]/i;
      var fp1   = html.match(fpRe1);
      if (fp1) {
        var plRaw = '[' + fp1[1] + ']';
        var pl    = JSON.parse(plRaw.replace(/\\\//g, '/'));
        pl.forEach(function (clip) {
          (clip.sources || []).forEach(function (s) {
            var u = cleanUrl(s.src || s.file || s.url || '');
            if (!u || u.indexOf('http') !== 0) return;
            var lbl = String(s.label || s.quality || 'HD');
            if (/^\d+$/.test(lbl)) lbl = lbl + 'p';
            if (!q[lbl]) q[lbl] = u;
          });
          if (clip.url && !Object.keys(q).length) {
            var u = cleanUrl(clip.url);
            if (u && u.indexOf('http') === 0 && !q['HD']) q['HD'] = u;
          }
        });
      }
    } catch (e) { console.warn(TAG, 'S1a flowplayer playlist error:', e.message || e); }

    // Вариант B: clip:{url:'...'} / {clip:{url:'...'}}
    if (!Object.keys(q).length) {
      try {
        var clipRe = /clip\s*:\s*\{[^}]*url\s*:\s*['"]([^'"]+)['"]/i;
        var cm     = html.match(clipRe);
        if (cm && cm[1]) {
          var u = cleanUrl(cm[1]);
          if (u && u.indexOf('http') === 0 && !q['HD']) q['HD'] = u;
        }
      } catch (e) { console.warn(TAG, 'S1b clip.url error:', e.message || e); }
    }

    // S2 — flowplayer.conf JSON blob
    if (!Object.keys(q).length) {
      try {
        var confRe = /flowplayer\s*\(\s*[^,]+,\s*(\{[\s\S]+?\})\s*\)/;
        var confM  = html.match(confRe);
        if (confM) {
          var cfg = JSON.parse(confM[1].replace(/\\\//g, '/'));
          var clips = (cfg.playlist || [cfg.clip] || []);
          clips.forEach(function (clip) {
            if (!clip) return;
            (clip.sources || []).forEach(function (s) {
              var u = cleanUrl(s.src || s.file || '');
              if (!u || u.indexOf('http') !== 0) return;
              var lbl = String(s.label || 'HD');
              if (/^\d+$/.test(lbl)) lbl = lbl + 'p';
              if (!q[lbl]) q[lbl] = u;
            });
            if (clip.url && !Object.keys(q).length) {
              var u = cleanUrl(clip.url);
              if (u && u.indexOf('http') === 0) q['HD'] = u;
            }
          });
        }
      } catch (e) { console.warn(TAG, 'S2 flowplayer.conf error:', e.message || e); }
    }

    // S3 — video_url / kt_player fallback
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
              var qlm = u.match(/_(\d+p?)\.mp4/i);
              if (qlm && !q[qlm[1]]) q[qlm[1]] = u;
              break;
            }
          }
        }
        var resRe = /video_url_(\w+)\s*[:=]\s*['"]([^'"]+)['"]/gi;
        var rm;
        while ((rm = resRe.exec(html)) !== null) {
          var url = cleanUrl(rm[2]);
          if (url && url.indexOf('http') === 0 && !q[rm[1]]) q[rm[1]] = url;
        }
      } catch (e) { console.warn(TAG, 'S3 video_url error:', e.message || e); }
    }

    // S4 — JSON sources
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
      } catch (e) { console.warn(TAG, 'S4 JSON error:', e.message || e); }
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
  // §5. ПАРСИНГ КАРТОЧЕК
  // analdin: .item a[href*="/videos/"]
  // Постер: img[data-original]
  // Длит.:  нет (duration: null в JSON)
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
      var doc   = new DOMParser().parseFromString(html, 'text/html');
      var items = doc.querySelectorAll('.item');

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

    var pic = getPicture(el.querySelector('img'));
    return makeCard(name, href, pic, '');
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
  // Main:    https://www.analdin.com/videos/
  // Search:  https://www.analdin.com/search/?q={query}&page=N
  // Cat:     https://www.analdin.com/categories/{slug}/?page=N
  // Channel: https://www.analdin.com/channels/{slug}/?page=N
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
    if (type === 'channel') {
      base = HOST + '/channels/' + value + '/';
      return page > 1 ? base + '?page=' + page : base;
    }
    // СТАЛО: [1.0.1] /videos/ вернул 404 — используем корень сайта
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
    if (url.indexOf(NAME + '/cat/')     === 0) return loadPage(buildUrl('cat',     url.replace(NAME + '/cat/',     '').split('?')[0], page), page, success, error);
    if (url.indexOf(NAME + '/channel/') === 0) return loadPage(buildUrl('channel', url.replace(NAME + '/channel/', '').split('?')[0], page), page, success, error);
    if (url.indexOf(NAME + '/search/')  === 0) {
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

  var AnldParser = {
    main: function (p, s, e) { routeView(NAME, 1, s, e); },
    view: function (p, s, e) { routeView(p.url || NAME, p.page || 1, s, e); },
    search: function (p, s, e) {
      var q = (p.query || '').trim(), pg = parseInt(p.page, 10) || 1;
      if (!q) { s({ title: '', results: [], collection: true, total_pages: 1 }); return; }
      httpGet(buildUrl('search', q, pg), function (html) {
        var r = parsePlaylist(html);
        s({ title: 'AnalDin: ' + q, results: r, collection: true, total_pages: r.length >= 28 ? pg + 1 : pg });
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
          console.warn(TAG, 'html.length =',       html.length);
          console.warn(TAG, 'flowplayer found =',  html.indexOf('flowplayer') !== -1);
          console.warn(TAG, 'playlist found =',    html.indexOf('playlist') !== -1);
          console.warn(TAG, '.mp4 cnt =',          (html.match(/\.mp4/gi) || []).length);
          error('Видео не найдено — нужен анализ CDN-домена видео-страницы');
        }
      }, error);
    },
  };

  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, AnldParser);
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
