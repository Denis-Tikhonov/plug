// =============================================================
// briz.js — Парсер PornoBriz для AdultJS / AdultPlugin (Lampa)
// Version  : 2.0.4
// Changed  :
//   [2.0.3] BUGFIX: div.thumb_main, data-original, video[data-preview]
//   [2.0.4] BUGFIX: json:true + video=HTML-страница (как в v1.5.0)
//           qualities() парсит страницу видео и возвращает реальные
//           mp4-ссылки с качеством 1080p/720p/480p/360p/240p
//           (в v2.0.2/2.0.3 был json:false + video=preview.mp4 —
//            плеер открывал короткое превью вместо полного видео)
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
  // Реальная структура карточки pornobriz.com (из HTML):
  //
  //   <div class="thumb_main">
  //     <a href="/video/{slug}/" rel="bookmark">
  //       <video data-preview="https://pornobriz.com/preview/{slug}.mp4"></video>
  //       <img src="data:image/png;base64,..." 
  //            data-original="/content/screen/77/XXXXX_11.jpg"
  //            alt="Название видео" />
  //       <div class="t-hd">FULL HD</div>
  //       <div class="duration">22:31</div>
  //       <div class="th-title">Название видео</div>
  //     </a>
  //   </div>
  //
  // Ключевые факты:
  //   - Селектор карточки: div.thumb_main  (НЕ div.logo!)
  //   - Постер: img[data-original]  (src — плейсхолдер 1×1px!)
  //   - Превью: video[data-preview]  (готовый mp4 URL)
  //   - Название: div.th-title или img[alt]
  //   - Длительность: div.duration
  //   - mp4 для плеера = data-preview (он же превью)
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    if (!html || html.length < 100) {
      warn('parsePlaylist → html пустой'); return [];
    }
    log('parsePlaylist → длина:', html.length);

    var doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
    catch(e) { err('DOMParser:', e.message); return []; }

    var cards = [];

    // --- Стратегия 1: div.thumb_main (точный селектор карточки) ---
    var thumbs = doc.querySelectorAll('div.thumb_main');
    log('parsePlaylist → div.thumb_main найдено:', thumbs.length);

    forEachNode(thumbs, function (el) {
      var c = _card(el);
      if (c) cards.push(c);
    });

    // --- Стратегия 2: XPath для div.thumb_main ---
    if (!cards.length) {
      try {
        var nodes = doc.evaluate(
          "//div[contains(@class,'thumb_main')]",
          doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
        );
        log('parsePlaylist → XPath thumb_main:', nodes.snapshotLength);
        for (var i = 0; i < nodes.snapshotLength; i++) {
          var c2 = _card(nodes.snapshotItem(i));
          if (c2) cards.push(c2);
        }
      } catch(e) { warn('XPath:', e.message); }
    }

    // --- Стратегия 3: a[href*="/video/"] как последний fallback ---
    if (!cards.length) {
      log('parsePlaylist → fallback: a[href*=/video/]');
      forEachNode(doc.querySelectorAll('a[href*="/video/"]'), function (a) {
        try {
          var href = a.getAttribute('href') || '';
          if (!href) return;
          if (href.indexOf('http') !== 0) href = HOST + href;
          var slug = _slugFromUrl(href);
          if (!slug) return;

          var imgEl  = a.querySelector('img');
          var vidEl  = a.querySelector('video');
          var mp4    = (vidEl ? vidEl.getAttribute('data-preview') : '') || (HOST + '/preview/' + slug + '.mp4');
          var pic    = _extractPicture(imgEl);
          var name   = _extractName(a, imgEl);
          if (!name || name.length < 3) return;
          var durEl  = a.querySelector('.duration');
          var time   = durEl ? (durEl.textContent || '').trim() : '';

          for (var ci = 0; ci < cards.length; ci++) {
            if (cards[ci].video === mp4) return;
          }
          cards.push({ name: name, video: mp4, picture: pic, preview: mp4, time: time, quality: 'HD', json: false, source: NAME });
        } catch(ex) {}
      });
    }

    if (!cards.length) {
      warn('parsePlaylist → карточки не найдены');
      if (doc.body) {
        warn('body[0:400]:', (doc.body.innerHTML || '').substring(0, 400));
        warn('thumb_main:', doc.querySelectorAll('div.thumb_main').length);
        warn('a[/video/]:', doc.querySelectorAll('a[href*="/video/"]').length);
      }
    } else {
      log('parsePlaylist → ИТОГО:', cards.length);
      if (cards[0]) {
        log('  первая карточка:', cards[0].name);
        log('  picture:', cards[0].picture || '(пусто)');
        log('  video:', cards[0].video);
      }
      notyOk('Найдено ' + cards.length + ' видео');
    }
    return cards;
  }

  // ----------------------------------------------------------
  // Вспомогательные функции извлечения полей
  // ----------------------------------------------------------

  // Постер: data-original приоритетнее src (src = lazy плейсхолдер 1×1px)
  function _extractPicture(imgEl) {
    if (!imgEl) return '';
    var pic = imgEl.getAttribute('data-original') ||
              imgEl.getAttribute('data-src')       ||
              imgEl.getAttribute('data-lazy')      ||
              imgEl.getAttribute('src')             || '';
    // Отсекаем base64 плейсхолдеры
    if (pic.indexOf('data:image') === 0) pic = '';
    // Добавляем хост если относительный путь
    if (pic && pic.indexOf('http') !== 0) pic = HOST + pic;
    return pic;
  }

  // Название: div.th-title → img[alt] → a[title] → текст
  function _extractName(aEl, imgEl) {
    var titleEl = aEl ? aEl.querySelector('.th-title') : null;
    return (titleEl ? (titleEl.textContent || '').trim() : '') ||
           (imgEl   ? (imgEl.getAttribute('alt') || '')  : '') ||
           (aEl     ? (aEl.getAttribute('title') || '')  : '') ||
           (aEl     ? (aEl.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 100) : '');
  }

  // ----------------------------------------------------------
  // Извлечь одну карточку из div.thumb_main
  // [2.0.4] json:true + video=href (HTML-страница видео).
  //         qualities() скачивает страницу и извлекает реальные
  //         mp4-ссылки с качеством 1080p/720p/480p.
  //         preview берём из video[data-preview] — короткий mp4.
  // ----------------------------------------------------------
  function _card(el) {
    if (!el) return null;
    try {
      var aEl = el.querySelector('a[href*="/video/"]') || el.querySelector('a[href]');
      if (!aEl) return null;

      var href = aEl.getAttribute('href') || '';
      if (!href) return null;
      if (href.indexOf('http') !== 0) href = HOST + href;

      // Проверяем что это страница видео
      if (href.indexOf('/video/') === -1) return null;

      // Превью из video[data-preview]
      var vidEl   = el.querySelector('video[data-preview]');
      var preview = vidEl ? (vidEl.getAttribute('data-preview') || null) : null;

      // Постер из img[data-original]
      var imgEl   = el.querySelector('img');
      var picture = _extractPicture(imgEl);

      // Название
      var name = _extractName(aEl, imgEl);
      if (!name || name.length < 3) return null;

      // Длительность
      var durEl = el.querySelector('.duration');
      var time  = durEl ? (durEl.textContent || '').trim() : '';

      return {
        name:    name,
        video:   href,      // [2.0.4] HTML-страница → qualities() найдёт реальный mp4
        picture: picture,
        preview: preview,
        time:    time,
        quality: 'HD',
        json:    true,      // [2.0.4] true → AdultJS вызовет qualities()
        source:  NAME,
      };
    } catch(e) {
      warn('_card:', e.message); return null;
    }
  }

  // ----------------------------------------------------------
  // Slug из URL видео
  // ----------------------------------------------------------
  function _slugFromUrl(videoUrl) {
    var m = (videoUrl || '').match(/\/video\/([^\/]+)\/?/);
    return m ? m[1] : '';
  }

  // ----------------------------------------------------------
  // ПОЛУЧЕНИЕ ПРЯМЫХ ССЫЛОК (qualities)
  // Восстановлена логика v1.5.0 — скачиваем страницу видео
  // и ищем реальные mp4-ссылки с качеством (работало в v1.5.0)
  // ----------------------------------------------------------
  function getStreamLinks(videoUrl, ok, fail) {
    log('qualities →', videoUrl);

    httpGet(videoUrl, function (html) {
      var q = {}, sizes = ['1080','720','480','360','240'];

      // Стратегия 1: src="..." type="video/mp4" size="N"
      for (var si = 0; si < sizes.length; si++) {
        var m = html.match(new RegExp('src="([^"]+)"\\s+type="video/mp4"\\s+size="' + sizes[si] + '"'));
        if (m && m[1]) q[sizes[si] + 'p'] = m[1];
      }

      // Стратегия 2: атрибуты в любом порядке
      if (!Object.keys(q).length) {
        for (var si2 = 0; si2 < sizes.length; si2++) {
          var sz = sizes[si2], m2;
          m2 = html.match(new RegExp('size="'  + sz + '"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) { q[sz+'p'] = m2[1]; continue; }
          m2 = html.match(new RegExp('label="' + sz + 'p?"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) { q[sz+'p'] = m2[1]; continue; }
          m2 = html.match(new RegExp('res="'   + sz + '"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) q[sz+'p'] = m2[1];
        }
      }

      // Стратегия 3: JSON sources:[...]
      if (!Object.keys(q).length) {
        var jm = html.match(/sources\s*[:=]\s*(\[[\s\S]*?\])/);
        if (jm) {
          try {
            var srcs = JSON.parse(jm[1].replace(/'/g, '"'));
            for (var j = 0; j < srcs.length; j++) {
              var lbl = (srcs[j].label || srcs[j].size || srcs[j].quality || 'auto') + '';
              var u   = srcs[j].file || srcs[j].src || srcs[j].url || '';
              if (u) q[lbl.replace(/\s/g,'')] = u;
            }
          } catch(e) {}
        }
      }

      // Стратегия 4: любые .mp4
      if (!Object.keys(q).length) {
        var re4 = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
        var m4; var i4 = 0;
        while ((m4 = re4.exec(html)) !== null && i4 < 5) {
          q['auto'+(i4||'')] = m4[1]; i4++;
        }
      }

      // Стратегия 5: .m3u8
      if (!Object.keys(q).length) {
        var m5 = html.match(/["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
        if (m5) q['HLS'] = m5[1];
      }

      if (!Object.keys(q).length) {
        notyErr('Нет ссылок на видео');
        fail('no_links');
        return;
      }

      log('qualities → найдено качеств:', Object.keys(q).length);
      notyOk('Качеств: ' + Object.keys(q).length);
      ok({ qualities: q });
    }, function(e) {
      notyErr('Ошибка страницы видео');
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

    qualities: function (videoUrl, ok, fail) {
      log('qualities()', videoUrl);
      try { getStreamLinks(videoUrl, ok, fail); }
      catch(e) { err('qualities:', e.message); fail(e.message); }
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BrizParser);
      log('v2.0.4 зарегистрирован');
      notyOk('PornoBriz v2.0.4');
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
