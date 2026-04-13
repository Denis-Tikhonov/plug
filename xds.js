// =============================================================
// xds.js — Pexels Parser для AdultJS
// Version  : 1.2.0
// Changed  :
//   [1.0.0] Базовый парсер Pexels
//   [1.1.0] Поиск через фильтр (search_on)
//   [1.2.0] Добавлен раздел «Новое» в меню
//            Длительность на карточке через Lampa.Listener
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
  // CSS — стиль бейджа длительности
  // Вставляется один раз при регистрации парсера
  // ----------------------------------------------------------
  function injectStyles() {
    if (document.getElementById('xds-styles')) return;

    var style = document.createElement('style');
    style.id  = 'xds-styles';
    style.textContent = [
      '.card__duration {',
      '  position: absolute;',
      '  bottom: 4px;',
      '  left: 4px;',
      '  background: rgba(0,0,0,0.65);',
      '  color: #fff;',
      '  font-size: 11px;',
      '  padding: 2px 5px;',
      '  border-radius: 3px;',
      '  z-index: 2;',
      '  pointer-events: none;',
      '}'
    ].join('\n');

    document.head.appendChild(style);
  }

  // ----------------------------------------------------------
  // HOOK — длительность на карточке
  // Lampa.Listener.follow('card') срабатывает при каждом
  // создании карточки. Фильтруем только наши карточки
  // (source === NAME) и вставляем .card__duration в .card__view
  // ----------------------------------------------------------
  function setupDurationHook() {
    try {
      Lampa.Listener.follow('card', function (event) {
        // Lampa использует опечатку 'complite' — это норма
        if (event.type !== 'complite') return;

        var card = event.card;
        if (!card || !card.data) return;

        // Только наши карточки
        if (card.data.source !== NAME) return;

        // Длительность в секундах
        var seconds = card.data.duration_sec;
        if (!seconds) return;

        // Форматируем через утилиту Lampa
        var timeStr = '';
        try {
          timeStr = Lampa.Utils.secondsToTime(seconds, true);
        } catch (e) {
          // Fallback если утилита недоступна
          var m = Math.floor(seconds / 60);
          var s = seconds % 60;
          timeStr = m + ':' + (s < 10 ? '0' : '') + s;
        }

        if (!timeStr) return;

        var $html = card.html;
        if (!$html) return;

        // Не дублируем если уже добавлено
        if ($html.find('.card__duration').length) return;

        var $view = $html.find('.card__view');
        if ($view.length) {
          $view.append('<div class="card__duration">' + timeStr + '</div>');
        }
      });

      console.log('[xds] durationHook установлен');
    } catch (e) {
      console.warn('[xds] durationHook ошибка:', e);
    }
  }

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
  // КОНВЕРТАЦИЯ Pexels video → карточка
  //
  // duration_sec — секунды, нужны для hook'а (числовые)
  // time         — строка для штатного поля карточки Lampa
  // ----------------------------------------------------------
  function videoToCard(video, category) {
    var poster     = video.image || '';
    var videoUrl   = pickVideoFile(video.video_files, 'sd');
    var previewUrl = pickVideoFile(video.video_files, 'sd');
    var seconds    = video.duration || 0;

    if (!poster && video.video_pictures && video.video_pictures.length) {
      poster = video.video_pictures[0].picture || '';
    }

    // Форматируем строку времени
    var timeStr = '';
    try {
      timeStr = seconds ? Lampa.Utils.secondsToTime(seconds, true) : '';
    } catch (e) {
      if (seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        timeStr = m + ':' + (s < 10 ? '0' : '') + s;
      }
    }

    return {
      name             : (category ? category + ' — ' : '') + 'Видео #' + video.id,
      video            : videoUrl,
      picture          : poster,
      preview          : previewUrl,
      background_image : poster,
      img              : poster,
      poster           : poster,
      quality          : 'HD',
      time             : timeStr,        // штатное поле — может подхватиться само
      duration_sec     : seconds,        // секунды для hook'а
      json             : false,
      related          : false,
      model            : null,
      source           : NAME,           // нужен для фильтра в hook'е
      pexels_id        : video.id,
      author           : video.user ? video.user.name : '',
      pexels_url       : video.url || ''
    };
  }

  // ----------------------------------------------------------
  // МЕНЮ
  // [1.2.0] Добавлен пункт «Новое»
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      {
        title        : '🔍 Поиск',
        search_on    : true,
        playlist_url : NAME + '/search/'
      },
      {
        title        : '🔥 Популярное',
        playlist_url : NAME + '/popular'
      },
      {
        // [1.2.0] Pexels не имеет отдельного /latest,
        // используем /search с sort=latest и широким запросом
        title        : '🆕 Новое',
        playlist_url : NAME + '/latest'
      },
      {
        title        : '📂 Категории',
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
        results     : (data.videos || []).map(function (v) {
          return videoToCard(v, 'Популярное');
        }),
        collection  : true,
        total_pages : Math.min(Math.ceil((data.total_results || 100) / PER_PAGE), 10),
        menu        : buildMenu()
      });
    }, error);
  }

  // [1.2.0] «Новое» — Pexels не даёт /latest для видео,
  // поэтому используем /search с sort=latest.
  // 'nature' — широкий запрос, возвращает свежий контент.
  function fetchLatest(page, success, error) {
    pexelsGet('/search', { query: 'nature', sort: 'latest', page: page }, function (data) {
      success({
        results     : (data.videos || []).map(function (v) {
          return videoToCard(v, 'Новое');
        }),
        collection  : true,
        total_pages : Math.min(Math.ceil((data.total_results || 0) / PER_PAGE), 10),
        menu        : buildMenu()
      });
    }, error);
  }

  function fetchSearch(query, page, success, error) {
    console.log('[xds] поиск → "' + query + '" стр.' + page);

    pexelsGet('/search', { query: query, page: page }, function (data) {
      success({
        results     : (data.videos || []).map(function (v) {
          return videoToCard(v, query);
        }),
        collection  : true,
        total_pages : Math.min(Math.ceil((data.total_results || 0) / PER_PAGE), 10),
        menu        : buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // РОУТЕР
  // ----------------------------------------------------------
  function parseSearchParam(url) {
    var match = url.match(/[?&]search=([^&]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function routeView(url, page, success, error) {
    var searchPrefix = NAME + '/search/';
    var latestPrefix = NAME + '/latest';

    console.log('[xds] routeView → "' + url + '" стр.' + page);

    // Фильтр-поиск: xds/search/?search=закат
    var searchParam = parseSearchParam(url);
    if (searchParam !== null) {
      fetchSearch(searchParam.trim(), page, success, error);
      return;
    }

    // [1.2.0] Новое: xds/latest
    if (url.indexOf(latestPrefix) === 0) {
      fetchLatest(page, success, error);
      return;
    }

    // Категория: xds/search/sunset
    if (url.indexOf(searchPrefix) === 0) {
      var rawQuery = url.replace(searchPrefix, '').split('?')[0];
      var query    = decodeURIComponent(rawQuery).trim();
      if (query) {
        fetchSearch(query, page, success, error);
      } else {
        fetchPopular(page, success, error);
      }
      return;
    }

    // Популярное и всё остальное
    fetchPopular(page, success, error);
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
      var url  = params.url || (NAME + '/popular');
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

      injectStyles();      // CSS для card__duration
      setupDurationHook(); // Lampa.Listener hook

      console.log('[xds] v1.2.0 зарегистрирован');

      try {
        setTimeout(function () {
          Lampa.Noty.show('Pexels [xds] v1.2 подключён', { time: 2500 });
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
