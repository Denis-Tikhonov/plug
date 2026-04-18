// =============================================================
// btit.js — Парсер BigTitsLust для AdultJS (Lampa)
// Version  : 1.0.0
// Based on : JSON config bigtitslust.com (v4.1.0)
//
// Движок видео: kt_player
//   video_url → 480p (единственное качество по JSON)
//
// URL-схема:
//   Главная    : HOST/
//   Страница N : HOST/?page=N
//   Поиск      : HOST/search/?q={query}
//   Категория  : HOST/categories/{slug}/
//   Видео      : HOST/videos/{id}/{slug}/
//
// Required headers (из JSON):
//   Cookie: disclaimer=1
//   Referer: https://www.bigtitslust.com/
//
// Worker ALLOWED_TARGETS: www.bigtitslust.com
// =============================================================

(function () {
  'use strict';

  var NAME = 'btit';
  var HOST = 'https://www.bigtitslust.com';

  // ----------------------------------------------------------
  // Сетевой запрос через AdultJS
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
  // Построение URL
  //
  // JSON paginationPattern: "?page={N}"
  // Поиск: /search/?q={query} (стандарт для KT-tube движков)
  // ----------------------------------------------------------
  function buildUrl(cat, page, query) {
    page = parseInt(page, 10) || 1;

    if (query) {
      var url = HOST + '/search/?q=' + encodeURIComponent(query);
      if (page > 1) url += '&page=' + page;
      return url;
    }

    if (cat) {
      var url = HOST + '/categories/' + encodeURIComponent(cat) + '/';
      if (page > 1) url += '?page=' + page;
      return url;
    }

    if (page > 1) {
      return HOST + '/?page=' + page;
    }
    return HOST + '/';
  }

  // ----------------------------------------------------------
  // Парсинг карточек
  //
  // BigTitsLust использует тот же KT-tube движок что и TrahKino.
  // Карточки: .item или .video-item, .thumb-list__item
  // Ссылки:   a[href*="/videos/"]
  // Постер:   img[data-original] или img[src]
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];

    var doc = new DOMParser().parseFromString(html, 'text/html');

    // Пробуем разные селекторы карточек (KT-tube варианты)
    var items = doc.querySelectorAll('.item');
    if (!items.length) items = doc.querySelectorAll('.video-item');
    if (!items.length) items = doc.querySelectorAll('.thumb-list__item');
    if (!items.length) items = doc.querySelectorAll('.thumb');

    console.log('[BTIT] parseCards → элементов найдено:', items.length);

    // Fallback: если .item не найден, ищем все ссылки на /videos/
    if (!items.length) {
      return parseCardsFallback(doc);
    }

    var results = [];

    for (var i = 0; i < items.length; i++) {
      var el = items[i];

      var a = el.querySelector('a[href*="/videos/"]');
      if (!a) continue;

      var href = a.getAttribute('href') || '';
      if (!href) continue;
      if (href.indexOf('http') !== 0) href = HOST + href;

      // Постер
      var img = el.querySelector('img');
      var pic = '';
      if (img) {
        pic = img.getAttribute('data-original') ||
              img.getAttribute('data-src') ||
              img.getAttribute('src') || '';
      }
      if (pic && pic.indexOf('//') === 0) pic = 'https:' + pic;
      if (pic && pic.indexOf('http') !== 0 && pic.indexOf('/') === 0) pic = HOST + pic;

      // Название
      var titleEl = el.querySelector('.title') || el.querySelector('strong');
      var name = '';
      if (titleEl) {
        name = (titleEl.textContent || '').trim();
      }
      if (!name) {
        name = (a.getAttribute('title') || '').trim();
      }
      name = name.replace(/\s+/g, ' ').trim();
      if (!name || name.length < 3) continue;

      // Длительность
      var durEl = el.querySelector('.duration') || el.querySelector('.time');
      var time  = durEl ? durEl.textContent.trim() : '';

      results.push({
        name:    name,
        video:   href,
        picture: pic,
        img:     pic,
        poster:  pic,
        preview: pic,
        time:    time,
        json:    true,
        source:  NAME,
      });
    }

    console.log('[BTIT] parseCards → карточек:', results.length);
    return results;
  }

  // Fallback парсинг если стандартные классы не найдены
  function parseCardsFallback(doc) {
    var results = [];
    var links = doc.querySelectorAll('a[href*="/videos/"]');

    var seen = {};
    for (var i = 0; i < links.length; i++) {
      var a    = links[i];
      var href = a.getAttribute('href') || '';
      if (!href || seen[href]) continue;
      seen[href] = true;

      if (href.indexOf('http') !== 0) href = HOST + href;

      var img = a.querySelector('img');
      var pic = '';
      if (img) {
        pic = img.getAttribute('data-original') ||
              img.getAttribute('data-src') ||
              img.getAttribute('src') || '';
      }
      if (pic && pic.indexOf('//') === 0) pic = 'https:' + pic;
      if (pic && pic.indexOf('http') !== 0 && pic.indexOf('/') === 0) pic = HOST + pic;

      var name = (a.getAttribute('title') || '').trim();
      if (!name && img) name = (img.getAttribute('alt') || '').trim();
      if (!name || name.length < 3) continue;

      results.push({
        name:    name,
        video:   href,
        picture: pic,
        img:     pic,
        poster:  pic,
        preview: pic,
        time:    '',
        json:    true,
        source:  NAME,
      });
    }

    console.log('[BTIT] parseCardsFallback → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // Извлечение видео-URL из kt_player
  //
  // JSON VIDEO_RULES:
  //   type: "kt_player"
  //   regex: video_url\s*[:=]\s*['"]([^'"]+)['"]
  //   quality: 480p
  //
  // URL вида:
  //   https://www.bigtitslust.com/function/0/https://www.bigtitslust.com/get_file/3/{hash}/{folder}/{id}/{id}.mp4/?br=1570
  //   Берём AS-IS
  // ----------------------------------------------------------
  function extractQualities(html) {
    var sources = {};

    // Стратегия 1: kt_player
    var ktFields = [
      { regex: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,       label: '480p' },
      { regex: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/,   label: '360p' },
      { regex: /video_alt_url2\s*[:=]\s*['"]([^'"]+)['"]/,  label: '720p' },
      { regex: /video_alt_url3\s*[:=]\s*['"]([^'"]+)['"]/,  label: '1080p' },
    ];

    for (var i = 0; i < ktFields.length; i++) {
      var m = html.match(ktFields[i].regex);
      if (m && m[1]) {
        var url = m[1].trim();
        if (url.indexOf('http') === 0 || url.indexOf('/') === 0) {
          if (url.indexOf('http') !== 0) url = HOST + url;

          // Уточняем quality по суффиксу
          var label = ktFields[i].label;
          if (url.indexOf('_1080p') !== -1)      label = '1080p';
          else if (url.indexOf('_720p') !== -1)   label = '720p';
          else if (url.indexOf('_480p') !== -1)   label = '480p';
          else if (url.indexOf('_360p') !== -1)   label = '360p';
          else if (url.indexOf('_240p') !== -1)   label = '240p';

          sources[label] = url;
          console.log('[BTIT] kt_player →', label, ':', url.substring(0, 80));
        }
      }
    }

    // Стратегия 2: <source> теги
    if (Object.keys(sources).length === 0) {
      var srcRegex = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
      var srcMatch;
      while ((srcMatch = srcRegex.exec(html)) !== null) {
        var srcUrl = srcMatch[1];
        if (srcUrl.indexOf('http') !== 0 && srcUrl.indexOf('/') === 0) {
          srcUrl = HOST + srcUrl;
        }
        var labelMatch = srcMatch[0].match(/label=["']([^"']+)["']/);
        var lb = labelMatch ? labelMatch[1] : 'Default';
        sources[lb] = srcUrl;
      }
    }

    return sources;
  }

  // ----------------------------------------------------------
  // Меню
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      { title: 'Поиск', search_on: true, playlist_url: NAME },
    ];
  }

  // ----------------------------------------------------------
  // Роутинг
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var cat   = null;
    var query = null;

    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      query = decodeURIComponent(searchMatch[1]);
    } else if (url.indexOf(NAME + '/cat/') !== -1) {
      cat = url.replace(/.*btit\/cat\//, '').split('?')[0].split('/')[0];
    }

    var fetchUrl = buildUrl(cat, page, query);
    console.log('[BTIT] routeView →', fetchUrl);

    httpGet(fetchUrl, function (html) {
      console.log('[BTIT] html длина:', (html || '').length);
      var cards = parseCards(html);
      success({
        results:     cards,
        collection:  true,
        total_pages: cards.length >= 20 ? page + 1 : page,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ----------------------------------------------------------
  // Публичный интерфейс
  // ----------------------------------------------------------
  var btitParser = {

    main: function (params, success, error) {
      routeView(NAME, 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query    = (params.query || '').trim();
      var page     = params.page || 1;
      var fetchUrl = buildUrl(null, page, query);

      httpGet(fetchUrl, function (html) {
        var cards = parseCards(html);
        success({
          title:       'BigTitsLust: ' + query,
          results:     cards,
          collection:  true,
          total_pages: cards.length >= 20 ? page + 1 : 1,
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log('[BTIT] qualities() → страница:', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log('[BTIT] qualities() → html длина:', (html || '').length);

        if (!html || html.length < 500) {
          error('Страница видео недоступна');
          return;
        }

        var found = extractQualities(html);
        var keys  = Object.keys(found);

        console.log('[BTIT] qualities() → найдено:', keys.length, JSON.stringify(found));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn('[BTIT] Диагностика:');
          console.warn('[BTIT]   video_url:',     (html.match(/video_url/gi)     || []).length);
          console.warn('[BTIT]   kt_player:',     (html.match(/kt_player/gi)     || []).length);
          console.warn('[BTIT]   get_file:',      (html.match(/get_file/gi)      || []).length);
          console.warn('[BTIT]   function/0/:',   (html.match(/function\/0\//gi) || []).length);
          error('BigTitsLust: видео не найдено');
        }
      }, error);
    },
  };

  // ----------------------------------------------------------
  // Регистрация
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, btitParser);
      console.log('[BTIT] v1.0.0 зарегистрирован');
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