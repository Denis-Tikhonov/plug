// =============================================================
// hdtub.js — HDtube Parser для AdultJS (Lampa)
// =============================================================
// Версия  : 1.1.0
// Изменения:
//   [1.1.0] Исправлено по JSON-анализу:
//           - [FIX] URL категорий: slug.porn → /?c={slug} (JSON: urlScheme.category)
//           - [FIX] Карточки: json:true + link заполняется, video:'' при парсинге каталога
//           - [FIX] cleanUrl: добавлен unescape backslash (JSON: urlFormat.backslashEscaped=true)
//           - [FIX] getHtml: перебор прямой → Worker (CORS-fallback)
//           - [FIX] Worker URL прокидывается через WORKER_URL константу
//   [1.0.0] Базовый парсер hdtube.porn
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // КОНФИГ
  // ----------------------------------------------------------
  var VERSION  = '1.1.0';
  var NAME     = 'hdtub';
  var BASE_URL = 'https://www.hdtube.porn';
  // Worker из W137.js — замените на свой URL
  var WORKER_URL = 'https://your-worker.workers.dev';

  // ----------------------------------------------------------
  // КАТЕГОРИИ
  // JSON: urlScheme.category.pattern = "https://www.hdtube.porn/?c={slug}"
  // ----------------------------------------------------------
  var CATEGORIES = [
    { title: 'Amateur',            slug: 'amateur' },
    { title: 'Anal',               slug: 'anal' },
    { title: 'Asian',              slug: 'asian' },
    { title: 'Babe',               slug: 'babe' },
    { title: 'BBW',                slug: 'bbw' },
    { title: 'BDSM',               slug: 'bdsm' },
    { title: 'Big Ass',            slug: 'big-ass' },
    { title: 'Big Cock',           slug: 'big-cock' },
    { title: 'Big Tits',           slug: 'big-tits' },
    { title: 'Bisexual',           slug: 'bisexual' },
    { title: 'Black',              slug: 'black' },
    { title: 'Blonde',             slug: 'blonde' },
    { title: 'Blowjob',            slug: 'blowjob' },
    { title: 'Bondage',            slug: 'bondage' },
    { title: 'Brunette',           slug: 'brunette' },
    { title: 'Close Up',           slug: 'close-up' },
    { title: 'College',            slug: 'college' },
    { title: 'Creampie',           slug: 'creampie' },
    { title: 'Cuckold',            slug: 'cuckold' },
    { title: 'Cumshot',            slug: 'cumshot' },
    { title: 'Doggystyle',         slug: 'doggystyle' },
    { title: 'Double Penetration', slug: 'double-penetration' },
    { title: 'Ebony',              slug: 'ebony' },
    { title: 'Erotic',             slug: 'erotic' },
    { title: 'Facial',             slug: 'facial' },
    { title: 'Femdom',             slug: 'femdom' },
    { title: 'Fetish',             slug: 'fetish' },
    { title: 'Fingering',          slug: 'fingering' },
    { title: 'Fisting',            slug: 'fisting' },
    { title: 'Gangbang',           slug: 'gangbang' },
    { title: 'Gloryhole',          slug: 'gloryhole' },
    { title: 'Granny',             slug: 'granny' },
    { title: 'Group',              slug: 'group' },
    { title: 'Hairy',              slug: 'hairy' },
    { title: 'Handjob',            slug: 'handjob' },
    { title: 'Hardcore',           slug: 'hardcore' },
    { title: 'Homemade',           slug: 'homemade' },
    { title: 'Indian',             slug: 'indian' },
    { title: 'Interracial',        slug: 'interracial' },
    { title: 'Japanese',           slug: 'japanese' },
    { title: 'Latina',             slug: 'latina' },
    { title: 'Lesbian',            slug: 'lesbian' },
    { title: 'Lingerie',           slug: 'lingerie' },
    { title: 'Massage',            slug: 'massage' },
    { title: 'Masturbation',       slug: 'masturbation' },
    { title: 'Mature',             slug: 'mature' },
    { title: 'MILF',               slug: 'milf' },
    { title: 'Natural',            slug: 'natural' },
    { title: 'Orgy',               slug: 'orgy' },
    { title: 'Outdoor',            slug: 'outdoor' },
    { title: 'Party',              slug: 'party' },
    { title: 'Petite',             slug: 'petite' },
    { title: 'Pissing',            slug: 'pissing' },
    { title: 'Pornstar',           slug: 'pornstar' },
    { title: 'POV',                slug: 'pov' },
    { title: 'Public',             slug: 'public' },
    { title: 'Pussy Licking',      slug: 'pussy-licking' },
    { title: 'Reality',            slug: 'reality' },
    { title: 'Redhead',            slug: 'redhead' },
    { title: 'Russian',            slug: 'russian' },
    { title: 'Schoolgirl',         slug: 'schoolgirl' },
    { title: 'Shaved',             slug: 'shaved' },
    { title: 'Shemale',            slug: 'shemale' },
    { title: 'Small Tits',         slug: 'small-tits' },
    { title: 'Solo',               slug: 'solo' },
    { title: 'Spanking',           slug: 'spanking' },
    { title: 'Squirting',          slug: 'squirting' },
    { title: 'Stockings',          slug: 'stockings' },
    { title: 'Striptease',         slug: 'striptease' },
    { title: 'Teen (18+)',         slug: 'teen' },
    { title: 'Threesome',          slug: 'threesome' },
    { title: 'Toys',               slug: 'toys' },
    { title: 'Uniform',            slug: 'uniform' },
    { title: 'Vintage',            slug: 'vintage' },
    { title: 'Webcam',             slug: 'webcam' },
  ];

  // ----------------------------------------------------------
  // HTTP-ЗАПРОС — прямой → Worker (fallback)
  // [1.1.0] Перебор двух транспортов последовательно
  // ----------------------------------------------------------
  function hdtubGet(url, onSuccess, onError) {
    var workerUrl = WORKER_URL + '/?url=' + encodeURIComponent(url);

    function tryDirect() {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 15000;
      xhr.setRequestHeader('Referer', 'https://denis-tikhonov.github.io/');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
          onSuccess(xhr.responseText);
        } else {
          console.log('[hdtub] direct fail (' + xhr.status + '), trying worker...');
          tryWorker();
        }
      };
      xhr.ontimeout = function () { console.log('[hdtub] direct timeout, trying worker...'); tryWorker(); };
      xhr.onerror   = function () { console.log('[hdtub] direct error, trying worker...');  tryWorker(); };
      xhr.send();
    }

    function tryWorker() {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', workerUrl, true);
      xhr.timeout = 18000;
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
          onSuccess(xhr.responseText);
        } else {
          onError('HTTP ' + xhr.status + ' (worker)');
        }
      };
      xhr.ontimeout = function () { onError('Worker timeout'); };
      xhr.onerror   = function () { onError('Worker network error'); };
      xhr.send();
    }

    tryDirect();
  }

  // ----------------------------------------------------------
  // УТИЛИТЫ — нормализация URL
  // [1.1.0] Добавлен unescape backslash (JSON: backslashEscaped=true)
  // ----------------------------------------------------------
  function cleanUrl(raw) {
    if (!raw) return '';
    var url = raw;

    // 1. Unescape backslash-escaped слеши  [1.1.0 FIX]
    url = url.replace(/\\\//g, '/');

    // 2. Protocol-relative → добавляем https:
    if (url.indexOf('//') === 0) {
      url = 'https:' + url;
    }
    // 3. Root-relative → добавляем BASE_URL
    else if (url.charAt(0) === '/' && url.charAt(1) !== '/') {
      url = BASE_URL + url;
    }
    // 4. Относительный без / → добавляем BASE_URL/
    else if (url.indexOf('http') !== 0) {
      url = BASE_URL + '/' + url;
    }

    return url;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  // JSON: cardSelector=".item", title=".item a[title]", link=".item a[href]", thumb=".item img src"
  // [1.1.0] json:true — видео грузится через qualities() со страницы видео
  // ----------------------------------------------------------
  function parseCards(html) {
    var parser = new DOMParser();
    var doc    = parser.parseFromString(html, 'text/html');
    var items  = doc.querySelectorAll('.item');
    var cards  = [];

    for (var i = 0; i < items.length; i++) {
      var item    = items[i];
      var linkEl  = item.querySelector('a[href]');
      var titleEl = item.querySelector('a[title]');
      var imgEl   = item.querySelector('img');

      if (!linkEl) continue;

      var title = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent || '').trim() : '';
      var link  = cleanUrl(linkEl.getAttribute('href') || '');
      var thumb = imgEl
        ? cleanUrl(imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '')
        : '';

      if (!link) continue;

      cards.push({
        name             : title || 'Video',
        // [1.1.0] video = ссылка на страницу; qualities() извлечёт прямой MP4
        video            : link,
        picture          : thumb,
        preview          : thumb,
        background_image : thumb,
        img              : thumb,
        poster           : thumb,
        quality          : 'HD',
        time             : '',
        // [1.1.0] json:true — AdultPlugin вызовет qualities(video, ...)
        json             : true,
        source           : NAME,
      });
    }

    return cards;
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ ВИДЕО — kt_player
  // JSON: video_url (720p), video_alt_url (480p)
  // ----------------------------------------------------------
  function extractVideoUrls(html) {
    var urls = [];

    var m720 = html.match(/video_url\s*[:=]\s*['"]([^'"]+)['"]/);
    if (m720) urls.push({ quality: '720p', url: cleanUrl(m720[1]) });

    var m480 = html.match(/video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/);
    if (m480) urls.push({ quality: '480p', url: cleanUrl(m480[1]) });

    if (urls.length === 0) {
      var mp4 = html.match(/(?:video_url|video_alt_url|src|file)\s*[:=]\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i);
      if (mp4) urls.push({ quality: 'HD', url: cleanUrl(mp4[1]) });
    }

    return urls;
  }

  // ----------------------------------------------------------
  // ПАГИНАЦИЯ
  // JSON: pagination.pattern = "&page={N}"
  // ----------------------------------------------------------
  function detectTotalPages(html) {
    var parser  = new DOMParser();
    var doc     = parser.parseFromString(html, 'text/html');
    var links   = doc.querySelectorAll('a[href*="page="]');
    var maxPage = 1;

    for (var i = 0; i < links.length; i++) {
      var m = (links[i].getAttribute('href') || '').match(/[?&]page=(\d+)/);
      if (m) {
        var p = parseInt(m[1], 10);
        if (p > maxPage) maxPage = p;
      }
    }

    return Math.min(maxPage || 10, 50);
  }

  // ----------------------------------------------------------
  // FETCH-ФУНКЦИИ
  // ----------------------------------------------------------

  function addPage(url, page) {
    if (page <= 1) return url;
    var sep = url.indexOf('?') > -1 ? '&' : '?';
    return url + sep + 'page=' + page;
  }

  function fetchCatalog(url, page, success, error) {
    var fullUrl = addPage(url, page);
    console.log('[hdtub ' + VERSION + '] fetchCatalog → ' + fullUrl);

    hdtubGet(fullUrl, function (html) {
      var cards  = parseCards(html);
      var total  = detectTotalPages(html);
      if (total <= 1 && cards.length > 0) total = 10;

      success({
        results     : cards,
        collection  : true,
        total_pages : total,
        menu        : buildMenu(),
      });
    }, error);
  }

  function fetchSearch(query, page, success, error) {
    // JSON: search.pattern = "https://www.hdtube.porn/?q={query}"
    var url = BASE_URL + '/?q=' + encodeURIComponent(query);
    fetchCatalog(url, page, success, error);
  }

  // [1.1.0] FIX: категории через /?c={slug} вместо /{slug}.porn
  function fetchCategory(slug, page, success, error) {
    var url = BASE_URL + '/?c=' + encodeURIComponent(slug);
    fetchCatalog(url, page, success, error);
  }

  function fetchDetail(pageUrl, success, error) {
    console.log('[hdtub ' + VERSION + '] fetchDetail → ' + pageUrl);

    hdtubGet(pageUrl, function (html) {
      var urls = extractVideoUrls(html);

      if (urls.length === 0) {
        error('Video URLs not found on page');
        return;
      }

      // Формируем qualityMap { '720p': 'https://...', '480p': 'https://...' }
      var qualitys = {};
      urls.forEach(function (u) { qualitys[u.quality] = u.url; });

      success({ qualitys: qualitys });
    }, error);
  }

  // ----------------------------------------------------------
  // МЕНЮ
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      {
        title        : '🔍 Поиск',
        search_on    : true,
        playlist_url : NAME + '/search/',
      },
      {
        title        : '🔥 Новое',
        playlist_url : NAME + '/new',
      },
      {
        title        : '📂 Категории',
        playlist_url : 'submenu',
        submenu      : CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/category/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТИНГ
  // ----------------------------------------------------------
  function parseSearchParam(url) {
    var m = url.match(/[?&]search=([^&]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function routeView(url, page, success, error) {
    var searchPrefix   = NAME + '/search/';
    var categoryPrefix = NAME + '/category/';

    console.log('[hdtub ' + VERSION + '] routeView → url="' + url + '" page=' + page);

    var searchParam = parseSearchParam(url);
    if (searchParam !== null) {
      var q = searchParam.trim();
      if (q) fetchSearch(q, page, success, error);
      else   fetchCatalog(BASE_URL, page, success, error);
      return;
    }

    if (url.indexOf(categoryPrefix) === 0) {
      var slug = url.replace(categoryPrefix, '').split('?')[0].trim();
      if (slug) fetchCategory(slug, page, success, error);
      else      fetchCatalog(BASE_URL, page, success, error);
      return;
    }

    if (url.indexOf(searchPrefix) === 0) {
      var rawQ  = url.replace(searchPrefix, '').split('?')[0];
      var query = decodeURIComponent(rawQ).trim();
      if (query) fetchSearch(query, page, success, error);
      else       fetchCatalog(BASE_URL, page, success, error);
      return;
    }

    if (url.indexOf('http') === 0 && url.indexOf(BASE_URL) !== -1) {
      fetchDetail(url, success, error);
      return;
    }

    fetchCatalog(BASE_URL, page, success, error);
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var HdtubParser = {

    main: function (params, success, error) {
      fetchCatalog(BASE_URL, 1, success, error);
    },

    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = params.url || (NAME + '/new');
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
        data.title = 'HDtube: ' + query;
        data.url   = NAME + '/search/' + encodeURIComponent(query);
        success(data);
      }, error);
    },

    // [1.1.0] qualities — извлекает MP4 со страницы видео
    qualities: function (videoPageUrl, success, error) {
      fetchDetail(videoPageUrl, success, error);
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, HdtubParser);
      console.log('[hdtub] v' + VERSION + ' зарегистрирован');
      try {
        setTimeout(function () {
          Lampa.Noty.show('HDtube [hdtub] v' + VERSION + ' подключён', { time: 2500 });
        }, 600);
      } catch (e) { /* Lampa может быть недоступен */ }
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
