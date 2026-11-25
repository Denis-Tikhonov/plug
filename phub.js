// =============================================================
// phub.js — Парсер PornHub для AdultJS (Lampa)
// Version  : 2.1.0
// Based on : 2.0.0 (структура) + p365_140 (архитектура extractQualities)
//
// [2.1.0] ИСПРАВЛЕНО извлечение видео:
//   — УДАЛЁН split('?')[0] — обрезал токены авторизации CDN → 403
//   — УДАЛЁН поиск data-mp4 /pics/gifs/ — это GIF-превью, не видео
//   — УДАЛЁН поиск по домену phncdn без проверки — брал preview mp4
//   — ИСПРАВЛЕН парсинг flashvars:
//       до: /flashvars_\d+\s*=\s*({.+?});/   ← .+? не захватывает переносы строк
//       после: /flashvars_\d+\s*=\s*(\{[\s\S]+?\});\s*(?:var|\n|$)/
//   — ДОБАВЛЕН резервный regex по videoUrl если JSON.parse упал
//   — ИСПРАВЛЕН ответ qualities(): success(q) → success({ qualities: q })
//     (старый код отдавал голый объект, AdultJS ждёт { qualities: {} })
//   — УБРАНЫ embed-ссылки из результатов (пропускаем /embed/)
//   — ДОБАВЛЕНА диагностика в qualities() как в p365_140
//
// Реальная структура данных видео rt.pornhub.com:
//   flashvars_XXXXXXXX = {
//     mediaDefinitions: [
//       { quality: '1080', videoUrl: 'https://ev-h.phncdn.com/.../master.m3u8?validfrom=...&hash=...' },
//       { quality: '720',  videoUrl: 'https://ev-h.phncdn.com/.../master.m3u8?validfrom=...&hash=...' },
//       { quality: '480',  videoUrl: '...' }
//     ]
//   };
//
//   Токены validfrom/validto/hash живут ~2 часа — СОХРАНЯТЬ ЦЕЛИКОМ, не обрезать.
//
// Worker ALLOWED_TARGETS (обязательно добавить):
//   rt.pornhub.com    — сайт (уже есть)
//   ev-h.phncdn.com   — CDN HLS потоков ← ДОБАВИТЬ если нет
//   phncdn.com        — CDN (шире, накрывает все поддомены)
// =============================================================

