// =============================================================
// xds.js — AdultJS парсер на базе Pexels API
// Version : 3.0.0 (fix: duration, preview, search, categories)
// =============================================================

try {

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
  // МЕНЮ — плоский список без submenu
  // ----------------------------------------------------------
  function buildMenu() {
    try {
      var items = [
        { title: '🔥 Популярное', playlist_url: NAME + '://popular' }
      ];
      for (var i = 0; i < CATEGORIES.length; i++) {
        items.push({
          title        : CATEGORIES[i].title,
          playlist_url : NAME + '://cat/' + encodeURIComponent(CATEGORIES[i].query)
        });
      }
      return items;
    } catch (e) { return []; }
  }

  // ----------------------------------------------------------
  // ВЫБОР ВИДЕО ФАЙЛА ~720p
  // ----------------------------------------------------------
  function pickVideoFile(video_files) {
    try {
      if (!video_files || !video_files.length) return '';
      var mp4 = [];
      for (var i = 0; i < video_files.length; i++) {
        if (video_files[i].file_type === 'video/mp4' && video_files[i].link) {
          mp4.push(video_files[i]);
        }
      }
      if (!mp4.length) return '';
      mp4.sort(function (a, b) { return (a.width || 0) - (b.width || 0); });
      var chosen = null;
      for (var j = 0; j < mp4.length; j++) {
        var w = mp4[j].width || 0;
        if (w >= 640 && w <= 1280) { chosen = mp4[j]; break; }
      }
      return chosen ? chosen.link : mp4[0].link;
    } catch (e) { return ''; }
  }

  // ----------------------------------------------------------
  // PEXELS ЗАПРОС
  // ----------------------------------------------------------
  function pexelsGet(endpoint, params, onSuccess, onError) {
    try {
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
    } catch (e) { onError('xhr: ' + e.message); }
  }

  // ----------------------------------------------------------
  // КОНВЕРТАЦИЯ video → карточка
  // FIX: duration = число секунд
  // FIX: preview  = картинка, trailer = видео
  // ----------------------------------------------------------
  function videoToCard(video, category) {
    try {
      var videoUrl = pickVideoFile(video.video_files);

      // Постер
      var poster = video.image || '';
      if (!poster && video.video_pictures && video.video_pictures.length) {
        poster = video.video_pictures[0].picture || '';
      }

      // Превью-картинка (другой кадр)
      var previewImg = poster;
      if (video.video_pictures && video.video_pictures.length > 1) {
        previewImg = video.video_pictures[1].picture || poster;
      }

      var label = (category ? category + ' — ' : '') + '#' + (video.id || '');
      var dur   = parseInt(video.duration, 10) || 0;

      return {
        name             : label,
        title            : label,
        video            : videoUrl,
        picture          : poster,
        poster           : poster,
        img              : previewImg,
        background_image : poster,

        // FIX предпросмотр:
        preview          : previewImg,   // картинка при наведении
        trailer          : videoUrl,     // видео при наведении

        // FIX длительность:
        duration         : dur,          // число секунд (для AdultJS)
        time             : dur,          // дублируем на всякий случай

        quality          : 'HD',
        json             : false,
        related          : false,
        model            : null,
        source           : NAME,
        author           : video.user ? (video.user.name || '') : ''
      };
    } catch (e) {
      return { name: 'Error', video: '', picture: '', source: NAME };
    }
  }

  // ----------------------------------------------------------
  // FETCH HELPERS
  // ----------------------------------------------------------
  function fetchPopular(page, success, error) {
    pexelsGet('/popular', { page: page }, function (data) {
      try {
        success({
          results     : (data.videos || []).map(function (v) {
            return videoToCard(v, 'Популярное');
          }),
          collection  : true,
          total_pages : Math.min(Math.ceil((data.total_results || 100) / PER_PAGE), 10),
          menu        : buildMenu()
        });
      } catch (e) { error('popular: ' + e.message); }
    }, error);
  }

  function fetchSearch(query, page, success, error) {
    pexelsGet('/search', { query: query, page: page }, function (data) {
      try {
        success({
          title       : 'Pexels: ' + query,
          results     : (data.videos || []).map(function (v) {
            return videoToCard(v, query);
          }),
          url         : NAME + '://cat/' + encodeURIComponent(query),
          collection  : true,
          total_pages : Math.min(Math.ceil((data.total_results || 0) / PER_PAGE), 10),
          menu        : buildMenu()
        });
      } catch (e) { error('search: ' + e.message); }
    }, error);
  }

  // ----------------------------------------------------------
  // РОУТЕР
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    try {
      var catPrefix = NAME + '://cat/';
      if (url && url.indexOf(catPrefix) === 0) {
        var raw   = url.replace(catPrefix, '').split('?')[0];
        var query = decodeURIComponent(raw);
        fetchSearch(query, page, success, error);
      } else {
        fetchPopular(page, success, error);
      }
    } catch (e) { error('route: ' + e.message); }
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var PexelsParser = {

    main: function (params, success, error) {
      try {
        fetchPopular(1, success, error);
      } catch (e) {
        try { Lampa.Noty.show('main ERR: ' + e.message, { time: 30000 }); } catch (x) {}
        error('main: ' + e.message);
      }
    },

    view: function (params, success, error) {
      try {
        var page = parseInt(params.page, 10) || 1;
        var url  = params.url || params.playlist_url || (NAME + '://popular');
        routeView(url, page, success, error);
      } catch (e) {
        try { Lampa.Noty.show('view ERR: ' + e.message, { time: 30000 }); } catch (x) {}
        error('view: ' + e.message);
      }
    },

    // FIX поиск — читаем из всех возможных полей
    search: function (params, success, error) {
      try {
        var query = '';
        if (params.query)  query = params.query;
        else if (params.search) query = params.search;
        else if (params.url && params.url.indexOf('://search/') >= 0) {
          query = decodeURIComponent(params.url.split('://search/')[1] || '');
        }
        query = query.trim();

        var page = parseInt(params.page, 10) || 1;

        if (!query) {
          success({ title: '', results: [], collection: true, total_pages: 1 });
          return;
        }
        fetchSearch(query, page, success, error);
      } catch (e) {
        try { Lampa.Noty.show('search ERR: ' + e.message, { time: 30000 }); } catch (x) {}
        error('search: ' + e.message);
      }
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

} catch (e) {
  var errMsg   = e.message || String(e);
  var errLine  = e.lineNumber || e.line || e.lineno || '?';
  var errStack = e.stack ? e.stack.substring(0, 300) : '';

  try { localStorage.setItem('pexels_err', errMsg + ' | line:' + errLine + ' | ' + errStack); } catch (s) {}

  setTimeout(function () {
    try {
      Lampa.Select.show({
        title : 'xds.js ERROR',
        items : [
          { title: 'MSG: '   + errMsg  },
          { title: 'LINE: '  + errLine },
          { title: 'STACK: ' + errStack.substring(0, 100) }
        ],
        onBack: function () { Lampa.Select.close(); }
      });
    } catch (n) {
      try { Lampa.Noty.show('ERR: ' + errMsg + ' line:' + errLine, { time: 60000 }); } catch (x) {}
    }
  }, 2000);
}
