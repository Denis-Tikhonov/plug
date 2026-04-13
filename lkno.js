// =============================================================
// lkno.js — Lenkino Parser для AdultJS
// Version  : 1.2.0
// Changes  :
//   [1.2.0] Стартовая страница → / (корень сайта)
//           Пагинация → /page/N (без trailing slash)
//           Категории → /{slug} (без trailing slash)
//           Поиск → /?q={query}&page=N
//           Убран несуществующий slug top-porno из CATS
//           Фильтрация внешних ссылок в parseHtml
// =============================================================

(function () {
  'use strict';

  var NAME     = 'lkno';
  var BASE_URL = 'https://wes.lenkino.adult';

  // ----------------------------------------------------------
  // КАТЕГОРИИ (top-porno удалён — возвращает 404)
  // ----------------------------------------------------------
  var CATS = [
    { title: '🇷🇺 Русское',        val: 'a1-russian'  },
    { title: '👩 Зрелые (MILF)',   val: 'milf-porn'   },
    { title: '💋 Мачеха',          val: 'stepmom'     },
    { title: '🎭 Анал',            val: 'anal-porno'  },
    { title: '🍒 Большие сиськи',  val: 'big-tits'    },
    { title: '🌸 Эротика',         val: 'erotic'      },
    { title: '❤️ Красивый секс',   val: 'beautiful'   },
    { title: '🎓 Молодые',         val: 'teen'        },
    { title: '🌏 Азиатки',         val: 'asian'       },
    { title: '🎥 Любительское',    val: 'amateur'     },
    { title: '👅 Минет',           val: 'blowjob'     },
    { title: '💦 Кремпай',         val: 'creampie'    },
    { title: '📹 POV',             val: 'pov'         },
    { title: '🏳‍🌈 Лесби',         val: 'lesbian'     },
    { title: '🍑 Big Ass',         val: 'big-ass'     },
    { title: '🌍 Межрасовый',      val: 'interracial' },
    { title: '👨‍👩‍👧 Семья',          val: 'family'      },
    { title: '🎌 Хентай',          val: 'hentai'      },
    { title: '💆 Массаж',          val: 'massage'     },
  ];

  // ----------------------------------------------------------
  // УТИЛИТЫ
  // ----------------------------------------------------------
  function fixUrl(url) {
    if (!url) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('/')  === 0) return BASE_URL + url;
    return url;
  }

  // Только ссылки нашего сайта — фильтрует рекламные карточки
  function isInternalUrl(url) {
    return url && url.indexOf(BASE_URL) === 0;
  }

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL
  // ----------------------------------------------------------
  // Примеры:
  //   buildListUrl('', 1)            → https://wes.lenkino.adult/
  //   buildListUrl('', 2)            → https://wes.lenkino.adult/page/2
  //   buildListUrl('a1-russian', 1)  → https://wes.lenkino.adult/a1-russian
  //   buildListUrl('a1-russian', 2)  → https://wes.lenkino.adult/a1-russian/page/2
  function buildListUrl(slug, page) {
    page = parseInt(page, 10) || 1;
    if (!slug) {
      return page <= 1
        ? BASE_URL + '/'
        : BASE_URL + '/page/' + page;
    }
    return page <= 1
      ? BASE_URL + '/' + slug
      : BASE_URL + '/' + slug + '/page/' + page;
  }

  // Примеры:
  //   buildSearchUrl('wife', 1)  → https://wes.lenkino.adult/?q=wife
  //   buildSearchUrl('wife', 2)  → https://wes.lenkino.adult/?q=wife&page=2
  function buildSearchUrl(query, page) {
    page = parseInt(page, 10) || 1;
    var url = BASE_URL + '/?q=' + encodeURIComponent(query);
    if (page > 1) url += '&page=' + page;
    return url;
  }

  // ----------------------------------------------------------
  // СЕТЕВОЙ ЗАПРОС
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  // ----------------------------------------------------------
  function parseHtml(html) {
    var results   = [];
    var container = document.createElement('div');
    container.innerHTML = html;

    var items = container.querySelectorAll('.item');
    if (!items.length) return results;

    for (var i = 0; i < items.length; i++) {
      var item   = items[i];
      var linkEl = item.querySelector('a');
      var imgEl  = item.querySelector('img');

      if (!linkEl || !imgEl) continue;

      var href = fixUrl(linkEl.getAttribute('href') || '');

      // Отсекаем рекламные и внешние карточки (например tlenporno.com)
      if (!isInternalUrl(href)) continue;

      var title  = (imgEl.getAttribute('alt') || linkEl.textContent || '').trim();
      var poster = fixUrl(
        imgEl.getAttribute('data-src') ||   // lazy-load
        imgEl.getAttribute('src')      || ''
      );

      if (!title) continue;

      results.push({
        name:             title,
        url:              href,
        video:            href,
        picture:          poster,
        img:              poster,
        poster:           poster,
        background_image: poster,
        source:           NAME,
        json:             true
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
        title:        '🔍 Поиск',
        search_on:    true,
        playlist_url: NAME + '/search/'
      },
      {
        title:        '📂 Категории',
        playlist_url: 'submenu',
        submenu:      CATS.map(function (c) {
          return {
            title:        c.title,
            playlist_url: NAME + '/cat/' + c.val
          };
        })
      }
    ];
  }

  // ----------------------------------------------------------
  // ЗАГРУЗКА СТРАНИЦЫ
  // ----------------------------------------------------------
  function fetchList(url, success, error) {
    console.log('[lkno] fetchList →', url);
    request(url, function (html) {
      var results = parseHtml(html);
      if (!results.length) {
        error('Lenkino: карточки не найдены');
        return;
      }
      success({
        results:    results,
        collection: true,
        total_pages: 50,
        menu:       buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // ВСПОМОГАТЕЛЬНЫЙ РОУТЕР
  // ----------------------------------------------------------
  function parseSearchParam(url) {
    var m = url.match(/[?&]search=([^&]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ----------------------------------------------------------
  // ИНТЕРФЕЙС ПАРСЕРА
  // ----------------------------------------------------------
  var LenkinoParser = {

    // Стартовая страница → корень сайта /
    main: function (params, success, error) {
      fetchList(buildListUrl('', 1), success, error);
    },

    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = params.url || NAME;

      console.log('[lkno] view → "' + url + '" page=' + page);

      // 1) ?search=запрос (фильтр AdultJS)
      var sq = parseSearchParam(url);
      if (sq !== null) {
        fetchList(buildSearchUrl(sq.trim(), page), success, error);
        return;
      }

      // 2) lkno/cat/milf-porn → /milf-porn или /milf-porn/page/2
      if (url.indexOf(NAME + '/cat/') === 0) {
        var cat = url.replace(NAME + '/cat/', '').split('?')[0].trim();
        if (cat) {
          fetchList(buildListUrl(cat, page), success, error);
          return;
        }
      }

      // 3) lkno/search/wife → /?q=wife
      if (url.indexOf(NAME + '/search/') === 0) {
        var rawQ = url.replace(NAME + '/search/', '').split('?')[0].trim();
        if (rawQ) {
          fetchList(buildSearchUrl(decodeURIComponent(rawQ), page), success, error);
          return;
        }
      }

      // 4) По умолчанию → главная страница /
      fetchList(buildListUrl('', page), success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var page  = parseInt(params.page, 10) || 1;

      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }

      fetchList(buildSearchUrl(query, page), function (data) {
        data.title = 'Lenkino: ' + query;
        data.url   = NAME + '/search/' + encodeURIComponent(query);
        success(data);
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log('[lkno] qualities →', videoPageUrl);

      request(videoPageUrl, function (html) {
        // Паттерны поиска MP4 в порядке приоритета
        var patterns = [
          // Основной паттерн Lenkino: /get_file/.../xxx.mp4/
          /["'](https?:\/\/[^"']*\/get_file\/[^"']*\.mp4\/?)[^"']*/i,
          // Любой MP4 в кавычках
          /"(https?:\/\/[^"]+?\.mp4[^"]*?)"/i,
          // Fallback без кавычек
          /(https?:\/\/\S+\.mp4\/?)/i
        ];

        for (var p = 0; p < patterns.length; p++) {
          var match = html.match(patterns[p]);
          if (match && match[1]) {
            var cleanUrl = match[1].replace(/\\/g, '').replace(/\/$/, '') + '/';
            console.log('[lkno] MP4 найден:', cleanUrl.substring(0, 80));
            success({ '720p': cleanUrl });
            return;
          }
        }

        // Fallback: тег <video>
        var container = document.createElement('div');
        container.innerHTML = html;
        var srcEl = container.querySelector('video source[src], video[src]');
        var streamUrl = srcEl
          ? (srcEl.getAttribute('src') || srcEl.getAttribute('data-src') || '')
          : '';

        if (streamUrl) {
          console.log('[lkno] source тег найден:', streamUrl.substring(0, 80));
          success({ 'Auto': fixUrl(streamUrl) });
        } else {
          console.log('[lkno] видео не найдено на:', videoPageUrl);
          error('Видео не найдено на странице');
        }
      }, error);
    }
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, LenkinoParser);
      console.log('[lkno] v1.2.0 зарегистрирован OK');
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
