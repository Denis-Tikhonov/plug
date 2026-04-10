// =============================================================
// briz.js — Парсер PornoBriz для AdultJS / AdultPlugin (Lampa)
// Version  : 1.3.0
// Changed  :
//   [1.0.0] Первая версия.
//   [1.1.0] Добавлено подробное логирование через Lampa.Noty
//   [1.1.1] Исправлена ReferenceError на Parsers в блоке регистрации
//   [1.1.1] Заменены .find() на совместимые циклы
//   [1.1.1] Заменены NodeList.forEach на Array.prototype.forEach.call
//   [1.1.2] Исправлена ошибка Converting circular structure to JSON
//           JSON.stringify(params) заменён на безопасное логирование
//   [1.2.0] Интеграция Lampa.Network.native + Cloudflare Worker
//           Приоритетная цепочка: native → Reguest → fetch
//           Поддержка централизованного window.AdultPlugin.networkRequest
//           Добавлена функция _nativeRequest()
//           URL запросов проксируются через Cloudflare Worker
//   [1.3.0] BUGFIX: добавлена обработка HTTP 403 от Worker
//           При 403 выводится Noty «Домен не разрешён в Worker»
//           и цепочка тихо переходит к следующему уровню (fallback)
//   [1.3.0] Добавлена авто-проверка workerUrl: если URL не заканчивается
//           на '=', символ '=' добавляется автоматически —
//           пользователь не получит молчаливую ошибку при ручном вводе
//   [1.3.0] Константа WORKER_DEFAULT помечена явной инструкцией:
//           вписать реальный URL задеплоенного Cloudflare Worker
// =============================================================

