// =============================================================
// trh.js — Парсер TrahKino для AdultJS (Lampa)
// =============================================================
// Версия  : 1.3.0
// Изменения:
//   [1.3.0] КРИТИЧЕСКИЙ FIX cleanUrl() — та же проблема что hdtub:
//           Лог: Player url: function/0/https://trahkino.me/get_file/...
//           → video_url в JS содержит ОТНОСИТЕЛЬНЫЙ путь "function/0/https://..."
//             cleanUrl v1.2.0 не срезал его (ждал полный абсолютный URL).
//
//           Исправлено: cleanUrl проверяет ДВА случая:
//           A) https://host/function/N/https://...  → вытащить вложенный https://
//           B) function/N/https://...               → вытащить напрямую
//
//           Также:
//           - [FIX] JSON v4.2.0: cards "Not found" на главной → используем
//                   /latest-updates/ как стартовую страницу (подтверждено)
//           - [FIX] qualities: label уточняется по суффиксу имени файла
//                   (JSON показал: 240p без суффикса, 360p → _360p.mp4)
//           - [ADD] W137 домен trahkino.me добавлен в WHITELIST (напоминание)
//
//   [1.2.0] Полная переработка на основе JSON trahkino.me
//   [1.0.0] Базовый парсер
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.3.0';
  var NAME    = 'trh';
  var HOST    = 'https://trahkino.me';

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
    { name: 'Фетиш',              slug: 'fetish'              },
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
  // ОЧИСТКА URL
  //
  // [1.3.0] FIX: function/N/ встречается в двух формах:
  //
  //   Форма A (абсолютная):
  //     "https://trahkino.me/function/0/https://trahkino.me/get_file/..."
  //
  //   Форма B (относительная — прямо из video_url в HTML):
  //     "function/0/https://trahkino.me/get_file/..."
  //
  //   Оба варианта → вытаскиваем вложенный https://
  // ----------------------------------------------------------
  function cleanUrl(raw) {
    if (!raw) return '';
    var u = raw.replace(/\\/g, '').trim();

    // Форма A: https://host/function/N/https://...
    var absMatch = u.match(/^https?:\/\/[^/]+\/function\/\d+\/(https?:\/\/.+)$/);
    if (absMatch) {
      u = absMatch[1];
      console.log('[TRH] cleanUrl A (abs):', u.substring(0, 100));
      return u;
    }

    // Форма B: function/N/https://... (относительный)
    var relMatch = u.match(/^\/??function\/\d+\/(https?:\/\/.+)$/);
    if (relMatch) {
      u = relMatch[1];
      console.log('[TRH] cleanUrl B (rel):', u.substring(0, 100));
      return u;
    }

    // Стандартная нормализация
    if (u.indexOf('//') === 0)                      u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL
  // JSON: search=/?q=, category=/?c=, pagination=&page=N
  // главная: /latest-updates/
  // ----------------------------------------------------------
  function buildUrl(cat, page, query) {
    page = parseInt(page, 10) || 1;

    if (query) {
      var u = HOST + '/?q=' + encodeURIComponent(query);
      if (page > 1) u += '&page=' + page;
      return u;
    }

    if (cat) {
      var u = HOST + '/?c=' + encodeURIComponent(cat);
      if (page > 1) u += '&page=' + page;
      return u;
    }

    // Главная: /latest-updates/
    if (page > 1) return HOST + '/latest-updates/?page=' + page;
    return HOST + '/latest-updates/';
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  // JSON: cardSelector=".item", thumbnail=data-original
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];
    var doc   = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.item');
    console.log('[TRH] parseCards → .item найдено:', items.length);
    var results = [];

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var a  = el.querySelector('a[href*="/video/"]');
      if (!a) continue;

      var href = a.getAttribute('href') || '';
      if (!href) continue;
      if (href.indexOf('http') !== 0) href = HOST + href;

      var img = el.querySelector('img');
      var pic = '';
      if (img) {
        pic = img.getAttribute('data-original') ||
              img.getAttribute('data-src')      ||
              img.getAttribute('src') || '';
        if (pic && pic.indexOf('//') === 0)  pic = 'https:' + pic;
        if (pic && pic.indexOf('/') === 0)   pic = HOST + pic;
      }

      var titleEl = el.querySelector('.title') || el.querySelector('strong');
      var name    = (titleEl ? titleEl.textContent : (a.getAttribute('title') || ''))
                    .replace(/\s+/g, ' ').trim();
      if (!name || name.length < 3) continue;

      var durEl = el.querySelector('.duration');
      var time  = durEl ? durEl.textContent.trim() : '';

      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        preview: pic, time: time, quality: 'HD',
        json: true, source: NAME,
      });
    }

    console.log('[TRH] parseCards → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ КАЧЕСТВ
  //
  // JSON jsConfigs: kt_player
  //   video_url     → 240p (имя файла без суффикса: 418492.mp4)
  //   video_alt_url → 360p (суффикс _360p: 418492_360p.mp4)
  //
  // URL вида: function/0/https://trahkino.me/get_file/...
  // [1.3.0] cleanUrl() теперь правильно срезает function/0/
  // ----------------------------------------------------------
  function extractQualities(html) {
    var q = {};

    var fields = [
      { re: /video_alt_url2\s*[:=]\s*['"]([^'"]+)['"]/,  defaultLabel: '720p' },
      { re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/,   defaultLabel: '360p' },
      { re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,       defaultLabel: '240p' },
    ];

    fields.forEach(function (f) {
      var m = html.match(f.re);
      if (!m || !m[1]) return;

      var url   = cleanUrl(m[1]);
      if (!url || url.indexOf('http') !== 0) return;

      // Уточняем label по суффиксу имени файла
      var label = f.defaultLabel;
      if      (url.indexOf('_1080p') !== -1) label = '1080p';
      else if (url.indexOf('_720p')  !== -1) label = '720p';
      else if (url.indexOf('_480p')  !== -1) label = '480p';
      else if (url.indexOf('_360p')  !== -1) label = '360p';
      else if (url.indexOf('_240p')  !== -1) label = '240p';

      q[label] = url;
      console.log('[TRH] ' + label + ':', url.substring(0, 100));
    });

    // Fallback: <source> теги
    if (!Object.keys(q).length) {
      var re = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
      var m2;
      while ((m2 = re.exec(html)) !== null) {
        var srcUrl = cleanUrl(m2[1]);
        var lb = m2[0].match(/label=["']([^"']+)["']/);
        var sz = m2[0].match(/size=["']([^"']+)["']/);
        q[(lb ? lb[1] : '') || (sz ? sz[1] + 'p' : 'HD')] = srcUrl;
      }
    }

    // Fallback: PlayerJS file:'[label]url,[label]url'
    if (!Object.keys(q).length) {
      var fm = html.match(/file\s*[:=]\s*["']([^"']+)["']/);
      if (fm && fm[1]) {
        var content = fm[1];
        if (content.indexOf('[') !== -1) {
          content.split(',').forEach(function (part) {
            var lm   = part.match(/\[([^\]]+)\]/);
            var link = part.replace(/\[[^\]]+\]/, '').trim();
            if (lm && link && link.indexOf('http') === 0) q[lm[1]] = cleanUrl(link);
          });
        } else if (content.indexOf('http') === 0) {
          q['HD'] = cleanUrl(content);
        }
      }
    }

    return q;
  }

  // ----------------------------------------------------------
  // МЕНЮ
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      {
        title: '📂 Категории', playlist_url: 'submenu',
        submenu: CATS.map(function (c) {
          return { title: c.name, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТИНГ
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var cat   = null;
    var query = null;

    var sm = url.match(/[?&]search=([^&]*)/);
    if (sm) {
      query = decodeURIComponent(sm[1]);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      cat = url.replace(NAME + '/cat/', '').split('?')[0];
    } else if (url.indexOf(NAME + '/search/') === 0) {
      query = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
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
  // ПАРСЕР API
  // ----------------------------------------------------------
  var TrhParser = {

    main: function (p, s, e) {
      routeView(NAME, 1, s, e);
    },

    view: function (p, s, e) {
      routeView(p.url || NAME, p.page || 1, s, e);
    },

    search: function (p, s, e) {
      var query = (p.query || '').trim();
      httpGet(buildUrl(null, p.page || 1, query), function (html) {
        var cards = parseCards(html);
        s({ title: 'TRH: ' + query, results: cards, collection: true,
            total_pages: cards.length >= 20 ? (p.page || 1) + 1 : 1 });
      }, e);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log('[TRH] qualities() →', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log('[TRH] html длина:', (html || '').length);
        if (!html || html.length < 500) { error('html < 500'); return; }

        var found = extractQualities(html);
        var keys  = Object.keys(found);
        console.log('[TRH] qualities() найдено:', keys.length, JSON.stringify(keys));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn('[TRH] video_url:',    (html.match(/video_url/gi)    || []).length);
          console.warn('[TRH] function/0:',   (html.match(/function\/0/gi)  || []).length);
          console.warn('[TRH] get_file:',     (html.match(/get_file/gi)     || []).length);
          console.warn('[TRH] kt_player:',    (html.match(/kt_player/gi)    || []).length);
          error('TrahKino: видео не найдено');
        }
      }, error);
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, TrhParser);
      console.log('[TRH] v' + VERSION + ' зарегистрирован');
      return true;
    }
    return false;
  }
  if (!tryRegister()) {
    var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }

})();
