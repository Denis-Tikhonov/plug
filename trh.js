(function () {
  'use strict';
  var NAME = 'trh';
  var HOST = 'https://trahkino.me';

  function cleanUrl(url) {
    if (!url) return '';
    // Аналогичная очистка для TRH
    var doubleHttps = url.indexOf('https://', 8);
    var clean = (doubleHttps !== -1) ? url.substring(doubleHttps) : url;
    
    if (clean.indexOf('//') === 0) clean = 'https:' + clean;
    if (clean.indexOf('http') !== 0 && clean.indexOf('/') === 0) clean = HOST + clean;
    return clean;
  }

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  // ... [Код CATS и buildUrl оставлен без изменений] ...

  function extractQualities(html) {
    var sources = {};
    var ktFields = [
      { regex: /video_url\s*[:=]\s*['"]([^'"]+)['"]/,       label: '240p' },
      { regex: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/,   label: '360p' },
      { regex: /video_alt_url2\s*[:=]\s*['"]([^'"]+)['"]/,  label: '720p' },
    ];

    for (var i = 0; i < ktFields.length; i++) {
      var m = html.match(ktFields[i].regex);
      if (m && m[1]) {
        var url = cleanUrl(m[1].trim()); // ВАЖНО: Применяем очистку
        var label = ktFields[i].label;
        if (url.indexOf('_1080p') !== -1) label = '1080p';
        else if (url.indexOf('_720p') !== -1) label = '720p';
        else if (url.indexOf('_480p') !== -1) label = '480p';
        else if (url.indexOf('_360p') !== -1) label = '360p';
        sources[label] = url;
      }
    }
    return sources;
  }

  var trhParser = {
    // ... [методы main, view, search без изменений] ...
    qualities: function (videoPageUrl, success, error) {
      httpGet(videoPageUrl, function (html) {
        var found = extractQualities(html);
        Object.keys(found).length > 0 ? success({ qualities: found }) : error('TrahKino: видео не найдено');
      }, error);
    },
  };

  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, trhParser);
      return true;
    }
    return false;
  }
  var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
  setTimeout(function () { clearInterval(poll); }, 5000);
})();
