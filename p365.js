// =============================================================
// p365.js — Парсер Porno365 для AdultJS (Lampa)
// Version  : 1.3.0
// [FIX] Решена проблема с воспроизведением (очистка ссылок)
// [FIX] Добавлен универсальный движок экстракции видео
// =============================================================

(function () {
  'use strict';

  var NAME = 'p365';
  var HOST = 'https://top.porno365tube.win';

  // Конфигурация категорий (названия и пути)
  var CATEGORIES = [
    { title: '🔥 HD порно',    slug: 'hd-porno' },
    { title: '🔞 Анал',       slug: 'anal' },
    { title: '👧 Молодые',    slug: 'molodye' },
    { title: '👱 Блондинки',   slug: 'blondinki' },
    { title: '🍭 Минет',      slug: 'minet' },
    { title: '🍑 Большие жопы', slug: 'bolshie-jopy' },
    { title: '🇷🇺 Русское',    slug: 'russkoe' },
    { title: '👵 Зрелые',     slug: 'zrelye' }
  ];

  // ===========================================================
  // УНИВЕРСАЛЬНЫЙ ДВИЖОК ЭКСТРАКЦИИ ВИДЕО
  // ===========================================================

  // Набор правил для поиска видео-потоков в HTML коде страницы
  var VIDEO_CONFIG = {
    rules: [
      { label: 'HLS (Auto)', re: /setVideoHlsUrl\(['"]([^'"]+)['"]/ },
      { label: '720p (MP4)', re: /setVideoUrlHigh\(['"]([^'"]+)['"]/ },
      { label: '480p (MP4)', re: /setVideoUrlLow\(['"]([^'"]+)['"]/ },
      { label: 'SD (MP4)',   re: /video_url:\s*['"]([^'"]+)['"]/ }
    ],
    // Резервный поиск любой ссылки на mp4, если правила выше не сработали
    fallback: /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g
  };

  /**
   * Функция очистки URL [КРИТИЧЕСКИ ВАЖНО ДЛЯ ТВ]
   * Убирает экранирование, добавляет домены и протоколы.
   */
  function cleanUrl(url) {
    if (!url) return '';
    
    // 1. Убираем обратные слеши (бывает "https:\/\/site.com")
    var clean = url.replace(/\\/g, '');
    
    // 2. Добавляем протокол, если ссылка начинается с "//"
    if (clean.indexOf('//') === 0) clean = 'https:' + clean;
    
    // 3. Добавляем хост, если ссылка относительная (начинается с "/")
    if (clean.indexOf('/') === 0 && clean.indexOf('//') !== 0) {
      clean = HOST + clean;
    }

    return clean;
  }

  /**
   * Ищет все доступные качества видео на странице
   */
  function extractQualities(html) {
   console.log('[P365] html length:', html.length);
    var q = {};
    
    // Применяем основные правила
    VIDEO_CONFIG.rules.forEach(function(rule) {
      var match = html.match(rule.re);
      if (match && match[1]) {
        q[rule.label] = cleanUrl(match[1]);
      }
    });

    // Если ничего не нашли через правила - ищем любую прямую ссылку на mp4
    if (Object.keys(q).length === 0) {
      var any = html.match(VIDEO_CONFIG.fallback);
      if (any) {
        q['Source (Auto)'] = cleanUrl(any[0]);
      }
    }
    
    return q;
  }

  // ===========================================================
  // СЕТЕВЫЕ ЗАПРОСЫ И ПАРСИНГ КАТАЛОГА
  // ===========================================================

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      // Резервный метод, если плагин не найден (для тестов в браузере)
      fetch(url).then(function(r){ return r.text(); }).then(success).catch(error);
    }
  }

  function parsePlaylist(html) {
    var results = [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.video-block'); // Селектор карточки

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var a = el.querySelector('a[href*="/videos/"]');
      if (!a) continue;

      var href = a.getAttribute('href');
      if (href.indexOf('http') !== 0) href = HOST + href;

      var img = el.querySelector('img');
      var pic = '';
      if (img) {
        // На сайтах часто используется lazy-load (data-src)
        pic = img.getAttribute('data-src') || img.getAttribute('src') || '';
        pic = cleanUrl(pic);
      }

      var titleEl = el.querySelector('.title');
      var name = titleEl ? titleEl.textContent.trim() : (img ? img.getAttribute('alt') : 'No Title');

      var durEl = el.querySelector('.duration');
      var time = durEl ? durEl.textContent.trim() : '';

      results.push({
        name: name,
        video: href, // Здесь ссылка на страницу видео, позже qualities() вытащит файл
        picture: pic,
        img: pic,
        poster: pic,
        time: time,
        quality: 'HD',
        json: true, // Говорим Lampa, что нужно вызывать qualities()
        source: NAME
      });
    }
    return results;
  }

  // ===========================================================
  // РОУТИНГ (НАВИГАЦИЯ)
  // ===========================================================

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

  function routeView(url, page, success, error) {
    var fetchUrl;
    
    // Обработка встроенного поиска Lampa (через фильтр)
    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      fetchUrl = buildUrl(null, page, decodeURIComponent(searchMatch[1]));
    } 
    // Обработка категорий
    else if (url.indexOf(NAME + '/cat/') === 0) {
      var cat = url.replace(NAME + '/cat/', '').split('?')[0];
      fetchUrl = buildUrl(cat, page);
    } 
    // Главная
    else {
      fetchUrl = buildUrl(null, page);
    }

    httpGet(fetchUrl, function (html) {
      var results = parsePlaylist(html);
      if (!results.length) return error('Контент не найден');
      
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

  // ===========================================================
  // ИНТЕРФЕЙС ПАРСЕРА ДЛЯ ADULTJS
  // ===========================================================

  var P365Parser = {
    main: function (params, success, error) {
      routeView(NAME + '/main', 1, success, error);
    },
    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },
    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var url = buildUrl(null, params.page || 1, query);
      httpGet(url, function(html) {
        var results = parsePlaylist(html);
        success({
          title: 'P365: ' + query,
          results: results,
          collection: true,
          total_pages: 1
        });
      }, error);
    },
    /**
     * Вызывается Lampa при нажатии на карточку (т.к. json: true)
     */
    qualities: function (videoPageUrl, success, error) {
      console.log('[P365] Извлечение видео из:', videoPageUrl);
      httpGet(videoPageUrl, function (html) {
        var found = extractQualities(html);
        
        if (Object.keys(found).length > 0) {
          // Отдаем объект с качествами плееру Lampa
          success({ qualities: found });
        } else {
          error('Не удалось найти ссылку на видео файл');
        }
      }, error);
    }
  };

  // Регистрация в глобальном плагине
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, P365Parser);
      console.log('[P365] Парсер успешно зарегистрирован');
      return true;
    }
    return false;
  }

  // Пробуем зарегистрироваться сразу или через интервал (если AdultJS еще грузится)
  if (!tryRegister()) {
    var poll = setInterval(function () {
      if (tryRegister()) clearInterval(poll);
    }, 200);
    // Остановить попытки через 5 секунд
    setTimeout(function(){ clearInterval(poll); }, 5000);
  }
})();
