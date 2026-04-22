(function () {
  'use strict';
  var NAME = 'ostr';
  var HOST = 'http://ostroeporno.com';

  var Parser = {
    main: function (p, s, e) { this.view({url: NAME + '/new'}, s, e); },
    view: function (p, s, e) { 
        window.AdultPlugin.networkRequest(HOST + '/top', function(html){
            var results = []; 
            // Парсинг .thumb элементов
            var doc = new DOMParser().parseFromString(html, 'text/html');
            doc.querySelectorAll('.thumb, .item').forEach(el => {
                var a = el.querySelector('a');
                if(a) results.push({
                    name: (el.getAttribute('title') || a.innerText).trim(),
                    video: HOST + a.getAttribute('href'),
                    picture: (el.querySelector('img') || {getAttribute:()=>''}).getAttribute('src'),
                    source: NAME, json: true
                });
            });
            s({results: results});
        }, e);
    },
    qualities: function (url, success, error) {
      window.AdultPlugin.networkRequest(url, function (html) {
        var jsMatch = html.match(/src="(\/js\/video[^"]+\.js)"/i);
        if (jsMatch) {
          window.AdultPlugin.networkRequest(HOST + jsMatch[1], function (js) {
            var q = {};
            var m = js.match(/(?:file|video_url|video_alt_url)\s*[:=]\s*['"]([^'"]+)['"]/g);
            if(m) m.forEach(item => {
                var url = item.split(/['"]/)[1];
                if(url.includes('.mp4')) q[url.includes('hd') ? '720p' : '480p'] = url;
            });
            success({qualities: q});
          }, error);
        } else error('JS player not found');
      }, error);
    }
  };
  window.AdultPlugin.registerParser(NAME, Parser);
})();
