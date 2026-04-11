// =============================================================
// briz.js — Парсер PornoBriz для AdultJS / AdultPlugin (Lampa)
// Version  : 2.0.1
// Changed  :
//   [2.0.0] Полная перезапись на основе анализа pornobriz.com
//   [2.0.1] BUGFIX: parseUrl('briz') → главная (не /briz/ URL)
//   [2.0.1] BUGFIX: parseUrl читает ?search= и ?q= параметры
//   [2.0.1] BUGFIX: неизвестный путь → главная (не 404)
//   [2.0.1] BUGFIX: парсинг карточек — основная стратегия a[href*=/video/]
//           (div.logo = лого сайта, а не карточки видео)
//   [2.0.1] Дамп div-классов в лог если карточки не найдены
//
//   СТРУКТУРА САЙТА (из анализа):
//     Карточки  : div.logo (НЕ div.thumb_main как было раньше)
//     Постер    : img[src] — прямой src, без data-lazy
//     Thumbnail : https://pornobriz.com/content/screen/77/XXXXX_11.jpg
//     Поиск     : /?q={query}  (НЕ /search/{query}/page1/)
//     Категории : /{slug}/  затем &page={N}
//     Пагинация : &page={N} добавляется к любому URL
//     Сортировка: НА САЙТЕ НЕТ (убрана из меню)
//     Видео MP4 : /preview/{slug}.mp4 — по slug из URL видео
//
//   ИСПРАВЛЕНИЯ:
//     - XPath исправлен: div.logo вместо div.thumb_main
//     - Поиск: URL /?q={query}&page={N}
//     - Категории: /{slug}/?page={N}
//     - Пагинация: параметр &page=N
//     - Видео: прямая ссылка по паттерну /preview/{slug}.mp4
//     - Постеры: img[src] без lazy-атрибутов (они не нужны)
//     - Все 70 категорий из анализа сайта
//     - Script error при закладке: защита от не-массива в Storage
//     - Удалена SORTS (сортировки нет на сайте)
// =============================================================

