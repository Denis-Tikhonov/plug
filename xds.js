// =============================================================
// pexels_test.js — ТЕСТОВАЯ ЗАГЛУШКА AdultJS на базе Pexels API
// Version  : 2.0.0  (fix: preview, time, categories, search)
// =============================================================

(function () {
  'use strict';

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
  // FIX 1: ВЫБОР ВИДЕО ФАЙЛА
  // Сортируем mp4 по ширине → берём около 720p
  // Не используем quality-строку (она ненадёжна у Pexels)
  // ----------------------------------------------------------
  function pickVideoFile(video_files) {
    if (!video_files || !video_files.length) return '';

    // Фильтр: только mp4
    var mp4 = [];
    for (var i = 0; i < video_files.length; i++) {
      if (video_files[i].file_type === 'video/mp4' && video_files[i].link) {
        mp4.push(video_files[i]);
      }
    }
    if (!mp4.length) return '';

    // Сортировка по ширине по возрастанию
    mp4.sort(function (a, b) { return (a.width || 0) - (b.width || 0); });

    // Берём файл 640–1280px (SD/HD) — лучшая совместимость с TV
    var chosen = null;
    for (var j = 0; j < mp4.length; j++) {
      var w = mp4[j].width || 0;
      if (w >= 640 && w <= 1280) { chosen = mp4[j]; break; }
    }

    return chosen ? chosen.link : mp4[0].link;
  }

  // ----------------------------------------------------------
  // FIX 2: ПРОДОЛЖИТЕЛЬНОСТЬ — строка "M:SS"
  // ----------------------------------------------------------
  function formatTime(seconds) {
    if (!seconds || seconds <= 0) return '0:00';
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ----------------------------------------------------------
  // PEXELS ЗАПРОС — Authorization header
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

    console.log('[pexels] GET:', url);

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
  // FIX 1+2: КОНВЕРТАЦИЯ video → карточка AdultJS
  // ----------------------------------------------------------
  function videoToCard(video, index, category) {
    var videoUrl = pickVideoFile(video.video_files);

    // Постер: поле image → video_pictures[середина]
    var poster = video.image || '';
    if (!poster && video.video_pictures && video.video_pictures.length) {
      var mid = Math.floor(video.video_pictures.length / 2);
      poster = video.video_pictures[mid].picture || '';
    }

    // Предпросмотр-картинка: другой кадр из video_pictures
    var previewImg = '';
    if (video.video_pictures && video.video_pictures.length > 1) {
      previewImg = video.video_pictures[1].picture || poster;
    } else {
      previewImg = poster;
    }

    var label = (category ? category + ' — ' : '') + '#' + video.id;

    console.log('[pexels] card #' + index,
      '| time:', video.duration,
      '| video:', videoUrl ? videoUrl.substring(0, 60) + '...' : 'ПУСТО',
      '| poster:', poster ? '✅' : '❌'
    );

    return {
      name             : label,
      video            : videoUrl,        // mp4 для плеера
      picture          : poster,          // постер карточки
      preview          : videoUrl,        // ← FIX1: видео при наведении
      img              : previewImg,      // кадр для thumb
      background_image : poster,          // фон страницы детали
      poster           : poster,
      time             : formatTime(video.duration), // ← FIX2: "1:23"
      quality          : 'HD',
      json             : false,
      related          : false,
      model            : null,
      source           : NAME,
      pexels_id        : video.id,
      author           : video.user ? video.user.name : ''
    };
  }

  // ----------------------------------------------------------
  // МЕНЮ
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      { title: '🔥 Популярное',  playlist_url: NAME + '://popular'   },
      {
        title        : '🎭 Категории',
        playlist_url : 'submenu',
        submenu      : CATEGORIES.map(function (c) {
          return {
            title        : c.title,
            playlist_url : NAME + '://cat/' + encodeURIComponent(c.query)
          };
        })
      }
    ];
  }

  // ----------------------------------------------------------
  // FETCH HELPERS
  // ----------------------------------------------------------
  function fetchPopular(page, success, error) {
    pexelsGet('/popular', { page: page }, function (data) {
      success({
        results     : (data.videos || []).map(function (v, i) {
          return videoToCard(v, (page - 1) * PER_PAGE + i, 'Популярное');
        }),
        collection  : true,
        total_pages : Math.min(Math.ceil((data.total_results || 100) / PER_PAGE), 10),
        menu        : buildMenu()
      });
    }, error);
  }

  function fetchSearch(query, page, success, error) {
    pexelsGet('/search', { query: query, page: page }, function (data) {
      success({
        title       : 'Pexels: ' + query,
        results     : (data.videos || []).map(function (v, i) {
          return videoToCard(v, i, query);
        }),
        url         : NAME + '://cat/' + encodeURIComponent(query),
        collection  : true,
        total_pages : Math.min(Math.ceil((data.total_results || 0) / PER_PAGE), 10),
        menu        : buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // FIX 3: РОУТЕР — принимаем params.url И params.playlist_url
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var catPrefix = NAME + '://cat/';

    console.log('[pexels] routeView url:', url, 'page:', page);

    if (url && url.indexOf(catPrefix) === 0) {
      var query = decodeURIComponent(url.replace(catPrefix, '').split('?')[0]);
      console.log('[pexels] → поиск по категории:', query);
      fetchSearch(query, page, success, error);
    } else {
      console.log('[pexels] → популярное');
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

    // FIX 3: принимаем url из обоих возможных полей
    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = params.url || params.playlist_url || (NAME + '://popular');

      console.log('[pexels] view params:', JSON.stringify(params));

      routeView(url, page, success, error);
    },

    // FIX 4: поиск — принимаем query и search
    search: function (params, success, error) {
      var query = (params.query || params.search || '').trim();
      var page  = parseInt(params.page, 10) || 1;

      console.log('[pexels] search query:', query, 'page:', page);

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
      console.log('[pexels_test] v2.0.0 зарегистрирован');
      try {
        setTimeout(function () {
          Lampa.Noty.show('Pexels Test v2.0 подключён', { time: 2500 });
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
