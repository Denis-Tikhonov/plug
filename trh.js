// =============================================================
// trh.js — Парсер TrahKino (trahkino.me) для AdultJS
// =============================================================
// Версия  : 1.4.0
// Адаптация: UNIVERSAL_TEMPLATE + W170 + AdultJS 1.5.9
// Изменения:
//   [1.4.0] Полная адаптация под UNIVERSAL_TEMPLATE
//   [1.4.0] Улучшен cleanUrl — надёжно вытаскивает вложенный URL из function/0/
//   [1.4.0] VIDEO_RULES + extractQualities с приоритетом kt_player
//   [1.4.0] CARD_SELECTORS оптимизированы под .item
//   [1.4.0] buildUrl использует /latest-updates/ как главную (как в 1.3.0)
//   [1.4.0] Добавлены диагностические логи для отладки через Worker

(function () {
  'use strict';

  var VERSION = '1.4.0';
  var NAME    = 'trh';
  var HOST    = 'https://trahkino.me';
  var TAG     = '[TRH]';

  var CATEGORIES = [
    { title: 'Любительское',       slug: 'lyubitelskiy-seks'   },
    { title: 'Минет',              slug: 'minet'               },
    { title: 'Брюнетки',           slug: 'bryunetki'           },
    { title: 'Большие члены',      slug: 'bolshie-hui'         },
    { title: 'Анал',               slug: 'anal'                },
    { title: 'Милфы',              slug: 'milfy'               },
    { title: 'Домашнее',           slug: 'domashka'            },
    { title: 'Соло',               slug: 'solo'                },
    { title: 'Большие сиськи',     slug: 'bolshie-siski'       },
    { title: 'От первого лица',    slug: 'ot-pervogo-lica'     },
    { title: 'Большие попки',      slug: 'bolshie-popki'       },
    { title: 'Кончают внутрь',     slug: 'konchayut-vnutr'     },
    { title: 'Мулатки',            slug: 'mulatki'             },
    { title: 'Красотки',           slug: 'krasotki'            },
    { title: 'Русское',            slug: 'russkie'             },
    { title: 'Наездница',          slug: 'naezdnica'           },
    { title: 'Толстушки',          slug: 'tolstye'             },
    { title: 'Натуральные сиськи', slug: 'naturalnye-siski'    },
    { title: 'Раком',              slug: 'rakom'               },
    { title: 'Ролевые игры',       slug: 'rolevye-igry'        },
    { title: 'Фетиш',              slug: 'fetish'              },
    { title: 'Дрочка члена',       slug: 'drochka-chlena'      },
    { title: 'Татуированные',      slug: 'tatu'                },
    { title: 'Групповуха',         slug: 'gruppovuha'          },
    { title: 'Бритые киски',       slug: 'britye-kiski'        },
    { title: 'Мастурбация',        slug: 'masturbaciya'        },
    { title: 'Массаж',             slug: 'eroticheskiy-massaj' },
    { title: 'Сперма',             slug: 'sperma'              },
    { title: 'Куни',               slug: 'kuni'                },
    { title: 'Блондинки',          slug: 'blondinki'           },
    { title: 'Женский оргазм',     slug: 'jenskiy-orgazm'      },
    { title: 'Развратное',         slug: 'razvrat'             },
    { title: 'Латинки',            slug: 'latinki'             },
    { title: 'Француженки',        slug: 'francujenki'         },
    { title: 'МЖМ',                slug: 'mjm'                 },
    { title: 'В очках',            slug: 'v-ochkah'            },
    { title: 'Реальное',           slug: 'realnyy-seks'        },
    { title: 'Бондаж',             slug: 'bondaj'              },
    { title: 'В ванной',           slug: 'v-vannoy'            },
    { title: 'Подборки',           slug: 'podborki'            },
  ];

  var VIDEO_RULES = [
    { label: '720p',  re: /video_alt_url2\s*[:=]\s*['"]([^'"]+)['"]/ },
    { label: '360p',  re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/  },
    { label: '240p',  re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/      },
    { label: 'HLS',   re: /video_url_hls\s*[:=]\s*['"]([^'"]+)['"]/  },
  ];

  var CARD_SELECTORS = [
    '.item',
    '.video-item',
    'div.thumb',
    '.thumb'
  ];

  // ----------------------------------------------------------
  // ТРАНСПОРТ (AdultPlugin + W170)
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      console.log(TAG, 'networkRequest →', url.substring(0, 90));
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(r => r.text()).then(success).catch(error);
    }
  }

  // ----------------------------------------------------------
  // УЛУЧШЕННЫЙ cleanUrl (учитывает function/0/)
  // ----------------------------------------------------------
  function cleanUrl(raw) {
    if (!raw) return '';
    let u = String(raw).replace(/\\\//g, '/').replace(/\\/g, '').trim();

    // Форма A и B: function/0/https://...
    const funcMatch = u.match(/function\/\d+\/(https?:\/\/.+)$/i);
    if (funcMatch) {
      u = funcMatch[1];
      console.log(TAG, 'cleanUrl → extracted from function/0/');
    }

    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;

    return u;
  }

  function cleanMp4Url(url) {
    return url
      .replace(/[?&]rnd=\d+/g, '')
      .replace(/[?&]br=\d+/g, '')
      .replace(/[?&]_=\d+/g, '')
      .replace(/[?&]+$/g, '')
      .replace(/\/+$/, '') + '/';
  }

  // ----------------------------------------------------------
  // extractQualities — по шаблону
  // ----------------------------------------------------------
  function extractQualities(html) {
    var q = {};
    var add = function(label, url) {
      var u = cleanUrl(url);
      if (!u || u.indexOf('{') !== -1 || u.indexOf('spacer') !== -1) return;
      if (u.indexOf('.mp4') !== -1) u = cleanMp4Url(u);
      if (!q[label]) q[label] = u;
    };

    // 1. VIDEO_RULES (kt_player)
    VIDEO_RULES.forEach(function(rule) {
      var m = html.match(rule.re);
      if (m && m[1]) add(rule.label, m[1]);
    });

    // 2. Прямой поиск get_file
    var getFileRe = /https?:\/\/[^"'\s]+\/get_file\/[^"'\s]+\.mp4[^"'\s]*/gi;
    var match;
    while ((match = getFileRe.exec(html)) !== null) {
      var url = match[0];
      var qm = url.match(/_(\d+)p?\.mp4/i);
      add(qm ? qm[1] + 'p' : 'HD', url);
    }

    // 3. Fallback — любые mp4
    if (Object.keys(q).length === 0) {
      var allMp4 = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi);
      if (allMp4) {
        allMp4.forEach(function(u, i) {
          if (u.indexOf('{') !== -1) return;
          var qm = u.match(/_(\d+)p?\.mp4/i);
          add(qm ? qm[1] + 'p' : ('HD' + i), u);
        });
      }
    }

    return q;
  }

  // ----------------------------------------------------------
  // Парсинг карточек
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    var results = [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = null;

    for (var s = 0; s < CARD_SELECTORS.length; s++) {
      items = doc.querySelectorAll(CARD_SELECTORS[s]);
      if (items.length > 0) break;
    }

    if (!items || items.length === 0) {
      items = doc.querySelectorAll('a[href*="/video/"]');
    }

    for (var i = 0; i < items.length; i++) {
      var el = items[i].closest('.item') || items[i];
      var link = el.querySelector('a[href*="/video/"]');
      if (!link) continue;

      var href = cleanUrl(link.getAttribute('href'));
      if (!href) continue;

      var img = el.querySelector('img');
      var pic = img ? cleanUrl(img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('src')) : '';

      var titleEl = el.querySelector('.title, strong, .th-title');
      var name = titleEl ? titleEl.textContent.trim() : (link.getAttribute('title') || '');
      if (!name) name = href.split('/').filter(Boolean).pop().replace(/-/g, ' ');

      var dur = el.querySelector('.duration, .time');
      var time = dur ? dur.textContent.trim() : '';

      results.push({
        name: name,
        video: href,
        picture: pic,
        img: pic,
        poster: pic,
        background_image: pic,
        time: time,
        quality: 'HD',
        json: true,
        source: NAME,
      });
    }

    console.log(TAG, 'найдено карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // URL builder
  // ----------------------------------------------------------
  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    if (type === 'search') {
      var u = HOST + '/?q=' + encodeURIComponent(value);
      if (page > 1) u += '&page=' + page;
      return u;
    }
    if (type === 'cat') {
      var u = HOST + '/?c=' + encodeURIComponent(value);
      if (page > 1) u += '&page=' + page;
      return u;
    }
    // Главная — latest-updates (рекомендуется)
    return page > 1 ? HOST + '/latest-updates/?page=' + page : HOST + '/latest-updates/';
  }

  // ----------------------------------------------------------
  // Меню
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новинки', playlist_url: NAME + '/new' },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(function(c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        })
      }
    ];
  }

  // ----------------------------------------------------------
  // Роутинг
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var fetchUrl = buildUrl('main', null, page);
    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      fetchUrl = buildUrl('search', decodeURIComponent(searchMatch[1]), page);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      var cat = url.replace(NAME + '/cat/', '').split('?')[0];
      fetchUrl = buildUrl('cat', cat, page);
    } else if (url.indexOf(NAME + '/search/') === 0) {
      var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      if (q) fetchUrl = buildUrl('search', q, page);
    } else if (url.indexOf(NAME + '/new') === 0) {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log(TAG, 'запрос →', fetchUrl);
    httpGet(fetchUrl, function(html) {
      var results = parsePlaylist(html);
      if (results.length === 0) {
        error('Контент не найден');
        return;
      }
      success({
        results: results,
        collection: true,
        total_pages: results.length >= 20 ? page + 1 : page,
        menu: buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // Парсер API
  // ----------------------------------------------------------
  var TrhParser = {
    main: function(params, success, error) {
      routeView(NAME, params.page || 1, success, error);
    },

    view: function(params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function(params, success, error) {
      var query = (params.query || '').trim();
      if (!query) return success({ results: [] });
      httpGet(buildUrl('search', query, params.page || 1), function(html) {
        success({
          title: 'TrahKino: ' + query,
          results: parsePlaylist(html),
          collection: true,
          total_pages: 2
        });
      }, error);
    },

    qualities: function(videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);
      httpGet(videoPageUrl, function(html) {
        var qualities = extractQualities(html);
        var keys = Object.keys(qualities);
        console.log(TAG, 'найдено качеств:', keys.length, keys);

        if (keys.length > 0) {
          success({ qualities: qualities });
        } else {
          console.warn(TAG, 'video_url:', (html.match(/video_url/gi) || []).length);
          console.warn(TAG, 'get_file:', (html.match(/get_file/gi) || []).length);
          console.warn(TAG, 'function/0:', (html.match(/function\/0/gi) || []).length);
          error('Видео не найдено');
        }
      }, error);
    }
  };

  // ----------------------------------------------------------
  // Регистрация
  // ----------------------------------------------------------
  function register() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, TrhParser);
      console.log(TAG, 'v' + VERSION + ' успешно зарегистрирован');
      return true;
    }
    return false;
  }

  if (!register()) {
    var interval = setInterval(function() {
      if (register()) clearInterval(interval);
    }, 300);
    setTimeout(function() { clearInterval(interval); }, 8000);
  }
})();
