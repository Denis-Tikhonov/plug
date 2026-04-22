(function () {
  'use strict';
  var NAME = 'ptop';
  var HOST = 'https://porntop.com';

  var Parser = {
    main: function (p, s, e) { this.view({url: HOST}, s, e); },
    view: function (p, s, e) {
      window.AdultPlugin.networkRequest(p.url, function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var results = [];
        doc.querySelectorAll('.item').forEach(el => {
           var a = el.querySelector('a');
           results.push({
             name: el.querySelector('.title').innerText,
             video: a.getAttribute('href'),
             picture: el.querySelector('img').getAttribute('data-original'),
             source: NAME, json: true
           });
        });
        s({results: results});
      }, e);
    },
    qualities: function (url, success, error) {
      window.AdultPlugin.networkRequest(url, function (html) {
        var q = {};
        // Стратегия поиска прямых ссылок через регулярку
        var m = html.match(/https?:\/\/[^"'\s]+\.mp4/g);
        if (m) m.forEach((u, i) => q['HD'+i] = u);
        
        // Поиск через JWPlayer config
        var jw = html.match(/sources\s*:\s*(\[.*?\])/);
        if(jw) {
            var s = JSON.parse(jw[1].replace(/'/g,'"'));
            s.forEach(i => q[i.label] = i.file);
        }
        success({qualities: q});
      }, error);
    }
  };
  window.AdultPlugin.registerParser(NAME, Parser);
})();
