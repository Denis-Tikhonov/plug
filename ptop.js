// =============================================================
// ptop.js — PornTop Parser для AdultJS (Lampa)
// =============================================================
// Версия  : 1.2.0
// Изменения:
//   [1.2.0] Переписан под структуру p365 (эталон):
//           - [FIX] Транспорт: window.AdultPlugin.networkRequest
//           - [FIX] extractQualities: video_url на ptop содержит шаблон
//                   {video_id}/{dir} — ПРОПУСКАЕМ его, ищем реальные URL:
//                   1) <source src size> теги
//                   2) og:video mp4
//                   3) file: 'url' паттерн JW Player
//                   4) прямые .mp4 ссылки в HTML
//           - [FIX] qualities() → { qualities: {...} } строки URL
//           - [FIX] parsePlaylist: DOMParser .item + data-original
//           - [FIX] URL категорий: /category/{slug}/l/ (JSON)
//           - [FIX] Пагинация: &page=N (JSON)
//           - [FIX] Поиск: /?q={query} (JSON)
//           - [FIX] routeView: NAME/cat/ как в p365
//   [1.1.0] qualities опечатка + Worker fallback (устарело)
//   [1.0.0] Базовый парсер
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.2.0';
  var NAME    = 'ptop';
  var HOST    = 'https://porntop.com';

  // ----------------------------------------------------------
  // КАТЕГОРИИ
  // JSON: url = HOST/category/{name}/l/
  // ----------------------------------------------------------
  var CATEGORIES = [
    { title: '💎 HD Video',        slug: 'hd'          },
    { title: '👩 Брюнетки',        slug: 'brunette'    },
    { title: '🍑 Большая жопа',    slug: 'big-butt'    },
    { title: '🍒 Сисястые',        slug: 'big-tits'    },
    { title: '👵 Милфы',           slug: 'milf'        },
    { title: '👅 Глубокий отсос',  slug: 'deep-throat' },
    { title: '🎨 Тату',            slug: 'tattoos'     },
    { title: '👱 Блондинки',       slug: 'blonde'      },
    { title: '🌏 Азиатки',         slug: 'asian'       },
    { title: '🍆 Большой член',    slug: 'big-dick'    },
  ];

  // ----------------------------------------------------------
  // ТРАНСПОРТ — идентично p365
  // AdultPlugin.networkRequest передаёт Cookie: mature=1 через Worker
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url)
        .then(function (r) { return r.text(); })
        .then(success)
        .catch(error);
    }
  }

  // ----------------------------------------------------------
  // ОЧИСТКА URL
  // JSON: backslashEscaped=true, rootRelative=true
  // ----------------------------------------------------------
  function cleanUrl(url) {
    if (!url) return '';
    var u = url.replace(/\\/g, '');
    if (u.indexOf('//') === 0)                      u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА
  // JSON: cardSelector=".item", thumb=data-original, title=.title, link=a[href]
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    var results = [];
    var doc     = new DOMParser().parseFromString(html, 'text/html');
    var items   = doc.querySelectorAll('.item');
    console.log('[ptop] parsePlaylist → .item найдено:', items.length);

    for (var i = 0; i < items.length; i++) {
      var el     = items[i];
      var linkEl = el.querySelector('a[href]');
      if (!linkEl) continue;

      var href = cleanUrl(linkEl.getAttribute('href') || '');
      if (!href) continue;

      // JSON: thumbnail.attribute = data-original
      var imgEl = el.querySelector('img');
      var pic   = '';
      if (imgEl) {
        pic = cleanUrl(
          imgEl.getAttribute('data-original') ||
          imgEl.getAttribute('data-src')      ||
          imgEl.getAttribute('src')           || ''
        );
      }

      // JSON: title selector = .item .title (strong)
      var titleEl = el.querySelector('.title, strong');
      var name    = (titleEl ? titleEl.textContent : (linkEl.getAttribute('title') || linkEl.textContent))
        .replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || 'Video';

      var durEl = el.querySelector('.duration, .time');
      var time  = durEl ? durEl.textContent.trim() : '';

      results.push({
        name:             name,
        video:            href,
        picture:          pic,
        img:              pic,
        poster:           pic,
        background_image: pic,
        time:             time,
        quality:          'HD',
        json:             true,
        source:           NAME,
      });
    }

    console.log('[ptop] parsePlaylist → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ КАЧЕСТВ
  //
  // ВАЖНО: на porntop.com video_url в kt_player содержит ШАБЛОН:
  //   video_url: 'https://porntop.com/video/{video_id}/{dir}/?r=1'
  // Это заглушка — реального URL там нет.
  //
  // Реальные источники ищем в таком порядке:
  //   1) <source src size> или <source src label> — прямые mp4
  //   2) og:video content="...mp4"
  //   3) JW Player: file: 'https://...mp4'
  //   4) Любой прямой https://...mp4 в HTML
  // ----------------------------------------------------------
  function extractQualities(html) {
    var q = {};

    // Стратегия 1а: <source src="..." size="480">
    var re1 = /<source[^>]+src="([^"]+)"[^>]+size="([^"]+)"/gi;
    var re2 = /<source[^>]+size="([^"]+)"[^>]+src="([^"]+)"/gi;
    var m;
    while ((m = re1.exec(html)) !== null) {
      if (m[2] === 'preview') continue;
      if (m[1].indexOf('.mp4') === -1) continue;
      q[m[2] + 'p'] = cleanUrl(m[1]);
      console.log('[ptop] <source> size=' + m[2] + ':', m[1].substring(0, 80));
    }
    if (!Object.keys(q).length) {
      while ((m = re2.exec(html)) !== null) {
        if (m[1] === 'preview') continue;
        if (m[2].indexOf('.mp4') === -1) continue;
        q[m[1] + 'p'] = cleanUrl(m[2]);
        console.log('[ptop] <source> rev size=' + m[1] + ':', m[2].substring(0, 80));
      }
    }

    // Стратегия 1б: <source src="..." label="480p">
    if (!Object.keys(q).length) {
      var rl1 = /<source[^>]+src="([^"]+)"[^>]+label="([^"]+)"/gi;
      var rl2 = /<source[^>]+label="([^"]+)"[^>]+src="([^"]+)"/gi;
      while ((m = rl1.exec(html)) !== null) {
        if (m[1].indexOf('.mp4') !== -1) q[m[2]] = cleanUrl(m[1]);
      }
      if (!Object.keys(q).length) {
        while ((m = rl2.exec(html)) !== null) {
          if (m[2].indexOf('.mp4') !== -1) q[m[1]] = cleanUrl(m[2]);
        }
      }
    }

    // Стратегия 2: og:video
    if (!Object.keys(q).length) {
      var og = html.match(/property="og:video"[^>]+content="([^"]+\.mp4[^"]*)"/i)
            || html.match(/content="([^"]+\.mp4[^"]*)"[^>]+property="og:video"/i);
      if (og) {
        var ogUrl = cleanUrl(og[1]);
        var ogQ   = ogUrl.match(/_(\d+)\.mp4/);
        var label = ogQ ? ogQ[1] + 'p' : 'HD';
        q[label]  = ogUrl;
        console.log('[ptop] og:video ' + label + ':', ogUrl.substring(0, 80));
      }
    }

    // Стратегия 3: JW Player — file: 'url'
    if (!Object.keys(q).length) {
      var jw = html.match(/file\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i);
      if (jw) {
        q['HD'] = cleanUrl(jw[1]);
        console.log('[ptop] JW file:', jw[1].substring(0, 80));
      }
    }

    // Стратегия 4: любой прямой https://...mp4 (НЕ шаблон с {})
    if (!Object.keys(q).length) {
      var allMp4 = html.match(/https?:\/\/[^'"<>\s]+\.mp4[^'"<>\s]*/gi);
      if (allMp4) {
        for (var i = 0; i < allMp4.length; i++) {
          var u = allMp4[i];
          // Пропускаем шаблоны с фигурными скобками
          if (u.indexOf('{') !== -1) continue;
          var qm = u.match(/_(\d+)\.mp4/);
          var ql = qm ? qm[1] + 'p' : ('HD' + i);
          if (!q[ql]) {
            q[ql] = cleanUrl(u);
            console.log('[ptop] mp4 fallback ' + ql + ':', u.substring(0, 80));
          }
        }
      }
    }

    return q;
  }

  // ----------------------------------------------------------
  // URL BUILDER
  // JSON: search=/?q=, category=/category/{slug}/l/, page=&page=N
  // ----------------------------------------------------------
  function buildUrl(type, value, page) {
    var url = HOST;
    page    = parseInt(page, 10) || 1;

    if (type === 'search') {
      url += '/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'cat') {
      // JSON: /category/{slug}/l/
      url += '/category/' + value + '/l/';
      if (page > 1) url += '?page=' + page;
    } else {
      if (page > 1) url += '/?page=' + page;
    }
    return url;
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск',     search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Популярное', playlist_url: NAME + '/popular' },
      {
        title:        '📂 Категории',
        playlist_url: 'submenu',
        submenu:      CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТИНГ — идентично p365
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var fetchUrl;
    var searchMatch = url.match(/[?&]search=([^&]*)/);

    if (searchMatch) {
      fetchUrl = buildUrl('search', decodeURIComponent(searchMatch[1]), page);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      var cat = url.replace(NAME + '/cat/', '').split('?')[0];
      fetchUrl = buildUrl('cat', cat, page);
    } else if (url.indexOf(NAME + '/search/') === 0) {
      var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      fetchUrl = buildUrl('search', q, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log('[ptop] routeView →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      console.log('[ptop] html длина:', html.length);
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }
      success({
        results:     results,
        collection:  true,
        total_pages: page + 1,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var PtopParser = {

    main: function (params, success, error) {
      routeView(NAME + '/popular', 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      httpGet(buildUrl('search', query, 1), function (html) {
        var results = parsePlaylist(html);
        success({
          title:       'PornTop: ' + query,
          results:     results,
          collection:  true,
          total_pages: results.length >= 20 ? 2 : 1,
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log('[ptop] qualities() →', videoPageUrl);
      httpGet(videoPageUrl, function (html) {
        console.log('[ptop] qualities() html длина:', html.length);
        if (!html || html.length < 500) { error('html < 500'); return; }

        var found = extractQualities(html);
        var keys  = Object.keys(found);
        console.log('[ptop] qualities() найдено:', keys.length, JSON.stringify(keys));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          // Диагностика для следующего дебага
          console.warn('[ptop] <source>:',   (html.match(/<source/gi)   || []).length);
          console.warn('[ptop] og:video:',   (html.match(/og:video/gi)  || []).length);
          console.warn('[ptop] .mp4:',       (html.match(/\.mp4/gi)     || []).length);
          console.warn('[ptop] video_url:',  (html.match(/video_url/gi) || []).length);
          console.warn('[ptop] {video_id}:', (html.match(/video_id/gi)  || []).length);
          error('Видео не найдено');
        }
      }, error);
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ — идентично p365
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, PtopParser);
      console.log('[ptop] v' + VERSION + ' зарегистрирован');
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var poll = setInterval(function () {
      if (tryRegister()) clearInterval(poll);
    }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }

})();
