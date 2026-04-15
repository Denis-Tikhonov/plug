// =============================================================
// eporner.js — Парсер EPorner для AdultJS (Lampa)
// Version  : 1.2.0
// Based on : eprn_110 + исправления
//
// [1.2.0] ИСПРАВЛЕНО:
//   A) Резервный regex в qualities() — двойное экранирование в строке
//      было:    var re = /"src":\s*"(https?:\\\/\\\/[^"]+-(\d+p)\.mp4)"/g
//               искал буквально 'https:\/\/' — ничего не находил
//      стало:   /"src"\s*:\s*"(https?:\/\/[^"]+-(\d+p)\.mp4)"/g
//
//   B) Парсинг API ответа EPorner /xhr/video/{vid}?hash=...
//      Реальный формат ответа: { sources: { "mp4": { "360": "url", "720": "url" } } }
//      или:                    { sources: { "mp4": [ {res:"720", src:"url"} ] } }
//      было: data.sources.mp4.forEach() — падало если mp4 объект, не массив
//      стало: обрабатываем оба формата + добавлен лог ответа API
//
//   C) Добавлена диагностика в qualities() как в phub_210/p365_140
//
//   D) Добавлен параметр supportedFormats=dash,mp4 в API URL
//      (без него API может вернуть только dash-ссылки)
//
// Структура URL EPorner:
//   Главная   : https://www.eporner.com/
//   Страница N: https://www.eporner.com/{N}/
//   Категория : https://www.eporner.com/cat/{slug}/{page}/
//   Поиск     : https://www.eporner.com/?q={query}&page={N}
//   API видео : https://www.eporner.com/xhr/video/{vid}?hash={base36}&domain=eporner.com&supportedFormats=dash,mp4
//
// Worker ALLOWED_TARGETS:
//   eporner.com     — сайт + API
//   cdn.eporner.com — CDN (если есть)
// =============================================================

