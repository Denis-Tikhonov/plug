// =============================================================
// phub.js — Парсер PornHub для AdultJS
// Version  : 1.1.0
// Changed  : [1.0.0] Первая версия: категории + поиск, без авторизации
//            [1.1.0] FIX: убран запрещённый заголовок User-Agent из
//                    fallback fetch() — forbidden header → TypeError.
//            [1.1.0] FIX: основной путь через Lampa.Reguest.silent
//                    явно передаёт dataType:'text' чтобы получить HTML,
//                    а не JSON-парсинг ответа.
//            [1.1.0] FIX: регистрация добавила polling — парсер
//                    загружается асинхронно и AdultPlugin может ещё
//                    не существовать в момент выполнения скрипта.
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // [1.0.0] КОНФИГУРАЦИЯ
  // ----------------------------------------------------------
  var CONFIG = {
    base_url:   'https://www.pornhub.com',
    search_url: 'https://www.pornhub.com/video/search',
    page_param: 'page',
    sel: {
      item:     'li.pcVideoListItem',
      title:    'a.thumbnailTitle, .title a',
      thumb:    'img.js-videoThumb, img.thumb',
      href:     'a.linkVideoThumb, a.js-linkVideoThumb',
      duration: 'var.duration',
      views:    '.views var',
    },
    categories: [
      { title: 'Главная',    url: 'https://www.pornhub.com/recommended'   },
      { title: 'Новинки',    url: 'https://www.pornhub.com/video?o=newest' },
      { title: 'Популярное', url: 'https://www.pornhub.com/video?o=mv'     },
      { title: 'Топ недели', url: 'https://www.pornhub.com/video?o=tr&t=w' },
      { title: 'Топ месяца', url: 'https://www.pornhub.com/video?o=tr&t=m' },
      { title: 'Лучшее',     url: 'https://www.pornhub.com/video?o=tr&t=a' },
      { title: 'Русские',    url: 'https://www.pornhub.com/video?c=36'     },
      { title: 'Азиатки',    url: 'https://www.pornhub.com/video?c=1'      },
      { title: 'Анал',       url: 'https://www.pornhub.com/video?c=2'      },
      { title: 'Оральный',   url: 'https://www.pornhub.com/video?c=70'     },
      { title: 'Лесбиянки',  url: 'https://www.pornhub.com/video?c=14'     },
      { title: 'Студентки',  url: 'https://www.pornhub.com/video?c=7'      },
      { title: 'Массаж',     url: 'https://www.pornhub.com/video?c=55'     },
      { title: 'Зрелые',     url: 'https://www.pornhub.com/video?c=44'     },
    ],
  };

  // ----------------------------------------------------------
  // [1.1.0] HTTP-ХЕЛПЕР — загрузка HTML
  //
  // БАГ v1.0.0: fallback fetch() передавал заголовок 'User-Agent'.
  //   Браузеры и WebView относят его к "forbidden headers" →
  //   fetch бросает TypeError → error() → парсер не работает.
  //
  // ИСПРАВЛЕНИЕ v1.1.0:
  //   1. Основной путь: Lampa.Reguest.silent с { dataType:'text' }.
  //      На Android TV это нативный запрос без CORS-ограничений.
  //   2. Fallback: чистый fetch() БЕЗ заголовков.
  //   3. Проверка ответа: если silent вернул не строку (JSON-режим),
  //      переключаемся на fetch.
  // ----------------------------------------------------------
  function fetchHtml(url, success, error) {
    try {
      var net = new Lampa.Reguest();
      net.silent(
        url,
        function (data) {
          if (typeof data === 'string' && data.length > 50) {
            success(data);
          } else {
            // silent вернул объект — Lampa распарсил как JSON
            // Переключаемся на fetch
            _fetchFallback(url, success, error);
          }
        },
        function () { _fetchFallback(url, success, error); },
        false,
        { dataType: 'text', timeout: 10000 }
      );
    } catch (e) {
      _fetchFallback(url, success, error);
    }
  }

  // [1.1.0] fetch без запрещённых заголовков
  function _fetchFallback(url, success, error) {
    if (typeof fetch === 'undefined') { error('fetch unavailable'); return; }
    fetch(url, { method: 'GET' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(success)
      .catch(error);
  }

  // ----------------------------------------------------------
  // [1.0.0] УТИЛИТЫ ПАРСИНГА
  // ----------------------------------------------------------
  function buildPageUrl(baseUrl, page) {
    if (!page || page <= 1) return baseUrl;
    var sep = baseUrl.indexOf('?') !== -1 ? '&' : '?';
    return baseUrl + sep + CONFIG.page_param + '=' + page;
  }

  function parseItem(li) {
    var titleEl = li.querySelector(CONFIG.sel.title);
    var thumbEl = li.querySelector(CONFIG.sel.thumb);
    var hrefEl  = li.querySelector(CONFIG.sel.href);
    if (!titleEl || !hrefEl) return null;

    var name    = (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
    var href    = hrefEl.getAttribute('href') || '';
    var picture = '';
    var preview = '';

    if (thumbEl) {
      picture = thumbEl.getAttribute('data-mediumthumb') || thumbEl.getAttribute('src') || '';
      preview = thumbEl.getAttribute('data-mediabook')   || '';
    }

    var durEl    = li.querySelector(CONFIG.sel.duration);
    var duration = durEl ? durEl.textContent.trim() : '';
    var videoUrl = href.indexOf('http') === 0 ? href : CONFIG.base_url + href;

    return {
      name:    name,
      picture: picture,
      preview: preview,
      video:   videoUrl,
      quality: duration,
      time:    duration,
      source:  'phub',
    };
  }

  function parsePage(html) {
    var doc   = new DOMParser().parseFromString(html, 'text/html');
    var items = [];
    doc.querySelectorAll(CONFIG.sel.item).forEach(function (li) {
      var card = parseItem(li);
      if (card && card.name && card.video) items.push(card);
    });
    return items;
  }

  function hasNextPage(html, page) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    return !!doc.querySelector('.page_next:not(.disabled), a[data-page="' + (page + 1) + '"]');
  }

  function buildMenu(activeUrl) {
    return CONFIG.categories.map(function (cat) {
      return { title: cat.title, playlist_url: cat.url, selected: cat.url === activeUrl };
    });
  }

  // ----------------------------------------------------------
  // [1.0.0] ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ----------------------------------------------------------
  var PhubParser = {

    main: function (params, success, error) {
      var url = CONFIG.categories[0].url;
      fetchHtml(url, function (html) {
        var results = parsePage(html);
        if (!results.length) { error('PornHub: нет карточек'); return; }
        success({ results: results, collection: true, total_pages: 30, menu: buildMenu(url) });
      }, error);
    },

    view: function (params, success, error) {
      var url  = (params.url || CONFIG.categories[0].url).split('&pg=')[0].split('?pg=')[0];
      var page = parseInt(params.page, 10) || 1;
      fetchHtml(buildPageUrl(url, page), function (html) {
        var results = parsePage(html);
        if (!results.length) { error('PornHub: нет карточек на странице ' + page); return; }
        success({
          results:     results,
          collection:  true,
          total_pages: hasNextPage(html, page) ? page + 10 : page,
          menu:        buildMenu(url),
        });
      }, error);
    },

    search: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = CONFIG.search_url + '?search=' + encodeURIComponent(params.query || '');
      fetchHtml(buildPageUrl(url, page), function (html) {
        var results = parsePage(html);
        if (!results.length) { error('PornHub: ничего не найдено'); return; }
        success({
          title:       'PornHub: ' + params.query,
          results:     results,
          url:         url,
          collection:  true,
          total_pages: hasNextPage(html, page) ? page + 10 : page,
        });
      }, error);
    },
  };

  // ----------------------------------------------------------
  // [1.1.0] РЕГИСТРАЦИЯ с polling
  //
  // БАГ v1.0.0: регистрация выполнялась только один раз сразу.
  //   Если AdultJS.js ещё не создал window.AdultPlugin в момент
  //   загрузки phub.js — парсер молча не регистрировался.
  //
  // ИСПРАВЛЕНИЕ v1.1.0: polling каждые 100 мс до 10 секунд.
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser('phub', PhubParser);
      console.log('[phub] v1.1.0 registered OK');
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
