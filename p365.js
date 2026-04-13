// =============================================================
// p365.js — Парсер Porno365 для AdultJS / AdultPlugin (Lampa)
// Version  : 1.0.0
// Architecture: YouJizz/XDS Routing System
// =============================================================

(function () {
  'use strict';

  var NAME = 'p365';
  var HOST = 'https://top.porno365tube.win';

  var CATS = [
    { title: 'HD порно', slug: 'hd-porno' },
    { title: 'Русское', slug: 'russkoe' },
    { title: 'Молодые', slug: 'molodye' },
    { title: 'Анал', slug: 'anal' },
    { title: 'Домашнее', slug: 'domashnee' },
    { title: 'Блондинки', slug: 'blondinki' },
    { title: 'Большие сиськи', slug: 'bolshie-siski' },
    { title: 'Инцест', slug: 'incest' },
    { title: 'Минет', slug: 'minet' },
    { title: 'Зрелые', slug: 'zrelye' },
    { title: 'Мастурбация', slug: 'masturbaciya' },
    { title: 'Секс втроем', slug: 'seks-vtroem' }
  ];

  // ----------------------------------------------------------
  // NETWORK
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

  // ----------------------------------------------------------
  // URL BUILDERS
  // ----------------------------------------------------------
  function buildUrl(type, query, page) {
    var url = HOST + '/';
    if (type === 'search' && query) {
      url += '?q=' + encodeURIComponent(query);
    } else if (type === 'cat' && query) {
      url += 'categories/' + query;
    }
    
    if (page > 1) {
      // Судя по JSON pagination pattern "/2257", сайт может использовать специфичный роутинг страниц
      url += (url.indexOf('?') > -1 ? '&' : '/') + page;
    }
    return url;
  }

  // ----------------------------------------------------------
  // PARSER
  // ----------------------------------------------------------
  function parseCards(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.video-block');
    var results = [];

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var a = el.querySelector('a[href*="/videos/"]');
      var img = el.querySelector('img');
      if (!a || !img) continue;

      var title = (img.getAttribute('alt') || el.querySelector('.title').textContent || '').trim();
      var poster = img.getAttribute('data-src') || img.getAttribute('src') || '';
      if (poster && poster.indexOf('http') !== 0) poster = HOST + poster;

      var href = a.getAttribute('href');
      if (href.indexOf('http') !== -1) { /* ok */ } else href = HOST + href;

      var durEl = el.querySelector('.duration');

      results.push({
        name: title,
        video: href,
        // Обязательные поля для AdultJS v2
        picture: poster,
        img: poster,
        poster: poster,
        background_image: poster,
        time: durEl ? durEl.textContent.trim() : '',
        quality: 'HD',
        json: true,
        source: NAME
      });
    }
    return results;
  }

  // ----------------------------------------------------------
  // ROUTING (Architecture: YouJizz/XDS)
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      {
        title: '🔍 Поиск',
        search_on: true,
        playlist_url: NAME + '/search/'
      },
      {
        title: '🆕 Новинки',
        playlist_url: NAME + '/new'
      },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATS.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        })
      }
    ];
  }

  function parseSearchParam(url) {
    var m = url.match(/[?&]search=([^&]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function routeView(url, page, success, error) {
    var searchParam = parseSearchParam(url);
    
    // 1. Прямой поиск через фильтр Lampa
    if (searchParam !== null) {
      fetchPage(buildUrl('search', searchParam, page), page, success, error);
      return;
    }

    // 2. Роутинг категорий
    if (url.indexOf(NAME + '/cat/') === 0) {
      var slug = url.split('/cat/')[1].split('?')[0];
      fetchPage(buildUrl('cat', slug, page), page, success, error);
      return;
    }

    // 3. Роутинг поиска по URL пути
    if (url.indexOf(NAME + '/search/') === 0) {
      var query = url.split('/search/')[1].split('?')[0];
      fetchPage(buildUrl('search', decodeURIComponent(query), page), page, success, error);
      return;
    }

    // 4. По умолчанию - главная
    fetchPage(buildUrl('new', '', page), page, success, error);
  }

  function fetchPage(loadUrl, page, success, error) {
    httpGet(loadUrl, function (html) {
      var cards = parseCards(html);
      if (!cards.length) return error('Видео не найдены');
      
      success({
        results: cards,
        collection: true,
        total_pages: page + 1,
        menu: buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // INTERFACE
  // ----------------------------------------------------------
  var Parser365 = {
    main: function (params, success, error) {
      routeView(NAME + '/new', 1, success, error);
    },
    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },
    search: function (params, success, error) {
      var q = (params.query || '').trim();
      if (!q) return success({ results: [] });
      fetchPage(buildUrl('search', q, params.page || 1), params.page || 1, function (data) {
        data.title = 'P365: ' + q;
        success(data);
      }, error);
    },
    qualities: function (videoUrl, success, error) {
      httpGet(videoUrl, function (html) {
        var q = {};
        // Поиск по видео-тегам или мета-данным из анализа JSON
        var re = /<video[^>]*src="([^"]+)"/g;
        var m, i = 0;
        var labels = ['480p', 'Preview', '720p', '1080p']; // Условный порядок
        while ((m = re.exec(html)) !== null) {
           var link = m[1];
           if (link.indexOf('http') !== 0) link = HOST + link;
           var label = link.match(/(\d{3,4})\.mp4/) ? link.match(/(\d{3,4})\.mp4/)[1] + 'p' : labels[i] || 'Alt';
           q[label] = link;
           i++;
        }
        
        if (Object.keys(q).length) success({ qualities: q });
        else error('Потоки не найдены');
      }, error);
    }
  };

  function register() {
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
      window.AdultPlugin.registerParser(NAME, Parser365);
      console.log('Parser P365 (Porno365) registered');
    } else {
      setTimeout(register, 500);
    }
  }
  register();

})();
