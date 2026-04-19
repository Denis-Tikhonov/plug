// =============================================================
// hdtub.js — HDtube Parser для AdultJS (Lampa)
// =============================================================
// Версия  : 1.5.0
// Изменения:
//   [1.5.0] ДИАГНОЗ И FIX воспроизведения:
//
//           Проблема: URL вида https://www.hdtube.porn/get_file/6/{hash}/...mp4
//           требует заголовок Referer: https://www.hdtube.porn/
//           Плеер Lampa/ExoPlayer запрашивает mp4 напрямую БЕЗ Referer
//           → сервер отдаёт 403 или редиректит на заглушку
//
//           Решение: НЕ срезать function/0/ — использовать его как есть.
//           URL function/0/https://...get_file/... — это встроенный прокси
//           самого сайта, который добавляет нужные заголовки.
//           НО: плеер не умеет открывать URL без https://.
//
//           ИТОГОВОЕ РЕШЕНИЕ: пропускать get_file URL через Worker
//           Worker добавляет Referer автоматически → плеер получает видео.
//
//           Изменения cleanUrl():
//           - [REVERT] НЕ срезаем function/0/ из URL
//           - [ADD]    wrapWithWorker() — оборачивает get_file URL в Worker
//
//           ПРИМЕЧАНИЕ: WORKER_URL берётся из window.AdultPlugin.workerUrl
//           если доступен, иначе из константы WORKER_URL (задать ниже)
//
//   [1.4.0] Срезание function/0/ — ПРИВОДИЛО К 403 (видео не воспроизводилось)
//   [1.3.0] Срезание function/0/ для абсолютных URL
//   [1.2.0] Переписан под структуру p365
// =============================================================

