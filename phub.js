// =============================================================
// phub.js — Парсер PornHub (rt.pornhub.com) для AdultJS (Lampa)
// Version  : 1.0.0
// Changed  :
//   [1.0.0] Портирование из phb port под AdultJS 1.5.3
//           Структура по образцу briz.js v2.0.4
//
//   СТРУКТУРА САЙТА (из phb port):
//     Карточки  : li.videoblock / li.pcVideoListItem
//     Постер    : img[data-mediumthumb] → data-thumb_url → data-image → src
//     Превью    : img[data-mediabook]
//     Название  : span.title a[data-event="thumb_click"]
//     Длит-ть   : var.duration
//     Качество  : span.hd-thumbnail
//     Поиск     : /video/search?search={query}&page={N}
//     Категория : /video?c={id}&page={N}
//     Сортировка: /video?o={key}&page={N}
//     Видео MP4 : "videoUrl":"URL","quality":"N" из страницы видео
//
//   ПРИМЕЧАНИЕ:
//     В AdultJS153.js (domainMap) добавить:
//     'rt.pornhub.com': 'phub'  — в Api.view() и Api.search()
// =============================================================

(function () {
  'use strict';

  var HOST      = 'https://rt.pornhub.com';
  var NAME      = 'phub';
  var TAG       = '[phub]';
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
    try { return JSON.stringify({ url: p.url || '', page: p.page || '', query: p.query || '' }); }
    catch (e) { return '(err)'; }
  }

  // ----------------------------------------------------------
  // ЛОГИРОВАНИЕ
  // ----------------------------------------------------------
  function log(m, d)  { console.log(TAG,   m, d !== undefined ? d : ''); }
  function warn(m, d) { console.warn(TAG,  m, d !== undefined ? d : ''); }
  function err(m, d)  { console.error(TAG, m, d !== undefined ? d : ''); }

  function notyErr(msg) {
    try { Lampa.Noty.show(TAG + ' ⛔ ' + msg, { time: NOTY_TIME, style: 'error' }); } catch (e) {}
  }
  function notyOk(msg) {
    try { Lampa.Noty.show(TAG + ' ✅ ' + msg, { time: NOTY_TIME }); } catch (e) {}
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
          var msg = (e && e.message) ? e.message : String(e || '');
          var st  = (e && e.status)  ? e.status  : 0;
          if (st === 403 || msg.indexOf('403') !== -1) { fail('403'); return; }
          fail(msg || 'native_err');
        },
        false, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
      );
    } catch (ex) {
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
    } catch (ex) { fail(ex.message); }
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
  //   Главная      : /video?page={N}
  //   Сортировка   : /video?o={key}&page={N}
  //   Категория    : /video?c={id}&page={N}
  //   Кат+Сорт     : /video?c={id}&o={key}&page={N}
  //   Поиск        : /video/search?search={query}&page={N}
  // ----------------------------------------------------------

  // Сортировки из phb port
  var SORTS = [
    { title: 'Недавно в Избранном', val: ''   },
    { title: 'Новые',               val: 'cm' },
    { title: 'Популярные',          val: 'mv' },
    { title: 'Лучшие',              val: 'tr' },
    { title: 'Горячие',             val: 'ht' },
  ];

  // Категории из phb port (числовые ID PornHub)
  var CATS = [
    { title: 'Все',                       val: ''    },
    { title: 'Азиатки',                   val: '1'   },
    { title: 'Анальный секс',             val: '35'  },
    { title: 'Арабское',                  val: '98'  },
    { title: 'БДСМ',                      val: '10'  },
    { title: 'Бисексуалы',                val: '76'  },
    { title: 'Блондинки',                 val: '9'   },
    { title: 'Большая грудь',             val: '8'   },
    { title: 'Большие члены',             val: '7'   },
    { title: 'Бразильское',               val: '102' },
    { title: 'Британское',                val: '96'  },
    { title: 'Брызги',                    val: '69'  },
    { title: 'Брюнетки',                  val: '11'  },
    { title: 'Буккаке',                   val: '14'  },
    { title: 'В школе',                   val: '88'  },
    { title: 'Веб-камера',                val: '61'  },
    { title: 'Вечеринки',                 val: '53'  },
    { title: 'Гонзо',                     val: '41'  },
    { title: 'Грубый секс',               val: '67'  },
    { title: 'Групповуха',                val: '80'  },
    { title: 'Девушки (соло)',            val: '492' },
    { title: 'Двойное проникновение',     val: '72'  },
    { title: 'Дрочит',                    val: '20'  },
    { title: 'Европейцы',                 val: '55'  },
    { title: 'Жесткий секс',              val: '21'  },
    { title: 'Женский оргазм',            val: '502' },
    { title: 'За кадром',                 val: '141' },
    { title: 'Звезды',                    val: '12'  },
    { title: 'Золотой дождь',             val: '211' },
    { title: 'Зрелые',                    val: '28'  },
    { title: 'Игрушки',                   val: '23'  },
    { title: 'Индийское',                 val: '101' },
    { title: 'Итальянское',               val: '97'  },
    { title: 'Кастинги',                  val: '90'  },
    { title: 'Кончают',                   val: '16'  },
    { title: 'Корейское',                 val: '103' },
    { title: 'Косплей',                   val: '241' },
    { title: 'Кунилингус',                val: '131' },
    { title: 'Курящие',                   val: '91'  },
    { title: 'Латинки',                   val: '26'  },
    { title: 'Лесбиянки',                 val: '27'  },
    { title: 'Любительское',              val: '3'   },
    { title: 'Маленькая грудь',           val: '59'  },
    { title: 'Мамочки',                   val: '29'  },
    { title: 'Массаж',                    val: '78'  },
    { title: 'Мастурбация',               val: '22'  },
    { title: 'Межрассовый секс',          val: '25'  },
    { title: 'Минет',                     val: '13'  },
    { title: 'Музыка',                    val: '121' },
    { title: 'Мулаты',                    val: '17'  },
    { title: 'Мультики',                  val: '86'  },
    { title: 'Мускулистые мужчины',       val: '512' },
    { title: 'На публике',                val: '24'  },
    { title: 'Немецкое',                  val: '95'  },
    { title: 'Ноги',                      val: '93'  },
    { title: 'Няни',                      val: '89'  },
    { title: 'Парни (соло)',              val: '92'  },
    { title: 'Пародия',                   val: '201' },
    { title: 'Попки',                     val: '4'   },
    { title: 'Приколы',                   val: '32'  },
    { title: 'Проверенное любительское',  val: '138' },
    { title: 'Проверенные модели',        val: '139' },
    { title: 'Проверенные пары',          val: '482' },
    { title: 'Реальный секс',             val: '31'  },
    { title: 'Ретро',                     val: '43'  },
    { title: 'Рогоносцы',                 val: '242' },
    { title: 'Ролевые игры',              val: '81'  },
    { title: 'Русское',                   val: '99'  },
    { title: 'Секс втроем',               val: '65'  },
    { title: '60FPS',                     val: '105' },
    { title: 'Gaming',                    val: '881' },
    { title: 'Podcast',                   val: '891' },
  ];

  // Построить URL запроса
  function buildUrl(cat, sort, search, page) {
    page = parseInt(page, 10) || 1;
    var url;

    if (search) {
      url = HOST + '/video/search?search=' + encodeURIComponent(search) + '&page=' + page;
    } else if (cat && sort) {
      url = HOST + '/video?c=' + cat + '&o=' + sort + '&page=' + page;
    } else if (cat) {
      url = HOST + '/video?c=' + cat + '&page=' + page;
    } else if (sort) {
      url = HOST + '/video?o=' + sort + '&page=' + page;
    } else {
      url = HOST + '/video?page=' + page;
    }

    log('buildUrl →', url);
    return url;
  }

  // Извлечь cat / sort / search из URL
  function parseUrl(url) {
    var cat = '', sort = '', search = '';
    var s = url || '';

    // Просто имя парсера — главная
    if (s.indexOf('/') === -1 && s.indexOf('http') === -1) {
      log('parseUrl → имя парсера, главная');
      return { cat: '', sort: '', search: '' };
    }

    // Поиск: ?search=...
    var sm = s.match(/[?&]search=([^&]+)/);
    if (sm) {
      search = decodeURIComponent(sm[1] || '');
      log('parseUrl → search=' + search);
      return { cat: '', sort: '', search: search };
    }

    // Категория
    var cm = s.match(/[?&]c=([^&]+)/);
    if (cm) cat = cm[1];

    // Сортировка
    var om = s.match(/[?&]o=([^&]+)/);
    if (om) sort = om[1];

    log('parseUrl → cat=' + cat + ' sort=' + sort);
    return { cat: cat, sort: sort, search: '' };
  }

  // Построить меню фильтра
  function buildMenu(url) {
    var state = parseUrl(url || '');

    var activeCat  = arrayFind(CATS,  function (c) { return c.val === state.cat;  });
    var activeSort = arrayFind(SORTS, function (s) { return s.val === state.sort; });

    // Подменю сортировок (сохраняет текущую категорию)
    var sortSubmenu = SORTS.map(function (s) {
      var u;
      if (s.val) {
        u = HOST + '/video?o=' + s.val + (state.cat ? '&c=' + state.cat : '') + '&page=1';
      } else {
        u = HOST + '/video' + (state.cat ? '?c=' + state.cat + '&page=1' : '?page=1');
      }
      return { title: s.title, playlist_url: u };
    });

    // Подменю категорий (сохраняет текущую сортировку)
    var catSubmenu = CATS.map(function (c) {
      var u;
      if (c.val) {
        u = HOST + '/video?c=' + c.val + (state.sort ? '&o=' + state.sort : '') + '&page=1';
      } else {
        u = HOST + '/video' + (state.sort ? '?o=' + state.sort + '&page=1' : '?page=1');
      }
      return { title: c.title, playlist_url: u };
    });

    return [
      { title: 'Поиск', playlist_url: HOST, search_on: true },
      {
        title:   'Сортировка: ' + (activeSort ? activeSort.title : 'Недавно в Избранном'),
        submenu: sortSubmenu,
      },
      {
        title:   'Категория: ' + (activeCat ? activeCat.title : 'Все'),
        submenu: catSubmenu,
      },
    ];
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА
  //
  // Реальная структура карточки (li.videoblock / li.pcVideoListItem):
  //
  //   <li class="videoblock pcVideoListItem">
  //     <div class="wrap">
  //       <a class="linkVideoThumb pcVideoThumb" href="/video/phxxx">
  //         <img data-mediumthumb="https://...jpg"
  //              data-mediabook="https://..._preview.mp4"
  //              alt="Название видео" />
  //         <var class="duration">12:34</var>
  //         <span class="hd-thumbnail">HD</span>
  //       </a>
  //       <span class="title">
  //         <a data-event="thumb_click" href="/video/phxxx">Название</a>
  //       </span>
  //       <div class="usernameWrap">
  //         <a href="/model/...">Имя модели</a>
  //       </div>
  //     </div>
  //   </li>
  //
  // Ключевые факты:
  //   - Селектор: li.videoblock  (или li.pcVideoListItem)
  //   - Постер  : img[data-mediumthumb]  (data-thumb_url / data-image как fallback)
  //   - Превью  : img[data-mediabook]    (короткий mp4-preview)
  //   - Название: span.title a[data-event="thumb_click"]
  //   - Длит-ть : var.duration
  //   - Качество: span.hd-thumbnail
  //   - video=href (HTML-страница) → qualitys() найдёт реальный mp4
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    if (!html || html.length < 100) {
      warn('parsePlaylist → html пустой'); return [];
    }
    log('parsePlaylist → длина:', html.length);

    var doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
    catch (e) { err('DOMParser:', e.message); return []; }

    var cards = [];

    // Стратегия 1: li.videoblock
    var items = doc.querySelectorAll('li.videoblock');
    log('parsePlaylist → li.videoblock найдено:', items.length);
    forEachNode(items, function (el) {
      var c = _card(el);
      if (c) cards.push(c);
    });

    // Стратегия 2: li.pcVideoListItem (мобильная разметка)
    if (!cards.length) {
      var items2 = doc.querySelectorAll('li.pcVideoListItem');
      log('parsePlaylist → li.pcVideoListItem найдено:', items2.length);
      forEachNode(items2, function (el) {
        var c = _card(el);
        if (c) cards.push(c);
      });
    }

    // Стратегия 3: XPath videoblock
    if (!cards.length) {
      try {
        var nodes = doc.evaluate(
          "//li[contains(@class,'videoblock')]",
          doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
        );
        log('parsePlaylist → XPath videoblock:', nodes.snapshotLength);
        for (var i = 0; i < nodes.snapshotLength; i++) {
          var c2 = _card(nodes.snapshotItem(i));
          if (c2) cards.push(c2);
        }
      } catch (e) { warn('XPath:', e.message); }
    }

    // Стратегия 4: fallback a.linkVideoThumb
    if (!cards.length) {
      log('parsePlaylist → fallback a.linkVideoThumb');
      forEachNode(doc.querySelectorAll('a.linkVideoThumb, a.pcVideoThumb'), function (a) {
        try {
          var href = a.getAttribute('href') || '';
          if (!href) return;
          if (href.indexOf('http') !== 0) href = HOST + href;
          var imgEl  = a.querySelector('img');
          var pic    = _extractPicture(imgEl);
          var prev   = imgEl ? (imgEl.getAttribute('data-mediabook') || null) : null;
          var name   = imgEl ? (imgEl.getAttribute('alt') || '') : '';
          if (!name || name.length < 3) return;
          for (var ci = 0; ci < cards.length; ci++) {
            if (cards[ci].video === href) return;
          }
          var durEl = a.querySelector('var.duration, .duration');
          var time  = durEl ? (durEl.textContent || '').trim() : '';
          cards.push({ name: name, video: href, picture: pic, preview: prev,
                       time: time, quality: '', json: true, source: NAME });
        } catch (ex) {}
      });
    }

    if (!cards.length) {
      warn('parsePlaylist → карточки не найдены');
      if (doc.body) {
        warn('body[0:400]:', (doc.body.innerHTML || '').substring(0, 400));
        warn('li.videoblock:', doc.querySelectorAll('li.videoblock').length);
        warn('a.linkVideoThumb:', doc.querySelectorAll('a.linkVideoThumb').length);
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

  // Постер: data-mediumthumb → data-thumb_url → data-image → src
  function _extractPicture(imgEl) {
    if (!imgEl) return '';
    var pic = imgEl.getAttribute('data-mediumthumb') ||
              imgEl.getAttribute('data-thumb_url')   ||
              imgEl.getAttribute('data-image')        ||
              imgEl.getAttribute('src')               || '';
    if (pic.indexOf('data:image') === 0) pic = '';
    if (pic && pic.indexOf('//') === 0)   pic = 'https:' + pic;
    else if (pic && pic.indexOf('http') !== 0) pic = HOST + pic;
    return pic;
  }

  // Название: span.title a → a[data-event] → img[alt] → a[title]
  function _extractName(liEl, imgEl) {
    var titleA = liEl ? liEl.querySelector('span.title a') : null;
    if (titleA && (titleA.textContent || '').trim().length > 2) {
      return (titleA.textContent || '').trim();
    }
    var evA = liEl ? liEl.querySelector('a[data-event="thumb_click"]') : null;
    if (evA && (evA.textContent || '').trim().length > 2) {
      return (evA.textContent || '').trim();
    }
    if (imgEl && imgEl.getAttribute('alt') && imgEl.getAttribute('alt').length > 2) {
      return imgEl.getAttribute('alt');
    }
    var titA = liEl ? liEl.querySelector('a[title]') : null;
    if (titA && titA.getAttribute('title').length > 2) return titA.getAttribute('title');
    return '';
  }

  // Извлечь одну карточку из li.videoblock
  function _card(el) {
    if (!el) return null;
    try {
      var aEl = el.querySelector('a.linkVideoThumb') ||
                el.querySelector('a.pcVideoThumb')   ||
                el.querySelector('a[href*="/video/"]');
      if (!aEl) return null;

      var href = aEl.getAttribute('href') || '';
      if (!href) return null;
      if (href.indexOf('http') !== 0) href = HOST + href;

      // Только страницы видео (не поиск, не категории)
      if (href.indexOf('/video/') === -1 && href.indexOf('/view_video') === -1) return null;

      var imgEl   = el.querySelector('img');
      var picture = _extractPicture(imgEl);
      var preview = imgEl ? (imgEl.getAttribute('data-mediabook') || null) : null;

      var name = _extractName(el, imgEl);
      if (!name || name.length < 3) return null;

      var durEl   = el.querySelector('var.duration, .duration, .videoDuration');
      var time    = durEl ? (durEl.textContent || '').trim() : '';

      var qualEl  = el.querySelector('.hd-thumbnail, .vue-hd-badge, .hd-badge');
      var quality = qualEl ? ((qualEl.textContent || '').trim() || 'HD') : '';

      return {
        name:    name,
        video:   href,      // HTML-страница → qualitys() найдёт реальный mp4
        picture: picture,
        preview: preview,
        time:    time,
        quality: quality,
        json:    true,      // true → AdultJS вызовет qualitys()
        source:  NAME,
      };
    } catch (e) {
      warn('_card:', e.message); return null;
    }
  }

  // ----------------------------------------------------------
  // ПОЛУЧЕНИЕ ПРЯМЫХ ССЫЛОК (qualitys)
  //
  // PornHub хранит ссылки в JS-объекте на странице видео:
  //   "videoUrl":"https://...","quality":"1080"
  //   "videoUrl":"https://...","quality":"720"
  // ----------------------------------------------------------
  function getStreamLinks(videoUrl, ok, fail) {
    log('qualitys →', videoUrl);

    httpGet(videoUrl, function (html) {
      var q = {};
      var sizes = ['2160', '1080', '720', '480', '360', '240'];

      // Стратегия 1: "videoUrl":"URL","quality":"N"
      for (var si = 0; si < sizes.length; si++) {
        var m = html.match(
          new RegExp('"videoUrl":\\s*"([^"]+)"\\s*,\\s*"quality":\\s*"' + sizes[si] + '"')
        );
        if (m && m[1]) q[sizes[si] + 'p'] = m[1].replace(/\\/g, '');
      }

      // Стратегия 2: обратный порядок "quality":"N","videoUrl":"URL"
      if (!Object.keys(q).length) {
        for (var si2 = 0; si2 < sizes.length; si2++) {
          var m2 = html.match(
            new RegExp('"quality":\\s*"' + sizes[si2] + '"\\s*,\\s*"videoUrl":\\s*"([^"]+)"')
          );
          if (m2 && m2[1]) q[sizes[si2] + 'p'] = m2[1].replace(/\\/g, '');
        }
      }

      // Стратегия 3: массив qualityItems / mediaDefinitions
      if (!Object.keys(q).length) {
        var jm = html.match(/(?:qualityItems|mediaDefinitions)\s*[:=]\s*($[\s\S]{1,2000}?$)/);
        if (jm) {
          try {
            var srcs = JSON.parse(jm[1].replace(/'/g, '"'));
            for (var j = 0; j < srcs.length; j++) {
              var lbl = String(srcs[j].quality || srcs[j].label || 'auto');
              var u   = srcs[j].videoUrl || srcs[j].url || srcs[j].src || '';
              if (u) q[lbl.replace(/\s/g, '') + (lbl.indexOf('p') === -1 ? 'p' : '')] =
                u.replace(/\\/g, '');
            }
          } catch (e) {}
        }
      }

      // Стратегия 4: setVideoHLS
      if (!Object.keys(q).length) {
        var hlsM = html.match(/setVideoHLS$['"]([^'"]+)['"]$/);
        if (hlsM) q['HLS'] = hlsM[1];
      }

      // Стратегия 5: любые .mp4
      if (!Object.keys(q).length) {
        var re4 = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
        var m4; var i4 = 0;
        while ((m4 = re4.exec(html)) !== null && i4 < 5) {
          q['auto' + (i4 || '')] = m4[1]; i4++;
        }
      }

      // Стратегия 6: .m3u8
      if (!Object.keys(q).length) {
        var m5 = html.match(/["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
        if (m5) q['HLS'] = m5[1];
      }

      if (!Object.keys(q).length) {
        notyErr('Нет ссылок на видео');
        fail('no_links');
        return;
      }

      log('qualitys → найдено качеств:', Object.keys(q).length);
      notyOk('Качеств: ' + Object.keys(q).length);
      ok({ qualitys: q });
    }, function (e) {
      notyErr('Ошибка страницы видео');
      fail(e);
    });
  }

  // ----------------------------------------------------------
  // ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ----------------------------------------------------------
  var PhubParser = {

    main: function (params, ok, fail) {
      log('main()', safeParams(params));
      try {
        httpGet(HOST + '/video?page=1', function (html) {
          try {
            var r = parsePlaylist(html);
            if (!r.length) { fail('no_cards'); return; }
            ok({ results: r, collection: true, total_pages: 30, menu: buildMenu(HOST) });
          } catch (e) { err('main cb:', e.message); fail(e.message); }
        }, fail);
      } catch (e) { err('main:', e.message); fail(e.message); }
    },

    view: function (params, ok, fail) {
      log('view()', safeParams(params));
      try {
        var rawUrl = (params.url || HOST).replace(/[?&]page=\d+/, '');
        var page   = parseInt(params.page, 10) || 1;
        var state  = parseUrl(rawUrl);
        var url    = buildUrl(state.cat, state.sort, state.search, page);

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
          } catch (e) { err('view cb:', e.message); fail(e.message); }
        }, fail);
      } catch (e) { err('view:', e.message); fail(e.message); }
    },

    search: function (params, ok, fail) {
      var query = (params.query || '').trim();
      log('search() "' + query + '"');
      try {
        var searchUrl = HOST + '/video/search?search=' + encodeURIComponent(query) + '&page=1';
        httpGet(searchUrl, function (html) {
          try {
            var r = parsePlaylist(html);
            ok({
              title:       'PornHub: ' + query,
              results:     r,
              url:         HOST + '/video/search?search=' + encodeURIComponent(query),
              collection:  true,
              total_pages: r.length >= 20 ? 6 : 1,
            });
          } catch (e) {
            err('search cb:', e.message);
            ok({ title: 'PornHub', results: [], collection: true, total_pages: 1 });
          }
        }, function () {
          ok({ title: 'PornHub', results: [], collection: true, total_pages: 1 });
        });
      } catch (e) { err('search:', e.message); fail(e.message); }
    },

    qualitys: function (videoUrl, ok, fail) {
      log('qualitys()', videoUrl);
      try { getStreamLinks(videoUrl, ok, fail); }
      catch (e) { err('qualitys:', e.message); fail(e.message); }
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, PhubParser);
      log('v1.0.0 зарегистрирован');
      notyOk('PornHub v1.0.0');
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
