// =============================================================
// btit.js — Парсер BigTitsLust для AdultJS (Lampa)
// Version  : 1.1.0
// Source   : https://www.bigtitslust.com  (KT-tube engine)
// =============================================================
// Движок    : kt_player
//   video_url      → 480p
//   video_alt_url  → 360p/720p (если есть)
// Пагинация : ?page=N
// Поиск     : /search/?q={query}&page=N
// Видео     : /videos/{id}/{slug}/
// CDN       : media11.bigtitslust.com/remote_control.php?time=…&cv=…
// =============================================================

(function () {
  'use strict';

  // ============================================================
  // §1. КОНФИГ
  // ============================================================

  var VERSION = '1.1.0';
  var NAME    = 'btit';                 // ← как в menu.txt и domainMap ядра
  var HOST    = 'https://www.bigtitslust.com';
  var TAG     = '[' + NAME + ']';

  // ============================================================
  // §2. КАТЕГОРИИ (если появятся — заполнить)
  // ============================================================

  var CATEGORIES = [];

  // ============================================================
  // §3. ТРАНСПОРТ
  // ============================================================

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url)
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(success)
        .catch(error);
    }
  }

  // ============================================================
  // §4. cleanUrl — УНИВЕРСАЛЬНАЯ ОЧИСТКА
  // ============================================================

  function cleanUrl(raw) {
    if (!raw) return '';

    try {
      var u = raw;

      // 1. Убираем экранированные слеши
      u = u.replace(/\\\//g, '/');

      // 2. Убираем обычные backslash
      u = u.replace(/\\/g, '');

      // 3. URL-decode
      if (u.indexOf('%') !== -1) {
        try { u = decodeURIComponent(u); } catch (e) {}
      }

      // 4. Base64 (короткие закодированные ссылки)
      if (u.indexOf('/') === -1 && u.length > 20 && /^[a-zA-Z0-9+/]+=*$/.test(u)) {
        try { var dec = atob(u); if (dec.indexOf('http') === 0) u = dec; } catch (e) {}
      }

      // 5. KT-tube function/N/ префикс  →  https://...
      var funcMatch = u.match(/^function\/\d+\/(https?:\/\/.+)/);
      if (funcMatch) u = funcMatch[1];

      // 6. Protocol-relative
      if (u.indexOf('//') === 0) u = 'https:' + u;

      // 7. Root-relative
      if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;

      // 8. Просто относительный
      if (u.length > 0 && u.indexOf('http') !== 0 && u.charAt(0) !== '/') {
        u = HOST + '/' + u;
      }

      return u;
    } catch (e) {
      return raw;
    }
  }

  // Осторожная очистка mp4-параметров (не трогаем remote_control.php)
  function cleanMp4Url(url) {
    if (!url || url.indexOf('.mp4') === -1) return url;
    if (url.indexOf('remote_control.php') !== -1) return url;
    return url
      .replace(/[?&]rnd=\d+/g, '')
      .replace(/[?&]br=\d+/g, '')
      .replace(/[?&]_=\d+/g, '')
      .replace(/[?&]+$/g, '')
      .replace(/\/+$/, '');
  }

  // ============================================================
  // §5. extractQualities
  // ============================================================

  function extractQualities(html) {
    var q    = {};
    var have = function () { return Object.keys(q).length > 0; };
    var add  = function (label, url) {
      var u = cleanUrl(url);
      if (!u || u.indexOf('{') !== -1 || u.indexOf('spacer') !== -1) return;
      // Не дублируем
      if (!q[label]) q[label] = u;
    };

    // S1. kt_player поля
    var ktRules = [
      { re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,       lbl: '480p' },
      { re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/,   lbl: '360p' },
      { re: /video_alt_url2\s*[:=]\s*['"]([^'"]+)['"]/,  lbl: '720p' },
      { re: /video_alt_url3\s*[:=]\s*['"]([^'"]+)['"]/,  lbl: '1080p' },
    ];

    ktRules.forEach(function (rule) {
      var m = html.match(rule.re);
      if (m && m[1]) {
        var u = m[1].trim();
        // Уточняем качество по суффиксу в самом URL
        var label = rule.lbl;
        if (u.indexOf('_1080p') !== -1)      label = '1080p';
        else if (u.indexOf('_720p') !== -1)   label = '720p';
        else if (u.indexOf('_480p') !== -1)   label = '480p';
        else if (u.indexOf('_360p') !== -1)   label = '360p';
        else if (u.indexOf('_240p') !== -1)   label = '240p';
        add(label, u);
      }
    });

    // S2. <source src="…" label="…"> / size="…"
    if (!have()) {
      var reSrc = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
      var sm;
      while ((sm = reSrc.exec(html)) !== null) {
        var src = sm[1];
        var lbl = 'Default';
        var lbM = sm[0].match(/label=["']([^"']+)["']/);
        var szM = sm[0].match(/size=["']([^"']+)["']/);
        if (lbM) lbl = lbM[1];
        else if (szM) lbl = szM[1] + 'p';
        add(lbl, src);
      }
    }

    // S3. og:video meta
    if (!have()) {
      var og = html.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+\.mp4[^"]*)"/i)
            || html.match(/<meta[^>]+content="([^"]+\.mp4[^"]*)"[^>]+property="og:video"/i);
      if (og) {
        var ogU = cleanUrl(og[1]);
        if (ogU.indexOf('/embed/') === -1) {
          var qm = ogU.match(/_(\d+)\.mp4/);
          add(qm ? qm[1] + 'p' : 'HD', ogU);
        }
      }
    }

    // S4. Любой прямой .mp4
    if (!have()) {
      var allMp4 = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi);
      if (allMp4) {
        allMp4.forEach(function (u, i) {
          if (u.indexOf('{') !== -1) return;
          var qm = u.match(/_(\d+)\.mp4/);
          add(qm ? qm[1] + 'p' : ('HD' + (i || '')), u);
        });
      }
    }

    // Нормализуем mp4-ссылки (только если это не remote_control.php)
    Object.keys(q).forEach(function (k) {
      q[k] = cleanMp4Url(q[k]);
    });

    return q;
  }

  // ============================================================
  // §6. ПАРСИНГ КАРТОЧЕК
  // ============================================================

  var CARD_SELECTORS = [
    '.item',           // bigtitslust (KT-tube)
    '.video-item',
    '.thumb-list__item',
    '.thumb',
  ];

  function parsePlaylist(html) {
    var results = [];
    var doc     = new DOMParser().parseFromString(html, 'text/html');
    var items;

    for (var s = 0; s < CARD_SELECTORS.length; s++) {
      items = doc.querySelectorAll(CARD_SELECTORS[s]);
      if (items && items.length > 0) {
        console.log(TAG, 'parsePlaylist → селектор "' + CARD_SELECTORS[s] + '" найдено:', items.length);
        break;
      }
    }

    // Fallback: все ссылки на /videos/
    if (!items || items.length === 0) {
      console.log(TAG, 'parsePlaylist → fallback по ссылкам /videos/');
      var links = doc.querySelectorAll('a[href*="/videos/"]');
      var seen  = {};
      for (var j = 0; j < links.length; j++) {
        var a   = links[j];
        var h   = cleanUrl(a.getAttribute('href') || '');
        if (!h || seen[h]) continue;
        seen[h] = true;

        var img = a.querySelector('img');
        var pic = '';
        if (img) {
          pic = cleanUrl(
            img.getAttribute('data-original') ||
            img.getAttribute('data-src') ||
            img.getAttribute('src') || ''
          );
        }
        var name = (a.getAttribute('title') || '').trim();
        if (!name && img) name = (img.getAttribute('alt') || '').trim();
        if (!name) name = slugToTitle(h);
        if (!name || name.length < 3) continue;

        results.push(makeCard(name, h, pic, ''));
      }
      console.log(TAG, 'parsePlaylist → fallback карточек:', results.length);
      return results;
    }

    for (var i = 0; i < items.length; i++) {
      var card = parseCard(items[i]);
      if (card) results.push(card);
    }

    console.log(TAG, 'parsePlaylist → карточек:', results.length);
    return results;
  }

  function parseCard(el) {
    var linkEl = el.querySelector('a[href*="/videos/"]');
    if (!linkEl) return null;

    var href = cleanUrl(linkEl.getAttribute('href') || '');
    if (!href) return null;

    // Постер
    var imgEl = el.querySelector('img');
    var pic   = '';
    if (imgEl) {
      pic = cleanUrl(
        imgEl.getAttribute('data-original') ||
        imgEl.getAttribute('data-src') ||
        imgEl.getAttribute('src') || ''
      );
    }

    // Название
    var titleEl = el.querySelector('.title') || el.querySelector('.th-title');
    var name    = '';
    if (titleEl) name = (titleEl.textContent || '').trim();
    if (!name)   name = (linkEl.getAttribute('title') || '').trim();
    if (!name)   name = slugToTitle(href);
    name = name.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!name || name.length < 3) return null;

    // Длительность
    var durEl = el.querySelector('.duration') || el.querySelector('.time');
    var time  = durEl ? durEl.textContent.trim() : '';

    return makeCard(name, href, pic, time);
  }

  function makeCard(name, href, pic, time) {
    return {
      name:             name,
      video:            href,
      picture:          pic,
      img:              pic,
      poster:           pic,
      background_image: pic,
      preview:          null,   // ← нет видео-превью на карточке
      time:             time || '',
      quality:          'HD',
      json:             true,   // ← ядро вызовет qualities()
      source:           NAME,
    };
  }

  function slugToTitle(url) {
    if (!url) return '';
    var parts = url.replace(/\?.*/, '').split('/').filter(Boolean);
    var last  = parts[parts.length - 1] || '';
    return last.replace(/[-_]/g, ' ')
               .replace(/\b\w/g, function (l) { return l.toUpperCase(); })
               .trim();
  }

  // ============================================================
  // §7. URL BUILDER
  // ============================================================

  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    var url = HOST;

    if (type === 'search') {
      url += '/search/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'cat') {
      // На случай если категории появятся (JSON пока пустой)
      url += '/?c=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else {
      // Главная
      if (page > 1) url += '/?page=' + page;
      else          url += '/';
    }

    return url;
  }

  // ============================================================
  // §8. МЕНЮ
  // ============================================================

  function buildMenu() {
    var menu = [
      {
        title:        '🔍 Поиск',
        search_on:    true,
        playlist_url: NAME + '/search/',
      },
      {
        title:        '🔥 Новинки',
        playlist_url: NAME + '/new',
      },
    ];

    if (CATEGORIES.length) {
      menu.push({
        title:        '📂 Категории',
        playlist_url: 'submenu',
        submenu:      CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      });
    }

    return menu;
  }

  // ============================================================
  // §9. РОУТИНГ
  // ============================================================

  function routeView(url, page, success, error) {
    console.log(TAG, 'routeView → url="' + url + '" page=' + page);

    var fetchUrl;

    // 1. Фильтр-строка ?search=… из Lampa
    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      fetchUrl = buildUrl('search', decodeURIComponent(searchMatch[1]), page);
      return loadPage(fetchUrl, page, success, error);
    }

    // 2. Категория
    if (url.indexOf(NAME + '/cat/') !== -1) {
      var cat = url.replace(NAME + '/cat/', '').split('?')[0].split('/')[0];
      fetchUrl = buildUrl('cat', cat, page);
      return loadPage(fetchUrl, page, success, error);
    }

    // 3. Сортировка (если появятся)
    if (url.indexOf(NAME + '/sort/') !== -1) {
      var sort = url.replace(NAME + '/sort/', '').split('?')[0];
      fetchUrl = buildUrl('sort', sort, page);
      return loadPage(fetchUrl, page, success, error);
    }

    // 4. Поиск по пути
    if (url.indexOf(NAME + '/search/') !== -1) {
      var rawQ = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      if (rawQ) {
        fetchUrl = buildUrl('search', rawQ, page);
        return loadPage(fetchUrl, page, success, error);
      }
    }

    // 5. Главная / всё остальное
    loadPage(buildUrl('main', null, page), page, success, error);
  }

  function loadPage(fetchUrl, page, success, error) {
    console.log(TAG, 'loadPage →', fetchUrl);

    httpGet(fetchUrl, function (html) {
      console.log(TAG, 'html длина:', (html || '').length);
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }

      success({
        results:     results,
        collection:  true,
        total_pages: results.length >= 20 ? page + 1 : page,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ============================================================
  // §10. ПАРСЕР API
  // ============================================================

  var BtitParser = {

    main: function (params, success, error) {
      routeView(NAME + '/new', 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var page  = parseInt(params.page, 10) || 1;
      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }
      httpGet(buildUrl('search', query, page), function (html) {
        var results = parsePlaylist(html);
        success({
          title:       'BigTitsLust: ' + query,
          results:     results,
          collection:  true,
          total_pages: results.length >= 20 ? page + 1 : page,
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log(TAG, 'qualities() html длина:', (html || '').length);

        if (!html || html.length < 500) {
          error('Страница видео недоступна (html < 500 байт)');
          return;
        }

        var found = extractQualities(html);
        var keys  = Object.keys(found);

        console.log(TAG, 'qualities() найдено:', keys.length, JSON.stringify(keys));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          // Диагностика
          console.warn(TAG, '<source>:',    (html.match(/<source/gi)    || []).length);
          console.warn(TAG, 'og:video:',    (html.match(/og:video/gi)   || []).length);
          console.warn(TAG, '.mp4:',        (html.match(/\.mp4/gi)      || []).length);
          console.warn(TAG, 'video_url:',   (html.match(/video_url/gi)  || []).length);
          console.warn(TAG, 'kt_player:',   (html.match(/kt_player/gi)  || []).length);
          error('Видео не найдено');
        }
      }, error);
    },
  };

  // ============================================================
  // §11. РЕГИСТРАЦИЯ
  // ============================================================

  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BtitParser);
      console.log(TAG, 'v' + VERSION + ' зарегистрирован');
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
