// =============================================================
// briz.js — Парсер PornoBriz для AdultJS / AdultPlugin (Lampa)
// Version  : 1.1.0
// Changed  : [1.0.0]
//            [1.1.0] FIX: httpGet переписан с XHR (Lampa.Reguest.silent игнорирует dataType:text)
//            [1.1.0] FIX: добавлено поле hide:false в карточки (обязательное для Lampa) Первая версия.
//            Конфиг взят из AdultJS_debug_v1.3.2 [BLOCK:13] nexthub P[].
//            PornoBriz — русскоязычный сайт без Cloudflare,
//            прямые GET-запросы работают с Android TV.
//
// Структура URL:
//   Главная:    /new/page1/
//   Категория:  /{cat}/page{N}/
//   Сортировка: /top/page{N}/ | /best/page{N}/
//   Поиск:      /search/{query}/page{N}/
//
// Структура карточек (XPath из contentParse):
//   nodes:    //div[contains(@class,'thumb_main')]
//   name:     .//div[@class='th-title']
//   href:     .//a @href
//   img:      .//img @data-original
//   duration: .//div[@class='duration']
//   preview:  .//video @data-preview
//
// Получение видео (regexMatch из view):
//   src="(...)" type="video/mp4" size="720|480|240"
// =============================================================

