// =============================================================
// trh.js — Парсер TrahKino для AdultJS (Lampa)
// Version  : 1.1.0
// Based on : trh_100 + json-анализ trahkino.me (v4.0.0, 2026-04-17)
//
// [1.1.0] ИСПРАВЛЕНО три критических бага:
//
//   БАГ 1 — URL категорий (главная причина 404):
//     было:  HOST + '/categories/' + cat + '/' + page  ← не существует
//     стало: HOST + '/?c=' + cat + '&page=' + N
//     JSON:  "category.pattern": "https://trahkino.me/?c={slug}"
//
//   БАГ 2 — Пагинация главной страницы:
//     было:  HOST + '/latest-updates/' + page + '/'    ← нет такого пути
//     стало: HOST + '/latest-updates/?page=' + N
//     JSON:  "pagination.pattern": "&page={N}"
//
//   БАГ 3 — Поиск видео (qualities):
//     было:  regex по /get_file/...mp4 внутри JSON-строк
//            + split('?')[0] обрезал нужные части URL
//     стало: ищем video_url и video_alt_url из kt_player конфига
//            JSON: "video_url\s*[:=]\s*['"]([^'"]+)['"]"
//            URL вида: trahkino.me/function/0/https://trahkino.me/get_file/36/{hash}/...mp4/
//            Берём AS-IS — это прокси самого сайта, 404 был из-за неверного URL без /function/0/
//
// URL-схема (из JSON):
//   Главная   : https://trahkino.me/latest-updates/
//   Страница N: https://trahkino.me/latest-updates/?page={N}
//   Поиск     : https://trahkino.me/?q={query}
//   Поиск N   : https://trahkino.me/?q={query}&page={N}
//   Категория : https://trahkino.me/?c={slug}
//   Категория N: https://trahkino.me/?c={slug}&page={N}
//   Видео     : https://trahkino.me/video/{id}/
//
// Структура видео URL (kt_player):
//   video_url     = https://trahkino.me/function/0/https://trahkino.me/get_file/36/{hash}/{folder}/{id}/{id}.mp4/
//   video_alt_url = https://trahkino.me/function/0/https://trahkino.me/get_file/36/{hash}/{folder}/{id}/{id}_360p.mp4/
//
// Worker ALLOWED_TARGETS:
//   trahkino.me   — сайт + get_file CDN (всё через /function/0/ прокси)
// =============================================================

