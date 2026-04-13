// =============================================================
// yjizz.js — Парсер YouJizz для AdultJS / AdultPlugin (Lampa)
// Version  : 2.0.0
// Changed  :
//   [1.0.0] Первая версия — ограниченно рабочая.
//   [2.0.0] Полный рефакторинг по образцу xds_1.1.0.
//           Убран Worker из парсера — используется AdultPlugin.networkRequest().
//           Исправлен URL поиска: /?q={query}&page={N} (из анализатора).
//           Исправлены селекторы карточек: точная структура из HTML-анализа.
//             - Контейнер:  .video-item
//             - Ссылка:     a.frame.video[href]
//             - Preview:    a.frame.video[data-clip]  → mp4-клип
//             - Картинка:   img[data-original]
//             - Заголовок:  .video-title a
//             - Время:      span.time (очищается от fa-иконки)
//             - Качество:   span.i-hd
//           Исправлено извлечение видео:
//             Метод 1 — regex JS-переменной encodings=[{quality,filename}]
//             Метод 2 — <source src title> из video-тега
//             Метод 3 — regex m3u8/mp4 от abre-videos/cdne-mobile
//           Роутинг URL по образцу xds_1.1.0:
//             yjizz/sort/{val}, yjizz/cat/{val}, yjizz/search/
//           Cookie mature=1 добавляется в fallback-fetch.
//
// Структура сайта (из анализатора v3.4, 2026-04-13):
//   Каталог:   /{sort}/{page}.html
//   Категория: /categories/{slug}-{page}.html
//   Поиск:     /?q={query}&page={N}
//   Пагинация: /most-popular/2.html (паттерн)
//   Age gate:  Cookie: mature=1 (low impact)
//   Cloudflare: нет | DRM: нет | Auth: нет | SSR: да
// =============================================================

