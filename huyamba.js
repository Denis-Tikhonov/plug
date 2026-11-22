// =============================================================
// huyamba.js — Парсер retro.huyamba.mobi для AdultJS (Lampa)
// Version  : 1.1.0
// Changes  :
//   [1.1.0] Меню: playlist_url:'submenu' + полный список категорий
//           (33 шт. с сайта). Раньше был flat URL → галочка вместо списка.
//           Маршруты: /cat/{slug}, новинки, поиск.
//           qualities: как у рабочих KVS (video_url / video_alt_url /
//           get_file), токены не режем. SS.js проксирует через Worker.
//           Нужен Worker: awmcdn.net + FORCE_REFERER на huyamba.
//   [1.0.0] Первая версия (карточки/обложки ок, меню и play — нет)
// =============================================================

(function () {
  'use strict';

  var NAME = 'huyamba';
  var HOST = 'https://retro.huyamba.mobi';
  var TAG  = '[huyamba v1.1.0]';

  var CATEGORIES = [
    { title: 'Анал и Анальный секс', slug: 'anal-porn' },
    { title: 'Русское порно', slug: 'russian-porn' },
    { title: 'Домашнее порно видео', slug: 'homemade-porn-videos' },
    { title: 'Порно молодых', slug: 'teen-porn' },
    { title: 'Минет, ручная работа', slug: 'blowjob-porn' },
    { title: 'Азиатки', slug: 'asian-porn-videos' },
    { title: 'Групповое порно, свингеры', slug: 'group-porn-videos' },
    { title: 'Межрассовое Порно', slug: 'interracial-porn-videos' },
    { title: 'Сексуальные девушки', slug: 'lesbians-porn-videos' },
    { title: 'Большие толстые члены', slug: 'big-dick-porn' },
    { title: 'Толстушки, порно с толстыми', slug: 'tolstushki-porn' },
    { title: 'Худые, порно с худыми', slug: 'skinny-porn' },
    { title: 'Старушки, порно со зрелыми', slug: 'granny-porn-videos' },
    { title: 'БДСМ, доминирование, Садо Мазо', slug: 'bdsm-porn-videos' },
    { title: 'Фистинг, инсершн, страпон', slug: 'fisting-porn-videos' },
    { title: 'Сперма, сквиртинг', slug: 'sperm-squirt-porn' },
    { title: 'Орал, анилингус, куннилингус', slug: 'oral-porn-videos' },
    { title: 'Секс игрушки', slug: 'sex-toys-porn-videos' },
    { title: 'Соло, стриптиз, мастурбация', slug: 'solo-striptease' },
    { title: 'Публичное порно', slug: 'public-porn-videos' },
    { title: 'Скрытая камера', slug: 'hidden-cameras-porn-videos' },
    { title: 'Куколд порно, измена, рогоносцы', slug: 'cuckold-porn' },
    { title: 'Порно пародии', slug: 'xxx-porn-parody' },
    { title: 'Порно знаменитостей', slug: 'celebrities-porn-videos' },
    { title: 'Классика, любовь, поцелуи, эротика', slug: 'classic-love-kisses-erotic' },
    { title: 'Полнометражные порно фильмы', slug: 'full-porn-movies' },
    { title: 'Эротические фильмы', slug: 'erotic-movies-full' },
    { title: 'Ретро порно фильмы', slug: 'retro-porno-filmy' },
    { title: 'Русские порно фильмы', slug: 'russian-porn-movies' },
    { title: 'Порно с переводом', slug: 'porno-s-perevodom' },
    { title: 'Секс машины', slug: 'sex-mashines-porn-videos' },
    { title: 'Порно Ужасы', slug: 'horror' },
    { title: 'Виртуальное порно VR 360', slug: 'vr-porn-videos' },
  ];

  function cleanUrl(u) {
    if (!u) return '';
    u = String(u).replace(/\\\//g, '/').replace(/\\/g, '').replace(/&amp;/g, '&').trim();
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
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
    function add(label, url) {
      url = cleanUrl(url);
      if (!url || url.indexOf('http') !== 0) return;
      if (/preview|_trailer|screenshot/i.test(url)) return;
      if (!q[label]) q[label] = url;
    }

    // video_url / video_alt_url / video_alt_url2 ...
    var re = /video(?:_alt)?_url(?:\d+)?\s*[:=]\s*['"]([^'"]+)['"]/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var u = m[1];
      var label = 'HD';
      if (/1080|fullhd/i.test(u)) label = '1080p';
      else if (/720|_hd|hd\.mp4/i.test(u)) label = '720p';
      else if (/480|sd|mobile/i.test(u)) label = '480p';
      else if (/360/i.test(u)) label = '360p';
      add(label, u);
    }

    // video_url_720p style
    var re2 = /video_url_(\w+)\s*[:=]\s*['"]([^'"]+)['"]/gi;
    while ((m = re2.exec(html)) !== null) {
      var lab = m[1];
      if (!/p$/i.test(lab) && /^\d+$/.test(lab)) lab = lab + 'p';
      add(lab, m[2]);
    }

    // get_file fallback
    if (!Object.keys(q).length) {
      var re3 = /(['"])(https?:\/\/[^'"]+\/get_file\/[^'"]+\.mp4[^'"]*)\1/gi;
      while ((m = re3.exec(html)) !== null) {
        add('HD', m[2]);
      }
    }

    // relative get_file
    if (!Object.keys(q).length) {
      var re4 = /(['"])(\/get_file\/[^'"]+\.mp4[^'"]*)\1/gi;
      while ((m = re4.exec(html)) !== null) {
        add('HD', HOST + m[2]);
      }
    }

    return q;
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новинки', playlist_url: NAME + '/new' },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  function fetchPage(url, page, success, error) {
    console.log(TAG, 'fetchPage →', url);
    httpGet(url, function (html) {
      var results = parseCards(html);
      if (!results.length) {
        error('Huyamba: ничего не найдено');
        return;
      }
      success({
        results: results,
        collection: true,
        total_pages: results.length >= 20 ? page + 3 : page,
        menu: buildMenu(),
      });
    }, error);
  }

  function routeView(url, page, success, error) {
    page = parseInt(page, 10) || 1;
    url = url || NAME;

    if (url.indexOf(NAME + '/search/') === 0) {
      var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0] || '');
      var searchUrl = HOST + '/search/?q=' + encodeURIComponent(q);
      if (page > 1) searchUrl += '&from_videos=' + ((page - 1) * 24);
      fetchPage(searchUrl, page, success, error);
      return;
    }

    if (url.indexOf(NAME + '/cat/') === 0) {
      var slug = url.replace(NAME + '/cat/', '').split('?')[0].split('/')[0];
      var catUrl = HOST + '/categories/' + slug + '/';
      if (page > 1) catUrl += '?from=' + ((page - 1) * 24);
      fetchPage(catUrl, page, success, error);
      return;
    }

    // новинки / корень
    var listUrl = HOST + '/videos/';
    if (page > 1) listUrl += '?from=' + ((page - 1) * 24);
    fetchPage(listUrl, page, success, error);
  }

  var Parser = {
    main: function (p, success, error) {
      routeView(NAME + '/new', 1, success, error);
    },
    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },
    search: function (params, success, error) {
      var q = (params.query || '').trim();
      var page = parseInt(params.page, 10) || 1;
      if (!q) return success({ results: [], collection: true, total_pages: 1 });
      routeView(NAME + '/search/' + encodeURIComponent(q), page, function (data) {
        data.title = 'Huyamba: ' + q;
        success(data);
      }, error);
    },
    qualities: function (videoUrl, success, error) {
      console.log(TAG, 'qualities →', videoUrl);
      httpGet(videoUrl, function (html) {
        var q = extractQualities(html);
        var keys = Object.keys(q);
        console.log(TAG, 'qualities found:', keys, keys[0] ? q[keys[0]].substring(0, 80) : '');
        if (!keys.length) {
          error('Huyamba: видео не найдено (проверь Worker: awmcdn.net)');
          return;
        }
        success({ qualities: q });
      }, error);
    },
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
