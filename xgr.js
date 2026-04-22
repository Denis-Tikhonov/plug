// =============================================================
// xgr.js — Парсер rt.xgroovy.com для AdultJS
// Version  : 1.1.0
// Site     : https://rt.xgroovy.com  (RU-локаль xgroovy)
// Strategy : SSR, <source title="1080p|720p|480p|240p">
// Worker   : rt.xgroovy.com + i.xgroovy.com + xgroovy.com
//            должны быть в ALLOWED_TARGETS
// Cookie   : mature=1  (Age Gate)
// =============================================================
// Изменения:
//   [1.0.0] Начальная версия
//   [1.1.0] BUGFIX: total_pages порог снижен с 48 до 28
//           (xGroovy отдаёт 32 карточки на главной и 24-32
//           в категориях — порог 48 никогда не достигался,
//           пагинация обрывалась после первой страницы)
//   [1.1.0] BUGFIX: S3 fallback-URL в extractQualities
//           теперь проксируются через Worker перед возвратом
//           (прямой get_file URL с rt.xgroovy.com блокируется
//           hotlink-защитой при воспроизведении без Referer)
//   [1.1.0] BUGFIX: добавлены .jpg fallback-селекторы для постеров
//           (data-original, data-lazy-src, data-thumb)
//   [1.1.0] IMPROVE: увеличен лимит fallback ссылок до 10 в S3
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.1.0';
  var NAME    = 'xgr';
  var HOST    = 'https://rt.xgroovy.com';
  var TAG     = '[' + NAME + ' v' + VERSION + ']';

  // ============================================================
  // §1. КАТЕГОРИИ (73 шт.)
  // ============================================================
  var CATEGORIES = [
    { title: 'Минет',                    slug: 'blowjob'            },
    { title: 'Большие Попы',             slug: 'big-ass'            },
    { title: 'Большие Сиськи',           slug: 'big-tits'           },
    { title: 'Подростки (18-25)',         slug: 'teens'              },
    { title: 'Любительское',             slug: 'amateur'            },
    { title: 'ПОВ',                      slug: 'pov'                },
    { title: 'Сперма',                   slug: 'cumshot'            },
    { title: 'Азиатки',                  slug: 'asian'              },
    { title: 'Маленькие Сиськи',         slug: 'small-tits'         },
    { title: 'Межрасовый Секс',          slug: 'interracial'        },
    { title: 'Большие Члены',            slug: 'big-cock'           },
    { title: 'Анал',                     slug: 'anal'               },
    { title: 'Милфы',                    slug: 'milf'               },
    { title: 'Втроём',                   slug: 'threesome'          },
    { title: 'Семейные Фантазии',        slug: 'family'             },
    { title: 'Миниатюрные',              slug: 'petite'             },
    { title: 'Большой Чёрный Член',      slug: 'bbc'                },
    { title: 'Грубый Секс',              slug: 'rough'              },
    { title: 'Кримпай',                  slug: 'creampie'           },
    { title: 'Латинки',                  slug: 'latina'             },
    { title: 'Негритянки',               slug: 'ebony'              },
    { title: 'Лесбиянки',               slug: 'lesbians'           },
    { title: 'Сквирт',                   slug: 'squirt'             },
    { title: 'Измена',                   slug: 'cheating'           },
    { title: 'Реалити',                  slug: 'reality'            },
    { title: 'Оргазм',                   slug: 'orgasm'             },
    { title: 'Куколд',                   slug: 'cuckold'            },
    { title: 'На Публике',               slug: 'public'             },
    { title: 'Молодые (18/19)',           slug: 'young'              },
    { title: 'Чулки',                    slug: 'stockings'          },
    { title: 'Игрушки',                  slug: 'toys'               },
    { title: 'Униформа',                 slug: 'uniform'            },
    { title: 'Хентай',                   slug: 'hentai'             },
    { title: 'Соло',                     slug: 'solo'               },
    { title: 'Толстушки',                slug: 'bbw'                },
    { title: 'БДСМ',                     slug: 'bdsm'               },
    { title: 'Мамки',                    slug: 'mom'                },
    { title: 'Волосатые',                slug: 'hairy'              },
    { title: 'Хэнджоб',                  slug: 'handjob'            },
    { title: 'Офис',                     slug: 'office'             },
    { title: 'На Улице',                 slug: 'outdoor'            },
    { title: 'Красивые Девушки',         slug: 'beautiful-girl'     },
    { title: 'Бисексуалы',              slug: 'bisexual'           },
    { title: 'Кастинг',                  slug: 'casting'            },
    { title: 'Групповой Секс',           slug: 'groupsex'           },
    { title: 'Подборка',                 slug: 'compilation'        },
    { title: 'Косплей',                  slug: 'cosplay'            },
    { title: 'Эротика',                  slug: 'erotic'             },
    { title: 'Французское',              slug: 'french'             },
    { title: 'Японское',                 slug: 'japanese'           },
    { title: 'Зрелые',                   slug: 'mature'             },
    { title: 'Мультфильм',               slug: 'cartoon'            },
    { title: 'Школа (18+)',              slug: 'school'             },
    { title: 'Женская Доминация',        slug: 'femdom'             },
    { title: 'Первый Раз',               slug: 'first-time'         },
    { title: 'Немецкое',                 slug: 'german'             },
    { title: 'Массаж',                   slug: 'massage'            },
    { title: 'Старые - Молодые (18/19)', slug: 'old-young'          },
    { title: 'Китайское',                slug: 'chinese'            },
    { title: 'Сгенерировано ИИ',         slug: 'ai'                 },
    { title: 'Арабское',                 slug: 'arab'               },
    { title: 'Бразильское',              slug: 'brazilian'          },
    { title: 'Британское',               slug: 'british'            },
    { title: 'Знаменитости',             slug: 'celebrity'          },
    { title: 'Двойное Проникновение',    slug: 'double-penetration' },
    { title: 'Гэнгбэнг',                slug: 'gangbang'           },
    { title: 'Русское',                  slug: 'russian'            },
    { title: 'Буккаке',                  slug: 'bukkake'            },
    { title: 'Фистинг',                  slug: 'fisting'            },
    { title: 'Индийское',                slug: 'indian'             },
    { title: 'Итальянское',              slug: 'italian'            },
    { title: 'Винтаж',                   slug: 'vintage'            },
    { title: 'Вебкамера',                slug: 'webcam'             },
  ];

  // ============================================================
  // §2. ТРАНСПОРТ
  // ============================================================
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(success)
        .catch(error);
    }
  }

  // [1.1.0] Проксирование URL через Worker (для CDN-ссылок в qualities)
  function proxyUrl(url) {
    if (!url) return url;
    if (window.AdultPlugin && window.AdultPlugin.workerUrl) {
      var w = window.AdultPlugin.workerUrl;
      if (w.charAt(w.length - 1) !== '=') w = w + '=';
      // Не проксируем уже проксированные URL
      if (url.indexOf(w) === 0) return url;
      if (url.indexOf('http') === 0) return w + encodeURIComponent(url);
    }
    return url;
  }

  // ============================================================
  // §3. cleanUrl
  // ============================================================
  function cleanUrl(raw) {
    if (!raw) return '';
    try {
      var u = raw;
      u = u.replace(/\\\//g, '/').replace(/\\/g, '');
      if (u.indexOf('%') !== -1) { try { u = decodeURIComponent(u); } catch (e) {} }
      if (u.indexOf('//') === 0) u = 'https:' + u;
      if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
      if (u.length > 0 && u.indexOf('http') !== 0 && u.charAt(0) !== '/') u = HOST + '/' + u;
      return u;
    } catch (e) { return raw; }
  }

  // ============================================================
  // §4. extractQualities
  // Стратегия xgroovy:
  //   S1: DOMParser → source[src][title] внутри video#main_video
  //   S2: regex <source src="..." title="720p">  (оба порядка атрибутов)
  //   S3: fallback — все /get_file/...mp4 ссылки в HTML
  //       [1.1.0] URL из S3 ПРОКСИРУЮТСЯ через Worker
  // ============================================================
  function extractQualities(html) {
    var q = {};

    // S1 — DOMParser (самый надёжный)
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var containers = [
        doc.querySelector('video#main_video'),
        doc.querySelector('video'),
        doc,
      ];
      for (var ci = 0; ci < containers.length; ci++) {
        if (!containers[ci]) continue;
        var srcs = containers[ci].querySelectorAll('source[src]');
        for (var si = 0; si < srcs.length; si++) {
          var src = srcs[si].getAttribute('src') || '';
          if (!src || src.indexOf('/get_file/') === -1) continue;
          var label = srcs[si].getAttribute('title') ||
                      srcs[si].getAttribute('label') ||
                      srcs[si].getAttribute('size')  || '';
          if (label && !q[label]) q[label] = cleanUrl(src);
        }
        if (Object.keys(q).length) break;
      }
    } catch (e) {
      console.warn(TAG, 'S1 DOMParser error:', e.message || e);
    }

    // S2 — regex (оба порядка атрибутов)
    if (!Object.keys(q).length) {
      var re1 = /<source[^>]+src="([^"]+)"[^>]+title="([^"]+)"/gi;
      var re2 = /<source[^>]+title="([^"]+)"[^>]+src="([^"]+)"/gi;
      var m;
      while ((m = re1.exec(html)) !== null) {
        if (m[1].indexOf('/get_file/') !== -1 && !q[m[2]]) q[m[2]] = cleanUrl(m[1]);
      }
      if (!Object.keys(q).length) {
        while ((m = re2.exec(html)) !== null) {
          if (m[2].indexOf('/get_file/') !== -1 && !q[m[1]]) q[m[1]] = cleanUrl(m[2]);
        }
      }
    }

    // S3 — fallback: прямые get_file URL с качеством в имени файла
    // [1.1.0] BUGFIX: результат проксируется через Worker
    if (!Object.keys(q).length) {
      var gfRe = /(https?:\/\/[^"'\s<>]+\/get_file\/[^"'\s<>]+\.mp4[^"'\s<>]*)/gi;
      var gf, cnt = 0;
      // [1.1.0] лимит увеличен с 6 до 10
      while ((gf = gfRe.exec(html)) !== null && cnt < 10) {
        var u = cleanUrl(gf[1]);
        var qm = u.match(/_(\d+p?)\.mp4/i);
        var key;
        if (qm) {
          key = /^\d+$/.test(qm[1]) ? qm[1] + 'p' : qm[1];
        } else {
          key = 'HD' + (cnt || '');
        }
        if (!q[key]) {
          // [1.1.0] проксируем fallback URL через Worker
          q[key] = proxyUrl(u);
          cnt++;
        }
      }
    }

    return q;
  }

  // ============================================================
  // §5. ПАРСИНГ КАРТОЧЕК
  // Селектор: .item  (div.item/a.item с /videos/)
  // Заголовок: strong.title  или  a[title]
  // Постер:   img.thumb[src] / img[data-src] / img[data-original]
  //           [1.1.0] + data-lazy-src, data-thumb
  // ============================================================
  function parsePlaylist(html) {
    var results = [];
    var seen    = {};
    try {
      var doc   = new DOMParser().parseFromString(html, 'text/html');
      var items = doc.querySelectorAll('.item');

      if (!items || !items.length) {
        console.log(TAG, 'parsePlaylist → fallback: a[href*="/videos/"]');
        var links = doc.querySelectorAll('a[href*="/videos/"]');
        for (var j = 0; j < links.length; j++) {
          var href = cleanUrl(links[j].getAttribute('href') || '');
          if (!href || seen[href]) continue;
          seen[href] = true;
          var imgA  = links[j].querySelector('img');
          var picA  = imgA ? getPicture(imgA) : '';
          var nameA = (links[j].getAttribute('title') || links[j].textContent || '')
                        .replace(/\s+/g, ' ').trim();
          if (!nameA) nameA = slugToTitle(href);
          if (nameA) results.push(makeCard(nameA, href, picA, ''));
        }
        return results;
      }

      for (var i = 0; i < items.length; i++) {
        var card = parseCard(items[i]);
        if (card && !seen[card.video]) {
          seen[card.video] = true;
          results.push(card);
        }
      }
    } catch (e) {
      console.warn(TAG, 'parsePlaylist error:', e.message || e);
    }
    console.log(TAG, 'parsePlaylist → карточек:', results.length);
    return results;
  }

  // [1.1.0] Универсальное извлечение src постера из <img>
  // Учитывает все известные lazy-load атрибуты xgroovy
  function getPicture(imgEl) {
    if (!imgEl) return '';
    var pic = cleanUrl(
      imgEl.getAttribute('data-src')      ||
      imgEl.getAttribute('data-original') ||
      imgEl.getAttribute('data-lazy-src') ||
      imgEl.getAttribute('data-thumb')    ||
      imgEl.getAttribute('src')           || ''
    );
    // Отбрасываем spacer/blank
    if (pic && (pic.indexOf('spacer') !== -1 || pic.indexOf('blank') !== -1 || pic.length < 10)) {
      pic = '';
    }
    return pic;
  }

  function parseCard(el) {
    var href  = '';
    var tagLc = (el.tagName || '').toLowerCase();

    // Вариант A: сам элемент — <a href="/videos/...">
    if (tagLc === 'a') {
      var raw = cleanUrl(el.getAttribute('href') || '');
      if (raw && raw.indexOf('/videos/') !== -1) href = raw;
    }

    // Вариант B: ищем вложенный <a href="/videos/...">
    if (!href) {
      var inner = el.querySelector('a[href*="/videos/"]');
      if (inner) href = cleanUrl(inner.getAttribute('href') || '');
    }

    // Пропускаем не-видео элементы (/channels/, /pornstars/ и т.д.)
    if (!href || href.indexOf('/videos/') === -1) return null;

    // Постер — [1.1.0] через getPicture()
    var imgEl = el.querySelector('img.thumb') || el.querySelector('img');
    var pic   = getPicture(imgEl);

    // Заголовок
    var titleEl = el.querySelector('strong.title') || el.querySelector('.title');
    var name    = '';
    if (titleEl) name = (titleEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (!name)   name = (el.getAttribute('title') || '').trim();
    if (!name) {
      var aEl = el.querySelector('a[title]');
      if (aEl) name = (aEl.getAttribute('title') || '').trim();
    }
    if (!name) name = slugToTitle(href);
    if (!name) return null;

    // Длительность
    var durEl = el.querySelector('.time') || el.querySelector('.duration') || el.querySelector('[class*="time"]');
    var time  = durEl ? durEl.textContent.replace(/[^\d:]/g, '').trim() : '';

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
      preview:          null,
      time:             time || '',
      quality:          'HD',
      json:             true,
      source:           NAME,
    };
  }

  function slugToTitle(url) {
    if (!url) return '';
    var parts = url.replace(/\?.*/, '').replace(/\/+$/, '').split('/').filter(Boolean);
    var slug = parts[parts.length - 1] || '';
    if (/^\d+$/.test(slug) && parts.length > 1) slug = parts[parts.length - 2] || '';
    return slug.replace(/[-_]/g, ' ')
               .replace(/\b\w/g, function (l) { return l.toUpperCase(); })
               .trim();
  }

  // ============================================================
  // §6. URL BUILDER
  // Main:   https://rt.xgroovy.com/?page=N
  // Search: https://rt.xgroovy.com/search/?q=query&page=N
  // Cat:    https://rt.xgroovy.com/categories/{slug}/?page=N
  // ============================================================
  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    var u;
    if (type === 'search') {
      u = HOST + '/search/?q=' + encodeURIComponent(value);
      return page > 1 ? u + '&page=' + page : u;
    }
    if (type === 'cat') {
      u = HOST + '/categories/' + value + '/';
      return page > 1 ? u + '?page=' + page : u;
    }
    // main
    return page > 1 ? HOST + '/?page=' + page : HOST + '/';
  }

  // ============================================================
  // §7. МЕНЮ
  // ============================================================
  function buildMenu() {
    return [
      {
        title:        '🔍 Поиск',
        search_on:    true,
        playlist_url: NAME + '/search/',
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
  // §8. РОУТИНГ
  // ============================================================
  function routeView(url, page, success, error) {
    console.log(TAG, 'routeView →', url, 'page=' + page);

    var sm = url.match(/[?&]search=([^&]*)/);
    if (sm) {
      return loadPage(buildUrl('search', decodeURIComponent(sm[1]), page), page, success, error);
    }
    if (url.indexOf(NAME + '/cat/') === 0) {
      var cat = url.replace(NAME + '/cat/', '').split('?')[0];
      return loadPage(buildUrl('cat', cat, page), page, success, error);
    }
    if (url.indexOf(NAME + '/search/') === 0) {
      var rawQ = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      if (rawQ) return loadPage(buildUrl('search', rawQ, page), page, success, error);
    }
    loadPage(buildUrl('main', null, page), page, success, error);
  }

  function loadPage(fetchUrl, page, success, error) {
    console.log(TAG, 'loadPage →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      var results = parsePlaylist(html);
      if (!results.length) { error('Контент не найден'); return; }
      success({
        results:     results,
        collection:  true,
        // [1.1.0] BUGFIX: снижен порог с 48 до 28
        // xGroovy отдаёт 24-32 карточки на странице
        total_pages: results.length >= 28 ? page + 1 : page,
        menu:        buildMenu(),
      });
    }, error);
  }

  // ============================================================
  // §9. ПУБЛИЧНЫЙ API
  // ============================================================
  var XgrParser = {

    main: function (params, success, error) {
      routeView(NAME, 1, success, error);
    },

    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },

    search: function (params, success, error) {
      var q = (params.query || '').trim();
      var p = parseInt(params.page, 10) || 1;
      if (!q) { success({ title: '', results: [], collection: true, total_pages: 1 }); return; }
      httpGet(buildUrl('search', q, p), function (html) {
        var results = parsePlaylist(html);
        success({
          title:       'XGroovy: ' + q,
          results:     results,
          collection:  true,
          total_pages: results.length >= 28 ? p + 1 : p,
        });
      }, error);
    },

    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities() →', videoPageUrl);
      httpGet(videoPageUrl, function (html) {
        if (!html || html.length < 500) { error('Страница видео недоступна'); return; }
        var found = extractQualities(html);
        var keys  = Object.keys(found);
        console.log(TAG, 'qualities() найдено:', keys.length, JSON.stringify(keys));
        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.warn(TAG, 'html.length =', html.length);
          console.warn(TAG, '<source> cnt =', (html.match(/<source/gi) || []).length);
          console.warn(TAG, 'get_file cnt =', (html.match(/get_file/gi) || []).length);
          console.warn(TAG, '.mp4 cnt =',     (html.match(/\.mp4/gi) || []).length);
          error('Видео не найдено — проверьте Worker-лог');
        }
      }, error);
    },
  };

  // ============================================================
  // §10. РЕГИСТРАЦИЯ
  // ============================================================
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, XgrParser);
      console.log(TAG, 'зарегистрирован');
      return true;
    }
    return false;
  }
  if (!tryRegister()) {
    var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }

})();
