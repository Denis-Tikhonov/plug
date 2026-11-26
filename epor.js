// =============================================================
// epor.js — EPORNER.ID AdultJS (Lampa)
// Version  : 2.0.0
// [2.0.0] Хост eporner.id (зеркало/агрегатор, не classic eporner.com)
//         Каталог: article.video-card[data-url|data-title|data-thumb]
//         Play: JSON mp4_high / mp4_low / hls на странице /watch-…
//         CDN: xxxvides.com, xnxx-cdn.com, cdn.xxxvides.com
// Worker ALLOWED_TARGETS:
//   'eporner.id', 'xxxvides.com', 'cdn.xxxvides.com', 'xnxx-cdn.com'
//   (поддомены mp4-cdn77 / hls-cdn77 / thumb-cdn77 через endsWith xnxx-cdn.com)
// Feasibility: B — прямой mp4 с secure-токеном; CF на Worker для eporner.id
//              может давать 403 — нужен whitelist + при блоке VPN/direct.
// =============================================================
(function () {
  'use strict';
  var VERSION = '2.0.0';
  var NAME = 'epor';
  var HOST = 'https://eporner.id';
  var TAG = '[epor v' + VERSION + ']';

  var CATEGORIES = [
    { title: 'Amateur', slug: 'Amateur' },
    { title: 'Anal', slug: 'Anal' },
    { title: 'Asian', slug: 'Asian' },
    { title: 'BBC', slug: 'Bbc' },
    { title: 'BBW', slug: 'Bbw' },
    { title: 'BDSM', slug: 'Bdsm' },
    { title: 'Big Ass', slug: 'Big%20Ass' },
    { title: 'Big Tits', slug: 'Big%20Tits' },
    { title: 'Blonde', slug: 'Blonde' },
    { title: 'Blowjob', slug: 'Blowjob' },
    { title: 'Brunette', slug: 'Brunette' },
    { title: 'Creampie', slug: 'Creampie' },
    { title: 'Cumshot', slug: 'Cumshot' },
    { title: 'Ebony', slug: 'Ebony' },
    { title: 'Hardcore', slug: 'Hardcore' },
    { title: 'Hentai', slug: 'Hentai' },
    { title: 'Lesbian', slug: 'Lesbian' },
    { title: 'MILF', slug: 'Milf' },
    { title: 'POV', slug: 'Pov' },
    { title: 'Teen', slug: 'Teen' },
    { title: 'Threesome', slug: 'Threesome' }
  ];

  function httpGet(url, success, error) {
    if (window.AdultPlugin && window.AdultPlugin.networkRequest) {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  function abs(u) {
    if (!u) return '';
    u = String(u).replace(/&amp;/g, '&').trim();
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (/^https?:\/\//i.test(u)) return u;
    if (u.charAt(0) === '/') return HOST + u;
    return HOST + '/' + u;
  }

  /** data-url может быть /watch-… или https://xxxvides.com/watch-… */
  function videoHref(raw) {
    var u = abs(raw);
    if (u.indexOf('/watch-') === -1 && u.indexOf('watch-') === -1) return u;
    // предпочитаем eporner.id (тот же контент)
    try {
      var path = u.replace(/^https?:\/\/[^/]+/i, '');
      if (path.indexOf('/watch-') === 0) return HOST + path;
    } catch (e) {}
    return u;
  }

  function parsePlaylist(html) {
    var results = [];
    var seen = {};
    // SSR: data-атрибуты на article.video-card
    var re = /<article[^>]*class="[^"]*video-card[^"]*"[^>]*>/gi;
    var m;
    var blocks = [];
    while ((m = re.exec(html)) !== null) {
      var start = m.index;
      var end = html.indexOf('</article>', start);
      if (end === -1) end = start + 1200;
      blocks.push(html.substring(start, end + 10));
    }
    // fallback: data-url=
    if (!blocks.length) {
      re = /data-url="([^"]*watch-[^"]+)"/gi;
      while ((m = re.exec(html)) !== null) {
        blocks.push(html.substring(Math.max(0, m.index - 80), m.index + 600));
      }
    }

    for (var i = 0; i < blocks.length; i++) {
      var slice = blocks[i];
      var urlM = slice.match(/data-url="([^"]+)"/i);
      if (!urlM) continue;
      var href = videoHref(urlM[1]);
      if (!href || seen[href]) continue;
      if (href.indexOf('watch-') === -1) continue;
      seen[href] = 1;

      var name = '';
      var tm = slice.match(/data-title="([^"]+)"/i);
      if (tm) name = tm[1];
      if (!name) {
        var al = slice.match(/alt="([^"]{3,160})"/i);
        if (al) name = al[1];
      }
      if (!name) name = 'Video';

      var pic = '';
      var pm = slice.match(/data-thumb="([^"]+)"/i) ||
               slice.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|webp)[^"]*)"/i);
      if (pm) pic = abs(pm[1]);

      var dur = '';
      var dm = slice.match(/data-duration="([^"]+)"/i) ||
               slice.match(/video-duration[^>]*>([^<]+)/i);
      if (dm) dur = String(dm[1]).replace(/\s+/g, ' ').trim();

      var q = '';
      var qm = slice.match(/data-quality="([^"]+)"/i);
      if (qm) q = qm[1];

      results.push({
        name: name.replace(/\s+/g, ' ').trim(),
        video: href,
        picture: pic,
        img: pic,
        poster: pic,
        background_image: pic,
        time: dur,
        quality: q || 'HD',
        json: true,
        source: NAME
      });
    }
    console.log(TAG, 'cards', results.length);
    return results;
  }

  function extractQualities(html) {
    var q = {};
    function add(label, url) {
      if (!url || q[label]) return;
      url = url.replace(/\\u0026/g, '&').replace(/\\"/g, '"');
      if (/preview\.mp4|thumb|xn_\d+_t/i.test(url)) return;
      q[label] = url;
    }
    var high = html.match(/"mp4_high"\s*:\s*"(https?:[^"]+)"/i);
    var low = html.match(/"mp4_low"\s*:\s*"(https?:[^"]+)"/i);
    var sd = html.match(/"mp4_sd"\s*:\s*"(https?:[^"]+)"/i);
    var hls = html.match(/"hls"\s*:\s*"(https?:[^"]+\.m3u8[^"]*)"/i);
    if (high) add('720p', high[1]);
    if (sd) add('480p', sd[1]);
    if (low) add('360p', low[1]);
    // fallback any progressive (not preview)
    if (!Object.keys(q).length) {
      var re = /https?:\/\/mp4-[^"'\s]+\.mp4\?[^"'\s]+/gi;
      var m;
      while ((m = re.exec(html)) !== null) {
        add('HD', m[0]);
        break;
      }
    }
    if (hls && !Object.keys(q).length) add('HLS', hls[1]);
    else if (hls && Object.keys(q).length) { /* progressive preferred */ }
    return q;
  }

  function menu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Популярное', playlist_url: NAME + '/popular' },
      { title: '🆕 Новые', playlist_url: NAME },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        })
      }
    ];
  }

  function listUrl(kind, page, extra) {
    page = parseInt(page, 10) || 1;
    if (kind === 'popular') {
      return page > 1 ? HOST + '/popular/' + page : HOST + '/popular';
    }
    if (kind === 'cat' && extra) {
      var base = HOST + '/category/' + extra;
      return page > 1 ? base + '/' + page : base;
    }
    if (kind === 'search' && extra) {
      var q = encodeURIComponent(extra);
      return page > 1 ? HOST + '/search/' + q + '/' + page : HOST + '/search/' + q;
    }
    return page > 1 ? HOST + '/?page=' + page : HOST + '/';
  }

  function loadList(url, page, success, error) {
    console.log(TAG, 'fetch', url);
    httpGet(url, function (html) {
      if (!html || html.length < 400) {
        error('EPORNER.ID: страница недоступна (возможен блок CF/Worker)');
        return;
      }
      if (html.length < 2000 && /fromCharCode|challenge|cf-|just a moment/i.test(html)) {
        error('EPORNER.ID: CF challenge — Worker IP заблокирован, нужен VPN или другой proxy');
        return;
      }
      var results = parsePlaylist(html);
      if (!results.length) {
        error('EPORNER.ID: нет карточек');
        return;
      }
      success({
        results: results,
        collection: true,
        total_pages: results.length >= 12 ? page + 1 : page,
        menu: menu()
      });
    }, error);
  }

  var Parser = {
    main: function (p, s, e) {
      loadList(listUrl('new', 1), 1, s, e);
    },
    view: function (p, s, e) {
      var url = (p && p.url) || NAME;
      var page = parseInt((p && p.page) || 1, 10) || 1;
      if (url.indexOf(NAME + '/search/') === 0) {
        var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0].split('/')[0]);
        loadList(listUrl('search', page, q), page, s, e);
        return;
      }
      if (url.indexOf(NAME + '/cat/') === 0) {
        var slug = url.replace(NAME + '/cat/', '').split('?')[0];
        loadList(listUrl('cat', page, slug), page, s, e);
        return;
      }
      if (url.indexOf(NAME + '/popular') === 0) {
        loadList(listUrl('popular', page), page, s, e);
        return;
      }
      loadList(listUrl('new', page), page, s, e);
    },
    search: function (p, s, e) {
      var q = (p.query || '').trim();
      if (!q) {
        s({ results: [], collection: true, total_pages: 1 });
        return;
      }
      loadList(listUrl('search', 1, q), 1, function (d) {
        d.title = 'EPORNER.ID: ' + q;
        s(d);
      }, e);
    },
    qualities: function (videoUrl, success, error) {
      console.log(TAG, 'qualities', videoUrl);
      httpGet(videoUrl, function (html) {
        if (!html || html.length < 400) {
          error('EPORNER.ID: страница видео недоступна');
          return;
        }
        var found = extractQualities(html);
        console.log(TAG, 'keys', Object.keys(found));
        if (Object.keys(found).length) {
          success({ qualities: found });
        } else {
          error('EPORNER.ID: поток не найден');
        }
      }, error);
    }
  };

  function reg() {
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
      window.AdultPlugin.registerParser(NAME, Parser);
      console.log(TAG, 'OK');
      return true;
    }
    return false;
  }
  if (!reg()) {
    var t = 0;
    var id = setInterval(function () {
      if (reg() || (t += 200) > 5000) clearInterval(id);
    }, 200);
  }
})();
