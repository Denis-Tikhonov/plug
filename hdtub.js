// =============================================================
// hdtub.js — HDtube Parser для AdultJS (Lampa)
// =============================================================
// Версия  : 1.8.0
// Изменения:
//   [1.8.0] ФИНАЛЬНЫЙ FIX — используем Worker /resolve endpoint
//
//   Анализ всех логов (v1.3.7, v1.4.0, v1.5.x, v1.6.0, v1.7.0):
//
//   ФАКТ 1: function/0/ → 404 при любом Referer через Worker
//   ФАКТ 2: get_file с decoded hash → hops:0, type:text/html (не видео)
//   ФАКТ 3: Рабочая ссылка = nvms*.cdn.privatehost.com/...?sign=...
//   ФАКТ 4: Worker v1.7.0 имеет эндпоинт /resolve который следует
//           redirect цепочке HEAD запросами и возвращает финальный URL
//   ФАКТ 5: conf.txt REDIRECT.mode = "follow", kvsConfidence = 1
//
//   ВЫВОД: IP-привязка подписи. Worker должен СНАЧАЛА резолвить
//   function/0/ URL чтобы получить signed CDN URL, затем передать
//   его плееру напрямую. Worker /resolve делает именно это.
//
//   Новый поток qualities():
//   1. Парсим video_url из flashvars → function/0/ URL
//   2. Строим абсолютный function/0/ URL
//   3. GET WORKER/resolve?url=encodeURIComponent(function0Url)
//   4. Worker следует redirect цепочке → возвращает JSON с final URL
//   5. final = nvms*.cdn.privatehost.com/...?sign=... → передаём плееру
//   6. Плеер открывает CDN URL напрямую (без Worker)
//
//   [1.7.0] Worker proxy function/0/ → 404 (IP-binding sign)
//   [1.6.0] ktDecodeUrl → get_file → text/html
//   [1.5.x] Worker proxy get_file → 404
//   [1.4.0] cleanUrl срезал function/0/ → 403
// =============================================================

