// =============================================================
// phub.js — Парсер PornHub для AdultJS (Lampa)
// Version  : 2.0.0
// Changes  : 
//   - Полная интеграция с JSON-структурой анализатора v3.3
//   - Роутинг по образцу YouJizz и xds (поддержка фильтра "Найти")
//   - Извлечение токенизированных MP4 и HLS потоков
// =============================================================

(function () {
  'use strict';

  var NAME = 'phub';
  var HOST = 'https://rt.pornhub.com';

  var SORTS = [
    { title: 'Горячие', val: 'ht' },
    { title: 'Популярные', val: 'mv' },
    { title: 'Лучшие', val: 'tr' },
    { title: 'Новые', val: 'cm' }
  ];

  var CATS = [
    { title: 'Зрелые', val: '28' },
    { title: 'Мамочки', val: '29' },
    { title: 'Анальный секс', val: '35' },
    { title: 'Лесбиянки', val: '27' },
    { title: 'Секс втроем', val: '65' },
    { title: 'Мулаты', val: '17' },
    { title: 'Японцы', val: '111' },
    { title: 'Хентай', val: 'hentai' },
    { title: 'БДСМ', val: '10' },
    { title: 'Кремпай', val: '15' }
  ];

  // ----------------------------------------------------------
  // СЕТЕВОЙ ЗАПРОС
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      error('AdultPlugin.networkRequest not found');
    }
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var results = [];
    
    // Селектор согласно JSON: .video или li.videoblock
    var items = doc.querySelectorAll('.video, li.videoblock, li.pcVideoListItem');
    
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var a = el.querySelector('a[href*="/view_video"], a[href*="/video/show"]');
      if (!a) continue;

      var href = a.getAttribute('href');
      if (href.indexOf('http') !== 0) href = HOST + href;

      var img = el.querySelector('img');
      var pic = '';
      if (img) {
        pic = img.getAttribute('data-mediumthumb') || img.getAttribute('data-thumb_url') || img.getAttribute('src') || '';
      }
      if (pic.indexOf('//') === 0) pic = 'https:' + pic;

      var title = el.querySelector('strong, .title, img[alt]');
      var name = title ? (title.textContent || title.getAttribute('alt') || '').trim() : 'Video';
      
      var dur = el.querySelector('.duration, var.duration');
      var time = dur ? dur.textContent.trim() : '';
      
      var quality = el.querySelector('.hd-thumbnail, .hd-badge') ? 'HD' : '';

      if (name) {
        results.push({
          name: name,
          video: href,
          picture: pic,
          img: pic,
          poster: pic,
          background_image: pic,
          preview: img ? img.getAttribute('data-mediabook') : null,
          time: time,
          quality: quality,
          json: true,
          source: NAME
        });
      }
    }
    return results;
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ ПОТОКА (Qualitys)
  // ----------------------------------------------------------
  function getQualities(url, success, error) {
    httpGet(url, function (html) {
      var q = {};
      
      // 1. Поиск JSON конфигурации (flashvars)
      var flashvars = html.match(/flashvars_\d+\s*=\s*({.+?});/);
      if (flashvars) {
        try {
          var data = JSON.parse(flashvars[1]);
          if (data.mediaDefinitions) {
            data.mediaDefinitions.forEach(function(m) {
              if (m.videoUrl && m.remote) {
                var label = m.quality + 'p';
                q[label] = m.videoUrl;
              }
            });
          }
        } catch(e) {}
      }

      // 2. Регулярки для MP4/HLS (согласно отчету токенов)
      if (Object.keys(q).length === 0) {
        var m3u8 = html.match(/["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)["']/);
        if (m3u8) q['HLS'] = m3u8[1].replace(/\\/g, '');

        var mp4 = html.match(/["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)["']/g);
        if (mp4) {
          mp4.forEach(function(link, idx) {
             var clean = link.replace(/["']/g, '').replace(/\\/g, '');
             if (clean.indexOf('phncdn') !== -1) {
                q['MP4-' + (idx + 1)] = clean;
             }
          });
        }
      }

      if (Object.keys(q).length > 0) success(q);
      else error('Видео поток не найден');
    }, error);
  }

  // ----------------------------------------------------------
  // РОУТИНГ И МЕНЮ
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      { title: '🔍 Найти', search_on: true, playlist_url: NAME + '/search/' },
      { 
        title: '📂 Категории', 
        playlist_url: 'submenu',
        submenu: CATS.map(function(c) { 
          return { title: c.title, playlist_url: NAME + '/cat/' + c.val }; 
        })
      },
      { 
        title: '🔥 Сортировка', 
        playlist_url: 'submenu',
        submenu: SORTS.map(function(s) { 
          return { title: s.title, playlist_url: NAME + '/sort/' + s.val }; 
        })
      }
    ];
  }

  function routeView(url, page, success, error) {
    var loadUrl = HOST + '/video?page=' + page;
    
    // Обработка поиска через фильтр Lampa (?search=)
    var searchMatch = url.match(/[?&]search=([^&]*)/);
    if (searchMatch) {
      loadUrl = HOST + '/video/search?search=' + searchMatch[1] + '&page=' + page;
    } else if (url.indexOf('/cat/') !== -1) {
      var cid = url.split('/cat/')[1];
      loadUrl = HOST + '/video?c=' + cid + '&page=' + page;
    } else if (url.indexOf('/sort/') !== -1) {
      var sid = url.split('/sort/')[1];
      loadUrl = HOST + '/video?o=' + sid + '&page=' + page;
    }

    httpGet(loadUrl, function (html) {
      var cards = parseCards(html);
      success({
        results: cards,
        collection: true,
        total_pages: cards.length >= 20 ? page + 1 : page,
        menu: buildMenu()
      });
    }, error);
  }

  // ----------------------------------------------------------
  // API
  // ----------------------------------------------------------
  var phubParser = {
    main: function (params, success, error) {
      routeView(NAME, 1, success, error);
    },
    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },
    search: function (params, success, error) {
      var query = encodeURIComponent(params.query);
      routeView(NAME + '/search/?search=' + query, params.page || 1, function(data) {
        data.title = 'PH: ' + params.query;
        success(data);
      }, error);
    },
    qualities: function (url, success, error) {
      getQualities(url, success, error);
    }
  };

  // Регистрация
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, phubParser);
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var poll = setInterval(function () {
      if (tryRegister()) clearInterval(poll);
    }, 200);
  }
})();
