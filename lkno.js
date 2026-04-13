// =============================================================
// lkno.js — Lenkino Parser для AdultJS
// Version  : 1.0.0
// Based on : Lenkino (wes.lenkino.adult)
// Structure: xds_1.1.0 pattern
// =============================================================

(function () {
  'use strict';

  var NAME     = 'lkno';
  var BASE_URL = 'https://wes.lenkino.adult';

  // ----------------------------------------------------------
  // УТИЛИТЫ И КОРРЕКТИРОВКА ССЫЛОК
  // ----------------------------------------------------------
  function fixUrl(url) {
    if (!url) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('/') === 0) return BASE_URL + url;
    return url;
  }

  // ----------------------------------------------------------
  // СЕТЕВОЙ ЗАПРОС (ЧЕРЕЗ ADULTJS NETWORK)
  // ----------------------------------------------------------
  function request(url, onSuccess, onError) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, onSuccess, onError);
    } else {
      // Fallback если плагин еще не прогрузил метод
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) onSuccess(xhr.responseText);
          else onError('HTTP ' + xhr.status);
        }
      };
      xhr.send();
    }
  }

  // ----------------------------------------------------------
  // ПАРСИНГ HTML КОНТЕНТА
  // ----------------------------------------------------------
  function parseHtml(html, query) {
    var results = [];
    var container = document.createElement('div');
    container.innerHTML = html;

    // Согласно 6 json.txt: cardSelector = ".item"
    var items = container.querySelectorAll('.item');

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var linkEl = item.querySelector('a');
      var imgEl  = item.querySelector('img');

      if (!linkEl || !imgEl) continue;

      var title = imgEl.getAttribute('alt') || linkEl.textContent.trim() || 'Video';
      var videoPageUrl = fixUrl(linkEl.getAttribute('href'));
      var poster = fixUrl(imgEl.getAttribute('src') || imgEl.getAttribute('data-src'));

      results.push({
        name: title,
        url: videoPageUrl,      // Страница видео
        video: videoPageUrl,    // В AdultJS это триггерит загрузку парсера для поиска mp4
        picture: poster,
        img: poster,
        source: NAME,
        json: true             // Указываем, что видео-ссылку нужно "добыть" через qualities()
      });
    }

    return results;
  }

  // ----------------------------------------------------------
  // МЕНЮ
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      {
        title: '🔍 ' + (Lampa.Lang ? Lampa.Lang.translate('search') : 'Поиск'),
        search_on: true,
        playlist_url: NAME + '/search/'
      },
      {
        title: '🔥 Популярное',
        playlist_url: NAME + '/popular'
      }
    ];
  }

  // ----------------------------------------------------------
  // FETCH ФУНКЦИИ
  // ----------------------------------------------------------
  function fetchList(url, query, success, error) {
    request(url, function (html) {
      var items = parseHtml(html, query);
      success({
        results: items,
        collection: true,
        total_pages: 10, // Lenkino имеет много страниц
        menu: buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // ИНТЕРФЕЙС ПАРСЕРА
  // ----------------------------------------------------------
  var LenkinoParser = {
    main: function (params, success, error) {
      fetchList(BASE_URL + '/', 'Главная', success, error);
    },

    view: function (params, success, error) {
      var page = params.page || 1;
      var url = params.url || '';
      var finalUrl = BASE_URL;

      // Логика роутинга URL (поиск или категория)
      if (url.indexOf('search=') !== -1) {
        var query = url.split('search=')[1];
        finalUrl = BASE_URL + '/?q=' + query;
      } else if (url.indexOf('/search/') !== -1) {
        var queryPath = url.split('/search/')[1];
        if (queryPath) finalUrl = BASE_URL + '/?q=' + queryPath;
      }

      // Пагинация (согласно 6 json.txt паттерн /page/N)
      if (page > 1) {
        finalUrl += (finalUrl.indexOf('?') !== -1 ? '&' : '/?') + 'page=' + page;
      }

      fetchList(finalUrl, 'Каталог', success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      if (!query) return success({ results: [] });

      var url = BASE_URL + '/?q=' + encodeURIComponent(query);
      fetchList(url, query, function (data) {
        data.title = 'Lenkino: ' + query;
        success(data);
      }, error);
    },

    // Метод для получения прямой ссылки на MP4 со страницы видео
    qualities: function (videoPageUrl, success, error) {
      request(videoPageUrl, function (html) {
        // Поиск MP4 ссылки в HTML (согласно pattern из 6 json.txt)
        // Ищем паттерн /get_file/.../*.mp4/
        var mp4Regex = /"(https?:\/\/[^"]+?\.mp4[^"]*?)"/i;
        var match = html.match(mp4Regex);

        if (match && match[1]) {
          var cleanUrl = match[1].replace(/\\/g, '');
          success({
            qualities: {
              '720p': cleanUrl
            }
          });
        } else {
          // Если не нашли регуляркой, пытаемся найти в тегах source
          var container = document.createElement('div');
          container.innerHTML = html;
          var source = container.querySelector('video source, video[src]');
          var streamUrl = source ? (source.getAttribute('src') || source.getAttribute('data-src')) : '';

          if (streamUrl) {
            success({ qualities: { 'Auto': fixUrl(streamUrl) } });
          } else {
            error('Видео не найдено на странице');
          }
        }
      }, error);
    }
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ ПАРСЕРА
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, LenkinoParser);
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _poll = setInterval(function () {
      if (tryRegister()) clearInterval(_poll);
    }, 200);
  }

})();
