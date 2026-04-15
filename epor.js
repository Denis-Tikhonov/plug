// =============================================================
// eporner.js — Парсер EPorner для AdultJS (Lampa)
// Version  : 1.1.0
// Based on : phub_210 (Network/Qualities architecture)
// =============================================================

(function () {
  'use strict';

  var NAME = 'epor';
  var HOST = 'https://www.eporner.com';

  // ----------------------------------------------------------
  // СЕТЕВОЙ ЗАПРОС (Архитектура phub_210)
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

  function rx(str, regex, group) {
    if (!str) return null;
    var g = group === undefined ? 1 : group;
    var m = str.match(regex);
    return m && m[g] ? m[g].trim() : null;
  }

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL (Синхронизировано с JSON/ARCH)
  // ----------------------------------------------------------
  function buildUrl(query, sort, cat, page) {
    var url = HOST + '/';
    page = parseInt(page, 10) || 1;

    if (query) {
      // Схема из JSON: /?q={query}&page={N}
      url += '?q=' + encodeURIComponent(query);
    } else if (cat) {
      // Схема из ARCH: /cat/{slug}/{page}/
      url += 'cat/' + cat + '/';
      if (page > 1) url += page + '/';
    } else {
      if (page > 1) url += page + '/';
    }

    if (sort && !query) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + 'sort=' + sort;
    }
    
    // Для поиска пагинация через &page=N
    if (query && page > 1) url += '&page=' + page;

    return url;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];
    var results = [];
    
    // Используем DOMParser для стабильности (как в phub_210)
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('div.mb, div.mb.hdy');

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      
      var linkEl = el.querySelector('p.mbtit a');
      if (!linkEl) continue;

      var href = linkEl.getAttribute('href');
      if (href.indexOf('http') !== 0) href = HOST + href;

      var name = linkEl.textContent.trim();
      
      // Картинка и ID для превью
      var img = el.querySelector('img');
      var pic = img ? (img.getAttribute('data-src') || img.getAttribute('src')) : '';
      if (pic && pic.indexOf('//') === 0) pic = 'https:' + pic;

      var dataId = el.getAttribute('data-id');
      var preview = (pic && dataId) 
        ? pic.replace(/\/[^/]+$/, '') + '/' + dataId + '-preview.webm' 
        : null;

      var dur = el.querySelector('span.mbtim') ? el.querySelector('span.mbtim').textContent.trim() : '';
      var qual = el.querySelector('div.mvhdico') ? 'HD' : '';

      results.push({
        name: name,
        video: href,
        picture: pic,
        preview: preview,
        time: dur,
        quality: qual,
        json: true,
        source: NAME
      });
    }
    return results;
  }

  // ----------------------------------------------------------
  // ОБРАБОТКА ВИДЕО (Base36 + XHR API)
  // ----------------------------------------------------------
  function base36(hexStr) {
    var n = parseInt(hexStr, 16);
    var chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    var result = '';
    while (n > 0) {
      result = chars[n % 36] + result;
      n = Math.floor(n / 36);
    }
    return result || '0';
  }

  function convertHash(hash) {
    if (!hash || hash.length < 32) return '';
    return base36(hash.substring(0, 8)) +
           base36(hash.substring(8, 16)) +
           base36(hash.substring(16, 24)) +
           base36(hash.substring(24, 32));
  }

  // ----------------------------------------------------------
  // МЕНЮ
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      { title: 'Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { 
        title: 'Сортировка', 
        playlist_url: 'submenu', 
        submenu: [
          { title: 'Новинки', playlist_url: NAME + '/sort/' },
          { title: 'Топ просмотра', playlist_url: NAME + '/sort/most-viewed' },
          { title: 'Топ рейтинга', playlist_url: NAME + '/sort/top-rated' },
          { title: 'Длинные', playlist_url: NAME + '/sort/longest' }
        ]
      }
    ];
  }

  // ----------------------------------------------------------
  // ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ----------------------------------------------------------
  var EpornerParser = {
    main: function (params, success, error) {
      httpGet(HOST + '/', function (html) {
        var cards = parseCards(html);
        success({ results: cards, collection: true, total_pages: 50, menu: buildMenu() });
      }, error);
    },

    view: function (params, success, error) {
      var page = params.page || 1;
      var url = params.url || '';
      var sort = url.indexOf('/sort/') !== -1 ? url.split('/sort/')[1] : '';
      var cat = url.indexOf('/cat/') !== -1 ? url.split('/cat/')[1] : '';
      
      var fetchUrl = buildUrl(null, sort, cat, page);
      
      httpGet(fetchUrl, function (html) {
        var cards = parseCards(html);
        success({
          results: cards,
          collection: true,
          total_pages: cards.length > 0 ? page + 1 : page,
          menu: buildMenu()
        });
      }, error);
    },

    search: function (params, success, error) {
      var query = params.query || '';
      var page = params.page || 1;
      var fetchUrl = buildUrl(query, null, null, page);

      httpGet(fetchUrl, function (html) {
        var cards = parseCards(html);
        success({
          title: 'EP: ' + query,
          results: cards,
          collection: true,
          total_pages: cards.length > 0 ? page + 1 : page
        });
      }, error);
    },

    qualities: function (videoUrl, success, error) {
      console.log('[EPORNER] Qualities for:', videoUrl);
      httpGet(videoUrl, function (html) {
        var vid = rx(html, /vid ?= ?'([^']+)'/);
        var hash = rx(html, /hash ?= ?'([^']+)'/);

        if (!vid || !hash) {
          console.error('[EPORNER] No vid/hash found');
          return error('EP: Ссылка не найдена');
        }

        var apiUrl = HOST + '/xhr/video/' + vid +
          '?hash=' + convertHash(hash) +
          '&domain=eporner.com&fallback=false&embed=false&supportedFormats=mp4&_=' + Date.now();

        httpGet(apiUrl, function (jsonStr) {
          try {
            var data = JSON.parse(jsonStr);
            var q = {};
            // Парсинг качеств из JSON ответа API
            if (data && data.sources) {
              // Если API вернуло стандартный объект с ключами mp4
              var mp4 = data.sources.mp4 || [];
              mp4.forEach(function(src) {
                var label = src.res || 'SD';
                q[label + 'p'] = src.src;
              });
            } else {
              // Резервный поиск ссылок через регулярку в строке JSON
              var re = /"src":\s*"(https?:\\?\/\\?\/[^"]+-([0-9]+p)\.mp4)"/g;
              var m;
              while ((m = re.exec(jsonStr)) !== null) {
                var link = m[1].replace(/\\/g, '');
                q[m[2]] = link;
              }
            }

            if (Object.keys(q).length > 0) {
              success({ qualities: q });
            } else {
              error('Видео недоступно');
            }
          } catch (e) {
            error('Ошибка API: ' + e.message);
          }
        }, error);
      }, error);
    }
  };

  // Регистрация
  function tryRegister() {
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
      window.AdultPlugin.registerParser(NAME, EpornerParser);
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var timer = setInterval(function () {
      if (tryRegister()) clearInterval(timer);
    }, 200);
    setTimeout(function() { clearInterval(timer); }, 10000);
  }
})();
