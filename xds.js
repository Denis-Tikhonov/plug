// =============================================================
// xds.js — Pexels Test Parser для AdultJS
// Version  : 1.1.0
// Changed  :
//   [1.0.0] Базовый парсер Pexels: popular, search, категории
//   [1.1.0] Поиск через фильтр (кнопка ≡):
//           buildMenu() → search_on:true → AdultJS показывает «Найти»
//           routeView() → разбирает ?search=запрос из URL
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // КОНФИГ
  // ----------------------------------------------------------
  var NAME     = 'xds';
  var API_KEY  = 'daFtVOPyOPiuaIuuv3JctGOHmKVlCH6tK4PXLXO1kyTxKRwrEihaXyHT';
  var API_BASE = 'https://api.pexels.com/videos';
  var PER_PAGE = 15;

  // ----------------------------------------------------------
  // КАТЕГОРИИ
  // ----------------------------------------------------------
  var CATEGORIES = [
    { title: '🌿 Природа',    query: 'nature'     },
    { title: '🏙 Города',     query: 'city'       },
    { title: '🐾 Животные',   query: 'animals'    },
    { title: '🏋 Спорт',      query: 'sport'      },
    { title: '✈ Путешествия', query: 'travel'     },
    { title: '🍕 Еда',        query: 'food'       },
    { title: '💻 Технологии', query: 'technology' },
    { title: '🎭 Люди',       query: 'people'     },
    { title: '🌊 Океан',      query: 'ocean'      },
    { title: '🏔 Горы',       query: 'mountain'   },
    { title: '🌆 Закаты',     query: 'sunset'     },
    { title: '🚗 Авто',       query: 'cars'       }
  ];

  // ----------------------------------------------------------
  // PEXELS HTTP-ЗАПРОС
  // ----------------------------------------------------------
  function pexelsGet(endpoint, params, onSuccess, onError) {
    var url = API_BASE + endpoint + '?per_page=' + PER_PAGE;

    if (params) {
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          url += '&' + key + '=' + encodeURIComponent(params[key]);
        }
      }
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 12000;
    xhr.setRequestHeader('Authorization', API_KEY);

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          onSuccess(JSON.parse(xhr.responseText));
        } catch (e) {
          onError('JSON parse error: ' + e.message);
        }
      } else {
        onError('HTTP ' + xhr.status);
      }
    };

    xhr.ontimeout = function () { onError('Timeout'); };
    xhr.onerror   = function () { onError('Network error'); };
    xhr.send();
  }

  // ----------------------------------------------------------
  // ВЫБОР ВИДЕО-ФАЙЛА
  // Приоритет: sd → hd → первый mp4
  // ----------------------------------------------------------
  function pickVideoFile(video_files, prefer_quality) {
    if (!video_files || !video_files.length) return '';
    prefer_quality = prefer_quality || 'sd';

    var preferred = null;
    var fallback  = null;

    for (var i = 0; i < video_files.length; i++) {
      var f = video_files[i];
      if (f.file_type !== 'video/mp4') continue;
      if (f.quality === prefer_quality) { preferred = f.link; break; }
      if (!fallback) fallback = f.link;
    }

    return preferred || fallback || '';
  }

  // ----------------------------------------------------------
  // УТИЛИТЫ
  // ----------------------------------------------------------
  function formatDuration(seconds) {
    if (!seconds) return '';
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function makeName(video, category) {
    return (category ? category + ' — ' : '') + 'Видео #' + video.id;
  }

  // ----------------------------------------------------------
  // КОНВЕРТАЦИЯ Pexels video → карточка AdultJS
  // ----------------------------------------------------------
  function videoToCard(video, index, category) {
    var poster     = video.image || '';
    var videoUrl   = pickVideoFile(video.video_files, 'sd');
    var previewUrl = pickVideoFile(video.video_files, 'sd');

    if (!poster && video.video_pictures && video.video_pictures.length) {
      poster = video.video_pictures[0].picture || '';
    }

    return {
      name             : makeName(video, category),
      video            : videoUrl,
      picture          : poster,
      preview          : previewUrl,
      background_image : poster,
      img              : poster,
      poster           : poster,
      time             : formatDuration(video.duration),
      quality          : 'HD',
      json             : false,
      related          : false,
      model            : null,
      source           : NAME,
      pexels_id        : video.id,
      author           : video.user ? video.user.name : '',
      pexels_url       : video.url || ''
    };
  }

  // ----------------------------------------------------------
  // [1.1.0] МЕНЮ — пункт поиска с search_on:true
  //
  // AdultJS при наличии search_on:true вставляет «Найти» в фильтр.
  // После ввода запроса AdultJS пушит URL:
  //   playlist_url + '?search=' + encodeURIComponent(query)
  //   → 'xds/search/?search=закат'
  //
  // playlist_url пункта поиска НЕ должен содержать '?' — тогда
  // AdultJS сам добавит ?search=... (а не &search=...).
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      {
        title        : '🔍 Поиск',
        search_on    : true,              // ← AdultJS покажет «Найти» в фильтре
        playlist_url : NAME + '/search/' // ← AdultJS добавит ?search=запрос
      },
      {
        title        : '🔥 Популярное',
        playlist_url : NAME + '/popular'
      },
      {
        title        : '🆕 Категории',
        playlist_url : 'submenu',
        submenu      : CATEGORIES.map(function (c) {
          return {
            title        : c.title,
            playlist_url : NAME + '/search/' + encodeURIComponent(c.query)
          };
        })
      }
    ];
  }

  // ----------------------------------------------------------
  // FETCH-ФУНКЦИИ
  // ----------------------------------------------------------
  function fetchPopular(page, success, error) {
    pexelsGet('/popular', { page: page }, function (data) {
      success({
        results     : (data.videos || []).map(function (v, i) {
          return videoToCard(v, i, 'Популярное');
        }),
        collection  : true,
        total_pages : Math.min(Math.ceil((data.total_results || 100) / PER_PAGE), 10),
        menu        : buildMenu()
      });
    }, error);
  }

  function fetchSearch(query, page, success, error) {
    console.log('[xds] fetchSearch → query="' + query + '" page=' + page);

    pexelsGet('/search', { query: query, page: page }, function (data) {
      success({
        results     : (data.videos || []).map(function (v, i) {
          return videoToCard(v, i, query);
        }),
        collection  : true,
        total_pages : Math.min(Math.ceil((data.total_results || 0) / PER_PAGE), 10),
        menu        : buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // [1.1.0] РОУТЕР — разбираем входящий URL
  //
  // Возможные форматы url из AdultJS:
  //
  //   1. Фильтр-поиск (пользователь ввёл запрос через «Найти»):
  //      'xds/search/?search=закат'
  //      → parseQs → query = 'закат' → fetchSearch
  //
  //   2. Категория (клик по пункту подменю):
  //      'xds/search/sunset'
  //      → path-query = 'sunset' → fetchSearch
  //
  //   3. Популярное (стартовая страница или пункт меню):
  //      'xds/popular'  /  ''  /  всё остальное
  //      → fetchPopular
  // ----------------------------------------------------------
  function parseSearchParam(url) {
    // Ищем ?search= или &search= в URL
    var match = url.match(/[?&]search=([^&]*)/);
    if (match) return decodeURIComponent(match[1]);
    return null;
  }

  function routeView(url, page, success, error) {
    var searchPrefix = NAME + '/search/';

    console.log('[xds] routeView → url="' + url + '" page=' + page);

    // Случай 1: фильтр-поиск → xds/search/?search=закат
    var searchParam = parseSearchParam(url);
    if (searchParam !== null) {
      fetchSearch(searchParam.trim(), page, success, error);
      return;
    }

    // Случай 2: категория → xds/search/sunset
    if (url.indexOf(searchPrefix) === 0) {
      // Убираем префикс и возможный query-string
      var rawQuery = url.replace(searchPrefix, '').split('?')[0];
      var query    = decodeURIComponent(rawQuery).trim();

      if (query) {
        fetchSearch(query, page, success, error);
      } else {
        // xds/search/ без запроса и без ?search= → popular
        fetchPopular(page, success, error);
      }
      return;
    }

    // Случай 3: popular / неизвестное
    fetchPopular(page, success, error);
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var PexelsParser = {

    // Главный экран (горизонтальные полосы)
    main: function (params, success, error) {
      fetchPopular(1, success, error);
    },

    // Каталог / категория / поиск через фильтр
    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = params.url || (NAME + '/popular');
      routeView(url, page, success, error);
    },

    // Глобальный поиск через строку поиска Lampa
    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var page  = parseInt(params.page, 10) || 1;

      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }

      fetchSearch(query, page, function (data) {
        data.title = 'Pexels: ' + query;
        data.url   = NAME + '/search/' + encodeURIComponent(query);
        success(data);
      }, error);
    }
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, PexelsParser);
      console.log('[xds] v1.1.0 зарегистрирован');
      try {
        setTimeout(function () {
          Lampa.Noty.show('Pexels [xds] v1.1 подключён', { time: 2500 });
        }, 600);
      } catch (e) {}
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _elapsed = 0;
    var _poll = setInterval(function () {
      _elapsed += 100;
      if (tryRegister() || _elapsed >= 10000) clearInterval(_poll);
    }, 100);
  }

})();
