// =============================================================
// xham.js — Парсер xhamster.com для AdultJS
// Version  : 1.0.0
// Site     : https://xhamster.com
// Strategy : SSR каталог + window.initials JSON для qualities
// Worker   : xhamster.com (уже есть в ALLOWED_TARGETS),
//            дополнительно нужен xhcdn.com (CDN постеров)
// Cookie   : mature=1  (Age Gate)
// ВАЖНО    : Video URL нестабилен (JWT-signed CDN).
//            Качества берутся из window.initials на странице видео.
//            Premium-контент без авторизации недоступен.
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.0.0';
  var NAME    = 'xham';
  var HOST    = 'https://xhamster.com';
  var TAG     = '[' + NAME + ']';

  // ============================================================
  // §1. КАТЕГОРИИ (только /categories/..., без /photos/)
  // ============================================================
  var CATEGORIES = [
    { title: '18 Year Old',         slug: '18-year-old'         },
    { title: 'African',             slug: 'african'             },
    { title: 'Amateur',             slug: 'amateur'             },
    { title: 'Anal',                slug: 'anal'                },
    { title: 'Arab',                slug: 'arab'                },
    { title: 'Asian',               slug: 'asian'               },
    { title: 'Babe',                slug: 'babe'                },
    { title: 'BBC',                 slug: 'bbc'                 },
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
    { title: 'Brutal Sex',          slug: 'brutal-sex'          },
    { title: 'Cartoon',             slug: 'cartoon'             },
    { title: 'Celebrity',           slug: 'celebrity'           },
    { title: 'Cheating',            slug: 'cheating'            },
    { title: 'Close-up',            slug: 'close-up'            },
    { title: 'Compilation',         slug: 'compilation'         },
    { title: 'Cougar',              slug: 'cougar'              },
    { title: 'Couple',              slug: 'couple'              },
    { title: 'Creampie',            slug: 'creampie'            },
    { title: 'Cuckold',             slug: 'cuckold'             },
    { title: 'Cum in Mouth',        slug: 'cum-in-mouth'        },
    { title: 'Cumshot',             slug: 'cumshot'             },
    { title: 'Desi',                slug: 'desi'                },
    { title: 'Dirty Talk',          slug: 'dirty-talk'          },
    { title: 'Dogging',             slug: 'dogging'             },
    { title: 'Doggy Style',         slug: 'doggy-style'         },
    { title: 'Eating Pussy',        slug: 'eating-pussy'        },
    { title: 'Female Masturbation', slug: 'female-masturbation' },
    { title: 'Femdom',              slug: 'femdom'              },
    { title: 'First Time',          slug: 'first-time'          },
    { title: 'Gangbang',            slug: 'gangbang'            },
    { title: 'GILF',                slug: 'gilf'                },
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
    { title: 'Porn for Women',      slug: 'porn-for-women'      },
    { title: 'Retro',               slug: 'retro'               },
    { title: 'Solo',                slug: 'solo'                },
    { title: 'Squirting',           slug: 'squirting'           },
    { title: 'Stockings',           slug: 'stockings'           },
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
  // xhamster: backslashEscaped=true → \/ нужно разворачивать
  // ============================================================
  function cleanUrl(raw) {
    if (!raw) return '';
    try {
      var u = raw;
      u = u.replace(/\\\//g, '/');   // \/ → /  (главная особенность xhamster!)
      u = u.replace(/\\/g, '');
      if (u.indexOf('%') !== -1) { try { u = decodeURIComponent(u); } catch (e) {} }
      if (u.indexOf('//') === 0) u = 'https:' + u;
      if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
      return u;
    } catch (e) { return raw; }
  }

  // ============================================================
  // §4. extractQualities
  // xhamster: видео через JS-рендер (directVideo=fail),
  //           но данные SSR-инжектятся в window.initials
  //
  // S1: window.initials → xhVideoPage.videoModel.sources[]
  // S2: последний "sources":[...] блок в HTML
  // S3: xhP.setVideoConfig({sources:[...]})
  // S4: fallback — любые https://...mp4 URL
  // ============================================================
  function extractQualities(html) {
    var q = {};

    // ── S1: window.initials ───────────────────────────────────
    try {
      var idxInit = html.indexOf('window.initials');
      if (idxInit !== -1) {
        var braceStart = html.indexOf('{', idxInit);
        if (braceStart !== -1) {
          var depth = 0, braceEnd = -1;
          var limit = Math.min(html.length, braceStart + 600000);
          for (var ci = braceStart; ci < limit; ci++) {
            var ch = html[ci];
            if (ch === '{' || ch === '[') depth++;
            else if (ch === '}' || ch === ']') {
              depth--;
              if (depth === 0) { braceEnd = ci; break; }
            }
          }
          if (braceEnd !== -1) {
            var rawJson = html.substring(braceStart, braceEnd + 1).replace(/\\\//g, '/');
            var init = JSON.parse(rawJson);

            // Перебираем возможные пути к video model
            var vms = [
              init.xhVideoPage  && init.xhVideoPage.videoModel,
              init.videoPage     && init.videoPage.videoModel,
              init.pageProps     && init.pageProps.videoModel,
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
                var ql = String(s.quality || s.label || s.res || 'HD');
                var key = /^\d+$/.test(ql) ? ql + 'p' : ql;
                if (!q[key]) q[key] = u;
              });
              if (Object.keys(q).length) break;
            }
          }
        }
      }
    } catch (e) {
      console.warn(TAG, 'S1 window.initials error:', e.message || e);
    }

    // ── S2: последнее вхождение "sources":[{...}] ─────────────
    if (!Object.keys(q).length) {
      try {
        var srcKey  = '"sources":[';
        var srcIdx  = -1, idx2 = 0;
        while (idx2 < html.length) {
          var pos = html.indexOf(srcKey, idx2);
          if (pos === -1) break;
          srcIdx = pos; idx2 = pos + 1;
        }
        if (srcIdx !== -1) {
          var arrStart = html.indexOf('[', srcIdx);
          if (arrStart !== -1) {
            var depth2 = 0, arrEnd = -1;
            var limit2 = Math.min(html.length, arrStart + 80000);
            for (var ci2 = arrStart; ci2 < limit2; ci2++) {
              var c2 = html[ci2];
              if (c2 === '[' || c2 === '{') depth2++;
              else if (c2 === ']' || c2 === '}') {
                depth2--;
                if (depth2 === 0) { arrEnd = ci2; break; }
              }
            }
            if (arrEnd !== -1) {
              var srcsRaw = html.substring(arrStart, arrEnd + 1).replace(/\\\//g, '/');
              var srcs    = JSON.parse(srcsRaw);
              srcs.forEach(function (s) {
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
      } catch (e) {
        console.warn(TAG, 'S2 sources-block error:', e.message || e);
      }
    }

    // ── S3: xhP.setVideoConfig ────────────────────────────────
    if (!Object.keys(q).length) {
      try {
        var cfgRe = /xhP\.setVideoConfig\((\{[\s\S]+?\})\)/;
        var cfgM  = html.match(cfgRe);
        if (cfgM) {
          var cfg  = JSON.parse(cfgM[1].replace(/\\\//g, '/'));
          var ss   = cfg.sources || cfg.streams || [];
          ss.forEach(function (s) {
            var u = s.src || s.url || s.file || '';
            if (!u) return;
            var ql = String(s.label || s.quality || 'HD');
            if (!q[ql]) q[ql] = u.replace(/\\\//g, '/');
          });
        }
      } catch (e) {
        console.warn(TAG, 'S3 xhP config error:', e.message || e);
      }
    }

    // ── S4: любой https://...mp4 в HTML ─────────────────────────
    if (!Object.keys(q).length) {
      // Учитываем экранированные URL: https:\/\/...
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
  // Селектор: .video-thumb  (58 карточек на странице)
  // Заголовок: a[title], a[aria-label], textContent
  // Ссылка:   a[href*="/videos/"]
  // Постер:   img[src] / img[data-src]
  // Длит.:    [class*="duration"]
  // ============================================================
  function parsePlaylist(html) {
    var results = [];
    var seen    = {};
    try {
      var doc   = new DOMParser().parseFromString(html, 'text/html');
      var items = doc.querySelectorAll('.video-thumb');

      if (!items || !items.length) {
        items = doc.querySelectorAll('div.thumb-list__item');
      }

      if (!items || !items.length) {
        console.log(TAG, 'parsePlaylist → fallback: a[href*="/videos/"]');
        var links = doc.querySelectorAll('a[href*="/videos/"]');
        for (var j = 0; j < links.length; j++) {
          var lhref = links[j].getAttribute('href') || '';
          if (!lhref || seen[lhref]) continue;
          seen[lhref] = true;
          var limg  = links[j].querySelector('img');
          var lpic  = limg ? cleanUrl(limg.getAttribute('src') || '') : '';
          var lname = (links[j].getAttribute('title') || links[j].textContent || '')
                        .replace(/\s+/g, ' ').trim();
          if (lname) results.push(makeCard(lname, lhref, lpic, ''));
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
    // Ссылка
    var linkEl = el.querySelector('a[href*="/videos/"]');
    if (!linkEl) linkEl = el.querySelector('a[href]');
    if (!linkEl) return null;
    var href = linkEl.getAttribute('href') || '';
    if (!href) return null;

    // Заголовок — приоритет: a[title] → a[aria-label] → textContent
    var name = (linkEl.getAttribute('title') || '').trim();
    if (!name) {
      var ta = el.querySelector('a[title]');
      if (ta) name = (ta.getAttribute('title') || '').trim();
    }
    if (!name) {
      var la = el.querySelector('[aria-label]');
      if (la) name = (la.getAttribute('aria-label') || '').trim();
    }
    if (!name) name = (linkEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (!name) return null;

    // Постер
    var imgEl = el.querySelector('img');
    var pic   = '';
    if (imgEl) {
      pic = cleanUrl(imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '');
    }

    // Длительность
    var durEl = el.querySelector('[class*="duration"]') || el.querySelector('.duration');
    var time  = durEl ? durEl.textContent.replace(/[^\d:]/g, '').trim() : '';

    return makeCard(name, href, pic, time);
  }

  function makeCard(name, href, pic, time) {
    // Гарантируем абсолютный URL
    if (href && href.indexOf('http') !== 0) {
      href = HOST + (href.charAt(0) === '/' ? '' : '/') + href;
    }
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

  // ============================================================
  // §6. URL BUILDER
  // Main:   https://xhamster.com/videos?page=N
  // Search: https://xhamster.com/search/video?q=query&page=N
  // Cat:    https://xhamster.com/categories/{slug}?page=N
  // ============================================================
  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    var u;
    if (type === 'search') {
      u = HOST + '/search/video?q=' + encodeURIComponent(value);
      return page > 1 ? u + '&page=' + page : u;
    }
    if (type === 'cat') {
      u = HOST + '/categories/' + value;
      return page > 1 ? u + '?page=' + page : u;
    }
    // main — раздел /videos (новинки)
    u = HOST + '/videos';
    return page > 1 ? u + '?page=' + page : u;
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
        total_pages: results.length >= 50 ? page + 1 : page,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ============================================================
  // §9. ПУБЛИЧНЫЙ API
  // ============================================================
  var XhamParser = {

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
          title:       'xHamster: ' + q,
          results:     results,
          collection:  true,
          total_pages: results.length >= 50 ? p + 1 : p,
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
          console.warn(TAG, 'html.length =', html.length);
          console.warn(TAG, 'window.initials =', html.indexOf('window.initials') !== -1);
          console.warn(TAG, '"sources" cnt =', (html.match(/"sources"/g) || []).length);
          console.warn(TAG, '.mp4 cnt =',      (html.match(/\.mp4/gi) || []).length);
          error('Видео не найдено (возможно premium-контент или изменилась структура)');
        }
      }, error);
    },
  };

  // ============================================================
  // §10. РЕГИСТРАЦИЯ
  // ============================================================
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, XhamParser);
      console.log(TAG, 'v' + VERSION + ' зарегистрирован');
      return true;
    }
    return false;
  }
  if (!tryRegister()) {
    var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }

})();