// =============================================================
// xv-ru.js — Парсер xv-ru.com (xvideos RU) для AdultJS / AdultPlugin (Lampa)
// Version  : 1.0.0
// Changed  :
//   [1.0.0] Первая версия. Структура идентична briz.js v1.4.0.
//           Сайт: https://www.xv-ru.com/ (статический HTML, xvideos зеркало)
//           Карточки: .thumb, ссылка из a[href], превью из img[data-src]
//           Пагинация: /new/{page} (индекс с 1)
//           Поиск: /?k={query}&p={offset} (offset = page-1)
//           Видео: html5player.setVideoUrlLow/High/HLS в inline-JS страницы
//
// ТРЕБОВАНИЯ К WARKER:
//   Добавьте в ALLOWED_TARGETS воркера (Warker.txt) и передеплойте:
//     'xv-ru.com',
//     'www.xv-ru.com',
//     'xvideos-cdn.com',
//     'thumb-cdn77.xvideos-cdn.com',
//     'mp4-cdn77.xvideos-cdn.com',
//     'hls-cdn77.xvideos-cdn.com',
//
// GitHub   : https://denis-tikhonov.github.io/plug/
// =============================================================

(function () {
  'use strict';

  var HOST      = 'https://www.xv-ru.com';
  var NAME      = 'xv-ru';
  var TAG       = '[xv-ru]';
  var NOTY_TIME = 3000;

  // ----------------------------------------------------------
  // [1.0.0] URL Cloudflare Worker
  //         Используется только если window.AdultPlugin.networkRequest
  //         недоступен (работа без AdultJS). При наличии AdultJS —
  //         запрос идёт через AdultPlugin.networkRequest автоматически.
  //
  //         Замените строку ниже на URL вашего задеплоенного воркера:
  //         'https://zonaproxy.777b737.workers.dev/?url='
  // ----------------------------------------------------------
  var WORKER_DEFAULT = 'https://zonaproxy.777b737.workers.dev/?url=';

  // ----------------------------------------------------------
  // [1.0.0] Нормализация URL воркера: если URL не оканчивается на '='
  //         — добавляем автоматически (защита от опечаток при настройке).
  // ----------------------------------------------------------
  function getWorkerUrl() {
    var url = (window.AdultPlugin && window.AdultPlugin.workerUrl)
      ? window.AdultPlugin.workerUrl
      : WORKER_DEFAULT;
    if (url && url.charAt(url.length - 1) !== '=') {
      warn('getWorkerUrl → URL не заканчивается на "=", добавляю автоматически');
      url = url + '=';
    }
    return url;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПОЛИФИЛЛЫ для старых WebView (WebOS 3, Tizen 2)
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
  // [1.0.0] УТИЛИТА: безопасный forEach для NodeList
  // ----------------------------------------------------------
  function forEachNode(nodeList, fn) {
    if (!nodeList || !nodeList.length) return;
    for (var i = 0; i < nodeList.length; i++) {
      fn(nodeList[i], i);
    }
  }

  // ----------------------------------------------------------
  // [1.0.0] УТИЛИТА: поиск в массиве (совместимая замена .find)
  // ----------------------------------------------------------
  function arrayFind(arr, predicate) {
    if (!arr) return undefined;
    for (var i = 0; i < arr.length; i++) {
      if (predicate(arr[i], i)) return arr[i];
    }
    return undefined;
  }

  // ----------------------------------------------------------
  // [1.0.0] УТИЛИТА: безопасное логирование params
  //         (защита от «Converting circular structure to JSON»)
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
  // [1.0.0] ЛОГИРОВАНИЕ — сохраняет структуру из briz.js v1.4.0
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
  // [1.0.0] СЕТЕВОЙ СЛОЙ
  //
  // Приоритетная цепочка:
  //   0. window.AdultPlugin.networkRequest()  — централизованный (AdultJS 1.5.0)
  //   1. _nativeRequest()                     — Lampa.Network.native + Worker
  //   2. _requestionRequest()                 — Lampa.Reguest (прямой)
  //   3. _fetchRequest()                      — браузерный fetch() (резерв)
  // ----------------------------------------------------------

  // [1.0.0] Уровень 1: Lampa.Network.native + Cloudflare Worker
  function _nativeRequest(url, success, error) {
    if (typeof Lampa === 'undefined' ||
        !Lampa.Network ||
        typeof Lampa.Network.native !== 'function') {
      log('_nativeRequest → Lampa.Network.native недоступен, пропуск');
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
        function (result) {
          var text = (typeof result === 'string') ? result : JSON.stringify(result);

          // Проверка 403 внутри тела ответа Worker
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
        function (e) {
          var status  = (e && e.status)  ? e.status  : 0;
          var message = (e && e.message) ? e.message : String(e || 'unknown');

          if (status === 403 || message.indexOf('403') !== -1) {
            warn('_nativeRequest → Worker ответил 403 (домен не в белом списке)');
            notyError('Домен не разрешён в Worker. Тихий fallback на прямой запрос.');
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

  // [1.0.0] Уровень 2: Lampa.Reguest (прямой запрос)
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

  // [1.0.0] Уровень 3: браузерный fetch() — последний резерв
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

  // [1.0.0] httpGet — главная точка входа
  function httpGet(url, success, error) {
    log('httpGet → URL:', url);

    // Приоритет 0: централизованный метод AdultJS 1.5.0
    if (window.AdultPlugin &&
        typeof window.AdultPlugin.networkRequest === 'function') {
      log('httpGet → используем централизованный AdultPlugin.networkRequest');
      window.AdultPlugin.networkRequest(url, success, error, { type: 'html' });
      return;
    }

    // Приоритет 1: native + Worker
    log('httpGet → уровень 1: Lampa.Network.native + Worker');
    _nativeRequest(url,
      function (text) { success(text); },
      function (e) {
        if (e === 'worker_403') {
          warn('httpGet → worker_403: переход к уровню 2 без лишних сообщений');
        } else {
          warn('httpGet → native не сработал (' + e + '), уровень 2: Lampa.Reguest');
          noty('Native не сработал, пробую Reguest...');
        }

        // Приоритет 2: Reguest
        _requestionRequest(url,
          function (text) { success(text); },
          function () {
            warn('httpGet → Reguest не сработал, уровень 3: fetch');
            noty('Reguest не сработал, пробую fetch...');

            // Приоритет 3: fetch
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
  //
  // Пагинация xv-ru.com:
  //   Главная:  https://www.xv-ru.com/
  //   Стр. 1+:  https://www.xv-ru.com/new/{page}
  //
  // Поиск:
  //   Стр. 1:   /?k={query}
  //   Стр. 2+:  /?k={query}&p={page-1}  (xvideos использует 0-offset)
  //
  // Сортировки — только те, которые точно существуют на сайте:
  // ----------------------------------------------------------
  var SORTS = [
    { title: 'Новинки',  val: 'new',  urlTpl: 'new/{page}'          },
    { title: 'Лучшее',   val: 'best', urlTpl: 'best-videos/{page}'   },
    { title: 'Топ',      val: 'top',  urlTpl: 'most-viewed/{page}'   },
  ];

  function buildUrl(sort, cat, search, page) {
    page = page || 1;
    var result;

    if (search) {
      // xvideos: страница 1 → &p=0 (можно опустить), страница 2 → &p=1 и т.д.
      var offset = Math.max(0, page - 1);
      result = HOST + '/?k=' + encodeURIComponent(search);
      if (offset > 0) result += '&p=' + offset;
    } else if (sort) {
      var sortObj = arrayFind(SORTS, function (s) { return s.val === sort; }) || SORTS[0];
      result = HOST + '/' + sortObj.urlTpl.replace('{page}', page);
    } else {
      // Главная страница (sort='', cat='', search='')
      if (page <= 1) {
        result = HOST + '/';
      } else {
        result = HOST + '/new/' + page;
      }
    }

    log('buildUrl →', 'sort=' + sort + ' search=' + search + ' page=' + page + ' → ' + result);
    return result;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПАРСИНГ КАТАЛОГА
  //
  // Три стратегии (аналогично briz.js):
  //   1. XPath по div.thumb
  //   2. CSS-селекторы (.thumb и fallback-варианты)
  //   3. Все ссылки с img-тегами (последний резерв)
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

    // Стратегия 1: XPath — выбираем div.thumb содержащие ссылку на видео
    log('parsePlaylist → Стратегия 1: XPath...');
    try {
      var nodes = doc.evaluate(
        "//div[@class and contains(@class,'thumb') and .//a[contains(@href,'/video')]]",
        doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
      );
      log('parsePlaylist → XPath найдено узлов:', nodes.snapshotLength);
      noty('XPath: найдено ' + nodes.snapshotLength + ' узлов');

      for (var i = 0; i < nodes.snapshotLength; i++) {
        var card = _extractCard(nodes.snapshotItem(i));
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

      var selectors = [
        '.thumb',
        '.thumbs .thumb',
        '.video-thumb',
        '.video-item',
        '.mozaique .thumb',
      ];

      for (var s = 0; s < selectors.length; s++) {
        var els = doc.querySelectorAll(selectors[s]);
        if (els.length) {
          log('parsePlaylist → CSS "' + selectors[s] + '" нашёл:', els.length);
          forEachNode(els, function (el) {
            var c = _extractCard(el);
            if (c) cards.push(c);
          });
          if (cards.length) break;
        }
      }
      log('parsePlaylist → CSS извлечено карточек:', cards.length);
    }

    // Стратегия 3: все ссылки с img (последний резерв)
    if (!cards.length) {
      log('parsePlaylist → Стратегия 3: все ссылки с img...');
      noty('CSS не дал результатов, ищу все ссылки с картинками...');

      var allLinks = doc.querySelectorAll('a[href]');
      log('parsePlaylist → всего ссылок на странице:', allLinks.length);

      forEachNode(allLinks, function (a) {
        var href = a.getAttribute('href') || '';
        if (href.indexOf('/video') === -1) return;
        if (href.indexOf('http') !== 0) href = HOST + href;

        var img = a.querySelector('img');
        if (!img) return;

        var name = a.getAttribute('title') || (a.textContent || '').trim().substring(0, 80);
        if (!name || name.length < 3) return;

        var picture = img.getAttribute('data-src')      ||
                      img.getAttribute('data-original') ||
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

    // Диагностика если ничего не найдено
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
            tag: children[c].tagName,
            id:  children[c].id || '',
            cls: children[c].className || '',
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
  // [1.0.0] Извлечение одной карточки из DOM-элемента .thumb
  //
  // Структура xvideos:
  //   <div class="thumb">
  //     <a href="/video.xxx/.." title="Название">
  //       <img data-src="...thumb.jpg" />
  //     </a>
  //     <p class="title"><a href="..." title="Название">Название</a></p>
  //     <span class="duration">13 min.</span>
  //   </div>
  // ----------------------------------------------------------
  function _extractCard(el) {
    // Ищем ссылку на видео (href содержит /video)
    var aEl  = null;
    var aAll = el.querySelectorAll('a[href]');
    forEachNode(aAll, function (a) {
      if (!aEl && a.getAttribute('href') &&
          a.getAttribute('href').indexOf('/video') !== -1) {
        aEl = a;
      }
    });
    if (!aEl) aEl = el.querySelector('a');

    var href = aEl ? aEl.getAttribute('href') : '';
    if (!href) return null;
    if (href.indexOf('/video') === -1) return null;
    if (href.indexOf('http') !== 0) href = HOST + href;

    // Название — p.title > a[title], или a[title], или текст
    var name = '';
    var titleEl = el.querySelector('p.title a, p.title');
    if (titleEl) {
      name = (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
    }
    if (!name && aEl) {
      name = (aEl.getAttribute('title') || '').trim();
    }
    if (!name) {
      var altTitle = el.querySelector('h3, h4, .title, .name, span[title]');
      if (altTitle) name = (altTitle.getAttribute('title') || altTitle.textContent || '').trim();
    }
    if (!name || name.length < 3) return null;

    // Картинка — xvideos использует data-src (lazy-load)
    var imgEl   = el.querySelector('img');
    var picture = imgEl
      ? (imgEl.getAttribute('data-src')      ||
         imgEl.getAttribute('data-original') ||
         imgEl.getAttribute('data-thumb')    ||
         imgEl.getAttribute('src')            || '')
      : '';

    // Длительность
    var durEl = el.querySelector('.duration, .dur, time, span.duration');
    var time  = durEl ? (durEl.textContent || '').trim() : '';

    return {
      name:    name,
      video:   href,
      picture: picture,
      preview: null,
      time:    time,
      quality: 'HD',
      json:    true,
      related: true,
      model:   null,
      source:  NAME,
    };
  }

  // ----------------------------------------------------------
  // [1.0.0] ПОЛУЧЕНИЕ ПРЯМЫХ ССЫЛОК НА ВИДЕО
  //
  // xvideos хранит URL в inline-JS через html5player:
  //   html5player.setVideoUrlLow('URL_SD')
  //   html5player.setVideoUrlHigh('URL_HD')
  //   html5player.setVideoHLS('URL_M3U8')
  //
  // Пять стратегий (от специфичных к общим):
  //   1. html5player.setVideoUrl*/setVideoHLS
  //   2. JSON-поля url_low / url_high / hls
  //   3. mp4_sd / mp4_hd в URL
  //   4. Любые .mp4 ссылки
  //   5. Любые .m3u8 ссылки (HLS)
  // ----------------------------------------------------------
  function getStreamLinks(videoPageUrl, success, error) {
    log('getStreamLinks → загрузка страницы видео:', videoPageUrl);
    noty('Получаю ссылки: ' + videoPageUrl.substring(0, 50) + '...');

    httpGet(videoPageUrl, function (html) {
      log('getStreamLinks → HTML получен, длина:', html.length);

      var qualitys = {};

      // Стратегия 1: html5player методы (основной паттерн xvideos)
      log('getStreamLinks → Стратегия 1: html5player методы...');
      var matchLow  = html.match(/html5player\.setVideoUrlLow$['"]([^'"]+)['"]$/);
      var matchHigh = html.match(/html5player\.setVideoUrlHigh$['"]([^'"]+)['"]$/);
      var matchHLS  = html.match(/html5player\.setVideoHLS$['"]([^'"]+)['"]$/);

      if (matchLow  && matchLow[1])  {
        qualitys['480p'] = matchLow[1];
        log('getStreamLinks → Стратегия 1 low:', matchLow[1].substring(0, 80));
      }
      if (matchHigh && matchHigh[1]) {
        qualitys['720p'] = matchHigh[1];
        log('getStreamLinks → Стратегия 1 high:', matchHigh[1].substring(0, 80));
      }
      if (matchHLS  && matchHLS[1])  {
        qualitys['HLS'] = matchHLS[1];
        log('getStreamLinks → Стратегия 1 HLS:', matchHLS[1].substring(0, 80));
      }
      log('getStreamLinks → Стратегия 1:', Object.keys(qualitys).length + ' качеств');

      // Стратегия 2: JSON-объект (альтернативный формат xvideos)
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 2: JSON url_low/url_high/hls...');
        var mLow2  = html.match(/"url_low"\s*:\s*"([^"]+)"/);
        var mHigh2 = html.match(/"url_high"\s*:\s*"([^"]+)"/);
        var mHls2  = html.match(/"hls"\s*:\s*"([^"]+)"/);
        if (mLow2  && mLow2[1])  { qualitys['480p'] = mLow2[1];  }
        if (mHigh2 && mHigh2[1]) { qualitys['720p'] = mHigh2[1]; }
        if (mHls2  && mHls2[1])  { qualitys['HLS']  = mHls2[1];  }
        log('getStreamLinks → Стратегия 2:', Object.keys(qualitys).length + ' качеств');
      }

      // Стратегия 3: mp4_sd / mp4_hd в URL (по суффиксу в имени файла)
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 3: mp4_sd / mp4_hd паттерны...');
        var mSd = html.match(/["'](https?:\/\/[^"'\s]+mp4_sd[^"'\s]*)/);
        var mHd = html.match(/["'](https?:\/\/[^"'\s]+mp4_hd[^"'\s]*)/);
        if (mSd && mSd[1]) { qualitys['480p'] = mSd[1]; log('getStreamLinks → SD:', mSd[1].substring(0, 80)); }
        if (mHd && mHd[1]) { qualitys['720p'] = mHd[1]; log('getStreamLinks → HD:', mHd[1].substring(0, 80)); }
        log('getStreamLinks → Стратегия 3:', Object.keys(qualitys).length + ' качеств');
      }

      // Стратегия 4: все .mp4 ссылки
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 4: все .mp4...');
        var reMp4 = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
        var m4, idx4 = 0;
        while ((m4 = reMp4.exec(html)) !== null && idx4 < 5) {
          qualitys['auto' + (idx4 || '')] = m4[1];
          log('getStreamLinks →  .mp4 #' + idx4 + ':', m4[1].substring(0, 80));
          idx4++;
        }
        log('getStreamLinks → Стратегия 4:', Object.keys(qualitys).length + ' ссылок');
      }

      // Стратегия 5: .m3u8 HLS
      if (!Object.keys(qualitys).length) {
        log('getStreamLinks → Стратегия 5: m3u8 HLS...');
        var reHls = /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g;
        var m5 = reHls.exec(html);
        if (m5 && m5[1]) {
          qualitys['HLS'] = m5[1];
          log('getStreamLinks → HLS m3u8:', m5[1].substring(0, 80));
        }
        log('getStreamLinks → Стратегия 5:', Object.keys(qualitys).length + ' ссылок');
      }

      var keys  = Object.keys(qualitys);
      var count = keys.length;

      if (!count) {
        err('getStreamLinks → НИ ОДНА СТРАТЕГИЯ НЕ НАШЛА ССЫЛОК');
        notyError('Нет mp4/m3u8 ссылок на странице видео!');

        // Диагностика
        var sourceMatches = html.match(/<source[^>]*>/gi) || [];
        warn('getStreamLinks → <source> теги (' + sourceMatches.length + '):', sourceMatches.slice(0, 5));
        warn('getStreamLinks → упоминаний "mp4":', (html.match(/mp4/gi) || []).length);
        warn('getStreamLinks → упоминаний "m3u8":', (html.match(/m3u8/gi) || []).length);
        warn('getStreamLinks → упоминаний "html5player":', (html.match(/html5player/gi) || []).length);

        error('xv-ru: нет mp4/m3u8');
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
    var sort = '', search = '';
    var path = (url || '').replace(HOST, '').replace(/^\//, '');

    // Поиск
    var kMatch = (url || '').match(/[?&]k=([^&]+)/);
    if (kMatch && kMatch[1]) {
      search = decodeURIComponent(kMatch[1]);
    } else {
      // Сортировки
      for (var i = 0; i < SORTS.length; i++) {
        var prefix = SORTS[i].urlTpl.split('{page}')[0].replace(/\/$/, '');
        if (path.indexOf(prefix) === 0) {
          sort = SORTS[i].val;
          break;
        }
      }
    }

    log('parseState → sort=' + sort + ' search=' + search);
    return { sort: sort, search: search };
  }

  function buildMenu(url) {
    var state   = parseState(url || '');
    var sortObj = arrayFind(SORTS, function (s) { return s.val === state.sort; }) || SORTS[0];

    var items = [{ title: 'Поиск', playlist_url: HOST, search_on: true }];

    var sortSubmenu = [];
    for (var i = 0; i < SORTS.length; i++) {
      sortSubmenu.push({
        title:        SORTS[i].title,
        playlist_url: HOST + '/' + SORTS[i].urlTpl.replace('{page}', '1'),
      });
    }
    items.push({
      title:        'Сортировка: ' + sortObj.title,
      playlist_url: 'submenu',
      submenu:      sortSubmenu,
    });

    return items;
  }

  // ----------------------------------------------------------
  // [1.0.0] ПУБЛИЧНЫЙ ИНТЕРФЕЙС ПАРСЕРА
  // ----------------------------------------------------------
  var XvRuParser = {

    // Главная страница — первые ~40 видео без пагинации
    main: function (params, success, error) {
      log('main() → вызван:', safeParams(params));
      noty('Загрузка главной страницы...');

      httpGet(buildUrl('', '', '', 1), function (html) {
        var results = parsePlaylist(html);
        if (!results.length) {
          err('main() → нет карточек');
          notyError('Главная: карточки не найдены');
          error('xv-ru: нет карточек');
          return;
        }
        log('main() → успех, карточек:', results.length);
        notySuccess('Главная: ' + results.length + ' видео');
        success({
          results:     results,
          collection:  true,
          total_pages: 30,
          menu:        buildMenu(HOST),
        });
      }, function (e) {
        err('main() → ошибка загрузки:', e);
        notyError('Главная: ошибка загрузки');
        error(e);
      });
    },

    // Каталог / пагинация / фильтры
    view: function (params, success, error) {
      log('view() → вызван:', safeParams(params));

      var rawUrl  = (params.url || HOST).replace(/[?&]pg=\d+/, '');
      var page    = parseInt(params.page, 10) || 1;
      var state   = parseState(rawUrl);
      var loadUrl = buildUrl(state.sort, '', state.search, page);

      log('view() → loadUrl:', loadUrl, 'page:', page);
      noty('Загрузка страницы ' + page + '...');

      httpGet(loadUrl, function (html) {
        var results = parsePlaylist(html);
        if (!results.length) {
          err('view() → нет карточек');
          notyError('Каталог: карточки не найдены');
          error('xv-ru: нет карточек');
          return;
        }
        log('view() → успех, карточек:', results.length);
        notySuccess('Каталог: ' + results.length + ' видео');
        success({
          results:     results,
          collection:  true,
          total_pages: results.length >= 30 ? page + 5 : page,
          menu:        buildMenu(rawUrl),
        });
      }, function (e) {
        err('view() → ошибка загрузки:', e);
        notyError('Каталог: ошибка загрузки');
        error(e);
      });
    },

    // Поиск
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
          error('xv-ru: ничего не найдено');
          return;
        }
        log('search() → найдено:', results.length);
        notySuccess('Поиск: ' + results.length + ' результатов');
        success({
          title:       'xv-ru: ' + query,
          results:     results,
          url:         HOST + '/?k=' + encodeURIComponent(query),
          collection:  true,
          total_pages: page + 5,
        });
      }, function (e) {
        err('search() → ошибка:', e);
        notyError('Поиск: ошибка загрузки');
        error(e);
      });
    },

    // Получение прямых ссылок (вызывается из AdultJS при воспроизведении)
    qualitys: function (videoUrl, success, error) {
      log('qualitys() → вызван для:', videoUrl);
      noty('Получение качеств видео...');
      getStreamLinks(videoUrl, success, error);
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] РЕГИСТРАЦИЯ ПАРСЕРА В AdultPlugin
  //         Повторяет паттерн briz.js: ждём до 10 секунд пока
  //         AdultJS инициализирует window.AdultPlugin.
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin &&
        typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, XvRuParser);
      log('v1.0.0 зарегистрирован OK');
      notySuccess('Парсер xv-ru.com v1.0.0 загружен');
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
        notyError('xv-ru: таймаут регистрации!');
      }
    }, 100);
  }

})();
