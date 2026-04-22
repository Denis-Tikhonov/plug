// =============================================================
// ostr.js — OstroePorno Parser для AdultJS (Lampa)
// Version  : 1.6.0
// Changed  :
//   [1.6.0] Исправления по данным proxy-log + worker logs:
//           - detectQuality(): _original.mp4 → 1080p, умный маппинг
//           - parseVideoContent(): +ключи pl/video/src/hd, exec-loop
//           - extractInlineQualities(): поиск в <script> до внешнего JS
//           - extractQualities(): улучшен regex script src, inline-first
//           - fallbackExtract(): поиск /files/*.mp4, detectQuality
//           - networkRequest(): Referer + Origin в fetch
//           - parseCards(): дедупликация Set
//           - routeCatalog(): надёжное извлечение slug
// =============================================================

(function () {
  'use strict';

  const VERSION = '1.6.0';
  const NAME    = 'ostr';
  const HOST    = 'http://ostroeporno.com';
  const TAG     = '[' + NAME + ']';

  const CATEGORIES = [
    { title: '🇷🇺 Русское',              slug: 'russkoe' },
    { title: '🏠 Домашнее',              slug: 'domashnee' },
    { title: '🏠 Русское домашнее',      slug: 'russkoe_domashnee' },
    { title: '👧 Молодые',               slug: 'molodyee' },
    { title: '👅 Минет',                 slug: 'minet' },
    { title: '🍑 Брюнетки',              slug: 'bryunetki' },
    { title: '👠 Чулки и колготки',      slug: 'chulki_i_kolgotki' },
    { title: '👵 Зрелые',                slug: 'zrelyee' },
    { title: '👪 Инцесты',               slug: 'incesty' },
    { title: '💦 Анал',                  slug: 'anal' },
    { title: '💎 HD видео',              slug: 'hd_video' },
    { title: '🍒 Большие сиськи',        slug: 'bolqshie_sisqki' },
    { title: '🍑 Большие задницы',       slug: 'bolqshie_zadnicy' },
    { title: '🍆 Большим членом',        slug: 'bolqshim_chlenom' },
    { title: '💛 Блондинки',             slug: 'blondinki' },
    { title: '🌏 Азиатки',               slug: 'aziatki' },
    { title: '🔗 БДСМ',                  slug: 'bdsm' },
    { title: '👫 Брат с сестрой',        slug: 'brat_s_sestroj' },
    { title: '🌸 Армянское',             slug: 'armyanskoe' },
    { title: '👥 Групповой секс',         slug: 'gruppovoj_seks' },
    { title: '👫 ЖМЖ',                   slug: 'zhmzh' },
    { title: '👫 МЖМ',                   slug: 'mzhm' },
    { title: '👥 Толпой',                slug: 'tolpoj' },
    { title: '🔀 Двойное проникнов.',    slug: 'dvojnoe_proniknovenie' },
    { title: '💕 Лесбиянки',             slug: 'lesbiyanki' },
    { title: '👩 Мамки',                 slug: 'mamki' },
    { title: '👩 Мать и сын',            slug: 'matq_i_syn' },
    { title: '👨 Отец и дочь',           slug: 'otec_i_dochq' },
    { title: '🌿 Жен. мастурбация',      slug: 'zhenskaya_masturbaciya' },
    { title: '🌹 Измена',                slug: 'izmena' },
    { title: '🏔️ Кавказ',               slug: 'kavkaz' },
    { title: '🌺 Красивое',              slug: 'krasivoe' },
    { title: '🔍 Крупный план',          slug: 'krupnyj_plan' },
    { title: '👅 Кунилингус',            slug: 'kunilingus' },
    { title: '🚶 На улице',              slug: 'na_ulice' },
    { title: '🌸 Нежное',               slug: 'nezhnoe' },
    { title: '🎭 Кастинг',              slug: 'kasting' },
    { title: '🍸 Пьяные',               slug: 'pqyanyee' },
    { title: '🦊 Рыжие',                slug: 'ryzhie' },
    { title: '⚫ Негры',                 slug: 'negry' },
    { title: '⚫ Негритянки',            slug: 'negrityanki' },
    { title: '💆 Секс массаж',           slug: 'seks_massazh' },
    { title: '💍 С женой',              slug: 's_zhenoj' },
    { title: '💦 Сквирт',               slug: 'skvirt' },
    { title: '🎓 Студенты',             slug: 'studenty' },
    { title: '🍩 Толстушки',            slug: 'tolstushki' },
    { title: '💃 Трансы',               slug: 'transy' },
    { title: '🔥 Жёсткое',              slug: 'zhestkoe' },
    { title: '🌿 Худые',                slug: 'hudyee' },
    { title: '🇺🇿 Uzbeki',              slug: 'uzbeki' },
    { title: '💦 Глотает сперму',        slug: 'glotaet_spermu' },
    { title: '👁️ От первого лица',      slug: 'ot_pervogo_lica' },
    { title: '⏱️ Короткие ролики',      slug: 'korotkie_roliki' },
    { title: '📷 Скрытая камера',        slug: 'skrytaya_kamera' },
    { title: '🌸 Бритая киска',         slug: 'britaya_kiska' },
    { title: '💧 Кончают внутрь',        slug: 'konchayut_vnutrq' },
    { title: '🌊 Мощный оргазм',         slug: 'mownyj_orgazm' },
    { title: '🌿 Волосатые вагины',      slug: 'volosatyee_vaginy' },
    { title: '🎭 Извращения',            slug: 'izvraweniya' },
    { title: '👠 На каблуках',           slug: 'na_kablukah' },
    { title: '🍳 Секс на кухне',         slug: 'seks_na_kuhne' },
    { title: '🎉 Оргии',                slug: 'orgii' },
    { title: '👔 Униформа',             slug: 'uniforma' }
  ];

  // ── Сеть ─────────────────────────────────────────────────────
  function networkRequest(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url, {
        headers: {
          'Referer': HOST + '/',
          'Origin':  HOST
        }
      }).then(r => r.text()).then(success).catch(error);
    }
  }

  // ── Утилиты ───────────────────────────────────────────────────
  function cleanUrl(url) {
    if (!url) return '';
    let u = url.replace(/\\/g, '').trim();
    u = u.replace(/^['"`]+|['"`]+$/g, '');
    if (u.startsWith('//'))              u = 'http:' + u;
    if (u.startsWith('/') && u[1] !== '/') u = HOST + u;
    return u;
  }

  // ИСПРАВЛЕНИЕ: умное определение качества по URL файла
  // Логи показали: файлы хранятся как /files/Title_original.mp4
  function detectQuality(url) {
    if (!url) return '720p';
    const l = url.toLowerCase();
    if (/_original\.mp4/.test(l))       return '1080p';   // /files/..._original.mp4 → лучшее
    if (/[_-]1080p?\.mp4/.test(l))      return '1080p';
    if (/[_-]hd\.mp4/.test(l))          return '720p';
    if (/[_-]720p?\.mp4/.test(l))       return '720p';
    if (/[_-]480p?\.mp4/.test(l))       return '480p';
    if (/[_-]sd\.mp4/.test(l))          return '480p';
    if (/[_-]360p?\.mp4/.test(l))       return '360p';
    if (/\/files\//i.test(url))         return '1080p';   // любой /files/ — оригинал
    return '720p';
  }

  // ── Парсинг карточек ──────────────────────────────────────────
  function parseCards(html) {
    const results = [];
    const seen    = new Set();          // ИСПРАВЛЕНИЕ: дедупликация URL
    const doc     = new DOMParser().parseFromString(html, 'text/html');

    const containers = doc.querySelectorAll(
      '.thumb, .video-item, .item, article.video, .video-block, div.video'
    );

    if (!containers.length) {
      for (const link of doc.querySelectorAll('a[href*="/video/"]')) {
        const href = cleanUrl(link.getAttribute('href'));
        if (!href || !href.includes('/video/') || seen.has(href)) continue;
        seen.add(href);
        const img  = link.querySelector('img');
        const pic  = img ? cleanUrl(img.getAttribute('data-src') || img.getAttribute('src') || '') : '';
        const title = (link.getAttribute('title') || link.textContent || '')
                        .replace(/\s+/g, ' ').trim() || 'Video';
        results.push({
          name: title, video: href,
          picture: pic, img: pic, poster: pic, background_image: pic,
          time: '', quality: 'HD', json: true, source: NAME
        });
      }
      console.log(TAG, 'parseCards fallback:', results.length);
      return results;
    }

    for (const container of containers) {
      const linkEl = container.querySelector('a[href*="/video/"]');
      if (!linkEl) continue;
      const href = cleanUrl(linkEl.getAttribute('href'));
      if (!href || seen.has(href)) continue;
      seen.add(href);

      const imgEl = container.querySelector('img');
      const pic   = imgEl
        ? cleanUrl(imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '')
        : '';

      const titleEl = container.querySelector('.title, .name, h2, h3, a[title]');
      const name    = (titleEl
        ? (titleEl.getAttribute('title') || titleEl.textContent || '')
        : (linkEl.getAttribute('title') || '')
      ).replace(/\s+/g, ' ').trim() || 'Video';

      const dEl = container.querySelector('.duration, .time, .length, .durs');
      const time = dEl ? dEl.textContent.trim() : '';

      results.push({
        name, video: href,
        picture: pic, img: pic, poster: pic, background_image: pic,
        time, quality: 'HD', json: true, source: NAME
      });
    }

    console.log(TAG, 'parseCards:', results.length);
    return results;
  }

  // ── Парсинг контента с видео-URL ──────────────────────────────
  // ИСПРАВЛЕНИЕ: расширен список ключей, убрана жёсткая таблица label,
  //              цикл exec для всех совпадений
  function parseVideoContent(content) {
    const qualities = {};
    console.log(TAG, 'parseVideoContent len:', content.length);

    // Все известные ключи uppod / VideoJS / inline
    const keys = [
      'filehd', 'file2hd', 'file_hd', 'hd',
      'video_alt_url',
      'file', 'file2', 'video_url',
      'pl',           // uppod playlist key
      'video', 'src', 'url', 'original'
    ];

    for (const key of keys) {
      const re = new RegExp(key + '\\s*[:=]\\s*[\'"`]([^\'"`\\s]+)[\'"`]', 'gi');
      let m;
      while ((m = re.exec(content)) !== null) {
        const url = cleanUrl(m[1]);
        if (!url || url.includes('{')) continue;
        if (!url.includes('.mp4') && !url.includes('.m3u8')) continue;
        const label = detectQuality(url);
        if (!qualities[label]) {
          qualities[label] = url;
          console.log(TAG, `  key=${key} → ${label}:`, url.substring(0, 80));
        }
      }
    }

    // Fallback: любые mp4-ссылки в тексте
    if (!Object.keys(qualities).length) {
      const mp4s = content.match(
        /https?:\/\/[^"'\s,;)\]\\<>]+\.mp4[^"'\s,;)\]\\<>]*/gi
      ) || [];
      for (const u of mp4s) {
        if (u.includes('{')) continue;
        const url   = cleanUrl(u);
        const label = detectQuality(url);
        if (!qualities[label]) {
          qualities[label] = url;
          console.log(TAG, '  raw mp4 →', label, ':', url.substring(0, 70));
        }
      }
    }

    return qualities;
  }

  // ИСПРАВЛЕНИЕ: поиск URL прямо в <script>-блоках HTML
  //              вызывается ДО загрузки внешнего JS-файла
  function extractInlineQualities(html) {
    const qualities = {};
    // Только inline-скрипты (без атрибута src)
    const re = /<script(?![^>]+\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const q = parseVideoContent(m[1]);
      for (const k of Object.keys(q)) {
        if (!qualities[k]) qualities[k] = q[k];
      }
    }
    return qualities;
  }

  // ── Извлечение качеств ────────────────────────────────────────
  function extractQualities(videoPageUrl, success, error) {
    console.log(TAG, 'extractQualities →', videoPageUrl);

    networkRequest(videoPageUrl, function (html) {
      console.log(TAG, 'video page len:', html.length);

      // 1. Inline-скрипты (быстрый путь — без доп. запроса)
      const inlineQ = extractInlineQualities(html);
      if (Object.keys(inlineQ).length) {
        console.log(TAG, 'inline qualities:', Object.keys(inlineQ).join(', '));
        success({ qualities: inlineQ });
        return;
      }

      // 2. Внешний video-JS (worker-лог: /js/video243-925.js)
      // ИСПРАВЛЕНИЕ: regex обрабатывает пути с/без ведущего слеша
      const jsMatch =
        html.match(/<script[^>]+src\s*=\s*["']?([^"'\s>]*\/js\/video[^"'\s>]*\.js)["']?/i) ||
        html.match(/<script[^>]+src\s*=\s*["']?(\/js\/[^"'\s>]+\.js)["']?/i);

      if (jsMatch) {
        const jsPath = jsMatch[1];
        const jsUrl  = /^https?:\/\//.test(jsPath)  ? jsPath
                     : jsPath.startsWith('/')         ? HOST + jsPath
                     :                                  HOST + '/' + jsPath;
        console.log(TAG, 'loading JS:', jsUrl);

        networkRequest(jsUrl, function (jsContent) {
          const q = parseVideoContent(jsContent);
          if (Object.keys(q).length) {
            console.log(TAG, 'JS qualities:', Object.keys(q).join(', '));
            success({ qualities: q });
          } else {
            console.warn(TAG, 'JS: qualities not found → HTML fallback');
            fallbackExtract(html, success, error);
          }
        }, function (e) {
          console.warn(TAG, 'JS load error:', e);
          fallbackExtract(html, success, error);
        });
        return;
      }

      console.warn(TAG, 'external JS not found → HTML fallback');
      fallbackExtract(html, success, error);
    }, error);
  }

  // ── Fallback: прямой поиск mp4 в HTML ─────────────────────────
  // ИСПРАВЛЕНИЕ: добавлен поиск /files/*.mp4 (паттерн из proxy-логов)
  function fallbackExtract(html, success, error) {
    const qualities = {};

    // /files/..._original.mp4 — относительные пути (proxy-лог)
    const relFiles = html.match(/["'](\/files\/[^"'\s<>]+\.mp4[^"'\s<>]*)['"]/gi) || [];
    for (const m of relFiles) {
      const url = cleanUrl(m.replace(/^["']|["']$/g, ''));
      if (url && !url.includes('{')) {
        const label = detectQuality(url);
        if (!qualities[label]) qualities[label] = url;
      }
    }

    // Абсолютные mp4-ссылки
    if (!Object.keys(qualities).length) {
      const abs = html.match(/https?:\/\/[^"'\s<>()
\[\]]+\.mp4[^"'\s<>()
\[\]]*/gi) || [];
      for (const u of abs) {
        if (u.includes('{')) continue;
        const url   = cleanUrl(u);
        const label = detectQuality(url);
        if (!qualities[label]) qualities[label] = url;
      }
    }

    if (Object.keys(qualities).length) {
      console.log(TAG, 'fallback qualities:', Object.keys(qualities).join(', '));
      success({ qualities: qualities });
    } else {
      error('Видео ссылки не найдены');
    }
  }

  // ── Меню / роутинг ────────────────────────────────────────────
  function buildMenu() {
    return [
      { title: '🔍 Поиск',    search_on: true, playlist_url: NAME + '/search/' },
      { title: '🆕 Новинки',  playlist_url: NAME + '/main' },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(cat => ({
          title: cat.title,
          playlist_url: NAME + '/cat/' + cat.slug
        }))
      }
    ];
  }

  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    let url = HOST;
    if (type === 'search') {
      url += '/?search=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
    } else if (type === 'cat') {
      url += '/category/' + value;
      if (page > 1) url += '?page=' + page;
    } else {
      url += '/top';
      if (page > 1) url += '?page=' + page;
    }
    return url;
  }

  function routeCatalog(url, page, success, error) {
    let fetchUrl;
    const searchMatch = url.match(/[?&]search=([^&]+)/);

    if (searchMatch) {
      fetchUrl = buildUrl('search', decodeURIComponent(searchMatch[1]), page);
    } else if (url.includes(NAME + '/cat/')) {
      // ИСПРАВЛЕНИЕ: надёжное извлечение slug
      const slug = url.split('/cat/')[1].split('?')[0];
      fetchUrl = buildUrl('cat', slug, page);
    } else if (url.includes(NAME + '/search/')) {
      const q = decodeURIComponent(url.split('/search/')[1].split('?')[0]).trim();
      fetchUrl = buildUrl('search', q, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log(TAG, 'catalog →', fetchUrl);
    networkRequest(fetchUrl, function (html) {
      const cards = parseCards(html);
      if (!cards.length) {
        error('Карточки не найдены');
        return;
      }
      success({
        results: cards,
        collection: true,
        total_pages: page + 2,
        menu: buildMenu()
      });
    }, error);
  }

  // ── Публичный API парсера ─────────────────────────────────────
  const OstrParser = {
    main(params, success, error) {
      routeCatalog('main', 1, success, error);
    },
    view(params, success, error) {
      if (params.url && params.url.includes('/video/')) {
        extractQualities(params.url, success, error);
      } else {
        routeCatalog(params.url || 'main', params.page || 1, success, error);
      }
    },
    search(params, success, error) {
      const query = (params.query || '').trim();
      if (!query) return error('Пустой запрос');
      networkRequest(buildUrl('search', query, 1), function (html) {
        const cards = parseCards(html);
        success({
          title: 'OstroePorno: ' + query,
          results: cards,
          collection: true,
          total_pages: 3
        });
      }, error);
    },
    qualities(videoPageUrl, success, error) {
      extractQualities(videoPageUrl, success, error);
    }
  };

  // ── Регистрация ───────────────────────────────────────────────
  function register() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, OstrParser);
      console.log(TAG, 'v' + VERSION + ' зарегистрирован в Adult ядре');
      return true;
    }
    return false;
  }

  if (!register()) {
    const interval = setInterval(() => {
      if (register()) clearInterval(interval);
    }, 350);
    setTimeout(() => clearInterval(interval), 10000);
  }
})();
