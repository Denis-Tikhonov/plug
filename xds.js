// =============================================================
// xds.js — AdultJS парсер на базе Pexels API
// Version : 4.0.0
// FIX: URL категорий xds/cat/ вместо xds://cat/
// FIX: search_on:true для кнопки поиска
// FIX: время как строка "M:SS" для отображения
// =============================================================

(function () {
  'use strict';

  var NAME     = 'xds';
  var API_KEY  = 'daFtVOPyOPiuaIuuv3JctGOHmKVlCH6tK4PXLXO1kyTxKRwrEihaXyHT';
  var API_BASE = 'https://api.pexels.com/videos';
  var PER_PAGE = 15;

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
  // МЕНЮ
  // ВАЖНО: playlist_url = 'xds/...' (без ://)
  // AdultJS парсит парсер через split('/')[0] → 'xds' ✅
  // 'xds://...' → split('/')[0] = 'xds:' → 404 ❌
  // ----------------------------------------------------------
  function buildMenu() {
    var submenu = [];
    for (var i = 0; i < CATEGORIES.length; i++) {
      submenu.push({
        title        : CATEGORIES[i].title,
        playlist_url : NAME + '/cat/' + encodeURIComponent(CATEGORIES[i].query)
      });
    }
    return [
      // Кнопка поиска — search_on:true обязательно!
      {
        title        : 'Поиск',
        playlist_url : NAME + '/search',
        search_on    : true
      },
      // Категории с подменю
      {
        title        : '🎭 Категории',
        playlist_url : NAME + '/popular',
        submenu      : submenu
      }
    ];
  }

  // ----------------------------------------------------------
  // ЗАПРОС К PEXELS API
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
        try { onSuccess(JSON.parse(xhr.responseText)); }
        catch (e) { onError('JSON: ' + e.message); }
      } else {
        onError('HTTP ' + xhr.status);
      }
    };
    xhr.ontimeout = function () { onError('Timeout'); };
    xhr.onerror   = function () { onError('Network error'); };
    xhr.send();
  }

  // ----------------------------------------------------------
  // ВЫБОР ВИДЕО (SD → любой MP4)
  // ----------------------------------------------------------
  function pickVideoFile(video_files) {
    if (!video_files || !video_files.length) return '';
    var preferred = null;
    var fallback  = null;
    for (var i = 0; i < video_files.length; i++) {
      var f = video_files[i];
      if (f.file_type !== 'video/mp4' || !f.link) continue;
      if (f.quality === 'sd' && !preferred) preferred = f.link;
      if (!fallback) fallback = f.link;
    }
    return preferred || fallback || '';
  }

  // ----------------------------------------------------------
  // ФОРМАТИРОВАНИЕ ВРЕМЕНИ — "M:SS"
  // ----------------------------------------------------------
  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '';
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ----------------------------------------------------------
  // КАРТОЧКА
  // fixCards в AdultJS сам проставит background_image/poster/img
  // ----------------------------------------------------------
  function videoToCard(video, category) {
    var videoUrl = pickVideoFile(video.video_files);
    var poster   = video.image || '';
    if (!poster && video.video_pictures && video.video_pictures.length) {
      poster = video.video_pictures[0].picture || '';
    }
    var label = (category ? category + ' — ' : '') + 'Видео #' + (video.id || '');
    var sec   = parseInt(video.duration, 10) || 0;

    return {
      name    : label,
      video   : videoUrl,
      picture : poster,
      preview : videoUrl,         // видео превью при наведении
      time    : formatDuration(sec), // строка "1:23" для отображения
      quality : 'HD',
      json    : false,
      related : false,
      model   : null,
      source  : NAME,
      author  : video.user ? (video.user.name || '') : ''
    };
  }

  // ----------------------------------------------------------
  // FETCH
  // ----------------------------------------------------------
  function fetchPopular(page, success, error) {
    pexelsGet('/popular', { page: page }, function (data) {
      success({
        results    : (data.videos || []).map(function (v) {
          return videoToCard(v, 'Популярное');
        }),
        collection : true,
        total_pages: Math.min(Math.ceil((data.total_results || 100) / PER_PAGE), 10),
        menu       : buildMenu()
      });
    }, error);
  }

  function fetchSearch(query, page, success, error) {
    pexelsGet('/search', { query: query, page: page }, function (data) {
      success({
        title      : 'Pexels: ' + query,
        results    : (data.videos || []).map(function (v) {
          return videoToCard(v, query);
        }),
        url        : NAME + '/cat/' + encodeURIComponent(query),
        collection : true,
        total_pages: Math.min(Math.ceil((data.total_results || 0) / PER_PAGE), 10),
        menu       : buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // РОУТЕР
  // xds/popular          → fetchPopular
  // xds/cat/nature       → fetchSearch('nature')
  // xds/search?search=qq → fetchSearch('qq')
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var catPrefix    = NAME + '/cat/';
    var searchPrefix = NAME + '/search';

    if (url.indexOf(catPrefix) === 0) {
      // Категория: xds/cat/nature
      var query = decodeURIComponent(url.replace(catPrefix, '').split('?')[0]);
      fetchSearch(query, page, success, error);

    } else if (url.indexOf(searchPrefix) === 0 && url.indexOf('search=') >= 0) {
      // Поиск из фильтра: xds/search?search=cars
      var m = url.match(/[?&]search=([^&]*)/);
      var q = m ? decodeURIComponent(m[1]) : '';
      if (q) fetchSearch(q, page, success, error);
      else   fetchPopular(page, success, error);

    } else {
      // Популярное или unknown
      fetchPopular(page, success, error);
    }
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var PexelsParser = {

    main: function (params, success, error) {
      fetchPopular(1, success, error);
    },

    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = params.url || '';
      routeView(url, page, success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || params.search || '').trim();
      var page  = parseInt(params.page, 10) || 1;
      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }
      fetchSearch(query, page, function (data) {
        data.title = 'Pexels: ' + query;
        data.url   = NAME + '/cat/' + encodeURIComponent(query);
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
