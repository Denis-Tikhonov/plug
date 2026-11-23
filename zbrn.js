// =============================================================
// zbrn.js — ZBPorn (zbporn.com) для AdultJS
// Version  : 1.2.0
// Changes  :
//   [1.2.0] FIX категории: URL /categories/{slug}/ и /{page}/
//           (раньше /?c=slug → одни и те же ролики).
//           FIX постеры: URL из <picture> srcset + img src;
//           только карточки с /videos/ (не performers).
//   [1.1.1] селекторы .th.th-i, getPoster
//   [1.1.0] submenu категории/студии
// =============================================================
(function () {
  'use strict';
  var VERSION = '1.2.0';
  var NAME    = 'zbrn';
  var HOST    = 'https://zbporn.com';
  var TAG     = '[zbrn v1.2.0]';

  var VIDEO_RULES = [
    { label: '720p', re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/ },
    { label: '360p', re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/ },
    { label: 'HLS',  re: /['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/ },
  ];

  var CATEGORIES = [
    { title: 'Blowjobs', slug: 'blowjobs' },
    { title: 'Babes', slug: 'babes' },
    { title: 'Big Tits', slug: 'big-tits' },
    { title: 'Brunettes', slug: 'brunettes' },
    { title: 'Teens (18+)', slug: 'teens' },
    { title: 'Big Asses', slug: 'big-asses' },
    { title: 'HD Videos', slug: 'hd-videos' },
    { title: 'Blondes', slug: 'blondes' },
    { title: 'Big Cocks', slug: 'big-cocks' },
    { title: 'Pornstars', slug: 'pornstars' },
    { title: 'Amateur', slug: 'amateur' },
    { title: 'Anal', slug: 'anal' },
    { title: 'Asian', slug: 'asian' },
    { title: 'BBW', slug: 'bbw' },
    { title: 'BDSM', slug: 'bdsm' },
    { title: 'Creampie', slug: 'creampie' },
    { title: 'Cumshots', slug: 'cumshots' },
    { title: 'Facials', slug: 'facials' },
    { title: 'Hardcore', slug: 'hardcore' },
    { title: 'Indian', slug: 'indian' },
    { title: 'Interracial', slug: 'interracial' },
    { title: 'Japanese', slug: 'japanese' },
    { title: 'Latin', slug: 'latin' },
    { title: 'Lesbians', slug: 'lesbians' },
    { title: 'MILFs', slug: 'milfs' },
    { title: 'Masturbation', slug: 'masturbation' },
    { title: 'Matures', slug: 'matures' },
    { title: 'Solo', slug: 'solo' },
    { title: 'Redheads', slug: 'redheads' },
  ];

  var CHANNELS = [
    { title: 'Brazzers', slug: 'brazzers' },
    { title: 'Family Strokes', slug: 'family-strokes' },
    { title: 'Team Skeet', slug: 'team-skeet' },
    { title: 'Digital Playground', slug: 'digital-playground' },
    { title: 'Dad Crush', slug: 'dad-crush' },
    { title: 'Sis Loves Me', slug: 'sis-loves-me' },
  ];

  function httpGet(url, s, e) {
    if (window.AdultPlugin && window.AdultPlugin.networkRequest) {
      window.AdultPlugin.networkRequest(url, s, e);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(s).catch(e);
    }
  }

  function cleanUrl(r) {
    if (!r) return '';
    try {
      var u = String(r).replace(/\\\//g, '/').replace(/\\/g, '').replace(/&amp;/g, '&').trim();
      if (u.indexOf('%') !== -1) { try { u = decodeURIComponent(u); } catch (e) {} }
      if (u.indexOf('//') === 0) u = 'https:' + u;
      if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
      return u;
    } catch (e) { return r; }
  }

  function firstSrcsetUrl(srcset) {
    if (!srcset) return '';
    // "url1 264w, url2 396w" → url1
    var part = String(srcset).split(',')[0].trim();
    return part.split(/\s+/)[0] || '';
  }

  function getPoster(el) {
    if (!el) return '';
    var pic = '';

    // 1) jpeg source srcset (надёжнее на TV с <picture>)
    var sources = el.querySelectorAll('source');
    var i, ss, type;
    for (i = 0; i < sources.length; i++) {
      type = (sources[i].getAttribute('type') || '').toLowerCase();
      ss = sources[i].getAttribute('srcset') || '';
      if (type.indexOf('jpeg') !== -1 || type.indexOf('jpg') !== -1 || !type) {
        pic = firstSrcsetUrl(ss);
        if (pic) break;
      }
    }
    if (!pic) {
      for (i = 0; i < sources.length; i++) {
        pic = firstSrcsetUrl(sources[i].getAttribute('srcset') || '');
        if (pic) break;
      }
    }

    // 2) img
    if (!pic) {
      var img = el.querySelector('img');
      if (img) {
        pic = img.getAttribute('data-original') ||
              img.getAttribute('data-src') ||
              img.getAttribute('src') || '';
      }
    }

    pic = cleanUrl(pic);
    if (!pic || pic.indexOf('data:') === 0 || pic.length < 12) return '';
    if (/spacer|blank|pixel|logo|flag|models\//i.test(pic)) return '';
    return pic;
  }

  function extractQualities(html) {
    var q = {}, add = function (l, u) {
      var c = cleanUrl(u);
      if (c && c.indexOf('{') === -1 && !q[l]) q[l] = c;
    };
    VIDEO_RULES.forEach(function (r) {
      var m = html.match(r.re);
      if (m && m[1]) add(r.label, m[1]);
    });
    if (!Object.keys(q).length) {
      var a = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi);
      if (a) a.forEach(function (u, i) { add('HD' + (i || ''), u); });
    }
    return q;
  }

  function makeCard(n, h, p, t) {
    return {
      name: n,
      video: h,
      picture: p || '',
      img: p || '',
      poster: p || '',
      background_image: p || '',
      preview: null,
      time: t || '',
      quality: 'HD',
      json: true,
      source: NAME,
    };
  }

  function parseCard(el) {
    var a = el.querySelector('a[href*="/videos/"]');
    if (!a && el.tagName === 'A' && (el.getAttribute('href') || '').indexOf('/videos/') !== -1) {
      a = el;
    }
    if (!a) return null;

    var href = cleanUrl(a.getAttribute('href') || '');
    if (!href || href.indexOf('/videos/') === -1) return null;

    var pic = getPoster(el) || getPoster(a);

    var name = (a.getAttribute('title') || '').trim();
    if (!name) {
      var tEl = el.querySelector('.th-row-title, .title, .th-title, .name');
      if (tEl) name = tEl.textContent.replace(/\s+/g, ' ').trim();
    }
    if (!name) {
      var img = el.querySelector('img');
      if (img) name = (img.getAttribute('alt') || '').trim();
    }
    if (!name) return null;

    var d = el.querySelector('.th-duration, [class*="duration"], .time');
    var time = d ? d.textContent.replace(/[^\d:]/g, '').trim() : '';
    return makeCard(name, href, pic, time);
  }

  function parsePlaylist(html) {
    var res = [], seen = {}, doc, items, i, c;
    try {
      doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
      return res;
    }

    // Видео-карточки: .th внутри .thumbs (не модели)
    items = doc.querySelectorAll('.thumbs .th.th-i, .thumbs .th, div.th-image');
    if (!items || !items.length) {
      items = doc.querySelectorAll('a.th-image-link[href*="/videos/"], a[href*="/videos/"]');
    }

    for (i = 0; i < items.length; i++) {
      c = parseCard(items[i]);
      if (c && !seen[c.video]) {
        seen[c.video] = true;
        res.push(c);
      }
    }
    console.log(TAG, 'parsePlaylist →', res.length, res[0] ? res[0].picture.substring(0, 60) : '');
    return res;
  }

  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    var url = HOST;
    if (type === 'search') {
      url += '/search/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'cat') {
      // РЕАЛЬНЫЙ путь сайта: /categories/{slug}/ и /categories/{slug}/2/
      url += '/categories/' + value + '/';
      if (page > 1) url += page + '/';
    } else if (type === 'channel') {
      url += '/channels/' + value + '/';
      if (page > 1) url += page + '/';
    } else {
      url += '/';
      if (page > 1) url += '?page=' + page;
    }
    return url;
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новинки', playlist_url: NAME + '/main' },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
      {
        title: '🎬 Студии',
        playlist_url: 'submenu',
        submenu: CHANNELS.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/channel/' + c.slug };
        }),
      },
    ];
  }

  function routeView(url, page, success, error) {
    page = parseInt(page, 10) || 1;
    var fetchUrl;
    var sm = url.match(/[?&]search=([^&]*)/);

    if (sm) {
      fetchUrl = buildUrl('search', decodeURIComponent(sm[1]), page);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      fetchUrl = buildUrl('cat', url.replace(NAME + '/cat/', '').split('?')[0].split('/')[0], page);
    } else if (url.indexOf(NAME + '/channel/') === 0) {
      fetchUrl = buildUrl('channel', url.replace(NAME + '/channel/', '').split('?')[0].split('/')[0], page);
    } else if (url.indexOf(NAME + '/search/') === 0) {
      var rq = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      fetchUrl = buildUrl('search', rq, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log(TAG, 'fetch →', fetchUrl);
    httpGet(fetchUrl, function (html) {
      var r = parsePlaylist(html);
      if (!r.length) { error('ZBPorn: ничего не найдено'); return; }
      success({
        results: r,
        collection: true,
        total_pages: r.length >= 24 ? page + 1 : page,
        menu: buildMenu(),
      });
    }, error);
  }

  var ZBParser = {
    main: function (p, s, e) { routeView(NAME + '/main', 1, s, e); },
    view: function (p, s, e) { routeView(p.url || NAME, p.page || 1, s, e); },
    search: function (p, s, e) {
      var q = (p.query || '').trim();
      var pg = parseInt(p.page, 10) || 1;
      if (!q) { s({ results: [], collection: true, total_pages: 1 }); return; }
      httpGet(buildUrl('search', q, pg), function (html) {
        var r = parsePlaylist(html);
        s({ title: 'ZBPorn: ' + q, results: r, collection: true, total_pages: r.length >= 24 ? pg + 1 : pg, menu: buildMenu() });
      }, e);
    },
    qualities: function (vUrl, s, e) {
      httpGet(vUrl, function (html) {
        if (!html || html.length < 500) { e('Недоступно'); return; }
        var f = extractQualities(html);
        var k = Object.keys(f);
        if (k.length) s({ qualities: f });
        else e('Видео не найдено');
      }, e);
    },
  };

  function tryReg() {
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
      window.AdultPlugin.registerParser(NAME, ZBParser);
      console.log(TAG, 'OK');
      return true;
    }
    return false;
  }
  if (!tryReg()) {
    var t = 0, id = setInterval(function () {
      t += 200;
      if (tryReg() || t > 6000) clearInterval(id);
    }, 200);
  }
})();
