// =============================================================
// scpr.js — Video-Scat (video-scat.com) AdultJS
// Version  : 1.1.0
// [1.1.0] Категории /ru/{slug}/best|new/
// Каталог: div.th + /pornvideos?url=/ru/videos/… → нормализация
// Play: direct mp4 (scatporn.club)
// Worker: video-scat.com, scatporn.club
// =============================================================
(function () {
  'use strict';
  var VERSION = '1.1.0';
  var NAME = 'scpr';
  var HOST = 'https://video-scat.com';
  var TAG = '[scpr v' + VERSION + ']';

  var CATEGORIES = [
    { title: 'Дерьмо', slug: 'shit' },
    { title: 'Моча', slug: 'piss' },
    { title: 'Проникновение', slug: 'penetration' },
    { title: 'Оргия', slug: 'orgy' },
    { title: 'Рвота', slug: 'puking' },
    { title: 'Милфы', slug: 'milf' },
    { title: 'Какашка', slug: 'poop' },
    { title: 'Молоденькие', slug: 'teen' },
    { title: 'Жены', slug: 'wife' },
    { title: 'Зрелые', slug: 'mature' },
    { title: 'На публике', slug: 'public' },
    { title: 'На природе', slug: 'outdoor' },
    { title: 'Мастурбация', slug: 'masturbating' },
    { title: 'Белье', slug: 'lingerie' },
    { title: 'Трусики', slug: 'panties' },
    { title: 'Рыжие', slug: 'redhead' },
    { title: 'В рот', slug: 'mouth' },
    { title: 'Письки', slug: 'pussy' },
    { title: 'Колготки', slug: 'pantyhose' },
    { title: 'Брюки', slug: 'pants' }
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
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  /** /pornvideos?url=/ru/videos/slug/ → https://video-scat.com/ru/videos/slug/ */
  function normalizeVideoHref(href) {
    href = abs(href);
    var m = href.match(/[?&]url=([^&]+)/);
    if (m) {
      var path = decodeURIComponent(m[1]);
      if (path.indexOf('/videos/') !== -1 || path.indexOf('/ru/') === 0) return abs(path);
    }
    if (href.indexOf('/videos/') !== -1) return href.split('?')[0];
    return href;
  }

  function parsePlaylist(html) {
    var results = [];
    var seen = {};
    // ссылки на ролики
    var re = /href="([^"]*?(?:\/videos\/|pornvideos\?url=)[^"]+)"/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var href = normalizeVideoHref(m[1]);
      if (!href || href.indexOf('/videos/') === -1) continue;
      if (seen[href]) continue;
      seen[href] = 1;
      var slice = html.substring(m.index, m.index + 700);
      var name = '';
      var al = slice.match(/alt="([^"]{3,120})"/);
      if (al) name = al[1];
      if (!name) {
        var tm = slice.match(/class="th-title"[^>]*>([^<]+)/i);
        if (tm) name = tm[1];
      }
      if (!name) {
        var parts = href.replace(/\/$/, '').split('/');
        name = decodeURIComponent(parts[parts.length - 1] || 'Video').replace(/-/g, ' ');
      }
      name = name.replace(/\s+/g, ' ').trim();
      var pic = '';
      var im = slice.match(/data-original="([^"]+)"/i) ||
               slice.match(/src="(https?:\/\/[^"]*\/tmb\/[^"]+)"/i) ||
               slice.match(/src="(https?:\/\/video-scat\.com\/[^"]+\.(?:jpg|jpeg|webp)[^"]*)"/i);
      if (im) pic = abs(im[1]);
      var dur = '';
      var dm = slice.match(/th-duration[^>]*>[\s\S]*?(\d+:\d+)/);
      if (dm) dur = dm[1];
      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time: dur, quality: 'HD', json: true, source: NAME
      });
    }
    console.log(TAG, 'cards', results.length);
    return results;
  }

  function extractQualities(html) {
    var q = {};
    var re = /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var u = m[0];
      if (/preview|thumb|tmb/i.test(u)) continue;
      var lab = 'HD';
      if (!q[lab]) q[lab] = u;
    }
    re = /<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/gi;
    while ((m = re.exec(html)) !== null) {
      if (!q['HD']) q['HD'] = abs(m[1]);
    }
    return q;
  }

  function menu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🆕 Новые', playlist_url: NAME + '/new' },
      { title: '🔥 Лучшие', playlist_url: NAME + '/best' },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        })
      }
    ];
  }

  function listUrl(kind, page) {
    page = parseInt(page, 10) || 1;
    if (kind === 'best') return HOST + '/ru/all/best/' + page + '/';
    if (kind === 'long') return HOST + '/ru/all/long/' + page + '/';
    return HOST + '/ru/all/new/' + page + '/';
  }

  function loadList(url, page, success, error) {
    console.log(TAG, 'fetch', url);
    httpGet(url, function (html) {
      if (!html || html.length < 500) { error('VideoScat: страница недоступна'); return; }
      var results = parsePlaylist(html);
      if (!results.length) { error('VideoScat: нет карточек'); return; }
      success({
        results: results, collection: true,
        total_pages: results.length >= 20 ? page + 1 : page,
        menu: menu()
      });
    }, error);
  }

  var Parser = {
    main: function (p, s, e) { loadList(listUrl('new', 1), 1, s, e); },
    view: function (p, s, e) {
      var url = (p && p.url) || NAME;
      var page = parseInt((p && p.page) || 1, 10) || 1;
      if (url.indexOf(NAME + '/search/') === 0) {
        var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]);
        loadList(HOST + '/ru/?q=' + encodeURIComponent(q), page, s, e);
        return;
      }
      if (url.indexOf(NAME + '/cat/') === 0) {
        var slug = url.replace(NAME + '/cat/', '').split('?')[0];
        loadList(HOST + '/ru/' + slug + '/best/' + page + '/', page, s, e);
        return;
      }
      if (url.indexOf(NAME + '/best') === 0) { loadList(listUrl('best', page), page, s, e); return; }
      if (url.indexOf(NAME + '/new') === 0 || url === NAME) { loadList(listUrl('new', page), page, s, e); return; }
      loadList(listUrl('new', page), page, s, e);
    },
    search: function (p, s, e) {
      var q = (p.query || '').trim();
      if (!q) { s({ results: [], collection: true, total_pages: 1 }); return; }
      loadList(HOST + '/ru/?q=' + encodeURIComponent(q), 1, function (d) {
        d.title = 'VideoScat: ' + q; s(d);
      }, e);
    },
    qualities: function (videoUrl, success, error) {
      console.log(TAG, 'qualities', videoUrl);
      httpGet(videoUrl, function (html) {
        var found = extractQualities(html || '');
        console.log(TAG, 'keys', Object.keys(found));
        if (Object.keys(found).length) success({ qualities: found });
        else error('VideoScat: mp4 не найден');
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
    var t = 0, id = setInterval(function () { if (reg() || (t += 200) > 5000) clearInterval(id); }, 200);
  }
})();