(function () {
  'use strict';

  var NAME = 'phub';
  var HOST = 'https://rt.pornhub.com';

  var SORTS = [
    { title: 'Горячие',    val: 'ht' },
    { title: 'Популярные', val: 'mv' },
    { title: 'Лучшие',     val: 'tr' },
    { title: 'Новые',      val: 'cm' },
  ];

  var CATS = [
    { title: 'Зрелые',         val: '28'  },
    { title: 'Мамочки',        val: '29'  },
    { title: 'Анальный секс',  val: '35'  },
    { title: 'Лесбиянки',      val: '27'  },
    { title: 'Секс втроем',    val: '65'  },
    { title: 'Мулаты',         val: '17'  },
    { title: 'Азиатки',        val: '1'   },
    { title: 'Блондинки',      val: '9'   },
    { title: 'Брюнетки',       val: '11'  },
    { title: 'Большая грудь',  val: '8'   },
    { title: 'Большие члены',  val: '7'   },
    { title: 'Групповуха',     val: '80'  },
    { title: 'Любительское',   val: '3'   },
    { title: 'БДСМ',           val: '10'  },
    { title: 'Хентай',         val: '86'  },
    { title: 'Русское',        val: '99'  },
    { title: 'Кастинги',       val: '90'  },
    { title: 'Кремпай',        val: '15'  },
    { title: 'Минет',          val: '13'  },
    { title: 'Мастурбация',    val: '22'  },
  ];

  // ----------------------------------------------------------
  // Очистка URL — НЕ обрезаем параметры (токены обязательны)
  // ----------------------------------------------------------
  function cleanUrl(url) {
    if (!url) return '';
    // Убираем только экранирование обратными слешами
    var clean = url.replace(/\\/g, '');
    if (clean.indexOf('//') === 0) clean = 'https:' + clean;
    return clean;
  }

  // ----------------------------------------------------------
  // Сетевой запрос
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
  // [2.1.0] ИЗВЛЕЧЕНИЕ КАЧЕСТВ ВИДЕО
  //
  // Реальный источник: flashvars_XXXXXXXX в HTML страницы видео.
  // mediaDefinitions содержит HLS .m3u8 ссылки с токенами авторизации.
  // Токены живут ~2 часа — сохраняем URL ЦЕЛИКОМ без обрезки.
  //
  // GIF-превью (data-mp4, /pics/gifs/) — НЕ видеофайлы, пропускаем.
  // embed-ссылки (/embed/) — тоже пропускаем.
  // ----------------------------------------------------------
  function extractQualities(html) {
    var q = {};

    // ----------------------------------------------------------
    // Стратегия 1: flashvars_XXXXXXXX + JSON.parse (основной метод)
    //
    // ВАЖНО: regex с [\s\S]+? вместо .+? — flashvars многострочный
    // ВАЖНО: граница ;\s*(?:var|\n|$) — защита от жадного захвата
    // ----------------------------------------------------------
    var flashRe = /flashvars_\d+\s*=\s*(\{[\s\S]+?\});\s*(?:var\s|\n|<\/script>)/;
    var flashMatch = html.match(flashRe);

    if (flashMatch && flashMatch[1]) {
      try {
        var data = JSON.parse(flashMatch[1]);
        var defs = data.mediaDefinitions;

        if (defs && defs.length) {
          for (var i = 0; i < defs.length; i++) {
            var def = defs[i];
            if (!def.videoUrl) continue;

            // Пропускаем embed-ссылки — они не воспроизводятся напрямую
            if (def.videoUrl.indexOf('/embed/') !== -1) continue;
            // Пропускаем GIF-превью (/pics/gifs/)
            if (def.videoUrl.indexOf('/pics/gifs/') !== -1) continue;

            var videoUrl = cleanUrl(def.videoUrl);
            var quality  = def.quality;

            // quality: '720', '480', '1080', 'undefined' (авто HLS)
            if (!quality || quality === 'undefined' || quality === '') {
              // Авто-определение из URL: 720P_4000K → 720
              var qFromUrl = videoUrl.match(/(\d{3,4})P_/i);
              quality = qFromUrl ? qFromUrl[1] : 'Auto';
            }

            var label = quality + (quality === 'Auto' ? ' HLS' : 'p');

            if (!q[label]) {
              q[label] = videoUrl;
              console.log('[PHUB] flashvars ' + label + ': ' + videoUrl.substring(0, 80));
            }
          }
        }
      } catch (e) {
        console.warn('[PHUB] JSON.parse flashvars ошибка:', e.message);
        // Падаем в стратегию 2
      }
    } else {
      console.warn('[PHUB] flashvars не найден в HTML');
    }

    // ----------------------------------------------------------
    // Стратегия 2: резервный regex по videoUrl в HTML
    // Используется если JSON.parse упал или flashvars не найден
    // ----------------------------------------------------------
    if (!Object.keys(q).length) {
      console.log('[PHUB] Стратегия 2: regex по videoUrl');

      // HLS .m3u8 с токенами
      var hlsRe = /"videoUrl"\s*:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/g;
      var hlsM;
      var hlsIdx = 0;
      while ((hlsM = hlsRe.exec(html)) !== null && hlsIdx < 5) {
        var hlsUrl = cleanUrl(hlsM[1]);
        if (hlsUrl.indexOf('/embed/') !== -1) continue;

        // Качество из URL: 720P_4000K или из query-параметра
        var qH = hlsUrl.match(/(\d{3,4})P_/i);
        var labelH = qH ? qH[1] + 'p' : ('HLS' + (hlsIdx || ''));

        if (!q[labelH]) {
          q[labelH] = hlsUrl;
          console.log('[PHUB] videoUrl HLS ' + labelH + ': ' + hlsUrl.substring(0, 80));
          hlsIdx++;
        }
      }

      // MP4 с токенами (если HLS не нашёлся)
      if (!Object.keys(q).length) {
        var mp4Re = /"videoUrl"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/g;
        var mp4M;
        var mp4Idx = 0;
        while ((mp4M = mp4Re.exec(html)) !== null && mp4Idx < 5) {
          var mp4Url = cleanUrl(mp4M[1]);
          if (mp4Url.indexOf('/pics/gifs/') !== -1) continue;
          if (mp4Url.indexOf('/embed/')    !== -1) continue;

          var qMp4 = mp4Url.match(/(\d{3,4})P_/i) || mp4Url.match(/_(\d{3,4})p?\./i);
          var labelMp4 = qMp4 ? qMp4[1] + 'p' : ('MP4' + (mp4Idx || ''));

          if (!q[labelMp4]) {
            q[labelMp4] = mp4Url;
            console.log('[PHUB] videoUrl MP4 ' + labelMp4 + ': ' + mp4Url.substring(0, 80));
            mp4Idx++;
          }
        }
      }
    }

    // ----------------------------------------------------------
    // Стратегия 3: прямой поиск .m3u8 URL с phncdn (последний резерв)
    // ----------------------------------------------------------
    if (!Object.keys(q).length) {
      console.log('[PHUB] Стратегия 3: прямой поиск phncdn m3u8');

      var cdnRe = /(https?:\/\/[a-z0-9-]+\.phncdn\.com\/[^"'\s]+\.m3u8[^"'\s]*)/g;
      var cdnM;
      var cdnIdx = 0;
      while ((cdnM = cdnRe.exec(html)) !== null && cdnIdx < 3) {
        var cdnUrl = cleanUrl(cdnM[1]);
        var qCdn   = cdnUrl.match(/(\d{3,4})P_/i);
        var labelCdn = qCdn ? qCdn[1] + 'p' : ('CDN' + cdnIdx);
        if (!q[labelCdn]) {
          q[labelCdn] = cdnUrl;
          console.log('[PHUB] CDN fallback ' + labelCdn + ': ' + cdnUrl.substring(0, 80));
          cdnIdx++;
        }
      }
    }

    return q;
  }

  // ----------------------------------------------------------
  // Парсинг каталога
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];

    var doc   = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('li.videoblock, li.pcVideoListItem');

    console.log('[PHUB] parseCards → li.videoblock найдено:', items.length);

    var results = [];

    for (var i = 0; i < items.length; i++) {
      var el = items[i];

      // Ссылка на видео
      var a = el.querySelector('a[href*="/view_video"], a[href*="/video/show"], a[href]');
      if (!a) continue;

      var href = a.getAttribute('href') || '';
      if (!href) continue;
      if (href.indexOf('http') !== 0) href = HOST + href;
      // Пропускаем нон-видео ссылки
      if (href.indexOf('/view_video') === -1 && href.indexOf('/video/show') === -1) {
        // Дополнительная проверка: если ссылка содержит viewkey — видео
        if (href.indexOf('viewkey=') === -1) continue;
      }

      // Постер
      var img = el.querySelector('img');
      var pic = '';
      if (img) {
        pic = img.getAttribute('data-mediumthumb') ||
              img.getAttribute('data-thumb_url')   ||
              img.getAttribute('data-thumb')        ||
              img.getAttribute('src')               || '';
        if (pic.indexOf('//') === 0) pic = 'https:' + pic;
      }

      // Название
      var titleEl = el.querySelector('strong, .title, a[title]');
      var name    = '';
      if (titleEl) {
        name = (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
      }
      if (!name && img) name = (img.getAttribute('alt') || '').trim();
      name = name.replace(/\s+/g, ' ').trim();
      if (!name || name.length < 3) continue;

      // Длительность
      var dur  = el.querySelector('.duration, var.duration, .time');
      var time = dur ? dur.textContent.trim() : '';

      // Качество
      var hdBadge = el.querySelector('.hd-thumbnail, .hd-badge, .video-hd-badge');
      var quality = hdBadge ? 'HD' : '';

      // Превью (gif или mp4 — для карточки при наведении)
      var preview = null;
      if (img) {
        var mediabook = img.getAttribute('data-mediabook') || '';
        // data-mediabook может быть mp4 превью — берём если не /pics/gifs/
        if (mediabook && mediabook.indexOf('/pics/gifs/') === -1) {
          preview = mediabook;
        }
      }

      results.push({
        name:             name,
        video:            href,
        picture:          pic,
        img:              pic,
        poster:           pic,
        background_image: pic,
        preview:          preview,
        time:             time,
        quality:          quality,
        json:             true,    // Lampa вызовет qualities() при открытии
        source:           NAME,
      });
    }

    console.log('[PHUB] parseCards → карточек:', results.length);
    return results;
  }

  // ----------------------------------------------------------
  // Построение URL
  // ----------------------------------------------------------
  function buildUrl(sort, cat, page, query) {
    page = parseInt(page, 10) || 1;

    if (query) {
      return HOST + '/video/search?search=' + encodeURIComponent(query) + '&page=' + page;
    }
    if (cat) {
      return HOST + '/video?c=' + cat + (sort ? '&o=' + sort : '') + '&page=' + page;
    }
    return HOST + '/video?' + (sort ? 'o=' + sort + '&' : '') + 'page=' + page;
  }

  function buildMenu() {
    return [
      { title: 'Поиск', search_on: true, playlist_url: NAME + '/search/' },
      {
        title:        'Категории',
        playlist_url: 'submenu',
        submenu:      CATS.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.val };
        }),
      },
      {
        title:        'Сортировка',
        playlist_url: 'submenu',
        submenu:      SORTS.map(function (s) {
          return { title: s.title, playlist_url: NAME + '/sort/' + s.val };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // Роутинг
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var sort  = null;
    var cat   = null;
    var query = null;

    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      query = decodeURIComponent(searchMatch[1]);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      cat = url.replace(NAME + '/cat/', '').split('?')[0];
    } else if (url.indexOf(NAME + '/sort/') === 0) {
      sort = url.replace(NAME + '/sort/', '').split('?')[0];
    }

    var fetchUrl = buildUrl(sort, cat, page, query);
    console.log('[PHUB] routeView →', fetchUrl);

    httpGet(fetchUrl, function (html) {
      console.log('[PHUB] html длина:', html.length);
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
  var phubParser = {

    main: function (params, success, error) {
      routeView(NAME, 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query    = (params.query || '').trim();
      var fetchUrl = buildUrl(null, null, params.page || 1, query);
      httpGet(fetchUrl, function (html) {
        var cards = parseCards(html);
        success({
          title:       'PH: ' + query,
          results:     cards,
          collection:  true,
          total_pages: cards.length >= 20 ? (params.page || 1) + 1 : 1,
        });
      }, error);
    },

    // [2.1.0] qualities() — исправлено
    qualities: function (videoPageUrl, success, error) {
      console.log('[PHUB] qualities() → страница:', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log('[PHUB] qualities() → html длина:', html.length);

        if (!html || html.length < 1000) {
          console.warn('[PHUB] qualities() → html слишком короткий, возможно блокировка');
          error('Страница видео недоступна (html < 1000 байт)');
          return;
        }

        var found = extractQualities(html);
        var keys  = Object.keys(found);

        console.log('[PHUB] qualities() → найдено качеств:', keys.length, JSON.stringify(keys));

        if (keys.length > 0) {
          // [2.1.0] ИСПРАВЛЕНО: success({ qualities: q }) вместо success(q)
          success({ qualities: found });
        } else {
          // Диагностика
          console.warn('[PHUB] qualities() → ничего не найдено');
          console.warn('[PHUB]   flashvars:',  (html.match(/flashvars_\d+/gi)   || []).length);
          console.warn('[PHUB]   videoUrl:',   (html.match(/"videoUrl"/gi)       || []).length);
          console.warn('[PHUB]   phncdn:',     (html.match(/phncdn\.com/gi)      || []).length);
          console.warn('[PHUB]   .m3u8:',      (html.match(/\.m3u8/gi)           || []).length);
          console.warn('[PHUB]   .mp4:',       (html.match(/\.mp4/gi)            || []).length);
          error('Видео не найдено');
        }
      }, error);
    },
  };

  // ----------------------------------------------------------
  // Регистрация
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, phubParser);
      console.log('[PHUB] v2.1.0 зарегистрирован');
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
