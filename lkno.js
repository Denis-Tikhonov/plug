// =============================================================
// yjizz.js — YouJizz Parser для AdultPlugin / Lampa
// Version  : 1.1.0
// Changes  :
//   [1.0.0] Базовый парсер: популярное, категории, поиск
//   [1.1.0] Исправлен URL поиска → /search/query-page.html
//           Исправлены поля постера → img, poster, background_image
//           Добавлен Noty "Ничего не найдено"
// =============================================================

(function () {
'use strict';

// ----------------------------------------------------------
// КОНФИГ
// ----------------------------------------------------------
var NAME = 'yjizz';
var HOST = 'https://www.youjizz.com';

// ----------------------------------------------------------
// КАТЕГОРИИ
// ----------------------------------------------------------
var CATEGORIES = [
  { title: '🔥 Популярное',      path: 'most-popular'   },
  { title: '🆕 Новинки',         path: 'new-videos'     },
  { title: '⭐ Топ рейтинг',     path: 'top-rated'      },
  { title: '👁 Просматриваемые', path: 'most-viewed'    },
  { title: '💋 Любительское',    path: 'amateur'        },
  { title: '🎓 Молодые',         path: 'teens'          },
  { title: '👩 Зрелые',          path: 'mature'         },
  { title: '🌸 Азиатки',         path: 'asian'          },
  { title: '🏳‍🌈 Лесби',         path: 'lesbian'        },
  { title: '🎭 Анальное',        path: 'anal'           }
];

// ----------------------------------------------------------
// УТИЛИТЫ
// ----------------------------------------------------------

// Протокол-относительный → https
function prependHttps(url) {
  if (!url) return '';
  return (url.indexOf('//') === 0) ? 'https:' + url : url;
}

// /search/step-sister-1.html
// Пробелы → дефисы, всё в нижнем регистре
function buildSearchUrl(query, page) {
  var slug = query.trim().toLowerCase().replace(/\s+/g, '-');
  return HOST + '/search/' + slug + '-' + (page || 1) + '.html';
}

// /most-popular-1.html  /  /categories/milf-1.html
function buildCatalogUrl(path, page) {
  return HOST + '/' + path + '-' + (page || 1) + '.html';
}

// Извлечь title из slug URL: /videos/my-step-sister-16320161.html → "My step sister"
function titleFromHref(href) {
  var slug = (href || '').replace(/\.html$/, '').split('/').pop() || '';
  slug = slug.replace(/-\d+$/, '');                       // убрать ID на конце
  slug = slug.replace(/-/g, ' ');
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

// Определить кол-во страниц из пагинации
function detectTotalPages(doc) {
  var links = doc.querySelectorAll('.pagination a, .pager a, [class*="paginat"] a');
  var max   = 1;
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href') || '';
    var m    = href.match(/-(\d+)\.html$/);
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max > 1 ? Math.min(max, 50) : 10; // fallback 10
}

// ----------------------------------------------------------
// ПАРСИНГ КАРТОЧКИ
// ----------------------------------------------------------
function _parseCard(el) {
  // Ссылка на видео
  var linkEl = el.querySelector('a.frame.video') ||
               el.querySelector('a[href*="/videos/"]');
  if (!linkEl) return null;

  var href = (linkEl.getAttribute('href') || '').trim();
  if (!href || href === '#') return null;
  var videoPageUrl = (href.indexOf('http') === 0) ? href : HOST + href;

  // -------------------------------------------------------
  // ПОСТЕР — приоритет data-original (lazy-load атрибут)
  // -------------------------------------------------------
  var imgEl   = el.querySelector('img[data-original], img.lazy, img');
  var picture = '';

  if (imgEl) {
    var raw = imgEl.getAttribute('data-original') ||
              imgEl.getAttribute('data-src')      ||
              imgEl.getAttribute('src')           || '';

    picture = prependHttps(raw);

    // Игнорируем spacer-заглушку
    if (picture.indexOf('spacer.gif') !== -1) picture = '';
  }

  // -------------------------------------------------------
  // ПРЕВЬЮ-КЛИП (data-clip на ссылке)
  // -------------------------------------------------------
  var clip = prependHttps(linkEl.getAttribute('data-clip') || '');

  // -------------------------------------------------------
  // ЗАГОЛОВОК
  // -------------------------------------------------------
  var titleEl = el.querySelector('.title a, a.title, .video-title a, .video-title, h2 a, h2');
  var title   = titleEl
    ? (titleEl.textContent || titleEl.innerText || '').trim()
    : titleFromHref(href);

  if (!title) title = titleFromHref(href);

  // -------------------------------------------------------
  // ДЛИТЕЛЬНОСТЬ
  // -------------------------------------------------------
  var durEl = el.querySelector('.duration, .video-duration, .time, [class*="duration"]');
  var dur   = durEl ? (durEl.textContent || '').trim() : '';

  // -------------------------------------------------------
  // КАРТОЧКА — все поля постера чтобы Lampa точно показал
  // -------------------------------------------------------
  return {
    name             : title,
    url              : videoPageUrl,
    picture          : picture,     // ← все четыре поля
    img              : picture,     //   для совместимости
    poster           : picture,     //   с разными версиями
    background_image : picture,     //   AdultPlugin / Lampa
    preview          : clip,
    time             : dur,
    quality          : 'HD',
    json             : false,
    source           : NAME
  };
}

// ----------------------------------------------------------
// HTTP-ЗАПРОС
// ----------------------------------------------------------
function httpGet(url, success, error) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.timeout = 15000;

  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    if (xhr.status >= 200 && xhr.status < 300) {
      success(xhr.responseText);
    } else {
      error('HTTP ' + xhr.status);
    }
  };

  xhr.ontimeout = function () { error('Timeout');        };
  xhr.onerror   = function () { error('Network error'); };
  xhr.send();
}

// ----------------------------------------------------------
// РАЗБОР HTML-СТРАНИЦЫ → массив карточек
// ----------------------------------------------------------
function parsePage(html) {
  var doc;
  try {
    doc = (new DOMParser()).parseFromString(html, 'text/html');
  } catch (e) {
    return { results: [], totalPages: 1 };
  }

  // Пробуем несколько селекторов контейнера карточки
  var items = doc.querySelectorAll('li.video-item, .video-item, .thumb-block');
  if (!items.length) {
    items = doc.querySelectorAll('.frame-wrapper');
  }

  var results = [];
  for (var i = 0; i < items.length; i++) {
    var card = _parseCard(items[i]);
    if (card) results.push(card);
  }

  return {
    results    : results,
    totalPages : detectTotalPages(doc)
  };
}

// ----------------------------------------------------------
// ЗАГРУЗКА И РАЗБОР ЛИСТИНГА
// ----------------------------------------------------------
function fetchListing(pageUrl, success, error) {
  console.log('[yjizz] fetchListing →', pageUrl);

  httpGet(pageUrl, function (html) {
    var parsed = parsePage(html);

    if (!parsed.results.length) {
      try { Lampa.Noty.show('Ничего не найдено'); } catch (e) {}
      error('Ничего не найдено');
      return;
    }

    success({
      results     : parsed.results,
      collection  : true,
      total_pages : parsed.totalPages,
      menu        : buildMenu()
    });
  }, error);
}

// ----------------------------------------------------------
// МЕНЮ
// ----------------------------------------------------------
function buildMenu() {
  var menu = [
    {
      title        : '🔍 Поиск',
      search_on    : true,
      playlist_url : NAME + '/search/'
    },
    {
      title        : '🔥 Популярное',
      playlist_url : NAME + '/popular'
    },
    {
      title        : '🆕 Новинки',
      playlist_url : NAME + '/new'
    }
  ];

  var submenu = CATEGORIES.map(function (c) {
    return {
      title        : c.title,
      playlist_url : NAME + '/cat/' + c.path
    };
  });

  menu.push({
    title    : '📂 Категории',
    submenu  : submenu
  });

  return menu;
}

// ----------------------------------------------------------
// РОУТЕР VIEW
// ----------------------------------------------------------
function parseSearchParam(url) {
  var m = url.match(/[?&]search=([^&]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function routeView(url, page, success, error) {
  var searchPrefix = NAME + '/search/';
  var catPrefix    = NAME + '/cat/';

  console.log('[yjizz] routeView → url="' + url + '" page=' + page);

  // 1) Фильтр-поиск: yjizz/search/?search=wife
  var searchParam = parseSearchParam(url);
  if (searchParam !== null) {
    fetchListing(buildSearchUrl(searchParam.trim(), page), success, error);
    return;
  }

  // 2) Поиск по пути: yjizz/search/wife
  if (url.indexOf(searchPrefix) === 0) {
    var rawQ  = url.replace(searchPrefix, '').split('?')[0];
    var query = decodeURIComponent(rawQ).trim();

    if (query) {
      fetchListing(buildSearchUrl(query, page), success, error);
    } else {
      fetchListing(buildCatalogUrl('most-popular', page), success, error);
    }
    return;
  }

  // 3) Категория: yjizz/cat/milf
  if (url.indexOf(catPrefix) === 0) {
    var catPath = url.replace(catPrefix, '').split('?')[0];
    fetchListing(buildCatalogUrl(catPath, page), success, error);
    return;
  }

  // 4) Новинки
  if (url === NAME + '/new') {
    fetchListing(buildCatalogUrl('new-videos', page), success, error);
    return;
  }

  // 5) Всё остальное → популярное
  fetchListing(buildCatalogUrl('most-popular', page), success, error);
}

// ----------------------------------------------------------
// QUALITIES — извлечь URL видео из страницы видео
// ----------------------------------------------------------
function fetchQualities(pageUrl, success, error) {
  httpGet(pageUrl, function (html) {
    // Паттерны поиска video URL в исходнике страницы
    var patterns = [
      /video_url['":\s]+['"]([^'"]+\.mp4[^'"]*)['"]/i,
      /file:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i,
      /['"]([^'"]+youjizz[^'"]+\.mp4[^'"]*)['"]/i,
      /source\s+src=['"]([^'"]+\.mp4[^'"]*)['"]/i
    ];

    for (var i = 0; i < patterns.length; i++) {
      var m = html.match(patterns[i]);
      if (m && m[1]) {
        var videoUrl = prependHttps(m[1]);
        success([{ url: videoUrl, label: 'HD' }]);
        return;
      }
    }

    error('Video URL не найден');
  }, error);
}

// ----------------------------------------------------------
// API ПАРСЕРА
// ----------------------------------------------------------
var YJizzParser = {

  // Главный экран
  main: function (params, success, error) {
    fetchListing(buildCatalogUrl('most-popular', 1), success, error);
  },

  // Каталог / категория / поиск
  view: function (params, success, error) {
    var page = parseInt(params.page, 10) || 1;
    var url  = params.url || (NAME + '/popular');
    routeView(url, page, success, error);
  },

  // Глобальный поиск через строку Lampa
  search: function (params, success, error) {
    var query = (params.query || '').trim();
    var page  = parseInt(params.page, 10) || 1;

    if (!query) {
      success({ title: '', results: [], collection: true, total_pages: 1 });
      return;
    }

    fetchListing(buildSearchUrl(query, page), function (data) {
      data.title = 'YouJizz: ' + query;
      data.url   = NAME + '/search/' + encodeURIComponent(query);
      success(data);
    }, error);
  },

  // Получить прямой URL видео
  qualities: function (params, success, error) {
    var url = params.url || '';
    if (!url) { error('Нет URL'); return; }
    fetchQualities(url, success, error);
  }
};

// ----------------------------------------------------------
// РЕГИСТРАЦИЯ
// ----------------------------------------------------------
function tryRegister() {
  if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
    window.AdultPlugin.registerParser(NAME, YJizzParser);
    console.log('[yjizz] v1.1.0 зарегистрирован');
    try {
      setTimeout(function () {
        Lampa.Noty.show('YouJizz [yjizz] v1.1.0 подключён', { time: 2500 });
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
