// =============================================================
// briz.js — Парсер PornoBriz для AdultJS / AdultPlugin (Lampa)
// Version  : 1.5.0
// Changed  :
//   [1.0.0] Первая версия.
//   [1.1.0] Логирование через Lampa.Noty
//   [1.1.1] Полифиллы, forEachNode, arrayFind
//   [1.1.2] safeParams — безопасная сериализация params
//   [1.2.0] Сетевой слой: native+Worker → Reguest → fetch
//   [1.3.0] Обработка 403 + авто-коррекция workerUrl
//   [1.4.0] BUGFIX: val:'' → val:'new', ветка главной в buildUrl
//   [1.5.0] BUGFIX: постеры — добавлены data-lazy, data-thumb,
//                   data-original2, data-webp в _extractCard/_imgSrc
//   [1.5.0] BUGFIX: превью — ищем data-preview/data-video/data-webm
//                   на самом div.thumb_main и вложенных элементах,
//                   а не в <video src> (на pornobriz нет <video> в листинге)
//   [1.5.0] BUGFIX: фильтр/сортировка — убран playlist_url:'submenu'
//                   из пунктов-групп buildMenu; это предотвращает
//                   попытку AdultJS загрузить URL 'submenu' → script error
//   [1.5.0] BUGFIX: поиск — при пустом результате возвращаем пустой
//                   массив через success() вместо error(), чтобы
//                   Lampa.Status не получал лишний error-вызов
//   [1.5.0] BUGFIX: script error при навигации — _extractCard и
//                   весь публичный интерфейс обёрнуты в try/catch
//   [1.5.0] BUGFIX: parseState убирает ?query-параметры перед
//                   анализом пути — сортировка/категории не зависают
//   [1.5.0] Таймаут native 9с (собственный setTimeout + флаг done)
// =============================================================

