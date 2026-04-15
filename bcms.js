// =============================================================
// bcms.js — Парсер BongaCams для AdultJS (Lampa)
// Version  : 2.1.0
// Based on : phub_210 (архитектура) + arch (данные о сайте)
// =============================================================

(function () {
  'use strict';

  var NAME = 'bcms';
  var HOST = 'https://ukr.bongacams.com';

  // Категории из актуального дампа (json/arch)
  var CATS = [
    { title: 'Новые',          val: 'new-models' },
    { title: 'Девушки',        val: 'female' },
    { title: 'Пары',           val: 'couples' },
    { title: 'Парни',          val: 'male' },
    { title: 'Транссексуалы',  val: 'trans' },
    { title: 'Украинские',     val: 'tags/ukrainian' },
  ];

  // ----------------------------------------------------------
  // Сетевой запрос с обходом Age Gate (Cookie: disclaimer=усі)
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      // Передаем куки для прохождения проверки возраста
      var params = {
        headers: {
          'Cookie': 'disclaimer=усі'
        }
      };
      window.AdultPlugin.networkRequest(url, success, error, params);
    } else {
      fetch(url, { headers: { 'Cookie': 'disclaimer=усі' } })
        .then(function (r) { return r.text(); })
        .then(success)
        .catch(error);
    }
  }

  function extract(str, regex, group) {
    var g = (group === undefined) ? 1 : group;
    var m = str.match(regex);
    return (m && m[g]) ? m[g].trim() : null;
  }

  // ----------------------------------------------------------
  // Парсинг плейлиста (Live-камеры)
  // ----------------------------------------------------------
  function parseCards(html) {
    var results = [];
    if (!html) return results;

    // Разбиваем HTML по блокам камер (используем аттрибуты из arch)
    var blocks = html.split(/class="(ls_thumb js-ls_thumb|mls_item mls_so_)"/);

    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      
      var chathost = extract(block, /data-chathost="([^"]+)"/);
      var esid = extract(block, /data-esid="([^"]+)"/);
      if (!chathost || !esid) continue;

      // Извлечение превью
      var pic = extract(block, /this\.src='\/\/([^']+\.jpg)'/) || 
                extract(block, /src="\/\/([^"]+)"/);
      if (pic) pic = 'https://' + pic.replace(/\\/g, '');

      // Имя модели или заголовок комнаты
      var name = extract(block, /lst_topic lst_data">(.*?)</) || 
                 extract(block, /class="model_name">([^<]+)/) || 
                 chathost;

      // Качество
      var quality = '';
      if (block.indexOf('__hd_plus') !== -1) quality = 'HD+';
      else if (block.indexOf('__hd') !== -1) quality = 'HD';

      // Прямая ссылка на HLS поток (стандартная для BC)
      var videoUrl = 'https://' + esid + '.bcvcdn.com/hls/stream_' + chathost + 
                     '/public-aac/stream_' + chathost + '/chunks.m3u8';

      results.push({
        name:    name.replace(/&amp;/g, '&'),
        video:   videoUrl,
        picture: pic,
        img:     pic,
        quality: quality,
        json:    false, // HLS ссылка готова сразу
        source:  NAME
      });
    }
    return results;
  }

  // ----------------------------------------------------------
  // Построение URL
  // ----------------------------------------------------------
  function buildUrl(cat, page, query) {
    var p = (parseInt(page, 10) || 1);
    var url = HOST;

    if (query) {
      url += '/?q=' + encodeURIComponent(query);
    } else if (cat && cat !== NAME) {
      url += '/' + cat;
    }

    if (p > 1) {
      url += (url.indexOf('?') !== -1 ? '&' : '?') + 'page=' + p;
    }
    return url;
  }

  function buildMenu() {
    return [
      { title: 'Поиск моделей', search_on: true, playlist_url: NAME + '/search/' },
      {
        title: 'Категории',
        playlist_url: 'submenu',
        submenu: CATS.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.val };
        })
      }
    ];
  }

  // ----------------------------------------------------------
  // Роутинг
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var cat = null;
    var query = null;

    if (url.indexOf(NAME + '/cat/') === 0) {
      cat = url.replace(NAME + '/cat/', '');
    } else if (url.indexOf(NAME + '/search/') === 0) {
      query = url.replace(NAME + '/search/', '').split('?')[0];
    }

    var fetchUrl = buildUrl(cat, page, query);

    httpGet(fetchUrl, function (html) {
      var cards = parseCards(html);
      if (!cards.length && html.indexOf('id="turnstile-wrapper"') !== -1) {
        error('Доступ ограничен Cloudflare. Попробуйте обновить плагин или использовать VPN.');
        return;
      }
      success({
        results:     cards,
        collection:  true,
        total_pages: cards.length >= 30 ? page + 1 : page,
        menu:        buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // Публичный интерфейс
  // ----------------------------------------------------------
  var BcmsParser = {
    main: function (params, success, error) {
      routeView(NAME, 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var fetchUrl = buildUrl(null, params.page || 1, query);
      httpGet(fetchUrl, function (html) {
        var cards = parseCards(html);
        success({
          title:       'BC: ' + query,
          results:     cards,
          collection:  true,
          total_pages: cards.length >= 30 ? (params.page || 1) + 1 : 1
        });
      }, error);
    }
  };

  // Регистрация
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BcmsParser);
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var poll = setInterval(function () {
      if (tryRegister()) clearInterval(poll);
    }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }

})();
