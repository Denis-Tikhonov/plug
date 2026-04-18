// =============================================================
// pone.js — Парсер PornOne для AdultJS (Lampa)
// Version  : 1.0.0
// Based on : JSON config pornone.com (v4.1.0)
//
// Движок видео: videojs
//   Качества через <source> теги с label атрибутом:
//     label="1080p" → 1920x1080_4000k.mp4
//     label="480p"  → 720x406_500k.mp4
//
// URL-схема (из JSON):
//   Главная    : HOST/
//   Страница N : HOST/?page=N
//   Поиск      : HOST/?q={query}&page=N
//   Категория  : HOST/?c={slug}&page=N
//   Каналы     : HOST/channels/{slug}/
//
// Required headers (из JSON):
//   Cookie: over18=1
//   User-Agent: стандартный Chrome
//
// Worker ALLOWED_TARGETS:
//   pornone.com
//   s*.pornone.com   (CDN для видео — динамические поддомены)
// =============================================================

(function () {
  'use strict';

  var NAME = 'pone';
  var HOST = 'https://pornone.com';

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
  // JSON urlScheme:
  //   search:     /?q={query}
  //   category:   /?c={slug}
  //   pagination: &page={N}
  // ----------------------------------------------------------
  function buildUrl(cat, page, query) {
    page = parseInt(page, 10) || 1;

    if (query) {
      var url = HOST + '/?q=' + encodeURIComponent(query);
      if (page > 1) url += '&page=' + page;
      return url;
    }

    if (cat) {
      var url = HOST + '/?c=' + encodeURIComponent(cat);
      if (page > 1) url += '&page=' + page;
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
  // PornOne использует SPA-like рендеринг, но отдаёт SSR HTML.
  // Карточки имеют разные классы в зависимости от страницы.
  // Общий подход: ищем все блоки с видео-ссылками.
  //
  // Thumbnail домен: th-eu*.pornone.com
  // Формат ссылки:   /category/title-slug/id/
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];

    var doc = new DOMParser().parseFromString(html, 'text/html');

    // Пробуем стандартные селекторы
    var items = doc.querySelectorAll('.video-item');
    if (!items.length) items = doc.querySelectorAll('.item');
    if (!items.length) items = doc.querySelectorAll('.thumb');
    if (!items.length) items = doc.querySelectorAll('.card');

    console.log('[PONE] parseCards → элементов:', items.length);

    var results = [];

    if (items.length) {
      for (var i = 0; i < items.length; i++) {
        var card = parseCardElement(items[i]);
        if (card) results.push(card);
      }
    }

    // Fallback: ищем все ссылки вида /slug/slug/числоID/
    if (!results.length) {
      results = parseCardsFallback(doc);
    }

    console.log('[PONE] parseCards → карточек:', results.length);
    return results;
  }

  function parseCardElement(el) {
    // Ссылка на видео: /{category}/{slug}/{id}/
    var a = el.querySelector('a[href]');
    if (!a) return null;

    var href = a.getAttribute('href') || '';
    // Фильтруем: видео-ссылки PornOne содержат числовой ID в конце
    if (!href.match(/\/\d+\/?$/)) return null;
    if (href.indexOf('http') !== 0) href = HOST + href;

    // Постер
    var img = el.querySelector('img');
    var pic = '';
    if (img) {
      pic = img.getAttribute('data-src') ||
            img.getAttribute('data-original') ||
            img.getAttribute('src') || '';
    }
    if (pic && pic.indexOf('//') === 0) pic = 'https:' + pic;
    if (pic && pic.indexOf('http') !== 0 && pic.indexOf('/') === 0) pic = HOST + pic;

    // Название
    var name = '';
    var titleEl = el.querySelector('.title') ||
                  el.querySelector('.video-title') ||
                  el.querySelector('strong') ||
                  el.querySelector('span');
    if (titleEl) name = (titleEl.textContent || '').trim();
    if (!name) name = (a.getAttribute('title') || '').trim();
    if (!name && img) name = (img.getAttribute('alt') || '').trim();
    name = name.replace(/\s+/g, ' ').trim();
    if (!name || name.length < 3) return null;

    // Длительность
    var durEl = el.querySelector('.duration') || el.querySelector('.time') || el.querySelector('.length');
    var time  = durEl ? durEl.textContent.trim() : '';

    return {
      name:    name,
      video:   href,
      picture: pic,
      img:     pic,
      poster:  pic,
      preview: pic,
      time:    time,
      json:    true,
      source:  NAME,
    };
  }

  function parseCardsFallback(doc) {
    var results = [];
    var links = doc.querySelectorAll('a[href]');
    var seen = {};

    for (var i = 0; i < links.length; i++) {
      var a    = links[i];
      var href = a.getAttribute('href') || '';

      // PornOne видео URL: /{category}/{slug}/{numeric_id}/
      if (!href.match(/^\/[^\/]+\/[^\/]+\/\d+\/?$/)) continue;
      if (seen[href]) continue;
      seen[href] = true;

      var fullHref = HOST + href;

      var img = a.querySelector('img');
      var pic = '';
      if (img) {
        pic = img.getAttribute('data-src') ||
              img.getAttribute('data-original') ||
              img.getAttribute('src') || '';
      }
      if (pic && pic.indexOf('//') === 0) pic = 'https:' + pic;
      if (pic && pic.indexOf('http') !== 0 && pic.indexOf('/') === 0) pic = HOST + pic;

      var name = (a.getAttribute('title') || '').trim();
      if (!name && img) name = (img.getAttribute('alt') || '').trim();
      if (!name) {
        // Берём текст ссылки
        name = (a.textContent || '').trim().substring(0, 100);
      }
      name = name.replace(/\s+/g, ' ').trim();
      if (!name || name.length < 3) continue;

      results.push({
        name:    name,
        video:   fullHref,
        picture: pic,
        img:     pic,
        poster:  pic,
        preview: pic,
        time:    '',
        json:    true,
        source:  NAME,
      });
    }

    console.log('[PONE] parseCardsFallback → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // Извлечение видео-URL
  //
  // JSON: player = "videojs", method = "source-tags"
  // Формат: <source src="..." type="video/mp4" label="1080p">
  //
  // CDN домены: s*.pornone.com (s317, s3001, s3004 и т.д.)
  // URL содержит токен + ?lang=en, берём AS-IS
  // ----------------------------------------------------------
  function extractQualities(html) {
    var sources = {};

    // Стратегия 1: <source> теги с label (основной метод по JSON)
    var srcRegex = /<source[^>]+src=["']([^"']+)["'][^>]*/gi;
    var srcMatch;

    while ((srcMatch = srcRegex.exec(html)) !== null) {
      var srcUrl = srcMatch[1].trim();
      var fullTag = srcMatch[0];

      // Только video/mp4 или без type
      if (fullTag.indexOf('audio') !== -1) continue;

      if (srcUrl.indexOf('http') !== 0 && srcUrl.indexOf('/') === 0) {
        srcUrl = HOST + srcUrl;
      }

      // Определяем quality из label
      var labelMatch = fullTag.match(/label=["']([^"']+)["']/);
      var sizeMatch  = fullTag.match(/size=["']([^"']+)["']/);
      var resMatch   = fullTag.match(/res=["']([^"']+)["']/);

      var label = '';
      if (labelMatch) label = labelMatch[1];
      else if (sizeMatch) label = sizeMatch[1] + 'p';
      else if (resMatch) label = resMatch[1] + 'p';
      else {
        // Определяем из URL
        if (srcUrl.indexOf('1920x1080') !== -1 || srcUrl.indexOf('4000k') !== -1) label = '1080p';
        else if (srcUrl.indexOf('1280x720') !== -1 || srcUrl.indexOf('2000k') !== -1) label = '720p';
        else if (srcUrl.indexOf('720x406') !== -1 || srcUrl.indexOf('500k') !== -1) label = '480p';
        else if (srcUrl.indexOf('480x270') !== -1) label = '360p';
        else label = 'Default';
      }

      if (srcUrl.indexOf('http') === 0) {
        sources[label] = srcUrl;
        console.log('[PONE] source →', label, ':', srcUrl.substring(0, 80));
      }
    }

    // Стратегия 2: kt_player (на случай если сайт сменит движок)
    if (Object.keys(sources).length === 0) {
      var ktFields = [
        { regex: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,       label: '480p' },
        { regex: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/,   label: '720p' },
        { regex: /video_alt_url2\s*[:=]\s*['"]([^'"]+)['"]/,  label: '1080p' },
      ];

      for (var i = 0; i < ktFields.length; i++) {
        var m = html.match(ktFields[i].regex);
        if (m && m[1] && m[1].indexOf('http') === 0) {
          sources[ktFields[i].label] = m[1].trim();
        }
      }
    }

    // Стратегия 3: file:'...' (PlayerJS)
    if (Object.keys(sources).length === 0) {
      var fileMatch = html.match(/file\s*[:=]\s*["']([^"']+)["']/);
      if (fileMatch && fileMatch[1]) {
        var fc = fileMatch[1];
        if (fc.indexOf('[') !== -1) {
          var parts = fc.split(',');
          for (var pi = 0; pi < parts.length; pi++) {
            var qm = parts[pi].match(/\[([^\]]+)\]/);
            var link = parts[pi].replace(/\[[^\]]+\]/, '').trim();
            if (qm && link && link.indexOf('http') === 0) {
              sources[qm[1]] = link;
            }
          }
        } else if (fc.indexOf('http') === 0) {
          sources['Default'] = fc;
        }
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
      cat = url.replace(/.*pone\/cat\//, '').split('?')[0].split('/')[0];
    }

    var fetchUrl = buildUrl(cat, page, query);
    console.log('[PONE] routeView →', fetchUrl);

    httpGet(fetchUrl, function (html) {
      console.log('[PONE] html длина:', (html || '').length);
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
  var poneParser = {

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
          title:       'PornOne: ' + query,
          results:     cards,
          collection:  true,
          total_pages: cards.length >= 20 ? page + 1 : 1,
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log('[PONE] qualities() → страница:', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log('[PONE] qualities() → html длина:', (html || '').length);

        if (!html || html.length < 500) {
          error('Страница видео недоступна');
          return;
        }

        var found = extractQualities(html);
        var keys  = Object.keys(found);

        console.log('[PONE] qualities() → найдено:', keys.length, JSON.stringify(found));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn('[PONE] Диагностика:');
          console.warn('[PONE]   <source>:',      (html.match(/<source/gi)        || []).length);
          console.warn('[PONE]   video/mp4:',     (html.match(/video\/mp4/gi)     || []).length);
          console.warn('[PONE]   pornone.com:',   (html.match(/pornone\.com/gi)   || []).length);
          console.warn('[PONE]   videojs:',       (html.match(/videojs/gi)        || []).length);
          error('PornOne: видео не найдено');
        }
      }, error);
    },
  };

  // ----------------------------------------------------------
  // Регистрация
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, poneParser);
      console.log('[PONE] v1.0.0 зарегистрирован');
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