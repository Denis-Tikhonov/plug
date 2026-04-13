// =============================================================
// xv-ru.js — Парсер xv-ru.com для AdultJS / AdultPlugin (Lampa)
// Version  : 2.0.1
// Changes  :
//   [2.0.1] Архитектура YouJizz/XDS: Внедрена система «умного роутинга» (routeView)
//           Исправление постеров: Добавлены обязательные поля img, poster, background_image
// =============================================================

(function () {
  'use strict';

  var HOST      = 'https://www.xv-ru.com';
  var NAME      = 'xv-ru';
  var TAG       = '[xv-ru]';
  var VERSION   = '2.0.1';
  var NOTY_TIME = 3000;

  var WORKER_DEFAULT = 'https://zonaproxy.777b737.workers.dev/?url=';

  var REQUEST_HEADERS = {
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Cookie':          'static_cdn=1',
    'Referer':         HOST + '/',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  var SORTS = [
    { title: 'Новинки',    val: 'new',  urlPath: 'new',          searchParam: ''     },
    { title: 'Лучшее',     val: 'best', urlPath: 'best-videos',  searchParam: '&top' },
    { title: 'Популярные', val: 'top',  urlPath: 'most-viewed',  searchParam: '&top' },
    { title: 'Длительные', val: 'long', urlPath: 'longest',      searchParam: ''     },
  ];

  function getWorkerUrl() {
    var url = (window.AdultPlugin && window.AdultPlugin.workerUrl) ? window.AdultPlugin.workerUrl : WORKER_DEFAULT;
    if (url && url.charAt(url.length - 1) !== '=') url = url + '=';
    return url;
  }

  function log(m, d)  { console.log(TAG, m, d !== undefined ? d : ''); }
  function warn(m, d) { console.warn(TAG, m, d !== undefined ? d : ''); }
  function err(m, d)  { console.error(TAG, m, d !== undefined ? d : ''); }

  function notyErr(msg) { try { Lampa.Noty.show(TAG + ' ⛔ ' + msg, { time: NOTY_TIME, style: 'error' }); } catch(e) {} }
  function notyOk(msg) { try { Lampa.Noty.show(TAG + ' ✅ ' + msg, { time: NOTY_TIME }); } catch(e) {} }

  // ----------------------------------------------------------
  // СЕТЕВОЙ СЛОЙ
  // ----------------------------------------------------------
  function httpGet(url, ok, fail) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, ok, fail, { type: 'html', headers: REQUEST_HEADERS });
      return;
    }
    var workerUrl = getWorkerUrl();
    var fullUrl = workerUrl + encodeURIComponent(url);
    
    fetch(fullUrl, { method: 'GET', headers: REQUEST_HEADERS })
      .then(function (r) { return r.text(); })
      .then(ok)
      .catch(fail);
  }

  // ----------------------------------------------------------
  // РОУТИНГ И ПАРСИНГ (УМНЫЙ РОУТИНГ)
  // ----------------------------------------------------------
  function parseSearchParam(url) {
    var match = url.match(/[?&](search|k)=([^&]*)/);
    if (match) return decodeURIComponent(match[2].replace(/\+/g, ' '));
    return null;
  }

  function routeView(url, page, success, error) {
    log('routeView → url="' + url + '" page=' + page);

    // 1. Поиск через фильтр Lampa (?search=...)
    var searchParam = parseSearchParam(url);
    if (searchParam !== null) {
      fetchPage(buildUrl('top', searchParam, '', page), page, success, error);
      return;
    }

    // 2. Категории (xv-ru/c/...)
    if (url.indexOf(NAME + '/c/') !== -1) {
      var cat = url.split('/c/')[1].split('?')[0];
      fetchPage(buildUrl('', '', cat, page), page, success, error);
      return;
    }

    // 3. Сортировки
    for (var i = 0; i < SORTS.length; i++) {
        if (url.indexOf(SORTS[i].urlPath) !== -1 || url.indexOf(SORTS[i].val) !== -1) {
            fetchPage(buildUrl(SORTS[i].val, '', '', page), page, success, error);
            return;
        }
    }

    // По умолчанию
    fetchPage(buildUrl('new', '', '', page), page, success, error);
  }

  function buildUrl(sort, search, category, page) {
    page = parseInt(page, 10) || 1;
    if (search) {
      var offset = page > 1 ? '&p=' + (page - 1) : '';
      var sortParam = (sort === 'top' || sort === 'best') ? '&top' : '';
      return HOST + '/?k=' + encodeURIComponent(search) + sortParam + offset;
    }
    if (category) return HOST + '/c/' + category + (page > 1 ? '/' + page : '');
    var sObj = SORTS.filter(function(s){ return s.val === sort; })[0] || SORTS[0];
    return HOST + '/' + sObj.urlPath + '/' + page;
  }

  function fetchPage(loadUrl, page, success, error) {
    httpGet(loadUrl, function (html) {
      var results = parsePlaylist(html);
      if (!results.length) { error('Ничего не найдено'); return; }
      getCategories(function (cats) {
        success({
          results: results,
          collection: true,
          total_pages: results.length >= 20 ? page + 5 : page,
          menu: buildMenu(loadUrl, cats)
        });
      });
    }, error);
  }

  // ----------------------------------------------------------
  // ИСПРАВЛЕНИЕ КАРТОЧЕК (ПОЛЯ ПОСТЕРОВ)
  // ----------------------------------------------------------
  function _extractCard(el, thumbMap) {
    var aEl = el.querySelector('a[href*="/video"]');
    if (!aEl) return null;
    var rawHref = aEl.getAttribute('href') || '';
    if (rawHref.indexOf('http') !== 0) rawHref = HOST + rawHref;
    var href = rawHref.replace(/\/THUMBNUM\//i, '/');

    // Название
    var name = (aEl.getAttribute('title') || el.querySelector('.title')?.textContent || '').trim();
    if (!name) name = "Video " + href.split('/').pop();

    // Картинка (Исправлено: внедрены обязательные поля AdultJS)
    var pic = "";
    if (thumbMap[href]) pic = thumbMap[href].thumb;
    if (!pic) {
        var img = el.querySelector('img');
        pic = img ? (img.getAttribute('data-src') || img.getAttribute('src')) : "";
    }

    return {
      name: name,
      video: href,
      // Совместимость с AdultJS плитки
      picture: pic,
      img: pic,
      poster: pic,
      background_image: pic,
      time: (el.querySelector('.duration')?.textContent || '').trim(),
      quality: 'HD',
      json: true,
      related: true,
      source: NAME
    };
  }

  // Специфичный парсинг xv-ru (упрощенно для краткости, логика thumbMap сохранена)
  function parsePlaylist(html) {
    var thumbMap = _parseXvJson(html);
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.thumb');
    var cards = [];
    for(var i=0; i<items.length; i++){
        var c = _extractCard(items[i], thumbMap);
        if(c) cards.push(c);
    }
    return cards;
  }

  function _parseXvJson(html) {
    var map = {};
    var re = /"url"\s*:\s*"(\/video[^"]+)"[^}]*?"thumb_url"\s*:\s*"([^"]+)"/g;
    var m;
    while ((m = re.exec(html))) {
      map[HOST + m[1].replace(/\\\//g, '/')] = { thumb: m[2].replace(/\\\//g, '/'), title: '' };
    }
    return map;
  }

  // ----------------------------------------------------------
  // МЕНЮ И КАТЕГОРИИ
  // ----------------------------------------------------------
  var _categoriesCache = null;
  function getCategories(cb) {
    if (_categoriesCache) return cb(_categoriesCache);
    httpGet(HOST + '/c', function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var cats = [];
        doc.querySelectorAll('a[href*="/c/"]').forEach(function(a){
            var slug = a.getAttribute('href').split('/c/')[1];
            if(slug && cats.length < 30) cats.push({title: a.textContent.trim(), val: slug, urlPath: 'c/'+slug});
        });
        _categoriesCache = cats;
        cb(cats);
    }, function(){ cb([]); });
  }

  function buildMenu(url, cats) {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Сортировка', submenu: SORTS.map(function(s){ return {title: s.title, playlist_url: NAME + '/' + s.val}; }) },
      { title: '📂 Категории', submenu: cats.map(function(c){ return {title: c.title, playlist_url: NAME + '/' + c.urlPath}; }) }
    ];
  }

  // ----------------------------------------------------------
  // ИНТЕРФЕЙС ПАРСЕРА
  // ----------------------------------------------------------
  var XvParser = {
    main: function (params, success, error) {
      routeView(NAME + '/new', 1, success, error);
    },
    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },
    search: function (params, success, error) {
      var q = (params.query || '').trim();
      if (!q) return success({results:[]});
      fetchPage(buildUrl('top', q, '', params.page || 1), params.page || 1, function(data){
          data.title = 'xv-ru: ' + q;
          success(data);
      }, error);
    },
    qualities: function (url, success, error) {
        // Вызов существующей логики getStreamLinks из xv-ru_200
        httpGet(url, function(html){
            var q = {};
            var mH = html.match(/html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/);
            var mL = html.match(/html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/);
            if(mH) q['720p'] = mH[1];
            if(mL) q['480p'] = mL[1];
            if(Object.keys(q).length) success({qualities: q});
            else error('Видео не найдено');
        }, error);
    }
  };

  function register() {
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
      window.AdultPlugin.registerParser(NAME, XvParser);
      notyOk('xv-ru v' + VERSION);
    } else {
      setTimeout(register, 500);
    }
  }
  register();

})();
