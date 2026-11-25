// =============================================================
// ptop.js — PornTop (porntop.com) для AdultJS
// Version  : 1.0.0
// Каталог: /video/{id}/{slug}/
// Превью: ptpv.m3pd.com (qualities — best-effort)
// Worker: porntop.com, m3pd.com
// =============================================================
(function () {
  'use strict';
  var VERSION = '1.0.0';
  var NAME = 'ptop';
  var HOST = 'https://porntop.com';
  var TAG = '[ptop v' + VERSION + ']';

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
    var re = /href="(\/video\/(\d+)\/[^"]+\/)"/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var href = abs(m[1]);
      if (seen[href]) continue;
      seen[href] = 1;
      var id = m[2];
      var name = decodeURIComponent(m[1].split('/').filter(Boolean).pop() || 'Video').replace(/-/g, ' ');
      name = name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      // lazy img often after href — scan window
      var slice = html.substring(m.index, m.index + 800);
      var im = slice.match(/(?:data-src|data-original|src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|webp)[^"]*)"/i);
      var pic = im ? abs(im[1]) : '';
      if (!pic) pic = 'https://ptpv.m3pd.com/v1/preview/' + id + '.mp4';
      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time: '', quality: 'HD', json: true, source: NAME
      });
    }
    console.log(TAG, 'cards', results.length);
    return results;
  }

  function extractQualities(html, pageUrl) {
    var q = {};
    var idm = (pageUrl || '').match(/\/video\/(\d+)\//);
    var id = idm ? idm[1] : '';
    // preview mp4 as last resort
    var prev = html.match(/ptpv\.m3pd\.com\/v1\/preview\/(\d+)\.mp4/);
    if (prev) q['Preview'] = 'https://ptpv.m3pd.com/v1/preview/' + prev[1] + '.mp4';
    else if (id) q['Preview'] = 'https://ptpv.m3pd.com/v1/preview/' + id + '.mp4';
    var re = /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      if (m[0].indexOf('preview') !== -1) continue;
      if (!q['HD']) q['HD'] = m[0];
    }
    return q;
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
        menu: [
          { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
          { title: '🔥 Новинки', playlist_url: NAME }
        ]
      });
    }, error);
  }

  var Parser = {
    main: function (p, s, e) { loadList(HOST + '/', 1, s, e); },
    view: function (p, s, e) {
      var url = (p && p.url) || NAME;
      var page = parseInt((p && p.page) || 1, 10) || 1;
      if (url.indexOf(NAME + '/search/') === 0) {
        var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]);
        loadList(HOST + '/search/?q=' + encodeURIComponent(q) + (page > 1 ? '&page=' + page : ''), page, s, e);
        return;
      }
      var u = HOST + '/';
      if (page > 1) u = HOST + '/videos.php?p=' + page;
      loadList(u, page, s, e);
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
      httpGet(videoUrl, function (html) {
        var found = extractQualities(html || '', videoUrl);
        if (Object.keys(found).length) success({ qualities: found });
        else error('PornTop: полный поток в embed (пока preview/HD best-effort)');
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
