// =============================================================
// trh.js — Парсер TrahKino для AdultJS (Lampa)
// Version  : 1.2.0 (Адаптировано под UNIVERSAL_TEMPLATE)
// Based on : UNIVERSAL_TEMPLATE.js v1.0.0
// Worker   : W170.txt
// =============================================================

(function () {
  'use strict';

  // ============================================================
  // §1. КОНФИГ — ЗАПОЛНИТЕ ДЛЯ СВОЕГО САЙТА
  // ============================================================

  var VERSION = '1.2.0'; // Версия оригинального парсера
  var NAME    = 'trh';   // ← уникальный ID парсера
  var HOST    = 'https://trahkino.me'; // ← базовый URL сайта
  var TAG     = '[' + NAME + ']';      // ← префикс для console.log

  // Правила извлечения видео — порядок = приоритет
  // Адаптировано из UNIVERSAL_TEMPLATE §1 и оригинального trh.js
  var VIDEO_RULES = [
    // kt_player (ostroeporno, hdtube, lenkino, p365)
    // Используем оригинальные правила trh.js, но с label
    { label: '720p', re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/ },
    { label: '480p', re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/     },

    // JW Player (если вдруг появится)
    { label: 'HD',   re: /file\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/ },
    // HLS
    { label: 'HLS',  re: /file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/ },
    // Дополнительно для HLS, если они не в file:
    // { label: 'HLS',  re: /html5player\.setVideoHlsUrl\(['"]([^'"]+)['"]\)/ }, // xv-ru стиль (возможно, не нужно для trahkino)
  ];

  // ============================================================
  // §2. КАТЕГОРИИ — ЗАМЕНИТЕ СВОИМИ
  // ============================================================

  // Взято из оригинального trh.js
  var CATEGORIES = [
    { title: 'Любительское',       slug: 'lyubitelskiy-seks'   },
    { title: 'Минет',              slug: 'minet'               },
    { title: 'Брюнетки',           slug: 'bryunetki'           },
    { title: 'Большие члены',      slug: 'bolshie-hui'         },
    { title: 'Анал',               slug: 'anal'                }, // Добавлено из §2 шаблона, если нужно
    { title: 'Милфы',              slug: 'milfy'               },
    { title: 'Домашнее',           slug: 'domashka'            },
    { title: 'Соло',               slug: 'solo'                }, // Добавлено из §2 шаблона
    { title: 'Большие сиськи',     slug: 'bolshie-siski'       },
    { title: 'От первого лица',    slug: 'ot-pervogo-lica'     },
    { title: 'Большие попки',      slug: 'bolshie-popki'       },
    { title: 'Кончают внутрь',     slug: 'konchayut-vnutr'     },
    { title: 'Мулатки',            slug: 'mulatki'             }, // Добавлено из §2 шаблона
    { title: 'Красотки',           slug: 'krasotki'            },
    { title: 'Русское',            slug: 'russkie'             }, // Добавлено из §2 шаблона
    { title: 'Наездница',          slug: 'naezdnica'           },
    { title: 'Толстушки',          slug: 'tolstye'             }, // Добавлено из §2 шаблона
    { title: 'Натуральные сиськи', slug: 'naturalnye-siski'    },
    { title: 'Раком',              slug: 'rakom'               }, // Добавлено из §2 шаблона
    { title: 'Ролевые игры',       slug: 'rolevye-igry'        },
    { title: 'Фетиш',             slug: 'fetish'              }, // Добавлено из §2 шаблона
    { title: 'Дрочка члена',       slug: 'drochka-chlena'      },
    { title: 'Татуированные',      slug: 'tatu'                },
    { title: 'Групповуха',         slug: 'gruppovuha'          }, // Добавлено из §2 шаблона
    { title: 'Бритые киски',       slug: 'britye-kiski'        },
    { title: 'Мастурбация',        slug: 'masturbaciya'        }, // Добавлено из §2 шаблона
    { title: 'Массаж',             slug: 'eroticheskiy-massaj' },
    { title: 'Сперма',             slug: 'sperma'              },
    { title: 'Куни',               slug: 'kuni'                }, // Добавлено из §2 шаблона
    { title: 'Блондинки',          slug: 'blondinki'           }, // Добавлено из §2 шаблона
    { title: 'Женский оргазм',     slug: 'jenskiy-orgazm'      },
    { title: 'Развратное',         slug: 'razvrat'             }, // Добавлено из §2 шаблона
    { title: 'Латинки',            slug: 'latinki'             },
    { title: 'Француженки',        slug: 'francujenki'         }, // Добавлено из §2 шаблона
    { title: 'МЖМ',                slug: 'mjm'                 },
    { title: 'В очках',            slug: 'v-ochkah'            }, // Добавлено из §2 шаблона
    { title: 'Реальное',           slug: 'realnyy-seks'        },
    { title: 'Бондаж',             slug: 'bondaj'              }, // Добавлено из §2 шаблона
    { title: 'В ванной',           slug: 'v-vannoy'            },
    { title: 'Подборки',           slug: 'podborki'            },
  ];

  // ============================================================
  // §3. ТРАНСПОРТ — не трогать
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
  // §4. cleanUrl — УНИВЕРСАЛЬНАЯ ОЧИСТКА URL
  // ============================================================

  function cleanUrl(raw) {
    if (!raw) return '';

    try {
      var u = raw;

      // 1. Убираем экранированные слеши (\/) — встречается в JS-конфигах
      u = u.replace(/\\\//g, '/');

      // 2. Убираем обычные backslash — xv-ru, p365
      u = u.replace(/\\/g, '');

      // 3. URL-decode если есть %-последовательности — xv-ru, ptop
      if (u.indexOf('%') !== -1) {
        try { u = decodeURIComponent(u); } catch (e) {}
      }

      // 4. Проверка на Base64 (короткие закодированные ссылки)
      //    Признак: строка без слешей, длиннее 20 символов, только base64-символы
      if (u.indexOf('/') === -1 && u.length > 20 && /^[a-zA-Z0-9+/]+=*$/.test(u)) {
        try { var decoded = atob(u); if (decoded.indexOf('http') === 0) u = decoded; } catch (e) {}
      }

      // 5. Protocol-relative → добавляем https:
      if (u.indexOf('//') === 0) u = 'https:' + u;

      // 6. Root-relative → добавляем HOST
      if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;

      // 7. Просто относительный → добавляем HOST/
      if (u.length > 0 && u.indexOf('http') !== 0 && u.charAt(0) !== '/') {
        u = HOST + '/' + u;
      }

      return u;
    } catch (e) {
      return raw;
    }
  }

  // Очистка параметров кеш-бастинга из mp4 URL — из lkno
  function cleanMp4Url(url) {
    return url
      .replace(/[?&]rnd=\d+/g,  '')
      .replace(/[?&]br=\d+/g,   '')
      .replace(/[?&]_=\d+/g,    '')
      .replace(/[?&]+$/g,       '')
      .replace(/\/+$/,          '')
      + '/';
  }

  // ============================================================
  // §5. extractQualities — ПОЛНЫЙ ПЕРЕБОР СТРАТЕГИЙ
  // ============================================================

  function extractQualities(html) {
    var q    = {};
    var have = function () { return Object.keys(q).length > 0; };
    var add  = function (label, url) {
      var u = cleanUrl(url);
      // Пропускаем шаблоны с {}, пустые строки, spacer-заглушки
      if (!u || u.indexOf('{') !== -1 || u.indexOf('spacer') !== -1) return;
      if (!q[label]) q[label] = u;
    };
    var m;

    // ----------------------------------------------------------
    // S1. VIDEO_RULES — конфигурируемые правила (§1)
    // ----------------------------------------------------------
    VIDEO_RULES.forEach(function (rule) {
      // Для правил с глобальным поиском (g флаг) нужно сбрасывать lastIndex
      if (rule.re.global) rule.re.lastIndex = 0;
      m = html.match(rule.re);
      if (m && m[1]) add(rule.label, m[1]);
    });

    // ----------------------------------------------------------
    // S2. <source src="..." size="480"> — p365, briz
    // ----------------------------------------------------------
    if (!have()) {
      var re2a = /<source[^>]+src="([^"]+)"[^>]+size="([^"]+)"/gi;
      var re2b = /<source[^>]+size="([^"]+)"[^>]+src="([^"]+)"/gi;
      while ((m = re2a.exec(html)) !== null) {
        if (m[2] !== 'preview' && m[1].indexOf('.mp4') !== -1) add(m[2] + 'p', m[1]);
      }
      if (!have()) {
        while ((m = re2b.exec(html)) !== null) {
          if (m[1] !== 'preview' && m[2].indexOf('.mp4') !== -1) add(m[1] + 'p', m[2]);
        }
      }
    }

    // ----------------------------------------------------------
    // S3. <source src="..." label="480p"> — ostr
    // ----------------------------------------------------------
    if (!have()) {
      var re3a = /<source[^>]+src="([^"]+)"[^>]+label="([^"]+)"/gi;
      var re3b = /<source[^>]+label="([^"]+)"[^>]+src="([^"]+)"/gi;
      while ((m = re3a.exec(html)) !== null) {
        if (m[1].indexOf('.mp4') !== -1) add(m[2], m[1]);
      }
      if (!have()) {
        while ((m = re3b.exec(html)) !== null) {
          if (m[2].indexOf('.mp4') !== -1) add(m[1], m[2]);
        }
      }
    }

    // ----------------------------------------------------------
    // S4. <source src="..." title="720p"> — yjizz
    // ----------------------------------------------------------
    if (!have()) {
      try {
        var doc     = new DOMParser().parseFromString(html, 'text/html');
        var sources = doc.querySelectorAll('video source[src]');
        for (var si = 0; si < sources.length; si++) {
          var src   = sources[si].getAttribute('src')   || '';
          var slbl  = sources[si].getAttribute('title') ||
                      sources[si].getAttribute('label') ||
                      sources[si].getAttribute('size')  || 'auto';
          if (!src || src.indexOf('blob:') === 0) continue;
          var skey = (slbl.toLowerCase() === 'auto') ? 'auto' : slbl;
          add(skey, src);
        }
      } catch (e) { console.warn(TAG, 'S4 error:', e.message || e); }
    }

    // ----------------------------------------------------------
    // S5. dataEncodings JSON — yjizz
    // ----------------------------------------------------------
    if (!have()) {
      try {
        var idx = html.indexOf('dataEncodings');
        if (idx !== -1) {
          var arrStart = html.indexOf('[', idx);
          if (arrStart !== -1) {
            var depth = 0, arrEnd = -1;
            for (var ci = arrStart; ci < html.length; ci++) {
              if      (html[ci] === '[') depth++;
              else if (html[ci] === ']') { depth--; if (depth === 0) { arrEnd = ci; break; } }
            }
            if (arrEnd !== -1) {
              var dataEnc = JSON.parse(html.substring(arrStart, arrEnd + 1));
              dataEnc.forEach(function (enc) {
                if (!enc.filename) return;
                var dkey = (String(enc.quality).toLowerCase() === 'auto') ? 'auto' : (enc.quality + 'p');
                add(dkey, enc.filename.replace(/\\\//g, '/'));
              });
            }
          }
        }
      } catch (e) { console.warn(TAG, 'S5 dataEncodings error:', e.message || e); }
    }

    // ----------------------------------------------------------
    // S6. og:video meta mp4 — p365, hdtub
    // ----------------------------------------------------------
    if (!have()) {
      var ogMatches = html.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+\.mp4[^"]*)"/gi)
                   || html.match(/<meta[^>]+content="([^"]+\.mp4[^"]*)"[^>]+property="og:video"/gi);
      if (ogMatches) {
        ogMatches.forEach(function (tag) {
          var cm = tag.match(/content="([^"]+\.mp4[^"]*)"/i);
          if (!cm) return;
          var ogUrl = cleanUrl(cm[1]);
          if (ogUrl.indexOf('/embed/') !== -1) return;
          var qm = ogUrl.match(/_(\d+)\.mp4/);
          add(qm ? qm[1] + 'p' : 'HD', ogUrl);
        });
      }
    }

    // ----------------------------------------------------------
    // S7. html5player.setVideoUrl* — xv-ru, xvideos клоны
    // ----------------------------------------------------------
    if (!have()) {
      var mH = html.match(/html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/);
      var mL = html.match(/html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/);
      if (mH) add('720p', mH[1]);
      if (mL) add('480p', mL[1]);
    }

    // ----------------------------------------------------------
    // S8. HLS m3u8 regex
    // ----------------------------------------------------------
    if (!have()) {
      // CDN77 паттерн (xv-ru)
      var mHls77 = html.match(/"(https?:\/\/hls[^"]+\.m3u8[^"]*)"/);
      if (mHls77) add('HLS', mHls77[1]);

      // YouJizz abre-videos
      var mHlsYj = html.match(/((?:https?:)?\/\/abre-videos\.[^"'\s]+\.m3u8[^"'\s]*)/);
      if (mHlsYj) add('HLS', mHlsYj[1]);

      // Любой m3u8
      if (!have()) {
        var mHlsAny = html.match(/['"]?(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*?)['"]?/);
        if (mHlsAny) add('HLS', mHlsAny[1]);
      }
    }

    // ----------------------------------------------------------
    // S9. get_file URL fallback — p365
    // ----------------------------------------------------------
    if (!have()) {
      var getFileRe = /(https?:\/\/[^"'\s]+\/get_file\/[^"'\s]+\.mp4[^"'\s]*)/g;
      var gf, gfCount = 0;
      while ((gf = getFileRe.exec(html)) !== null && gfCount < 5) {
        if (gf[1].indexOf('preview') !== -1) continue;
        var gfQ = gf[1].match(/_(\d+)\.mp4/);
        add(gfQ ? gfQ[1] + 'p' : ('auto' + gfCount), gf[1]);
        gfCount++;
      }
    }

    // ----------------------------------------------------------
    // S10. Любой прямой https://...mp4 без шаблонов — ptop, briz
    // ----------------------------------------------------------
    if (!have()) {
      var allMp4 = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi);
      if (allMp4) {
        allMp4.forEach(function (u, i) {
          if (u.indexOf('{') !== -1) return; // пропускаем шаблоны ptop
          var qm2 = u.match(/_(\d+)\.mp4/);
          add(qm2 ? qm2[1] + 'p' : ('HD' + (i || '')), u);
        });
      }
    }

    return q;
  }

  // ============================================================
  // §6. ПАРСИНГ КАРТОЧЕК
  // ============================================================

  // Селекторы из UNIVERSAL_TEMPLATE §6
  var CARD_SELECTORS = [
    '.video-block',    // p365
    '.video-item',     // yjizz, xv-ru
    'div.thumb_main',  // briz
    '.thumb',          // xv-ru
    '.item',           // hdtub, ptop // <-- этот селектор уже есть в trh.js
    '.thumb_main',
    'article.video',
    '.video-thumb',
    '.video',
  ];

  function parsePlaylist(html) {
    var results = [];
    var doc     = new DOMParser().parseFromString(html, 'text/html');
    var items;

    // Находим первый работающий селектор
    for (var s = 0; s < CARD_SELECTORS.length; s++) {
      items = doc.querySelectorAll(CARD_SELECTORS[s]);
      if (items && items.length > 0) {
        console.log(TAG, 'parsePlaylist → "' + CARD_SELECTORS[s] + '" найдено:', items.length);
        break;
      }
    }

    // Fallback: все ссылки на /video/ или /videos/
    if (!items || items.length === 0) {
      console.log(TAG, 'parsePlaylist → fallback ссылки /video/');
      items = doc.querySelectorAll('a[href*="/video/"], a[href*="/videos/"]');
      for (var j = 0; j < items.length; j++) {
        var aEl  = items[j];
        var href = cleanUrl(aEl.getAttribute('href') || '');
        if (!href) continue;
        var imgA = aEl.querySelector('img');
        var picA = imgA ? cleanUrl(imgA.getAttribute('data-original') || imgA.getAttribute('data-src') || imgA.getAttribute('src') || '') : '';
        var nameA = (aEl.getAttribute('title') || aEl.textContent || '').replace(/\s+/g, ' ').trim() || slugToTitle(href);
        results.push(makeCard(nameA, href, picA, '', '')); // time и preview пустые для fallback
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
    // Ссылка на страницу видео
    var linkEl = el.querySelector('a[href*="/video/"]') ||
                 el.querySelector('a[href*="/videos/"]') ||
                 el.querySelector('a[href]');
    if (!linkEl) return null;

    var href = cleanUrl(linkEl.getAttribute('href') || '');
    if (!href) return null;

    // Превью/постер — перебор атрибутов по приоритету
    var imgEl = el.querySelector('img');
    var pic   = '';
    if (imgEl) {
      pic = cleanUrl(
        imgEl.getAttribute('data-original') || // yjizz, ptop
        imgEl.getAttribute('data-src')      || // p365, xv-ru
        imgEl.getAttribute('src')           || ''
      );
      // Игнорируем spacer-заглушки
      if (pic.indexOf('spacer') !== -1) pic = '';
    }

    // Название — несколько вариантов источника
    var titleEl = el.querySelector('.title, .th-title, .video-title a, .video-title, .itm-tit, a[title]');
    var name    = '';
    if (titleEl) name = (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
    if (!name)   name = (linkEl.getAttribute('title') || '').trim();
    if (!name)   name = slugToTitle(href); // Генерируем из URL как xv-ru
    name = name.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!name) return null;

    // Длительность
    var durEl = el.querySelector('.duration, .time, .length, span.time, .itm-dur');
    var time  = durEl ? durEl.textContent.replace(/[^\d:]/g, '').trim() : '';

    // Превью-видео (briz, yjizz)
    var vidEl   = el.querySelector('video[data-preview]') || el.querySelector('a[data-clip]');
    var preview = null;
    if (vidEl) {
      preview = cleanUrl(vidEl.getAttribute('data-preview') || vidEl.getAttribute('data-clip') || '');
    }

    return makeCard(name, href, pic, time, preview);
  }

  // Фабрика карточки — все обязательные поля AdultJS
  function makeCard(name, href, pic, time, preview) {
    return {
      name:             name,
      video:            href,   // ← страница видео, qualities() извлечёт mp4
      // Четыре обязательных поля постера (yjizz, briz, xv-ru)
      picture:          pic,
      img:              pic,
      poster:           pic,
      background_image: pic,
      preview:          preview || null,
      time:             time  || '',
      quality:          'HD', // По умолчанию HD, будет перезаписано extractQualities
      json:             true,   // ← Lampa вызовет qualities() при нажатии
      source:           NAME,
    };
  }

  // Генерация названия из slug URL — xv-ru
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
      // Вариант A: /?q=query&page=N  (hdtub, ptop)
      url += '/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'cat') {
      // Вариант A: /?c={slug}&page=N
      url += '/?c=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'sort') {
      // Вариант A: /sort-type/page.html  (yjizz)
      // url += '/' + value + '/' + page + '.html';
      // Вариант B: /sort-type/page/  (p365, lkno)
      // url += '/' + value + (page > 1 ? '/page/' + page : '/');
      // Для trahkino.me, похоже, нет явной сортировки в URL, кроме как в GET параметрах.
      // Если есть, нужно адаптировать. Пока оставляем как главную страницу.
      if (page > 1) url += '/?page=' + page;
    } else {
      // Главная / новинки
      if (page > 1) url += '/latest-updates/?page=' + page;
      else url += '/latest-updates/'; // Оригинальный путь для новинок
    }
    return url;
  }

  // ============================================================
  // §8. МЕНЮ
  // ============================================================

  function buildMenu() {
    return [
      {
        title:        '🔍 Поиск',
        search_on:    true,
        playlist_url: NAME + '/search/', // Путь для поиска Lampa
      },
      {
        title:        '🔥 Новинки',
        playlist_url: NAME + '/new', // Путь для главной страницы / новинок
      },
      {
        title:        '📂 Категории',
        playlist_url: 'submenu',
        submenu:      CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ============================================================
  // §9. РОУТИНГ — идентично p365/yjizz/briz
  // ============================================================

  function routeView(url, page, success, error) {
    console.log(TAG, 'routeView → "' + url + '" page=' + page);

    var fetchUrl;

    // 1. Поиск через фильтр Lampa (?search=...)
    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      fetchUrl = buildUrl('search', decodeURIComponent(searchMatch[1]), page);
      return loadPage(fetchUrl, page, success, error);
    }

    // 2. Категория: NAME/cat/slug
    if (url.indexOf(NAME + '/cat/') === 0) {
      var cat = url.replace(NAME + '/cat/', '').split('?')[0];
      fetchUrl = buildUrl('cat', cat, page);
      return loadPage(fetchUrl, page, success, error);
    }

    // 3. Сортировка: NAME/sort/value (для trahkino.me, если есть, то через GET параметры)
    if (url.indexOf(NAME + '/sort/') === 0) {
      var sort = url.replace(NAME + '/sort/', '').split('?')[0];
      fetchUrl = buildUrl('sort', sort, page); // buildUrl должен обработать 'sort'
      return loadPage(fetchUrl, page, success, error);
    }

    // 4. Поиск через путь: NAME/search/query
    if (url.indexOf(NAME + '/search/') === 0) {
      var rawQ = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      if (rawQ) {
        fetchUrl = buildUrl('search', rawQ, page);
        return loadPage(fetchUrl, page, success, error);
      }
    }

    // 5. Главная / всё остальное ( новинки)
    loadPage(buildUrl('main', null, page), page, success, error);
  }

  function loadPage(fetchUrl, page, success, error) {
    console.log(TAG, 'loadPage →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      console.log(TAG, 'html длина:', html.length);
      var results = parsePlaylist(html);
      if (!results.length) {
        // Если результатов нет, но это страница закладок (local://bookmarks)
        if (fetchUrl.indexOf('local://bookmarks') !== -1) {
            error(Lampa.Lang.translate('adult_bm_empty')); // Сообщение из Lampa.Lang
        } else {
            error('Контент не найден');
        }
        return;
      }
      success({
        results:     results,
        collection:  true,
        total_pages: results.length >= 20 ? page + 1 : page, // Предполагаем 20 элементов на странице
        menu:        buildMenu(),
      });
    }, error);
  }

  // ============================================================
  // §10. ПАРСЕР API — публичный интерфейс
  // ============================================================

  var MyParser = {

    main: function (params, success, error) {
      // Используем путь '/new' для главной страницы (новинки)
      routeView(NAME + '/new', 1, success, error);
    },

    view: function (params, success, error) {
      // params.url может быть:
      // - NAME/cat/slug
      // - NAME/search/query
      // - NAME/new (если пришло из меню)
      // - NAME (если пришло из поиска Lampa)
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var page  = parseInt(params.page, 10) || 1;
      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }
      // Используем buildUrl для построения URL поиска
      httpGet(buildUrl('search', query, page), function (html) {
        var results = parsePlaylist(html);
        success({
          title:       NAME.toUpperCase() + ': ' + query,
          results:     results,
          collection:  true,
          total_pages: results.length >= 20 ? page + 1 : page,
        });
      }, error);
    },

    // ----------------------------------------------------------
    // qualities — главная функция извлечения видео
    // ----------------------------------------------------------
    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);

      httpGet(videoPageUrl, function (html) {
        console.log(TAG, 'qualities() html длина:', html.length);

        if (!html || html.length < 500) {
          error('Страница видео недоступна (html < 500 байт)');
          return;
        }

        var found = extractQualities(html); // <-- Используем новую extractQualities
        var keys  = Object.keys(found);

        console.log(TAG, 'qualities() найдено:', keys.length, JSON.stringify(keys));

        if (keys.length > 0) {
          // Нормализуем значения cleanMp4Url для .mp4 ссылок, если это необходимо для trahkino.me
          // keys.forEach(function (k) {
          //   if (found[k].indexOf('.mp4') !== -1 && found[k].indexOf('?') !== -1) {
          //     found[k] = cleanMp4Url(found[k]);
          //   }
          // });
          success({ qualities: found });
        } else {
          // Диагностика для следующего дебага
          console.warn(TAG, '<source>:',    (html.match(/<source/gi)    || []).length);
          console.warn(TAG, 'og:video:',    (html.match(/og:video/gi)   || []).length);
          console.warn(TAG, '.mp4:',        (html.match(/\.mp4/gi)      || []).length);
          console.warn(TAG, '.m3u8:',       (html.match(/\.m3u8/gi)     || []).length);
          console.warn(TAG, 'video_url:',   (html.match(/video_url/gi)  || []).length);
          console.warn(TAG, 'dataEncoding:',(html.match(/dataEncoding/gi)|| []).length);
          console.warn(TAG, 'html5player:', (html.match(/html5player/gi)|| []).length);
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
      window.AdultPlugin.registerParser(NAME, MyParser);
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
