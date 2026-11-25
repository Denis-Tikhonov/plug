// =============================================================
// ptop.js — PornTop (porntop.com) AdultJS
// Version  : 1.1.0
// [1.1.0] полный поток: api/videofile.php + decode get_file (не preview)
//         категории /category/{slug}/l/
// Worker: porntop.com, m3pd.com, pttn.m3pd.com
// =============================================================
(function () {
  'use strict';
  var VERSION = '1.1.0';
  var NAME = 'ptop';
  var HOST = 'https://porntop.com';
  var TAG = '[ptop v' + VERSION + ']';

  var CATEGORIES = [
    { title: 'HD', slug: 'hd' },
    { title: 'Big Tits', slug: 'big-tits' },
    { title: 'MILF', slug: 'milf' },
    { title: 'Brunette', slug: 'brunette' },
    { title: 'Blonde', slug: 'blonde' },
    { title: 'Anal', slug: 'anal' },
    { title: 'Lesbian', slug: 'lesbian' },
    { title: 'Teen', slug: 'teen' },
    { title: 'Asian', slug: 'asian' },
    { title: 'Hardcore', slug: 'hardcore' },
    { title: 'Big Butt', slug: 'big-butt' },
    { title: 'Deep Throat', slug: 'deep-throat' }
  ];

  // Cyrillic lookalikes → Latin (обфускация video_url)
  var CYR = {
    '\u0410': 'A', '\u0412': 'B', '\u0415': 'E', '\u041a': 'K', '\u041c': 'M',
    '\u041d': 'H', '\u041e': 'O', '\u0420': 'P', '\u0421': 'C', '\u0422': 'T',
    '\u0425': 'X', '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p',
    '\u0441': 'c', '\u0445': 'x', '\u0443': 'y'
  };

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

  function decodeVideoUrl(obf) {
    if (!obf) return '';
    var s = '';
    for (var i = 0; i < obf.length; i++) s += CYR[obf.charAt(i)] || obf.charAt(i);
    s = s.replace(/~/g, '=');
    var parts = s.split(',');
    var path = '';
    var query = '';
    try {
      var p0 = parts[0];
      var pad = p0 + '==='.slice(0, (4 - p0.length % 4) % 4);
      path = atob(pad);
    } catch (e) { return ''; }
    if (parts[1]) {
      try {
        var p1 = parts[1];
        var pad1 = p1 + '==='.slice(0, (4 - p1.length % 4) % 4);
        query = atob(pad1);
      } catch (e2) {}
    }
    if (!path) return '';
    var url = abs(path);
    if (query) url += (url.indexOf('?') >= 0 ? '&' : '?') + query;
    return url;
  }

  function parsePlaylist(html) {
    var results = [];
    var seen = {};
    var re = /href="(\/video\/(\d+)\/[^"]+\/)"/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var href = abs(m[1]);
      if (seen[href]) continue;
      seen[href] = 1;
      var id = m[2];
      var slug = (m[1].split('/')[3] || 'Video').replace(/-/g, ' ');
      var name = decodeURIComponent(slug);
      name = name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      var slice = html.substring(m.index, m.index + 900);
      var im = slice.match(/(?:data-src|data-original|src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|webp)[^"]*)"/i);
      var pic = im ? abs(im[1]) : ('https://pttn.m3pd.com/media/tn/' + id + '_1.jpg');
      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time: '', quality: 'HD', json: true, source: NAME
      });
    }
    console.log(TAG, 'cards', results.length);
    return results;
  }

  function menu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новинки', playlist_url: NAME },
      {
        title: '📂 Категории', playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        })
      }
    ];
  }

  function loadList(url, page, success, error) {
    console.log(TAG, 'fetch', url);
    httpGet(url, function (html) {
      if (!html || html.length < 500) { error('PornTop: страница недоступна'); return; }
      var results = parsePlaylist(html);
      if (!results.length) { error('PornTop: нет карточек'); return; }
      success({
        results: results, collection: true,
        total_pages: results.length >= 24 ? page + 1 : page,
        menu: menu()
      });
    }, error);
  }

  var Parser = {
    main: function (p, s, e) { loadList(HOST + '/', 1, s, e); },
    view: function (p, s, e) {
      var url = (p && p.url) || NAME;
      var page = parseInt((p && p.page) || 1, 10) || 1;
      if (url.indexOf(NAME + '/cat/') === 0) {
        var slug = url.replace(NAME + '/cat/', '').split('?')[0];
        loadList(HOST + '/category/' + slug + '/l/' + (page > 1 ? '?page=' + page : ''), page, s, e);
        return;
      }
      if (url.indexOf(NAME + '/search/') === 0) {
        var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]);
        loadList(HOST + '/search/?q=' + encodeURIComponent(q), page, s, e);
        return;
      }
      loadList(page > 1 ? (HOST + '/videos.php?p=' + page) : (HOST + '/'), page, s, e);
    },
    search: function (p, s, e) {
      var q = (p.query || '').trim();
      if (!q) { s({ results: [], collection: true, total_pages: 1 }); return; }
      loadList(HOST + '/search/?q=' + encodeURIComponent(q), 1, function (d) {
        d.title = 'PornTop: ' + q; s(d);
      }, e);
    },
    qualities: function (videoUrl, success, error) {
      console.log(TAG, 'qualities', videoUrl);
      var idm = (videoUrl || '').match(/\/video\/(\d+)\//);
      if (!idm) { error('PornTop: нет ID'); return; }
      var id = idm[1];
      var api = HOST + '/api/videofile.php?video_id=' + id;
      httpGet(api, function (text) {
        var q = {};
        try {
          var arr = JSON.parse(text);
          if (arr && arr.length) {
            for (var i = 0; i < arr.length; i++) {
              var it = arr[i];
              var decoded = decodeVideoUrl(it.video_url);
              if (!decoded) continue;
              var lab = 'HD';
              var fmt = String(it.format || '');
              if (/_hq|_hd|1080|720/.test(fmt)) lab = 'HD';
              if (/_lq|360|240/.test(fmt)) lab = 'LQ';
              if (/_(\d{3,4})p/.test(fmt)) lab = RegExp.$1 + 'p';
              if (!q[lab]) q[lab] = decoded;
              console.log(TAG, 'decoded', lab, decoded.substring(0, 90));
            }
          }
        } catch (e) {
          console.warn(TAG, 'videofile JSON', e.message || e);
        }
        if (!Object.keys(q).length) {
          error('PornTop: get_file не декодирован');
          return;
        }
        success({ qualities: q });
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