(function () {
  'use strict';

  var VERSION    = '1.5.0';
  var NAME       = 'hdtub';
  var HOST       = 'https://www.hdtube.porn';
  var TAG        = '[hdtub]';

  // ← Замените на ваш Worker URL (тот же что в W137.js)
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
  // ТРАНСПОРТ — для загрузки страниц (не для видео)
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  // ----------------------------------------------------------
  // getWorkerBase() — получаем базовый URL Worker
  // Берём из AdultPlugin если есть, иначе из константы
  // ----------------------------------------------------------
  function getWorkerBase() {
    if (window.AdultPlugin && window.AdultPlugin.workerUrl) {
      var wu = window.AdultPlugin.workerUrl;
      // Убираем trailing ?url= если есть
      return wu.replace(/[?&]url=?$/, '');
    }
    return WORKER_URL;
  }

  // ----------------------------------------------------------
  // wrapWithWorker(url) — оборачивает видео-URL через Worker
  //
  // Зачем: hdtube /get_file/ требует Referer: https://www.hdtube.porn/
  //        Worker (W137 v1.3.8+) добавляет его автоматически
  //        Плеер Lampa получает видео через Worker как обычный https://
  //
  // Входные форматы (оба поддерживаются):
  //   A) function/0/https://host/get_file/...   (относительный)
  //   B) https://host/function/0/https://...    (абсолютный)
  //   C) https://host/get_file/...              (уже чистый)
  //
  // Выход: WORKER_URL/?url=https://host/get_file/...
  // ----------------------------------------------------------
  function wrapWithWorker(raw) {
    if (!raw) return '';
    var u = raw.replace(/\\/g, '').trim();

    // Извлекаем вложенный https:// из function/N/
    // Форма A: относительный "function/0/https://..."
    var relM = u.match(/^\/??function\/\d+\/(https?:\/\/.+)$/);
    if (relM) u = relM[1];

    // Форма B: абсолютный "https://host/function/0/https://..."
    var absM = u.match(/^https?:\/\/[^/]+\/function\/\d+\/(https?:\/\/.+)$/);
    if (absM) u = absM[1];

    // Теперь u = чистый https://host/get_file/... URL
    // Проверяем что это реально get_file или mp4
    if (!u || u.indexOf('http') !== 0) return '';

    // Оборачиваем в Worker
    var workerBase = getWorkerBase();
    var wrapped = workerBase + '/?url=' + encodeURIComponent(u);
    console.log(TAG, 'wrapWithWorker:', u.substring(0, 80), '→ Worker');
    return wrapped;
  }

  // ----------------------------------------------------------
  // cleanUrl — только для обычных (не видео) URL
  // ----------------------------------------------------------
  function cleanUrl(raw) {
    if (!raw) return '';
    var u = raw.replace(/\\/g, '').trim();
    if (u.indexOf('//') === 0)                      u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
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
  // JSON: kt_player
  //   video_url     → основное качество (480p/240p — без суффикса)
  //   video_alt_url → высокое качество (720p/360p — суффикс _720p)
  //
  // [1.5.0] Все URL оборачиваются через wrapWithWorker()
  //         Worker добавляет Referer: https://www.hdtube.porn/
  //         что необходимо для доступа к /get_file/ endpoint
  //
  // Лейблы определяются по суффиксу имени файла, не по полю
  // ----------------------------------------------------------
  function extractQualities(html) {
    var q   = {};
    var raw = {};

    // Собираем сырые значения из kt_player
    var fields = [
      { re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/, key: 'video_alt_url' },
      { re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,     key: 'video_url'     },
    ];

    fields.forEach(function (f) {
      var m = html.match(f.re);
      if (m && m[1]) raw[f.key] = m[1].trim();
    });

    console.log(TAG, 'raw video_url:', (raw.video_url     || '').substring(0, 80));
    console.log(TAG, 'raw alt_url:',   (raw.video_alt_url || '').substring(0, 80));

    // Обрабатываем каждый найденный URL
    Object.keys(raw).forEach(function (key) {
      var rawUrl = raw[key];

      // Определяем лейбл по суффиксу имени файла
      var label;
      if      (rawUrl.indexOf('_1080p') !== -1) label = '1080p';
      else if (rawUrl.indexOf('_720p')  !== -1) label = '720p';
      else if (rawUrl.indexOf('_480p')  !== -1) label = '480p';
      else if (rawUrl.indexOf('_360p')  !== -1) label = '360p';
      else if (rawUrl.indexOf('_240p')  !== -1) label = '240p';
      else if (key === 'video_alt_url')          label = '720p';  // alt без суффикса = высокое
      else                                        label = '480p';  // base без суффикса = низкое

      // [1.5.0] Оборачиваем в Worker
      var proxied = wrapWithWorker(rawUrl);
      if (proxied) {
        q[label] = proxied;
        console.log(TAG, label + ' (proxied):', proxied.substring(0, 100));
      }
    });

    // Fallback: <source size>
    if (!Object.keys(q).length) {
      var re1 = /<source[^>]+src="([^"]+)"[^>]+size="([^"]+)"/gi;
      var re2 = /<source[^>]+size="([^"]+)"[^>]+src="([^"]+)"/gi;
      var m;
      while ((m = re1.exec(html)) !== null) {
        if (m[2] !== 'preview' && m[1].indexOf('.mp4') !== -1) {
          q[m[2] + 'p'] = wrapWithWorker(m[1]) || cleanUrl(m[1]);
        }
      }
      if (!Object.keys(q).length) {
        while ((m = re2.exec(html)) !== null) {
          if (m[1] !== 'preview' && m[2].indexOf('.mp4') !== -1) {
            q[m[1] + 'p'] = wrapWithWorker(m[2]) || cleanUrl(m[2]);
          }
        }
      }
    }

    // Fallback: get_file URL напрямую
    if (!Object.keys(q).length) {
      var gfRe = /((?:function\/\d+\/)?https?:\/\/[^"'\s]+\/get_file\/[^"'\s]+\.mp4[^"'\s]*)/g;
      var gf;
      while ((gf = gfRe.exec(html)) !== null) {
        if (gf[1].indexOf('preview') !== -1) continue;
        var gfQ   = gf[1].match(/_(\d+p?)\.mp4/);
        var gfLbl = gfQ ? gfQ[1] : 'HD';
        if (!q[gfLbl]) {
          q[gfLbl] = wrapWithWorker(gf[1]) || cleanUrl(gf[1]);
          break;
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

        // Диагностика
        console.log(TAG, 'video_url cnt:',   (html.match(/video_url/gi)   || []).length);
        console.log(TAG, 'get_file cnt:',    (html.match(/get_file/gi)    || []).length);
        console.log(TAG, 'function/0 cnt:',  (html.match(/function\/0/gi) || []).length);

        var found = extractQualities(html);
        var keys  = Object.keys(found);
        console.log(TAG, 'qualities найдено:', keys.length, JSON.stringify(keys));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn(TAG, 'FAIL — ни одна стратегия не сработала');
          console.warn(TAG, 'video_url:',  (html.match(/video_url/gi)  || []).length);
          console.warn(TAG, 'get_file:',   (html.match(/get_file/gi)   || []).length);
          console.warn(TAG, '.mp4:',       (html.match(/\.mp4/gi)      || []).length);
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
