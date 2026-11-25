// =============================================================
// szpn.js — SexZoo (sexzoo.net) AdultJS
// Version  : 1.1.0
// [1.1.0] меню Категории → /ru/sexlist/{slug}/
// Каталог: /ru/movie/… + img mediacont.net
// Play: 247sexvideo.net …mp4 (не preview mediacont)
// Worker: sexzoo.net, 247sexvideo.net, mediacont.net
// NAME в меню: szpn (не sexzo)
// =============================================================
(function () {
  'use strict';
  var VERSION = '1.1.0';
  var NAME = 'szpn';
  var HOST = 'https://sexzoo.net';
  var TAG = '[szpn v' + VERSION + ']';

  var CATEGORIES = [
    { title: 'Интенсивный секс', slug: 'intense-sex' },
    { title: 'Лошади', slug: 'horse-zoo' },
    { title: 'Минет / deepthroat', slug: 'blowjob-deepthroat' },
    { title: 'Зоо секс видео', slug: 'zoo-sex-video' },
    { title: 'Зоофилия порно', slug: 'zoophilia-porn-video' },
    { title: 'Блондинки', slug: 'sexy-blondes' },
    { title: 'Собаки', slug: 'dog-zoo-sex' },
    { title: 'Животный секс', slug: 'animal-sex' },
    { title: 'Ферма', slug: 'farm-sex' },
    { title: 'Групповая зоофилия', slug: 'group-zoophilia' },
    { title: 'Анальный', slug: 'anal-bestiality' },
    { title: 'Горячая ебля', slug: 'hot-fucking' },
    { title: 'Клипы', slug: 'zoo-sex-clips' },
    { title: 'Бесплатное порно', slug: 'free-bestiality-porn' },
    { title: 'Порно с лошадьми', slug: 'free-horse-porn' }
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

  function parsePlaylist(html) {
    var results = [];
    var seen = {};
    var re = /href="(\/ru\/movie\/[^"]+)"/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var href = abs(m[1]);
      if (seen[href]) continue;
      seen[href] = 1;
      var slice = html.substring(m.index, m.index + 500);
      var pic = '';
      var im = slice.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|webp)[^"]*)"/i);
      if (im) pic = abs(im[1]);
      var name = '';
      var al = slice.match(/alt="([^"]*)"/);
      // title text after img
      var tm = slice.match(/>([^<]{5,120})<span>/);
      if (tm) name = tm[1].trim();
      if (!name && al && al[1].length > 3) name = al[1];
      if (!name) {
        var parts = href.replace(/\/$/, '').split('/');
        name = decodeURIComponent(parts[parts.length - 1] || 'Video').replace(/-/g, ' ');
      }
      name = name.replace(/\s+/g, ' ').trim();
      var dur = '';
      var dm = slice.match(/<span>(\d+:\d+)<\/span>/);
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
    // основной файл, не video_preview
    var re = /https?:\/\/247sexvideo\.net\/[^"'\s]+\.mp4[^"'\s]*/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      if (!q['HD']) q['HD'] = m[0];
    }
    if (!Object.keys(q).length) {
      re = /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi;
      while ((m = re.exec(html)) !== null) {
        if (/preview|video_preview|thumb/i.test(m[0])) continue;
        if (!q['HD']) q['HD'] = m[0];
      }
    }
    re = /<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/gi;
    while ((m = re.exec(html)) !== null) {
      var u = abs(m[1]);
      if (/preview/i.test(u)) continue;
      if (!q['HD']) q['HD'] = u;
    }
    return q;
  }

  function menu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новинки', playlist_url: NAME },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        })
      }
    ];
  }

  function loadList(url, page, success, error) {
    console.log(TAG, 'fetch', url);
    httpGet(url, function (html) {
      if (!html || html.length < 500) { error('SexZoo: страница недоступна'); return; }
      var results = parsePlaylist(html);
      if (!results.length) { error('SexZoo: нет карточек'); return; }
      success({
        results: results, collection: true,
        total_pages: results.length >= 20 ? page + 1 : page,
        menu: menu()
      });
    }, error);
  }

  var Parser = {
    main: function (p, s, e) { loadList(HOST + '/ru/', 1, s, e); },
    view: function (p, s, e) {
      var url = (p && p.url) || NAME;
      var page = parseInt((p && p.page) || 1, 10) || 1;
      if (url.indexOf(NAME + '/search/') === 0) {
        var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]);
        loadList(HOST + '/ru/?search=' + encodeURIComponent(q), page, s, e);
        return;
      }
      if (url.indexOf(NAME + '/cat/') === 0) {
        var slug = url.replace(NAME + '/cat/', '').split('?')[0];
        loadList(HOST + '/ru/sexlist/' + slug + '/', page, s, e);
        return;
      }
      loadList(HOST + '/ru/', page, s, e);
    },
    search: function (p, s, e) {
      var q = (p.query || '').trim();
      if (!q) { s({ results: [], collection: true, total_pages: 1 }); return; }
      loadList(HOST + '/ru/?search=' + encodeURIComponent(q), 1, function (d) {
        d.title = 'SexZoo: ' + q; s(d);
      }, e);
    },
    qualities: function (videoUrl, success, error) {
      console.log(TAG, 'qualities', videoUrl);
      httpGet(videoUrl, function (html) {
        var found = extractQualities(html || '');
        console.log(TAG, 'keys', Object.keys(found));
        if (Object.keys(found).length) success({ qualities: found });
        else error('SexZoo: mp4 не найден');
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
