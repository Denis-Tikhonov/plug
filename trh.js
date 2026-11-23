// =============================================================
// trh.js — Парсер TrahKino (trahkino.me) для AdultJS
// Version  : 1.5.0
// Changes  :
//   [1.5.0] FIX cleanMp4Url: не портить v-acctoken (не добавлять / в конец query)
//           qualities: video_url + get_file с сохранением token
//           Worker: trahkino.me + tkvids.com + cookie-jar
//   [1.4.0] UNIVERSAL_TEMPLATE, function/0 cleanUrl
// =============================================================
(function () {
  'use strict';

  var VERSION = '1.5.0';
  var NAME    = 'trh';
  var HOST    = 'https://trahkino.me';
  var TAG     = '[trh v' + VERSION + ']';

  var CATEGORIES = [
    { title: '4K', slug: '4k' },
    { title: 'Full HD', slug: 'full-hd' },
    { title: 'Азиатки', slug: 'aziatki' },
    { title: 'Анал', slug: 'anal' },
    { title: 'Анилингус', slug: 'anilingus' },
    { title: 'Арабки', slug: 'arabki' },
    { title: 'Бабушки', slug: 'babushki' },
    { title: 'БДСМ', slug: 'bdsm' },
    { title: 'Бикини', slug: 'bikini' },
    { title: 'Блондинки', slug: 'blondinki' },
    { title: 'Большие попки', slug: 'bolshie-popki' },
    { title: 'Большие сиськи', slug: 'bolshie-siski' },
    { title: 'Большие члены', slug: 'bolshie-hui' },
    { title: 'Бондаж', slug: 'bondaj' },
    { title: 'Босс', slug: 'boss' },
    { title: 'Брат и сестра', slug: 'brat-i-sestra' },
    { title: 'Бритые киски', slug: 'britye-kiski' },
    { title: 'Брюнетки', slug: 'bryunetki' },
    { title: 'В ванной', slug: 'v-vannoy' },
    { title: 'В колготках', slug: 'v-kolgotkah' },
    { title: 'В латексе', slug: 'lateks' },
    { title: 'В лесу', slug: 'v-lesu' },
    { title: 'В масле', slug: 'v-masle' },
    { title: 'В машине', slug: 'v-mashine' },
    { title: 'В нижнем белье', slug: 'v-nijnem-bele' },
    { title: 'В офисе', slug: 'v-ofise' },
    { title: 'В очках', slug: 'v-ochkah' },
    { title: 'В туалете', slug: 'v-tualete' },
    { title: 'В униформе', slug: 'v-uniforme' },
    { title: 'В чулках', slug: 'v-chulkah' },
    { title: 'Веб-камера', slug: 'veb-kamera' },
    { title: 'Вечеринки', slug: 'vecherinki' },
    { title: 'Волосатые киски', slug: 'volosatye-kiski' },
    { title: 'Втроём', slug: 'vtroem' },
    { title: 'Вчетвером', slug: 'vchetverom' },
    { title: 'Глубокая глотка', slug: 'glubokaya-glotka' },
    { title: 'Горничная', slug: 'gornichnaya' },
    { title: 'Грудастые', slug: 'grudastye' },
    { title: 'Групповуха', slug: 'gruppovuha' },
    { title: 'Двойное проникновение', slug: 'dvoynoe-proniknovenie' },
    { title: 'Дилдо', slug: 'dildo' },
    { title: 'Доктор', slug: 'doktor' },
    { title: 'Домашнее', slug: 'domashka' },
    { title: 'Доминирование', slug: 'dominirovanie' },
    { title: 'Дрочка', slug: 'drochka-chlena' },
    { title: 'Женский оргазм', slug: 'jenskiy-orgazm' },
    { title: 'Жесть', slug: 'jest' },
    { title: 'ЖМЖ', slug: 'jmj' },
    { title: 'Жёны', slug: 'jeny' },
    { title: 'За деньги', slug: 'za-dengi' },
    { title: 'Зрелые', slug: 'zrelye' },
    { title: 'Измены', slug: 'izmeny' },
    { title: 'Индуски', slug: 'induski' },
    { title: 'Испанкы', slug: 'ispanki' },
    { title: 'Китаянки', slug: 'kitayanki' },
    { title: 'Кончают', slug: 'konchayut' },
    { title: 'Кончают внутрь', slug: 'konchayut-vnutr' },
    { title: 'Красивый секс', slug: 'krasivyy-seks' },
    { title: 'Крупный план', slug: 'krupno' },
    { title: 'Латинки', slug: 'latinki' },
    { title: 'Лижет яйца', slug: 'lijet-yayca' },
    { title: 'Любительское', slug: 'lyubitelskiy-seks' },
    { title: 'Мачеха', slug: 'macheha' },
    { title: 'Маленькие сиськи', slug: 'malenkie-siski' },
    { title: 'Мастурбация', slug: 'masturbaciya' },
    { title: 'Медсестра', slug: 'medsestra' },
    { title: 'Между сисек', slug: 'mejdu-sisek' },
    { title: 'Милфы', slug: 'milfy' },
    { title: 'Минет', slug: 'minet' },
    { title: 'Мулатки', slug: 'mulatki' },
    { title: 'Мультики', slug: 'multiki' },
    { title: 'На каблуках', slug: 'na-kablukah' },
    { title: 'На кровати', slug: 'na-krovati' },
    { title: 'На природе', slug: 'na-prirode' },
    { title: 'На публике', slug: 'na-publike' },
    { title: 'Наездница', slug: 'naezdnica' },
    { title: 'Натуральные сиськи', slug: 'naturalnye-siski' },
    { title: 'Негры', slug: 'negry' },
    { title: 'Немки', slug: 'nemki' },
    { title: 'Оргии', slug: 'orgii' },
    { title: 'От первого лица', slug: 'ot-pervogo-lica' },
    { title: 'Падчерица', slug: 'padcherica' },
    { title: 'Пары', slug: 'pary' },
    { title: 'Пасынок', slug: 'pasynok' },
    { title: 'Пикап', slug: 'pikap' },
    { title: 'Пирсинг', slug: 'pirsing' },
    { title: 'Подборки', slug: 'podborki' },
    { title: 'Пьяные', slug: 'pyanye' },
    { title: 'Разврат', slug: 'razvrat' },
    { title: 'Раком', slug: 'rakom' },
    { title: 'Реальное', slug: 'realnyy-seks' },
    { title: 'Ролевые игры', slug: 'rolevye-igry' },
    { title: 'Русское', slug: 'russkie' },
    { title: 'Рыжие', slug: 'ryjie' },
    { title: 'С разговорами', slug: 's-razgovorami' },
    { title: 'Свингеры', slug: 'svingery' },
    { title: 'Секретарши', slug: 'sekretarshi' },
    { title: 'Секс-игрушки', slug: 'igrushki' },
    { title: 'Сексвайф', slug: 'seksvayf' },
    { title: 'Силиконовые сиськи', slug: 'silikonovye-siski' },
    { title: 'Скрытая камера', slug: 'skrytaya-kamera' },
    { title: 'Соло', slug: 'solo' },
    { title: 'Спалили', slug: 'spalili' },
    { title: 'Сперма', slug: 'sperma' },
    { title: 'Спортсменки', slug: 'sportsmenki' },
    { title: 'Спящие', slug: 'spyashchie' },
    { title: 'Страпон', slug: 'strapon' },
    { title: 'Стриптиз', slug: 'striptiz' },
    { title: 'Стройные', slug: 'stroynye' },
    { title: 'Студенты', slug: 'studenty' },
    { title: 'Тату', slug: 'tatu' },
    { title: 'Толстушки', slug: 'tolstye' },
    { title: 'Украинки', slug: 'ukrainki' },
    { title: 'Училки', slug: 'uchitel' },
    { title: 'Фетиш', slug: 'fetish' },
    { title: 'Фистинг', slug: 'fisting' },
    { title: 'Француженки', slug: 'francujenki' },
    { title: 'Хардкор', slug: 'hardkor' },
    { title: 'Хентай', slug: 'hentay' },
    { title: 'Худые', slug: 'hudye' },
    { title: 'Частное', slug: 'chastnyy-seks' },
    { title: 'Чешки', slug: 'cheshki' },
    { title: 'Эротика', slug: 'erotika' },
    { title: 'Японки', slug: 'yaponki' },
    { title: 'Эротический массаж', slug: 'eroticheskiy-massaj' },
  ];

  var VIDEO_RULES = [
    { label: 'HD',   re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/i },
    { label: '480p', re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/i },
    { label: '720p', re: /video_alt_url2\s*[:=]\s*['"]([^'"]+)['"]/i },
    { label: '360p', re: /video_alt_url3\s*[:=]\s*['"]([^'"]+)['"]/i },
    { label: 'HLS',  re: /video_url_hls\s*[:=]\s*['"]([^'"]+)['"]/i }
  ];

  var CARD_SELECTORS = ['.item', '.thumb', '.video-item', 'div[class*="thumb"]'];

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function (r) { return r.text(); }).then(success).catch(error);
    }
  }

  function cleanUrl(raw) {
    if (!raw) return '';
    var u = String(raw).replace(/\\\//g, '/').replace(/\\/g, '').replace(/&amp;/g, '&').trim();
    var funcMatch = u.match(/function\/\d+\/(https?:\/\/.+)$/i);
    if (funcMatch) u = funcMatch[1];
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') u = HOST + u;
    return u;
  }

  // [1.5.0] НЕ дописывать "/" после query — ломает v-acctoken
  function cleanMp4Url(url) {
    if (!url) return '';
    var i = url.indexOf('?');
    var path = i === -1 ? url : url.slice(0, i);
    var qs = i === -1 ? '' : url.slice(i);
    path = path.replace(/\/+$/, '');
    // убрать только rnd/br/_ из query, token оставить
    if (qs) {
      qs = qs
        .replace(/[?&]rnd=\d+/g, '')
        .replace(/[?&]br=\d+/g, '')
        .replace(/[?&]_=\d+/g, '')
        .replace(/^[?&]+/, '?')
        .replace(/[?&]+$/, '');
      if (qs === '?') qs = '';
    }
    return path + qs;
  }

  function extractQualities(html) {
    var q = {};
    var add = function (label, url) {
      var u = cleanUrl(url);
      if (!u || u.indexOf('{') !== -1 || u.indexOf('spacer') !== -1) return;
      if (u.indexOf('.mp4') !== -1 || u.indexOf('get_file') !== -1) {
        u = cleanMp4Url(u);
      }
      if (!u) return;
      // не брать превью скриншотов
      if (u.indexOf('videos_screenshots') !== -1 || u.indexOf('preview') !== -1) return;
      if (!q[label]) q[label] = u;
    };

    VIDEO_RULES.forEach(function (rule) {
      var m = html.match(rule.re);
      if (m && m[1]) {
        var lab = rule.label;
        var um = m[1].match(/_(\d+)p\.mp4/i);
        if (um) lab = um[1] + 'p';
        add(lab, m[1]);
      }
    });

    var getFileRe = /https?:\/\/[^"'\s]+\/get_file\/[^"'\s]+/gi;
    var match;
    while ((match = getFileRe.exec(html)) !== null) {
      var url = match[0];
      if (url.indexOf('videos_screenshots') !== -1) continue;
      var qm = url.match(/_(\d+)p\.mp4/i);
      add(qm ? qm[1] + 'p' : 'HD', url);
    }

    return q;
  }

  function makeCard(name, href, pic, time) {
    return {
      name: name,
      video: href,
      picture: pic || '',
      img: pic || '',
      poster: pic || '',
      background_image: pic || '',
      time: time || '',
      quality: 'HD',
      json: true,
      source: NAME
    };
  }

  function parsePlaylist(html) {
    var results = [];
    var seen = {};
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var items = null;
      for (var s = 0; s < CARD_SELECTORS.length; s++) {
        items = doc.querySelectorAll(CARD_SELECTORS[s]);
        if (items && items.length) break;
      }
      if (!items || !items.length) {
        items = doc.querySelectorAll('a[href*="/video/"]');
      }

      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var link = el.tagName === 'A' ? el : el.querySelector('a[href*="/video/"]');
        if (!link) continue;
        var href = cleanUrl(link.getAttribute('href') || '');
        if (!href || href.indexOf('/video/') === -1) continue;
        if (seen[href]) continue;
        seen[href] = true;

        var img = el.querySelector ? el.querySelector('img') : null;
        if (!img && link.querySelector) img = link.querySelector('img');
        var pic = '';
        if (img) {
          pic = cleanUrl(
            img.getAttribute('data-original') ||
            img.getAttribute('data-src') ||
            img.getAttribute('src') || ''
          );
          if (pic.indexOf('data:') === 0) pic = '';
        }

        var titleEl = el.querySelector ? el.querySelector('.title, .th-title, .name, strong') : null;
        var name = '';
        if (titleEl) name = titleEl.textContent.replace(/\s+/g, ' ').trim();
        if (!name) name = (link.getAttribute('title') || (img && img.getAttribute('alt')) || '').trim();
        if (!name) continue;

        var d = el.querySelector ? el.querySelector('.duration, .time, [class*="duration"]') : null;
        var time = d ? d.textContent.replace(/[^\d:]/g, '').trim() : '';
        results.push(makeCard(name, href, pic, time));
      }
    } catch (e) {
      console.log(TAG, 'parsePlaylist error', e.message || e);
    }
    console.log(TAG, 'cards', results.length);
    return results;
  }

  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    if (type === 'search') {
      var u = HOST + '/?q=' + encodeURIComponent(value);
      if (page > 1) u += '&page=' + page;
      return u;
    }
    if (type === 'cat') {
      // KVS часто ?c=slug или /categories/slug/
      var u2 = HOST + '/categories/' + encodeURIComponent(value) + '/';
      if (page > 1) u2 += page + '/';
      return u2;
    }
    if (page > 1) return HOST + '/latest-updates/' + page + '/';
    return HOST + '/latest-updates/';
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
        })
      }
    ];
  }

  function routeView(url, page, success, error) {
    page = parseInt(page, 10) || 1;
    var fetchUrl;
    var sm = (url || '').match(/[?&]search=([^&]*)/);
    if (sm) {
      fetchUrl = buildUrl('search', decodeURIComponent(sm[1]), page);
    } else if ((url || '').indexOf(NAME + '/cat/') === 0) {
      fetchUrl = buildUrl('cat', url.replace(NAME + '/cat/', '').split('?')[0].split('/')[0], page);
    } else if ((url || '').indexOf(NAME + '/search/') === 0) {
      var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      fetchUrl = buildUrl('search', q, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log(TAG, 'fetch', fetchUrl);
    httpGet(fetchUrl, function (html) {
      var results = parsePlaylist(html);
      if (!results.length) {
        error('TrahKino: ничего не найдено');
        return;
      }
      success({
        results: results,
        collection: true,
        total_pages: results.length >= 24 ? page + 1 : page,
        menu: buildMenu()
      });
    }, error);
  }

  var TrhParser = {
    main: function (params, success, error) {
      routeView(NAME + '/new', 1, success, error);
    },
    view: function (params, success, error) {
      routeView((params && params.url) || NAME, (params && params.page) || 1, success, error);
    },
    search: function (params, success, error) {
      var query = (params.query || '').trim();
      var page = parseInt(params.page, 10) || 1;
      if (!query) {
        success({ title: '', results: [], collection: true, total_pages: 1 });
        return;
      }
      httpGet(buildUrl('search', query, page), function (html) {
        var r = parsePlaylist(html);
        success({
          title: 'TrahKino: ' + query,
          results: r,
          collection: true,
          total_pages: r.length >= 24 ? page + 1 : page,
          menu: buildMenu()
        });
      }, error);
    },
    qualities: function (videoPageUrl, success, error) {
      console.log(TAG, 'qualities →', videoPageUrl);
      httpGet(videoPageUrl, function (html) {
        if (!html || html.length < 500) {
          error('TrahKino: страница недоступна');
          return;
        }
        var found = extractQualities(html);
        var keys = Object.keys(found);
        console.log(TAG, 'qualities найдено:', keys.length, JSON.stringify(keys));
        if (keys.length) {
          // лог первого URL без порчи token (обрезаем для лога)
          console.log(TAG, 'qualities sample', (found[keys[0]] || '').substring(0, 90));
          success({ qualities: found });
        } else {
          console.log(TAG, 'video_url cnt', (html.match(/video_url/gi) || []).length);
          console.log(TAG, 'get_file cnt', (html.match(/get_file/gi) || []).length);
          error('TrahKino: видео не найдено');
        }
      }, error);
    }
  };

  function tryReg() {
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
      window.AdultPlugin.registerParser(NAME, TrhParser);
      console.log(TAG, 'OK');
      return true;
    }
    return false;
  }
  if (!tryReg()) {
    var t = 0, id = setInterval(function () {
      t += 200;
      if (tryReg() || t > 6000) clearInterval(id);
    }, 200);
  }
})();

