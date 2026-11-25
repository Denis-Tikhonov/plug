// =============================================================
// pone.js — PornOne (pornone.com) для AdultJS
// Version  : 1.0.0
// Каталог: a.videocard / img.imgvi
// Qualities: <source> + .mp4 на CDN s*.pornone.com
// Worker: pornone.com, th-*.pornone.com, s*.pornone.com
// =============================================================
(function () {
  'use strict';
  var VERSION = '1.0.0';
  var NAME = 'pone';
  var HOST = 'https://pornone.com';
  var TAG = '[pone v' + VERSION + ']';

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
    var re = /<a[^>]+href="(https:\/\/pornone\.com\/[^"]+\/\d+\/)"[^>]*class="[^"]*videocard[^"]*"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[^>]*alt="([^"]*)"/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var href = abs(m[1]);
      if (seen[href]) continue;
      seen[href] = 1;
      var pic = abs(m[2]);
      if (pic.indexOf('data:') === 0) pic = '';
      var name = (m[3] || 'Video').replace(/\s+/g, ' ').trim();
      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time: '', quality: 'HD', json: true, source: NAME
      });
    }
    // fallback: any videocard link
    if (!results.length) {
      re = /href="(https:\/\/pornone\.com\/[^"]+\/\d+\/)"[^>]*class="[^"]*vidLink/gi;
      while ((m = re.exec(html)) !== null) {
        var h = abs(m[1]);
        if (seen[h]) continue;
        seen[h] = 1;
        results.push({
          name: 'Video', video: h,
          picture: '', img: '', poster: '', background_image: '',
          time: '', quality: 'HD', json: true, source: NAME
        });
      }
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
      var qm = u.match(/_(\d{3,4})x\d+_/i) || u.match(/(\d{3,4})p/i);
      if (qm) lab = qm[1] + (String(qm[1]).indexOf('p') >= 0 ? '' : 'p');
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

  function pageUrl(page) {
    page = parseInt(page, 10) || 1;
    if (page <= 1) return HOST + '/';
    return HOST + '/' + page + '/';
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
        menu: [
          { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
          { title: '🔥 Новинки', playlist_url: NAME }
        ]
      });
    }, error);
  }

  var Parser = {
    main: function (p, s, e) { loadList(pageUrl(1), 1, s, e); },
    view: function (p, s, e) {
      var url = (p && p.url) || NAME;
      var page = parseInt((p && p.page) || 1, 10) || 1;
      if (url.indexOf(NAME + '/search/') === 0) {
        var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]);
        loadList(HOST + '/search/videos/' + encodeURIComponent(q) + (page > 1 ? '/' + page + '/' : '/'), page, s, e);
        return;
      }
      loadList(pageUrl(page), page, s, e);
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
        var keys = Object.keys(found);
        console.log(TAG, 'qualities keys', keys);
        if (keys.length) success({ qualities: found });
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
