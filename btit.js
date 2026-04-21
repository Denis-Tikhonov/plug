// =============================================================
// btit.js — Парсер BigTitsLust для AdultJS
// Version  : 1.1.0 (Refactored to UNIVERSAL_TEMPLATE)
// =============================================================

(function () {
  'use strict';

  var NAME = 'btit';
  var HOST = 'https://www.bigtitslust.com';
  var TAG  = '[' + NAME + ']';

  // Правила извлечения (ориентируясь на структуру сайта)
  var VIDEO_RULES = [
    { label: '480p', re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/ },
    { label: '720p', re: /video_alt_url2\s*[:=]\s*['"]([^'"]+)['"]/ },
  ];

  function cleanUrl(u) {
    if (!u) return '';
    u = u.replace(/\\\//g, '/').replace(/\\/g, '');
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.indexOf('/') === 0) u = HOST + u;
    return u;
  }

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function(r){ return r.text(); }).then(success).catch(error);
    }
  }

  function parsePlaylist(html) {
    var results = [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.item');
    
    items.forEach(function(el) {
      var a = el.querySelector('a[href*="/videos/"]');
      if (!a) return;
      
      var href = cleanUrl(a.getAttribute('href'));
      var img = el.querySelector('img');
      var pic = img ? cleanUrl(img.getAttribute('data-original') || img.getAttribute('src') || '') : '';
      var title = (el.querySelector('.title') || a).textContent.trim();
      var dur = el.querySelector('.duration') ? el.querySelector('.duration').textContent.trim() : '';

      results.push({
        name: title,
        video: href,
        picture: pic,
        img: pic,
        poster: pic,
        background_image: pic,
        time: dur,
        json: true,
        source: NAME
      });
    });
    return results;
  }

  function extractQualities(html) {
    var q = {};
    VIDEO_RULES.forEach(function(rule) {
      var m = html.match(rule.re);
      if (m && m[1]) q[rule.label] = cleanUrl(m[1]);
    });
    return q;
  }

  var Parser = {
    main: function(params, success, error) {
      httpGet(HOST + '/', function(html) {
        success({ results: parsePlaylist(html), collection: true });
      }, error);
    },

    view: function(params, success, error) {
      var page = params.page || 1;
      var url = page > 1 ? HOST + '/?page=' + page : HOST + '/';
      httpGet(url, function(html) {
        success({ results: parsePlaylist(html), collection: true, total_pages: page + 1 });
      }, error);
    },

    search: function(params, success, error) {
      var url = HOST + '/search/?q=' + encodeURIComponent(params.query);
      httpGet(url, function(html) {
        success({ results: parsePlaylist(html), collection: true });
      }, error);
    },

    qualities: function(url, success, error) {
      httpGet(url, function(html) {
        var q = extractQualities(html);
        if (Object.keys(q).length) success({ qualities: q });
        else error('Video not found');
      }, error);
    }
  };

  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, Parser);
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }
})();
