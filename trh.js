(function () {
  'use strict';
  var VERSION = '1.3.1';
  var NAME    = 'hdtub';
  var HOST    = 'https://www.hdtube.porn';

  function cleanUrl(url) {
    if (!url) return '';
    var u = url.replace(/\\/g, '');
    // Удаляем любые прокси-префиксы вида /function/N/ или /function/0/
    // И оставляем всё, что идет после них (начиная с первого встреченного http)
    var doubleHttps = u.indexOf('https://', 8);
    if (doubleHttps !== -1) {
        u = u.substring(doubleHttps);
    }
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  // ... [Код CATEGORIES оставлен без изменений для краткости] ...

  function extractQualities(html) {
    var q = {};
    var m720 = html.match(/video_url\s*[:=]\s*['"]([^'"]+)['"]/);
    if (m720) q['720p'] = cleanUrl(m720[1]);
    
    var m480 = html.match(/video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/);
    if (m480) q['480p'] = cleanUrl(m480[1]);

    if (!Object.keys(q).length) {
      var gfRe = /(https?:\/\/[^"'\s]+\/get_file\/[^"'\s]+\.mp4[^"'\s]*)/g;
      var gf;
      while ((gf = gfRe.exec(html)) !== null) {
        if (gf[1].indexOf('preview') !== -1) continue;
        var gfQ = gf[1].match(/_(\d+)\.mp4/);
        q[gfQ ? gfQ[1] + 'p' : 'HD'] = cleanUrl(gf[1]);
        break;
      }
    }
    return q;
  }

  var HdtubParser = {
    // ... [методы main, view, search оставлены без изменений] ...
    qualities: function (videoPageUrl, success, error) {
      httpGet(videoPageUrl, function (html) {
        var found = extractQualities(html);
        Object.keys(found).length > 0 ? success({ qualities: found }) : error('Видео не найдено');
      }, error);
    },
  };

  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, HdtubParser);
      return true;
    }
    return false;
  }
  var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
  setTimeout(function () { clearInterval(poll); }, 5000);
})();
