// =============================================================
// hdtub.js — HDtube Parser для AdultJS
// Version  : 1.0.0
// Changed  :
//   [1.0.0] Базовый парсер hdtube.porn:
//           - Умный роутинг routeView() (поиск / категории / видео)
//           - Поиск через фильтр (кнопка ≡): buildMenu() → search_on:true
//           - 70+ категорий из JSON-анализа сайта
//           - Извлечение видео через kt_player (720p / 480p)
//           - CSS-парсинг карточек (.item), пагинация &page={N}
//           - Поддержка backslash-escaped и protocol-relative URL
//           - Referer-protected запросы
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // КОНФИГ
  // ----------------------------------------------------------
  var NAME     = 'hdtub';
  var BASE_URL = 'https://www.hdtube.porn';
  var REFERER  = 'https://denis-tikhonov.github.io/';
  var UA       = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  // ----------------------------------------------------------
  // КАТЕГОРИИ (из JSON-анализа hdtube.porn)
  // URL-паттерн: BASE_URL/{slug}.porn
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
    { title: 'Webcam',             slug: 'webcam' }
  ];

  // ----------------------------------------------------------
  // HTTP-ЗАПРОС
  //
  // Сайт referer-protected — обязателен заголовок Referer.
  // responseType = '' (по умолчанию) → xhr.responseText доступен.
  // ----------------------------------------------------------
  function hdtubGet(url, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 18000;

    // Обязательные заголовки (из JSON: parserFlow.requiredHeaders)
    xhr.setRequestHeader('Referer', REFERER);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        onSuccess(xhr.responseText);
      } else {
        onError('HTTP ' + xhr.status);
      }
    };

    xhr.ontimeout = function () { onError('Timeout'); };
    xhr.onerror   = function () { onError('Network error'); };
    xhr.send();
  }

  // ----------------------------------------------------------
  // УТИЛИТЫ — нормализация URL
  //
  // JSON указывает: backslashEscaped, protocolRelative,
  // rootRelative → cleanUrlRules: unescape-backslash, add-protocol, prepend-host
  // ----------------------------------------------------------
  function cleanUrl(raw) {
    if (!raw) return '';
    var url = raw;

    // 1. Unescape backslash-escaped слеши
    url = url.replace(/\\\//g, '/');

    // 2. Protocol-relative → добавляем https:
    if (url.indexOf('//') === 0) {
      url = 'https:' + url;
    }
    // 3. Root-relative → добавляем BASE_URL
    else if (url.indexOf('/') === 0 && url.indexOf('//') !== 0) {
      url = BASE_URL + url;
    }
    // 4. Относительный без / → добавляем BASE_URL + /
    else if (url.indexOf('http') !== 0) {
      url = BASE_URL + '/' + url;
    }

    return url;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК ИЗ HTML
  //
  // JSON: cardSelector=".item"
  //   title  → .item a[title]
  //   link   → .item a[href]
  //   thumb  → .item img → src
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

      var title = titleEl ? (titleEl.getAttribute('title') || '') : '';
      var link  = cleanUrl(linkEl.getAttribute('href') || '');
      var thumb = imgEl  ? cleanUrl(imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';

      if (!title && !link) continue;

      cards.push({
        name             : title || 'Video',
        video            : '',             // Заполняется в detail()
        picture          : thumb,
        preview          : thumb,
        background_image : thumb,
        img              : thumb,
        poster           : thumb,
        quality          : 'HD',
        time             : '',
        json             : false,
        related          : false,
        model            : null,
        source           : NAME,
        link             : link            // URL страницы видео (для detail)
      });
    }

    return cards;
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ ВИДЕО ИЗ СТРАНИЦЫ
  //
  // JSON: extractionStrategy = js-config-kt_player
  //   video_url     → 720p
  //   video_alt_url → 480p
  //   regex: video_url\s*[:=]\s*['"]([^'"]+)['"]
  // ----------------------------------------------------------
  function extractVideoUrls(html) {
    var urls = [];

    // 720p — video_url
    var match720 = html.match(/video_url\s*[:=]\s*['"]([^'"]+)['"]/);
    if (match720) {
      urls.push({ quality: '720p', url: cleanUrl(match720[1]) });
    }

    // 480p — video_alt_url
    var match480 = html.match(/video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/);
    if (match480) {
      urls.push({ quality: '480p', url: cleanUrl(match480[1]) });
    }

    // Fallback — ищем любой .mp4 в контексте плеера
    if (urls.length === 0) {
      var mp4Match = html.match(/(?:video_url|video_alt_url|src|file|source)\s*[:=]\s*['"](https?:[^'"]+\.mp4[^'"]*)['"]/i);
      if (mp4Match) {
        urls.push({ quality: 'HD', url: cleanUrl(mp4Match[1]) });
      }
    }

    return urls;
  }

  // ----------------------------------------------------------
  // ОПРЕДЕЛЕНИЕ ОБЩЕГО КОЛИЧЕСТВА СТРАНИЦ
  //
  // Пытаемся найти пагинацию в HTML.
  // Формат: &page={N}
  // ----------------------------------------------------------
  function detectTotalPages(html) {
    // Ищем ссылки на страницы и берём максимальный номер
    var parser = new DOMParser();
    var doc    = parser.parseFromString(html, 'text/html');
    var links  = doc.querySelectorAll('a[href*="page="]');
    var maxPage = 1;

    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      var match = href.match(/[?&]page=(\d+)/);
      if (match) {
        var p = parseInt(match[1], 10);
        if (p > maxPage) maxPage = p;
      }
    }

    // Ограничиваем максимум для разумной навигации
    return Math.min(maxPage, 50);
  }

  // ----------------------------------------------------------
  // FETCH-ФУНКЦИИ
  // ----------------------------------------------------------

  // Универсальный фетч каталога (главная / категория / поиск)
  function fetchCatalog(url, page, success, error) {
    var fullUrl = url;

    // Добавляем пагинацию: &page={N} или ?page={N}
    if (page > 1) {
      var sep = (fullUrl.indexOf('?') > -1) ? '&' : '?';
      fullUrl += sep + 'page=' + page;
    }

    console.log('[hdtub] fetchCatalog → ' + fullUrl);

    hdtubGet(fullUrl, function (html) {
      var cards      = parseCards(html);
      var totalPages = detectTotalPages(html);

      // Если страниц не нашли — проверяем, есть ли вообще карточки
      if (totalPages <= 1 && cards.length > 0) {
        totalPages = 10; // Дефолт если пагинатор не найден
      }

      success({
        results     : cards,
        collection  : true,
        total_pages : totalPages,
        menu        : buildMenu()
      });
    }, error);
  }

  // Поиск
  function fetchSearch(query, page, success, error) {
    console.log('[hdtub] fetchSearch → query="' + query + '" page=' + page);

    // JSON: search.pattern = https://www.hdtube.porn/?q={query}
    var url = BASE_URL + '/?q=' + encodeURIComponent(query);
    fetchCatalog(url, page, success, error);
  }

  // Категория
  function fetchCategory(slug, page, success, error) {
    console.log('[hdtub] fetchCategory → slug="' + slug + '" page=' + page);

    // Категории: BASE_URL/{slug}.porn
    var url = BASE_URL + '/' + slug + '.porn';
    fetchCatalog(url, page, success, error);
  }

  // Детальная страница видео — извлечение прямых ссылок
  function fetchDetail(pageUrl, success, error) {
    console.log('[hdtub] fetchDetail → ' + pageUrl);

    hdtubGet(pageUrl, function (html) {
      var urls = extractVideoUrls(html);

      if (urls.length === 0) {
        error('Video URLs not found on page');
        return;
      }

      // Формируем результат — плейлист с найденными качествами
      var results = urls.map(function (u) {
        return {
          name    : u.quality,
          title   : u.quality,
          video   : u.url,
          quality : u.quality,
          poster  : '',
          source  : NAME
        };
      });

      success({
        results : results,
        menu    : buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // МЕНЮ — пункт поиска с search_on:true
  //
  // AdultJS при наличии search_on:true вставляет «Найти» в фильтр.
  // После ввода запроса AdultJS пушит URL:
  //   playlist_url + '?search=' + encodeURIComponent(query)
  //   → 'hdtub/search/?search=milf'
  //
  // playlist_url пункта поиска НЕ должен содержать '?' — тогда
  // AdultJS сам добавит ?search=... (а не &search=...).
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      {
        title        : '🔍 Поиск',
        search_on    : true,                    // ← AdultJS покажет «Найти» в фильтре
        playlist_url : NAME + '/search/'         // ← AdultJS добавит ?search=запрос
      },
      {
        title        : '🔥 Новое',
        playlist_url : NAME + '/new'
      },
      {
        title        : '📂 Категории',
        playlist_url : 'submenu',
        submenu      : CATEGORIES.map(function (c) {
          return {
            title        : c.title,
            playlist_url : NAME + '/category/' + c.slug
          };
        })
      }
    ];
  }

  // ----------------------------------------------------------
  // УМНЫЙ РОУТИНГ — routeView()
  //
  // Возможные форматы url из AdultJS:
  //
  //   1. Фильтр-поиск (пользователь ввёл запрос через «Найти»):
  //      'hdtub/search/?search=milf'
  //      → parseSearchParam → query = 'milf' → fetchSearch
  //
  //   2. Категория (клик по пункту подменю):
  //      'hdtub/category/milf'
  //      → slug = 'milf' → fetchCategory
  //
  //   3. Поиск через путь (из глобального поиска Lampa):
  //      'hdtub/search/milf'
  //      → query = 'milf' → fetchSearch
  //
  //   4. Новое / главная:
  //      'hdtub/new'  /  ''  /  всё остальное
  //      → fetchCatalog(BASE_URL)
  //
  //   5. Прямая ссылка на видео (из карточки):
  //      'https://www.hdtube.porn/videos/slug/'
  //      → fetchDetail
  // ----------------------------------------------------------
  function parseSearchParam(url) {
    // Ищем ?search= или &search= в URL
    var match = url.match(/[?&]search=([^&]*)/);
    if (match) return decodeURIComponent(match[1]);
    return null;
  }

  function routeView(url, page, success, error) {
    var searchPrefix   = NAME + '/search/';
    var categoryPrefix = NAME + '/category/';

    console.log('[hdtub] routeView → url="' + url + '" page=' + page);

    // ── Случай 1: фильтр-поиск → hdtub/search/?search=milf ──
    var searchParam = parseSearchParam(url);
    if (searchParam !== null) {
      var trimmed = searchParam.trim();
      if (trimmed) {
        fetchSearch(trimmed, page, success, error);
      } else {
        fetchCatalog(BASE_URL, page, success, error);
      }
      return;
    }

    // ── Случай 2: категория → hdtub/category/milf ──
    if (url.indexOf(categoryPrefix) === 0) {
      var slug = url.replace(categoryPrefix, '').split('?')[0].trim();
      if (slug) {
        fetchCategory(slug, page, success, error);
      } else {
        fetchCatalog(BASE_URL, page, success, error);
      }
      return;
    }

    // ── Случай 3: поиск через путь → hdtub/search/milf ──
    if (url.indexOf(searchPrefix) === 0) {
      var rawQuery = url.replace(searchPrefix, '').split('?')[0];
      var query    = decodeURIComponent(rawQuery).trim();

      if (query) {
        fetchSearch(query, page, success, error);
      } else {
        fetchCatalog(BASE_URL, page, success, error);
      }
      return;
    }

    // ── Случай 4: прямая ссылка на видео (из карточки link) ──
    if (url.indexOf('http') === 0 && url.indexOf(BASE_URL) !== -1) {
      fetchDetail(url, success, error);
      return;
    }

    // ── Случай 5: новое / главная / неизвестное ──
    fetchCatalog(BASE_URL, page, success, error);
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var HdtubParser = {

    // Главный экран (горизонтальные полосы / стартовая страница)
    main: function (params, success, error) {
      fetchCatalog(BASE_URL, 1, success, error);
    },

    // Каталог / категория / поиск через фильтр
    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = params.url || (NAME + '/new');
      routeView(url, page, success, error);
    },

    // Глобальный поиск через строку поиска Lampa
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

    // Детальная страница — извлечение видео-URL
    detail: function (params, success, error) {
      var url = params.url || '';

      // Также пробуем params.data.link (если AdultJS передаёт объект)
      if (!url && params.data && params.data.link) {
        url = params.data.link;
      }

      if (!url) {
        error('No video URL provided');
        return;
      }

      fetchDetail(url, success, error);
    }
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ В AdultJS
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, HdtubParser);
      console.log('[hdtub] v1.0.0 зарегистрирован');
      try {
        setTimeout(function () {
          Lampa.Noty.show('HDtube [hdtub] v1.0 подключён', { time: 2500 });
        }, 600);
      } catch (e) { /* Lampa может быть недоступен */ }
      return true;
    }
    return false;
  }

  // Ожидаем загрузки AdultJS
  if (!tryRegister()) {
    var _elapsed = 0;
    var _poll = setInterval(function () {
      _elapsed += 100;
      if (tryRegister() || _elapsed >= 10000) clearInterval(_poll);
    }, 100);
  }

})();
