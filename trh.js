// =============================================================
// trh.js — Парсер TrahKino для AdultJS (Lampa)
// Version  : 1.3.0
// Based on : JSON config trahkino.me (v4.1.0)
//
// [1.3.0] CRITICAL FIX:
//         - [FIX] cleanUrl: срезаем прокси-префикс /function/N/
//                 https://trahkino.me/function/0/https://trahkino.me/get_file/...
//                 → https://trahkino.me/get_file/36/{hash}/{id}/{id}.mp4/
//                 Плеер Lampa не понимает URL с вложенным https://
//                 → "нет подходящего плеера"
//         - [FIX] extractQualities: применяем cleanUrl() ко всем kt_player URL
//         - trahkino.me НЕ требует Referer (refererProtected: false),
//           поэтому после срезки прямые URL работают
//
// [1.2.0] Полная переработка на основе JSON-анализа:
//   - extractQualities: kt_player video_url / video_alt_url
//   - parseCards: добавлен preview (poster jpg)
//   - buildUrl: исправлена пагинация
//
// Движок видео: kt_player
//   video_url     → 240p (без суффикса)
//   video_alt_url → 360p (_360p суффикс)
//   video_alt_url2 → 720p (если есть)
//
// URL-схема:
//   Главная    : HOST/latest-updates/
//   Страница N : HOST/latest-updates/?page=N
//   Поиск      : HOST/?q={query}&page=N
//   Категория  : HOST/?c={slug}&page=N
//   Видео      : HOST/video/{id}/
//
// Worker ALLOWED_TARGETS: trahkino.me
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.3.0';
  var NAME    = 'trh';
  var HOST    = 'https://trahkino.me';

  // Категории из JSON-анализа (40 шт.)
  var CATS = [
    { name: 'Любительское',       slug: 'lyubitelskiy-seks'   },
    { name: 'Минет',              slug: 'minet'               },
    { name: 'Брюнетки',           slug: 'bryunetki'           },
    { name: 'Большие члены',      slug: 'bolshie-hui'         },
    { name: 'Анал',               slug: 'anal'                },
    { name: 'Милфы',              slug: 'milfy'               },
    { name: 'Домашнее',           slug: 'domashka'            },
    { name: 'Соло',               slug: 'solo'                },
    { name: 'Большие сиськи',     slug: 'bolshie-siski'       },
    { name: 'От первого лица',    slug: 'ot-pervogo-lica'     },
    { name: 'Большие попки',      slug: 'bolshie-popki'       },
    { name: 'Кончают внутрь',     slug: 'konchayut-vnutr'     },
    { name: 'Мулатки',            slug: 'mulatki'             },
    { name: 'Красотки',           slug: 'krasotki'            },
    { name: 'Русское',            slug: 'russkie'             },
    { name: 'Наездница',          slug: 'naezdnica'           },
    { name: 'Толстушки',          slug: 'tolstye'             },
    { name: 'Натуральные сиськи', slug: 'naturalnye-siski'    },
    { name: 'Раком',              slug: 'rakom'               },
    { name: 'Ролевые игры',       slug: 'rolevye-igry'        },
    { name: 'Фетиш',             slug: 'fetish'              },
    { name: 'Дрочка члена',       slug: 'drochka-chlena'      },
    { name: 'Татуированные',      slug: 'tatu'                },
    { name: 'Групповуха',         slug: 'gruppovuha'          },
    { name: 'Бритые киски',       slug: 'britye-kiski'        },
    { name: 'Мастурбация',        slug: 'masturbaciya'        },
    { name: 'Массаж',             slug: 'eroticheskiy-massaj' },
    { name: 'Сперма',             slug: 'sperma'              },
    { name: 'Куни',               slug: 'kuni'                },
    { name: 'Блондинки',          slug: 'blondinki'           },
    { name: 'Женский оргазм',     slug: 'jenskiy-orgazm'      },
    { name: 'Развратное',         slug: 'razvrat'             },
    { name: 'Латинки',            slug: 'latinki'             },
    { name: 'Француженки',        slug: 'francujenki'         },
    { name: 'МЖМ',                slug: 'mjm'                 },
    { name: 'В очках',            slug: 'v-ochkah'            },
    { name: 'Реальное',           slug: 'realnyy-seks'        },
    { name: 'Бондаж',             slug: 'bondaj'              },
    { name: 'В ванной',           slug: 'v-vannoy'            },
    { name: 'Подборки',           slug: 'podborki'            },
  ];

  // ----------------------------------------------------------
  // Сетевой запрос через AdultJS
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
  // [1.3.0] КРИТИЧЕСКИЙ FIX: очистка URL от прокси-префикса
  //
  // trahkino.me оборачивает CDN-ссылки через свой endpoint:
  //   https://trahkino.me/function/0/https://trahkino.me/get_file/36/{hash}/{id}/{id}.mp4/
  //   ↓ после очистки:
  //   https://trahkino.me/get_file/36/{hash}/{id}/{id}.mp4/
  //
  // Без очистки плеер Lampa видит вложенный https:// в пути
  // и выдает "нет подходящего плеера".
  //
  // trahkino.me НЕ требует Referer (refererProtected: false),
  // поэтому прямые URL после срезки работают корректно.
  // ----------------------------------------------------------
  function cleanUrl(url) {
    if (!url) return '';
    var u = url.replace(/\\/g, '');

    // [1.3.0] Срезаем "function/N/" прокси-обёртку trahkino
    // Паттерн: https://trahkino.me/function/0/https://trahkino.me/get_file/...
    var funcMatch = u.match(/^https?:\/\/[^/]+\/function\/\d+\/(https?:\/\/.+)$/);
    if (funcMatch) {
      u = funcMatch[1];
      console.log('[TRH] cleanUrl: срезан function/N/ → ' + u.substring(0, 80));
    }

    if (u.indexOf('//') === 0)                      u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // Построение URL (из JSON urlScheme)
  //
  //   search:     /?q={query}&page=N
  //   category:   /?c={slug}&page=N
  //   pagination:  &page=N (параметр, НЕ путь)
  //   main:       /latest-updates/?page=N
  // ----------------------------------------------------------
  function buildUrl(cat, page, query) {
    page = parseInt(page, 10) || 1;

    if (query) {
      var url = HOST + '/?q=' + encodeURIComponent(query);
      if (page > 1) url += '&page=' + page;
      return url;
    }

    if (cat) {
      var url = HOST + '/?c=' + encodeURIComponent(cat);
      if (page > 1) url += '&page=' + page;
      return url;
    }

    if (page > 1) {
      return HOST + '/latest-updates/?page=' + page;
    }
    return HOST + '/latest-updates/';
  }

  // ----------------------------------------------------------
  // Парсинг карточек
  // JSON: cardSelector = ".item", thumb = data-original
  // Poster: HOST/contents/videos_screenshots/{folder}/{id}/preview.jpg
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];

    var doc   = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.item');

    console.log('[TRH] parseCards → .item найдено:', items.length);

    var results = [];

    for (var i = 0; i < items.length; i++) {
      var el = items[i];

      // Ссылка на видео
      var a = el.querySelector('a[href*="/video/"]');
      if (!a) continue;

      var href = a.getAttribute('href') || '';
      if (!href) continue;
      if (href.indexOf('http') !== 0) href = HOST + href;

      // Постер: data-original → src (из JSON: thumbnail.attribute = "data-original")
      var img = el.querySelector('img');
      var pic = '';
      if (img) {
        pic = img.getAttribute('data-original') ||
              img.getAttribute('data-src') ||
              img.getAttribute('src') || '';
      }
      // Нормализация URL
      if (pic && pic.indexOf('//') === 0) pic = 'https:' + pic;
      if (pic && pic.indexOf('http') !== 0 && pic.indexOf('/') === 0) pic = HOST + pic;

      // Название
      var titleEl = el.querySelector('.title') || el.querySelector('strong');
      var name = '';
      if (titleEl) {
        name = (titleEl.textContent || '').trim();
      }
      if (!name) {
        name = (a.getAttribute('title') || '').trim();
      }
      name = name.replace(/\s+/g, ' ').trim();
      if (!name || name.length < 3) continue;

      // Длительность
      var durEl = el.querySelector('.duration');
      var time  = durEl ? durEl.textContent.trim() : '';

      results.push({
        name:    name,
        video:   href,
        picture: pic,
        img:     pic,
        poster:  pic,
        preview: pic,
        time:    time,
        json:    true,
        source:  NAME,
      });
    }

    console.log('[TRH] parseCards → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // [1.3.0] Извлечение видео-URL из kt_player
  //
  // JSON VIDEO_RULES:
  //   type: "kt_player"
  //   regex: video_url\s*[:=]\s*['"]([^'"]+)['"]
  //
  // Поля в HTML:
  //   video_url      = '...' → 240p
  //   video_alt_url  = '...' → 360p (суффикс _360p)
  //   video_alt_url2 = '...' → 720p (если есть)
  //
  // URL вида (до очистки):
  //   https://trahkino.me/function/0/https://trahkino.me/get_file/36/{hash}/{folder}/{id}/{id}.mp4/
  //   ↓ cleanUrl() срезает /function/0/ →
  //   https://trahkino.me/get_file/36/{hash}/{folder}/{id}/{id}.mp4/
  // ----------------------------------------------------------
  function extractQualities(html) {
    var sources = {};

    // Стратегия 1: kt_player — video_url, video_alt_url, video_alt_url2
    var ktFields = [
      { regex: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,       label: '240p' },
      { regex: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/,   label: '360p' },
      { regex: /video_alt_url2\s*[:=]\s*['"]([^'"]+)['"]/,  label: '720p' },
    ];

    for (var i = 0; i < ktFields.length; i++) {
      var m = html.match(ktFields[i].regex);
      if (m && m[1]) {
        // [1.3.0] FIX: применяем cleanUrl() — срезаем /function/N/ прокси
        var url = cleanUrl(m[1].trim());

        if (url.indexOf('http') === 0) {
          // Уточняем quality по суффиксу в имени файла
          var label = ktFields[i].label;
          if (url.indexOf('_1080p') !== -1)      label = '1080p';
          else if (url.indexOf('_720p') !== -1)   label = '720p';
          else if (url.indexOf('_480p') !== -1)   label = '480p';
          else if (url.indexOf('_360p') !== -1)   label = '360p';
          // без суффикса = базовое качество (240p)

          sources[label] = url;
          console.log('[TRH] kt_player →', label, ':', url.substring(0, 80));
        }
      }
    }

    // Стратегия 2 (fallback): <source> теги
    if (Object.keys(sources).length === 0) {
      var srcRegex = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
      var srcMatch;
      while ((srcMatch = srcRegex.exec(html)) !== null) {
        var srcUrl = cleanUrl(srcMatch[1]);
        if (srcUrl.indexOf('http') !== 0 && srcUrl.indexOf('/') === 0) {
          srcUrl = HOST + srcUrl;
        }
        var labelMatch = srcMatch[0].match(/label=["']([^"']+)["']/);
        var sizeMatch  = srcMatch[0].match(/size=["']([^"']+)["']/);
        var lb = (labelMatch ? labelMatch[1] : '') || (sizeMatch ? sizeMatch[1] + 'p' : 'Default');
        sources[lb] = srcUrl;
      }
    }

    // Стратегия 3 (last resort): file:'...' (PlayerJS формат)
    if (Object.keys(sources).length === 0) {
      var fileMatch = html.match(/file\s*[:=]\s*["']([^"']+)["']/);
      if (fileMatch && fileMatch[1]) {
        var fileContent = fileMatch[1];
        if (fileContent.indexOf('[') !== -1) {
          var parts = fileContent.split(',');
          for (var pi = 0; pi < parts.length; pi++) {
            var qm = parts[pi].match(/\[([^\]]+)\]/);
            var link = parts[pi].replace(/\[[^\]]+\]/, '').trim();
            if (qm && link && link.indexOf('http') === 0) {
              sources[qm[1]] = cleanUrl(link);
            }
          }
        } else if (fileContent.indexOf('http') === 0) {
          sources['Default'] = cleanUrl(fileContent);
        }
      }
    }

    return sources;
  }

  // ----------------------------------------------------------
  // Меню (категории + поиск)
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      { title: 'Поиск', search_on: true, playlist_url: NAME },
      {
        title:        'Категории',
        playlist_url: 'submenu',
        submenu:      CATS.map(function (c) {
          return { title: c.name, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // Роутинг
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var cat   = null;
    var query = null;

    // Поиск: ?search=...
    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      query = decodeURIComponent(searchMatch[1]);
    }
    // Категория: trh/cat/{slug}
    else if (url.indexOf(NAME + '/cat/') !== -1) {
      cat = url.replace(/.*trh\/cat\//, '').split('?')[0].split('/')[0];
    }

    var fetchUrl = buildUrl(cat, page, query);
    console.log('[TRH] routeView →', fetchUrl);

    httpGet(fetchUrl, function (html) {
      console.log('[TRH] html длина:', (html || '').length);
      var cards = parseCards(html);
      success({
        results:     cards,
        collection:  true,
        total_pages: cards.length >= 20 ? page + 1 : page,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ----------------------------------------------------------
  // Публичный интерфейс
  // ----------------------------------------------------------
  var trhParser = {

    main: function (params, success, error) {
      routeView(NAME, 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query    = (params.query || '').trim();
      var page     = params.page || 1;
      var fetchUrl = buildUrl(null, page, query);

      httpGet(fetchUrl, function (html) {
        var cards = parseCards(html);
        success({
          title:       'TRH: ' + query,
          results:     cards,
          collection:  true,
          total_pages: cards.length >= 20 ? page + 1 : 1,
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log('[TRH] qualities() → страница:', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log('[TRH] qualities() → html длина:', (html || '').length);

        if (!html || html.length < 500) {
          error('Страница видео недоступна');
          return;
        }

        var found = extractQualities(html);
        var keys  = Object.keys(found);

        console.log('[TRH] qualities() → найдено:', keys.length, JSON.stringify(found));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn('[TRH] Диагностика:');
          console.warn('[TRH]   video_url:',     (html.match(/video_url/gi)     || []).length);
          console.warn('[TRH]   video_alt_url:', (html.match(/video_alt_url/gi) || []).length);
          console.warn('[TRH]   function/0/:',   (html.match(/function\/0\//gi) || []).length);
          console.warn('[TRH]   get_file:',      (html.match(/get_file/gi)      || []).length);
          console.warn('[TRH]   kt_player:',     (html.match(/kt_player/gi)     || []).length);
          error('TrahKino: видео не найдено');
        }
      }, error);
    },
  };

  // ----------------------------------------------------------
  // Регистрация
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, trhParser);
      console.log('[TRH] v' + VERSION + ' зарегистрирован');
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