(function () {
  'use strict';

  var HOST      = 'https://pornobriz.com';
  var NAME      = 'briz';
  var TAG       = '[briz]';
  var NOTY_TIME = 3000;

  // ----------------------------------------------------------
  // [1.2.0] URL Cloudflare Worker
  // [1.3.0] ИНСТРУКЦИЯ: замените строку ниже на реальный URL
  //         вашего задеплоенного воркера, например:
  //         'https://zonaproxy.777b737.workers.dev/?url='
  //
  //         Требования к URL:
  //         - должен заканчиваться на '?url=' или '&url='
  //         - авто-проверка (getWorkerUrl) добавит '=' если забыли
  //
  // Приоритет выбора: AdultPlugin.workerUrl → константа ниже
  // ----------------------------------------------------------
  var WORKER_DEFAULT = 'https://ВАШ-WORKER.ВАШ-АККАУНТ.workers.dev/?url=';

  // ----------------------------------------------------------
  // [1.3.0] Нормализация URL воркера:
  //         если пользователь скопировал URL без завершающего '='
  //         (например, 'https://x.workers.dev/?url') — добавляем его.
  //         Это предотвращает молчаливую ошибку при ручном вводе.
  // ----------------------------------------------------------
  function getWorkerUrl() {
    var url = (window.AdultPlugin && window.AdultPlugin.workerUrl)
      ? window.AdultPlugin.workerUrl
      : WORKER_DEFAULT;

    // Авто-коррекция: добавляем '=' если отсутствует
    if (url && url.charAt(url.length - 1) !== '=') {
      warn('getWorkerUrl → URL не заканчивается на "=", добавляю автоматически');
      url = url + '=';
    }

    return url;
  }

  // ----------------------------------------------------------
  // [1.1.1] ПОЛИФИЛЛЫ для старых WebView
  // ----------------------------------------------------------
  if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
      for (var i = 0; i < this.length; i++) {
        if (predicate(this[i], i, this)) return this[i];
      }
      return undefined;
    };
  }

  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (search, pos) {
      pos = pos || 0;
      return this.indexOf(search, pos) === pos;
    };
  }

  // ----------------------------------------------------------
  // [1.1.1] УТИЛИТА: forEach для NodeList (безопасная)
  // ----------------------------------------------------------
  function forEachNode(nodeList, fn) {
    if (!nodeList || !nodeList.length) return;
    for (var i = 0; i < nodeList.length; i++) {
      fn(nodeList[i], i);
    }
  }

  // ----------------------------------------------------------
  // [1.1.1] УТИЛИТА: найти элемент в массиве (замена .find)
  // ----------------------------------------------------------
  function arrayFind(arr, predicate) {
    if (!arr) return undefined;
    for (var i = 0; i < arr.length; i++) {
      if (predicate(arr[i], i)) return arr[i];
    }
    return undefined;
  }

  // ----------------------------------------------------------
  // [1.1.2] УТИЛИТА: безопасное извлечение полей из params
  // ----------------------------------------------------------
  function safeParams(params) {
    if (!params) return '(null)';
    return JSON.stringify({
      url:       params.url       || '',
      page:      params.page      || '',
      title:     params.title     || '',
      query:     params.query     || '',
      component: params.component || '',
    });
  }

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
  // [1.2.0] СЕТЕВОЙ СЛОЙ
  //
  // Приоритетная цепочка запросов:
  //
  //   0. window.AdultPlugin.networkRequest()
  //      — централизованный метод из AdultJS.js (если доступен)
  //
  //   1. _nativeRequest()
  //      — Lampa.Network.native через Cloudflare Worker
  //      [1.3.0] + обработка 403: Noty + тихий fallback на уровень 2
  //
  //   2. _requestionRequest()
  //      — Lampa.Reguest (стандартный метод Lampa, прямой запрос)
  //
  //   3. _fetchRequest()
  //      — браузерный fetch(), последний резерв (может падать от CORS)
  //
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // [1.2.0] Уровень 1: Lampa.Network.native через Cloudflare Worker
  // [1.3.0] Добавлена отдельная обработка HTTP 403:
  //         выводим Noty «Домен не разрешён в Worker» и вызываем
  //         callback error() чтобы цепочка тихо перешла на уровень 2.
  //         Прочие HTTP-ошибки (404, 5xx) обрабатываются как раньше.
  // ----------------------------------------------------------
  function _nativeRequest(url, success, error) {
    if (typeof Lampa === 'undefined' ||
        !Lampa.Network ||
        typeof Lampa.Network.native !== 'function') {
      log('_nativeRequest → Lampa.Network.native недоступен, пропускаем');
      error('native_unavailable');
      return;
    }

    var workerUrl = getWorkerUrl();
    var fullPath  = workerUrl + encodeURIComponent(url);

    log('_nativeRequest → запрос через Worker:', fullPath.substring(0, 120));
    noty('Native → Worker: ' + url.substring(0, 50) + '...');

    try {
      Lampa.Network.native(
        fullPath,

        // Успех — ответ получен (HTTP 2xx)
        function (result) {
          var text = (typeof result === 'string') ? result : JSON.stringify(result);

          // [1.3.0] Проверяем: Worker мог вернуть JSON с error:true и status:403
          // даже при «успешном» HTTP-ответе (зависит от реализации native)
          if (text && text.indexOf('"status":403') !== -1) {
            warn('_nativeRequest → Worker вернул 403 внутри тела ответа');
            notyError('Домен не разрешён в Worker (403). Проверьте ALLOWED_TARGETS.');
            error('worker_403');
            return;
          }

          if (text && text.length > 50) {
            log('_nativeRequest → OK, длина:', text.length);
            notySuccess('Native OK (' + text.length + ' символов)');
            success(text);
          } else {
            warn('_nativeRequest → слишком мало данных:', (text || '').length);
            error('native_empty_response');
          }
        },

        // Ошибка — сетевая или HTTP
        function (e) {
          // [1.3.0] Lampa.Network.native передаёт объект ошибки или HTTP-статус.
          //         Если статус 403 — это Worker-блокировка домена, а не сетевая ошибка.
          //         Выводим понятное сообщение и делаем тихий fallback.
          var status  = (e && e.status)  ? e.status  : 0;
          var message = (e && e.message) ? e.message : String(e || 'unknown');

          if (status === 403 || message.indexOf('403') !== -1) {
            warn('_nativeRequest → Worker ответил 403 (домен не в белом списке)');
            notyError('Домен не разрешён в Worker. Тихий fallback на прямой запрос.');
            // [1.3.0] Тихий переход к следующему уровню — НЕ останавливаем цепочку
            error('worker_403');
            return;
          }

          warn('_nativeRequest → ошибка:', message);
          notyError('Native ошибка: ' + message.substring(0, 60));
          error(e || 'native_error');
        },

        false,
        { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
      );
    } catch (ex) {
      err('_nativeRequest → исключение:', ex.message);
      notyError('Native исключение: ' + ex.message);
      error(ex.message);
    }
  }

  // ----------------------------------------------------------
  // [1.2.0] Уровень 2: Lampa.Reguest (прямой запрос)
  // ----------------------------------------------------------
  function _requestionRequest(url, success, error) {
    log('_requestionRequest → запрос:', url);
    noty('Reguest: ' + url.substring(0, 50) + '...');

    try {
      var net = new Lampa.Reguest();
      net.silent(
        url,
        function (data) {
          var text = (typeof data === 'string') ? data : '';

          if (text.length > 50) {
            log('_requestionRequest → OK, длина:', text.length);
            notySuccess('Reguest OK (' + text.length + ' символов)');
            success(text);
          } else {
            warn('_requestionRequest → мало данных:', text.length);
            error('reguest_empty_response');
          }
        },
        function (e) {
          warn('_requestionRequest → ошибка:', e);
          error(e || 'reguest_error');
        },
        false,
        { dataType: 'text', timeout: 12000 }
      );
    } catch (ex) {
      err('_requestionRequest → исключение:', ex.message);
      error(ex.message);
    }
  }

  // ----------------------------------------------------------
  // [1.2.0] Уровень 3: браузерный fetch() (последний резерв)
  // ----------------------------------------------------------
  function _fetchRequest(url, success, error) {
    if (typeof fetch === 'undefined') {
      err('_fetchRequest → fetch недоступен в этом окружении');
      notyError('fetch недоступен');
      error('fetch_unavailable');
      return;
    }

    log('_fetchRequest → запрос:', url);
    noty('Fetch: ' + url.substring(0, 50) + '...');

    fetch(url, { method: 'GET' })
      .then(function (r) {
        log('_fetchRequest → статус:', r.status);
        if (!r.ok) {
          notyError('Fetch HTTP ' + r.status);
          throw new Error('HTTP ' + r.status);
        }
        return r.text();
      })
      .then(function (text) {
        log('_fetchRequest → OK, длина:', text.length);
        notySuccess('Fetch OK (' + text.length + ' символов)');
        success(text);
      })
      .catch(function (e) {
        err('_fetchRequest → ошибка:', e.message || e);
        notyError('Fetch ошибка: ' + (e.message || e));
        error(e);
      });
  }

  // ----------------------------------------------------------
  // [1.2.0] httpGet — главная точка входа для всех запросов
  // [1.3.0] При worker_403 цепочка тихо продолжается без остановки
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    log('httpGet → URL:', url);

    // Приоритет 0: централизованный метод из AdultJS.js
    if (window.AdultPlugin &&
        typeof window.AdultPlugin.networkRequest === 'function') {
      log('httpGet → используем централизованный AdultPlugin.networkRequest');
      window.AdultPlugin.networkRequest(url, success, error, { type: 'html' });
      return;
    }

    // Приоритет 1: Lampa.Network.native через Cloudflare Worker
    log('httpGet → уровень 1: Lampa.Network.native + Worker');
    _nativeRequest(url,
      function (text) {
        success(text);
      },
      function (e) {
        // [1.3.0] worker_403 — информируем, но продолжаем цепочку молча
        if (e === 'worker_403') {
          warn('httpGet → worker_403: переход к уровню 2 без лишних сообщений');
        } else {
          warn('httpGet → native не сработал (' + e + '), уровень 2: Lampa.Reguest');
          noty('Native не сработал, пробую Reguest...');
        }

        // Приоритет 2: Lampa.Reguest (прямой запрос)
        _requestionRequest(url,
          function (text) {
            success(text);
          },
          function () {
            // Приоритет 3: fetch() (последний резерв)
            warn('httpGet → Reguest не сработал, уровень 3: fetch');
            noty('Reguest не сработал, пробую fetch...');

            _fetchRequest(url, success, function (fe) {
              err('httpGet → все методы исчерпаны для:', url);
              notyError('Все методы запроса исчерпаны!');
              error(fe || 'all_methods_failed');
            });
          }
        );
      }
    );
  }

  // ----------------------------------------------------------
  // [1.0.0] ПОСТРОЕНИЕ URL
  // ----------------------------------------------------------
  var SORTS = [
    { title: 'Новинки',      val: '',     urlTpl: 'new/page{page}/'  },
    { title: 'Топ рейтинга', val: 'top',  urlTpl: 'top/page{page}/'  },
    { title: 'Популярное',   val: 'best', urlTpl: 'best/page{page}/' },
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
      var sortObj = arrayFind(SORTS, function (s) { return s.val === sort; }) || SORTS[0];
      result = HOST + '/' + sortObj.urlTpl.replace('{page}', page);
    }

    log('buildUrl →', 'sort=' + sort + ' cat=' + cat + ' search=' + search + ' page=' + page + ' → ' + result);
    return result;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПАРСИНГ КАТАЛОГА
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

    // Стратегия 1: XPath с уточнением по @class (быстрее на слабых ТВ)
    log('parsePlaylist → Стратегия 1: XPath...');
    try {
      var nodes = doc.evaluate(
        // [1.3.0] Уточнён XPath: добавлена проверка дочернего элемента 'a'
        // для ускорения поиска карточек на слабых TV-процессорах
        "//div[contains(@class,'thumb_main') and .//a[@href]]",
        doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
      );
      log('parsePlaylist → XPath найдено узлов:', nodes.snapshotLength);
      noty('XPath: найдено ' + nodes.snapshotLength + ' узлов');

      for (var i = 0; i < nodes.snapshotLength; i++) {
        var el   = nodes.snapshotItem(i);
        var card = _extractCard(el);
        if (card) cards.push(card);
      }
      log('parsePlaylist → XPath извлечено карточек:', cards.length);
    } catch (e) {
      warn('parsePlaylist → XPath ошибка:', e.message);
      notyError('XPath ошибка: ' + e.message);
    }

    // Стратегия 2: CSS-селекторы (fallback)
    if (!cards.length) {
      log('parsePlaylist → Стратегия 2: CSS-селекторы...');
      noty('XPath не дал результатов, пробую CSS...');

      var selectors = ['.thumb_main', '.thumb-main', '.video-item', '.item', '.card'];
      for (var s = 0; s < selectors.length; s++) {
        var els = doc.querySelectorAll(selectors[s]);
        if (els.length) {
          log('parsePlaylist → CSS "' + selectors[s] + '" нашёл:', els.length);
          forEachNode(els, function (el2) {
            var card2 = _extractCard(el2);
            if (card2) cards.push(card2);
          });
          if (cards.length) break;
        }
      }
      log('parsePlaylist → CSS извлечено карточек:', cards.length);
    }

    // Стратегия 3: все ссылки с изображениями (последний fallback)
    if (!cards.length) {
      log('parsePlaylist → Стратегия 3: все ссылки с img...');
      noty('CSS не дал результатов, ищу все ссылки с картинками...');

      var allLinks = doc.querySelectorAll('a[href]');
      log('parsePlaylist → всего ссылок на странице:', allLinks.length);

      forEachNode(allLinks, function (a) {
        var href = a.getAttribute('href') || '';
        var img  = a.querySelector('img');
        if (!img) return;
        if (href.indexOf('/video') === -1 && href.indexOf('/watch') === -1) return;
        if (href.indexOf('http') !== 0) href = HOST + href;

        var name = a.getAttribute('title') || (a.textContent || '').trim().substring(0, 80);
        if (!name || name.length < 3) return;

        var picture = img.getAttribute('data-original') ||
                      img.getAttribute('data-src')      ||
                      img.getAttribute('src')            || '';

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

    // Дамп структуры если ничего не найдено
    if (!cards.length) {
      warn('parsePlaylist → НИ ОДНА СТРАТЕГИЯ НЕ СРАБОТАЛА');
      notyError('Карточки не найдены! Смотрите консоль.');

      var bodyHtml = doc.body ? doc.body.innerHTML : '';
      warn('parsePlaylist → body (первые 500 символов):', bodyHtml.substring(0, 500));

      var topClasses = [];
      if (doc.body) {
        var children = doc.body.children;
        for (var c = 0; c < Math.min(children.length, 20); c++) {
          topClasses.push({
            tag: children[c].tagName, id: children[c].id || '', classes: children[c].className || '',
          });
        }
      }
      warn('parsePlaylist → top-level элементы body:', JSON.stringify(topClasses));

      var thumbDivs = doc.querySelectorAll('div[class*="thumb"]');
      warn('parsePlaylist → div с "thumb" в классе:', thumbDivs.length);
      forEachNode(thumbDivs, function (d, idx) {
        if (idx < 5) warn('  thumb div #' + idx + ':', d.className);
      });
    } else {
      log('parsePlaylist → ИТОГО карточек:', cards.length);
      notySuccess('Найдено ' + cards.length + ' видео');
      log('parsePlaylist → первая карточка:', cards[0].name + ' | ' + cards[0].video);
    }

    return cards;
  }

  // ----------------------------------------------------------
  // [1.1.0] Извлечение одной карточки из DOM-элемента
  // ----------------------------------------------------------
  function _extractCard(el) {
    var aEl  = el.querySelector('a');
    var href = aEl ? aEl.getAttribute('href') : '';
    if (!href) return null;
    if (href.indexOf('http') !== 0) href = HOST + href;

    var titleEl = el.querySelector('.th-title');
    var name    = titleEl ? (titleEl.textContent || '').trim() : '';
    if (!name && aEl) name = aEl.getAttribute('title') || '';
    if (!name) {
      var altTitle = el.querySelector('.title, h3, h4, .name');
      if (altTitle) name = (altTitle.textContent || '').trim();
    }
    if (!name) return null;

    var imgEl   = el.querySelector('img');
    var picture = imgEl
      ? (imgEl.getAttribute('data-original') ||
         imgEl.getAttribute('data-src')      ||
         imgEl.getAttribute('src')            || '')
      : '';

    var vidEl   = el.querySelector('video');
    var preview = vidEl
      ? (vidEl.getAttribute('data-preview') ||
         vidEl.getAttribute('src')           || '')
      : '';

    var durEl = el.querySelector('.duration, .time, .dur');
    var time  = durEl ? (durEl.textContent || '').trim() : '';

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
  // ----------------------------------------------------------
  function getStreamLinks(videoPageUrl, success, error) {
    log('getStreamLinks → загрузка страницы видео:', videoPageUrl);
    noty('Получаю ссылки: ' + videoPageUrl.substring(0, 50) + '...');

    httpGet(videoPageUrl, function (html) {
      log('getStreamLinks → HTML получен, длина:', html.length);

      var qualitys = {};
      var sizes = ['1080', '720', '480', '360', '240'];
      var si;

      // Стратегия 1: src="..." type="video/mp4" size="..."
      for (si = 0; si < sizes.length; si++) {
        var size = sizes[si];
        var m = html.match(new RegExp('src="([^"]+)"\\s+type="video/mp4"\\s+size="' + size + '"'));
        if (m && m[1]) {
          qualitys[size + 'p'] = m[1];
          log('getStreamLinks → Стратегия 1: ' + size + 'p:', m[1].substring(0, 80));
        }
      }

      // Стратегия 2: атрибуты source в любом порядке
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 2: source теги...');
        for (si = 0; si < sizes.length; si++) {
          var size2 = sizes[si];
          var m2;
          m2 = html.match(new RegExp('size="' + size2 + '"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) { qualitys[size2 + 'p'] = m2[1]; continue; }
          m2 = html.match(new RegExp('label="' + size2 + 'p?"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) { qualitys[size2 + 'p'] = m2[1]; continue; }
          m2 = html.match(new RegExp('res="' + size2 + '"[^>]*src="([^"]+)"'));
          if (m2 && m2[1]) { qualitys[size2 + 'p'] = m2[1]; }
        }
        log('getStreamLinks → Стратегия 2:', Object.keys(qualitys).length + ' качеств');
      }

      // Стратегия 3: JSON sources: [...]
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 3: JSON sources...');
        var jsonMatch = html.match(/sources\s*[:=]\s*(\[[\s\S]*?\])/);
        if (jsonMatch) {
          try {
            var sources = JSON.parse(jsonMatch[1].replace(/'/g, '"'));
            for (var j = 0; j < sources.length; j++) {
              var src    = sources[j];
              var label  = (src.label || src.size || src.quality || 'auto').toString().replace(/\s/g, '');
              var srcUrl = src.file || src.src || src.url || '';
              if (srcUrl) qualitys[label] = srcUrl;
            }
          } catch (e) {
            warn('getStreamLinks → JSON parse ошибка:', e.message);
          }
        }
        log('getStreamLinks → Стратегия 3:', Object.keys(qualitys).length + ' качеств');
      }

      // Стратегия 4: любые .mp4 ссылки
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 4: все .mp4...');
        var reMp4 = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
        var m4, idx4 = 0;
        while ((m4 = reMp4.exec(html)) !== null && idx4 < 5) {
          qualitys['auto' + (idx4 || '')] = m4[1];
          idx4++;
        }
        log('getStreamLinks → Стратегия 4:', Object.keys(qualitys).length + ' ссылок');
      }

      // Стратегия 5: .m3u8 (HLS)
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 5: m3u8...');
        var reHls = /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g;
        var m5 = reHls.exec(html);
        if (m5) {
          qualitys['HLS'] = m5[1];
          log('getStreamLinks → m3u8:', m5[1].substring(0, 80));
        }
        log('getStreamLinks → Стратегия 5:', Object.keys(qualitys).length + ' ссылок');
      }

      var keys  = Object.keys(qualitys);
      var count = keys.length;

      if (!count) {
        err('getStreamLinks → НИ ОДНА СТРАТЕГИЯ НЕ НАШЛА ССЫЛОК');
        notyError('Нет mp4/m3u8 ссылок на странице видео!');

        var sourceMatches = html.match(/<source[^>]*>/gi) || [];
        warn('getStreamLinks → <source> теги (' + sourceMatches.length + '):', sourceMatches.slice(0, 5));

        var videoMatches = html.match(/<video[^>]*>[\s\S]*?<\/video>/gi) || [];
        warn('getStreamLinks → <video> блоки (' + videoMatches.length + '):', videoMatches.slice(0, 2));

        warn('getStreamLinks → упоминаний "mp4":', (html.match(/mp4/gi) || []).length);
        warn('getStreamLinks → упоминаний "m3u8":', (html.match(/m3u8/gi) || []).length);

        error('PornoBriz: нет mp4/m3u8');
        return;
      }

      log('getStreamLinks → ИТОГО качеств:', count);
      notySuccess('Найдено ' + count + ' качеств');

      for (var k = 0; k < keys.length; k++) {
        log('  ' + keys[k] + ' → ' + qualitys[keys[k]].substring(0, 80));
      }

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
      for (var i = 0; i < SORTS.length; i++) {
        if (SORTS[i].val && path.indexOf(SORTS[i].val + '/') === 0) {
          sort = SORTS[i].val;
          break;
        }
      }
      if (!sort) {
        for (var j = 0; j < CATS.length; j++) {
          if (path.indexOf(CATS[j].val + '/') === 0) {
            cat = CATS[j].val;
            break;
          }
        }
      }
    }

    log('parseState → sort=' + sort + ' cat=' + cat + ' search=' + search);
    return { sort: sort, cat: cat, search: search };
  }

  function buildMenu(url) {
    var state   = parseState(url || '');
    var sortObj = arrayFind(SORTS, function (s) { return s.val === state.sort; }) || SORTS[0];
    var catObj  = arrayFind(CATS,  function (c) { return c.val === state.cat;  });

    var items = [{ title: 'Поиск', playlist_url: HOST, search_on: true }];

    var sortSubmenu = [];
    for (var i = 0; i < SORTS.length; i++) {
      sortSubmenu.push({
        title:        SORTS[i].title,
        playlist_url: HOST + '/' + SORTS[i].urlTpl.replace('{page}', '1'),
      });
    }
    items.push({ title: 'Сортировка: ' + sortObj.title, playlist_url: 'submenu', submenu: sortSubmenu });

    var catSubmenu = [];
    for (var j = 0; j < CATS.length; j++) {
      catSubmenu.push({
        title:        CATS[j].title,
        playlist_url: HOST + '/' + CATS[j].val + '/page1/',
      });
    }
    items.push({ title: 'Категория: ' + (catObj ? catObj.title : 'Все'), playlist_url: 'submenu', submenu: catSubmenu });

    return items;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ----------------------------------------------------------
  var BrizParser = {

    main: function (params, success, error) {
      log('main() → вызван:', safeParams(params));
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
      log('view() → вызван:', safeParams(params));

      var rawUrl  = (params.url || HOST).replace(/[?&]pg=\d+/, '');
      var page    = parseInt(params.page, 10) || 1;
      var state   = parseState(rawUrl);
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
      log('search() → запрос: "' + query + '", страница: ' + page);
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
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BrizParser);
      log('v1.3.0 зарегистрирован OK');
      notySuccess('Парсер PornoBriz v1.3.0 загружен');
      return true;
    }
    log('AdultPlugin ещё не доступен, жду...');
    return false;
  }

  if (!tryRegister()) {
    var _elapsed = 0;
    var _timer = setInterval(function () {
      _elapsed += 100;
      if (tryRegister()) {
        clearInterval(_timer);
      } else if (_elapsed >= 10000) {
        clearInterval(_timer);
        err('Не удалось зарегистрироваться за 10 секунд!');
        notyError('PornoBriz: таймаут регистрации!');
      }
    }, 100);
  }

})();
