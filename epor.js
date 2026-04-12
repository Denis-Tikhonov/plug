// =============================================================
// eporner.js — Парсер EPorner для AdultJS / AdultPlugin (Lampa)
// Version  : 1.0.0
// Changed  : [1.0.0] Первая версия.
//            Логика портирована из AdultJS_debug_v1.3.2 [BLOCK:11].
//            EPorner — один из немногих сайтов без Cloudflare,
//            отвечает на прямые GET-запросы с Android TV.
//            Парсинг каталога: regex по <div class="mb">.
//            Парсинг видео: два запроса — страница → xhr/video API.
// =============================================================

(function () {
  'use strict';

  var HOST = 'https://www.eporner.com';
  var NAME = 'eporner';

  // ----------------------------------------------------------
  // [1.0.0] HTTP — загрузка HTML/JSON
  // Основной путь: Lampa.Reguest.silent с dataType:'text'.
  // Fallback: чистый fetch без User-Agent (forbidden header).
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    try {
      var net = new Lampa.Reguest();
      net.silent(
        url,
        function (data) {
          if (typeof data === 'string' && data.length > 50) {
            success(data);
          } else {
            _fallback(url, success, error);
          }
        },
        function () { _fallback(url, success, error); },
        false,
        { dataType: 'text', timeout: 12000 }
      );
    } catch (e) { _fallback(url, success, error); }
  }

  function _fallback(url, success, error) {
    if (typeof fetch === 'undefined') { error('fetch unavailable'); return; }
    fetch(url, { method: 'GET' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(success).catch(error);
  }

  // ----------------------------------------------------------
  // [1.0.0] REGEX-ХЕЛПЕР
  // ----------------------------------------------------------
  function rx(str, regex, group) {
    if (!str) return null;
    var g = group === undefined ? 1 : group;
    var m = str.match(regex);
    var v = m && m[g] !== undefined ? m[g] : null;
    return v && v.trim() ? v.trim() : null;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПОСТРОЕНИЕ URL КАТАЛОГА
  // Источник: EPorner.buildUrl() из [BLOCK:11]
  //
  // Маршруты:
  //   поиск:    /search/{query}/{page}/[sort/]
  //   категория: /cat/{cat}/[page/]
  //   главная:  /[page/][sort/]
  //
  // search_url: /search/{query}/?pg=N
  // cat_url:    /?c={cat}&pg=N
  // main_url:   /?sort={sort}&pg=N
  // ----------------------------------------------------------
  function buildUrl(search, sort, cat, page) {
    var base = HOST + '/';
    if (search) {
      base += 'search/' + encodeURIComponent(search) + '/';
      if (page > 1) base += page + '/';
      if (sort)     base += sort + '/';
      return base;
    }
    if (cat) {
      base += 'cat/' + cat + '/';
      if (page > 1) base += page + '/';
      return base;
    }
    if (page > 1) base += page + '/';
    if (sort)     base += sort + '/';
    return base;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПАРСИНГ КАТАЛОГА
  // Источник: EPorner.Playlist() из [BLOCK:11]
  //
  // Структура карточки:
  //   <div class="mb [hdy]"> — блок карточки (hdy = HD)
  //   <p class="mbtit"><a href="/video-...">title</a>
  //   data-src="..."         — картинка
  //   data-id="..."          — ID для превью: {pic_base}/{id}-preview.webm
  //   <span class="mbtim">   — длительность
  //   <div class="mvhdico">  — метка качества
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    if (!html) return [];

    // Убираем "рекомендованные" блоки в начале и "похожие" в конце
    var body = html;
    if (body.includes('class="toptopbelinset"'))
      body = body.split('class="toptopbelinset"')[1];
    if (body.includes('class="relatedtext"'))
      body = body.split('class="relatedtext"')[1];

    var blocks = body.split(/<div class="mb (hdy)?"/);
    var cards  = [];

    for (var i = 1; i < blocks.length; i++) {
      var b = blocks[i];

      // Ссылка и заголовок
      var m = /<p class="mbtit">\s*<a href="\/([^"]+)">([^<]+)<\/a>/i.exec(b);
      if (!m || !m[1] || !m[2]) continue;

      var href  = HOST + '/' + m[1];
      var name  = m[2].trim();

      // Картинка
      var pic = rx(b, / data-src="([^"]+)"/) || rx(b, /<img src="([^"]+)"/) || '';

      // Превью: {base}/{id}-preview.webm
      var dataId  = rx(b, /data-id="([^"]+)"/);
      var preview = (pic && dataId)
        ? pic.replace(/\/[^/]+$/, '') + '/' + dataId + '-preview.webm'
        : null;

      // Длительность
      var dur = rx(b, /<span class="mbtim"[^>]*>([^<]+)<\/span>/, 1) || '';

      // Качество (из mvhdico)
      var qual = rx(b, /<div class="mvhdico"[^>]*><span>([^<]+)/, 1) || '';

      cards.push({
        name:    name,
        video:   href,     // страница видео; json:true → нужен второй запрос
        picture: pic,
        preview: preview,
        time:    dur,
        quality: qual,
        json:    true,     // нужен xhr/video API для получения .mp4
        related: true,
        model:   null,
        source:  NAME,
      });
    }
    return cards;
  }

  // ----------------------------------------------------------
  // [1.0.0] КОНВЕРТАЦИЯ HASH → base36
  // Источник: EPorner.convertHash() + base36() из [BLOCK:11]
  // Нужен для подписи запроса к xhr/video API.
  // ----------------------------------------------------------
  function base36(hexStr) {
    var n = parseInt(hexStr, 16);
    var chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    var result = '';
    while (n > 0) {
      result = chars[n % 36] + result;
      n = Math.floor(n / 36);
    }
    return result || '0';
  }

  function convertHash(hash) {
    return base36(hash.substring(0, 8))
         + base36(hash.substring(8, 16))
         + base36(hash.substring(16, 24))
         + base36(hash.substring(24, 32));
  }

  // ----------------------------------------------------------
  // [1.0.0] ПОЛУЧЕНИЕ ПРЯМЫХ ССЫЛОК НА ВИДЕО
  // Источник: EPorner.StreamLinks() из [BLOCK:11]
  //
  // Шаги:
  //   1. GET страницы видео → ищем vid='...' и hash='...'
  //   2. GET /xhr/video/{vid}?hash={convertHash(hash)}&... → JSON
  //   3. Парсим JSON: "src":"...720p.mp4" → { "720p": url, ... }
  //
  // Этот метод вызывается из Lampa при воспроизведении (json:true).
  // В нашей архитектуре AdultPlugin он вызывается через view() при
  // переходе на страницу карточки.
  // ----------------------------------------------------------
  function getStreamLinks(videoPageUrl, success, error) {
    httpGet(videoPageUrl, function (html) {
      var vid  = rx(html, /vid ?= ?'([^']+)'/);
      var hash = rx(html, /hash ?= ?'([^']+)'/);

      if (!vid || !hash) { error('EPorner: vid/hash не найдены'); return; }

      var apiUrl = HOST + '/xhr/video/' + vid
        + '?hash='   + convertHash(hash)
        + '&domain=' + HOST.replace(/^https?:\/\//, '')
        + '&fallback=false&embed=false&supportedFormats=dash,mp4'
        + '&_='      + Math.floor(Date.now() / 1000);

      httpGet(apiUrl, function (json) {
        var qualitys = {};
        var re = /"src":\s*"(https?:\/\/[^/]+\/[^"]+-([0-9]+p)\.mp4)",/g;
        var match;
        while ((match = re.exec(json)) !== null) {
          qualitys[match[2]] = match[1];
        }
        if (!Object.keys(qualitys).length) { error('EPorner: нет mp4 URL'); return; }
        success(qualitys);
      }, error);
    }, error);
  }

  // ----------------------------------------------------------
  // [1.0.0] МЕНЮ ФИЛЬТРА
  // Источник: EPorner.Menu() из [BLOCK:11]
  // ----------------------------------------------------------
  var SORTS = [
    { title: 'Новинки',        val: '' },
    { title: 'Топ просмотра',  val: 'most-viewed' },
    { title: 'Топ рейтинга',   val: 'top-rated' },
    { title: 'Длинные',        val: 'longest' },
    { title: 'Короткие',       val: 'shortest' },
  ];

  var CATS = [
    { title: 'Все',        val: '' },
    { title: '4K UHD',     val: '4k-porn' },
    { title: '60 FPS',     val: '60fps' },
    { title: 'Amateur',    val: 'amateur' },
    { title: 'Anal',       val: 'anal' },
    { title: 'Asian',      val: 'asian' },
    { title: 'ASMR',       val: 'asmr' },
    { title: 'BBW',        val: 'bbw' },
    { title: 'BDSM',       val: 'bdsm' },
    { title: 'Big Ass',    val: 'big-ass' },
    { title: 'Big Dick',   val: 'big-dick' },
    { title: 'Big Tits',   val: 'big-tits' },
    { title: 'Teen',       val: 'teens' },
    { title: 'Threesome',  val: 'threesome' },
    { title: 'Mature',     val: 'mature' },
    { title: 'MILF',       val: 'milf' },
  ];

  function buildMenu(search, sort, cat) {
    var sortTitle   = (SORTS.find(function (s) { return s.val === sort; }) || SORTS[0]).title;
    var catTitle    = (CATS.find(function (c) { return c.val === cat; })   || CATS[0]).title;
    var items       = [{ title: 'Поиск', playlist_url: HOST, search_on: true }];

    // Подменю сортировки — зависит от режима (поиск / категория / обычный)
    var sortItems = SORTS.map(function (s) {
      var u = HOST + '?sort=' + s.val + (search ? '&search=' + encodeURIComponent(search) : '') + (cat ? '&c=' + cat : '');
      return { title: s.title, playlist_url: u };
    });
    items.push({ title: 'Сортировка: ' + sortTitle, playlist_url: 'submenu', submenu: sortItems });

    // Подменю категорий (только вне поиска)
    if (!search) {
      var catItems = CATS.map(function (c) {
        var u = HOST + '?c=' + c.val + (sort ? '&sort=' + sort : '');
        return { title: c.title, playlist_url: u };
      });
      items.push({ title: 'Категория: ' + catTitle, playlist_url: 'submenu', submenu: catItems });
    }

    return items;
  }

  // ----------------------------------------------------------
  // [1.0.0] РАЗБОР ПАРАМЕТРОВ ИЗ URL
  // params.url может содержать ?sort=...&c=...&search=...&pg=N
  // ----------------------------------------------------------
  function parseParams(url) {
    try {
      var u = new URL(url.indexOf('http') === 0 ? url : HOST + url);
      return {
        search: u.searchParams.get('search') || '',
        sort:   u.searchParams.get('sort')   || '',
        cat:    u.searchParams.get('c')      || '',
        page:   parseInt(u.searchParams.get('pg') || u.searchParams.get('page') || '1', 10),
      };
    } catch (e) {
      return { search: '', sort: '', cat: '', page: 1 };
    }
  }

  // ----------------------------------------------------------
  // [1.0.0] ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ----------------------------------------------------------
  var EpornerParser = {

    main: function (params, success, error) {
      httpGet(HOST + '/', function (html) {
        var results = parsePlaylist(html);
        if (!results.length) { error('EPorner: нет карточек'); return; }
        success({ results: results, collection: true, total_pages: 30, menu: buildMenu('', '', '') });
      }, error);
    },

    view: function (params, success, error) {
      var url = params.url || HOST;
      // Убираем Lampa-пагинацию (?pg=N / &pg=N)
      var cleanUrl = url.replace(/[?&]pg=\d+/, '');
      var p        = parseParams(cleanUrl);
      var page     = parseInt(params.page, 10) || p.page || 1;
      var loadUrl  = buildUrl(p.search, p.sort, p.cat, page);

      httpGet(loadUrl, function (html) {
        var results = parsePlaylist(html);
        if (!results.length) { error('EPorner: нет карточек'); return; }
        // Определяем есть ли следующая страница по наличию nav
        var hasNext = html.indexOf('class="pager') !== -1 && html.indexOf('>' + (page + 1) + '<') !== -1;
        success({
          results:     results,
          collection:  true,
          total_pages: hasNext ? page + 5 : page,
          menu:        buildMenu(p.search, p.sort, p.cat),
        });
      }, error);
    },

    search: function (params, success, error) {
      var query = params.query || '';
      var page  = parseInt(params.page, 10) || 1;
      var url   = buildUrl(query, '', '', page);

      httpGet(url, function (html) {
        var results = parsePlaylist(html);
        if (!results.length) { error('EPorner: ничего не найдено'); return; }
        success({
          title:       'EPorner: ' + query,
          results:     results,
          url:         HOST + '?search=' + encodeURIComponent(query),
          collection:  true,
          total_pages: page + 5,
        });
      }, error);
    },

    // [1.0.0] Получение прямых ссылок — вызывается при воспроизведении
    // когда карточка имеет json:true
    qualitys: function (videoUrl, success, error) {
      getStreamLinks(videoUrl, function (qualitys) {
        success({ qualitys: qualitys });
      }, error);
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] РЕГИСТРАЦИЯ с polling
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, EpornerParser);
      console.log('[eporner] v1.0.0 registered OK');
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
