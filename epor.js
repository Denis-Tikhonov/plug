// =============================================================
// epor.js — EPorner AdultJS
// Version  : 1.1.0
// [1.1.0] CF Worker IP → JS-challenge (html ~300b). Сообщаем явно.
//         Селекторы /video-id/slug/ если страница всё же пришла.
// Worker: eporner.com часто БЛОКИРУЕТ workers.dev
// =============================================================
(function () {
  'use strict';
  var VERSION = '1.1.0';
  var NAME = 'epor';
  var HOST = 'https://www.eporner.com';
  var TAG = '[epor v' + VERSION + ']';

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
    var re = /href="(\/video-[a-zA-Z0-9]+\/[^"]+\/?)"/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var href = abs(m[1]);
      if (href.charAt(href.length - 1) !== '/') href += '/';
      if (seen[href]) continue;
      seen[href] = 1;
      var slug = m[1].replace(/\/$/, '').split('/').pop() || 'Video';
      var name = decodeURIComponent(slug).replace(/-/g, ' ');
      name = name.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      var slice = html.substring(Math.max(0, m.index - 100), m.index + 700);
      var im = slice.match(/(?:data-src|src)="(https?:\/\/[^"]+(?:eporner|cdn)[^"]*\.(?:jpg|jpeg|webp)[^"]*)"/i);
      var pic = im ? abs(im[1]) : '';
      results.push({
        name: name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time: '', quality: 'HD', json: true, source: NAME
      });
    }
    console.log(TAG, 'cards', results.length, 'html', html ? html.length : 0);
    return results;
  }

  function extractQualities(html) {
    var q = {};
    var re = /https?:\/\/gvideo\.eporner\.com\/[^"'\s]+\.mp4/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      if (!q['HD']) q['HD'] = m[0];
    }
    re = /\/dload\/[^"'\s]+\/(\d{3,4})\/[^"'\s]+\.mp4/gi;
    while ((m = re.exec(html)) !== null) {
      var lab = m[1] + 'p';
      if (!q[lab]) q[lab] = abs(m[0]);
    }
    return q;
  }

  function loadList(url, page, success, error) {
    console.log(TAG, 'fetch', url);
    httpGet(url, function (html) {
      if (!html || html.length < 800) {
        error('EPorner: блокировка Worker/CF (JS-challenge). Нужен другой proxy или зеркало.');
        return;
      }
      if (html.indexOf('fromCharCode') !== -1 && html.length < 2000) {
        error('EPorner: anti-bot challenge с IP Cloudflare Worker');
        return;
      }
      var results = parsePlaylist(html);
      if (!results.length) { error('EPorner: нет карточек'); return; }
      success({
        results: results, collection: true,
        total_pages: results.length >= 40 ? page + 1 : page,
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
        loadList(HOST + '/search/' + encodeURIComponent(q) + '/', page, s, e);
        return;
      }
      loadList(page > 1 ? (HOST + '/' + page + '/') : (HOST + '/'), page, s, e);
    },
    search: function (p, s, e) {
      var q = (p.query || '').trim();
      if (!q) { s({ results: [], collection: true, total_pages: 1 }); return; }
      loadList(HOST + '/search/' + encodeURIComponent(q) + '/', 1, function (d) {
        d.title = 'EPorner: ' + q; s(d);
      }, e);
    },
    qualities: function (videoUrl, success, error) {
      httpGet(videoUrl, function (html) {
        if (!html || html.length < 800) {
          error('EPorner: страница видео недоступна через Worker');
          return;
        }
        var found = extractQualities(html);
        if (Object.keys(found).length) success({ qualities: found });
        else error('EPorner: поток не найден');
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