(function () {
  'use strict';

  var HOST = 'https://pornobriz.com';
  var NAME = 'briz';

  // ----------------------------------------------------------
  // [1.0.0] HTTP
  // ----------------------------------------------------------
  // [1.1.0] HTTP — XHR напрямую (заменяет Lampa.Reguest.silent)
  // Причина: silent() игнорирует dataType:'text' и всегда JSON.parse()
  // → HTML-ответ вызывает error callback → парсер не получает данные.
  // XHR не имеет авто-парсинга, работает на Android TV WebView без CORS.
  function httpGet(url, success, error) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 12000;
      xhr.responseType = 'text';
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          var resp = xhr.responseText || '';
          if (resp.length > 50) { success(resp); }
          else { error('Empty response'); }
        } else { error('HTTP ' + xhr.status); }
      };
      xhr.onerror   = function () { _fallback(url, success, error); };
      xhr.ontimeout = function () { error('XHR timeout'); };
      xhr.send();
    } catch (e) { _fallback(url, success, error); }
  }

  function _fallback(url, success, error) {
    if (typeof fetch === 'undefined') { error('fetch unavailable'); return; }
    fetch(url, { method: 'GET' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) { if (t && t.length > 50) success(t); else error('Empty fetch'); })
      .catch(error);
  }

  // ----------------------------------------------------------
  // [1.0.0] ПОСТРОЕНИЕ URL
  // Источник: contentParse.route из AdultJS_debug [BLOCK:13] PornoBriz
  //
  // Шаблоны:
  //   list:   /new/page{N}/
  //   sort:   /{sort}      (sort уже содержит page: "top/page{N}/")
  //   cat:    /{cat}/page{N}/
  //   search: /search/{query}/page{N}/
  // ----------------------------------------------------------
  var SORTS = [
    { title: 'Новинки',      val: '',    urlTpl: 'new/page{page}/'  },
    { title: 'Топ рейтинга', val: 'top', urlTpl: 'top/page{page}/'  },
    { title: 'Популярное',   val: 'best',urlTpl: 'best/page{page}/' },
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
    page = page || 1;
    if (search) {
      return HOST + '/search/' + encodeURIComponent(search) + '/page' + page + '/';
    }
    if (cat) {
      return HOST + '/' + cat + '/page' + page + '/';
    }
    var sortObj = SORTS.find(function (s) { return s.val === sort; }) || SORTS[0];
    return HOST + '/' + sortObj.urlTpl.replace('{page}', page);
  }

  // ----------------------------------------------------------
  // [1.0.0] ПАРСИНГ КАТАЛОГА
  // Использует DOMParser + XPath (как NextHub-движок в AdultJS).
  //
  // nodes: //div[contains(@class,'thumb_main')]
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    if (!html) return [];
    var doc   = new DOMParser().parseFromString(html, 'text/html');
    var cards = [];

    // XPath: все блоки карточек
    var nodes = doc.evaluate(
      "//div[contains(@class,'thumb_main')]",
      doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
    );

    for (var i = 0; i < nodes.snapshotLength; i++) {
      var el = nodes.snapshotItem(i);

      // Ссылка
      var aEl  = el.querySelector('a');
      var href = aEl ? aEl.getAttribute('href') : '';
      if (!href) continue;
      if (href.indexOf('http') !== 0) href = HOST + href;

      // Название
      var titleEl = el.querySelector('.th-title');
      var name    = titleEl ? titleEl.textContent.trim() : '';
      if (!name && aEl) name = aEl.getAttribute('title') || '';
      if (!name) continue;

      // Картинка: data-original
      var imgEl   = el.querySelector('img');
      var picture = imgEl ? (imgEl.getAttribute('data-original') || imgEl.getAttribute('src') || '') : '';

      // Превью: video[data-preview]
      var vidEl   = el.querySelector('video');
      var preview = vidEl ? (vidEl.getAttribute('data-preview') || '') : '';

      // Длительность
      var durEl   = el.querySelector('.duration');
      var time    = durEl ? durEl.textContent.trim() : '';

      cards.push({
        name:    name,
        video:   href,
        picture: picture,
        preview: preview || null,
        time:    time,
        quality: 'HD',
        json:    true,   // нужна страница для поиска mp4
        hide:    false,
        related: true,
        model:   null,
        source:  NAME,
      });
    }

    // Fallback: если XPath не сработал — CSS-селектор
    if (!cards.length) {
      doc.querySelectorAll('.thumb_main, .thumb-main, .video-item').forEach(function (el) {
        var aEl  = el.querySelector('a');
        var href = aEl ? aEl.getAttribute('href') : '';
        if (!href) return;
        if (href.indexOf('http') !== 0) href = HOST + href;
        var titleEl = el.querySelector('.th-title, .title, h3');
        var name    = titleEl ? titleEl.textContent.trim() : (aEl ? aEl.getAttribute('title') || '' : '');
        if (!name) return;
        var imgEl   = el.querySelector('img');
        var picture = imgEl ? (imgEl.getAttribute('data-original') || imgEl.getAttribute('src') || '') : '';
        var durEl   = el.querySelector('.duration, .time');
        cards.push({
          name: name, video: href, picture: picture,
          preview: null, time: durEl ? durEl.textContent.trim() : '',
          quality: 'HD', json: true, related: true, model: null, source: NAME,
        });
      });
    }

    return cards;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПОЛУЧЕНИЕ ПРЯМЫХ ССЫЛОК
  // Источник: view.regexMatch из AdultJS_debug [BLOCK:13] PornoBriz
  //
  // Паттерн: src="(...)" type="video/mp4" size="720|480|240"
  // ----------------------------------------------------------
  function getStreamLinks(videoPageUrl, success, error) {
    httpGet(videoPageUrl, function (html) {
      var qualitys = {};
      var sizes    = ['1080', '720', '480', '360', '240'];
      sizes.forEach(function (size) {
        var m = html.match(new RegExp('src="([^"]+)"\\s+type="video/mp4"\\s+size="' + size + '"'));
        if (m && m[1]) qualitys[size + 'p'] = m[1];
      });
      if (!Object.keys(qualitys).length) {
        // Fallback: ищем любые .mp4 в source
        var re = /src="(https?:\/\/[^"]+\.mp4[^"]*)"/g;
        var m2, idx = 0;
        while ((m2 = re.exec(html)) !== null && idx < 3) {
          qualitys['auto' + (idx || '')] = m2[1];
          idx++;
        }
      }
      if (!Object.keys(qualitys).length) { error('PornoBriz: нет mp4'); return; }
      success({ qualitys: qualitys });
    }, error);
  }

  // ----------------------------------------------------------
  // [1.0.0] МЕНЮ ФИЛЬТРА
  // ----------------------------------------------------------
  function parseState(url) {
    // Определяем sort/cat/search из URL
    var sort = '', cat = '', search = '';
    var path = url.replace(HOST, '').replace(/^\//, '');

    if (path.startsWith('search/')) {
      search = decodeURIComponent(path.split('/')[1] || '');
    } else {
      SORTS.forEach(function (s) {
        if (s.val && path.startsWith(s.val + '/')) sort = s.val;
      });
      if (!sort) {
        CATS.forEach(function (c) {
          if (path.startsWith(c.val + '/')) cat = c.val;
        });
      }
    }
    return { sort: sort, cat: cat, search: search };
  }

  function buildMenu(url) {
    var state    = parseState(url || '');
    var sortObj  = SORTS.find(function (s) { return s.val === state.sort; }) || SORTS[0];
    var catObj   = CATS.find(function (c)  { return c.val === state.cat;  });

    var items = [{ title: 'Поиск', playlist_url: HOST, search_on: true }];

    // Подменю сортировки
    items.push({
      title:        'Сортировка: ' + sortObj.title,
      playlist_url: 'submenu',
      submenu:      SORTS.map(function (s) {
        return { title: s.title, playlist_url: HOST + '/' + s.urlTpl.replace('{page}', '1') };
      }),
    });

    // Подменю категорий
    items.push({
      title:        'Категория: ' + (catObj ? catObj.title : 'Все'),
      playlist_url: 'submenu',
      submenu:      CATS.map(function (c) {
        return { title: c.title, playlist_url: HOST + '/' + c.val + '/page1/' };
      }),
    });

    return items;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ----------------------------------------------------------
  var BrizParser = {

    main: function (params, success, error) {
      httpGet(buildUrl('', '', '', 1), function (html) {
        var results = parsePlaylist(html);
        if (!results.length) { error('PornoBriz: нет карточек'); return; }
        success({ results: results, collection: true, total_pages: 30, menu: buildMenu(HOST) });
      }, error);
    },

    view: function (params, success, error) {
      var rawUrl = (params.url || HOST).replace(/[?&]pg=\d+/, '');
      var page   = parseInt(params.page, 10) || 1;
      var state  = parseState(rawUrl);

      // Строим URL с правильной пагинацией
      var loadUrl = buildUrl(state.sort, state.cat, state.search, page);

      httpGet(loadUrl, function (html) {
        var results = parsePlaylist(html);
        if (!results.length) { error('PornoBriz: нет карточек'); return; }
        success({
          results:     results,
          collection:  true,
          total_pages: results.length >= 20 ? page + 5 : page,
          menu:        buildMenu(rawUrl),
        });
      }, error);
    },

    search: function (params, success, error) {
      var query = params.query || '';
      var page  = parseInt(params.page, 10) || 1;
      httpGet(buildUrl('', '', query, page), function (html) {
        var results = parsePlaylist(html);
        if (!results.length) { error('PornoBriz: ничего не найдено'); return; }
        success({
          title:       'PornoBriz: ' + query,
          results:     results,
          url:         HOST + '/search/' + encodeURIComponent(query) + '/page1/',
          collection:  true,
          total_pages: page + 5,
        });
      }, error);
    },

    qualitys: function (videoUrl, success, error) {
      getStreamLinks(videoUrl, success, error);
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BrizParser);
      console.log('[briz] v1.0.0 registered OK');
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _e = 0, _t = setInterval(function () {
      _e += 100;
      if (tryRegister() || _e >= 10000) clearInterval(_t);
    }, 100);
  }

})();
