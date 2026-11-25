// =============================================================
// pone.js — PornOne (pornone.com) AdultJS
// Version  : 1.1.0
// [1.1.0] постеры data-src/src; категории /categories/; qualities source mp4
// Worker: pornone.com, th-*.pornone.com, s*.pornone.com
// =============================================================
(function () {
  'use strict';
  var VERSION = '1.1.0';
  var NAME = 'pone';
  var HOST = 'https://pornone.com';
  var TAG = '[pone v' + VERSION + ']';

  var CATEGORIES = [
    { title: 'Amateur', slug: 'amateur' },
    { title: 'Anal', slug: 'anal' },
    { title: 'Asian', slug: 'asian' },
    { title: 'Blonde', slug: 'blonde' },
    { title: 'Brunette', slug: 'brunette' },
    { title: 'Ebony', slug: 'ebony' },
    { title: 'Hardcore', slug: 'hardcore' },
    { title: 'Lesbian', slug: 'lesbian' },
    { title: 'MILF', slug: 'milf' },
    { title: 'Teen', slug: 'teen' },
    { title: 'Threesome', slug: 'threesome' },
    { title: 'Big Tits', slug: 'big-tits' }
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
    // videocard / vidLinkFX links ending with /digits/
    var re = /href="(https:\/\/pornone\.com\/[^"]+\/\d+\/)"[^>]*class="[^"]*vid(?:eo)?card[^"]*"/gi;
    var m;
    var matches = [];
    while ((m = re.exec(html)) !== null) matches.push({ href: m[1], index: m.index });
    if (!matches.length) {
      re = /href="(https:\/\/pornone\.com\/[^"]+\/\d+\/)"/gi;
      while ((m = re.exec(html)) !== null) {
        if (m[1].indexOf('/search/') !== -1) continue;
        matches.push({ href: m[1], index: m.index });
      }
    }
    for (var i = 0; i < matches.length; i++) {
      var href = abs(matches[i].href);
      if (seen[href]) continue;
      seen[href] = 1;
      var slice = html.substring(matches[i].index, matches[i].index + 1200);
      var pic = '';
      var im = slice.match(/data-src="(https?:\/\/[^"]+\.(?:jpg|jpeg|webp)[^"]*)"/i) ||
               slice.match(/src="(https?:\/\/th-[^"]+\.(?:jpg|jpeg|webp)[^"]*)"/i) ||
               slice.match(/src="(https?:\/\/[^"]*pornone[^"]*\.(?:jpg|jpeg|webp)[^"]*)"/i);
      if (im) pic = abs(im[1]);
      var name = '';
      var al = slice.match(/alt="([^"]{3,120})"/);
      if (al) name = al[1];
      if (!name) {
        var parts = href.replace(/\/$/, '').split('/');
        name = decodeURIComponent(parts[parts.length - 2] || 'Video').replace(/-/g, ' ');
      }
      name = name.replace(/\s+/g, ' ').trim();
      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time: '', quality: 'HD', json: true, source: NAME
      });
    }
    console.log(TAG, 'cards', results.length);
    return results;
  }

  function extractQualities(html) {
    var q = {};
    var re = /<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var u = abs(m[1]);
      var lab = 'HD';
      if (/1080|1920/.test(u)) lab = '1080p';
      else if (/720/.test(u)) lab = '720p';
      else if (/480|406/.test(u)) lab = '480p';
      if (!q[lab]) q[lab] = u;
    }
    if (!Object.keys(q).length) {
      re = /https?:\/\/s\d+\.pornone\.com\/[^"'\s]+\.mp4[^"'\s]*/gi;
      while ((m = re.exec(html)) !== null) {
        var u2 = m[0];
        var lab2 = /1080|1920/.test(u2) ? '1080p' : (/720/.test(u2) ? '720p' : 'HD');
        if (!q[lab2]) q[lab2] = u2;
      }
    }
    return q;
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
      if (!html || html.length < 500) { error('PornOne: страница недоступна'); return; }
      var results = parsePlaylist(html);
      if (!results.length) { error('PornOne: нет карточек'); return; }
      success({
        results: results, collection: true,
        total_pages: results.length >= 20 ? page + 1 : page,
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
        loadList(HOST + '/' + slug + '/' + (page > 1 ? page + '/' : ''), page, s, e);
        return;
      }
      if (url.indexOf(NAME + '/search/') === 0) {
        var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]);
        loadList(HOST + '/search/videos/' + encodeURIComponent(q) + (page > 1 ? '/' + page + '/' : '/'), page, s, e);
        return;
      }
      loadList(page > 1 ? (HOST + '/' + page + '/') : (HOST + '/'), page, s, e);
    },
    search: function (p, s, e) {
      var q = (p.query || '').trim();
      if (!q) { s({ results: [], collection: true, total_pages: 1 }); return; }
      loadList(HOST + '/search/videos/' + encodeURIComponent(q) + '/', 1, function (d) {
        d.title = 'PornOne: ' + q; s(d);
      }, e);
    },
    qualities: function (videoUrl, success, error) {
      console.log(TAG, 'qualities', videoUrl);
      httpGet(videoUrl, function (html) {
        var found = extractQualities(html || '');
        console.log(TAG, 'keys', Object.keys(found));
        if (Object.keys(found).length) success({ qualities: found });
        else error('PornOne: поток не найден');
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
