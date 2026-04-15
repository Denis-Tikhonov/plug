// =============================================================
// trh.js — Парсер TrahKino для AdultJS (Lampa)
// Version  : 1.0.0
// Based on : phub_210 (структура) + arch & json data
// =============================================================

(function () {
  'use strict';

  var NAME = 'trh';
  var HOST = 'https://trahkino.me';

  var CATS = [
    { name: "Большие попки", slug: "bolshie-popki" },
    { name: "Большие члены", slug: "bolshie-hui" },
    { name: "Любительское", slug: "lyubitelskiy-seks" },
    { name: "Красотки", slug: "krasotki" },
    { name: "Женский оргазм", slug: "jenskiy-orgazm" },
    { name: "Брюнетки", slug: "bryunetki" },
    { name: "Хардкор", slug: "hardkor" },
    { name: "Наездница", slug: "naezdnica" },
    { name: "Сперма", slug: "sperma" },
    { name: "Минет", slug: "minet" },
    { name: "Пары", slug: "pary" },
    { name: "Домашнее", slug: "domashka" },
    { name: "Full HD", slug: "full-hd" },
    { name: "Групповуха", slug: "gruppovuha" },
    { name: "От первого лица", slug: "ot-pervogo-lica" },
    { name: "Кончают внутрь", slug: "konchayut-vnutr" },
    { name: "Русское", slug: "russkie" },
    { name: "Фетиш", slug: "fetish" },
    { name: "Студенты", slug: "studenty" },
    { name: "Соло", slug: "solo" },
    { name: "Секс-игрушки", slug: "igrushki" },
    { name: "Блондинки", slug: "blondinki" },
    { name: "Мастурбация", slug: "masturbaciya" },
    { name: "Красивое", slug: "krasivyy-seks" },
    { name: "Раком", slug: "rakom" },
    { name: "Свингеры", slug: "svingery" },
    { name: "Спортсменки", slug: "sportsmenki" },
    { name: "Пьяные", slug: "pyanye" },
    { name: "Стриптиз", slug: "striptiz" },
    { name: "Ролевые игры", slug: "rolevye-igry" },
    { name: "На каблуках", slug: "na-kablukah" },
    { name: "На публике", slug: "na-publike" },
    { name: "Кончают", slug: "konchayut" },
    { name: "Медсестра", slug: "medsestra" },
    { name: "За деньги", slug: "za-dengi" },
    { name: "Скрытая камера", slug: "skrytaya-kamera" },
    { name: "Дилдо", slug: "dildo" },
    { name: "Мамки", slug: "mamochki" },
    { name: "Арабки", slug: "arabki" },
    { name: "В очках", slug: "v-ochkah" }
  ];

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  function parseCards(html) {
    if (!html) return [];
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.item');
    var results = [];

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var a = el.querySelector('a[href*="/video/"]');
      if (!a) continue;

      var href = a.getAttribute('href');
      if (href.indexOf('http') !== 0) href = HOST + href;

      var img = el.querySelector('img');
      var pic = img ? (img.getAttribute('data-original') || img.getAttribute('src') || '') : '';
      if (pic.indexOf('//') === 0) pic = 'https:' + pic;

      var titleEl = el.querySelector('.title, strong, a[title]');
      var name = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent || '').trim() : '';

      var dur = el.querySelector('.duration');
      var time = dur ? dur.textContent.trim() : '';

      results.push({
        name: name,
        video: href,
        picture: pic,
        img: pic,
        time: time,
        json: true,
        source: NAME
      });
    }
    return results;
  }

  function buildUrl(cat, page, query) {
    page = parseInt(page, 10) || 1;
    var url = HOST;

    if (query) {
      url += '/?q=' + encodeURIComponent(query);
    } else if (cat) {
      url += '/categories/' + cat + '/';
      // Для категорий пагинация обычно /slug/2/ или через параметр
      if (page > 1) url += page + '/';
      return url; 
    } else {
      url += '/latest-updates/';
      if (page > 1) url += page + '/';
      return url;
    }

    if (page > 1) {
      url += (url.indexOf('?') !== -1 ? '&' : '/?') + 'page=' + page;
    }
    return url;
  }

  function buildMenu() {
    return [
      { title: 'Поиск', search_on: true, playlist_url: NAME + '/search/' },
      {
        title: 'Категории',
        playlist_url: 'submenu',
        submenu: CATS.map(function (c) {
          return { title: c.name, playlist_url: NAME + '/cat/' + c.slug };
        })
      }
    ];
  }

  function routeView(url, page, success, error) {
    var cat = null, query = null;

    if (url.indexOf(NAME + '/search/') === 0) {
      query = url.replace(NAME + '/search/', '').split('?')[0];
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      cat = url.replace(NAME + '/cat/', '').split('?')[0];
    }

    var fetchUrl = buildUrl(cat, page, query);
    httpGet(fetchUrl, function (html) {
      var cards = parseCards(html);
      success({
        results: cards,
        collection: true,
        total_pages: cards.length >= 20 ? page + 1 : page,
        menu: buildMenu()
      });
    }, error);
  }

  var trhParser = {
    main: function (params, success, error) {
      routeView(NAME, 1, success, error);
    },
    view: function (params, success, error) {
      routeView(params.url || NAME, params.page || 1, success, error);
    },
    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var fetchUrl = buildUrl(null, params.page || 1, query);
      httpGet(fetchUrl, function (html) {
        var cards = parseCards(html);
        success({
          title: 'TRH: ' + query,
          results: cards,
          collection: true,
          total_pages: cards.length >= 20 ? (params.page || 1) + 1 : 1
        });
      }, error);
    },
        qualities: function (videoPageUrl, success, error) {
      httpGet(videoPageUrl, function (html) {
        var q = {};
        // Регулярное выражение теперь ищет и полные URL, и относительные пути /get_file/
        var videoRe = /"(https?:\/\/[^"]+?)?(\/get_file\/[^"]+?\.mp4[^"]*)"/g;
        var match;
        var idx = 0;
        
        while ((match = videoRe.exec(html)) !== null && idx < 10) {
          var hostPart = match[1] || '';
          var pathPart = match[2];
          var url = (hostPart + pathPart).replace(/\\/g, '');
          
          if (url.indexOf('preview') !== -1) continue; 
          
          // Добавляем хост, если ссылка относительная
          if (url.indexOf('/') === 0) url = HOST + url;

          // Очищаем URL от параметров (как вы и просили: удаляем всё после ?)
          // Это часто помогает обойти 404, если параметры привязаны к IP или времени
          var cleanUrl = url.split('?')[0];

          var label = 'MP4';
          var qMatch = cleanUrl.match(/_(\d{3,4}p)\.mp4/);
          if (qMatch) {
            label = qMatch[1];
          } else {
            // Пытаемся определить качество по вхождению цифр в путь
            if (cleanUrl.indexOf('1080') !== -1) label = '1080p';
            else if (cleanUrl.indexOf('720')  !== -1) label = '720p';
            else if (cleanUrl.indexOf('480')  !== -1) label = '480p';
            else if (cleanUrl.indexOf('360')  !== -1) label = '360p';
            else label = 'HD ' + (idx + 1);
          }

          if (!q[label]) {
            q[label] = cleanUrl;
            idx++;
          }
        }

        // Дополнительная проверка на внешние ссылки (remote_control)
        // Если через get_file ничего не нашли, ищем ссылки на s4.tkvids.com и аналоги
        if (Object.keys(q).length === 0) {
           var remoteRe = /"(https?:\/\/[^"]+?remote_control\.php[^"]+?file=([^"&]+.mp4)[^"]*)"/g;
           while ((match = remoteRe.exec(html)) !== null) {
              var fileParam = decodeURIComponent(match[2]);
              var labelR = fileParam.match(/_(\d{3,4}p)\.mp4/) ? fileParam.match(/_(\d{3,4}p)\.mp4/)[1] : 'HLS';
              if (!q[labelR]) q[labelR] = match[1].replace(/\\/g, '');
           }
        }

        if (Object.keys(q).length > 0) {
          success({ qualities: q });
        } else {
          error('Видео не найдено');
        }
      }, error);
    }

  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, trhParser);
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var poll = setInterval(function () {
      if (tryRegister()) clearInterval(poll);
    }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }
})();
