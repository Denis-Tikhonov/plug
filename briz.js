// =============================================================
// briz.js — Парсер PornoBriz для AdultJS / AdultPlugin (Lampa)
// Version  : 1.1.0
// Changed  : [1.0.0] Первая версия.
//            [1.1.0] Добавлено подробное логирование через Lampa.Noty
//                    и console.log/warn/error на каждом этапе работы.
//                    Все уведомления с задержкой 3 секунды.
// =============================================================

(function () {
  'use strict';

  var HOST = 'https://pornobriz.com';
  var NAME = 'briz';
  var TAG  = '[briz]';
  var NOTY_TIME = 3000;

  // ----------------------------------------------------------
  // [1.1.0] ЛОГИРОВАНИЕ
  // ----------------------------------------------------------
  function log(msg, data) {
    console.log(TAG, msg, data !== undefined ? data : '');
  }

  function warn(msg, data) {
    console.warn(TAG, msg, data !== undefined ? data : '');
  }

  function err(msg, data) {
    console.error(TAG, msg, data !== undefined ? data : '');
  }

  function noty(msg) {
    try {
      Lampa.Noty.show(TAG + ' ' + msg, { time: NOTY_TIME });
    } catch (e) {
      console.warn(TAG, 'Noty unavailable:', msg);
    }
  }

  function notyError(msg) {
    try {
      Lampa.Noty.show(TAG + ' ⛔ ' + msg, { time: NOTY_TIME, style: 'error' });
    } catch (e) {
      console.error(TAG, 'Noty unavailable:', msg);
    }
  }

  function notySuccess(msg) {
    try {
      Lampa.Noty.show(TAG + ' ✅ ' + msg, { time: NOTY_TIME });
    } catch (e) {
      console.log(TAG, 'Noty unavailable:', msg);
    }
  }

  // ----------------------------------------------------------
  // [1.0.0] HTTP
  // [1.1.0] Логирование каждого этапа
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    log('httpGet → запрос:', url);
    noty('Загрузка: ' + url.substring(0, 60) + '...');

    try {
      var net = new Lampa.Reguest();
      net.silent(
        url,
        function (data) {
          if (typeof data === 'string' && data.length > 50) {
            log('httpGet → Lampa.Reguest OK, длина:', data.length);
            notySuccess('Reguest OK (' + data.length + ' символов)');
            success(data);
          } else {
            warn('httpGet → Lampa.Reguest вернул мало данных, длина:', (data || '').length);
            noty('Reguest: мало данных (' + (data || '').length + '), пробую fetch...');
            _fallback(url, success, error);
          }
        },
        function (e) {
          warn('httpGet → Lampa.Reguest ошибка:', e);
          noty('Reguest ошибка, пробую fetch...');
          _fallback(url, success, error);
        },
        false,
        { dataType: 'text', timeout: 12000 }
      );
    } catch (e) {
      err('httpGet → исключение Lampa.Reguest:', e.message);
      notyError('Исключение Reguest: ' + e.message);
      _fallback(url, success, error);
    }
  }

  function _fallback(url, success, error) {
    if (typeof fetch === 'undefined') {
      err('_fallback → fetch недоступен');
      notyError('fetch недоступен в этом окружении');
      error('fetch unavailable');
      return;
    }

    log('_fallback → пробую fetch:', url);
    noty('Fetch: ' + url.substring(0, 60) + '...');

    fetch(url, { method: 'GET' })
      .then(function (r) {
        log('_fallback → fetch статус:', r.status);
        if (!r.ok) {
          notyError('Fetch HTTP ' + r.status);
          throw new Error('HTTP ' + r.status);
        }
        return r.text();
      })
      .then(function (text) {
        log('_fallback → fetch OK, длина:', text.length);
        notySuccess('Fetch OK (' + text.length + ' символов)');
        success(text);
      })
      .catch(function (e) {
        err('_fallback → fetch ошибка:', e.message || e);
        notyError('Fetch ошибка: ' + (e.message || e));
        error(e);
      });
  }

  // ----------------------------------------------------------
  // [1.0.0] ПОСТРОЕНИЕ URL
  // [1.1.0] Логирование
  // ----------------------------------------------------------
  var SORTS = [
    { title: 'Новинки',      val: '',    urlTpl: 'new/page{page}/'  },
    { title: 'Топ рейтинга', val: 'top', urlTpl: 'top/page{page}/'  },
    { title: 'Популярное',   val: 'best',urlTpl: 'best/page{page}/' },
  ];

  var CATS = [
    { title: 'Русское порно',  val: 'russian' },
    { title: 'Анальный секс',  val: 'anal'    },
    { title: 'Лесбиянки',      val: 'lesbian' },
    { title: 'Зрелые',         val: 'mature'  },
    { title: 'Минет',          val: 'blowjob' },
    { title: 'Большие сиськи', val: 'big-tits'},
    { title: 'Молодые',        val: 'teen'    },
    { title: 'Домашнее',       val: 'amateur' },
    { title: 'Групповое',      val: 'group'   },
  ];

  function buildUrl(sort, cat, search, page) {
    page = page || 1;
    var result;

    if (search) {
      result = HOST + '/search/' + encodeURIComponent(search) + '/page' + page + '/';
    } else if (cat) {
      result = HOST + '/' + cat + '/page' + page + '/';
    } else {
      var sortObj = SORTS.find(function (s) { return s.val === sort; }) || SORTS[0];
      result = HOST + '/' + sortObj.urlTpl.replace('{page}', page);
    }

    log('buildUrl →', { sort: sort, cat: cat, search: search, page: page, result: result });
    return result;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПАРСИНГ КАТАЛОГА
  // [1.1.0] Подробное логирование каждого шага парсинга
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    if (!html) {
      warn('parsePlaylist → html пустой');
      notyError('Парсинг: HTML пустой');
      return [];
    }

    log('parsePlaylist → длина HTML:', html.length);
    noty('Парсинг HTML (' + html.length + ' символов)...');

    var doc;
    try {
      doc = new DOMParser().parseFromString(html, 'text/html');
      log('parsePlaylist → DOMParser OK');
    } catch (e) {
      err('parsePlaylist → DOMParser ошибка:', e.message);
      notyError('DOMParser ошибка: ' + e.message);
      return [];
    }

    var cards = [];

    // ----------------------------------------------------------
    // Стратегия 1: XPath
    // ----------------------------------------------------------
    log('parsePlaylist → Стратегия 1: XPath...');
    try {
      var nodes = doc.evaluate(
        "//div[contains(@class,'thumb_main')]",
        doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
      );
      log('parsePlaylist → XPath найдено узлов:', nodes.snapshotLength);
      noty('XPath: найдено ' + nodes.snapshotLength + ' узлов');

      for (var i = 0; i < nodes.snapshotLength; i++) {
        var el = nodes.snapshotItem(i);
        var card = _extractCard(el);
        if (card) cards.push(card);
      }

      log('parsePlaylist → XPath извлечено карточек:', cards.length);
    } catch (e) {
      warn('parsePlaylist → XPath ошибка:', e.message);
      notyError('XPath ошибка: ' + e.message);
    }

    // ----------------------------------------------------------
    // Стратегия 2: CSS-селекторы (fallback)
    // ----------------------------------------------------------
    if (!cards.length) {
      log('parsePlaylist → Стратегия 2: CSS-селекторы...');
      noty('XPath не дал результатов, пробую CSS...');

      var selectors = [
        '.thumb_main',
        '.thumb-main',
        '.video-item',
        '.item',
        '.th-wrap',
        '.thumb',
        'article',
      ];

      for (var s = 0; s < selectors.length; s++) {
        var sel = selectors[s];
        var els = doc.querySelectorAll(sel);
        log('parsePlaylist → CSS "' + sel + '" найдено:', els.length);

        if (els.length > 0) {
          noty('CSS "' + sel + '": найдено ' + els.length + ' элементов');
          els.forEach(function (el) {
            var card = _extractCard(el);
            if (card) cards.push(card);
          });
          if (cards.length > 0) {
            log('parsePlaylist → CSS "' + sel + '" извлечено карточек:', cards.length);
            break;
          }
        }
      }
    }

    // ----------------------------------------------------------
    // Стратегия 3: Поиск всех ссылок с изображениями (последний fallback)
    // ----------------------------------------------------------
    if (!cards.length) {
      log('parsePlaylist → Стратегия 3: все ссылки с img...');
      noty('CSS не дал результатов, ищу все ссылки с картинками...');

      var allLinks = doc.querySelectorAll('a[href]');
      log('parsePlaylist → всего ссылок на странице:', allLinks.length);

      allLinks.forEach(function (a) {
        var href = a.getAttribute('href') || '';
        var img  = a.querySelector('img');
        if (!img) return;
        if (href.indexOf('/video') === -1 && href.indexOf('/watch') === -1) return;
        if (href.indexOf('http') !== 0) href = HOST + href;

        var name = a.getAttribute('title') || a.textContent.trim().substring(0, 80);
        if (!name || name.length < 3) return;

        var picture = img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('src') || '';

        cards.push({
          name:    name,
          video:   href,
          picture: picture,
          preview: null,
          time:    '',
          quality: 'HD',
          json:    true,
          related: true,
          model:   null,
          source:  NAME,
        });
      });

      log('parsePlaylist → Стратегия 3 извлечено:', cards.length);
    }

    // ----------------------------------------------------------
    // [1.1.0] Дамп структуры для отладки если ничего не найдено
    // ----------------------------------------------------------
    if (!cards.length) {
      warn('parsePlaylist → НИ ОДНА СТРАТЕГИЯ НЕ СРАБОТАЛА');
      notyError('Карточки не найдены! Смотрите консоль.');

      // Выводим первые 500 символов body для анализа
      var bodyHtml = doc.body ? doc.body.innerHTML : '';
      warn('parsePlaylist → body (первые 500 символов):', bodyHtml.substring(0, 500));

      // Выводим все CSS-классы верхнего уровня
      var topClasses = [];
      if (doc.body) {
        var children = doc.body.children;
        for (var c = 0; c < Math.min(children.length, 20); c++) {
          topClasses.push({
            tag:     children[c].tagName,
            id:      children[c].id || '',
            classes: children[c].className || '',
          });
        }
      }
      warn('parsePlaylist → top-level элементы body:', JSON.stringify(topClasses));

      // Выводим все div-ы с классами содержащими "thumb"
      var thumbDivs = doc.querySelectorAll('div[class*="thumb"]');
      warn('parsePlaylist → div с "thumb" в классе:', thumbDivs.length);
      thumbDivs.forEach(function (d, idx) {
        if (idx < 5) warn('  thumb div #' + idx + ':', d.className);
      });
    } else {
      log('parsePlaylist → ИТОГО карточек:', cards.length);
      notySuccess('Найдено ' + cards.length + ' видео');
      // Выводим первую карточку для проверки
      log('parsePlaylist → первая карточка:', JSON.stringify(cards[0]));
    }

    return cards;
  }

  // ----------------------------------------------------------
  // [1.1.0] Извлечение одной карточки из DOM-элемента
  // ----------------------------------------------------------
  function _extractCard(el) {
    // Ссылка
    var aEl  = el.querySelector('a');
    var href = aEl ? aEl.getAttribute('href') : '';
    if (!href) return null;
    if (href.indexOf('http') !== 0) href = HOST + href;

    // Название
    var titleEl = el.querySelector('.th-title');
    var name    = titleEl ? titleEl.textContent.trim() : '';
    if (!name && aEl) name = aEl.getAttribute('title') || '';
    if (!name) {
      // Попробуем другие варианты
      var altTitle = el.querySelector('.title, h3, h4, .name');
      if (altTitle) name = altTitle.textContent.trim();
    }
    if (!name) return null;

    // Картинка
    var imgEl   = el.querySelector('img');
    var picture = imgEl
      ? (imgEl.getAttribute('data-original') || imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '')
      : '';

    // Превью
    var vidEl   = el.querySelector('video');
    var preview = vidEl
      ? (vidEl.getAttribute('data-preview') || vidEl.getAttribute('src') || '')
      : '';

    // Длительность
    var durEl = el.querySelector('.duration, .time, .dur');
    var time  = durEl ? durEl.textContent.trim() : '';

    return {
      name:    name,
      video:   href,
      picture: picture,
      preview: preview || null,
      time:    time,
      quality: 'HD',
      json:    true,
      related: true,
      model:   null,
      source:  NAME,
    };
  }

  // ----------------------------------------------------------
  // [1.0.0] ПОЛУЧЕНИЕ ПРЯМЫХ ССЫЛОК
  // [1.1.0] Подробное логирование
  // ----------------------------------------------------------
  function getStreamLinks(videoPageUrl, success, error) {
    log('getStreamLinks → загрузка страницы видео:', videoPageUrl);
    noty('Получаю ссылки: ' + videoPageUrl.substring(0, 50) + '...');

    httpGet(videoPageUrl, function (html) {
      log('getStreamLinks → HTML получен, длина:', html.length);

      var qualitys = {};

      // ----------------------------------------------------------
      // Стратегия 1: оригинальный regex src="..." type="video/mp4" size="..."
      // ----------------------------------------------------------
      var sizes = ['1080', '720', '480', '360', '240'];
      sizes.forEach(function (size) {
        var m = html.match(new RegExp('src="([^"]+)"\\s+type="video/mp4"\\s+size="' + size + '"'));
        if (m && m[1]) {
          qualitys[size + 'p'] = m[1];
          log('getStreamLinks → Стратегия 1: найдено ' + size + 'p:', m[1].substring(0, 80));
        }
      });

      log('getStreamLinks → Стратегия 1 результат:', Object.keys(qualitys).length + ' качеств');

      // ----------------------------------------------------------
      // Стратегия 2: source с атрибутами в любом порядке
      // ----------------------------------------------------------
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 2: source теги...');
        sizes.forEach(function (size) {
          // size="720" ... src="..."
          var m = html.match(new RegExp('size="' + size + '"[^>]*src="([^"]+)"'));
          if (m && m[1]) qualitys[size + 'p'] = m[1];
          // label="720p" ... src="..."
          if (!qualitys[size + 'p']) {
            m = html.match(new RegExp('label="' + size + 'p?"[^>]*src="([^"]+)"'));
            if (m && m[1]) qualitys[size + 'p'] = m[1];
          }
          // res="720" ... src="..."
          if (!qualitys[size + 'p']) {
            m = html.match(new RegExp('res="' + size + '"[^>]*src="([^"]+)"'));
            if (m && m[1]) qualitys[size + 'p'] = m[1];
          }
        });
        log('getStreamLinks → Стратегия 2 результат:', Object.keys(qualitys).length + ' качеств');
      }

      // ----------------------------------------------------------
      // Стратегия 3: JSON в скрипте (sources: [...])
      // ----------------------------------------------------------
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 3: JSON sources...');
        var jsonMatch = html.match(/sources\s*[:=]\s*(\[[\s\S]*?\])/);
        if (jsonMatch) {
          log('getStreamLinks → найден массив sources:', jsonMatch[1].substring(0, 200));
          try {
            var sources = JSON.parse(jsonMatch[1].replace(/'/g, '"'));
            sources.forEach(function (s) {
              var label = (s.label || s.size || s.quality || 'auto').toString().replace(/\s/g, '');
              var src   = s.file || s.src || s.url || '';
              if (src) qualitys[label] = src;
            });
          } catch (e) {
            warn('getStreamLinks → JSON parse ошибка:', e.message);
          }
        }
        log('getStreamLinks → Стратегия 3 результат:', Object.keys(qualitys).length + ' качеств');
      }

      // ----------------------------------------------------------
      // Стратегия 4: любые .mp4 ссылки
      // ----------------------------------------------------------
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 4: все .mp4 ссылки...');
        var re = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
        var m2, idx = 0;
        while ((m2 = re.exec(html)) !== null && idx < 5) {
          qualitys['auto' + (idx || '')] = m2[1];
          log('getStreamLinks → найден mp4 #' + idx + ':', m2[1].substring(0, 80));
          idx++;
        }
        log('getStreamLinks → Стратегия 4 результат:', Object.keys(qualitys).length + ' ссылок');
      }

      // ----------------------------------------------------------
      // Стратегия 5: .m3u8 ссылки (HLS)
      // ----------------------------------------------------------
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 5: .m3u8 ссылки...');
        var reHls = /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g;
        var m3;
        while ((m3 = reHls.exec(html)) !== null) {
          qualitys['HLS'] = m3[1];
          log('getStreamLinks → найден m3u8:', m3[1].substring(0, 80));
          break;
        }
        log('getStreamLinks → Стратегия 5 результат:', Object.keys(qualitys).length + ' ссылок');
      }

      // ----------------------------------------------------------
      // Итог
      // ----------------------------------------------------------
      var count = Object.keys(qualitys).length;
      if (!count) {
        err('getStreamLinks → НИ ОДНА СТРАТЕГИЯ НЕ НАШЛА ССЫЛОК');
        notyError('Нет mp4/m3u8 ссылок на странице видео!');

        // Дамп фрагментов HTML для отладки
        // Ищем все <source> и <video> теги
        var sourceMatches = html.match(/<source[^>]*>/gi) || [];
        warn('getStreamLinks → <source> теги (' + sourceMatches.length + '):', sourceMatches.slice(0, 5));

        var videoMatches = html.match(/<video[^>]*>[\s\S]*?<\/video>/gi) || [];
        warn('getStreamLinks → <video> блоки (' + videoMatches.length + '):', videoMatches.slice(0, 2));

        // Ищем слово "mp4" в HTML
        var mp4Mentions = (html.match(/mp4/gi) || []).length;
        warn('getStreamLinks → упоминаний "mp4" в HTML:', mp4Mentions);

        // Ищем слово "m3u8"
        var hlsMentions = (html.match(/m3u8/gi) || []).length;
        warn('getStreamLinks → упоминаний "m3u8" в HTML:', hlsMentions);

        error('PornoBriz: нет mp4/m3u8');
        return;
      }

      log('getStreamLinks → ИТОГО качеств:', count, qualitys);
      notySuccess('Найдено ' + count + ' качеств');

      // Выводим все найденные качества
      Object.keys(qualitys).forEach(function (q) {
        log('  ' + q + ' → ' + qualitys[q].substring(0, 80));
      });

      success({ qualitys: qualitys });
    }, function (e) {
      err('getStreamLinks → ошибка загрузки страницы:', e);
      notyError('Ошибка загрузки страницы видео');
      error(e);
    });
  }

  // ----------------------------------------------------------
  // [1.0.0] МЕНЮ ФИЛЬТРА
  // ----------------------------------------------------------
  function parseState(url) {
    var sort = '', cat = '', search = '';
    var path = (url || '').replace(HOST, '').replace(/^\//, '');

    if (path.indexOf('search/') === 0) {
      search = decodeURIComponent(path.split('/')[1] || '');
    } else {
      SORTS.forEach(function (s) {
        if (s.val && path.indexOf(s.val + '/') === 0) sort = s.val;
      });
      if (!sort) {
        CATS.forEach(function (c) {
          if (path.indexOf(c.val + '/') === 0) cat = c.val;
        });
      }
    }

    log('parseState →', { url: url, sort: sort, cat: cat, search: search });
    return { sort: sort, cat: cat, search: search };
  }

  function buildMenu(url) {
    var state    = parseState(url || '');
    var sortObj  = SORTS.find(function (s) { return s.val === state.sort; }) || SORTS[0];
    var catObj   = CATS.find(function (c)  { return c.val === state.cat;  });

    var items = [{ title: 'Поиск', playlist_url: HOST, search_on: true }];

    items.push({
      title:        'Сортировка: ' + sortObj.title,
      playlist_url: 'submenu',
      submenu:      SORTS.map(function (s) {
        return { title: s.title, playlist_url: HOST + '/' + s.urlTpl.replace('{page}', '1') };
      }),
    });

    items.push({
      title:        'Категория: ' + (catObj ? catObj.title : 'Все'),
      playlist_url: 'submenu',
      submenu:      CATS.map(function (c) {
        return { title: c.title, playlist_url: HOST + '/' + c.val + '/page1/' };
      }),
    });

    return items;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // [1.1.0] Логирование входа/выхода каждого метода
  // ----------------------------------------------------------
  var BrizParser = {

    main: function (params, success, error) {
      log('main() → вызван, params:', JSON.stringify(params));
      noty('Загрузка главной страницы...');

      httpGet(buildUrl('', '', '', 1), function (html) {
        var results = parsePlaylist(html);
        if (!results.length) {
          err('main() → нет карточек');
          notyError('Главная: карточки не найдены');
          error('PornoBriz: нет карточек');
          return;
        }
        log('main() → успех, карточек:', results.length);
        notySuccess('Главная: ' + results.length + ' видео');
        success({ results: results, collection: true, total_pages: 30, menu: buildMenu(HOST) });
      }, function (e) {
        err('main() → ошибка загрузки:', e);
        notyError('Главная: ошибка загрузки');
        error(e);
      });
    },

    view: function (params, success, error) {
      log('view() → вызван, params:', JSON.stringify(params));

      var rawUrl = (params.url || HOST).replace(/[?&]pg=\d+/, '');
      var page   = parseInt(params.page, 10) || 1;
      var state  = parseState(rawUrl);
      var loadUrl = buildUrl(state.sort, state.cat, state.search, page);

      log('view() → loadUrl:', loadUrl, 'page:', page);
      noty('Загрузка страницы ' + page + '...');

      httpGet(loadUrl, function (html) {
        var results = parsePlaylist(html);
        if (!results.length) {
          err('view() → нет карточек');
          notyError('Каталог: карточки не найдены');
          error('PornoBriz: нет карточек');
          return;
        }
        log('view() → успех, карточек:', results.length);
        notySuccess('Каталог: ' + results.length + ' видео');
        success({
          results:     results,
          collection:  true,
          total_pages: results.length >= 20 ? page + 5 : page,
          menu:        buildMenu(rawUrl),
        });
      }, function (e) {
        err('view() → ошибка загрузки:', e);
        notyError('Каталог: ошибка загрузки');
        error(e);
      });
    },

    search: function (params, success, error) {
      var query = params.query || '';
      var page  = parseInt(params.page, 10) || 1;
      log('search() → запрос:', query, 'страница:', page);
      noty('Поиск: "' + query + '"...');

      httpGet(buildUrl('', '', query, page), function (html) {
        var results = parsePlaylist(html);
        if (!results.length) {
          warn('search() → ничего не найдено');
          notyError('Поиск: ничего не найдено');
          error('PornoBriz: ничего не найдено');
          return;
        }
        log('search() → найдено:', results.length);
        notySuccess('Поиск: ' + results.length + ' результатов');
        success({
          title:       'PornoBriz: ' + query,
          results:     results,
          url:         HOST + '/search/' + encodeURIComponent(query) + '/page1/',
          collection:  true,
          total_pages: page + 5,
        });
      }, function (e) {
        err('search() → ошибка:', e);
        notyError('Поиск: ошибка загрузки');
        error(e);
      });
    },

    qualitys: function (videoUrl, success, error) {
      log('qualitys() → вызван для:', videoUrl);
      noty('Получение качеств видео...');
      getStreamLinks(videoUrl, success, error);
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] РЕГИСТРАЦИЯ
  // [1.1.0] Логирование
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BrizParser);
      log('v1.1.0 зарегистрирован OK');
      notySuccess('Парсер PornoBriz v1.1.0 загружен');
      return true;
    }
    log('AdultPlugin ещё не доступен, жду...');
    return false;
  }

  if (!tryRegister()) {
    var _elapsed = 0;
    var _timer = setInterval(function () {
      _elapsed += 100;
      if (tryRegister() || _elapsed >= 10000) {
        clearInterval(_timer);
        if (_elapsed >= 10000 && !Parsers) {
          err('Не удалось зарегистрироваться за 10 секунд!');
          notyError('PornoBriz: таймаут регистрации!');
        }
      }
    }, 100);
  }

})();
