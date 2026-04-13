// =============================================================
// p365.js — Парсер Porno365 (Top) для AdultJS / Lampa
// Version  : 1.2.5 (Stable)
// =============================================================

(function () {
  'use strict';

  var NAME = 'p365';
  var HOST = 'https://top.porno365tube.win'; // Обязательно с https://

  var CATEGORIES = [
    { title: '🔥 HD порно',    slug: 'hd-porno' },
    { title: '🔞 Анал',       slug: 'anal' },
    { title: '👧 Молодые',    slug: 'molodye' },
    { title: '👱 Блондинки',   slug: 'blondinki' },
    { title: '🍭 Минет',      slug: 'minet' },
    { title: '🍑 Большие жопы', slug: 'bolshie-jopy' },
    { title: '🇷🇺 Русское',    slug: 'russkoe' },
    { title: '👵 Зрелые',     slug: 'zrelye' },
    { title: '🤝 Измена',     slug: 'izmena' },
    { title: '🏠 Домашнее',   slug: 'domashnee' }
  ];

  // ----------------------------------------------------------
  // СЕТЕВОЙ ЗАПРОС
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    // Защита: гарантируем наличие протокола перед отправкой в Worker
    if (url.indexOf('http') !== 0) {
      url = HOST + (url.startsWith('/') ? '' : '/') + url;
    }

    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function(r){ return r.text(); }).then(success).catch(error);
    }
  }

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL
  // ----------------------------------------------------------
  function buildUrl(path, page, query) {
    var url = HOST;
    if (query) {
      url += '/search/?q=' + encodeURIComponent(query);
      if (page > 1) url += '&from=' + page; 
    } else if (path && path !== NAME && path !== 'main') {
      url += '/categories/' + path + '/' + (page > 1 ? page : '');
    } else {
      url += (page > 1 ? '/' + page : '/');
    }
    return url;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    var results = [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.video-block'); 

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var a = el.querySelector('a[href*="/videos/"]');
      if (!a) continue;

      var href = a.getAttribute('href');
      if (href.indexOf('http') !== 0) {
          href = HOST + (href.startsWith('/') ? '' : '/') + href;
      }

      var img = el.querySelector('img');
      var pic = '';
      if (img) {
        pic = img.getAttribute('data-src') || img.getAttribute('src') || '';
        if (pic && pic.indexOf('http') !== 0) {
            pic = HOST + (pic.startsWith('/') ? '' : '/') + pic;
        }
      }

      var titleEl = el.querySelector('.title');
      var name = titleEl ? titleEl.textContent.trim() : (img ? img.getAttribute('alt') : 'No Title');

      var durEl = el.querySelector('.duration');
      var time = durEl ? durEl.textContent.trim() : '';

      results.push({
        name: name,
        video: href,
        picture: pic,
        img: pic,
        poster: pic,
        background_image: pic,
        time: time,
        quality: 'HD',
        json: true,
        source: NAME
      });
    }
    return results;
  }

  // ----------------------------------------------------------
  // РОУТИНГ
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      var query = decodeURIComponent(searchMatch[1]);
      fetchPage(buildUrl(null, page, query), page, success, error);
      return;
    }

    if (url.indexOf(NAME + '/cat/') === 0) {
      var cat = url.replace(NAME + '/cat/', '').split('?')[0];
      fetchPage(buildUrl(cat, page), page, success, error);
      return;
    }

    fetchPage(buildUrl(null, page), page, success, error);
  }

  function fetchPage(fetchUrl, page, success, error) {
    httpGet(fetchUrl, function (html) {
      var results = parsePlaylist(html);
      if (!results.length) {
        error('Ничего не найдено');
        return;
      }
      success({
        results: results,
        collection: true,
        total_pages: page + 1,
        menu: buildMenu()
      });
    }, error);
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новинки', playlist_url: NAME + '/main' },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        })
      }
    ];
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ ВИДЕО (QUALITIES)
  // ----------------------------------------------------------
    // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ ВИДЕО (QUALITIES) — ПОЛНАЯ ВЕРСИЯ
  // ----------------------------------------------------------
      function getQualities(videoUrl, success, error) {
    httpGet(videoUrl, function (html) {
      var q = {};

      // 1. Ищем прямую ссылку на CDN (обычно 720p в мета-тегах)
      var directMatch = html.match(/https?:\/\/uch\d+\.vids69\.com\/[^"'\s]+\.mp4/);
      if (directMatch) {
          q['720p (Direct CDN)'] = directMatch[0];
      }

      // 2. Ищем ссылки через плеер (те самые /get_file/...)
      var highMatch = html.match(/setVideoUrlHigh\(['"]([^'"]+)['"]/);
      var lowMatch  = html.match(/setVideoUrlLow\(['"]([^'"]+)['"]/);
      var hlsMatch  = html.match(/setVideoHlsUrl\(['"]([^'"]+)['"]/);

      if (hlsMatch)  q['HLS (Auto)'] = hlsMatch[1];
      if (highMatch) q['720p (Server)'] = highMatch[1];
      if (lowMatch)  q['480p (Server)'] = lowMatch[1];

      // 3. Обработка всех найденных ссылок
      for (var key in q) {
        var link = q[key].replace(/\\\//g, '/').trim();

        // Если ссылка относительная (как /get_file/...), добавляем HOST
        if (link.indexOf('http') !== 0) {
          if (link.indexOf('//') === 0) link = 'https:' + link;
          else link = HOST + (link.startsWith('/') ? '' : '/') + link;
        }
        
        q[key] = link;
      }

      if (Object.keys(q).length > 0) {
        success({ qualities: q });
      } else {
        error('Видео не найдено');
      }
    }, error);
  }
  // ----------------------------------------------------------
  // ИНТЕРФЕЙС ПАРСЕРА
  // ----------------------------------------------------------
  var P365Parser = {
    main: function (params, success, error) {
      routeView(NAME + '/main', 1, success, error);
    },
    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },
    search: function (params, success, error) {
      var query = (params.query || '').trim();
      fetchPage(buildUrl(null, params.page || 1, query), params.page || 1, function (data) {
        data.title = 'P365: ' + query;
        success(data);
      }, error);
    },
    qualities: function (url, success, error) {
      getQualities(url, success, error);
    }
  };

  if (window.AdultPlugin && window.AdultPlugin.registerParser) {
    window.AdultPlugin.registerParser(NAME, P365Parser);
  }
})();
