(function () {
  'use strict';
  var NAME = 'pone';
  var HOST = 'https://pornone.com';

  var Parser = {
    main: function (p, s, e) { this.view({url: HOST}, s, e); },
    view: function (p, s, e) {
      window.AdultPlugin.networkRequest(p.url, function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var results = [];
        doc.querySelectorAll('.video-item').forEach(el => {
           var a = el.querySelector('a');
           results.push({
             name: a.getAttribute('title'),
             video: HOST + a.getAttribute('href'),
             picture: el.querySelector('img').getAttribute('data-src'),
             source: NAME, json: true
           });
        });
        s({results: results});
      }, e);
    },
    qualities: function (url, success, error) {
      window.AdultPlugin.networkRequest(url, function (html) {
        var q = {};
        var regex = /<source[^>]+src=["']([^"']+)["'][^>]+label=["']([^"']+)["']/g;
        var m;
        while((m = regex.exec(html)) !== null) q[m[2]] = m[1];
        success({qualities: q});
      }, error);
    }
  };
  window.AdultPlugin.registerParser(NAME, Parser);
})();
