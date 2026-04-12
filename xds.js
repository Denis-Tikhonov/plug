// =============================================================
// pexels_test.js — ТЕСТОВАЯ ЗАГЛУШКА AdultJS на базе Pexels API
// Version  : 1.0.0
// Данные   : api.pexels.com (CORS: open, без прокси)
// Постеры  : images.pexels.com (без CORS, без прокси)
// Видео    : Pexels CDN / Vimeo CDN (без прокси)
// Поиск    : /videos/search
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // КОНФИГ — вставьте свой ключ Pexels
  // Получить бесплатно: https://www.pexels.com/api/
  // ----------------------------------------------------------
  var NAME     = 'xds';
  var API_KEY  = 'daFtVOPyOPiuaIuuv3JctGOHmKVlCH6tK4PXLXO1kyTxKRwrEihaXyHT';
  var API_BASE = 'https://api.pexels.com/videos';
  var PER_PAGE = 15;

  // ----------------------------------------------------------
  // КАТЕГОРИИ — поисковые запросы к Pexels
  // ----------------------------------------------------------
  var CATEGORIES = [
    { title: '🌿 Природа',     query: 'nature'      },
    { title: '🏙 Города',      query: 'city'        },
    { title: '🐾 Животные',    query: 'animals'     },
    { title: '🏋 Спорт',       query: 'sport'       },
    { title: '✈ Путешествия',  query: 'travel'      },
    { title: '🍕 Еда',         query: 'food'        },
    { title: '💻 Технологии',  query: 'technology'  },
    { title: '🎭 Люди',        query: 'people'      },
    { title: '🌊 Океан',       query: 'ocean'       },
    { title: '🏔 Горы',        query: 'mountain'    },
    { title: '🌆 Закаты',      query: 'sunset'      },
    { title: '🚗 Авто',        query: 'cars'        }
  ];

  // ----------------------------------------------------------
  // PEXELS ЗАПРОС — Authorization header, CORS open
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
  // ВЫБОР ВИДЕО ФАЙЛА
  // Приоритет: sd → hd → первый доступный mp4
  // SD выбирается намеренно — лучше совместимость с TV
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
  // ФОРМАТИРОВАНИЕ ВРЕМЕНИ
  // ----------------------------------------------------------
  function formatDuration(seconds) {
    if (!seconds) return '';
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ----------------------------------------------------------
  // ГЕНЕРАЦИЯ ИМЕНИ КАРТОЧКИ
  // У Pexels нет заголовков — используем категорию + id
  // ----------------------------------------------------------
  function makeName(video, category) {
    var tag = '';
    if (category) {
      tag = category + ' — ';
    }
    return tag + 'Видео #' + video.id;
  }

  // ----------------------------------------------------------
  // КОНВЕРТАЦИЯ Pexels video → карточка AdultJS
  // ----------------------------------------------------------
  function videoToCard(video, index, category) {
    var poster    = video.image || '';                       // thumbnail
    var videoUrl  = pickVideoFile(video.video_files, 'sd'); // SD для TV
    var previewUrl = pickVideoFile(video.video_files, 'sd');// тот же файл

    // Альтернативный постер из video_pictures если нет image
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

      // Доп. поля
      pexels_id        : video.id,
      author           : video.user ? video.user.name : '',
      pexels_url       : video.url  || ''
    };
  }

  // ----------------------------------------------------------
  // МЕНЮ
  // ----------------------------------------------------------
  function buildMenu() {
    var sections = [
      { title: '🔥 Популярное',  playlist_url: NAME + '://popular'  },
      { title: '🆕 Категории',   playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return {
            title        : c.title,
            playlist_url : NAME + '://search/' + encodeURIComponent(c.query)
          };
        })
      }
    ];
    return sections;
  }

  // ----------------------------------------------------------
  // FETCH → CARDS → ОТВЕТ
  // ----------------------------------------------------------
  function fetchPopular(page, success, error) {
    pexelsGet('/popular', { page: page }, function (data) {
      var results = (data.videos || []).map(function (v, i) {
        return videoToCard(v, i, 'Популярное');
      });

      success({
        results     : results,
        collection  : true,
        total_pages : Math.min(Math.ceil((data.total_results || 100) / PER_PAGE), 10),
        menu        : buildMenu()
      });
    }, error);
  }

  function fetchSearch(query, page, success, error) {
    pexelsGet('/search', { query: query, page: page }, function (data) {
      var results = (data.videos || []).map(function (v, i) {
        return videoToCard(v, i, query);
      });

      success({
        results     : results,
        collection  : true,
        total_pages : Math.min(Math.ceil((data.total_results || 0) / PER_PAGE), 10),
        menu        : buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // РОУТЕР — разбираем playlist_url
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var searchPrefix = NAME + '://search/';
    var popularUrl   = NAME + '://popular';

    if (url.indexOf(searchPrefix) === 0) {
      var query = decodeURIComponent(url.replace(searchPrefix, ''));
      fetchSearch(query, page, success, error);
    } else {
      // popular или любой неизвестный → popular
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
      var url  = params.url || (NAME + '://popular');
      routeView(url, page, success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var page  = parseInt(params.page, 10) || 1;

      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }

      fetchSearch(query, page, function (data) {
        data.title = 'Pexels: ' + query;
        data.url   = NAME + '://search/' + encodeURIComponent(query);
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
      console.log('[pexels_test] v1.0.0 зарегистрирован');
      try {
        setTimeout(function () {
          Lampa.Noty.show('Pexels Test v1.0 подключён', { time: 2500 });
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