(function () {
  'use strict';

  var HOST      = 'https://pornobriz.com';
  var NAME      = 'briz';
  var TAG       = '[briz]';
  var NOTY_TIME = 3000;

  // ----------------------------------------------------------
  // URL Cloudflare Worker
  // Приоритет: AdultPlugin.workerUrl → константа
  // ----------------------------------------------------------
  var WORKER_DEFAULT = 'https://zonaproxy.777b737.workers.dev/?url=';

  function getWorkerUrl() {
    var url = (window.AdultPlugin && window.AdultPlugin.workerUrl)
      ? window.AdultPlugin.workerUrl
      : WORKER_DEFAULT;
    if (url && url.charAt(url.length - 1) !== '=') url = url + '=';
    return url;
  }

  // ----------------------------------------------------------
  // ПОЛИФИЛЛЫ
  // ----------------------------------------------------------
  if (!Array.prototype.find) {
    Array.prototype.find = function (fn) {
      for (var i = 0; i < this.length; i++) {
        if (fn(this[i], i, this)) return this[i];
      }
    };
  }
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (s, p) {
      return this.indexOf(s, p || 0) === (p || 0);
    };
  }

  function forEachNode(list, fn) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) fn(list[i], i);
  }

  function arrayFind(arr, fn) {
    if (!arr) return undefined;
    for (var i = 0; i < arr.length; i++) if (fn(arr[i], i)) return arr[i];
  }

  function safeParams(p) {
    if (!p) return '(null)';
    try { return JSON.stringify({ url: p.url||'', page: p.page||'', query: p.query||'' }); }
    catch(e) { return '(err)'; }
  }

  // ----------------------------------------------------------
  // ЛОГИРОВАНИЕ
  // ----------------------------------------------------------
  function log(m, d)  { console.log(TAG,   m, d !== undefined ? d : ''); }
  function warn(m, d) { console.warn(TAG,  m, d !== undefined ? d : ''); }
  function err(m, d)  { console.error(TAG, m, d !== undefined ? d : ''); }

  function notyErr(msg) {
    try { Lampa.Noty.show(TAG + ' ⛔ ' + msg, { time: NOTY_TIME, style: 'error' }); } catch(e) {}
  }
  function notyOk(msg) {
    try { Lampa.Noty.show(TAG + ' ✅ ' + msg, { time: NOTY_TIME }); } catch(e) {}
  }

  // ----------------------------------------------------------
  // СЕТЕВОЙ СЛОЙ
  // Приоритет: AdultPlugin.networkRequest → native+Worker → Reguest → fetch
  // ----------------------------------------------------------

  function _native(url, ok, fail) {
    if (!Lampa.Network || typeof Lampa.Network.native !== 'function') {
      fail('no_native'); return;
    }
    var workerUrl = getWorkerUrl();
    var path = workerUrl + encodeURIComponent(url);
    var done = false;

    var tid = setTimeout(function () {
      if (done) return; done = true;
      warn('native timeout 9с');
      fail('timeout');
    }, 9000);

    try {
      Lampa.Network.native(path,
        function (r) {
          if (done) return; done = true; clearTimeout(tid);
          var t = (typeof r === 'string') ? r : JSON.stringify(r);
          if (t && t.indexOf('"status":403') !== -1) { fail('403'); return; }
          if (t && t.length > 50) ok(t); else fail('empty');
        },
        function (e) {
          if (done) return; done = true; clearTimeout(tid);
          var msg = (e && e.message) ? e.message : String(e||'');
          var st  = (e && e.status)  ? e.status  : 0;
          if (st === 403 || msg.indexOf('403') !== -1) { fail('403'); return; }
          fail(msg || 'native_err');
        },
        false, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
      );
    } catch(ex) {
      if (done) return; done = true; clearTimeout(tid);
      fail(ex.message);
    }
  }

  function _reguest(url, ok, fail) {
    try {
      new Lampa.Reguest().silent(url,
        function (d) {
          var t = (typeof d === 'string') ? d : '';
          if (t.length > 50) ok(t); else fail('empty');
        },
        function (e) { fail(e || 'req_err'); },
        false, { dataType: 'text', timeout: 10000 }
      );
    } catch(ex) { fail(ex.message); }
  }

  function _fetch(url, ok, fail) {
    if (typeof fetch === 'undefined') { fail('no_fetch'); return; }
    fetch(url, { method: 'GET' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(ok)
      .catch(function (e) { fail(e.message || String(e)); });
  }

  function httpGet(url, ok, fail) {
    log('httpGet →', url);

    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, ok, fail, { type: 'html' });
      return;
    }

    _native(url, ok, function (e1) {
      log('native fail:', e1);
      _reguest(url, ok, function (e2) {
        log('reguest fail:', e2);
        _fetch(url, ok, function (e3) {
          err('ALL FAIL | native=' + e1 + ' req=' + e2 + ' fetch=' + e3);
          notyErr('Сайт недоступен');
          fail('all_failed');
        });
      });
    });
  }

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL
  //
  // Из анализа сайта:
  //   Главная      : https://pornobriz.com/
  //   Категория    : https://pornobriz.com/{slug}/
  //   Поиск        : https://pornobriz.com/?q={query}
  //   Пагинация    : добавляем &page={N} к любому URL
  //
  // Сортировки на сайте НЕТ (sortingOptions: 0)
  // ----------------------------------------------------------

  // [2.0.0] Полный список 70 категорий из анализа сайта
  var CATS = [
    { title: 'Азиатки',              val: 'asian'              },
    { title: 'Анальный секс',        val: 'anal'               },
    { title: 'БДСМ',                 val: 'bdsm'               },
    { title: 'Блондинки',            val: 'blonde'             },
    { title: 'Большая жопа',         val: 'big_ass'            },
    { title: 'Большие сиськи',       val: 'big_tits'           },
    { title: 'Большой член',         val: 'big_dick'           },
    { title: 'Бритая киска',         val: 'shaved'             },
    { title: 'Брюнетки',             val: 'brunette'           },
    { title: 'В одежде',             val: 'clothes'            },
    { title: 'Волосатые киски',      val: 'hairy'              },
    { title: 'Глотают сперму',       val: 'swallow'            },
    { title: 'Глубокая глотка',      val: 'deepthroat'         },
    { title: 'Групповой секс',       val: 'group'              },
    { title: 'Двойное проникновение',val: 'double_penetration' },
    { title: 'Длинноволосые',        val: 'long_hair'          },
    { title: 'Дрочат',               val: 'wanking'            },
    { title: 'Жесткий секс',         val: 'hardcore'           },
    { title: 'ЖМЖ порно',            val: 'ffm'                },
    { title: 'Игрушки',              val: 'toys'               },
    { title: 'Казашки',              val: 'kazakh'             },
    { title: 'Камшот',               val: 'cumshot'            },
    { title: 'Кончают в рот',        val: 'cum_in_mouth'       },
    { title: 'Красивая задница',     val: 'perfect_ass'        },
    { title: 'Красивое белье',       val: 'lingerie'           },
    { title: 'Красивые девушки',     val: 'beautiful'          },
    { title: 'Красивые сиськи',      val: 'beautiful_tits'     },
    { title: 'Крупным планом',       val: 'close_up'           },
    { title: 'Кунилингус',           val: 'pussy_licking'      },
    { title: 'Лесбиянки',            val: 'lesbian'            },
    { title: 'Любительское',         val: 'amateur'            },
    { title: 'Маленькие девушки',    val: 'petite'             },
    { title: 'Маленькие сиськи',     val: 'small_tits'         },
    { title: 'Мамочки',              val: 'milf'               },
    { title: 'Мастурбация',          val: 'masturbation'       },
    { title: 'Межрасовое',           val: 'interracial'        },
    { title: 'МЖМ порно',            val: 'mfm'                },
    { title: 'Милашки',              val: 'cute'               },
    { title: 'Минет',                val: 'blowjob'            },
    { title: 'Молодые',              val: 'seks-molodye'       },
    { title: 'Мулатки',              val: 'mulatto'            },
    { title: 'Накачанные девушки',   val: 'sporty'             },
    { title: 'Оральный секс',        val: 'oral'               },
    { title: 'Оргазм',               val: 'orgasm'             },
    { title: 'Офис',                 val: 'office'             },
    { title: 'Пикап',                val: 'pickup'             },
    { title: 'Порно в чулках',       val: 'stockings'          },
    { title: 'Порно со зрелыми',     val: 'mature'             },
    { title: 'Публичный секс',       val: 'public'             },
    { title: 'Рыжие',                val: 'redhead'            },
    { title: 'Русское порно',        val: 'russian'            },
    { title: 'Секс в машине',        val: 'car_sex'            },
    { title: 'Секс на природе',      val: 'outdoor'            },
    { title: 'Сквирт',               val: 'squirt'             },
    { title: 'Смазливые',            val: 'pretty'             },
    { title: 'Соло девушка',         val: 'solo_girl'          },
    { title: 'Сперма в жопе',        val: 'creampie'           },
    { title: 'Сперма на груди',      val: 'cum_on_tits'        },
    { title: 'Сперма на лице',       val: 'facial'             },
    { title: 'Страпон',              val: 'strap-on'           },
    { title: 'Стриптиз',             val: 'striptease'         },
    { title: 'Темноволосые',         val: 'black-haired'       },
    { title: 'Фетиш',                val: 'fetish'             },
    { title: 'Фингеринг',            val: 'fingering'          },
    { title: 'Фистинг',              val: 'fisting'            },
    { title: 'Худые девушки',        val: 'skinny'             },
  ];

  // Построить URL для запроса
  // page=1 → без параметра, page>1 → добавляем &page=N
  function buildUrl(cat, search, page) {
    page = parseInt(page, 10) || 1;
    var base, sep;

    if (search) {
      // Поиск: /?q={query}
      base = HOST + '/?q=' + encodeURIComponent(search);
      sep  = '&';
    } else if (cat) {
      // Категория: /{slug}/
      base = HOST + '/' + cat + '/';
      sep  = '?';
    } else {
      // Главная
      base = HOST + '/';
      sep  = '?';
    }

    if (page > 1) base = base + sep + 'page=' + page;
    log('buildUrl →', base);
    return base;
  }

  // Определить cat/search из URL
  // [2.0.1] BUGFIX:
  //   - если url = 'briz' (имя парсера из menu.json) — возвращаем пустое (главная)
  //   - читаем и ?search= и ?q= параметры
  //   - если clean не совпадает ни с одной CATS — главная, не несуществующая категория
  function parseUrl(url) {
    var cat = '', search = '';
    var s = url || '';

    // Если url — просто имя парсера без '/' и без HOST → главная страница
    if (s.indexOf('/') === -1 && s.indexOf('http') === -1) {
      log('parseUrl → имя парсера, главная');
      return { cat: '', search: '' };
    }

    // Поисковые параметры: ?q=... или ?search=...
    var qMatch = s.match(/[?&](?:q|search)=([^&]+)/);
    if (qMatch) {
      search = decodeURIComponent(qMatch[1] || '');
      log('parseUrl → search=' + search);
      return { cat: '', search: search };
    }

    // Путь категории: убираем HOST, query, слэши
    var clean = s.replace(HOST, '').split('?')[0].replace(/^\//, '').replace(/\/$/, '');
    if (clean) {
      var catObj = arrayFind(CATS, function (c) { return c.val === clean; });
      if (catObj) {
        cat = catObj.val;
      } else {
        // Неизвестный путь — не создаём несуществующий URL, грузим главную
        log('parseUrl → неизвестный путь "' + clean + '", грузим главную');
      }
    }

    log('parseUrl → cat=' + cat + ' search=' + search);
    return { cat: cat, search: search };
  }

  // Построить меню фильтра
  function buildMenu(url) {
    var state = parseUrl(url || '');

    // Активная категория
    var activeCat = arrayFind(CATS, function (c) { return c.val === state.cat; });

    // Подменю категорий
    var catSubmenu = CATS.map(function (c) {
      return { title: c.title, playlist_url: HOST + '/' + c.val + '/' };
    });

    return [
      { title: 'Поиск',    playlist_url: HOST, search_on: true },
      {
        title:   'Категория: ' + (activeCat ? activeCat.title : 'Все'),
        submenu: catSubmenu,
        // [1.5.0] НЕТ playlist_url — только submenu, иначе AdultJS пытается загрузить 'submenu'
      },
    ];
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА
  //
  // Реальная структура pornobriz.com (из анализа):
  //   cardXPath : //div[contains(@class,"logo")]
  //   title     : img[alt] внутри карточки
  //   link      : a[href] внутри карточки с /video/ в пути
  //   thumbnail : img[src] — прямой src
  //
  // Пример карточки из sampleCards:
  //   title     : "Подготовка ко сну включает в себя секс"
  //   link      : /video/podgotovka_ko_snu_vklyuchaet_v_sebya_seks/
  //   thumbnail : /content/screen/77/47693_11.jpg
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    if (!html || html.length < 100) {
      warn('parsePlaylist → html пустой');
      return [];
    }
    log('parsePlaylist → длина:', html.length);

    var doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
    catch(e) { err('DOMParser:', e.message); return []; }

    var cards = [];

    // --- Стратегия 1: a[href*="/video/"] — основная для pornobriz ---
    // Реальные карточки видео содержат ссылку /video/{slug}/
    // с постером /content/screen/... в img[src]
    try {
      var videoLinks = doc.querySelectorAll('a[href*="/video/"]');
      log('parsePlaylist → a[href*=/video/] найдено:', videoLinks.length);

      forEachNode(videoLinks, function (a) {
        try {
          var href = a.getAttribute('href') || '';
          if (!href) return;
          if (href.indexOf('http') !== 0) href = HOST + href;

          // Постер — img внутри ссылки или в родительском блоке
          var imgEl = a.querySelector('img') ||
                      (a.parentNode ? a.parentNode.querySelector('img') : null);

          var picture = '';
          if (imgEl) {
            picture = imgEl.getAttribute('src') || '';
            // Пропускаем системные картинки
            if (picture.indexOf('/img/logo') !== -1 ||
                picture.indexOf('/img/icon') !== -1 ||
                picture === HOST + '/img/logo.png') {
              picture = '';
            }
          }

          // Название: alt картинки → title ссылки → текст ссылки
          var name = (imgEl ? (imgEl.getAttribute('alt') || '') : '') ||
                     (a.getAttribute('title') || '') ||
                     (a.textContent || '').trim().substring(0, 100);
          if (!name || name.length < 3) return;

          // Длительность — ищем рядом с ссылкой
          var parent  = a.parentNode || a;
          var durEl   = parent.querySelector('.duration,.time,.dur,[class*="time"],[class*="dur"]');
          var time    = durEl ? (durEl.textContent || '').trim() : '';

          // Превью и mp4 по паттерну slug
          var preview = _previewFromSlug(href);

          // Не дублируем карточки с тем же href
          var alreadyIn = false;
          for (var ci = 0; ci < cards.length; ci++) {
            if (cards[ci].video === href) { alreadyIn = true; break; }
          }
          if (alreadyIn) return;

          cards.push({
            name:    name,
            video:   href,
            picture: picture,
            preview: preview,
            time:    time,
            quality: 'HD',
            json:    false,
            source:  NAME,
          });
        } catch(ex) { warn('_card ex:', ex.message); }
      });
      log('parsePlaylist → стратегия 1 карточек:', cards.length);
    } catch(e) { warn('стратегия 1:', e.message); }

    // --- Стратегия 2: XPath div.logo (с фильтром — только те что содержат /video/) ---
    if (!cards.length) {
      try {
        var nodes = doc.evaluate(
          "//div[contains(@class,'logo') and .//a[contains(@href,'/video/')]]",
          doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
        );
        log('parsePlaylist → XPath div.logo[video] найдено:', nodes.snapshotLength);
        for (var i = 0; i < nodes.snapshotLength; i++) {
          var c = _card(nodes.snapshotItem(i));
          if (c) cards.push(c);
        }
      } catch(e) { warn('XPath:', e.message); }
    }

    // --- Дамп для отладки если карточек нет ---
    if (!cards.length) {
      warn('parsePlaylist → карточки не найдены');
      if (doc.body) {
        warn('body[0:500]:', (doc.body.innerHTML || '').substring(0, 500));
        // Дамп всех div с классами для диагностики
        var allDivs = doc.querySelectorAll('div[class]');
        var classSet = {};
        forEachNode(allDivs, function (d) {
          var cls = (d.className || '').split(' ')[0];
          if (cls) classSet[cls] = (classSet[cls] || 0) + 1;
        });
        warn('div классы (топ-10):', JSON.stringify(
          Object.keys(classSet).sort(function(a,b){ return classSet[b]-classSet[a]; }).slice(0,10)
        ));
        warn('a[href*=/video/] найдено:', doc.querySelectorAll('a[href*="/video/"]').length);
        warn('img[src*=/content/] найдено:', doc.querySelectorAll('img[src*="/content/"]').length);
      }
    } else {
      log('parsePlaylist → ИТОГО:', cards.length);
      notyOk('Найдено ' + cards.length + ' видео');
    }
    return cards;
  }

  // Извлечь одну карточку из div.logo
  function _card(el) {
    if (!el) return null;
    try {
      // Ссылка — ищем a с /video/ в href
      var aEl = el.querySelector('a[href*="/video/"]') || el.querySelector('a[href]');
      if (!aEl) return null;

      var href = aEl.getAttribute('href') || '';
      if (!href) return null;
      if (href.indexOf('http') !== 0) href = HOST + href;

      // Название — alt картинки приоритетнее
      var imgEl = el.querySelector('img');
      var name  = (imgEl ? imgEl.getAttribute('alt') : '') ||
                  aEl.getAttribute('title')               ||
                  (aEl.textContent || '').trim().substring(0, 100);
      if (!name || name.length < 3) return null;

      // Постер — прямой src (на pornobriz нет lazy-атрибутов)
      var picture = imgEl ? (imgEl.getAttribute('src') || '') : '';
      // Пропускаем лого и системные картинки
      if (picture && (picture.indexOf('/img/logo') !== -1 || picture.indexOf('/img/icon') !== -1)) {
        picture = '';
      }

      // Длительность
      var durEl = el.querySelector('.duration, .time, .dur, [class*="time"], [class*="dur"]');
      var time  = durEl ? (durEl.textContent || '').trim() : '';

      // Превью по паттерну из URL видео
      var preview = _previewFromSlug(href);

      return {
        name:    name,
        video:   href,
        picture: picture,
        preview: preview,
        time:    time,
        quality: 'HD',
        // [2.0.0] json:false — URL видео прямой MP4 по паттерну,
        // qualitys() вызывается только при json:true
        json:    false,
        source:  NAME,
      };
    } catch(e) {
      warn('_card исключение:', e.message);
      return null;
    }
  }

  // ----------------------------------------------------------
  // [2.0.0] Превью и прямой MP4 по паттерну
  //
  // Из анализа сайта:
  //   MP4 URL : https://pornobriz.com/preview/{slug}.mp4
  //   slug    : последняя часть пути /video/{slug}/
  //
  // Пример:
  //   video URL : /video/podgotovka_ko_snu_vklyuchaet_v_sebya_seks/
  //   mp4 URL   : /preview/podgotovka_ko_snu_vklyuchaet_v_sebya_seks.mp4
  // ----------------------------------------------------------
  function _slugFromUrl(videoUrl) {
    var m = (videoUrl || '').match(/\/video\/([^\/]+)\/?$/);
    return m ? m[1] : '';
  }

  function _previewFromSlug(videoUrl) {
    var slug = _slugFromUrl(videoUrl);
    return slug ? HOST + '/preview/' + slug + '.mp4' : null;
  }

  function _mp4FromSlug(videoUrl) {
    var slug = _slugFromUrl(videoUrl);
    return slug ? HOST + '/preview/' + slug + '.mp4' : '';
  }

  // ----------------------------------------------------------
  // ПОЛУЧЕНИЕ ПРЯМЫХ ССЫЛОК (qualitys)
  //
  // На pornobriz.com MP4 берётся по паттерну из URL.
  // Если паттерн даст результат — возвращаем сразу без запроса.
  // Иначе — скачиваем страницу и ищем src/mp4 в HTML.
  // ----------------------------------------------------------
  function getStreamLinks(videoUrl, ok, fail) {
    log('qualitys →', videoUrl);

    // Быстрый путь: паттерн /preview/{slug}.mp4
    var direct = _mp4FromSlug(videoUrl);
    if (direct) {
      log('qualitys → прямой MP4 по паттерну:', direct);
      ok({ qualitys: { '1080p': direct } });
      return;
    }

    // Медленный путь: парсим страницу
    httpGet(videoUrl, function (html) {
      var q = {};

      // Ищем src="...mp4..." в source-тегах
      var sizes = ['1080', '720', '480', '360', '240'];
      for (var si = 0; si < sizes.length; si++) {
        var sz = sizes[si];
        var m;
        m = html.match(new RegExp('src="([^"]+)"[^>]*size="' + sz + '"'));
        if (m && m[1]) { q[sz + 'p'] = m[1]; continue; }
        m = html.match(new RegExp('size="' + sz + '"[^>]*src="([^"]+)"'));
        if (m && m[1]) { q[sz + 'p'] = m[1]; continue; }
        m = html.match(new RegExp('label="' + sz + '[^"]*"[^>]*src="([^"]+)"'));
        if (m && m[1]) { q[sz + 'p'] = m[1]; }
      }

      // /preview/{slug}.mp4 как fallback
      if (!Object.keys(q).length) {
        var pm = html.match(/["'](https?:\/\/pornobriz\.com\/preview\/[^"']+\.mp4)/);
        if (pm) q['1080p'] = pm[1];
      }

      // Любые mp4
      if (!Object.keys(q).length) {
        var re = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
        var mx; var idx = 0;
        while ((mx = re.exec(html)) !== null && idx < 5) {
          q['auto' + (idx||'')] = mx[1]; idx++;
        }
      }

      if (!Object.keys(q).length) {
        notyErr('Нет ссылок на видео');
        fail('no_links');
        return;
      }

      notyOk('Качеств: ' + Object.keys(q).length);
      ok({ qualitys: q });
    }, function (e) {
      notyErr('Ошибка страницы');
      fail(e);
    });
  }

  // ----------------------------------------------------------
  // ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ----------------------------------------------------------
  var BrizParser = {

    main: function (params, ok, fail) {
      log('main()', safeParams(params));
      try {
        httpGet(HOST + '/', function (html) {
          try {
            var r = parsePlaylist(html);
            if (!r.length) { fail('no_cards'); return; }
            ok({ results: r, collection: true, total_pages: 30, menu: buildMenu(HOST) });
          } catch(e) { err('main cb:', e.message); fail(e.message); }
        }, fail);
      } catch(e) { err('main:', e.message); fail(e.message); }
    },

    view: function (params, ok, fail) {
      log('view()', safeParams(params));
      try {
        var rawUrl = (params.url || HOST).replace(/[?&]page=\d+/, '');
        var page   = parseInt(params.page, 10) || 1;
        var state  = parseUrl(rawUrl);
        var url    = buildUrl(state.cat, state.search, page);

        httpGet(url, function (html) {
          try {
            var r = parsePlaylist(html);
            if (!r.length) { fail('no_cards'); return; }
            ok({
              results:     r,
              collection:  true,
              total_pages: r.length >= 20 ? page + 5 : page,
              menu:        buildMenu(rawUrl),
            });
          } catch(e) { err('view cb:', e.message); fail(e.message); }
        }, fail);
      } catch(e) { err('view:', e.message); fail(e.message); }
    },

    // [2.0.0] Поиск через /?q={query}
    search: function (params, ok, fail) {
      var query = (params.query || '').trim();
      log('search() "' + query + '"');
      try {
        httpGet(HOST + '/?q=' + encodeURIComponent(query), function (html) {
          try {
            var r = parsePlaylist(html);
            ok({
              title:       'PornoBriz: ' + query,
              results:     r,
              url:         HOST + '/?q=' + encodeURIComponent(query),
              collection:  true,
              total_pages: r.length >= 20 ? 6 : 1,
            });
          } catch(e) { err('search cb:', e.message); ok({ title: 'PornoBriz', results: [], collection: true, total_pages: 1 }); }
        }, function () {
          ok({ title: 'PornoBriz', results: [], collection: true, total_pages: 1 });
        });
      } catch(e) { err('search:', e.message); fail(e.message); }
    },

    qualitys: function (videoUrl, ok, fail) {
      log('qualitys()', videoUrl);
      try { getStreamLinks(videoUrl, ok, fail); }
      catch(e) { err('qualitys:', e.message); fail(e.message); }
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BrizParser);
      log('v2.0.1 зарегистрирован');
      notyOk('PornoBriz v2.0.1');
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _e = 0;
    var _t = setInterval(function () {
      _e += 100;
      if (tryRegister()) clearInterval(_t);
      else if (_e >= 10000) { clearInterval(_t); notyErr('Таймаут регистрации'); }
    }, 100);
  }

})();
