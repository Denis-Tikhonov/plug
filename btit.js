// =============================================================
// btit.js — Парсер BigTitsLust для AdultJS (Lampa)
// =============================================================
// Версия  : 1.2.1
// Изменения:
//   [1.2.1] Улучшен поиск remote_control.php:
//     - Поиск в flashvars (flashvars.remote_control, flashvars.video_url)
//     - Поиск в любых JS переменных и JSON
//     - Прямой поиск URL с remote_control.php в HTML
//     - fallback на .mp4 минуя get_file
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.2.1';
  var NAME    = 'btit';
  var HOST    = 'https://www.bigtitslust.com';
  var TAG     = '[' + NAME + ']';

  var WORKER_URL = 'https://zonaproxy.777b737.workers.dev';

  var CATEGORIES = [
    { title: '🌟 Новинки',          slug: ''                    },
    { title: '🔥 Популярное',        slug: 'most-popular'        },
    { title: '🍒 Big Tits',         slug: 'big-tits'            },
    { title: '🍑 Big Ass',          slug: 'big-ass'             },
    { title: '🌺 MILF',             slug: 'milf'                },
    { title: '👧 Teen (18+)',       slug: 'teen'                },
    { title: '👱 Blonde',           slug: 'blonde'              },
    { title: '🍑 Brunette',         slug: 'brunette'            },
    { title: '💦 Anal',             slug: 'anal'                },
    { title: '👅 Blowjob',          slug: 'blowjob'             },
    { title: '🌏 Asian',            slug: 'asian'               },
    { title: '💪 Hardcore',         slug: 'hardcore'            },
    { title: '👫 Lesbian',          slug: 'lesbian'             },
    { title: '📹 POV',              slug: 'pov'                 },
    { title: '💎 HD',               slug: 'hd'                  },
  ];

  // ----------------------------------------------------------
  // ТРАНСПОРТ
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  function httpGetJson(url, success, error) {
    httpGet(url, function (text) {
      try { success(JSON.parse(text)); } catch (e) { error('JSON: ' + e.message); }
    }, error);
  }

  // ----------------------------------------------------------
  // getWorkerBase()
  // ----------------------------------------------------------
  function getWorkerBase() {
    var base = WORKER_URL;
    if (window.AdultPlugin && window.AdultPlugin.workerUrl) {
      base = window.AdultPlugin.workerUrl;
    }
    return base.replace(/[/?&]url=?$/, '').replace(/\/+$/, '');
  }

  // ----------------------------------------------------------
  // cleanUrl — для постеров и страниц (НЕ для видео)
  // ----------------------------------------------------------
  function cleanUrl(u) {
    if (!u) return '';
    u = u.replace(/\\\//g, '/').replace(/\\/g, '').trim();
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА
  // JSON: cardSelector=".item"
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    var results = [];
    var doc     = new DOMParser().parseFromString(html, 'text/html');
    var items   = doc.querySelectorAll('.item');
    console.log(TAG, 'parsePlaylist → .item:', items.length);

    items.forEach(function (el) {
      var a = el.querySelector('a[href*="/videos/"]');
      if (!a) return;

      var href = cleanUrl(a.getAttribute('href') || '');
      if (!href) return;

      var img = el.querySelector('img');
      var pic = img
        ? cleanUrl(img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('src') || '')
        : '';

      var titleEl = el.querySelector('.title, a[title]');
      var name    = (titleEl
        ? (titleEl.getAttribute('title') || titleEl.textContent)
        : a.textContent
      ).replace(/\s+/g, ' ').trim() || 'Video';

      var durEl = el.querySelector('.duration');
      var time  = durEl ? durEl.textContent.trim() : '';

      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time: time, quality: 'HD', json: true, source: NAME,
      });
    });

    console.log(TAG, 'parsePlaylist → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // extractQualities(html)
  //
  // [1.2.1] Улучшенный поиск remote_control.php
  // ----------------------------------------------------------
  // ----------------------------------------------------------
   qualities: function (videoPageUrl, success, error) {
    console.log(TAG, 'qualities() →', videoPageUrl);

    // Используем Worker для загрузки страницы (ОДИН РАЗ)
    var proxyUrl = getWorkerBase() + '/?url=' + encodeURIComponent(videoPageUrl);
    console.log(TAG, 'загружаем через прокси:', proxyUrl);

    httpGet(proxyUrl, function (html) {
        console.log(TAG, 'html длина:', html.length);
        if (!html || html.length < 500) {
            error('html < 500');
            return;
        }

        extractQualities(html, videoPageUrl, success, error);
     }, error);
   },

  // ----------------------------------------------------------
  // URL BUILDER
  // ----------------------------------------------------------
  function buildUrl(type, value, page) {
    var url = HOST;
    page    = parseInt(page, 10) || 1;
    if (type === 'search') {
      url += '/search/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'cat' && value) {
      url += '/' + value + '/';
      if (page > 1) url += '?page=' + page;
    } else {
      if (page > 1) url += '/?page=' + page;
    }
    return url;
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новинки', playlist_url: NAME + '/new' },
      {
        title: '📂 Категории', playlist_url: 'submenu',
        submenu: CATEGORIES.filter(function (c) { return c.slug; }).map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТИНГ
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var fetchUrl;
    var sm = url.match(/[?&]search=([^&]*)/);

    if (sm) {
      fetchUrl = buildUrl('search', decodeURIComponent(sm[1]), page);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      fetchUrl = buildUrl('cat', url.replace(NAME + '/cat/', '').split('?')[0], page);
    } else if (url.indexOf(NAME + '/search/') === 0) {
      var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      fetchUrl = buildUrl('search', q, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log(TAG, 'routeView →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      console.log(TAG, 'html длина:', html.length);
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }
      success({ results: results, collection: true, total_pages: page + 1, menu: buildMenu() });
    }, error);
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var BtitParser = {

    main: function (p, s, e) { routeView(NAME + '/new', 1, s, e); },
    view: function (p, s, e) { routeView(p.url || NAME, p.page || 1, s, e); },

    search: function (p, s, e) {
      var q = (p.query || '').trim();
      httpGet(buildUrl('search', q, p.page || 1), function (html) {
        s({ title: 'BigTitsLust: ' + q, results: parsePlaylist(html), collection: true, total_pages: 2 });
      }, e);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);

      // Используем Worker прокси для загрузки страницы
      var proxyUrl = getWorkerBase() + '/?url=' + encodeURIComponent(videoPageUrl);
      console.log(TAG, 'загружаем через прокси:', proxyUrl);

      httpGet(proxyUrl, function (html) {
        console.log(TAG, 'html длина:', html.length);
        if (!html || html.length < 500) { 
          error('html < 500'); 
          return; 
        }

        // Диагностика для отладки
        console.log(TAG, 'remote_control cnt:', (html.match(/remote_control/gi) || []).length);
        console.log(TAG, 'video_url cnt:',      (html.match(/video_url/gi)      || []).length);
        console.log(TAG, 'get_file cnt:',       (html.match(/get_file/gi)       || []).length);
        console.log(TAG, '.mp4 cnt:',           (html.match(/\.mp4/gi)          || []).length);
        console.log(TAG, 'flashvars cnt:',      (html.match(/flashvars/gi)      || []).length);

        extractQualities(html, videoPageUrl, success, error);

      }, error);
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BtitParser);
      console.log(TAG, 'v' + VERSION + ' зарегистрирован');
      return true;
    }
    return false;
  }
  if (!tryRegister()) {
    var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }

})();
