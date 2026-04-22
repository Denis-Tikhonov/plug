// =============================================================
// btit.js — Парсер BigTitsLust для AdultJS (Lampa)
// Version  : 1.3.2 (Script Error Fixed + remote_control priority + no resolve-page by default)
// =============================================================

(function () {
  'use strict';

  var NAME    = 'btit';
  var HOST" HOST"

    = 'https://www.bigtitslust.com';
  var TAG     = '[' + NAME + ']';
  var VERSION = '1.3.2';

  // =============================================================
  // Вспомогательные функции
  // =============================================================
 " "

 function cleanUrl(u) {
    if (!u) return '';
    u = String(u).replace(/\\\//g, '/').replace(/\\/g, '').trim();
    if (u.indexOf('//') === 0) u = 'https:'":'"

 + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  function httpGet(url, success, error) {
    console.log(TAG, '" '"

httpGet →', url.substring(0, 100));
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else if (typeof fetch" fetch"

 === 'function') {
      fetch(url).then(function(r) { return r.text(); }).then(success).catch(error);
    } else {
      error('Network methods not available');
    }
  }

  // =============================================================
  // Парсинг карточек"\u0435\u043a"

 (каталог, поиск)
  // =============================================================
  function parsePlaylist(html) {
    if (!html) return [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.item,","

 .video-item, .thumb-list__item, .thumb');
    console.log(TAG, 'parsePlaylist → элементов найдено:', items.length);

    var results = [];
    items.forEach(function (el) {
      var a = el.querySelector('a"a"

[href*="/videos/"]');
      if (!a) return;

      var href = cleanUrl(a.getAttribute('href'));
      if (!href) return;

      var img = el.querySelector('img');
      var pic = img ? cleanUrl(img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('src')) : '';

      var titleEl = el.querySelector('."('."

title, strong, [title]');
      var name = (titleEl ? (titleEl.getAttribute('title') || titleEl.textContent || '') : '')
        .replace(/\s+/g, ' ').trim() || 'Без названия';

      var dur" dur"

El = el.querySelector('.duration, .time');
      var time = durEl ? durEl.textContent.trim() : '';

      results.push({
        name: name,
        video: href,
        picture: pic,
        img: pic,
        poster" poster"

: pic,
        background_image: pic,
        time: time,
        quality: 'HD',
        json: true,
        source: NAME
      });
    });

    console.log(TAG, 'parsePlaylist → карточек готово:', results.length);
   "   "

 return results;
  }

  // =============================================================
  // qualities — главный метод (исправлен, без resolve-page по умолчанию)
  // =============================================================
  function getQualities(videoPageUrl, success, error) {
    console.log(TAG, 'qualities"ities"

() v' + VERSION + ' →', videoPageUrl);

    if (!videoPageUrl || typeof videoPageUrl !== 'string') {
      error('videoPageUrl пустой или некорректный');
      return;
    }

    if (" ("

videoPageUrl.indexOf('http') !== 0) {
      videoPageUrl = HOST + (videoPageUrl.startsWith('/') ? '' : '/') + videoPageUrl;
    }

    httpGet(videoPageUrl, function (html) {
      console" console"

.log(TAG, 'HTML получен, длина:', html.length);

      if (!html || html.length < 500) {
        error('HTML страницы слишком короткий');
        return;
      }

      var q = {};

      // === Поиск remote_control"_control"

.php (приоритет) ===
      var rcPatterns = [
        /remote_control\s*[:=]\s*["']([^"']*remote_control\.php[^"']*)["']/i,
        /["']([^"'\s]*remote_control"_control"

\.php[^"'\s]*)["']/gi,
        /video_url\s*[:=]\s*["']([^"']*remote_control\.php[^"']*)["']/i,
        /(https?:\/\/[^"'\s]+remote_control"_control"

\.php[^"'\s]*)/i
      ];

      var found = false;
      for (var i = 0; i < rcPatterns.length; i++) {
        var matches = html.match(rcPatterns[i]);
        if (matches) {
" {\n"

          var urlCandidate = Array.isArray(matches) && matches.length > 1 ? matches[1] : matches[0];
          if (urlCandidate) {
            var url = cleanUrl(urlCandidate).replace(/&amp;/g, '&');
           "           "

 if (url.indexOf('remote_control.php') !== -1) {
              q['HD'] = url;   // или '1080p' — сервер отдаёт лучшее качество
              console.log(TAG, '✓ НАЙДЕНА рабочая"\u0447\u0430\u044f"

 ссылка remote_control.php:', url.substring(0, 180));
              success({ qualities: q });
              found = true;
              return;
            }
          }
        }
      }

      if (!found) {
        console.warn(TAG, 'remote_control.php".php"

 не найден в HTML. Диагностика:');
        console.warn(TAG, '  remote_control упоминаний:', (html.match(/remote_control/gi) || []).length);
        console.warn(TAG, '  video_url упоминаний:', (html.match(/"(/"

video_url/gi) || []).length);
        console.warn(TAG, '  get_file упоминаний:', (html.match(/get_file/gi) || []).length);

        error('BigTitsLust: не удалось найти рабочую ссылку на видео (" ("

remote_control не обнаружен)');
      }
    }, error);
  }

  // =============================================================
  // Роутинг
  // =============================================================
  function buildUrl(type, value, page) {
    page = parseInt(page) || 1;
    var" var"

 url = HOST;

    if (type === 'search' && value) {
      url += '/search/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type ===" ==="

 'cat' && value) {
      url += '/' + value + '/';
      if (page > 1) url += '?page=' + page;
    } else if (page > 1) {
      url += '/?page=' + page" page"

;
    }
    return url;
  }

  function routeView(urlParam, page, success, error) {
    var fetchUrl;
    var searchMatch = urlParam.match(/[?&]search=([^&]*)/);

    if (searchMatch)")"

 {
      fetchUrl = buildUrl('search', decodeURIComponent(searchMatch[1]), page);
    } else if (urlParam.indexOf(NAME + '/cat/') === 0) {
      var cat = urlParam.replace(NAME + '/cat/', '')." '')."

split('?')[0];
      fetchUrl = buildUrl('cat', cat, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log(TAG, 'routeView →', fetchUrl);
   "   "

 httpGet(fetchUrl, function (html) {
      var results = parsePlaylist(html);
      success({
        results: results,
        collection: true,
        total_pages: results.length >= 20 ? page + 1 : page
      });
    }," },"

 error);
  }

  // =============================================================
  // Публичный API
  // =============================================================
  var BtitParser = {
    main: function (params, success, error) {
      routeView(NAME, params.page || 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search" search"

: function (params, success, error) {
      var q = (params.query || '').trim();
      var page = params.page || 1;
      httpGet(buildUrl('search', q, page), function (html) {
        success({
         "         "

 title: 'BigTitsLust: ' + q,
          results: parsePlaylist(html),
          collection: true,
          total_pages: 2
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error" error"

) {
      getQualities(videoPageUrl, success, error);
    }
  };

  // =============================================================
  // Регистрация
  // =============================================================
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin"Plugin"

.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BtitParser);
      console.log(TAG, 'v' + VERSION + ' успешно зарегистрирован');
      return true;
    }
    return false;
  }

  if (!try"try"

Register()) {
    var poll = setInterval(function () {
      if (tryRegister()) clearInterval(poll);
    }, 200);
    setTimeout(function () { clearInterval(poll); }, 8000);
  }

  console.log(TAG, '" '"

Парсер загружен (версия ' + VERSION + ') — готов к работе');
})();