(function () {
  'use strict';

  var NAME = 'epor';
  var HOST = 'https://www.eporner.com';

  var CATS = [
    { title: 'Зрелые',        slug: 'mature'       },
    { title: 'МИЛФ',          slug: 'milf'         },
    { title: 'Любительское',  slug: 'amateur'      },
    { title: 'Анальное',      slug: 'anal'         },
    { title: 'Лесбиянки',     slug: 'lesbian'      },
    { title: 'Оральный секс', slug: 'blowjob'      },
    { title: 'Большие сиськи',slug: 'big-tits'     },
    { title: 'Межрасовое',    slug: 'interracial'  },
    { title: 'Групповое',     slug: 'threesome'    },
    { title: 'Азиатки',       slug: 'asian'        },
    { title: 'Латинки',       slug: 'latina'       },
    { title: 'Хардкор',       slug: 'hardcore'     },
    { title: 'Русское',       slug: 'russian'      },
    { title: 'HD Порно',      slug: 'hd'           },
  ];

  var SORTS = [
    { title: 'Новинки',       val: ''              },
    { title: 'Топ просмотра', val: 'most-viewed'   },
    { title: 'Топ рейтинга',  val: 'top-rated'     },
    { title: 'Длинные',       val: 'longest'       },
  ];

  // ----------------------------------------------------------
  // Сетевой запрос
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

  function rx(str, regex, group) {
    if (!str) return null;
    var g = (group === undefined) ? 1 : group;
    var m = str.match(regex);
    return (m && m[g]) ? m[g].trim() : null;
  }

  // ----------------------------------------------------------
  // Построение URL
  // ----------------------------------------------------------
  function buildUrl(query, sort, cat, page) {
    var url = HOST + '/';
    page = parseInt(page, 10) || 1;

    if (query) {
      url += '?q=' + encodeURIComponent(query);
      if (page > 1) url += '&page=' + page;
    } else if (cat) {
      url += 'cat/' + cat + '/';
      if (page > 1) url += page + '/';
    } else if (sort) {
      url += sort + '/';
      if (page > 1) url += page + '/';
    } else {
      if (page > 1) url += page + '/';
    }

    return url;
  }

  function buildMenu() {
    return [
      { title: 'Поиск', search_on: true, playlist_url: NAME + '/search/' },
      {
        title:        'Сортировка',
        playlist_url: 'submenu',
        submenu:      SORTS.map(function (s) {
          return { title: s.title, playlist_url: NAME + '/sort/' + s.val };
        }),
      },
      {
        title:        'Категории',
        playlist_url: 'submenu',
        submenu:      CATS.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // Парсинг карточек
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];

    var doc   = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('div.mb, div.mb.hdy');

    console.log('[EPOR] parseCards → div.mb найдено:', items.length);

    var results = [];

    for (var i = 0; i < items.length; i++) {
      var el = items[i];

      var linkEl = el.querySelector('p.mbtit a');
      if (!linkEl) continue;

      var href = linkEl.getAttribute('href') || '';
      if (!href) continue;
      if (href.indexOf('http') !== 0) href = HOST + href;

      var name = (linkEl.getAttribute('title') || linkEl.textContent || '').trim();
      if (!name || name.length < 3) continue;

      var img = el.querySelector('img');
      var pic = img ? (img.getAttribute('data-src') || img.getAttribute('src') || '') : '';
      if (pic && pic.indexOf('//') === 0) pic = 'https:' + pic;

      // Превью: data-id + паттерн URL
      var dataId  = el.getAttribute('data-id') || '';
      var preview = (pic && dataId)
        ? pic.replace(/\/[^/]+$/, '') + '/' + dataId + '-preview.webm'
        : null;

      var durEl   = el.querySelector('span.mbtim');
      var time    = durEl ? durEl.textContent.trim() : '';

      var hdBadge = el.querySelector('div.mvhdico');
      var quality = hdBadge ? 'HD' : '';

      results.push({
        name:    name,
        video:   href,
        picture: pic,
        img:     pic,
        poster:  pic,
        preview: preview,
        time:    time,
        quality: quality,
        json:    true,
        source:  NAME,
      });
    }

    console.log('[EPOR] parseCards → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // Base36 конвертер для хеша (без изменений из v1.1.0)
  // ----------------------------------------------------------
  function base36(hexStr) {
    var n    = parseInt(hexStr, 16);
    var chars  = '0123456789abcdefghijklmnopqrstuvwxyz';
    var result = '';
    while (n > 0) {
      result = chars[n % 36] + result;
      n      = Math.floor(n / 36);
    }
    return result || '0';
  }

  function convertHash(hash) {
    if (!hash || hash.length < 32) return '';
    return base36(hash.substring(0, 8))  +
           base36(hash.substring(8, 16)) +
           base36(hash.substring(16, 24)) +
           base36(hash.substring(24, 32));
  }

  // ----------------------------------------------------------
  // [1.2.0] Парсинг ответа API EPorner
  //
  // Реальный формат ответа (два возможных варианта):
  //
  // Вариант A (объект с ключами-качествами):
  //   { "sources": { "mp4": { "720": "https://...", "480": "https://..." } } }
  //
  // Вариант B (массив объектов):
  //   { "sources": { "mp4": [ { "res": "720", "src": "https://..." } ] } }
  //
  // Версия 1.1.0 обрабатывала только вариант B через .forEach()
  // и падала на варианте A с "TypeError: forEach is not a function"
  // ----------------------------------------------------------
  function parseApiResponse(jsonStr) {
    var q = {};

    try {
      var data = JSON.parse(jsonStr);

      if (data && data.sources && data.sources.mp4) {
        var mp4 = data.sources.mp4;

        if (Array.isArray(mp4)) {
          // Вариант B: массив
          for (var i = 0; i < mp4.length; i++) {
            var label = (mp4[i].res || 'SD') + 'p';
            var src   = mp4[i].src || mp4[i].url || '';
            if (src) q[label] = src.replace(/\\/g, '');
          }
        } else if (typeof mp4 === 'object') {
          // Вариант A: объект { "720": "url", "480": "url" }
          for (var quality in mp4) {
            if (!mp4.hasOwnProperty(quality)) continue;
            var url = mp4[quality];
            if (typeof url === 'string' && url.indexOf('http') === 0) {
              q[quality + 'p'] = url.replace(/\\/g, '');
            }
          }
        }
      }
    } catch (e) {
      console.warn('[EPOR] JSON.parse API error:', e.message);
    }

    return q;
  }

  // ----------------------------------------------------------
  // Роутинг
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var sort  = null;
    var cat   = null;
    var query = null;

    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      query = decodeURIComponent(searchMatch[1]);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      cat  = url.replace(NAME + '/cat/', '').split('?')[0];
    } else if (url.indexOf(NAME + '/sort/') === 0) {
      sort = url.replace(NAME + '/sort/', '').split('?')[0];
    }

    var fetchUrl = buildUrl(query, sort, cat, page);
    console.log('[EPOR] routeView →', fetchUrl);

    httpGet(fetchUrl, function (html) {
      console.log('[EPOR] html длина:', html.length);
      var cards = parseCards(html);
      success({
        results:     cards,
        collection:  true,
        total_pages: cards.length > 0 ? page + 1 : page,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ----------------------------------------------------------
  // Публичный интерфейс
  // ----------------------------------------------------------
  var EpornerParser = {

    main: function (params, success, error) {
      routeView(NAME, 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query    = (params.query || '').trim();
      var fetchUrl = buildUrl(query, null, null, params.page || 1);
      httpGet(fetchUrl, function (html) {
        var cards = parseCards(html);
        success({
          title:       'EP: ' + query,
          results:     cards,
          collection:  true,
          total_pages: cards.length > 0 ? (params.page || 1) + 1 : 1,
        });
      }, error);
    },

    // [1.2.0] qualities() — исправлены regex и парсинг API ответа
    qualities: function (videoPageUrl, success, error) {
      console.log('[EPOR] qualities() → страница:', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log('[EPOR] qualities() → html длина:', html.length);

        if (!html || html.length < 500) {
          error('Страница видео недоступна');
          return;
        }

        var vid  = rx(html, /vid\s*=\s*'([^']+)'/);
        var hash = rx(html, /hash\s*=\s*'([^']+)'/);

        console.log('[EPOR] vid:', vid, '| hash:', hash ? hash.substring(0, 8) + '...' : null);

        if (!vid || !hash) {
          console.warn('[EPOR] vid/hash не найдены');
          console.warn('[EPOR]   vid:',  (html.match(/vid\s*=/gi)  || []).length);
          console.warn('[EPOR]   hash:', (html.match(/hash\s*=/gi) || []).length);
          error('EPorner: vid/hash не найдены на странице');
          return;
        }

        var convertedHash = convertHash(hash);
        // [1.2.0] добавлен supportedFormats=dash,mp4 для получения mp4 ссылок
        var apiUrl = HOST + '/xhr/video/' + vid +
          '?hash='    + convertedHash +
          '&domain=eporner.com' +
          '&fallback=false' +
          '&embed=false' +
          '&supportedFormats=dash,mp4' +
          '&_=' + Date.now();

        console.log('[EPOR] API URL:', apiUrl.substring(0, 100));

        httpGet(apiUrl, function (jsonStr) {
          console.log('[EPOR] API ответ длина:', jsonStr.length);

          // Основной путь: парсим JSON ответ API
          var q = parseApiResponse(jsonStr);

          // [1.2.0] Резервный regex — ИСПРАВЛЕНО двойное экранирование
          // было: /"src":\s*"(https?:\\\/\\\/[^"]+-(\d+p)\.mp4)"/g
          // стало: правильный regex литерал
          if (!Object.keys(q).length) {
            console.log('[EPOR] JSON parse дал 0, пробуем regex...');
            var re = /"src"\s*:\s*"(https?:\/\/[^"]+-(\d+p)\.mp4)"/g;
            var m;
            while ((m = re.exec(jsonStr)) !== null) {
              var link = m[1].replace(/\\/g, '');
              if (!q[m[2]]) q[m[2]] = link;
            }
          }

          // Второй резервный: любые mp4 URL в ответе API
          if (!Object.keys(q).length) {
            console.log('[EPOR] regex тоже 0, ищем любые mp4...');
            var anyMp4Re = /"(https?:\/\/[^"]+\.mp4[^"]*)"/g;
            var am;
            var amIdx = 0;
            while ((am = anyMp4Re.exec(jsonStr)) !== null && amIdx < 5) {
              var mpUrl  = am[1].replace(/\\/g, '');
              var mpQ    = mpUrl.match(/[_-](\d{3,4})[pP]/) || mpUrl.match(/\/(\d{3,4})[pP]/);
              var mpLabel = mpQ ? mpQ[1] + 'p' : ('MP4' + amIdx);
              if (!q[mpLabel]) { q[mpLabel] = mpUrl; amIdx++; }
            }
          }

          var keys = Object.keys(q);
          console.log('[EPOR] qualities → найдено:', keys.length, JSON.stringify(keys));

          if (keys.length > 0) {
            success({ qualities: q });
          } else {
            // Диагностика
            console.warn('[EPOR] ничего не найдено');
            console.warn('[EPOR]   sources:', (jsonStr.match(/"sources"/gi) || []).length);
            console.warn('[EPOR]   mp4:',    (jsonStr.match(/"mp4"/gi)     || []).length);
            console.warn('[EPOR]   .mp4:',   (jsonStr.match(/\.mp4/gi)     || []).length);
            console.warn('[EPOR]   error:',  jsonStr.substring(0, 200));
            error('EPorner: видео не найдено');
          }
        }, error);
      }, error);
    },
  };

  // ----------------------------------------------------------
  // Регистрация
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, EpornerParser);
      console.log('[EPOR] v1.2.0 зарегистрирован');
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var timer = setInterval(function () {
      if (tryRegister()) clearInterval(timer);
    }, 200);
    setTimeout(function () { clearInterval(timer); }, 10000);
  }

})();
