(function () {
  'use strict';

  var AI_GENERATOR = {
    name: 'Chad Auto Model',
    generator: 'Custom',
    version: '1.0.0',
    template: 'UNIVERSAL_TEMPLATE',
    template_version: '1.4.0',
    generated: '2024-05-22',
    purpose: 'adultjs_parser',
  };

  var MIN_CORE_VERSION = '1.6.0';

  // ============================================================
  // §1. КОНФИГ
  // ============================================================
  var SITE_NAME = 'winporn.com';
  var HOST      = 'https://www.winporn.com';
  var NAME      = 'winpo'; // Сгенерировано: w + inpo
  var VERSION   = '1.1.0';
  var TAG       = '[' + NAME + ']';

  // Категории (можно дополнить из сайта)
  var CATEGORIES = [
    { title: 'Wife', slug: 'wife' },
    { title: 'Amateur', slug: 'amateur' },
    { title: 'Anal', slug: 'anal' },
    { title: 'POV', slug: 'pov' }
  ];

  // ============================================================
  // §5. ИЗВЛЕЧЕНИЕ КАЧЕСТВА (Система стратегий)
  // ============================================================
  function extractQualities(html, url) {
    var q = {};
    var checked = [];

    function add(label, src) {
      if (!src) return;
      var clean = cleanUrl(src);
      var res = label.toString().toLowerCase();
      
      // Логика определения метки качества
      var lab = 'SD';
      if (res.indexOf('1080') !== -1 || res.indexOf('hd') !== -1) lab = '1080p';
      else if (res.indexOf('720') !== -1) lab = '720p';
      else if (res.indexOf('480') !== -1) lab = '480p';
      else if (label === 'auto') lab = 'HD';
      else lab = label.toUpperCase();

      q[lab] = clean;
    }

    function have() { return Object.keys(q).length > 0; }

    // S2. Прямые ссылки .mp4 (основная стратегия для winporn согласно json)
    if (!have()) {
      var mp4matches = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi);
      if (mp4matches) {
        mp4matches.forEach(function(link, i) {
          // Исключаем превью-ролики, если они есть в коде
          if (link.indexOf('tmb') === -1) {
             add('src' + i, link);
          }
        });
      }
    }
    checked.push({ s: 2, name: 'direct_mp4', found: have() });

    // S12. KVS-style video_url patterns
    if (!have()) {
      var vurl = html.match(/video_url:\s*['"]([^'"]+)['"]/i);
      if (vurl) add('HD', vurl[1]);
    }

    return { qualities: q, checked: checked };
  }

  // ============================================================
  // §6. ПАРСИНГ КАРТОЧЕК
  // ============================================================
  var CARD_SELECTORS = ['.thumb', 'div.thumb'];

  function parsePlaylist(html) {
    if (!html) return [];
    var results = [];
    var temp = document.createElement('div');
    temp.innerHTML = html;

    var items = temp.querySelectorAll(CARD_SELECTORS.join(','));
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var linkEl = item.querySelector('a[href*="/video/"]');
      if (!linkEl) continue;

      var href = cleanUrl(linkEl.getAttribute('href'));
      var imgEl = item.querySelector('img');
      var pic = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : '';
      
      var titleEl = item.querySelector('[class*="title"]');
      var name = titleEl ? titleEl.textContent.trim() : 'Video';
      
      var durEl = item.querySelector('[class*="duration"]');
      var time = durEl ? durEl.textContent.trim() : '';

      results.push({
        name: name,
        video: href,
        picture: cleanUrl(pic),
        time: time,
        quality: 'HD',
        source: NAME
      });
    }
    return results;
  }

  // ============================================================
  // §7. URL BUILDER
  // ============================================================
  function buildUrl(type, value, page) {
    var p = parseInt(page, 10) || 1;
    var base = HOST;
    var pg = p > 1 ? '?page=' + p : '';

    if (type === 'search') return base + '/?q=' + encodeURIComponent(value) + (p > 1 ? '&page=' + p : '');
    if (type === 'cat') return base + '/?c=' + value + (p > 1 ? '&page=' + p : '');
    return base + '/' + pg;
  }

  // ============================================================
  // ТРАНСПОРТ И РОУТИНГ (Стандарт из шаблона)
  // ============================================================
  function httpGet(url, success, error) {
    if (window.AdultPlugin && window.AdultPlugin.networkRequest) {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function(r){return r.text()}).then(success).catch(error);
    }
  }

  function cleanUrl(raw) {
    if (!raw) return '';
    var u = raw.replace(/\\\//g, '/').replace(/\\/g, '');
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  var MyParser = {
    main: function (params, success, error) {
      this.view({ url: NAME + '/new', page: 1 }, success, error);
    },
    view: function (params, success, error) {
      var p = params.page || 1;
      var url = buildUrl('main', null, p);
      
      if (params.url.indexOf('/cat/') !== -1) {
        url = buildUrl('cat', params.url.split('/cat/')[1], p);
      } else if (params.url.indexOf('search=') !== -1) {
        url = buildUrl('search', params.url.split('search=')[1], p);
      }

      httpGet(url, function (html) {
        var results = parsePlaylist(html);
        success({
          results: results,
          collection: true,
          total_pages: results.length >= 20 ? p + 1 : p,
          menu: [
            { title: 'Поиск', search_on: true, playlist_url: NAME + '/search/' },
            { title: 'Категории', playlist_url: 'submenu', submenu: CATEGORIES.map(function(c){ 
                return { title: c.title, playlist_url: NAME + '/cat/' + c.slug }; 
              }) 
            }
          ]
        });
      }, error);
    },
    search: function (params, success, error) {
      var p = params.page || 1;
      httpGet(buildUrl('search', params.query, p), function (html) {
        var res = parsePlaylist(html);
        success({ results: res, collection: true });
      }, error);
    },
    qualities: function (videoPageUrl, success, error) {
      httpGet(videoPageUrl, function (html) {
        var data = extractQualities(html, videoPageUrl);
        if (Object.keys(data.qualities).length > 0) success(data.qualities);
        else error('Не удалось найти видео');
      }, error);
    }
  };

  if (window.AdultPlugin) window.AdultPlugin.registerParser(NAME, MyParser);
})();
