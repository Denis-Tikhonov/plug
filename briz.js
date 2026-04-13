// =============================================================
// briz.js — Парсер PornoBriz для AdultJS / AdultPlugin (Lampa)
// Version  : 3.0.0
// Changed  :
//   [2.0.3] BUGFIX: div.thumb_main, data-original, video[data-preview]
//   [2.0.4] BUGFIX: json:true + video=HTML-страница
//           qualities() парсит страницу и возвращает реальные mp4
//   [3.0.0] BUGFIX совместимости с AdultJS (на основе xds_1.1.0):
//           buildMenu() — убран аргумент url
//           buildMenu() — убрана логика активной категории
//           buildMenu() — playlist_url поиска: HOST → NAME+'/search/'
//           buildMenu() — добавлен playlist_url:'submenu' для категорий
//           search()    — добавлен menu:buildMenu() во все ветки ответа
//           view()      — buildMenu() без аргумента
//           main()      — buildMenu() без аргумента
// =============================================================

(function () {
  'use strict';

  var HOST      = 'https://pornobriz.com';
  var NAME      = 'briz';
  var TAG       = '[briz]';
  var NOTY_TIME = 3000;

  // ----------------------------------------------------------
  // CLOUDFLARE WORKER
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
  // КАТЕГОРИИ (70 штук из анализа сайта)
  // ----------------------------------------------------------
  var CATS = [
    { title: 'Азиатки',               val: 'asian'              },
    { title: 'Анальный секс',         val: 'anal'               },
    { title: 'БДСМ',                  val: 'bdsm'               },
    { title: 'Блондинки',             val: 'blonde'             },
    { title: 'Большая жопа',          val: 'big_ass'            },
    { title: 'Большие сиськи',        val: 'big_tits'           },
    { title: 'Большой член',          val: 'big_dick'           },
    { title: 'Бритая киска',          val: 'shaved'             },
    { title: 'Брюнетки',              val: 'brunette'           },
    { title: 'В одежде',              val: 'clothes'            },
    { title: 'Волосатые киски',       val: 'hairy'              },
    { title: 'Глотают сперму',        val: 'swallow'            },
    { title: 'Глубокая глотка',       val: 'deepthroat'         },
    { title: 'Групповой секс',        val: 'group'              },
    { title: 'Двойное проникновение', val: 'double_penetration' },
    { title: 'Длинноволосые',         val: 'long_hair'          },
    { title: 'Дрочат',                val: 'wanking'            },
    { title: 'Жесткий секс',          val: 'hardcore'           },
    { title: 'ЖМЖ порно',             val: 'ffm'                },
    { title: 'Игрушки',               val: 'toys'               },
    { title: 'Казашки',               val: 'kazakh'             },
    { title: 'Камшот',                val: 'cumshot'            },
    { title: 'Кончают в рот',         val: 'cum_in_mouth'       },
    { title: 'Красивая задница',      val: 'perfect_ass'        },
    { title: 'Красивое белье',        val: 'lingerie'           },
    { title: 'Красивые девушки',      val: 'beautiful'          },
    { title: 'Красивые сиськи',       val: 'beautiful_tits'     },
    { title: 'Крупным планом',        val: 'close_up'           },
    { title: 'Кунилингус',            val: 'pussy_licking'      },
    { title: 'Лесбиянки',             val: 'lesbian'            },
    { title: 'Любительское',          val: 'amateur'            },
    { title: 'Маленькие девушки',     val: 'petite'             },
    { title: 'Маленькие сиськи',      val: 'small_tits'         },
    { title: 'Мамочки',               val: 'milf'               },
    { title: 'Мастурбация',           val: 'masturbation'       },
    { title: 'Межрасовое',            val: 'interracial'        },
    { title: 'МЖМ порно',             val: 'mfm'                },
    { title: 'Милашки',               val: 'cute'               },
    { title: 'Минет',                 val: 'blowjob'            },
    { title: 'Молодые',               val: 'seks-molodye'       },
    { title: 'Мулатки',               val: 'mulatto'            },
    { title: 'Накачанные девушки',    val: 'sporty'             },
    { title: 'Оральный секс',         val: 'oral'               },
    { title: 'Оргазм',                val: 'orgasm'             },
    { title: 'Офис',                  val: 'office'             },
    { title: 'Пикап',                 val: 'pickup'             },
    { title: 'Порно в чулках',        val: 'stockings'          },
    { title: 'Порно со зрелыми',      val: 'mature'             },
    { title: 'Публичный секс',        val: 'public'             },
    { title: 'Рыжие',                 val: 'redhead'            },
    { title: 'Русское порно',         val: 'russian'            },
    { title: 'Секс в машине',         val: 'car_sex'            },
    { title: 'Секс на природе',       val: 'outdoor'            },
    { title: 'Сквирт',                val: 'squirt'             },
    { title: 'Смазливые',             val: 'pretty'             },
    { title: 'Соло девушка',          val: 'solo_girl'          },
    { title: 'Сперма в жопе',         val: 'creampie'           },
    { title: 'Сперма на груди',       val: 'cum_on_tits'        },
    { title: 'Сперма на лице',        val: 'facial'             },
    { title: 'Страпон',               val: 'strap-on'           },
    { title: 'Стриптиз',              val: 'striptease'         },
    { title: 'Темноволосые',          val: 'black-haired'       },
    { title: 'Фетиш',                 val: 'fetish'             },
    { title: 'Фингеринг',             val: 'fingering'          },
    { title: 'Фистинг',               val: 'fisting'            },
    { title: 'Худые девушки',         val: 'skinny'             },
  ];

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL
  //
  //   Главная   : https://pornobriz.com/
  //   Категория : https://pornobriz.com/{slug}/
  //   Поиск     : https://pornobriz.com/?q={query}
  //   Страница  : добавляем &page={N}
  // ----------------------------------------------------------
  function buildUrl(cat, search, page) {
    page = parseInt(page, 10) || 1;
    var base, sep;

    if (search) {
      base = HOST + '/?q=' + encodeURIComponent(search);
      sep  = '&';
    } else if (cat) {
      base = HOST + '/' + cat + '/';
      sep  = '?';
    } else {
      base = HOST + '/';
      sep  = '?';
    }

    if (page > 1) base = base + sep + 'page=' + page;
    log('buildUrl →', base);
    return base;
  }

  // ----------------------------------------------------------
  // РАЗБОР ВХОДЯЩЕГО URL
  //
  // Понимает:
  //   - просто NAME ('briz')           → главная
  //   - ?search=... или ?q=...         → поиск
  //   - https://pornobriz.com/{slug}/  → категория
  //   - briz/search/?search=...        → поиск через фильтр [3.0.0]
  // ----------------------------------------------------------
  function parseUrl(url) {
    var cat = '', search = '';
    var s = url || '';

    // Просто имя парсера (без '/' и 'http') → главная
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

    // Путь категории: убираем HOST, query-string, слэши
    var clean = s.replace(HOST, '').split('?')[0].replace(/^\//, '').replace(/\/$/, '');
    if (clean) {
      var catObj = arrayFind(CATS, function (c) { return c.val === clean; });
      if (catObj) {
        cat = catObj.val;
      } else {
        log('parseUrl → неизвестный путь "' + clean + '", грузим главную');
      }
    }

    log('parseUrl → cat=' + cat + ' search=' + search);
    return { cat: cat, search: search };
  }

  // ----------------------------------------------------------
  // [3.0.0] МЕНЮ — полностью переработано для совместимости с AdultJS
  //
  // ИЗМЕНЕНИЯ vs v2.0.4:
  //
  //   1. Убран аргумент url и логика «активная категория» —
  //      не нужны, только усложняли код и создавали баги.
  //
  //   2. Поиск: playlist_url был HOST (полный URL) →
  //      теперь NAME + '/search/'  (относительный путь).
  //      AdultJS добавит ?search=запрос к этому пути,
  //      parseUrl найдёт ?search= и передаст в buildUrl.
  //
  //   3. Категории: добавлен обязательный playlist_url:'submenu' —
  //      без него AdultJS не распознаёт блок как подменю
  //      и либо падает, либо пытается загрузить undefined.
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      {
        title        : '🔍 Поиск',
        search_on    : true,
        playlist_url : NAME + '/search/'   // [3.0.0] было: HOST
      },
      {
        title        : '🔥 Популярное',
        playlist_url : HOST + '/'
      },
      {
        title        : '📂 Категории',
        playlist_url : 'submenu',          // [3.0.0] добавлено — обязательно для AdultJS
        submenu      : CATS.map(function (c) {
          return {
            title        : c.title,
            playlist_url : HOST + '/' + c.val + '/'
          };
        })
      }
    ];
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА
  //
  // Структура карточки pornobriz.com:
  //   <div class="thumb_main">
  //     <a href="/video/{slug}/">
  //       <video data-preview="https://pornobriz.com/preview/{slug}.mp4"></video>
  //       <img data-original="/content/screen/77/XXXXX_11.jpg" alt="Название" />
  //       <div class="duration">22:31</div>
  //       <div class="th-title">Название</div>
  //     </a>
  //   </div>
  //
  // Три стратегии поиска карточек:
  //   1. div.thumb_main  (точный селектор)
  //   2. XPath для div.thumb_main  (fallback)
  //   3. a[href*="/video/"]  (последний resort)
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

    // Стратегия 1: div.thumb_main
    var thumbs = doc.querySelectorAll('div.thumb_main');
    log('parsePlaylist → div.thumb_main найдено:', thumbs.length);

    forEachNode(thumbs, function (el) {
      var c = _card(el);
      if (c) cards.push(c);
    });

    // Стратегия 2: XPath
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
      } catch (e) { warn('XPath:', e.message); }
    }

    // Стратегия 3: fallback a[href*="/video/"]
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

          var durEl = a.querySelector('.duration');
          var time  = durEl ? (durEl.textContent || '').trim() : '';

          // Не дублируем
          for (var ci = 0; ci < cards.length; ci++) {
            if (cards[ci].video === mp4) return;
          }

          cards.push({
            name:    name,
            video:   mp4,
            picture: pic,
            preview: mp4,
            time:    time,
            quality: 'HD',
            json:    false,
            source:  NAME
          });
        } catch (ex) {}
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
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ----------------------------------------------------------

  // Постер: data-original приоритетнее src (src = lazy-плейсхолдер)
  function _extractPicture(imgEl) {
    if (!imgEl) return '';
    var pic = imgEl.getAttribute('data-original') ||
              imgEl.getAttribute('data-src')       ||
              imgEl.getAttribute('data-lazy')      ||
              imgEl.getAttribute('src')             || '';
    if (pic.indexOf('data:image') === 0) pic = '';
    if (pic && pic.indexOf('http') !== 0) pic = HOST + pic;
    return pic;
  }

  // Название: div.th-title → img[alt] → a[title] → innerText
  function _extractName(aEl, imgEl) {
    var titleEl = aEl ? aEl.querySelector('.th-title') : null;
    return (titleEl ? (titleEl.textContent || '').trim()                    : '') ||
           (imgEl   ? (imgEl.getAttribute('alt') || '')                     : '') ||
           (aEl     ? (aEl.getAttribute('title') || '')                     : '') ||
           (aEl     ? (aEl.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 100) : '');
  }

  // Извлечь одну карточку из div.thumb_main
  // json:true → AdultJS вызовет qualities() для получения реального mp4
  function _card(el) {
    if (!el) return null;
    try {
      var aEl = el.querySelector('a[href*="/video/"]') || el.querySelector('a[href]');
      if (!aEl) return null;

      var href = aEl.getAttribute('href') || '';
      if (!href) return null;
      if (href.indexOf('http') !== 0) href = HOST + href;
      if (href.indexOf('/video/') === -1) return null;

      var vidEl   = el.querySelector('video[data-preview]');
      var preview = vidEl ? (vidEl.getAttribute('data-preview') || null) : null;

      var imgEl   = el.querySelector('img');
      var picture = _extractPicture(imgEl);

      var name = _extractName(aEl, imgEl);
      if (!name || name.length < 3) return null;

      var durEl = el.querySelector('.duration');
      var time  = durEl ? (durEl.textContent || '').trim() : '';

      return {
        name:    name,
        video:   href,      // HTML-страница видео → qualities() найдёт реальный mp4
        picture: picture,
        preview: preview,
        time:    time,
        quality: 'HD',
        json:    true,      // true → AdultJS вызовет qualities()
        source:  NAME,
      };
    } catch (e) {
      warn('_card:', e.message); return null;
    }
  }

  function _slugFromUrl(videoUrl) {
    var m = (videoUrl || '').match(/\/video\/([^\/]+)\/?/);
    return m ? m[1] : '';
  }

  // ----------------------------------------------------------
  // QUALITIES — получение прямых mp4-ссылок со страницы видео
  //
  // Пять стратегий поиска (от специфичной к универсальной):
  //   1. src="..." size="N" — стандартный тег <source>
  //   2. Атрибуты в любом порядке (size/label/res)
  //   3. JSON sources:[...]
  //   4. Любые .mp4 в тексте страницы
  //   5. .m3u8 (HLS)
  // ----------------------------------------------------------
  function getStreamLinks(videoUrl, ok, fail) {
    log('qualities →', videoUrl);

    httpGet(videoUrl, function (html) {
      var q = {}, sizes = ['1080', '720', '480', '360', '240'];

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
          if (m2 && m2[1]) { q[sz + 'p'] = m2[1]; continue; }
          m2 = html.match(new RegExp('label="' + sz + 'p?"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) { q[sz + 'p'] = m2[1]; continue; }
          m2 = html.match(new RegExp('res="'   + sz + '"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) q[sz + 'p'] = m2[1];
        }
      }

      // Стратегия 3: JSON sources:[...]
      if (!Object.keys(q).length) {
        var jm = html.match(/sources\s*[:=]\s*($[\s\S]*?$)/);
        if (jm) {
          try {
            var srcs = JSON.parse(jm[1].replace(/'/g, '"'));
            for (var j = 0; j < srcs.length; j++) {
              var lbl = (srcs[j].label || srcs[j].size || srcs[j].quality || 'auto') + '';
              var u   = srcs[j].file  || srcs[j].src  || srcs[j].url     || '';
              if (u) q[lbl.replace(/\s/g, '')] = u;
            }
          } catch (e) {}
        }
      }

      // Стратегия 4: любые .mp4 в тексте
      if (!Object.keys(q).length) {
        var re4 = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
        var m4; var i4 = 0;
        while ((m4 = re4.exec(html)) !== null && i4 < 5) {
          q['auto' + (i4 || '')] = m4[1]; i4++;
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

    }, function (e) {
      notyErr('Ошибка страницы видео');
      fail(e);
    });
  }

  // ----------------------------------------------------------
  // ПУБЛИЧНЫЙ ИНТЕРФЕЙС ПАРСЕРА
  // ----------------------------------------------------------
  var BrizParser = {

    // Главный экран
    main: function (params, ok, fail) {
      log('main()', safeParams(params));
      try {
        httpGet(HOST + '/', function (html) {
          try {
            var r = parsePlaylist(html);
            if (!r.length) { fail('no_cards'); return; }
            ok({
              results:     r,
              collection:  true,
              total_pages: 30,
              menu:        buildMenu()   // [3.0.0] было: buildMenu(HOST)
            });
          } catch (e) { err('main cb:', e.message); fail(e.message); }
        }, fail);
      } catch (e) { err('main:', e.message); fail(e.message); }
    },

    // Каталог / категория / поиск через фильтр
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
              menu:        buildMenu()   // [3.0.0] было: buildMenu(rawUrl)
            });
          } catch (e) { err('view cb:', e.message); fail(e.message); }
        }, fail);
      } catch (e) { err('view:', e.message); fail(e.message); }
    },

    // Глобальный поиск через строку поиска Lampa
    search: function (params, ok, fail) {
      var query = (params.query || '').trim();
      log('search() "' + query + '"');

      if (!query) {
        ok({ title: '', results: [], collection: true, total_pages: 1, menu: buildMenu() });
        return;
      }

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
              menu:        buildMenu()   // [3.0.0] добавлено
            });
          } catch (e) {
            err('search cb:', e.message);
            ok({ title: 'PornoBriz', results: [], collection: true, total_pages: 1, menu: buildMenu() });
          }
        }, function () {
          ok({ title: 'PornoBriz', results: [], collection: true, total_pages: 1, menu: buildMenu() });
        });
      } catch (e) { err('search:', e.message); fail(e.message); }
    },

    // Получение прямых ссылок на видео
    qualities: function (videoUrl, ok, fail) {
      log('qualities()', videoUrl);
      try { getStreamLinks(videoUrl, ok, fail); }
      catch (e) { err('qualities:', e.message); fail(e.message); }
    }
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BrizParser);
      log('v3.0.0 зарегистрирован');
      notyOk('PornoBriz v3.0.0');
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _e = 0;
    var _t = setInterval(function () {
      _e += 100;
      if (tryRegister()) {
        clearInterval(_t);
      } else if (_e >= 10000) {
        clearInterval(_t);
        notyErr('Таймаут регистрации');
      }
    }, 100);
  }

})();
