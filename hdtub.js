// =============================================================
// hdtub.js — HDtube Parser для AdultJS (Lampa)
// =============================================================
// Версия  : 1.2.0
// Изменения:
//   [1.2.0] Переписан под структуру p365 (эталон):
//           - [FIX] Транспорт: window.AdultPlugin.networkRequest
//                   Worker встроен в AdultPlugin — WORKER_URL не нужен
//           - [FIX] qualities() → { qualities: {...} } строки URL
//           - [FIX] extractQualities: 3 стратегии (kt_player / source / og:video)
//           - [FIX] parsePlaylist: DOMParser .item (JSON: cardSelector)
//           - [FIX] buildUrl: search=/?q=, cat=/?c=, page=&page=N
//           - [FIX] routeView: NAME/cat/ как в p365
//   [1.1.0] XHR прямой + Worker fallback (устарело)
//   [1.0.0] Базовый парсер
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.2.0';
  var NAME    = 'hdtub';
  var HOST    = 'https://www.hdtube.porn';

  var CATEGORIES = [
    { title: 'Amateur',            slug: 'amateur'            },
    { title: 'Anal',               slug: 'anal'               },
    { title: 'Asian',              slug: 'asian'              },
    { title: 'Babe',               slug: 'babe'               },
    { title: 'BBW',                slug: 'bbw'                },
    { title: 'BDSM',               slug: 'bdsm'               },
    { title: 'Big Ass',            slug: 'big-ass'            },
    { title: 'Big Cock',           slug: 'big-cock'           },
    { title: 'Big Tits',           slug: 'big-tits'           },
    { title: 'Bisexual',           slug: 'bisexual'           },
    { title: 'Black',              slug: 'black'              },
    { title: 'Blonde',             slug: 'blonde'             },
    { title: 'Blowjob',            slug: 'blowjob'            },
    { title: 'Bondage',            slug: 'bondage'            },
    { title: 'Brunette',           slug: 'brunette'           },
    { title: 'Close Up',           slug: 'close-up'           },
    { title: 'College',            slug: 'college'            },
    { title: 'Creampie',           slug: 'creampie'           },
    { title: 'Cuckold',            slug: 'cuckold'            },
    { title: 'Cumshot',            slug: 'cumshot'            },
    { title: 'Doggystyle',         slug: 'doggystyle'         },
    { title: 'Double Penetration', slug: 'double-penetration' },
    { title: 'Ebony',              slug: 'ebony'              },
    { title: 'Erotic',             slug: 'erotic'             },
    { title: 'Facial',             slug: 'facial'             },
    { title: 'Femdom',             slug: 'femdom'             },
    { title: 'Fetish',             slug: 'fetish'             },
    { title: 'Fingering',          slug: 'fingering'          },
    { title: 'Fisting',            slug: 'fisting'            },
    { title: 'Gangbang',           slug: 'gangbang'           },
    { title: 'Gloryhole',          slug: 'gloryhole'          },
    { title: 'Granny',             slug: 'granny'             },
    { title: 'Group',              slug: 'group'              },
    { title: 'Hairy',              slug: 'hairy'              },
    { title: 'Handjob',            slug: 'handjob'            },
    { title: 'Hardcore',           slug: 'hardcore'           },
    { title: 'Homemade',           slug: 'homemade'           },
    { title: 'Indian',             slug: 'indian'             },
    { title: 'Interracial',        slug: 'interracial'        },
    { title: 'Japanese',           slug: 'japanese'           },
    { title: 'Latina',             slug: 'latina'             },
    { title: 'Lesbian',            slug: 'lesbian'            },
    { title: 'Lingerie',           slug: 'lingerie'           },
    { title: 'Massage',            slug: 'massage'            },
    { title: 'Masturbation',       slug: 'masturbation'       },
    { title: 'Mature',             slug: 'mature'             },
    { title: 'MILF',               slug: 'milf'               },
    { title: 'Natural',            slug: 'natural'            },
    { title: 'Orgy',               slug: 'orgy'               },
    { title: 'Outdoor',            slug: 'outdoor'            },
    { title: 'Party',              slug: 'party'              },
    { title: 'Petite',             slug: 'petite'             },
    { title: 'Pissing',            slug: 'pissing'            },
    { title: 'Pornstar',           slug: 'pornstar'           },
    { title: 'POV',                slug: 'pov'                },
    { title: 'Public',             slug: 'public'             },
    { title: 'Pussy Licking',      slug: 'pussy-licking'      },
    { title: 'Reality',            slug: 'reality'            },
    { title: 'Redhead',            slug: 'redhead'            },
    { title: 'Russian',            slug: 'russian'            },
    { title: 'Schoolgirl',         slug: 'schoolgirl'         },
    { title: 'Shaved',             slug: 'shaved'             },
    { title: 'Shemale',            slug: 'shemale'            },
    { title: 'Small Tits',         slug: 'small-tits'         },
    { title: 'Solo',               slug: 'solo'               },
    { title: 'Spanking',           slug: 'spanking'           },
    { title: 'Squirting',          slug: 'squirting'          },
    { title: 'Stockings',          slug: 'stockings'          },
    { title: 'Striptease',         slug: 'striptease'         },
    { title: 'Teen (18+)',         slug: 'teen'               },
    { title: 'Threesome',          slug: 'threesome'          },
    { title: 'Toys',               slug: 'toys'               },
    { title: 'Uniform',            slug: 'uniform'            },
    { title: 'Vintage',            slug: 'vintage'            },
    { title: 'Webcam',             slug: 'webcam'             },
  ];

  // ----------------------------------------------------------
  // ТРАНСПОРТ — идентично p365
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url)
        .then(function (r) { return r.text(); })
        .then(success)
        .catch(error);
    }
  }

  // ----------------------------------------------------------
  // ОЧИСТКА URL
  // JSON: backslashEscaped=true, protocolRelative=true
  // ----------------------------------------------------------
  function cleanUrl(url) {
    if (!url) return '';
    var u = url.replace(/\\/g, '');
    if (u.indexOf('//') === 0)                              u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/')         u = HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА
  // JSON: cardSelector=".item"
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    var results = [];
    var doc     = new DOMParser().parseFromString(html, 'text/html');
    var items   = doc.querySelectorAll('.item');
    console.log('[hdtub] parsePlaylist → .item найдено:', items.length);

    for (var i = 0; i < items.length; i++) {
      var el     = items[i];
      var linkEl = el.querySelector('a[href]');
      if (!linkEl) continue;

      var href = cleanUrl(linkEl.getAttribute('href') || '');
      if (!href) continue;

      var imgEl = el.querySelector('img');
      var pic   = imgEl
        ? cleanUrl(imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '')
        : '';

      var titleEl = el.querySelector('a[title]');
      var name    = (titleEl
        ? (titleEl.getAttribute('title') || titleEl.textContent)
        : (linkEl.getAttribute('title') || linkEl.textContent)
      ).replace(/\s+/g, ' ').trim() || 'Video';

      results.push({
        name:             name,
        video:            href,
        picture:          pic,
        img:              pic,
        poster:           pic,
        background_image: pic,
        time:             '',
        quality:          'HD',
        json:             true,
        source:           NAME,
      });
    }

    console.log('[hdtub] parsePlaylist → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ КАЧЕСТВ — 3 стратегии
  // JSON: kt_player, video_url=720p, video_alt_url=480p
  // ----------------------------------------------------------
  function extractQualities(html) {
    var q = {};

    // Стратегия 1: kt_player
    var m720 = html.match(/video_url\s*[:=]\s*['"]([^'"]+)['"]/);
    if (m720) { q['720p'] = cleanUrl(m720[1]); console.log('[hdtub] 720p:', q['720p'].substring(0,80)); }

    var m480 = html.match(/video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/);
    if (m480) { q['480p'] = cleanUrl(m480[1]); console.log('[hdtub] 480p:', q['480p'].substring(0,80)); }

    // Стратегия 2: <source size>
    if (!Object.keys(q).length) {
      var re1 = /<source[^>]+src="([^"]+)"[^>]+size="([^"]+)"/gi;
      var re2 = /<source[^>]+size="([^"]+)"[^>]+src="([^"]+)"/gi;
      var m;
      while ((m = re1.exec(html)) !== null) {
        if (m[2] !== 'preview' && m[1].indexOf('.mp4') !== -1) q[m[2] + 'p'] = cleanUrl(m[1]);
      }
      if (!Object.keys(q).length) {
        while ((m = re2.exec(html)) !== null) {
          if (m[1] !== 'preview' && m[2].indexOf('.mp4') !== -1) q[m[1] + 'p'] = cleanUrl(m[2]);
        }
      }
    }

    // Стратегия 3: og:video
    if (!Object.keys(q).length) {
      var og = html.match(/property="og:video"[^>]+content="([^"]+\.mp4[^"]*)"/i)
            || html.match(/content="([^"]+\.mp4[^"]*)"[^>]+property="og:video"/i);
      if (og) {
        var ogUrl = cleanUrl(og[1]);
        var ogQ   = ogUrl.match(/_(\d+)\.mp4/);
        q[ogQ ? ogQ[1] + 'p' : 'HD'] = ogUrl;
      }
    }

    // Fallback: первый .mp4
    if (!Object.keys(q).length) {
      var mp4 = html.match(/['"]([^'"]+\.mp4[^'"]*)['"]/);
      if (mp4) q['HD'] = cleanUrl(mp4[1]);
    }

    return q;
  }

  // ----------------------------------------------------------
  // URL BUILDER
  // JSON: search=/?q=, category=/?c=, pagination=&page=N
  // ----------------------------------------------------------
  function buildUrl(type, value, page) {
    var url = HOST;
    page    = parseInt(page, 10) || 1;

    if (type === 'search') {
      url += '/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'cat') {
      url += '/?c=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else {
      if (page > 1) url += '/?page=' + page;
    }
    return url;
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новое',  playlist_url: NAME + '/new' },
      {
        title:        '📂 Категории',
        playlist_url: 'submenu',
        submenu:      CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТИНГ — идентично p365
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var fetchUrl;
    var searchMatch = url.match(/[?&]search=([^&]*)/);

    if (searchMatch) {
      fetchUrl = buildUrl('search', decodeURIComponent(searchMatch[1]), page);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      var cat = url.replace(NAME + '/cat/', '').split('?')[0];
      fetchUrl = buildUrl('cat', cat, page);
    } else if (url.indexOf(NAME + '/search/') === 0) {
      var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      fetchUrl = buildUrl('search', q, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log('[hdtub] routeView →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      console.log('[hdtub] html длина:', html.length);
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }
      success({
        results:     results,
        collection:  true,
        total_pages: page + 1,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var HdtubParser = {

    main: function (params, success, error) {
      routeView(NAME + '/new', 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      httpGet(buildUrl('search', query, params.page || 1), function (html) {
        var results = parsePlaylist(html);
        success({
          title:       'HDtube: ' + query,
          results:     results,
          collection:  true,
          total_pages: results.length >= 20 ? 2 : 1,
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log('[hdtub] qualities() →', videoPageUrl);
      httpGet(videoPageUrl, function (html) {
        console.log('[hdtub] qualities() html длина:', html.length);
        if (!html || html.length < 500) { error('html < 500'); return; }

        var found = extractQualities(html);
        var keys  = Object.keys(found);
        console.log('[hdtub] qualities() найдено:', keys.length, JSON.stringify(keys));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn('[hdtub] video_url:', (html.match(/video_url/gi)  || []).length);
          console.warn('[hdtub] <source>:',  (html.match(/<source/gi)    || []).length);
          console.warn('[hdtub] .mp4:',      (html.match(/\.mp4/gi)      || []).length);
          error('Видео не найдено');
        }
      }, error);
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ — идентично p365
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, HdtubParser);
      console.log('[hdtub] v' + VERSION + ' зарегистрирован');
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