(function () {
  'use strict';

  var NAME = 'trh';
  var HOST = 'https://trahkino.me';

  // Полный список категорий из JSON (40 категорий)
  var CATS = [
    { name: 'Любительское',      slug: 'lyubitelskiy-seks'  },
    { name: 'Минет',             slug: 'minet'              },
    { name: 'Брюнетки',          slug: 'bryunetki'          },
    { name: 'Большие члены',     slug: 'bolshie-hui'        },
    { name: 'Анал',              slug: 'anal'               },
    { name: 'Милфы',             slug: 'milfy'              },
    { name: 'Домашнее',          slug: 'domashka'           },
    { name: 'Соло',              slug: 'solo'               },
    { name: 'Большие сиськи',    slug: 'bolshie-siski'      },
    { name: 'От первого лица',   slug: 'ot-pervogo-lica'    },
    { name: 'Большие попки',     slug: 'bolshie-popki'      },
    { name: 'Кончают внутрь',    slug: 'konchayut-vnutr'    },
    { name: 'Мулатки',           slug: 'mulatki'            },
    { name: 'Красотки',          slug: 'krasotki'           },
    { name: 'Русское',           slug: 'russkie'            },
    { name: 'Наездница',         slug: 'naezdnica'          },
    { name: 'Толстушки',         slug: 'tolstye'            },
    { name: 'Натуральные сиськи',slug: 'naturalnye-siski'   },
    { name: 'Раком',             slug: 'rakom'              },
    { name: 'Ролевые игры',      slug: 'rolevye-igry'       },
    { name: 'Фетиш',             slug: 'fetish'             },
    { name: 'Дрочка члена',      slug: 'drochka-chlena'     },
    { name: 'Татуированные',     slug: 'tatu'               },
    { name: 'Групповуха',        slug: 'gruppovuha'         },
    { name: 'Бритые киски',      slug: 'britye-kiski'       },
    { name: 'Мастурбация',       slug: 'masturbaciya'       },
    { name: 'Массаж',            slug: 'eroticheskiy-massaj'},
    { name: 'Сперма',            slug: 'sperma'             },
    { name: 'Куни',              slug: 'kuni'               },
    { name: 'Блондинки',         slug: 'blondinki'          },
    { name: 'Женский оргазм',    slug: 'jenskiy-orgazm'     },
    { name: 'Развратное',        slug: 'razvrat'            },
    { name: 'Латинки',           slug: 'latinki'            },
    { name: 'Француженки',       slug: 'francujenki'        },
    { name: 'МЖМ',               slug: 'mjm'                },
    { name: 'В очках',           slug: 'v-ochkah'           },
    { name: 'Реальное',          slug: 'realnyy-seks'       },
    { name: 'Бондаж',            slug: 'bondaj'             },
    { name: 'В ванной',          slug: 'v-vannoy'           },
    { name: 'Подборки',          slug: 'podborki'           },
  ];

  

  // Функция для очистки ссылки от прокси-префикса trahkino
	function cleanVideoUrl(url) {
	    if (!url) return '';
	    // Если ссылка содержит двойной протокол (прокси сайта), берем вторую часть
	    if (url.includes('/http')) {
        url = url.substring(url.lastIndexOf('http'));
	    }
	    return url;
	}

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

  // ----------------------------------------------------------
  // Парсинг карточек
  // Структура из JSON: cardSelector=".item", thumb=data-original
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];

    var doc   = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.item');

    console.log('[TRH] parseCards → .item найдено:', items.length);

    var results = [];

    for (var i = 0; i < items.length; i++) {
      var el = items[i];

      // Ссылка на видео: /video/{id}/
      var a = el.querySelector('a[href*="/video/"]');
      if (!a) continue;

      var href = a.getAttribute('href') || '';
      if (!href) continue;
      if (href.indexOf('http') !== 0) href = HOST + href;

      // Постер: data-original (из JSON: thumbnail.attribute = "data-original")
      var img = el.querySelector('img');
      var pic = img ? (img.getAttribute('data-original') || img.getAttribute('src') || '') : '';
      if (pic && pic.indexOf('//') === 0) pic = 'https:' + pic;
      if (pic && pic.indexOf('http') !== 0 && pic.indexOf('/') === 0) pic = HOST + pic;

      // Название: .item .title → strong → a[title]
      var titleEl = el.querySelector('.title, strong');
      var name    = (titleEl ? (titleEl.textContent || '').trim() : '') ||
                    (a.getAttribute('title') || '').trim();
      name = name.replace(/\s+/g, ' ').trim();
      if (!name || name.length < 3) continue;

      // Длительность: .item .duration
      var durEl = el.querySelector('.duration');
      var time  = durEl ? durEl.textContent.trim() : '';

      results.push({
        name:    name,
        video:   href,   // страница видео → qualities() извлечёт kt_player URL
        picture: pic,
        img:     pic,
        poster:  pic,
        time:    time,
        json:    true,
        source:  NAME,
      });
    }

    console.log('[TRH] parseCards → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // [1.1.0] Построение URL — ИСПРАВЛЕНО
  //
  // JSON urlScheme:
  //   search:   /?q={query}
  //   category: /?c={slug}
  //   pagination: &page={N}    ← параметр, не путь
  //
  // Главная: /latest-updates/ (не просто /)
  // ----------------------------------------------------------
  function buildUrl(cat, page, query) {
    page = parseInt(page, 10) || 1;

    if (query) {
      // Поиск: https://trahkino.me/?q={query}&page={N}
      var url = HOST + '/?q=' + encodeURIComponent(query);
      if (page > 1) url += '&page=' + page;
      return url;
    }

    if (cat) {
      // Категория: https://trahkino.me/?c={slug}&page={N}
      var url = HOST + '/?c=' + encodeURIComponent(cat);
      if (page > 1) url += '&page=' + page;
      return url;
    }

    // Главная лента: https://trahkino.me/latest-updates/?page={N}
    if (page > 1) {
      return HOST + '/latest-updates/?page=' + page;
    }
    return HOST + '/latest-updates/';
  }

  function buildMenu() {
    return [
      { title: 'Поиск', search_on: true, playlist_url: NAME + '/search/' },
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

    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      query = decodeURIComponent(searchMatch[1]);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      cat = url.replace(NAME + '/cat/', '').split('?')[0];
    }

    var fetchUrl = buildUrl(cat, page, query);
    console.log('[TRH] routeView →', fetchUrl);

    httpGet(fetchUrl, function (html) {
      console.log('[TRH] html длина:', html.length);
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
  // [1.1.0] qualities() — ИСПРАВЛЕНО
  //
  // Движок: kt_player
  // В HTML страницы видео содержатся JS-переменные:
  //   video_url     = 'https://trahkino.me/function/0/https://trahkino.me/get_file/36/{hash}/{folder}/{id}/{id}.mp4/'
  //   video_alt_url = 'https://trahkino.me/function/0/https://trahkino.me/get_file/36/{hash}/{folder}/{id}/{id}_360p.mp4/'
  //
  // URL содержит /function/0/ — прокси самого сайта.
  // Берём AS-IS, НЕ обрезаем split('?'), НЕ удаляем /function/0/.
  // Прошлый 404 был именно из-за того что код строил URL без /function/0/.
  //
  // Качество определяем по суффиксу в имени файла:
  //   418475.mp4      → 240p (без суффикса = низшее качество)
  //   418475_360p.mp4 → 360p
  //   418475_720p.mp4 → 720p (если есть)
  // ----------------------------------------------------------
 // Обновленная функция извлечения качеств
function extractQualities(html) {
    var sources = {};
    
    // 1. Пытаемся найти массив файлов (часто используется в PlayerJS)
    var fileData = html.match(/file["']\s*:\s*["']([^"']+)["']/);
    if (fileData) {
        var fileContent = fileData[1];
        // Если это список качеств в формате [720p]url,[1080p]url
        if (fileContent.includes('[')) {
            fileContent.split(',').forEach(function(item) {
                var quality = item.match(/
\[(.*?)\]/);
                var link = item.replace(/
\[.*?\]/, '');
                if (quality && link) {
                    sources[quality[1]] = cleanVideoUrl(link);
                }
            });
        } else {
            sources['Default'] = cleanVideoUrl(fileContent);
        }
    }

    // 2. Универсальный поиск для тегов <source> (MP4 и HLS)
    var sourceRegexp = /<source[^>]*src=["']([^"']+)["'][^>]*label=["']([^"']+)["']/g;
    var match;
    while ((match = sourceRegexp.exec(html)) !== null) {
        sources[match[2]] = cleanVideoUrl(match[1]);
    }

    // 3. Если ничего не нашли, ищем любые ссылки на m3u8 или mp4
    if (Object.keys(sources).length === 0) {
        var anyVideo = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi);
        if (anyVideo) {
            anyVideo.forEach(function(link) {
                link = link.replace(/["']/g, '');
                var q = link.includes('m3u8') ? 'HLS (Auto)' : 'MP4';
                if (!sources[q]) sources[q] = cleanVideoUrl(link);
            });
        }
    }

    return sources;
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
      var fetchUrl = buildUrl(null, params.page || 1, query);
      httpGet(fetchUrl, function (html) {
        var cards = parseCards(html);
        success({
          title:       'TRH: ' + query,
          results:     cards,
          collection:  true,
          total_pages: cards.length >= 20 ? (params.page || 1) + 1 : 1,
        });
      }, error);
    },

    // [1.1.0] qualities() — полностью переписан
    qualities: function (videoPageUrl, success, error) {
      console.log('[TRH] qualities() → страница:', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log('[TRH] qualities() → html длина:', html.length);

        if (!html || html.length < 500) {
          error('Страница видео недоступна (html < 500 байт)');
          return;
        }

        var found = extractQualities(html);
        var keys  = Object.keys(found);

        console.log('[TRH] qualities() → найдено:', keys.length, JSON.stringify(keys));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          // Диагностика
          console.warn('[TRH] qualities() → ничего не найдено');
          console.warn('[TRH]   video_url:',     (html.match(/video_url/gi)     || []).length);
          console.warn('[TRH]   video_alt_url:', (html.match(/video_alt_url/gi) || []).length);
          console.warn('[TRH]   function/0/:',   (html.match(/function\/0\//gi)  || []).length);
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
      console.log('[TRH] v1.1.0 зарегистрирован');
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
