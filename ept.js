// =============================================================
// ept.js — Парсер EptaPorno (eptaporno.com) для AdultJS
// Version  : 1.2.0
// Changes  :
//   [1.2.0] FIX qualities: get_file (+ source) → awmcdn 302
//           Не ломать URL; Worker: eptaporno.com + awmcdn + cookie-jar
//   [1.1.0] submenu категории
// =============================================================
(function () {
  'use strict';

  var VERSION = '1.2.0';
  var NAME    = 'ept';
  var HOST    = 'https://eptaporno.com';
  var TAG     = '[ept v' + VERSION + ']';

  var CATEGORIES = [
    { title: 'Чулки',            slug: 'chulki' },
    { title: 'На природе',       slug: 'na-prirode' },
    { title: 'Писающие',         slug: 'pisayushchie' },
    { title: 'Записи приватов',  slug: 'zapisi-privatov' },
    { title: 'Нестандартное',    slug: 'izvrashcheniya' },
    { title: 'Анал',             slug: 'anal' },
    { title: 'Минет',            slug: 'minet' },
    { title: 'Русское',          slug: 'russkoe' },
    { title: 'Домашнее',         slug: 'domashnee' },
    { title: 'Групповое',        slug: 'gruppovoe' }
  ];

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  function absUrl(u) {
    if (!u) return '';
    u = String(u).replace(/&amp;/g, '&').trim();
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  function makeCard(name, href, pic, time) {
    return {
      name: name,
      video: href,
      picture: pic || '',
      img: pic || '',
      poster: pic || '',
      background_image: pic || '',
      time: time || '',
      quality: 'HD',
      json: true,
      source: NAME
    };
  }

  function extractCards(html) {
    var cards = [];
    var seen = {};
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var items = doc.querySelectorAll('.item, a[href*="/videos/"]');
      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var link = el.tagName === 'A' ? el : el.querySelector('a[href*="/videos/"]');
        if (!link) link = el.querySelector('a');
        if (!link) continue;
        var href = absUrl(link.getAttribute('href') || '');
        if (!href || href.indexOf('/videos/') === -1) continue;
        if (seen[href]) continue;
        seen[href] = true;

        var img = el.querySelector ? el.querySelector('img') : null;
        if (!img && link.querySelector) img = link.querySelector('img');
        var pic = '';
        if (img) {
          pic = absUrl(
            img.getAttribute('data-original') ||
            img.getAttribute('data-src') ||
            img.getAttribute('src') || ''
          );
          if (pic.indexOf('data:') === 0) pic = '';
        }

        var titleEl = el.querySelector ? (el.querySelector('.title, strong, .th-title') || null) : null;
        var name = '';
        if (titleEl) name = (titleEl.getAttribute('title') || titleEl.textContent || '').replace(/\s+/g, ' ').trim();
        if (!name) name = (link.getAttribute('title') || (img && img.getAttribute('alt')) || '').trim();
        if (!name) continue;

        var durEl = el.querySelector ? el.querySelector('.duration, .time') : null;
        var time = durEl ? durEl.textContent.replace(/[^\d:]/g, '').trim() : '';
        cards.push(makeCard(name, href, pic, time));
      }
    } catch (e) {
      console.log(TAG, 'extractCards error', e.message || e);
    }
    console.log(TAG, 'cards', cards.length);
    return cards;
  }

  function extractQualities(html) {
    var q = {};
    var add = function (label, url) {
      url = absUrl(url);
      if (!url || url.indexOf('get_file') === -1) return;
      if (url.indexOf('{') !== -1) return;
      if (!q[label]) q[label] = url;
    };

    // 1) <source src="...get_file...">
    var reSrc = /<source[^>]+src=["']([^"']+)["']/gi;
    var m;
    while ((m = reSrc.exec(html)) !== null) {
      var u = m[1];
      if (u.indexOf('get_file') !== -1 || /\.mp4/i.test(u)) {
        var lab = 'HD';
        var qm = u.match(/_(\d+)p?\.mp4/i) || u.match(/\/(\d+)\.mp4/i);
        if (qm) lab = /\d+p/.test(qm[0]) ? qm[1] + 'p' : 'HD';
        add(lab, u);
      }
    }

    // 2) любые get_file .mp4
    var reGf = /https?:\/\/[^"'\s<>]+\/get_file\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi;
    while ((m = reGf.exec(html)) !== null) {
      var u2 = m[0];
      if (u2.indexOf('download=') !== -1) continue;
      var lab2 = 'HD';
      var qm2 = u2.match(/_(\d+)p\.mp4/i);
      if (qm2) lab2 = qm2[1] + 'p';
      add(lab2, u2);
    }

    return q;
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новинки', playlist_url: NAME + '/latest' },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        })
      }
    ];
  }

  function routeView(params, success, error) {
    var url = (params && params.url) || '';
    var page = parseInt((params && params.page) || 1, 10) || 1;
    var fetchUrl = HOST + '/latest-updates/' + (page > 1 ? page + '/' : '');

    var searchMatch = url.match(/[?&](search|q)=([^&]*)/);
    if (searchMatch) {
      fetchUrl = HOST + '/search/' + decodeURIComponent(searchMatch[2]) + '/' + (page > 1 ? page + '/' : '');
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      var cat = url.split('/cat/')[1].split('?')[0].split('/')[0];
      fetchUrl = HOST + '/categories/' + cat + '/' + (page > 1 ? page + '/' : '');
    } else if (url.indexOf(NAME + '/search/') === 0) {
      var rawQ = decodeURIComponent(url.split('/search/')[1].split('?')[0]).trim();
      if (rawQ) fetchUrl = HOST + '/search/' + rawQ + '/' + (page > 1 ? page + '/' : '');
    }

    console.log(TAG, 'fetch', fetchUrl);
    httpGet(fetchUrl, function (html) {
      var results = extractCards(html);
      if (!results.length) {
        error('Epta: ничего не найдено');
        return;
      }
      success({
        results: results,
        collection: true,
        total_pages: results.length >= 20 ? page + 1 : page,
        menu: buildMenu()
      });
    }, error);
  }

  var EptParser = {
    main: function (params, success, error) {
      routeView(params || { url: NAME + '/latest', page: 1 }, success, error);
    },
    view: function (params, success, error) {
      routeView(params || {}, success, error);
    },
    search: function (params, success, error) {
      var query = (params.query || '').trim();
      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }
      routeView({ url: NAME + '/search/' + encodeURIComponent(query), page: params.page || 1 }, function (data) {
        data.title = 'Epta: ' + query;
        success(data);
      }, error);
    },
    qualities: function (videoUrl, success, error) {
      console.log(TAG, 'qualities →', videoUrl);
      httpGet(videoUrl, function (html) {
        if (!html || html.length < 400) {
          error('Epta: страница недоступна');
          return;
        }
        var found = extractQualities(html);
        var keys = Object.keys(found);
        console.log(TAG, 'qualities найдено:', keys.length, JSON.stringify(keys));
        if (keys.length) {
          success({ qualities: found });
        } else {
          console.log(TAG, 'get_file cnt', (html.match(/get_file/gi) || []).length);
          error('Epta: видео не найдено');
        }
      }, error);
    }
  };

  function tryReg() {
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
      window.AdultPlugin.registerParser(NAME, EptParser);
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