(function () {
  'use strict';

  var HOST      = 'https://pornobriz.com';
  var NAME      = 'briz';
  var TAG       = '[briz]';
  var NOTY_TIME = 3000;

  // ----------------------------------------------------------
  // URL Cloudflare Worker
  // Приоритет: AdultPlugin.workerUrl → константа ниже
  // ----------------------------------------------------------
  var WORKER_DEFAULT = 'https://ВАШ-WORKER.ВАШ-АККАУНТ.workers.dev/?url=';

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
      p = p || 0; return this.indexOf(s, p) === p;
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

  function noty(msg) {
    try { Lampa.Noty.show(TAG + ' ' + msg, { time: NOTY_TIME }); } catch(e) {}
  }
  function notyError(msg) {
    try { Lampa.Noty.show(TAG + ' ⛔ ' + msg, { time: NOTY_TIME, style: 'error' }); } catch(e) {}
  }
  function notySuccess(msg) {
    try { Lampa.Noty.show(TAG + ' ✅ ' + msg, { time: NOTY_TIME }); } catch(e) {}
  }

  // ----------------------------------------------------------
  // СЕТЕВОЙ СЛОЙ
  // ----------------------------------------------------------

  function _nativeRequest(url, success, error) {
    if (typeof Lampa === 'undefined' || !Lampa.Network ||
        typeof Lampa.Network.native !== 'function') {
      error('native_unavailable'); return;
    }
    var workerUrl = getWorkerUrl();
    var fullPath  = workerUrl + encodeURIComponent(url);
    var done      = false;

    var tid = setTimeout(function () {
      if (done) return; done = true;
      warn('native → timeout 9с');
      error('native_timeout');
    }, 9000);

    try {
      Lampa.Network.native(fullPath,
        function (result) {
          if (done) return; done = true; clearTimeout(tid);
          var text = (typeof result === 'string') ? result : JSON.stringify(result);
          if (text && text.indexOf('"status":403') !== -1) {
            notyError('Worker 403'); error('worker_403'); return;
          }
          if (text && text.length > 50) success(text);
          else error('native_empty');
        },
        function (e) {
          if (done) return; done = true; clearTimeout(tid);
          var s = (e && e.status) ? e.status : 0;
          var m = (e && e.message) ? e.message : String(e || '');
          if (s === 403 || m.indexOf('403') !== -1) {
            notyError('Worker 403'); error('worker_403'); return;
          }
          error(e || 'native_error');
        },
        false, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
      );
    } catch(ex) {
      if (done) return; done = true; clearTimeout(tid);
      error(ex.message);
    }
  }

  function _requestionRequest(url, success, error) {
    try {
      new Lampa.Reguest().silent(url,
        function (data) {
          var t = (typeof data === 'string') ? data : '';
          if (t.length > 50) success(t); else error('reguest_empty');
        },
        function (e) { error(e || 'reguest_error'); },
        false, { dataType: 'text', timeout: 10000 }
      );
    } catch(ex) { error(ex.message); }
  }

  function _fetchRequest(url, success, error) {
    if (typeof fetch === 'undefined') { error('no_fetch'); return; }
    fetch(url, { method: 'GET' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) { success(t); })
      .catch(function (e) { error(e); });
  }

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error, { type: 'html' });
      return;
    }
    _nativeRequest(url, success, function () {
      _requestionRequest(url, success, function () {
        _fetchRequest(url, success, function (fe) {
          notyError('Все методы исчерпаны');
          error(fe || 'all_failed');
        });
      });
    });
  }

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL
  // ----------------------------------------------------------
  var SORTS = [
    { title: 'Новинки',      val: 'new',  urlTpl: 'new/page{page}/'  },
    { title: 'Топ рейтинга', val: 'top',  urlTpl: 'top/page{page}/'  },
    { title: 'Популярное',   val: 'best', urlTpl: 'best/page{page}/' },
  ];

  var CATS = [
    { title: 'Русское порно',  val: 'russian' },
    { title: 'Анальный секс',  val: 'anal'    },
    { title: 'Лесбиянки',      val: 'lesbian' },
    { title: 'Зрелые',         val: 'mature'  },
    { title: 'Минет',          val: 'blowjob' },
    { title: 'Большие сиськи', val: 'big-tits'},
    { title: 'Молодые',        val: 'teen'    },
    { title: 'Домашнее',       val: 'amateur' },
    { title: 'Групповое',      val: 'group'   },
  ];

  function buildUrl(sort, cat, search, page) {
    page = parseInt(page, 10) || 1;
    if (search) return HOST + '/search/' + encodeURIComponent(search) + '/page' + page + '/';
    if (cat)    return HOST + '/' + cat + '/page' + page + '/';
    if (sort) {
      var s = arrayFind(SORTS, function (x) { return x.val === sort; }) || SORTS[0];
      return HOST + '/' + s.urlTpl.replace('{page}', page);
    }
    return HOST + '/'; // главная
  }

  // [1.5.0] Убираем query-параметры ПЕРЕД разбором пути
  function parseState(url) {
    var sort = '', cat = '', search = '';
    var clean = (url || '').replace(HOST, '').split('?')[0].replace(/^\//, '');

    if (clean.indexOf('search/') === 0) {
      search = decodeURIComponent(clean.split('/')[1] || '');
    } else {
      for (var i = 0; i < SORTS.length; i++) {
        if (clean.indexOf(SORTS[i].val + '/') === 0) { sort = SORTS[i].val; break; }
      }
      if (!sort) {
        for (var j = 0; j < CATS.length; j++) {
          if (clean.indexOf(CATS[j].val + '/') === 0) { cat = CATS[j].val; break; }
        }
      }
    }
    return { sort: sort, cat: cat, search: search };
  }

  // [1.5.0] BUGFIX: группы-подменю НЕ имеют playlist_url
  // Ранее playlist_url:'submenu' попадал в AdultJS.View.filter()
  // как URL страницы → попытка загрузить 'submenu' → script error
  function buildMenu(url) {
    var state   = parseState(url || '');
    var sortObj = arrayFind(SORTS, function (s) { return s.val === state.sort; }) || SORTS[0];
    var catObj  = arrayFind(CATS,  function (c) { return c.val === state.cat;  });

    var sortSubmenu = SORTS.map(function (s) {
      return { title: s.title, playlist_url: HOST + '/' + s.urlTpl.replace('{page}', '1') };
    });

    var catSubmenu = CATS.map(function (c) {
      return { title: c.title, playlist_url: HOST + '/' + c.val + '/page1/' };
    });

    return [
      { title: 'Поиск',    playlist_url: HOST, search_on: true },
      { title: 'Сортировка: ' + sortObj.title, submenu: sortSubmenu },
      { title: 'Категория: ' + (catObj ? catObj.title : 'Все'), submenu: catSubmenu },
    ];
  }

  // ----------------------------------------------------------
  // [1.5.0] _imgSrc — универсальный извлекатель src постера
  // Покрывает все lazy-load атрибуты pornobriz.com
  // ----------------------------------------------------------
  function _imgSrc(imgEl) {
    if (!imgEl) return '';
    return imgEl.getAttribute('data-original')  ||
           imgEl.getAttribute('data-src')        ||
           imgEl.getAttribute('data-lazy')       ||
           imgEl.getAttribute('data-thumb')      ||
           imgEl.getAttribute('data-original2')  ||
           imgEl.getAttribute('data-src2')       ||
           imgEl.getAttribute('data-webp')       ||
           imgEl.getAttribute('src')             || '';
  }

  // ----------------------------------------------------------
  // [1.5.0] _extractCard — расширен поиск превью, null-safe
  // ----------------------------------------------------------
  function _extractCard(el) {
    if (!el) return null;
    try {
      var aEl  = el.querySelector('a');
      var href = aEl ? (aEl.getAttribute('href') || '') : '';
      if (!href) return null;
      if (href.indexOf('http') !== 0) href = HOST + href;

      var name = '';
      var tEl  = el.querySelector('.th-title, .title, .name, h3, h4');
      if (tEl) name = (tEl.textContent || '').trim();
      if (!name && aEl) name = aEl.getAttribute('title') || '';
      if (!name)        name = (el.getAttribute('title') || '').trim();
      if (!name) return null;

      var picture = _imgSrc(el.querySelector('img'));

      // Превью: ищем data-preview / data-video / data-webm
      // сначала на самом элементе, потом внутри него
      var preview = el.getAttribute('data-preview') ||
                    el.getAttribute('data-video')   ||
                    el.getAttribute('data-webm')    || '';
      if (!preview) {
        var pEl = el.querySelector('[data-preview],[data-video],[data-webm]');
        if (pEl) {
          preview = pEl.getAttribute('data-preview') ||
                    pEl.getAttribute('data-video')   ||
                    pEl.getAttribute('data-webm')    || '';
        }
      }
      if (!preview) {
        var imgEl2 = el.querySelector('img');
        if (imgEl2) preview = imgEl2.getAttribute('data-webp') || '';
      }

      var durEl = el.querySelector('.duration, .time, .dur, .th-time');
      var time  = durEl ? (durEl.textContent || '').trim() : '';

      return {
        name:    name,
        video:   href,
        picture: picture,
        preview: preview || null,
        time:    time,
        quality: 'HD',
        json:    true,
        source:  NAME,
      };
    } catch(e) {
      warn('_extractCard исключение:', e.message);
      return null;
    }
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    if (!html) { warn('parsePlaylist → html пустой'); return []; }

    var doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
    catch(e) { err('DOMParser:', e.message); return []; }

    var cards = [];

    // Стратегия 1: XPath
    try {
      var nodes = doc.evaluate(
        "//div[contains(@class,'thumb_main') and .//a[@href]]",
        doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
      );
      for (var i = 0; i < nodes.snapshotLength; i++) {
        var c = _extractCard(nodes.snapshotItem(i));
        if (c) cards.push(c);
      }
    } catch(e) { warn('XPath:', e.message); }

    // Стратегия 2: CSS
    if (!cards.length) {
      var sels = ['.thumb_main', '.thumb-main', '.video-item', '.item'];
      for (var s = 0; s < sels.length; s++) {
        var els = doc.querySelectorAll(sels[s]);
        if (els.length) {
          forEachNode(els, function (el) { var c2 = _extractCard(el); if (c2) cards.push(c2); });
          if (cards.length) break;
        }
      }
    }

    // Стратегия 3: ссылки с картинками
    if (!cards.length) {
      forEachNode(doc.querySelectorAll('a[href]'), function (a) {
        try {
          var href = a.getAttribute('href') || '';
          var img  = a.querySelector('img');
          if (!img) return;
          if (href.indexOf('/video') === -1 && href.indexOf('/watch') === -1) return;
          if (href.indexOf('http') !== 0) href = HOST + href;
          var name = a.getAttribute('title') || (a.textContent || '').trim().substring(0, 80);
          if (!name || name.length < 3) return;
          cards.push({ name: name, video: href, picture: _imgSrc(img),
                       preview: null, time: '', quality: 'HD', json: true, source: NAME });
        } catch(e) {}
      });
    }

    if (!cards.length) {
      warn('parsePlaylist → карточки не найдены');
      if (doc.body) {
        warn('body[0:300]:', (doc.body.innerHTML || '').substring(0, 300));
      }
    } else {
      log('parsePlaylist → найдено:', cards.length);
      notySuccess('Найдено ' + cards.length + ' видео');
    }
    return cards;
  }

  // ----------------------------------------------------------
  // ПОЛУЧЕНИЕ ПРЯМЫХ ССЫЛОК
  // ----------------------------------------------------------
  function getStreamLinks(videoPageUrl, success, error) {
    httpGet(videoPageUrl, function (html) {
      var q = {}, sizes = ['1080','720','480','360','240'];

      for (var si = 0; si < sizes.length; si++) {
        var m = html.match(new RegExp('src="([^"]+)"\\s+type="video/mp4"\\s+size="' + sizes[si] + '"'));
        if (m && m[1]) q[sizes[si] + 'p'] = m[1];
      }

      if (!Object.keys(q).length) {
        for (var si2 = 0; si2 < sizes.length; si2++) {
          var sz = sizes[si2], m2;
          m2 = html.match(new RegExp('size="' + sz + '"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) { q[sz+'p'] = m2[1]; continue; }
          m2 = html.match(new RegExp('label="' + sz + 'p?"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) { q[sz+'p'] = m2[1]; continue; }
          m2 = html.match(new RegExp('res="' + sz + '"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) q[sz+'p'] = m2[1];
        }
      }

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

      if (!Object.keys(q).length) {
        var re4 = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
        var m4; var i4 = 0;
        while ((m4 = re4.exec(html)) !== null && i4 < 5) { q['auto'+(i4||'')] = m4[1]; i4++; }
      }

      if (!Object.keys(q).length) {
        var m5 = html.match(/["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
        if (m5) q['HLS'] = m5[1];
      }

      if (!Object.keys(q).length) { notyError('Нет ссылок на видео'); error('no_links'); return; }

      notySuccess('Качеств: ' + Object.keys(q).length);
      success({ qualitys: q });
    }, function (e) { notyError('Ошибка страницы видео'); error(e); });
  }

  // ----------------------------------------------------------
  // ПУБЛИЧНЫЙ ИНТЕРФЕЙС — весь в try/catch
  // ----------------------------------------------------------
  var BrizParser = {

    main: function (params, success, error) {
      log('main()', safeParams(params));
      try {
        httpGet(buildUrl('','','',1), function (html) {
          try {
            var r = parsePlaylist(html);
            if (!r.length) { error('no_cards'); return; }
            success({ results: r, collection: true, total_pages: 30, menu: buildMenu(HOST) });
          } catch(e) { err('main cb:', e.message); error(e.message); }
        }, error);
      } catch(e) { err('main:', e.message); error(e.message); }
    },

    view: function (params, success, error) {
      log('view()', safeParams(params));
      try {
        var rawUrl  = (params.url || HOST).replace(/[?&]pg=\d+/, '');
        var page    = parseInt(params.page, 10) || 1;
        var state   = parseState(rawUrl);
        var loadUrl = buildUrl(state.sort, state.cat, state.search, page);
        log('view() loadUrl:', loadUrl);

        httpGet(loadUrl, function (html) {
          try {
            var r = parsePlaylist(html);
            if (!r.length) { error('no_cards'); return; }
            success({
              results: r, collection: true,
              total_pages: r.length >= 20 ? page + 5 : page,
              menu: buildMenu(rawUrl),
            });
          } catch(e) { err('view cb:', e.message); error(e.message); }
        }, error);
      } catch(e) { err('view:', e.message); error(e.message); }
    },

    // [1.5.0] При пустом результате → success с пустым массивом,
    // не error() — иначе Lampa.Status роняет плагин
    search: function (params, success, error) {
      log('search()', params.query);
      try {
        httpGet(buildUrl('', '', params.query || '', 1), function (html) {
          try {
            var r = parsePlaylist(html);
            success({
              title:       'PornoBriz' + (r.length ? ': ' + params.query : ''),
              results:     r,
              url:         r.length ? HOST + '/search/' + encodeURIComponent(params.query||'') + '/page1/' : '',
              collection:  true,
              total_pages: r.length ? 6 : 1,
            });
          } catch(e) { err('search cb:', e.message); error(e.message); }
        }, function () {
          // Сеть недоступна — пустой результат
          success({ title: 'PornoBriz', results: [], collection: true, total_pages: 1 });
        });
      } catch(e) { err('search:', e.message); error(e.message); }
    },

    qualitys: function (videoUrl, success, error) {
      log('qualitys()', videoUrl);
      try { getStreamLinks(videoUrl, success, error); }
      catch(e) { err('qualitys:', e.message); error(e.message); }
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BrizParser);
      log('v1.5.0 зарегистрирован');
      notySuccess('PornoBriz v1.5.0 загружен');
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _elapsed = 0;
    var _timer = setInterval(function () {
      _elapsed += 100;
      if (tryRegister()) { clearInterval(_timer); }
      else if (_elapsed >= 10000) { clearInterval(_timer); notyError('Таймаут регистрации'); }
    }, 100);
  }

})();
