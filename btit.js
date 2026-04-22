// =============================================================
// btit.js — Парсер BigTitsLust для AdultJS (Lampa)
// =============================================================
// Версия  : 1.2.0
// Изменения:
//   [1.2.0] КРИТИЧЕСКИЙ FIX qualities():
//
//   Анализ proxy-log-btit.json:
//   - video_url в flashvars → get_file/3/...mp4 → status 410 Gone
//     (сервер явно отвечает "URL недействителен")
//   - Рабочий URL: media11.bigtitslust.com/remote_control.php
//     ?time=...&cv=...&file=...
//     status 200/206, type: video/mp4, accept_ranges: bytes ✅
//   - Worker загружает страницы bigtitslust нормально (status 200)
//
//   Стратегия extractQualities v1.2.0:
//   S1. remote_control.php URL напрямую из HTML/JS страницы видео
//       (это финальный подписанный CDN URL — передаём плееру напрямую)
//   S2. video_url / video_alt_url → /resolve → финальный URL
//       (через Worker /resolve если remote_control не найден)
//   S3. Fallback: любой .mp4 URL без get_file (get_file всегда 410)
//
//   Worker: media11.bigtitslust.com добавлен в ALLOWED_TARGETS (W170+)
//
//   [1.1.0] Базовый парсер UNIVERSAL_TEMPLATE
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.2.0';
  var NAME    = 'btit';
  var HOST    = 'https://www.bigtitslust.com';
  var TAG     = '[' + NAME + ']';

  var WORKER_URL = 'https://zonaproxy.777b737.workers.dev';

  var CATEGORIES = [
    { title: '🌟 Новинки',          slug: ''                    },
    { title: '🔥 Популярное',        slug: 'most-popular'        },
    { title: '🍒 Big Tits',         slug: 'big-tits'            },
    { title: '🍑 Big Ass',          slug: 'big-ass'             },
    { title: '🌺 MILF',             slug: 'milf'                },
    { title: '👧 Teen (18+)',       slug: 'teen'                },
    { title: '👱 Blonde',           slug: 'blonde'              },
    { title: '🍑 Brunette',         slug: 'brunette'            },
    { title: '💦 Anal',             slug: 'anal'                },
    { title: '👅 Blowjob',          slug: 'blowjob'             },
    { title: '🌏 Asian',            slug: 'asian'               },
    { title: '💪 Hardcore',         slug: 'hardcore'            },
    { title: '👫 Lesbian',          slug: 'lesbian'             },
    { title: '📹 POV',              slug: 'pov'                 },
    { title: '💎 HD',               slug: 'hd'                  },
  ];

  // ----------------------------------------------------------
  // ТРАНСПОРТ
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  function httpGetJson(url, success, error) {
    httpGet(url, function (text) {
      try { success(JSON.parse(text)); } catch (e) { error('JSON: ' + e.message); }
    }, error);
  }

  // ----------------------------------------------------------
  // getWorkerBase()
  // ----------------------------------------------------------
  function getWorkerBase() {
    var base = WORKER_URL;
    if (window.AdultPlugin && window.AdultPlugin.workerUrl) {
      base = window.AdultPlugin.workerUrl;
    }
    return base.replace(/[/?&]url=?$/, '').replace(/\/+$/, '');
  }

  // ----------------------------------------------------------
  // cleanUrl — для постеров и страниц (НЕ для видео)
  // ----------------------------------------------------------
  function cleanUrl(u) {
    if (!u) return '';
    u = u.replace(/\\\//g, '/').replace(/\\/g, '').trim();
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА
  // JSON: cardSelector=".item"
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    var results = [];
    var doc     = new DOMParser().parseFromString(html, 'text/html');
    var items   = doc.querySelectorAll('.item');
    console.log(TAG, 'parsePlaylist → .item:', items.length);

    items.forEach(function (el) {
      var a = el.querySelector('a[href*="/videos/"]');
      if (!a) return;

      var href = cleanUrl(a.getAttribute('href') || '');
      if (!href) return;

      var img = el.querySelector('img');
      var pic = img
        ? cleanUrl(img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('src') || '')
        : '';

      var titleEl = el.querySelector('.title, a[title]');
      var name    = (titleEl
        ? (titleEl.getAttribute('title') || titleEl.textContent)
        : a.textContent
      ).replace(/\s+/g, ' ').trim() || 'Video';

      var durEl = el.querySelector('.duration');
      var time  = durEl ? durEl.textContent.trim() : '';

      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time: time, quality: 'HD', json: true, source: NAME,
      });
    });

    console.log(TAG, 'parsePlaylist → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // extractQualities(html)
  //
  // [1.2.0] ГЛАВНАЯ СТРАТЕГИЯ: remote_control.php URL
  //
  // bigtitslust использует KVS движок.
  // get_file URL (из video_url flashvars) → 410 Gone — НЕ РАБОТАЕТ.
  // Рабочий URL = remote_control.php с подписанными параметрами.
  //
  // Ищем в HTML:
  //   S1. remote_control.php URL — напрямую (финальный CDN URL)
  //   S2. video_url → get_file URL → /resolve → финальный
  //   S3. Любой .mp4 не из get_file
  // ----------------------------------------------------------
  function extractQualities(html, videoPageUrl, success, error) {
    var q = {};

    // ----------------------------------------------------------
    // S1. remote_control.php — финальный подписанный URL
    // Паттерн: https://media*.bigtitslust.com/remote_control.php?time=...&cv=...
    // Может быть в flashvars: remote_control: 'url'
    //                         или video_url: 'url'
    //                         или в JS напрямую
    // ----------------------------------------------------------

    // Вариант A: поле remote_control в конфиге
    var rcField = html.match(/remote_control\s*[:=]\s*['"]([^'"]+remote_control\.php[^'"]+)['"]/i);
    if (rcField) {
      q['HD'] = cleanUrl(rcField[1]);
      console.log(TAG, 'S1A remote_control field:', q['HD'].substring(0, 100));
    }

    // Вариант B: любой URL с remote_control.php в HTML
    if (!Object.keys(q).length) {
      var rcAny = html.match(/(https?:\/\/[^"'\s]+remote_control\.php[^"'\s]*)/i);
      if (rcAny) {
        q['HD'] = rcAny[1].replace(/\\/g, '');
        console.log(TAG, 'S1B remote_control any:', q['HD'].substring(0, 100));
      }
    }

    // Вариант C: video_url содержит remote_control.php
    if (!Object.keys(q).length) {
      var rcInVideo = html.match(/video_url\s*[:=]\s*['"]([^'"]*remote_control\.php[^'"]*)['"]/i);
      if (rcInVideo) {
        q['HD'] = cleanUrl(rcInVideo[1]);
        console.log(TAG, 'S1C video_url remote_control:', q['HD'].substring(0, 100));
      }
    }

    // Если remote_control найден — сразу возвращаем
    if (Object.keys(q).length) {
      // Уточняем лейбл если можно
      var label = 'HD';
      var firstUrl = Object.values(q)[0];
      if (firstUrl.indexOf('_720p') !== -1) label = '720p';
      else if (firstUrl.indexOf('_480p') !== -1) label = '480p';
      if (label !== 'HD') { q[label] = q['HD']; delete q['HD']; }

      console.log(TAG, 'S1 найден remote_control:', JSON.stringify(Object.keys(q)));
      success({ qualities: q });
      return;
    }

    // ----------------------------------------------------------
    // S2. video_url / video_alt_url → /resolve через Worker
    // get_file URL → resolve → финальный URL
    // ----------------------------------------------------------
    console.log(TAG, 'S1 не нашёл remote_control, пробуем S2 resolve...');

    var fields = [
      { re: /video_alt_url2?\s*[:=]\s*['"]([^'"]+)['"]/,  label: '720p' },
      { re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,        label: '480p' },
    ];

    var toResolve = [];
    fields.forEach(function (f) {
      var m = html.match(f.re);
      if (!m || !m[1]) return;
      var rawUrl = cleanUrl(m[1]);
      if (!rawUrl || rawUrl.indexOf('http') !== 0) return;
      // get_file → 410, но пробуем через resolve
      toResolve.push({ url: rawUrl, label: f.label });
      console.log(TAG, 'S2 raw ' + f.label + ':', rawUrl.substring(0, 80));
    });

    if (!toResolve.length) {
      // ----------------------------------------------------------
      // S3. Любой .mp4 НЕ из get_file
      // ----------------------------------------------------------
      console.log(TAG, 'S2 нет video_url, пробуем S3 .mp4...');
      var allMp4 = html.match(/https?:\/\/[^"'\s<>\\]+\.mp4[^"'\s<>\\]*/gi);
      if (allMp4) {
        allMp4.forEach(function (u) {
          if (u.indexOf('get_file') !== -1) return; // get_file → 410
          var qm = u.match(/_(\d+)p?\.mp4/);
          var lbl = qm ? qm[1] + 'p' : 'HD';
          if (!q[lbl]) { q[lbl] = u; console.log(TAG, 'S3 mp4:', u.substring(0, 80)); }
        });
      }

      if (Object.keys(q).length) { success({ qualities: q }); return; }
      error('Видео не найдено (все стратегии)');
      return;
    }

    // Резолвим каждый через Worker /resolve
    var pending   = toResolve.length;
    var hasResult = false;

    toResolve.forEach(function (item) {
      var resolveUrl = getWorkerBase() + '/resolve?url=' + encodeURIComponent(item.url);
      console.log(TAG, 'S2 resolve ' + item.label + ':', item.url.substring(0, 80));

      httpGetJson(resolveUrl, function (json) {
        var finalUrl = json.final || json.url || '';
        if (finalUrl && finalUrl.indexOf('http') === 0 &&
            (finalUrl.indexOf('.mp4') !== -1 || finalUrl.indexOf('remote_control') !== -1)) {
          q[item.label] = finalUrl;
          hasResult = true;
          console.log(TAG, 'S2 resolved ' + item.label + ':', finalUrl.substring(0, 100));
        } else {
          console.warn(TAG, 'S2 resolve не дал CDN URL:', (finalUrl || 'empty').substring(0, 80));
        }
        pending--;
        if (pending === 0) {
          if (hasResult) success({ qualities: q });
          else error('resolve не дал CDN URL');
        }
      }, function (err) {
        console.warn(TAG, 'S2 resolve error:', err);
        pending--;
        if (pending === 0) {
          if (hasResult) success({ qualities: q });
          else error('resolve error: ' + err);
        }
      });
    });
  }

  // ----------------------------------------------------------
  // URL BUILDER
  // ----------------------------------------------------------
  function buildUrl(type, value, page) {
    var url = HOST;
    page    = parseInt(page, 10) || 1;
    if (type === 'search') {
      url += '/search/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'cat' && value) {
      url += '/' + value + '/';
      if (page > 1) url += '?page=' + page;
    } else {
      if (page > 1) url += '/?page=' + page;
    }
    return url;
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новинки', playlist_url: NAME + '/new' },
      {
        title: '📂 Категории', playlist_url: 'submenu',
        submenu: CATEGORIES.filter(function (c) { return c.slug; }).map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТИНГ
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var fetchUrl;
    var sm = url.match(/[?&]search=([^&]*)/);

    if (sm) {
      fetchUrl = buildUrl('search', decodeURIComponent(sm[1]), page);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      fetchUrl = buildUrl('cat', url.replace(NAME + '/cat/', '').split('?')[0], page);
    } else if (url.indexOf(NAME + '/search/') === 0) {
      var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      fetchUrl = buildUrl('search', q, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log(TAG, 'routeView →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      console.log(TAG, 'html длина:', html.length);
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }
      success({ results: results, collection: true, total_pages: page + 1, menu: buildMenu() });
    }, error);
  }

  // ----------------------------------------------------------
  // ПАРСЕР API
  // ----------------------------------------------------------
  var BtitParser = {

    main: function (p, s, e) { routeView(NAME + '/new', 1, s, e); },
    view: function (p, s, e) { routeView(p.url || NAME, p.page || 1, s, e); },

    search: function (p, s, e) {
      var q = (p.query || '').trim();
      httpGet(buildUrl('search', q, p.page || 1), function (html) {
        s({ title: 'BigTitsLust: ' + q, results: parsePlaylist(html), collection: true, total_pages: 2 });
      }, e);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log(TAG, 'html длина:', html.length);
        if (!html || html.length < 500) { error('html < 500'); return; }

        // Диагностика
        console.log(TAG, 'remote_control cnt:', (html.match(/remote_control/gi) || []).length);
        console.log(TAG, 'video_url cnt:',      (html.match(/video_url/gi)      || []).length);
        console.log(TAG, 'get_file cnt:',       (html.match(/get_file/gi)       || []).length);
        console.log(TAG, '.mp4 cnt:',           (html.match(/\.mp4/gi)          || []).length);

        extractQualities(html, videoPageUrl, success, error);

      }, error);
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BtitParser);
      console.log(TAG, 'v' + VERSION + ' зарегистрирован');
      return true;
    }
    return false;
  }
  if (!tryRegister()) {
    var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }

})();
