// =============================================================
// lkno.js — Lenkino Parser для AdultJS
// Version  : 1.0.1
// Changes  :
//   [1.0.1] qualities() — улучшен regex: приоритет /get_file/,
//           добавлена обработка экранирования \/
// =============================================================

(function () {
  'use strict';

  var NAME     = 'lkno';
  var BASE_URL = 'https://wes.lenkino.adult';

  function fixUrl(url) {
    if (!url) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('/') === 0)  return BASE_URL + url;
    return url;
  }

  function request(url, onSuccess, onError) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, onSuccess, onError);
    } else {
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

  function parseHtml(html, query) {
    var results   = [];
    var container = document.createElement('div');
    container.innerHTML = html;

    var items = container.querySelectorAll('.item');
    for (var i = 0; i < items.length; i++) {
      var item   = items[i];
      var linkEl = item.querySelector('a');
      var imgEl  = item.querySelector('img');
      if (!linkEl || !imgEl) continue;

      var title        = imgEl.getAttribute('alt') || linkEl.textContent.trim() || 'Video';
      var videoPageUrl = fixUrl(linkEl.getAttribute('href'));
      var poster       = fixUrl(imgEl.getAttribute('src') || imgEl.getAttribute('data-src'));

      results.push({
        name:    title,
        url:     videoPageUrl,
        video:   videoPageUrl,
        picture: poster,
        img:     poster,
        source:  NAME,
        json:    true
      });
    }
    return results;
  }

  function buildMenu() {
    return [
      {
        title:        '🔍 Поиск',
        search_on:    true,
        playlist_url: NAME + '/search/'
      },
      {
        title:        '🔥 Популярное',
        playlist_url: NAME + '/popular'
      }
    ];
  }

  function fetchList(url, query, success, error) {
    request(url, function (html) {
      var items = parseHtml(html, query);
      success({
        results:     items,
        collection:  true,
        total_pages: 10,
        menu:        buildMenu()
      });
    }, error);
  }

  var LenkinoParser = {

    main: function (params, success, error) {
      fetchList(BASE_URL + '/', 'Главная', success, error);
    },

    view: function (params, success, error) {
      var page     = params.page || 1;
      var url      = params.url || '';
      var finalUrl = BASE_URL;

      if (url.indexOf('search=') !== -1) {
        var query = url.split('search=')[1];
        finalUrl = BASE_URL + '/?q=' + query;
      } else if (url.indexOf('/search/') !== -1) {
        var queryPath = url.split('/search/')[1];
        if (queryPath) finalUrl = BASE_URL + '/?q=' + queryPath;
      }

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

    // ★ ИЗМЕНЕНО: улучшен regex, добавлен приоритет /get_file/
    qualities: function (videoPageUrl, success, error) {
      request(videoPageUrl, function (html) {

        // Убираем экранирование \/ → / (частый случай в JS-строках на странице)
        var src = html.replace(/\\\//g, '/');

        var match = null;

        // Паттерн 1: /get_file/ — основной для Lenkino
        match = src.match(/["'](https?:\/\/[^"']*\/get_file\/[^"']*\.mp4\/?)[^"']*/i);

        // Паттерн 2: любой MP4 в кавычках
        if (!match) {
          match = src.match(/"(https?:\/\/[^"]+?\.mp4[^"]*?)"/i);
        }

        // Паттерн 3: MP4 в одинарных кавычках
        if (!match) {
          match = src.match(/'(https?:\/\/[^']+?\.mp4[^']*?)'/i);
        }

        if (match && match[1]) {
          var cleanUrl = match[1].replace(/\\/g, '');
          console.log('[lkno] MP4:', cleanUrl.substring(0, 80));
          // Формат оставлен как в v1.0.0 — AdultJS понимает через data.qualities || data
          success({ qualities: { '720p': cleanUrl } });
          return;
        }

        // Fallback: тег <video source>
        var container = document.createElement('div');
        container.innerHTML = html;
        var source    = container.querySelector('video source, video[src]');
        var streamUrl = source
          ? (source.getAttribute('src') || source.getAttribute('data-src'))
          : '';

        if (streamUrl) {
          success({ qualities: { 'Auto': fixUrl(streamUrl) } });
        } else {
          error('Видео не найдено на странице');
        }

      }, error);
    }
  };

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
