// =============================================================
// btit.js — Парсер BigTitsLust для AdultJS (Lampa)
// =============================================================
// Версия  : 1.3.1
//   [1.3.1] Категории: /categories/{slug}/ (не /{slug}/)
//   [1.3.0] video_url+token; сырые URL (SS proxy); не резать query
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.3.1';
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
  // cleanUrl
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
  // extractQualities — ПОИСК ВИДЕО URL
  // ----------------------------------------------------------
    // ----------------------------------------------------------
  // extractQualities — ПОИСК ВИДЕО URL
  // ----------------------------------------------------------
  function extractQualities(html, videoPageUrl, success, error) {
    var q = {};
    console.log(TAG, 'extractQualities START html=', html.length);

    function add(label, url) {
      if (!url) return;
      url = cleanUrl(url);
      if (!url || url.indexOf('http') !== 0) return;
      if (url.indexOf('{') !== -1) return;
      if (!q[label]) q[label] = url;
    }
    function lab(u) {
      var m = u.match(/_(\d{3,4})p\.mp4/i);
      return m ? m[1] + 'p' : 'HD';
    }

    // S0: video_url / video_alt_url (полный v-acctoken!)
    var reVu = /video(?:_alt)?_url(?:_text)?\s*[:=]\s*['"]([^'"]+)['"]/gi;
    var mm;
    while ((mm = reVu.exec(html)) !== null) {
      add(lab(mm[1]), mm[1]);
    }

    // S1: get_file ... mp4 ... (с query)
    if (!Object.keys(q).length) {
      var reGf = /https?:\/\/[^"'\s<>]+\/get_file\/[^"'\s<>]*?\.mp4[^"'\s<>]*/gi;
      while ((mm = reGf.exec(html)) !== null) {
        if (mm[0].indexOf('download=') !== -1) continue;
        add(lab(mm[0]), mm[0]);
      }
    }

    // S2: remote_control.php
    if (!Object.keys(q).length) {
      var reRc = /https?:\/\/media\d+\.bigtitslust\.com\/remote_control\.php\?[^"'\s<>]+/gi;
      while ((mm = reRc.exec(html)) !== null) {
        add('HD', mm[0]);
      }
    }

    // S3: flashvars remote_control
    if (!Object.keys(q).length) {
      var fm = html.match(/remote_control\s*:\s*['"]([^'"]+)['"]/i);
      if (fm) add('HD', fm[1]);
    }

    var keys = Object.keys(q);
    console.log(TAG, 'qualities keys', keys.length, JSON.stringify(keys));
    if (keys.length) {
      // сырые URL — SS.js proxyVideoUrl + Worker cookie/redirect
      success({ qualities: q });
    } else {
      console.error(TAG, 'поток не найден');
      error('BigTitsLust: видео не найдено');
    }
  }

  // ----------------------------------------------------------
  // URL BUILDER  // URL BUILDER
  // ----------------------------------------------------------
  function buildUrl(type, value, page) {
    var url = HOST;
    page    = parseInt(page, 10) || 1;
    if (type === 'search') {
      url += '/search/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'cat' && value) {
      // most-popular / latest на корне; остальное — /categories/{slug}/
      var root = { 'most-popular': 1, 'latest-updates': 1, 'top-rated': 1 };
      if (root[value]) url += '/' + value + '/';
      else url += '/categories/' + value + '/';
      if (page > 1) url += page + '/';
    } else {
      // новинки
      if (page > 1) url += '/latest-updates/' + page + '/';
      else url += '/latest-updates/';
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
      // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var BtitParser = {

    main: function (p, s, e) { routeView(NAME + '/latest', 1, s, e); },
    view: function (p, s, e) { routeView(p.url || NAME, p.page || 1, s, e); },

    search: function (p, s, e) {
      var q = (p.query || '').trim();
      httpGet(buildUrl('search', q, p.page || 1), function (html) {
        s({ title: 'BigTitsLust: ' + q, results: parsePlaylist(html), collection: true, total_pages: 2 });
      }, e);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log(TAG, 'html длина:', html.length);
        
        console.log(TAG, 'HTML начало:', html.substring(0, 500));
        
        if (!html || html.length < 500) { 
          error('html < 500'); 
          return; 
        }

        console.log(TAG, 'remote_control cnt:', (html.match(/remote_control/gi) || []).length);
        console.log(TAG, 'get_file cnt:', (html.match(/get_file/gi) || []).length);
        console.log(TAG, '.mp4 cnt:', (html.match(/\.mp4/gi) || []).length);
        console.log(TAG, 'flashvars cnt:', (html.match(/flashvars/gi) || []).length);

        extractQualities(html, videoPageUrl, success, error);
      }, error);
    },
  };  // ← ВАЖНО: закрывающая скобка объекта!

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
