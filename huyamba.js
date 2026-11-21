// =============================================================
// huyamba.js — Парсер retro.huyamba.mobi для AdultJS
// Version  : 1.0.0
// =============================================================

(function () {
  'use strict';

  var NAME = 'huyamba';
  var HOST = 'https://retro.huyamba.mobi';
  var TAG  = '[huyamba v1.0.0]';

  function cleanUrl(u) {
    if (!u) return '';
    u = String(u).replace(/\\\//g, '/').replace(/\\/g, '').trim();
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    // KVS function/0/ префикс
    var m = u.match(/\/function\/\d+\/(https?:\/\/.+)/);
    if (m) u = m[1];
    return u;
  }

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url, {
        headers: {
          'Cookie': 'mature=1; age_verified=1',
          'Referer': HOST + '/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'
        }
      }).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  function parseCards(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.item.thumb, .item.thumb ');
    var cards = [];
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var a = el.querySelector('a.card[href*="/video/"], a[href*="/video/"]');
      if (!a) continue;
      var href = cleanUrl(a.getAttribute('href') || '');
      if (!href) continue;

      var img = el.querySelector('img');
      var pic = '';
      if (img) {
        pic = img.getAttribute('data-original') ||
              img.getAttribute('data-src') ||
              img.getAttribute('src') || '';
      }
      pic = cleanUrl(pic);
      if (pic.indexOf('data:') === 0 || pic.length < 15) pic = '';

      var name = (a.getAttribute('title') || (img && img.getAttribute('alt')) || '').trim();
      if (!name) name = (a.textContent || '').trim();
      if (!name) continue;

      var timeEl = el.querySelector('.duration, .time, span.duration');
      var time = timeEl ? timeEl.textContent.replace(/[^\d:]/g, '').trim() : '';

      cards.push({
        name: name,
        video: href,
        picture: pic,
        img: pic,
        poster: pic,
        background_image: pic,
        time: time,
        quality: 'HD',
        json: true,
        source: NAME
      });
    }
    console.log(TAG, 'parseCards →', cards.length);
    return cards;
  }

  function extractQualities(html) {
    var q = {};
    // video_url + video_alt_url (KVS)
    var re = /video(?:_alt)?_url(?:\d+)?\s*[:=]\s*['"]([^'"]+)['"]/g;
    var m;
    while ((m = re.exec(html)) !== null) {
      var u = cleanUrl(m[1]);
      if (!u || u.indexOf('http') !== 0) continue;
      if (u.indexOf('preview') !== -1) continue;
      var key = 'HD';
      if (u.indexOf('720') !== -1 || u.indexOf('hd') !== -1) key = '720p';
      else if (u.indexOf('1080') !== -1) key = '1080p';
      else if (u.indexOf('sd') !== -1 || u.indexOf('mobile') !== -1) key = '480p';
      if (!q[key]) q[key] = u;
    }
    // get_file fallback
    if (!Object.keys(q).length) {
      var re2 = /(https?:\/\/[^"'\s]+\/get_file\/[^"'\s]+\.mp4[^"'\s]*)/g;
      while ((m = re2.exec(html)) !== null) {
        var u2 = cleanUrl(m[1]);
        if (u2.indexOf('preview') !== -1) continue;
        q['HD'] = u2;
        break;
      }
    }
    return q;
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '📂 Категории', playlist_url: NAME + '/categories/' },
      { title: '🔥 Новинки', playlist_url: NAME + '/videos/' },
    ];
  }

  function fetchPage(url, page, success, error) {
    httpGet(url, function (html) {
      var results = parseCards(html);
      if (!results.length) { error('Huyamba: ничего не найдено'); return; }
      success({
        results: results,
        collection: true,
        total_pages: results.length >= 20 ? page + 3 : page,
        menu: buildMenu()
      });
    }, error);
  }

  var Parser = {
    main: function (p, success, error) {
      fetchPage(HOST + '/videos/', 1, success, error);
    },
    view: function (params, success, error) {
      var page = parseInt(params.page, 10) || 1;
      var url = params.url || '';
      if (url.indexOf(NAME + '/search/') === 0) {
        var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]);
        fetchPage(HOST + '/search/?q=' + encodeURIComponent(q) + (page > 1 ? '&from_videos=' + ((page-1)*24) : ''), page, success, error);
      } else if (url.indexOf(NAME + '/categories') === 0 || url.indexOf('/categories') !== -1) {
        fetchPage(HOST + '/categories/', page, success, error);
      } else if (url.indexOf('/video/') !== -1 || url.indexOf('http') === 0) {
        // это страница видео — не должно сюда попадать
        fetchPage(url.indexOf('http') === 0 ? url : HOST + url, page, success, error);
      } else {
        fetchPage(HOST + '/videos/' + (page > 1 ? '?from=' + ((page-1)*24) : ''), page, success, error);
      }
    },
    search: function (params, success, error) {
      var q = (params.query || '').trim();
      var page = parseInt(params.page, 10) || 1;
      if (!q) return success({ results: [] });
      fetchPage(HOST + '/search/?q=' + encodeURIComponent(q), page, function (data) {
        data.title = 'Huyamba: ' + q;
        success(data);
      }, error);
    },
    qualities: function (videoUrl, success, error) {
      httpGet(videoUrl, function (html) {
        var q = extractQualities(html);
        if (!Object.keys(q).length) return error('Видео не найдено');
        console.log(TAG, 'qualities:', Object.keys(q));
        success({ qualities: q });
      }, error);
    }
  };

  function tryReg() {
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
      window.AdultPlugin.registerParser(NAME, Parser);
      console.log(TAG, 'зарегистрирован OK');
      return true;
    }
    return false;
  }
  if (!tryReg()) {
    var t = 0, id = setInterval(function () {
      t += 100;
      if (tryReg() || t > 8000) clearInterval(id);
    }, 100);
  }
})();