// =============================================================
// hdtub.js — HDtube Parser для AdultJS (Lampa)
// =============================================================
// Версия  : 1.6.0
// Изменения:
//   [1.6.0] ФИНАЛЬНЫЙ FIX: kt_player URL decode algorithm
//
//   Проблема (Worker_Test_UI_Modification.json):
//     get_file/6/HASH/...mp4 → 404 при прямом обращении и через Worker
//     Причина: HASH зашифрован через license_code алгоритм kt_player
//     function/0/ = маркер "URL требует расшифровки"
//
//   Алгоритм (подтверждён тестом в node.js):
//     license '$478734915794302' → digits → пары → shifts[i] = pair % 9
//     dirty hash (40 hex) → 8 чанков × 5 → сдвиг влево shifts[i] % 5
//     clean hash → прямой URL без function/0/ → плеер воспроизводит
//
//   Тест:
//     dirty: 1fdd91fdf2a7f9a53b342587ca59f84c0cedab611d
//     clean: dd91ffdf21f9aa73b3457c2588a59fce4c0b61da1d
//     shifts: [2,6,7,1,3,4,3,2]
//
//   [1.5.1] Worker proxy → 404 (hash не был расшифрован)
//   [1.4.0] cleanUrl срезал function/0/ → 403
//   [1.2.0] Базовая структура p365
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.6.0';
  var NAME    = 'hdtub';
  var HOST    = 'https://www.hdtube.porn';
  var TAG     = '[hdtub]';

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
  // ТРАНСПОРТ
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  // ----------------------------------------------------------
  // cleanUrl — для обычных (не видео) URL
  // ----------------------------------------------------------
  function cleanUrl(raw) {
    if (!raw) return '';
    var u = raw.replace(/\\/g, '').trim();
    if (u.indexOf('//') === 0)                      u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // kt_player DECODE ALGORITHM
  // ==========================================================
  //
  // Источник: flashvars из www.hdtube.porn + тест node.js
  //
  // license_code: '$478734915794302'
  // → digits:  '478734915794302'
  // → пары:     47, 87, 34, 91, 57, 94, 30, 2
  // → % 9:      [2,  6,  7,  1,  3,  4,  3, 2]
  //
  // dirty hash: '1fdd91fdf2a7f9a53b342587ca59f84c0cedab611d' (42 символа)
  // head (40):  '1fdd91fdf2a7f9a53b342587ca59f84c0cedab61'
  // tail:       '1d'
  // чанки:      ['1fdd9','1fdf2','a7f9a','53b34','2587c','a59f8','4c0ce','dab61']
  // сдвиги:     [2,6,7,1,3,4,3,2]
  // результат:  ['dd91f','fdf21','f9aa7','3b345','7c258','8a59f','ce4c0','b61da']
  // clean:      'dd91ffdf21f9aa73b3457c2588a59fce4c0b61da1d'
  // ----------------------------------------------------------

  function ktGetShifts(licenseCode) {
    var digits = licenseCode.replace(/[^0-9]/g, '');
    var shifts = [];
    for (var i = 0; i < digits.length; i += 2) {
      shifts.push(parseInt(digits.substr(i, 2), 10) % 9);
    }
    return shifts;
  }

  function ktDecodeUrl(rawUrl, licenseCode) {
    // Нормализуем входной URL
    var url = rawUrl.replace(/\\/g, '').trim();

    // Убираем относительный function/N/
    var relM = url.match(/^\/??function\/\d+\/(https?:\/\/.+)$/);
    if (relM) url = relM[1];

    // Убираем абсолютный https://host/function/N/https://...
    var absM = url.match(/^https?:\/\/[^/]+\/function\/\d+\/(https?:\/\/.+)$/);
    if (absM) url = absM[1];

    // Находим dirty hash
    var hashMatch = url.match(/\/get_file\/\d+\/([0-9a-f]+)\//i);
    if (!hashMatch) {
      console.log(TAG, 'ktDecode: hash не найден, возвращаем url as-is');
      return url;
    }
    var dirty = hashMatch[1];

    var shifts    = ktGetShifts(licenseCode);
    var chunkLen  = 5;
    var numChunks = 8;

    // Первые 40 hex символов → 8 чанков, остаток → хвост
    var head = dirty.substring(0, numChunks * chunkLen);
    var tail = dirty.substring(numChunks * chunkLen);

    var chunks = [];
    for (var i = 0; i < numChunks; i++) {
      chunks.push(head.substr(i * chunkLen, chunkLen));
    }

    // Сдвиг влево: chunk = chunk[s:] + chunk[:s]
    for (var i = 0; i < numChunks && i < shifts.length; i++) {
      var s = shifts[i] % chunkLen;
      if (s === 0) continue;
      var c = chunks[i];
      chunks[i] = c.substring(s) + c.substring(0, s);
    }

    var cleanHash = chunks.join('') + tail;
    var decoded   = url.replace(dirty, cleanHash);

    console.log(TAG, 'ktDecode dirty[0:20]:', dirty.substring(0, 20));
    console.log(TAG, 'ktDecode clean[0:20]:', cleanHash.substring(0, 20));
    console.log(TAG, 'ktDecode result:',      decoded.substring(0, 100));

    return decoded;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА — JSON cardSelector=".item"
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    var results = [];
    var doc     = new DOMParser().parseFromString(html, 'text/html');
    var items   = doc.querySelectorAll('.item');
    console.log(TAG, 'parsePlaylist → .item:', items.length);

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
        : (linkEl.getAttribute('title')  || linkEl.textContent)
      ).replace(/\s+/g, ' ').trim() || 'Video';

      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time: '', quality: 'HD', json: true, source: NAME,
      });
    }

    console.log(TAG, 'parsePlaylist → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ КАЧЕСТВ
  //
  // Алгоритм:
  // 1. Находим license_code в flashvars
  // 2. Находим video_url и video_alt_url в flashvars
  // 3. Расшифровываем каждый через ktDecodeUrl(url, license)
  // 4. Получаем прямые https://host/get_file/... URL
  // ----------------------------------------------------------
  function extractQualities(html) {
    var q = {};

    // license_code
    var licM    = html.match(/license_code\s*[:=]\s*['"]([^'"]+)['"]/);
    var license = licM ? licM[1] : '';
    console.log(TAG, 'license_code:', license || '❌ НЕ НАЙДЕН');

    // Поля flashvars
    var fields = [
      { re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/,  key: 'alt',  defaultLabel: '720p' },
      { re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,      key: 'main', defaultLabel: '480p' },
    ];

    fields.forEach(function (f) {
      var m = html.match(f.re);
      if (!m || !m[1]) return;
      var rawUrl = m[1].trim();

      // Определяем лейбл по суффиксу файла
      var label = f.defaultLabel;
      if      (rawUrl.indexOf('_1080p') !== -1) label = '1080p';
      else if (rawUrl.indexOf('_720p')  !== -1) label = '720p';
      else if (rawUrl.indexOf('_480p')  !== -1) label = '480p';
      else if (rawUrl.indexOf('_360p')  !== -1) label = '360p';
      else if (rawUrl.indexOf('_240p')  !== -1) label = '240p';

      var decoded;
      if (rawUrl.indexOf('function/') !== -1 && license) {
        decoded = ktDecodeUrl(rawUrl, license);
      } else if (rawUrl.indexOf('function/') !== -1) {
        // license не найден — срезаем function/N/ как последний шанс
        decoded = rawUrl.replace(/^\/??function\/\d+\//, '');
        var absM = decoded.match(/^https?:\/\/[^/]+\/function\/\d+\/(https?:\/\/.+)$/);
        if (absM) decoded = absM[1];
        console.warn(TAG, 'license не найден! URL может быть нерабочим:', decoded.substring(0, 80));
      } else {
        decoded = rawUrl;
      }

      if (decoded && decoded.indexOf('http') === 0) {
        q[label] = decoded;
        console.log(TAG, label + ':', decoded.substring(0, 100));
      }
    });

    // Fallback: <source size>
    if (!Object.keys(q).length) {
      console.warn(TAG, 'flashvars не дал результат → <source> fallback');
      var re1 = /<source[^>]+src="([^"]+)"[^>]+size="([^"]+)"/gi;
      var re2 = /<source[^>]+size="([^"]+)"[^>]+src="([^"]+)"/gi;
      var m;
      while ((m = re1.exec(html)) !== null) {
        if (m[2] !== 'preview' && m[1].indexOf('.mp4') !== -1)
          q[m[2] + 'p'] = cleanUrl(m[1]);
      }
      if (!Object.keys(q).length) {
        while ((m = re2.exec(html)) !== null) {
          if (m[1] !== 'preview' && m[2].indexOf('.mp4') !== -1)
            q[m[1] + 'p'] = cleanUrl(m[2]);
        }
      }
    }

    return q;
  }

  // ----------------------------------------------------------
  // URL BUILDER
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
        title: '📂 Категории', playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТИНГ
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var fetchUrl;
    var sm = url.match(/[?&]search=([^&]*)/);
    if (sm) {
      fetchUrl = buildUrl('search', decodeURIComponent(sm[1]), page);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      fetchUrl = buildUrl('cat', url.replace(NAME + '/cat/', '').split('?')[0], page);
    } else if (url.indexOf(NAME + '/search/') === 0) {
      var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      fetchUrl = buildUrl('search', q, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log(TAG, 'routeView →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      console.log(TAG, 'html длина:', html.length);
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }
      success({ results: results, collection: true, total_pages: page + 1, menu: buildMenu() });
    }, error);
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var HdtubParser = {
    main: function (p, s, e) { routeView(NAME + '/new', 1, s, e); },
    view: function (p, s, e) { routeView(p.url || NAME, p.page || 1, s, e); },
    search: function (p, s, e) {
      var q = (p.query || '').trim();
      httpGet(buildUrl('search', q, p.page || 1), function (html) {
        s({ title: 'HDtube: ' + q, results: parsePlaylist(html), collection: true, total_pages: 2 });
      }, e);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);
      httpGet(videoPageUrl, function (html) {
        console.log(TAG, 'html длина:', html.length);
        if (!html || html.length < 500) { error('html < 500'); return; }

        console.log(TAG, 'license_code cnt:', (html.match(/license_code/gi) || []).length);
        console.log(TAG, 'video_url cnt:',    (html.match(/video_url/gi)    || []).length);
        console.log(TAG, 'function/0 cnt:',   (html.match(/function\/0/gi)  || []).length);

        var found = extractQualities(html);
        var keys  = Object.keys(found);
        console.log(TAG, 'qualities найдено:', keys.length, JSON.stringify(keys));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn(TAG, 'FAIL: license=', (html.match(/license_code/gi)||[]).length,
                            '.mp4=', (html.match(/\.mp4/gi)||[]).length);
          error('Видео не найдено');
        }
      }, error);
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, HdtubParser);
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