(function () {
  'use strict';

  var NAME = 'yjizz';
  var HOST = 'https://www.youjizz.com';

  // ----------------------------------------------------------
  // СОРТИРОВКИ
  // (из навигации анализатора + yjizz 1.0.0)
  // ----------------------------------------------------------
  var SORTS = [
    { title: 'Популярное',  val: 'most-popular'    },
    { title: 'Новинки',     val: 'newest-clips'    },
    { title: 'Топ недели',  val: 'top-rated-week'  },
    { title: 'Топ месяца',  val: 'top-rated-month' },
    { title: 'Лучшее',      val: 'top-rated'       },
    { title: 'В тренде',    val: 'trending'        },
    { title: 'HD',          val: 'highdefinition'  },
  ];

  // ----------------------------------------------------------
  // КАТЕГОРИИ
  // (из navigation.categories анализатора — только /categories/ URL)
  // ----------------------------------------------------------
  var CATS = [
    { title: 'Мачеха',         val: 'stepmom'           },
    { title: 'Японки',         val: 'japanese'           },
    { title: 'MILF',           val: 'milf'               },
    { title: 'Анал',           val: 'anal'               },
    { title: 'Любительское',   val: 'amateur'            },
    { title: 'Кремпай',        val: 'creampie'           },
    { title: 'Большие сиськи', val: 'big-tits'           },
    { title: 'Threesome',      val: 'threesome'          },
    { title: 'Сводная сестра', val: 'step-sister'        },
    { title: 'POV',            val: 'pov'                },
    { title: 'Латинки',        val: 'latina'             },
    { title: 'Азиатки',        val: 'asian'              },
    { title: 'Молодые',        val: 'teen'               },
    { title: 'Хентай',         val: 'hentai'             },
    { title: 'Межрасовый',     val: 'interracial'        },
    { title: 'Зрелые',         val: 'mature'             },
    { title: 'Gangbang',       val: 'gangbang'           },
    { title: 'Ebony',          val: 'ebony'              },
    { title: 'Массаж',         val: 'massage'            },
    { title: 'Компиляция',     val: 'compilation'        },
    { title: 'Blacked',        val: 'blacked'            },
    { title: 'Сестра',         val: 'sister'             },
    { title: 'Taboo',          val: 'taboo'              },
    { title: 'BBC',            val: 'bbc'                },
    { title: 'Big Ass',        val: 'big-ass'            },
    { title: 'Блондинки',      val: 'blonde'             },
    { title: 'Blowjob',        val: 'blowjob'            },
    { title: 'Папочка',        val: 'daddy'              },
    { title: 'Семья',          val: 'family'             },
    { title: 'Японские жёны',  val: 'japanese-wife'      },
    { title: 'Stepdaughter',   val: 'stepdaughter'       },
    { title: 'Casting',        val: 'casting'            },
    { title: 'Pinay',          val: 'pinay'              },
    { title: 'Stepsister',     val: 'stepsister'         },
    { title: 'Czech Streets',  val: 'czech-streets'      },
    { title: 'Lana Rhoades',   val: 'lana-rhoades'       },
    { title: 'Riley Reid',     val: 'riley-reid'         },
    { title: 'Cory Chase',     val: 'cory-chase'         },
    { title: 'Brandi Love',    val: 'brandi-love'        },
  ];

  // ----------------------------------------------------------
  // HTTP — через AdultPlugin.networkRequest() (без Worker в парсере)
  // Fallback: прямой fetch с Cookie: mature=1
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin &&
        typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      if (typeof fetch === 'undefined') { error('fetch unavailable'); return; }
      fetch(url, {
        method:  'GET',
        headers: { 'Cookie': 'mature=1' }
      })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(success)
        .catch(error);
    }
  }

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL
  // Источник: анализатор v3.4 + HTML структура навигации
  // ----------------------------------------------------------
  function buildCatalogUrl(sort, page) {
    return HOST + '/' + (sort || SORTS[0].val) + '/' + (page || 1) + '.html';
  }

  function buildCatUrl(cat, page) {
    return HOST + '/categories/' + cat + '-' + (page || 1) + '.html';
  }

  // Поиск: /?q={query}  (page 2+ → &page={N})
  // Источник: navigation.urlScheme.search из анализатора
  function buildSearchUrl(query, page) {
    page = page || 1;
    var url = HOST + '/?q=' + encodeURIComponent(query);
    if (page > 1) url += '&page=' + page;
    return url;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  //
  // Точная структура из "5 карточки yjizz.txt":
  //
  // <div class="video-thumb">
  //   <div class="default video-item">
  //     <div class="frame-wrapper">
  //       <a class="frame video" href="/videos/..." data-clip="//cdne-mobile.../clip.mp4?...">
  //         <img class="img-responsive lazy" data-original="//cdne-pics.../...jpg">
  //         <span class="i-hd">HD</span>
  //       </a>
  //     </div>
  //     <div class="video-title">
  //       <a href="/videos/...">Title text</a>
  //     </div>
  //     <div class="video-content-wrapper">
  //       <span class="time"><i class="fa fa-clock-o"></i>&nbsp;33:45</span>
  //     </div>
  //   </div>
  // </div>
  //
  // CSS-селекторы подтверждены анализатором:
  //   cardSelector:  ".video-item"
  //   title.css:     ".video-item .video-title"
  //   link.css:      ".video-item a[href]"
  //   thumbnail.css: ".video-item img" (attr: data-original)
  //   duration.css:  ".video-item .time"
  //   quality.css:   ".video-item [class*='hd']"
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];
    var doc   = new DOMParser().parseFromString(html, 'text/html');
    var cards = [];

    // Основной селектор (анализатор: cardSelector = ".video-item")
    var items = doc.querySelectorAll('.video-item');

    // Fallback: родительский .video-thumb
    if (!items || !items.length) {
      items = doc.querySelectorAll('.video-thumb');
    }

    if (!items || !items.length) return [];

    for (var i = 0; i < items.length; i++) {
      var card = _parseCard(items[i]);
      if (card) cards.push(card);
    }

    return cards;
  }

  function _parseCard(el) {
    // --- Ссылка и превью ---
    // a.frame.video — основная ссылка + data-clip (превью mp4)
    var aEl = el.querySelector('a.frame.video');
    if (!aEl) aEl = el.querySelector('a.frame');
    if (!aEl) aEl = el.querySelector('a[href*="/videos/"]');
    if (!aEl) return null;

    var href = aEl.getAttribute('href') || '';
    if (!href) return null;
    if (href.indexOf('http') !== 0) href = HOST + href;

    // data-clip: "//cdne-mobile.youjizz.com/...clip.mp4?validfrom=..."
    var preview = aEl.getAttribute('data-clip') || null;
    if (preview) {
      if (preview.indexOf('http') !== 0) preview = 'https:' + preview;
    }

    // --- Картинка ---
    // img.img-responsive.lazy[data-original] (lazy-load)
    var imgEl   = el.querySelector('img');
    var picture = '';
    if (imgEl) {
      picture = imgEl.getAttribute('data-original') ||
                imgEl.getAttribute('src')           || '';
    }
    if (picture && picture.indexOf('http') !== 0 && picture.length > 1) {
      picture = 'https:' + picture;
    }

    // --- Заголовок ---
    // .video-title a → приоритет; fallback → a[title] на ссылке
    var titleEl = el.querySelector('.video-title a');
    if (!titleEl) titleEl = el.querySelector('.video-title');
    var name = '';
    if (titleEl) name = titleEl.textContent.trim();
    if (!name)   name = (aEl.getAttribute('title') || '').trim();
    if (!name)   return null;

    // --- Длительность ---
    // span.time содержит: <i class="fa fa-clock-o"></i>&nbsp;33:45
    // textContent даёт: "\xa033:45" → убираем всё кроме цифр и ":"
    var durEl = el.querySelector('span.time, .time');
    var time  = '';
    if (durEl) {
      time = durEl.textContent.replace(/[^\d:]/g, '').trim();
    }

    // --- Качество ---
    // span.i-hd (из анализатора: xpath "//span[contains(@class,'i-hd')]")
    var qualEl  = el.querySelector('span.i-hd, [class*="i-hd"]');
    var quality = qualEl ? 'HD' : '';

    return {
      name:    name,
      video:   href,
      picture: picture,
      preview: preview,
      time:    time,
      quality: quality,
      json:    true,    // AdultJS будет вызывать parser.qualities()
      related: true,
      model:   null,
      source:  NAME,
    };
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ ВИДЕО СО СТРАНИЦЫ
  //
  // Из HTML страницы видео (5 карточки yjizz.txt — блок player):
  //
  // Метод 1 (приоритет): JS-переменная encodings
  //   encodings.reverse().forEach(function(encoding) {
  //       src1.setAttribute('src', encoding.filename);   ← URL
  //       src1.setAttribute('title', encoding.quality); ← "Auto","1080",...
  //   });
  //   → ищем: var encodings = [{quality:"...",filename:"//..."}]
  //
  // Метод 2: <source src title type="application/x-mpegURL">
  //   <source src="//abre-videos.youjizz.com/...master.m3u8?..." title="Auto">
  //   Качества: Auto, 1080, 720, 480, 360, 240
  //
  // Метод 3 (fallback): regex m3u8/mp4 от abre-videos/cdne-mobile
  // ----------------------------------------------------------
  function getVideoLinks(videoPageUrl, success, error) {
    httpGet(videoPageUrl, function (html) {
      var qualitys = {};

      // --- Метод 1: var encodings = [...] ---
      // quality: число (240,360,480,720,1080) или строка "Auto"
      // filename: "//abre-videos.youjizz.com/...master.m3u8?..."
      try {
    var reEnc = /\bdataEncodings\s*=\s*($[\s\S]*?$)\s*;/;
    var mEnc  = html.match(reEnc);
    if (mEnc && mEnc[1]) {
        var dataEnc = JSON.parse(mEnc[1]);
        dataEnc.forEach(function (enc) {
            if (!enc.filename || enc.quality === undefined) return;
            var u = enc.filename.replace(/\\\//g, '/');
            if (u.indexOf('http') !== 0) u = 'https:' + u;
            var key = (String(enc.quality).toLowerCase() === 'auto')
                ? 'auto'
                : (enc.quality + 'p');
            // Предпочитаем m3u8 (abre-videos) над mp4 (cdne-mobile)
            if (!qualitys[key] || u.indexOf('.m3u8') !== -1) {
                qualitys[key] = u;
            }
        });
        if (Object.keys(qualitys).length) {
            console.log('[yjizz] qualitys via dataEncodings:', Object.keys(qualitys));
        }
    }
} catch (e) {
    console.warn('[yjizz] dataEncodings parse error:', e.message || e);
}


      // --- Метод 2: <source src title> ---
      // title: "Auto","1080","720","480","360","240"
      if (!Object.keys(qualitys).length) {
        try {
          var doc     = new DOMParser().parseFromString(html, 'text/html');
          var sources = doc.querySelectorAll('video source[src][title]');
          for (var si = 0; si < sources.length; si++) {
            var src   = sources[si].getAttribute('src')   || '';
            var title = sources[si].getAttribute('title') || 'auto';
            if (!src || src.indexOf('blob:') === 0) continue;
            if (src.indexOf('http') !== 0) src = 'https:' + src;
            var key2 = (title.toLowerCase() === 'auto') ? 'auto' : (title + 'p');
            qualitys[key2] = src;
          }
          if (Object.keys(qualitys).length) {
            console.log('[yjizz] qualitys via <source>:', Object.keys(qualitys));
          }
        } catch (e) {
          console.warn('[yjizz] <source> parse error:', e.message || e);
        }
      }

      // --- Метод 3: regex m3u8/mp4 ---
      if (!Object.keys(qualitys).length) {
        var re3 = /((?:https?:)?\/\/(?:abre-videos|cdne-mobile)\.youjizz\.com\/[^"'\s]+\.(?:m3u8|mp4)[^"'\s]*)/g;
        var m3;
        while ((m3 = re3.exec(html)) !== null) {
          var u3 = m3[1];
          if (u3.indexOf('http') !== 0) u3 = 'https:' + u3;
          qualitys['auto'] = u3;
          console.log('[yjizz] qualitys via regex:', u3.substring(0, 80));
          break;
        }
      }

      if (!Object.keys(qualitys).length) {
        error('YouJizz: видео не найдено на странице');
        return;
      }

      // ИСПРАВЛЕНИЕ: передаём объект напрямую
      // AdultJS: var qualities = data.qualities || data
      // → data = qualitys → qualities = qualitys ✓
      success(qualitys);

    }, error);
  }


  // ----------------------------------------------------------
  // МЕНЮ ФИЛЬТРА (по образцу xds_1.1.0)
  //
  // search_on:true → AdultJS показывает «Найти» в фильтре.
  // После ввода AdultJS добавляет ?search=... к playlist_url.
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      {
        title:        '🔍 Поиск',
        search_on:    true,
        playlist_url: NAME + '/search/',
      },
      {
        title:        '🗂 Сортировка',
        playlist_url: 'submenu',
        submenu:      SORTS.map(function (s) {
          return {
            title:        s.title,
            playlist_url: NAME + '/sort/' + s.val,
          };
        }),
      },
      {
        title:        '📂 Категории',
        playlist_url: 'submenu',
        submenu:      CATS.map(function (c) {
          return {
            title:        c.title,
            playlist_url: NAME + '/cat/' + c.val,
          };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТЕР (по образцу xds_1.1.0 routeView)
  //
  // Форматы url из AdultJS:
  //
  //   1. 'yjizz'
  //      → popular (стартовая страница)
  //
  //   2. 'yjizz/sort/most-popular'
  //      → buildCatalogUrl('most-popular', page)
  //
  //   3. 'yjizz/cat/stepmom'
  //      → buildCatUrl('stepmom', page)
  //
  //   4. 'yjizz/search/wife'  (клик по категории подменю)
  //      → buildSearchUrl('wife', page)
  //
  //   5. 'yjizz/search/?search=wife'  (пользователь ввёл в фильтре)
  //      → buildSearchUrl('wife', page)
  // ----------------------------------------------------------
  function parseSearchParam(url) {
    var m = url.match(/[?&]search=([^&]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function routeLoad(url, page, success, error) {
    console.log('[yjizz] routeLoad → "' + url + '" page=' + page);

    var PREFIX_SORT  = NAME + '/sort/';
    var PREFIX_CAT   = NAME + '/cat/';
    var PREFIX_SRCH  = NAME + '/search/';

    // Случай 5: ?search=query (фильтр-поиск)
    var sq = parseSearchParam(url);
    if (sq !== null) {
      var q5 = sq.trim();
      if (q5) {
        fetchPage(buildSearchUrl(q5, page), page, success, error);
      } else {
        fetchPage(buildCatalogUrl(SORTS[0].val, page), page, success, error);
      }
      return;
    }

    // Случай 2: yjizz/sort/{val}
    if (url.indexOf(PREFIX_SORT) === 0) {
      var sort = url.replace(PREFIX_SORT, '').split('?')[0].trim();
      fetchPage(buildCatalogUrl(sort || SORTS[0].val, page), page, success, error);
      return;
    }

    // Случай 3: yjizz/cat/{val}
    if (url.indexOf(PREFIX_CAT) === 0) {
      var cat = url.replace(PREFIX_CAT, '').split('?')[0].trim();
      if (cat) {
        fetchPage(buildCatUrl(cat, page), page, success, error);
        return;
      }
    }

    // Случай 4: yjizz/search/{query}
    if (url.indexOf(PREFIX_SRCH) === 0) {
      var rawQ = url.replace(PREFIX_SRCH, '').split('?')[0].trim();
      if (rawQ) {
        fetchPage(buildSearchUrl(decodeURIComponent(rawQ), page), page, success, error);
        return;
      }
    }

    // Случай 1: yjizz / неизвестное → popular
    fetchPage(buildCatalogUrl(SORTS[0].val, page), page, success, error);
  }

  // ----------------------------------------------------------
  // ЗАГРУЗКА СПИСКА КАРТОЧЕК
  // ----------------------------------------------------------
  function fetchPage(loadUrl, page, success, error) {
    console.log('[yjizz] fetchPage → ' + loadUrl);
    httpGet(loadUrl, function (html) {
      var results = parseCards(html);
      if (!results.length) {
        error('YouJizz: карточки не найдены');
        return;
      }
      success({
        results:     results,
        collection:  true,
        total_pages: results.length >= 20 ? page + 5 : page,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ----------------------------------------------------------
  // ПУБЛИЧНЫЙ ИНТЕРФЕЙС ПАРСЕРА
  // ----------------------------------------------------------
  var YjizzParser = {

    // Главный экран (горизонтальные полосы в Sisi)
    main: function (params, success, error) {
      fetchPage(buildCatalogUrl(SORTS[0].val, 1), 1, success, error);
    },

    // Каталог / категория / поиск через фильтр (View)
    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url  = params.url || NAME;
      routeLoad(url, page, success, error);
    },

    // Глобальный поиск через строку Lampa
    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var page  = parseInt(params.page, 10) || 1;

      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }

      fetchPage(buildSearchUrl(query, page), page, function (data) {
        data.title = 'YouJizz: ' + query;
        data.url   = NAME + '/search/' + encodeURIComponent(query);
        success(data);
      }, error);
    },

    // Получение прямых ссылок на видео
    // Вызывается AdultJS когда element.json === true
    qualities: function (videoUrl, success, error) {
      getVideoLinks(videoUrl, success, error);
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin &&
        typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, YjizzParser);
      console.log('[yjizz] v2.0.0 зарегистрирован OK');
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _elapsed = 0;
    var _poll = setInterval(function () {
      _elapsed += 100;
      if (tryRegister() || _elapsed >= 10000) clearInterval(_poll);
    }, 100);
  }

})();