(function () {
  'use strict';

  var VERSION    = '1.8.0';
  var NAME       = 'hdtub';
  var HOST       = 'https://www.hdtube.porn';
  var TAG        = '[hdtub]';

  // Worker URL с /resolve endpoint (W170+)
  var WORKER_URL = 'https://zonaproxy.777b737.workers.dev';

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
  // ТРАНСПОРТ — для загрузки HTML страниц
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
  // httpGetJson — для /resolve endpoint (возвращает JSON)
  // ----------------------------------------------------------
  function httpGetJson(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, function (text) {
        try {
          success(JSON.parse(text));
        } catch (e) {
          error('JSON parse error: ' + e.message);
        }
      }, error);
    } else {
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(success)
        .catch(error);
    }
  }

  // ----------------------------------------------------------
  // getWorkerBase() — Worker URL без trailing /
  // ----------------------------------------------------------
  function getWorkerBase() {
    var base = WORKER_URL;
    if (window.AdultPlugin && window.AdultPlugin.workerUrl) {
      base = window.AdultPlugin.workerUrl;
    }
    return base.replace(/[/?&]url=?$/, '').replace(/\/+$/, '');
  }

  // ----------------------------------------------------------
  // toAbsoluteFuncUrl(rawVideoUrl)
  // Строим абсолютный function/0/ URL из flashvars значения
  //
  // Форма A: 'function/0/https://host/get_file/...'   → HOST/function/0/https://...
  // Форма B: 'https://host/function/0/https://...'    → as-is
  // ----------------------------------------------------------
  function toAbsoluteFuncUrl(raw) {
    if (!raw) return '';
    var u = raw.replace(/\\/g, '').trim();

    // Форма A: относительный
    if (u.match(/^function\/\d+\//)) {
      return HOST + '/' + u;
    }
    // Форма B: уже абсолютный с function
    if (u.match(/^https?:\/\/[^/]+\/function\/\d+\//)) {
      return u;
    }
    // Форма C: уже прямой URL (без function/) — возвращаем как есть
    if (u.indexOf('http') === 0) {
      return u;
    }
    // protocol-relative или root-relative
    if (u.indexOf('//') === 0) return 'https:' + u;
    if (u.charAt(0) === '/')   return HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // cleanUrl — только для обычных (не видео) URL: постеры, страницы
  // ----------------------------------------------------------
  function cleanUrl(raw) {
    if (!raw) return '';
    var u = raw.replace(/\\/g, '').trim();
    if (u.indexOf('//') === 0)                      u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // resolveViaWorker(func0Url, labelHint, callback)
  //
  // Вызывает WORKER/resolve?url=func0Url
  // Worker v1.7.0 следует redirect цепочке HEAD запросами
  // и возвращает JSON: { final: "https://nvms*.cdn.privatehost.com/...?sign=..." }
  //
  // callback(null, finalUrl) при успехе
  // callback(err, null)      при ошибке
  // ----------------------------------------------------------
  function resolveViaWorker(func0Url, labelHint, callback) {
    var resolveUrl = getWorkerBase() + '/resolve?url=' + encodeURIComponent(func0Url);
    console.log(TAG, 'resolve', labelHint, '→', func0Url.substring(0, 80));

    httpGetJson(resolveUrl, function (json) {
      console.log(TAG, 'resolve', labelHint, 'response:', JSON.stringify(json).substring(0, 200));

      var finalUrl = json.final || json.url || '';

      if (!finalUrl || finalUrl.indexOf('http') !== 0) {
        console.warn(TAG, 'resolve', labelHint, ': нет final URL в ответе');
        callback('no final URL', null);
        return;
      }

      // Проверяем что это реально видео URL (CDN)
      if (finalUrl.indexOf('cdn.privatehost.com') !== -1 ||
          finalUrl.indexOf('.mp4') !== -1 ||
          finalUrl.indexOf('.m3u8') !== -1) {
        console.log(TAG, 'resolve', labelHint, 'final CDN:', finalUrl.substring(0, 100));
        callback(null, finalUrl);
      } else {
        // Финальный URL — не CDN (всё ещё text/html от get_file)
        console.warn(TAG, 'resolve', labelHint, ': final не CDN URL:', finalUrl.substring(0, 80));
        callback('final is not CDN: ' + finalUrl.substring(0, 80), null);
      }
    }, function (err) {
      console.warn(TAG, 'resolve', labelHint, 'error:', err);
      callback(err, null);
    });
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
  // extractRawVideoUrls(html)
  // Извлекаем сырые значения video_url и video_alt_url из flashvars
  // ----------------------------------------------------------
  function extractRawVideoUrls(html) {
    var result = {};

    var fields = [
      { re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/,  key: 'alt',  label: '720p' },
      { re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,      key: 'main', label: '480p' },
    ];

    fields.forEach(function (f) {
      var m = html.match(f.re);
      if (!m || !m[1]) return;
      var rawUrl = m[1].trim();

      // Уточняем лейбл по суффиксу
      var label = f.label;
      if      (rawUrl.indexOf('_1080p') !== -1) label = '1080p';
      else if (rawUrl.indexOf('_720p')  !== -1) label = '720p';
      else if (rawUrl.indexOf('_480p')  !== -1) label = '480p';
      else if (rawUrl.indexOf('_360p')  !== -1) label = '360p';
      else if (rawUrl.indexOf('_240p')  !== -1) label = '240p';

      result[f.key] = { raw: rawUrl, label: label };
      console.log(TAG, 'raw ' + f.key + ' (' + label + '):', rawUrl.substring(0, 80));
    });

    return result;
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

    // ----------------------------------------------------------
    // qualities() — главная функция
    //
    // Поток:
    // 1. Загрузить HTML страницы видео
    // 2. Извлечь video_url и video_alt_url
    // 3. Для каждого: resolveViaWorker(function0Url) → CDN signed URL
    // 4. Собрать { qualities: { '720p': cdnUrl, '480p': cdnUrl } }
    // ----------------------------------------------------------
    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log(TAG, 'html длина:', html.length);
        if (!html || html.length < 500) { error('html < 500'); return; }

        // Диагностика
        console.log(TAG, 'video_url cnt:',   (html.match(/video_url/gi)   || []).length);
        console.log(TAG, 'function/0 cnt:',  (html.match(/function\/0/gi) || []).length);

        var rawUrls = extractRawVideoUrls(html);
        var keys    = Object.keys(rawUrls);

        if (!keys.length) {
          console.warn(TAG, 'flashvars не найдены');
          console.warn(TAG, '.mp4:', (html.match(/\.mp4/gi) || []).length);
          error('video_url не найден в HTML');
          return;
        }

        // Резолвим каждый URL через Worker /resolve
        var resolved  = {};
        var pending   = keys.length;
        var hasResult = false;

        function onResolved(label, finalUrl) {
          if (finalUrl) {
            resolved[label] = finalUrl;
            hasResult = true;
          }
          pending--;
          if (pending === 0) {
            if (hasResult) {
              console.log(TAG, 'qualities итог:', JSON.stringify(Object.keys(resolved)));
              success({ qualities: resolved });
            } else {
              error('Не удалось получить CDN URL через /resolve');
            }
          }
        }

        keys.forEach(function (key) {
          var item     = rawUrls[key];
          var func0Url = toAbsoluteFuncUrl(item.raw);

          if (!func0Url) {
            onResolved(item.label, null);
            return;
          }

          resolveViaWorker(func0Url, item.label, function (err, finalUrl) {
            onResolved(item.label, finalUrl);
          });
        });

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
