// =============================================================
// briz.js — Парсер PornoBriz для AdultJS / AdultPlugin (Lampa)
// Version  : 3.1.0 (Refactored to YouJizz/XDS Architecture)
// Changed  :
//   [3.1.0] Внедрена система «умного роутинга» (routeView)
//           Исправлен поиск через фильтр (search_on: true)
//           Добавлены обязательные поля постеров: img, poster, background_image
//           Сохранена рабочая логика извлечения видео (qualities)
// =============================================================

(function () {
  'use strict';

  var NAME = 'briz';
  var HOST = 'https://pornobriz.com';

  var CATS = [
    { title: 'Азиатки',               val: 'asian'              },
    { title: 'Анальный секс',         val: 'anal'               },
    { title: 'БДСМ',                  val: 'bdsm'               },
    { title: 'Блондинки',             val: 'blonde'             },
    { title: 'Большая жопа',          val: 'big_ass'            },
    { title: 'Большие сиськи',        val: 'big_tits'           },
    { title: 'Большой член',          val: 'big_dick'           },
    { title: 'Бритая киска',          val: 'shaved'             },
    { title: 'Брюнетки',              val: 'brunette'           },
    { title: 'В одежде',              val: 'clothes'            },
    { title: 'Волосатые киски',       val: 'hairy'              },
    { title: 'Глотают сперму',        val: 'swallow'            },
    { title: 'Глубокая глотка',       val: 'deepthroat'         },
    { title: 'Групповой секс',        val: 'group'              },
    { title: 'Двойное проникновение', val: 'double_penetration' },
    { title: 'Дрочат',                val: 'wanking'            },
    { title: 'Жесткий секс',          val: 'hardcore'           },
    { title: 'ЖМЖ порно',             val: 'ffm'                },
    { title: 'Игрушки',               val: 'toys'               },
    { title: 'Камшот',                val: 'cumshot'            },
    { title: 'Лесбиянки',             val: 'lesbian'            },
    { title: 'Любительское',          val: 'amateur'            },
    { title: 'Мамочки',               val: 'milf'               },
    { title: 'Минет',                 val: 'blowjob'            },
    { title: 'Молодые',               val: 'seks-molodye'       },
    { title: 'Оральный секс',         val: 'oral'               },
    { title: 'Русское порно',         val: 'russian'            },
    { title: 'Сквирт',                val: 'squirt'             },
    { title: 'Худые девушки',         val: 'skinny'             },
  ];

  // ----------------------------------------------------------
  // HTTP СЛОЙ
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url)
        .then(function (r) { return r.text(); })
        .then(success)
        .catch(error);
    }
  }

  // ----------------------------------------------------------
  // ПОСТРОЕНИЕ URL (Briz Style)
  // ----------------------------------------------------------
  function buildBrizUrl(path, page, query) {
    var url = HOST + '/';
    if (query) {
      url += '?q=' + encodeURIComponent(query);
    } else if (path && path !== NAME) {
      url += path + '/';
    }
    
    if (page > 1) {
      url += (url.indexOf('?') > -1 ? '&' : '?') + 'page=' + page;
    }
    return url;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАРТОЧЕК
  // ----------------------------------------------------------
  function parseCards(html) {
    if (!html) return [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var results = [];
    var items = doc.querySelectorAll('div.thumb_main');

    for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var a = el.querySelector('a[href*="/video/"]');
        if (!a) continue;

        var href = a.getAttribute('href');
        if (href.indexOf('http') !== 0) href = HOST + href;

        var imgEl = el.querySelector('img');
        var pic = '';
        if (imgEl) {
            pic = imgEl.getAttribute('data-original') || imgEl.getAttribute('src') || '';
            if (pic && pic.indexOf('http') !== 0) pic = HOST + pic;
        }

        var vidEl = el.querySelector('video[data-preview]');
        var preview = vidEl ? vidEl.getAttribute('data-preview') : null;
        if (preview && preview.indexOf('http') !== 0) preview = HOST + preview;

        var titleEl = el.querySelector('.th-title');
        var name = titleEl ? titleEl.textContent.trim() : (imgEl ? imgEl.getAttribute('alt') : 'No Title');

        var durEl = el.querySelector('.duration');
        var time = durEl ? durEl.textContent.trim() : '';

        results.push({
            name: name,
            video: href,
            // ИСПРАВЛЕНИЕ ПОСТЕРОВ ДЛЯ ADULTJS
            picture: pic,
            img: pic,
            poster: pic,
            background_image: pic,
            preview: preview,
            time: time,
            quality: 'HD',
            json: true,
            source: NAME
        });
    }
    return results;
  }

  // ----------------------------------------------------------
  // МЕНЮ (YouJizz/XDS Style)
  // ----------------------------------------------------------
  function buildMenu() {
    return [
      {
        title: '🔍 Поиск',
        search_on: true,
        playlist_url: NAME + '/search/',
      },
      {
        title: '🔥 Новинки',
        playlist_url: NAME + '/main',
      },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATS.map(function (c) {
          return {
            title: c.title,
            playlist_url: NAME + '/cat/' + c.val,
          };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТЕР (УМНЫЙ РОУТИНГ)
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    var queryMatch = url.match(/[?&]search=([^&]*)/);
    if (queryMatch) {
        var query = decodeURIComponent(queryMatch[1]);
        fetchPage(buildBrizUrl(null, page, query), page, success, error);
        return;
    }

    if (url.indexOf(NAME + '/cat/') === 0) {
        var cat = url.replace(NAME + '/cat/', '').split('?')[0];
        fetchPage(buildBrizUrl(cat, page), page, success, error);
        return;
    }

    if (url.indexOf(NAME + '/search/') === 0) {
        var rawQ = url.replace(NAME + '/search/', '').split('?')[0];
        if (rawQ) {
            fetchPage(buildBrizUrl(null, page, decodeURIComponent(rawQ)), page, success, error);
            return;
        }
    }

    fetchPage(HOST + (page > 1 ? '/?page=' + page : ''), page, success, error);
  }

  function fetchPage(fetchUrl, page, success, error) {
    httpGet(fetchUrl, function (html) {
      var results = parseCards(html);
      if (!results.length) {
        error('Ничего не найдено');
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

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ ВИДЕО (QUALITIES) - СОХРАНЕНО И УЛУЧШЕНО
  // ----------------------------------------------------------
  function getQualities(videoUrl, success, error) {
    httpGet(videoUrl, function (html) {
      var q = {};
      
      // Метод 1: Прямые теги source
      var sources = html.match(/<source[^>]+src="([^"]+)"[^>]*size="([^"]+)"/g);
      if (sources) {
          sources.forEach(function(s) {
              var link = s.match(/src="([^"]+)"/)[1];
              var res = s.match(/size="([^"]+)"/)[1];
              q[res + 'p'] = link;
          });
      }

      // Метод 2: Регулярки для mp4 (если первое не сработало)
      if (Object.keys(q).length === 0) {
          var mp4s = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g);
          if (mp4s) {
              mp4s.forEach(function(link, i) {
                  q['Quality ' + (i+1)] = link;
              });
          }
      }

      // Метод 3: HLS
      var hls = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
      if (hls) q['HLS (Auto)'] = hls[0];

      if (Object.keys(q).length > 0) {
          success({ qualities: q });
      } else {
          error('Видео не найдено');
      }
    }, error);
  }

  // ----------------------------------------------------------
  // ИНТЕРФЕЙС ПАРСЕРА
  // ----------------------------------------------------------
  var BrizParser = {
    main: function (params, success, error) {
      routeView(NAME + '/main', 1, success, error);
    },
    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },
    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var page = params.page || 1;
      fetchPage(buildBrizUrl(null, page, query), page, function (data) {
        data.title = 'Briz: ' + query;
        success(data);
      }, error);
    },
    qualities: function (url, success, error) {
      getQualities(url, success, error);
    }
  };

  // Регистрация
  function register() {
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
      window.AdultPlugin.registerParser(NAME, BrizParser);
    } else {
      setTimeout(register, 500);
    }
  }
  register();

})();
