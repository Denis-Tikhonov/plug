// =============================================================
// pexels_test.js — ТЕСТОВАЯ ЗАГЛУШКА AdultJS на базе Pexels API
// Version  : 2.1.0  (fix: script error, ES5 clean, no emoji)
// =============================================================

(function () {
  'use strict';

  var NAME     = 'xds';
  var API_KEY  = 'daFtVOPyOPiuaIuuv3JctGOHmKVlCH6tK4PXLXO1kyTxKRwrEihaXyHT';
  var API_BASE = 'https://api.pexels.com/videos';
  var PER_PAGE = 15;

  // ----------------------------------------------------------
  // КАТЕГОРИИ — без эмодзи (причина script error на TV)
  // ----------------------------------------------------------
  var CATEGORIES = [
    { title: 'Природа',     query: 'nature'     },
    { title: 'Города',      query: 'city'       },
    { title: 'Животные',    query: 'animals'    },
    { title: 'Спорт',       query: 'sport'      },
    { title: 'Путешествия', query: 'travel'     },
    { title: 'Еда',         query: 'food'       },
    { title: 'Технологии',  query: 'technology' },
    { title: 'Люди',        query: 'people'     },
    { title: 'Океан',       query: 'ocean'      },
    { title: 'Горы',        query: 'mountain'   },
    { title: 'Закаты',      query: 'sunset'     },
    { title: 'Авто',        query: 'cars'       }
  ];

  // ----------------------------------------------------------
  // ВЫБОР ВИДЕО — сортировка по ширине, берём 640-1280px
  // ----------------------------------------------------------
  function pickVideoFile(video_files) {
    if (!video_files || !video_files.length) return '';

    var mp4 = [];
    var i, w;

    for (i = 0; i < video_files.length; i++) {
      if (video_files[i].file_type === 'video/mp4' && video_files[i].link) {
        mp4.push(video_files[i]);
      }
    }

    if (!mp4.length) return '';

    // Сортировка по ширине
    mp4.sort(function (a, b) {
      return (a.width || 0) - (b.width || 0);
    });

    // Предпочитаем SD/HD диапазон — лучше совместимость с TV
    for (i = 0; i < mp4.length; i++) {
      w = mp4[i].width || 0;
      if (w >= 640 && w <= 1280) return mp4[i].link;
    }

    return mp4[0].link;
  }

  // ----------------------------------------------------------
  // ФОРМАТ ВРЕМЕНИ "M:SS"
  // ----------------------------------------------------------
  function formatTime(seconds) {
    seconds = parseInt(seconds, 10) || 0;
    if (seconds <= 0) return '';
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ----------------------------------------------------------
  // PEXELS ЗАПРОС
  // ----------------------------------------------------------
  function pexelsGet(endpoint, params, onSuccess, onError) {
    var url = API_BASE + endpoint + '?per_page=' + PER_PAGE;
    var key;

    if (params) {
      for (key in params) {
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
          onError('JSON parse: ' + e.message);
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
  // КОНВЕРТАЦИЯ video → карточка AdultJS
  // ----------------------------------------------------------
  function videoToCard(video, offset, category) {
    var videoUrl = pickVideoFile(video.video_files);

    // Постер
    var poster = video.image || '';
    if (!poster && video.video_pictures && video.video_pictures.length) {
      var mid = Math.floor(video.video_pictures.length / 2);
      poster = video.video_pictures[mid].picture || '';
    }

    // Кадр предпросмотра (второй кадр если есть)
    var thumb = poster;
    if (video.video_pictures && video.video_pictures.length > 1) {
      thumb = video.video_pictures[1].picture || poster;
    }

    var label = (category || 'Pexels') + ' #' + video.id;

    return {
      name             : label,
      video            : videoUrl,    // плеер
      picture          : poster,      // постер карточки
      preview          : videoUrl,    // предпросмотр при наведении
      img              : thumb,       // thumbnail
      background_image : poster,      // фон страницы детали
      poster           : poster,
      time             : formatTime(video.duration),
      quality          : 'HD',
      json             : false,
      related          : false,
      model            : null,
      source           : NAME,
      pexels_id        : video.id,
      author           : (video.user && video.user.name) ? video.user.name : ''
    };
  }

  // ----------------------------------------------------------
  // МЕНЮ — for вместо .map() для совместимости
  // ----------------------------------------------------------
  function buildMenu() {
    var submenu = [];
    var i;

    for (i = 0; i < CATEGORIES.length; i++) {
      submenu.push({
        title        : CATEGORIES[i].title,
        playlist_url : NAME + '://cat/' + encodeURIComponent(CATEGORIES[i].query)
      });
    }

    return [
      {
        title        : 'Популярное',
        playlist_url : NAME + '://popular'
      },
      {
        title        : 'Категории',
        playlist_url : 'submenu',
        submenu      : submenu
      }
    ];
  }

  // ----------------------------------------------------------
  // ФОРМИРОВАНИЕ ОТВЕТА
  // ----------------------------------------------------------
  function makeResponse(data, videos, category, page) {
    var results = [];
    var offset  = (page - 1) * PER_PAGE;
    var i;

    for (i = 0; i < videos.length; i++) {
      results.push(videoToCard(videos[i], offset + i, category));
    }

    var total      = parseInt(data.total_results, 10) || PER_PAGE;
    var totalPages = Math.ceil(total / PER_PAGE);
    if (totalPages > 10) totalPages = 10;
    if (totalPages < 1)  totalPages = 1;

    return {
      results     : results,
      collection  : true,
      total_pages : totalPages,
      menu        : buildMenu()
    };
  }

  // ----------------------------------------------------------
  // FETCH
  // ----------------------------------------------------------
  function fetchPopular(page, success, error) {
    pexelsGet('/popular', { page: page }, function (data) {
      success(makeResponse(data, data.videos || [], 'Популярное', page));
    }, error);
  }

  function fetchSearch(query, page, success, error) {
    pexelsGet('/search', { query: query, page: page }, function (data) {
      var resp   = makeResponse(data, data.videos || [], query, page);
      resp.title = 'Pexels: ' + query;
      resp.url   = NAME + '://cat/' + encodeURIComponent(query);
      success(resp);
    }, error);
  }

  // ----------------------------------------------------------
  // РОУТЕР
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var catPrefix = NAME + '://cat/';

    if (url && url.indexOf(catPrefix) === 0) {
      var raw   = url.replace(catPrefix, '');
      var query = '';
      try { query = decodeURIComponent(raw.split('?')[0]); }
      catch (e) { query = raw.split('?')[0]; }
      fetchSearch(query, page, success, error);
    } else {
      fetchPopular(page, success, error);
    }
  }

  // ----------------------------------------------------------
  // ПАРСЕР
  // ----------------------------------------------------------
  var PexelsParser = {

    main: function (params, success, error) {
      fetchPopular(1, success, error);
    },

    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = params.url || params.playlist_url || (NAME + '://popular');
      routeView(url, page, success, error);
    },

    search: function (params, success, error) {
      var query = ((params.query || params.search || '') + '').trim();
      var page  = parseInt(params.page, 10) || 1;

      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }

      fetchSearch(query, page, success, error);
    }
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, PexelsParser);
      try {
        setTimeout(function () {
          Lampa.Noty.show('Pexels Test v2.1 OK', { time: 2500 });
        }, 600);
      } catch (e) {}
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _el = 0;
    var _poll = setInterval(function () {
      _el += 100;
      if (tryRegister() || _el >= 10000) clearInterval(_poll);
    }, 100);
  }

})();
