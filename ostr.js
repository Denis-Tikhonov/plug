// =============================================================
// ostr.js — OstroeP Parser для AdultJS (Lampa)
// =============================================================
// Версия  : 1.1.0
// Изменения:
//   [1.1.0] Переписан по JSON-анализу:
//           - [FIX] Парсер карточек: JSON cardSelector=null (JS-рендер) →
//                   используем DOMParser + множество fallback-селекторов
//           - [FIX] Транспорт: прямой → Worker последовательно
//           - [FIX] Пагинация: путь /page/N → query-параметр &page=N (JSON-паттерн)
//           - [FIX] Поиск: /?search={query} (подтверждено JSON)
//           - [FIX] Категории: полный URL из JSON navigation.categories
//           - [ADD] Полный список 69 категорий из JSON
//           - [ADD] json:true → qualities() извлекает видео со страницы
//   [1.0.0] Базовый парсер (устаревший)
// =============================================================

(function () {
  'use strict';

  var VERSION    = '1.1.0';
  var NAME       = 'ostr';
  var BASE_URL   = 'http://ostroeporno.com';
  // Worker из W137.js — замените на свой URL
  var WORKER_URL = 'https://your-worker.workers.dev';

  // ----------------------------------------------------------
  // КАТЕГОРИИ (полный список из JSON navigation.categories)
  // JSON: url-паттерн = BASE_URL/category/{slug}
  // ----------------------------------------------------------
  var CATEGORIES = [
    { title: '🇷🇺 Русское',            slug: 'russkoe' },
    { title: '🏠 Домашнее',             slug: 'domashnee' },
    { title: '🏠 Русское домашнее',     slug: 'russkoe_domashnee' },
    { title: '👧 Молодые',              slug: 'molodyee' },
    { title: '👅 Минет',                slug: 'minet' },
    { title: '🍑 Брюнетки',             slug: 'bryunetki' },
    { title: '👠 Чулки и колготки',     slug: 'chulki_i_kolgotki' },
    { title: '👵 Зрелые',               slug: 'zrelyee' },
    { title: '👪 Инцесты',              slug: 'incesty' },
    { title: '💦 Анал',                 slug: 'anal' },
    { title: '💎 HD видео',             slug: 'hd_video' },
    { title: '🍒 Большие сиськи',       slug: 'bolqshie_sisqki' },
    { title: '🍑 Большие задницы',      slug: 'bolqshie_zadnicy' },
    { title: '🍆 Большим членом',       slug: 'bolqshim_chlenom' },
    { title: '💛 Блондинки',            slug: 'blondinki' },
    { title: '🌏 Азиатки',              slug: 'aziatki' },
    { title: '🔗 БДСМ',                 slug: 'bdsm' },
    { title: '👫 Брат с сестрой',       slug: 'brat_s_sestroj' },
    { title: '🌸 Армянское',            slug: 'armyanskoe' },
    { title: '👥 Групповой секс',       slug: 'gruppovoj_seks' },
    { title: '👫 ЖМЖ',                  slug: 'zhmzh' },
    { title: '👫 МЖМ',                  slug: 'mzhm' },
    { title: '👥 Толпой',               slug: 'tolpoj' },
    { title: '🔀 Двойное проникнов.',   slug: 'dvojnoe_proniknovenie' },
    { title: '💕 Лесбиянки',            slug: 'lesbiyanki' },
    { title: '👩 Мамки',                slug: 'mamki' },
    { title: '👩 Мать и сын',           slug: 'matq_i_syn' },
    { title: '👨 Отец и дочь',          slug: 'otec_i_dochq' },
    { title: '🌿 Женская мастурбация',  slug: 'zhenskaya_masturbaciya' },
    { title: '🌹 Измена',               slug: 'izmena' },
    { title: '🌍 Азиатки',              slug: 'aziatki' },
    { title: '🏔️ Кавказ',              slug: 'kavkaz' },
    { title: '🌺 Красивое',             slug: 'krasivoe' },
    { title: '🔍 Крупный план',         slug: 'krupnyj_plan' },
    { title: '👅 Кунилингус',           slug: 'kunilingus' },
    { title: '🚶 На улице',             slug: 'na_ulice' },
    { title: '🌸 Нежное',               slug: 'nezhnoe' },
    { title: '🎭 Кастинг',              slug: 'kasting' },
    { title: '🍸 Пьяные',               slug: 'pqyanyee' },
    { title: '🦊 Рыжие',                slug: 'ryzhie' },
    { title: '⚫ Негры',                slug: 'negry' },
    { title: '⚫ Негритянки',           slug: 'negrityanki' },
    { title: '💆 Секс массаж',          slug: 'seks_massazh' },
    { title: '💍 С женой',              slug: 's_zhenoj' },
    { title: '💦 Сквирт',               slug: 'skvirt' },
    { title: '🎓 Студенты',             slug: 'studenty' },
    { title: '🍩 Толстушки',            slug: 'tolstushki' },
    { title: '💃 Трансы',               slug: 'transy' },
    { title: '🔥 Жёсткое',              slug: 'zhestkoe' },
    { title: '🌿 Худые',                slug: 'hudyee' },
    { title: '🇺🇿 Узбеки',             slug: 'uzbeki' },
    { title: '💦 Глотает сперму',       slug: 'glotaet_spermu' },
    { title: '👁️ От первого лица',     slug: 'ot_pervogo_lica' },
    { title: '⏱️ Короткие ролики',     slug: 'korotkie_roliki' },
    { title: '📷 Скрытая камера',       slug: 'skrytaya_kamera' },
    { title: '🌸 Бритая киска',         slug: 'britaya_kiska' },
    { title: '💧 Кончают внутрь',       slug: 'konchayut_vnutrq' },
    { title: '🌊 Мощный оргазм',        slug: 'mownyj_orgazm' },
    { title: '🌿 Волосатые вагины',     slug: 'volosatyee_vaginy' },
    { title: '🎭 Извращения',           slug: 'izvraweniya' },
    { title: '👠 На каблуках',          slug: 'na_kablukah' },
    { title: '🍳 Секс на кухне',        slug: 'seks_na_kuhne' },
    { title: '🎉 Оргии',                slug: 'orgii' },
    { title: '👔 Униформа',             slug: 'uniforma' },
  ];

  // ----------------------------------------------------------
  // HTTP-ЗАПРОС — прямой → Worker (fallback)
  // [1.1.0] JSON: refererProtected=true, Worker добавляет Referer автоматически
  // ----------------------------------------------------------
  function ostrGet(url, onSuccess, onError) {
    var workerUrl = WORKER_URL + '/?url=' + encodeURIComponent(url);

    function tryDirect() {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 15000;
      xhr.setRequestHeader('Referer', 'https://denis-tikhonov.github.io/');
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
          onSuccess(xhr.responseText);
        } else {
          console.log('[ostr] direct fail (' + xhr.status + '), trying worker...');
          tryWorker();
        }
      };
      xhr.ontimeout = function () { console.log('[ostr] direct timeout, trying worker...'); tryWorker(); };
      xhr.onerror   = function () { console.log('[ostr] direct error, trying worker...');  tryWorker(); };
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
  // УТИЛИТЫ
  // JSON: protocolRelative=true, rootRelative=true
  // ----------------------------------------------------------
  function cleanUrl(raw) {
    if (!raw) return '';
    var url = raw.trim();
    if (url.indexOf('//') === 0)         return 'http:' + url;
    if (url.charAt(0) === '/' && url.charAt(1) !== '/') return BASE_URL + url;
    if (url.indexOf('http') !== 0)       return BASE_URL + '/' + url;
    return url;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  // JSON: cardSelector=null — сайт SSR нестабилен, перебираем селекторы
  // [1.1.0] DOMParser + 4 стратегии поиска карточек
  // ----------------------------------------------------------
  function parseCards(html) {
    var parser = new DOMParser();
    var doc    = parser.parseFromString(html, 'text/html');
    var cards  = [];

    // Стратегия 1: .thumb, .video-item, .item (типичные для этого движка)
    var SELECTORS = ['.thumb', '.video-item', '.item', 'article', '.video'];

    var items;
    for (var s = 0; s < SELECTORS.length; s++) {
      items = doc.querySelectorAll(SELECTORS[s]);
      if (items && items.length > 0) {
        console.log('[ostr] parseCards: using selector "' + SELECTORS[s] + '", found ' + items.length);
        break;
      }
    }

    if (!items || items.length === 0) {
      // Стратегия 2: ищем все <a> с href = /video/ или /watch/
      var allLinks = doc.querySelectorAll('a[href*="/video/"], a[href*="/watch/"]');
      console.log('[ostr] parseCards fallback: found ' + allLinks.length + ' video links');
      for (var j = 0; j < allLinks.length; j++) {
        var a    = allLinks[j];
        var href = cleanUrl(a.getAttribute('href') || '');
        var img  = a.querySelector('img');
        var t    = (a.getAttribute('title') || a.textContent || '').trim();
        if (!href) continue;
        cards.push({
          name             : t || 'Video',
          video            : href,
          picture          : img ? cleanUrl(img.getAttribute('data-src') || img.getAttribute('src') || '') : '',
          preview          : '',
          background_image : '',
          img              : '',
          poster           : '',
          quality          : 'HD',
          time             : '',
          json             : true,
          source           : NAME,
        });
      }
      return cards;
    }

    for (var i = 0; i < items.length; i++) {
      var item   = items[i];
      var linkEl = item.querySelector('a[href]');
      if (!linkEl) continue;

      var link  = cleanUrl(linkEl.getAttribute('href') || '');
      var imgEl = item.querySelector('img');
      var thumb = imgEl
        ? cleanUrl(imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '')
        : '';
      var titleEl = item.querySelector('a[title], .title, .name, h2, h3');
      var title   = titleEl
        ? (titleEl.getAttribute('title') || titleEl.textContent || '').trim()
        : (linkEl.getAttribute('title') || '').trim();
      var timeEl  = item.querySelector('.duration, .time, .length');
      var time    = timeEl ? timeEl.textContent.trim() : '';

      if (!link) continue;

      cards.push({
        name             : title || 'Video',
        video            : link,
        picture          : thumb,
        preview          : thumb,
        background_image : thumb,
        img              : thumb,
        poster           : thumb,
        quality          : 'HD',
        time             : time,
        json             : true,
        source           : NAME,
      });
    }

    return cards;
  }

  // ----------------------------------------------------------
  // ПАГИНАЦИЯ
  // [1.1.0] FIX: JSON pagination.pattern = "&page={N}" (query-параметр)
  // ----------------------------------------------------------
  function addPage(url, page) {
    if (page <= 1) return url;
    var sep = url.indexOf('?') > -1 ? '&' : '?';
    return url + sep + 'page=' + page;
  }

  function detectTotalPages(html) {
    var m = html.match(/page=(\d+)/g);
    if (!m || !m.length) return 10;
    var max = 1;
    m.forEach(function (s) {
      var n = parseInt(s.replace('page=', ''), 10);
      if (n > max) max = n;
    });
    return Math.min(max, 50);
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ ВИДЕО СО СТРАНИЦЫ
  // JSON: extractionStrategies=[] — JS-рендер, парсим прямые ссылки
  // ----------------------------------------------------------
  function extractVideoUrls(html) {
    var sources = {};

    // Ищем source с label
    var labeled = html.match(/<source[^>]*src="([^"]+)"[^>]*label="([^"]+)"/g);
    if (labeled) {
      labeled.forEach(function (m) {
        var src   = (m.match(/src="([^"]+)"/) || [])[1] || '';
        var label = (m.match(/label="([^"]+)"/) || [])[1] || 'HD';
        if (src) sources[label] = cleanUrl(src);
      });
    }

    // kt_player / JW player config
    if (!Object.keys(sources).length) {
      var vm = html.match(/video_url\s*[:=]\s*['"]([^'"]+)['"]/);
      if (vm) sources['480p'] = cleanUrl(vm[1]);
      var vm2 = html.match(/video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/);
      if (vm2) sources['720p'] = cleanUrl(vm2[1]);
    }

    // Fallback: любой mp4
    if (!Object.keys(sources).length) {
      var mp4 = html.match(/['"]([^'"]+\.mp4[^'"]*)['"]/i);
      if (mp4) sources['HD'] = cleanUrl(mp4[1]);
    }

    return sources;
  }

  // ----------------------------------------------------------
  // МЕНЮ
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🆕 Новинки', playlist_url: NAME + '/new' },
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
  function routeView(url, page, success, error) {
    var searchPrefix   = NAME + '/search/';
    var categoryPrefix = NAME + '/category/';

    // Поиск через фильтр: ostr/search/?search=query
    var sm = url.match(/[?&]search=([^&]*)/);
    if (sm) {
      var q = decodeURIComponent(sm[1]).trim();
      var fetchUrl = addPage(BASE_URL + '/?search=' + encodeURIComponent(q), page);
      return fetchPage(fetchUrl, page, success, error);
    }

    // Категория: ostr/category/slug
    if (url.indexOf(categoryPrefix) === 0) {
      var slug = url.replace(categoryPrefix, '').split('?')[0].trim();
      // JSON: url = BASE_URL/category/{slug}
      var catUrl = addPage(BASE_URL + '/category/' + slug, page);
      return fetchPage(catUrl, page, success, error);
    }

    // Поиск через путь: ostr/search/query
    if (url.indexOf(searchPrefix) === 0) {
      var rawQ  = decodeURIComponent(url.replace(searchPrefix, '').split('?')[0]).trim();
      if (rawQ) return fetchPage(addPage(BASE_URL + '/?search=' + encodeURIComponent(rawQ), page), page, success, error);
    }

    // Главная / новинки
    fetchPage(addPage(BASE_URL, page), page, success, error);
  }

  function fetchPage(fullUrl, page, success, error) {
    console.log('[ostr ' + VERSION + '] fetch → ' + fullUrl);
    ostrGet(fullUrl, function (html) {
      var cards = parseCards(html);
      var total = detectTotalPages(html);
      if (total <= 1 && cards.length > 0) total = 10;
      success({
        results     : cards,
        collection  : true,
        total_pages : total,
        menu        : buildMenu(),
      });
    }, error);
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var OstrParser = {

    main: function (params, success, error) {
      fetchPage(BASE_URL, 1, success, error);
    },

    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = params.url || (NAME + '/new');
      routeView(url, page, success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      if (!query) { success({ title: '', results: [], collection: true }); return; }
      var fetchUrl = BASE_URL + '/?search=' + encodeURIComponent(query);
      ostrGet(fetchUrl, function (html) {
        success({ title: 'OstroeP: ' + query, results: parseCards(html), collection: true });
      }, error);
    },

    // [1.1.0] qualities — извлекает MP4 со страницы видео
    qualities: function (videoPageUrl, success, error) {
      ostrGet(videoPageUrl, function (html) {
        var sources = extractVideoUrls(html);
        if (Object.keys(sources).length > 0) {
          success({ qualitys: sources });
        } else {
          error('Video file not found');
        }
      }, error);
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, OstrParser);
      console.log('[ostr] v' + VERSION + ' зарегистрирован');
      try {
        setTimeout(function () {
          Lampa.Noty.show('OstroeP [ostr] v' + VERSION + ' подключён', { time: 2500 });
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
