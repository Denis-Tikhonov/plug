// =============================================================
// yjizz.js — Парсер YouJizz для AdultJS / AdultPlugin (Lampa)
// Version  : 2.1.0
// Changes  :
//   [2.1.0] Прямой fetch для qualities (обход Worker)
//           Улучшен парсинг dataEncodings + fallback
//           Более надёжные постеры
//           Cookie mature=1 + нормальный UA
// =============================================================

(function () {
  'use strict';

  var NAME = 'yjizz';
  var HOST = 'https://www.youjizz.com';
  var TAG  = '[yjizz v2.1.0]';

  var SORTS = [
    { title: 'Популярное',  val: 'most-popular'    },
    { title: 'Новинки',     val: 'newest-clips'    },
    { title: 'Топ недели',  val: 'top-rated-week'  },
    { title: 'Топ месяца',  val: 'top-rated-month' },
    { title: 'Лучшее',      val: 'top-rated'       },
    { title: 'В тренде',    val: 'trending'        },
    { title: 'HD',          val: 'highdefinition'  },
  ];

  var CATS = [
    { title: 'Мачеха',         val: 'stepmom'        },
    { title: 'Японки',         val: 'japanese'       },
    { title: 'MILF',           val: 'milf'           },
    { title: 'Анал',           val: 'anal'           },
    { title: 'Любительское',   val: 'amateur'        },
    { title: 'Кремпай',        val: 'creampie'       },
    { title: 'Большие сиськи', val: 'big-tits'       },
    { title: 'Threesome',      val: 'threesome'      },
    { title: 'Сводная сестра', val: 'step-sister'    },
    { title: 'POV',            val: 'pov'            },
    { title: 'Латинки',        val: 'latina'         },
    { title: 'Азиатки',        val: 'asian'          },
    { title: 'Молодые',        val: 'teen'           },
    { title: 'Хентай',         val: 'hentai'         },
    { title: 'Межрасовый',     val: 'interracial'    },
    { title: 'Зрелые',         val: 'mature'         },
    { title: 'Gangbang',       val: 'gangbang'       },
    { title: 'Ebony',          val: 'ebony'          },
    { title: 'Массаж',         val: 'massage'        },
    { title: 'Компиляция',     val: 'compilation'    },
    { title: 'Blacked',        val: 'blacked'        },
    { title: 'Сестра',         val: 'sister'         },
    { title: 'Taboo',          val: 'taboo'          },
    { title: 'BBC',            val: 'bbc'            },
    { title: 'Big Ass',        val: 'big-ass'        },
    { title: 'Блондинки',      val: 'blonde'         },
    { title: 'Blowjob',        val: 'blowjob'        },
    { title: 'Папочка',        val: 'daddy'          },
    { title: 'Семья',          val: 'family'         },
    { title: 'Японские жёны',  val: 'japanese-wife'  },
    { title: 'Stepdaughter',   val: 'stepdaughter'   },
    { title: 'Casting',        val: 'casting'        },
    { title: 'Pinay',          val: 'pinay'          },
    { title: 'Stepsister',     val: 'stepsister'     },
    { title: 'Czech Streets',  val: 'czech-streets'  },
    { title: 'Lana Rhoades',   val: 'lana-rhoades'   },
    { title: 'Riley Reid',     val: 'riley-reid'     },
    { title: 'Cory Chase',     val: 'cory-chase'     },
    { title: 'Brandi Love',    val: 'brandi-love'    },
  ];

  // ----------------------------------------------------------
  // HTTP
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      directGet(url, success, error);
    }
  }

  // Прямой запрос (для qualities) — обходит проблемы Worker
  function directGet(url, success, error) {
    if (typeof fetch === 'undefined') {
      httpGet(url, success, error);
      return;
    }
    console.log(TAG, 'directGet →', url);
    fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': 'mature=1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': HOST + '/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(success)
      .catch(function (e) {
        console.warn(TAG, 'direct failed, fallback Worker:', e.message || e);
        if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
          window.AdultPlugin.networkRequest(url, success, error);
        } else {
          error(e);
        }
      });
  }

  function cleanUrl(u) {
    if (!u) return '';
    u = u.replace(/\\\//g, '/').replace(/\\/g, '');
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL
  // ----------------------------------------------------------
  function buildCatalogUrl(sort, page) {
    return HOST + '/' + (sort || SORTS[0].val) + '/' + (page || 1) + '.html';
  }

  function buildCatUrl(cat, page) {
    return HOST + '/categories/' + cat + '-' + (page || 1) + '.html';
  }

  function buildSearchUrl(query, page) {
    var slug = query.trim().toLowerCase().replace(/\s+/g, '-');
    return HOST + '/search/' + slug + '-' + (page || 1) + '.html';
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var cards = [];
    var items = doc.querySelectorAll('.video-thumb, .video-item');
    if (!items.length) return [];

    for (var i = 0; i < items.length; i++) {
      var card = _parseCard(items[i]);
      if (card) cards.push(card);
    }
    console.log(TAG, 'parseCards →', cards.length);
    return cards;
  }

  function _parseCard(el) {
    var aEl = el.querySelector('a.frame.video') ||
              el.querySelector('a.frame') ||
              el.querySelector('a[href*="/videos/"]');
    if (!aEl) return null;

    var href = aEl.getAttribute('href') || '';
    if (!href) return null;
    href = cleanUrl(href);

    var preview = aEl.getAttribute('data-clip') || null;
    if (preview) preview = cleanUrl(preview);

    var imgEl = el.querySelector('img');
    var picture = '';
    if (imgEl) {
      picture = imgEl.getAttribute('data-original') ||
                imgEl.getAttribute('data-src') ||
                imgEl.getAttribute('data-lazy-src') ||
                imgEl.getAttribute('src') || '';
    }
    picture = cleanUrl(picture);
    if (picture.indexOf('spacer') !== -1 || picture.length < 15) picture = '';

    var titleEl = el.querySelector('.video-title a, .video-title, a.agego-content-title');
    var name = '';
    if (titleEl) name = (titleEl.textContent || titleEl.getAttribute('title') || '').trim();
    if (!name) name = (aEl.getAttribute('title') || '').trim();
    if (!name) return null;

    var durEl = el.querySelector('span.time, .time');
    var time  = durEl ? durEl.textContent.replace(/[^\d:]/g, '').trim() : '';

    var quality = el.querySelector('span.i-hd, [class*="i-hd"]') ? 'HD' : '';

    return {
      name:             name,
      video:            href,
      picture:          picture,
      img:              picture,
      poster:           picture,
      background_image: picture,
      preview:          preview,
      time:             time,
      quality:          quality,
      json:             true,
      related:          true,
      source:           NAME,
    };
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ ВИДЕО
  // ----------------------------------------------------------
  function getVideoLinks(videoPageUrl, success, error) {
    // Всегда пробуем прямой запрос для страницы видео
    directGet(videoPageUrl, function (html) {
      var qualitys = {};

      // Метод 1: dataEncodings (основной)
      try {
        var idx = html.indexOf('dataEncodings');
        if (idx !== -1) {
          var arrStart = html.indexOf('[', idx);
          if (arrStart !== -1) {
            var depth = 0, arrEnd = -1;
            for (var ci = arrStart; ci < Math.min(html.length, arrStart + 50000); ci++) {
              if (html[ci] === '[') depth++;
              else if (html[ci] === ']') {
                depth--;
                if (depth === 0) { arrEnd = ci; break; }
              }
            }
            if (arrEnd !== -1) {
              var dataEnc = JSON.parse(html.substring(arrStart, arrEnd + 1));
              dataEnc.forEach(function (enc) {
                if (!enc.filename) return;
                var u = cleanUrl(enc.filename);
                var key = (String(enc.quality || enc.name || 'auto').toLowerCase() === 'auto')
                  ? 'auto'
                  : (String(enc.quality || enc.name).replace(/p$/i, '') + 'p');
                // Предпочитаем mp4, но берём и m3u8
                if (!qualitys[key] || u.indexOf('.mp4') !== -1) {
                  qualitys[key] = u;
                }
              });
            }
          }
        }
      } catch (e) {
        console.warn(TAG, 'dataEncodings error:', e.message || e);
      }

      // Метод 2: encodings = [...] (как в yt-dlp)
      if (!Object.keys(qualitys).length) {
        try {
          var m = html.match(/[Ee]ncodings\s*=\s*(\[[\s\S]*?\]);/);
          if (m) {
            var encs = JSON.parse(m[1]);
            encs.forEach(function (enc) {
              if (!enc.filename) return;
              var u = cleanUrl(enc.filename);
              var key = String(enc.quality || enc.name || 'HD').replace(/p$/i, '') + 'p';
              qualitys[key] = u;
            });
          }
        } catch (e) {}
      }

      // Метод 3: regex на mp4 / m3u8
      if (!Object.keys(qualitys).length) {
        var re = /((?:https?:)?\/\/(?:cdne-mobile|abre-videos|hlse-videos)\.youjizz\.com\/[^"'\s]+\.(?:mp4|m3u8)[^"'\s]*)/gi;
        var mm, cnt = 0;
        while ((mm = re.exec(html)) !== null && cnt < 8) {
          var u = cleanUrl(mm[1]);
          if (u.indexOf('preview') !== -1) continue;
          var q = u.match(/-(\d{3,4})-/);
          var key = q ? q[1] + 'p' : ('HD' + (cnt || ''));
          if (!qualitys[key]) {
            qualitys[key] = u;
            cnt++;
          }
        }
      }

      if (!Object.keys(qualitys).length) {
        error('YouJizz: видео не найдено на странице');
        return;
      }

      console.log(TAG, 'qualities:', Object.keys(qualitys));
      success(qualitys);

    }, error);
  }

  // ----------------------------------------------------------
  // МЕНЮ + РОУТЕР (без изменений по логике)
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      {
        title: '🗂 Сортировка',
        playlist_url: 'submenu',
        submenu: SORTS.map(function (s) {
          return { title: s.title, playlist_url: NAME + '/sort/' + s.val };
        }),
      },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATS.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.val };
        }),
      },
    ];
  }

  function parseSearchParam(url) {
    var m = url.match(/[?&]search=([^&]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function routeLoad(url, page, success, error) {
    console.log(TAG, 'routeLoad →', url, 'page=' + page);

    var PREFIX_SORT = NAME + '/sort/';
    var PREFIX_CAT  = NAME + '/cat/';
    var PREFIX_SRCH = NAME + '/search/';

    var sq = parseSearchParam(url);
    if (sq !== null) {
      fetchPage(sq ? buildSearchUrl(sq, page) : buildCatalogUrl(SORTS[0].val, page), page, success, error);
      return;
    }

    if (url.indexOf(PREFIX_SORT) === 0) {
      var sort = url.replace(PREFIX_SORT, '').split('?')[0].trim();
      fetchPage(buildCatalogUrl(sort || SORTS[0].val, page), page, success, error);
      return;
    }

    if (url.indexOf(PREFIX_CAT) === 0) {
      var cat = url.replace(PREFIX_CAT, '').split('?')[0].trim();
      if (cat) {
        fetchPage(buildCatUrl(cat, page), page, success, error);
        return;
      }
    }

    if (url.indexOf(PREFIX_SRCH) === 0) {
      var rawQ = url.replace(PREFIX_SRCH, '').split('?')[0].trim();
      if (rawQ) {
        fetchPage(buildSearchUrl(decodeURIComponent(rawQ), page), page, success, error);
        return;
      }
    }

    fetchPage(buildCatalogUrl(SORTS[0].val, page), page, success, error);
  }

  function fetchPage(loadUrl, page, success, error) {
    console.log(TAG, 'fetchPage →', loadUrl);
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
  // ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ----------------------------------------------------------
  var YjizzParser = {
    main: function (params, success, error) {
      fetchPage(buildCatalogUrl(SORTS[0].val, 1), 1, success, error);
    },
    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      routeLoad(params.url || NAME, page, success, error);
    },
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
    qualities: function (videoUrl, success, error) {
      getVideoLinks(videoUrl, success, error);
    },
  };

  // Регистрация
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, YjizzParser);
      console.log(TAG, 'зарегистрирован OK');
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
