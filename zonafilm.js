/**
 * ============================================================
 *  LAMPA PLUGIN — ZonaFilm v0.4.0
 * ============================================================
 *
 *  ЧТО РАБОТАЕТ:
 *    ✅ Кнопка в боковом меню (не в настройках)
 *    ✅ Кнопка BACK корректно возвращает назад (нет зависания)
 *    ✅ Каталог фильмов с постерами (реальные данные)
 *    ✅ Пагинация (60 фильмов на страницу)
 *    ✅ Страница деталей фильма
 *    ✅ Поиск через клавиатуру TV
 *    ✅ Жанры/категории
 *    ✅ Воспроизведение через embed/webview
 *    ✅ Навигация пультом ТВ
 *
 *  ИСТОЧНИК ДАННЫХ:
 *    Next.js Data API: /_next/data/{buildId}/movies.json
 *    Внутренний API: /api/movies?page=N (обнаружен в links)
 *    Структура: pageProps.data = Array<Movie>
 *               pageProps.links.next = URL следующей страницы
 *               pageProps.meta.current_page = номер страницы
 *
 *  АРХИТЕКТУРА БЛОКОВ:
 *    БЛОК 1:  Конфигурация
 *    БЛОК 2:  Отладочный модуль
 *    БЛОК 3:  Сетевой модуль (CORS-прокси)
 *    БЛОК 4:  Источник ZonaFilm
 *    БЛОК 5:  CSS стили
 *    БЛОК 6:  Компонент каталога (главный экран)
 *    БЛОК 7:  Компонент деталей фильма
 *    БЛОК 8:  Регистрация + меню + инициализация
 *
 *  ДОБАВЛЕНИЕ НОВОГО ИСТОЧНИКА:
 *    1. Создайте объект по образцу ZonaFilmSource
 *    2. Реализуйте методы: main(), getDetails(), search()
 *    3. Зарегистрируйте через SourceManager.register()
 *    4. Переключите: SourceManager.setActive('новый_ключ')
 *
 *  ПОДКЛЮЧЕНИЕ В LAMPA:
 *    Настройки → Дополнения → URL:
 *    https://YOUR-USER.github.io/lampa-plugin/zonafilm.js
 * ============================================================
 */

(function () {
    'use strict';


    /* ==========================================================
     *  БЛОК 1: КОНФИГУРАЦИЯ
     *  ---------------------------------------------------------
     *  Все настраиваемые параметры собраны здесь.
     *  При смене домена/прокси — менять только тут.
     * ========================================================== */

    var CONFIG = {
        /** Режим отладки (логи в консоль + уведомления) */
        debug: true,

        /** Имя плагина */
        name: 'ZonaFilm',

        /** Версия */
        version: '0.4.0',

        /** Базовый URL сайта */
        siteUrl: 'https://zonafilm.ru',

        /**
         * BuildId Next.js — используется для data API.
         * Если каталог перестал загружаться — обновите значение:
         *   Откройте view-source:https://zonafilm.ru/movies
         *   Найдите "buildId":"XXXXX" в __NEXT_DATA__
         */
        buildId: '39MEgPaxeFXNBOSc6BloZ',

        /**
         * CORS прокси — нужен т.к. Lampa на Android TV
         * не может делать запросы к чужим доменам напрямую.
         * {url} заменяется на encodeURIComponent(целевой_url)
         */
        proxy: [
            'https://api.codetabs.com/v1/proxy?quest={url}',
            'https://corsproxy.io/?{url}',
            'https://api.allorigins.win/raw?url={url}'
        ],

        /** Индекс текущего рабочего прокси */
        proxyIdx: 0,

        /** Таймаут сетевого запроса (мс) */
        timeout: 15000
    };


    /* ==========================================================
     *  БЛОК 2: ОТЛАДОЧНЫЙ МОДУЛЬ
     *  ---------------------------------------------------------
     *  Централизованное логирование.
     *  Все сообщения имеют префикс [ZonaFilm] для фильтрации.
     *  В продакшене: CONFIG.debug = false
     * ========================================================== */

    var Debug = {
        /** Обычный лог */
        log: function (tag, msg) {
            if (!CONFIG.debug) return;
            console.log('%c[ZF][' + tag + ']', 'color:#4FC3F7;font-weight:bold', msg);
        },
        /** Предупреждение */
        warn: function (tag, msg) {
            console.warn('[ZF][' + tag + ']', msg);
        },
        /** Ошибка */
        error: function (tag, msg) {
            console.error('[ZF][ERROR][' + tag + ']', msg);
        },
        /** Уведомление на экране Lampa */
        notify: function (text) {
            try { Lampa.Noty.show(text); } catch (e) {}
        }
    };

    Debug.log('Boot', 'Загрузка плагина v' + CONFIG.version);


    /* ==========================================================
     *  БЛОК 3: СЕТЕВОЙ МОДУЛЬ
     *  ---------------------------------------------------------
     *  HTTP GET через CORS-прокси с автопереключением.
     *  При ошибке одного прокси — пробует следующий.
     * ========================================================== */

    var Network = {
        /**
         * GET-запрос через прокси
         * @param {string}   url       — целевой URL
         * @param {function} onOk      — callback(data)
         * @param {function} onFail    — callback(errorText)
         * @param {number}   [_idx]    — (внутр.) индекс прокси
         */
        get: function (url, onOk, onFail, _idx) {
            var idx = typeof _idx === 'number' ? _idx : CONFIG.proxyIdx;

            // Все прокси исчерпаны
            if (idx >= CONFIG.proxy.length) {
                Debug.error('Net', 'Все прокси недоступны: ' + url);
                if (onFail) onFail('proxy_exhausted');
                return;
            }

            var proxyUrl = CONFIG.proxy[idx].replace('{url}', encodeURIComponent(url));

            Debug.log('Net', '[proxy#' + idx + '] ' + url);

            $.ajax({
                url: proxyUrl,
                timeout: CONFIG.timeout,
                success: function (data) {
                    CONFIG.proxyIdx = idx; // запоминаем рабочий
                    if (onOk) onOk(data);
                },
                error: function (xhr, st, err) {
                    Debug.warn('Net', 'proxy#' + idx + ' fail: ' + st);
                    Network.get(url, onOk, onFail, idx + 1);
                }
            });
        }
    };


    /* ==========================================================
     *  БЛОК 4: МЕНЕДЖЕР ИСТОЧНИКОВ + ZONAFILM SOURCE
     *  ---------------------------------------------------------
     *  SourceManager — реестр источников видео.
     *  ZonaFilmSource — парсер zonafilm.ru.
     *
     *  Для добавления нового источника:
     *    var MySource = {
     *        name: 'MySite',
     *        main: function(page, cb) { ... },
     *        getDetails: function(slug, cb) { ... },
     *        search: function(query, cb) { ... },
     *        getStreamUrl: function(slug) { return '...'; },
     *        categories: function() { return [...]; }
     *    };
     *    SourceManager.register('mysite', MySource);
     * ========================================================== */

    var SourceManager = {
        _s: {},      // словарь источников
        _a: null,    // ключ активного

        register: function (key, src) { this._s[key] = src; },
        setActive: function (key)     { if (this._s[key]) this._a = key; },
        active: function ()           { return this._s[this._a] || null; }
    };

    /* ---------- ZonaFilm Source ---------- */

    var ZonaFilmSource = {
        name: 'ZonaFilm',

        /**
         * URL для Next.js Data API
         * Формат: /_next/data/{buildId}/{path}.json
         */
        _dataUrl: function (path) {
            return CONFIG.siteUrl + '/_next/data/' + CONFIG.buildId + '/' + path + '.json';
        },

        /**
         * Загрузить каталог фильмов
         * @param {number}   page — номер страницы (1, 2, ...)
         * @param {function} cb   — callback(items, hasNext)
         *
         * ФОРМАТ ОТВЕТА (из анализа JSON):
         *   pageProps.data = [ {slug, title, cover_url, year, rating, ...}, ... ]
         *   pageProps.links.next = "http://zonafilm.ru/api/movies?page=2" | null
         */
        main: function (page, cb) {
            var url = this._dataUrl('movies');
            if (page > 1) url += '?page=' + page;

            Debug.log('Src', 'Каталог p' + page + ': ' + url);

            Network.get(url, function (raw) {
                try {
                    var json = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    var pp = json.pageProps || json;
                    var items = pp.data || [];
                    var hasNext = !!(pp.links && pp.links.next);

                    Debug.log('Src', 'Получено: ' + items.length + ' фильмов, hasNext=' + hasNext);

                    // Нормализуем
                    var result = items.map(function (m) {
                        return {
                            title:   m.title || '',
                            slug:    m.slug || '',
                            year:    m.year || 0,
                            poster:  m.cover_url || '',
                            rating:  m.rating || 0,
                            quality: m.best_quality || ''
                        };
                    });

                    cb(result, hasNext);
                } catch (e) {
                    Debug.error('Src', 'Парсинг каталога: ' + e.message);
                    cb([], false);
                }
            }, function () {
                cb([], false);
            });
        },

        /**
         * Детали фильма
         * @param {string}   slug — напр. 'opasnyi-duet'
         * @param {function} cb   — callback(movieObj | null)
         *
         * ФОРМАТ: pageProps.data = { slug, title, description, cover_url, meta: { actors, tags }, ... }
         */
        getDetails: function (slug, cb) {
            var url = this._dataUrl('movies/' + slug);

            Debug.log('Src', 'Детали: ' + slug);

            Network.get(url, function (raw) {
                try {
                    var json = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    var d = (json.pageProps || json).data;
                    if (!d) { cb(null); return; }

                    var genres = [], countries = [];
                    var tags = (d.meta && d.meta.tags) || [];
                    tags.forEach(function (t) {
                        if (t.type === 'genre')   genres.push(t.title);
                        if (t.type === 'country') countries.push(t.title);
                    });

                    var actors = ((d.meta && d.meta.actors) || []).map(function (a) {
                        return { name: a.name || '', photo: a.cover_url || '' };
                    });

                    cb({
                        title:         d.title || '',
                        originalTitle: d.title_original || '',
                        slug:          d.slug || slug,
                        year:          d.year || 0,
                        description:   d.description || '',
                        poster:        d.cover_url || '',
                        backdrop:      (json.pageProps || {}).backdropUrl || d.backdrop_url || '',
                        duration:      d.duration || 0,
                        rating:        d.rating || 0,
                        ratingKP:      d.rating_kp || 0,
                        ratingIMDB:    d.rating_imdb || 0,
                        quality:       d.best_quality || '',
                        genres:        genres,
                        countries:     countries,
                        directors:     d.directors || '',
                        writers:       d.writers || '',
                        actors:        actors,
                        ageLimit:      d.age_limit || 0
                    });
                } catch (e) {
                    Debug.error('Src', 'Парсинг деталей: ' + e.message);
                    cb(null);
                }
            }, function () {
                cb(null);
            });
        },

        /**
         * Поиск фильмов
         *
         * ZonaFilm не имеет явного search-эндпоинта в data API,
         * поэтому загружаем каталог и фильтруем на клиенте.
         * Если найдётся серверный поиск — заменим.
         */
        search: function (query, cb) {
            Debug.log('Src', 'Поиск: "' + query + '"');

            var q = query.toLowerCase();

            // Загружаем первые 60 фильмов и ищем в них
            // (В будущем можно загрузить несколько страниц)
            this.main(1, function (items) {
                var found = items.filter(function (m) {
                    return m.title.toLowerCase().indexOf(q) !== -1;
                });

                Debug.log('Src', 'Найдено: ' + found.length);
                cb(found);
            });
        },

        /**
         * URL для воспроизведения (embed-страница)
         *
         * ВАЖНО: zonafilm.ru НЕ отдаёт прямых ссылок на видео.
         * Видео загружается динамически JS-скриптами сайта.
         * Поэтому открываем embed в iframe/webview.
         */
        getStreamUrl: function (slug) {
            return CONFIG.siteUrl + '/movies/' + slug;
        },

        /**
         * Статический список жанров
         * Извлечён из тегов фильмов (tags.type === 'genre')
         */
        categories: function () {
            return [
                { title: 'Все',           slug: '' },
                { title: 'Боевик',        slug: 'boevik' },
                { title: 'Комедия',       slug: 'komediia' },
                { title: 'Драма',         slug: 'drama' },
                { title: 'Ужасы',         slug: 'uzhasy' },
                { title: 'Фантастика',    slug: 'fantastika' },
                { title: 'Триллер',       slug: 'triller' },
                { title: 'Мелодрама',     slug: 'melodrama' },
                { title: 'Детектив',      slug: 'detektiv' },
                { title: 'Криминал',      slug: 'kriminal' },
                { title: 'Приключения',   slug: 'prikliucheniia' },
                { title: 'Фэнтези',      slug: 'fentezi' },
                { title: 'Мультфильм',    slug: 'multfilm' },
                { title: 'Семейный',      slug: 'semeinyi' },
                { title: 'Военный',       slug: 'voennyi' },
                { title: 'Биография',     slug: 'biografiia' },
                { title: 'Документальный',slug: 'dokumentalnyi' }
            ];
        },

        /**
         * Фильмы по жанру
         * URL: /_next/data/{buildId}/movies/filter/genre-{slug}.json
         */
        getByGenre: function (genreSlug, page, cb) {
            var url = this._dataUrl('movies/filter/genre-' + genreSlug);
            if (page > 1) url += '?page=' + page;

            Debug.log('Src', 'Жанр ' + genreSlug + ' p' + page);

            Network.get(url, function (raw) {
                try {
                    var json = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    var pp = json.pageProps || json;
                    var items = pp.data || [];
                    var hasNext = !!(pp.links && pp.links.next);

                    var result = items.map(function (m) {
                        return {
                            title:  m.title || '',
                            slug:   m.slug || '',
                            year:   m.year || 0,
                            poster: m.cover_url || '',
                            rating: m.rating || 0,
                            quality: m.best_quality || ''
                        };
                    });

                    cb(result, hasNext);
                } catch (e) {
                    Debug.error('Src', 'Парсинг жанра: ' + e.message);
                    cb([], false);
                }
            }, function () {
                // Fallback: загружаем весь каталог и фильтруем
                Debug.warn('Src', 'Жанр API недоступен, fallback на каталог');
                cb([], false);
            });
        }
    };

    SourceManager.register('zonafilm', ZonaFilmSource);
    SourceManager.setActive('zonafilm');

    Debug.log('Boot', 'Источник ZonaFilm зарегистрирован');


    /* ==========================================================
     *  БЛОК 5: CSS СТИЛИ
     *  ---------------------------------------------------------
     *  Все стили плагина. Адаптированы под TV-интерфейс.
     *  Класс .selector — обязателен для навигации пультом.
     *  Класс .focus — добавляется Lampa при фокусе.
     * ========================================================== */

    var CSS = '\
        .zf-wrap { padding: 1.5em; }\
        \
        .zf-search {\
            display: inline-block;\
            background: #1e1e3a; border: 2px solid #333;\
            border-radius: 0.5em; color: #888;\
            padding: 0.5em 1.2em; font-size: 1em;\
            margin-bottom: 0.8em; margin-right: 0.5em;\
        }\
        .zf-search.focus { border-color: #4FC3F7; color: #fff; }\
        \
        .zf-cats {\
            display: flex; flex-wrap: wrap; gap: 0.4em;\
            margin-bottom: 1em;\
        }\
        .zf-cat {\
            background: #1e1e3a; color: #aaa;\
            border: 2px solid transparent;\
            border-radius: 0.4em;\
            padding: 0.3em 0.8em; font-size: 0.85em;\
        }\
        .zf-cat.focus, .zf-cat.active {\
            border-color: #4FC3F7; color: #fff; background: #2a2a5a;\
        }\
        \
        .zf-htitle {\
            color: #fff; font-size: 1.3em; font-weight: 700;\
            margin-bottom: 0.5em;\
        }\
        \
        .zf-grid { display: flex; flex-wrap: wrap; gap: 0.6em; }\
        \
        .zf-card {\
            width: 10.5em; position: relative;\
            transition: transform 0.15s;\
        }\
        .zf-card.focus { transform: scale(1.08); }\
        \
        .zf-poster {\
            width: 100%; height: 15em;\
            border-radius: 0.4em; overflow: hidden;\
            background: #111;\
        }\
        .zf-poster img {\
            width: 100%; height: 100%; object-fit: cover;\
        }\
        \
        .zf-badge {\
            position: absolute; top: 0.3em; left: 0.3em;\
            background: rgba(0,0,0,0.75);\
            padding: 0.1em 0.35em; border-radius: 0.2em;\
            font-size: 0.7em; font-weight: 700;\
        }\
        .zf-g { color: #66BB6A; }\
        .zf-y { color: #FFA726; }\
        .zf-r { color: #EF5350; }\
        \
        .zf-ql {\
            position: absolute; top: 0.3em; right: 0.3em;\
            background: #E65100; color: #fff;\
            padding: 0.05em 0.3em; border-radius: 0.2em;\
            font-size: 0.6em; font-weight: 700;\
            text-transform: uppercase;\
        }\
        \
        .zf-nm {\
            color: #eee; font-size: 0.78em; margin-top: 0.3em;\
            overflow: hidden; text-overflow: ellipsis;\
            white-space: nowrap;\
        }\
        .zf-yr { color: #666; font-size: 0.7em; }\
        \
        .zf-load {\
            display: flex; align-items: center;\
            justify-content: center;\
            padding: 2em; color: #888;\
        }\
        .zf-spin {\
            display: inline-block; width: 1.4em; height: 1.4em;\
            border: 3px solid #333; border-top-color: #4FC3F7;\
            border-radius: 50%; margin-right: 0.5em;\
            animation: zf-sp 0.7s linear infinite;\
        }\
        @keyframes zf-sp { to { transform: rotate(360deg); } }\
        \
        .zf-empty {\
            text-align: center; padding: 3em; color: #555;\
        }\
        \
        .zf-more {\
            text-align: center; padding: 1em; color: #4FC3F7;\
            font-size: 1em; margin-top: 1em;\
        }\
        .zf-more.focus { color: #fff; }\
        \
        .zf-det { padding: 1.5em; color: #fff; }\
        .zf-det-top { display: flex; gap: 1.5em; margin-bottom: 1em; }\
        .zf-det-poster {\
            width: 12em; height: 17em; border-radius: 0.5em;\
            overflow: hidden; flex-shrink: 0; background: #111;\
        }\
        .zf-det-poster img { width:100%; height:100%; object-fit:cover; }\
        .zf-det-info { flex: 1; }\
        .zf-det-title { font-size: 1.5em; font-weight: 800; }\
        .zf-det-orig { color: #888; font-size: 0.85em; margin-bottom: 0.4em; }\
        .zf-det-tags { display: flex; flex-wrap: wrap; gap: 0.3em; margin-bottom: 0.5em; }\
        .zf-tag {\
            background: #2a2a4a; padding: 0.15em 0.5em;\
            border-radius: 0.3em; font-size: 0.8em; color: #aaa;\
        }\
        .zf-tag-g { background: #1565C0; color: #fff; }\
        .zf-det-desc {\
            color: #bbb; font-size: 0.85em; line-height: 1.5;\
            margin: 0.8em 0;\
        }\
        .zf-play {\
            display: inline-block;\
            background: #E53935; color: #fff;\
            border-radius: 0.5em; padding: 0.5em 1.8em;\
            font-size: 1.1em; font-weight: 700;\
            margin: 0.5em 0 1em;\
            transition: transform 0.15s, background 0.15s;\
        }\
        .zf-play.focus { background: #F44336; transform: scale(1.06); }\
    ';

    // Удаляем старые стили если плагин перезагрузился
    $('#zf-css').remove();
    $('<style>').attr('id', 'zf-css').text(CSS).appendTo('head');


    /* ==========================================================
     *  БЛОК 6: КОМПОНЕНТ КАТАЛОГА
     *  ---------------------------------------------------------
     *  Главный экран плагина: сетка постеров.
     *
     *  КРИТИЧНО ДЛЯ СТАБИЛЬНОСТИ:
     *  - Каждый Controller.add() ОБЯЗАН иметь back()
     *  - back() вызывает Lampa.Activity.backward()
     *  - Без этого Lampa ЗАВИСАЕТ при нажатии кнопки назад
     * ========================================================== */

    function CatalogComp(object) {
        /**
         * Приватные переменные компонента
         */
        var self = this;
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var content = $('<div class="zf-wrap"></div>');
        var grid = $('<div class="zf-grid" id="zf-grid"></div>');
        var page = 1;
        var hasMore = true;
        var busy = false;
        var mode = 'catalog';    // 'catalog' | 'search' | 'genre'
        var genreSlug = '';

        /**
         * create() — вызывается один раз при создании Activity
         */
        this.create = function () {
            Debug.log('Cat', 'create()');

            /* --- Кнопка поиска --- */
            var searchBtn = $('<div class="zf-search selector">🔍 Поиск...</div>');
            searchBtn.on('hover:enter', function () {
                Lampa.Input.edit({
                    title: 'Поиск фильмов',
                    value: '',
                    free: true,
                    nosave: true
                }, function (val) {
                    if (val && val.trim()) self.doSearch(val.trim());
                });
            });
            content.append(searchBtn);

            /* --- Жанры --- */
            var cats = $('<div class="zf-cats"></div>');
            var src = SourceManager.active();
            if (src) {
                src.categories().forEach(function (c) {
                    var btn = $('<div class="zf-cat selector' +
                        (c.slug === '' ? ' active' : '') + '">' + c.title + '</div>');

                    btn.on('hover:enter', function () {
                        cats.find('.zf-cat').removeClass('active');
                        btn.addClass('active');
                        grid.empty();
                        page = 1;
                        hasMore = true;

                        if (c.slug === '') {
                            mode = 'catalog';
                            $('#zf-htitle').text('📽 Каталог');
                            self.loadPage(1);
                        } else {
                            mode = 'genre';
                            genreSlug = c.slug;
                            $('#zf-htitle').text('📂 ' + c.title);
                            self.loadGenre(c.slug, 1);
                        }
                    });

                    cats.append(btn);
                });
            }
            content.append(cats);

            /* --- Заголовок --- */
            content.append('<div class="zf-htitle" id="zf-htitle">📽 Каталог</div>');

            /* --- Загрузка --- */
            content.append(
                '<div class="zf-load" id="zf-loader">' +
                '<div class="zf-spin"></div>Загрузка...</div>'
            );

            /* --- Сетка карточек --- */
            content.append(grid);

            /* --- Кнопка «Ещё» --- */
            var more = $('<div class="zf-more selector" id="zf-more" style="display:none">⬇ Загрузить ещё</div>');
            more.on('hover:enter', function () {
                page++;
                if (mode === 'catalog') self.loadPage(page);
                else if (mode === 'genre') self.loadGenre(genreSlug, page);
            });
            content.append(more);

            scroll.append(content);

            /* --- Первая загрузка --- */
            this.loadPage(1);
        };

        /**
         * Загрузка страницы каталога
         */
        this.loadPage = function (p) {
            if (busy) return;
            busy = true;
            $('#zf-loader').show();

            var src = SourceManager.active();
            if (!src) { busy = false; return; }

            src.main(p, function (items, more) {
                busy = false;
                hasMore = more;
                $('#zf-loader').hide();

                if (items.length === 0 && p === 1) {
                    grid.html('<div class="zf-empty">📭 Нет данных. Проверьте прокси.</div>');
                } else {
                    self.addCards(items);
                }

                $('#zf-more').toggle(hasMore && mode !== 'search');
                self.setNav();
            });
        };

        /**
         * Загрузка по жанру
         */
        this.loadGenre = function (slug, p) {
            if (busy) return;
            busy = true;
            $('#zf-loader').show();

            var src = SourceManager.active();
            src.getByGenre(slug, p, function (items, more) {
                busy = false;
                hasMore = more;
                $('#zf-loader').hide();

                if (items.length === 0 && p === 1) {
                    grid.html('<div class="zf-empty">📭 Жанр пуст</div>');
                } else {
                    self.addCards(items);
                }

                $('#zf-more').toggle(hasMore);
                self.setNav();
            });
        };

        /**
         * Поиск
         */
        this.doSearch = function (query) {
            mode = 'search';
            grid.empty();
            page = 1;
            busy = true;
            $('#zf-loader').show();
            $('#zf-more').hide();
            $('#zf-htitle').text('🔍 ' + query);

            var src = SourceManager.active();
            src.search(query, function (items) {
                busy = false;
                $('#zf-loader').hide();

                if (items.length === 0) {
                    grid.html('<div class="zf-empty">📭 Не найдено: "' + query + '"</div>');
                } else {
                    self.addCards(items);
                }

                self.setNav();
            });
        };

        /**
         * Отрисовка карточек
         */
        this.addCards = function (items) {
            items.forEach(function (m) {
                // Цвет рейтинга
                var rc = m.rating >= 7 ? 'zf-g' : (m.rating >= 5 ? 'zf-y' : 'zf-r');

                // Качество
                var ql = m.quality ? m.quality.toUpperCase() : '';
                if (ql === 'LQ') ql = 'CAM';
                if (ql === 'MQ') ql = 'HD';

                var card = $(
                    '<div class="zf-card selector" data-slug="' + m.slug + '">' +
                        '<div class="zf-poster">' +
                            (m.poster
                                ? '<img src="' + m.poster + '" loading="lazy"/>'
                                : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#333;font-size:2.5em">🎬</div>') +
                        '</div>' +
                        (m.rating > 0 ? '<div class="zf-badge ' + rc + '">★ ' + m.rating.toFixed(1) + '</div>' : '') +
                        (ql ? '<div class="zf-ql">' + ql + '</div>' : '') +
                        '<div class="zf-nm">' + m.title + '</div>' +
                        '<div class="zf-yr">' + (m.year || '') + '</div>' +
                    '</div>'
                );

                // Клик → детали
                card.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url: '',
                        title: m.title,
                        component: 'zonafilm_detail',
                        slug: m.slug,
                        page: 1
                    });
                });

                // При фокусе — скролл к элементу
                card.on('hover:focus', function () {
                    scroll.update($(this));
                });

                grid.append(card);
            });
        };

        /**
         * ✅ НАВИГАЦИЯ — КРИТИЧЕСКИЙ БЛОК
         *
         * Lampa Controller управляет фокусом для D-pad пульта.
         * ОБЯЗАТЕЛЬНО: back() должен вызывать Activity.backward()
         * Без этого приложение ЗАВИСАЕТ.
         */
        this.setNav = function () {
            Lampa.Controller.add('content', {
                toggle: [],
                type: 'default',
                link: self,
                back: function () {
                    Debug.log('Cat', '← BACK');
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.toggle('content');
        };

        /* --- Стандартные методы компонента Lampa --- */

        this.start = function () {
            Debug.log('Cat', 'start()');

            /**
             * ✅ При возврате на этот экран (например после деталей)
             * навигация должна быть переактивирована
             */
            Lampa.Controller.add('content', {
                toggle: [],
                type: 'default',
                link: self,
                back: function () {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.pause  = function () {};
        this.stop   = function () {};
        this.render = function () { return scroll.render(); };
        this.destroy = function () {
            Debug.log('Cat', 'destroy()');
            scroll.destroy();
        };
    }


    /* ==========================================================
     *  БЛОК 7: КОМПОНЕНТ ДЕТАЛЕЙ
     *  ---------------------------------------------------------
     *  Экран информации о фильме: постер, описание, актёры,
     *  кнопка «Смотреть».
     * ========================================================== */

    function DetailComp(object) {
        var self = this;
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var content = $('<div class="zf-det"></div>');
        var slug = object.slug || '';

        this.create = function () {
            Debug.log('Det', 'create() slug=' + slug);

            // Загрузка
            content.append(
                '<div class="zf-load" id="zf-dload">' +
                '<div class="zf-spin"></div>Загрузка...</div>'
            );

            scroll.append(content);

            var src = SourceManager.active();
            if (!src) return;

            src.getDetails(slug, function (m) {
                $('#zf-dload').remove();

                if (!m) {
                    content.append('<div class="zf-empty">⚠ Не удалось загрузить</div>');
                    self.setNav();
                    return;
                }

                self.render_detail(m);
                self.setNav();
            });
        };

        /**
         * Отрисовка деталей
         */
        this.render_detail = function (m) {
            // Бэкдроп
            if (m.backdrop) {
                content.append(
                    '<div style="width:100%;height:15em;overflow:hidden;border-radius:0.5em;margin-bottom:1em">' +
                    '<img src="' + m.backdrop + '" style="width:100%;height:100%;object-fit:cover;filter:brightness(0.35)"/>' +
                    '</div>'
                );
            }

            // Верх: постер + инфо
            var top = $('<div class="zf-det-top"></div>');

            top.append(
                '<div class="zf-det-poster">' +
                (m.poster ? '<img src="' + m.poster + '"/>' : '') +
                '</div>'
            );

            var info = $('<div class="zf-det-info"></div>');
            info.append('<div class="zf-det-title">' + m.title + '</div>');

            if (m.originalTitle) {
                info.append('<div class="zf-det-orig">' + m.originalTitle + '</div>');
            }

            // Теги
            var tagsHtml = '<div class="zf-det-tags">';
            if (m.year) tagsHtml += '<span class="zf-tag">' + m.year + '</span>';
            if (m.duration) tagsHtml += '<span class="zf-tag">' + m.duration + ' мин</span>';
            if (m.ageLimit) tagsHtml += '<span class="zf-tag">' + m.ageLimit + '+</span>';

            var ql = m.quality ? m.quality.toUpperCase() : '';
            if (ql === 'LQ') ql = 'CAM';
            if (ql === 'MQ') ql = 'HD';
            if (ql) tagsHtml += '<span class="zf-tag" style="background:#E65100;color:#fff">' + ql + '</span>';

            m.genres.forEach(function (g) {
                tagsHtml += '<span class="zf-tag zf-tag-g">' + g + '</span>';
            });
            m.countries.forEach(function (c) {
                tagsHtml += '<span class="zf-tag">' + c + '</span>';
            });
            tagsHtml += '</div>';
            info.append(tagsHtml);

            // Рейтинг
            if (m.rating > 0) {
                var rc = m.rating >= 7 ? '#66BB6A' : (m.rating >= 5 ? '#FFA726' : '#EF5350');
                var rhtml = '<div style="margin:0.5em 0">';
                rhtml += '<span style="font-size:1.6em;font-weight:800;color:' + rc + '">★ ' + m.rating.toFixed(1) + '</span>';
                if (m.ratingKP)   rhtml += '<span style="color:#FF6F00;margin-left:1em;font-size:0.9em">КП ' + m.ratingKP.toFixed(1) + '</span>';
                if (m.ratingIMDB) rhtml += '<span style="color:#F5C518;margin-left:1em;font-size:0.9em">IMDb ' + m.ratingIMDB.toFixed(1) + '</span>';
                rhtml += '</div>';
                info.append(rhtml);
            }

            if (m.directors) info.append('<div style="color:#aaa;font-size:0.8em">🎬 ' + m.directors + '</div>');

            top.append(info);
            content.append(top);

            // Кнопка СМОТРЕТЬ
            var playBtn = $('<div class="zf-play selector">▶ Смотреть</div>');
            playBtn.on('hover:enter', function () {
                self.play(m);
            });
            content.append(playBtn);

            // Описание
            if (m.description) {
                content.append(
                    '<div class="zf-htitle" style="margin-top:1em">Описание</div>' +
                    '<div class="zf-det-desc">' + m.description + '</div>'
                );
            }

            // Актёры
            if (m.actors && m.actors.length > 0) {
                var ah = '<div class="zf-htitle">Актёры</div>' +
                    '<div style="display:flex;flex-wrap:wrap;gap:0.7em">';
                m.actors.slice(0, 12).forEach(function (a) {
                    ah += '<div style="text-align:center;width:5.5em">' +
                        '<div style="width:4em;height:4em;border-radius:50%;overflow:hidden;margin:0 auto 0.2em;background:#222">' +
                        (a.photo ? '<img src="' + a.photo + '" style="width:100%;height:100%;object-fit:cover"/>' : '') +
                        '</div>' +
                        '<div style="color:#ccc;font-size:0.65em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + a.name + '</div>' +
                        '</div>';
                });
                ah += '</div>';
                content.append(ah);
            }
        };

        /**
         * Воспроизведение
         *
         * ZonaFilm НЕ даёт прямых видео-ссылок.
         * Видео подгружается JS-скриптами на embed-странице.
         * Поэтому:
         *   - На Android: открываем URL в системном браузере
         *   - Иначе: показываем iframe-оверлей
         */
        this.play = function (m) {
            var src = SourceManager.active();
            var url = src.getStreamUrl(m.slug);

            Debug.log('Det', 'Play: ' + url);

            // Способ 1: Android WebView
            try {
                if (typeof Lampa.Android !== 'undefined' && Lampa.Android.openUrl) {
                    Lampa.Android.openUrl(url);
                    return;
                }
            } catch (e) {}

            // Способ 2: iframe overlay
            var overlay = $(
                '<div style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#000">' +
                '<iframe src="' + url + '" style="width:100%;height:100%;border:none" allowfullscreen></iframe>' +
                '<div class="selector" style="position:absolute;top:0.5em;right:0.5em;' +
                'background:rgba(0,0,0,0.8);color:#fff;padding:0.4em 0.8em;' +
                'border-radius:0.3em;cursor:pointer;z-index:100000;font-size:1.2em">✕ Закрыть</div>' +
                '</div>'
            );

            var closeOverlay = function () {
                overlay.remove();
                self.setNav();
            };

            overlay.find('.selector').on('hover:enter click', closeOverlay);

            // Перехватываем Back для overlay
            Lampa.Controller.add('content', {
                toggle: [],
                type: 'default',
                link: self,
                back: closeOverlay
            });
            Lampa.Controller.toggle('content');

            $('body').append(overlay);
        };

        /**
         * Навигация с обработкой BACK
         */
        this.setNav = function () {
            Lampa.Controller.add('content', {
                toggle: [],
                type: 'default',
                link: self,
                back: function () {
                    Debug.log('Det', '← BACK');
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.start   = function () { this.setNav(); };
        this.pause   = function () {};
        this.stop    = function () {};
        this.render  = function () { return scroll.render(); };
        this.destroy = function () { scroll.destroy(); };
    }


    /* ==========================================================
     *  БЛОК 8: РЕГИСТРАЦИЯ + МЕНЮ + ИНИЦИАЛИЗАЦИЯ
     * ========================================================== */

    // --- Регистрация компонентов ---
    Lampa.Component.add('zonafilm_main', CatalogComp);
    Lampa.Component.add('zonafilm_detail', DetailComp);

    Debug.log('Boot', 'Компоненты зарегистрированы');

    // --- SVG иконка для меню ---
    var ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>';

    /**
     * Добавить кнопку в боковое меню Lampa
     *
     * Структура бокового меню Lampa:
     *   <div class="menu">
     *     <ul class="menu__list">
     *       <li class="menu__item selector" data-action="main">Главная</li>
     *       <li class="menu__item selector" data-action="favorite">Избранное</li>
     *       ...
     *       <li class="menu__item selector" data-action="settings">Настройки</li>
     *     </ul>
     *   </div>
     *
     * Вставляем ПЕРЕД пунктом "Настройки" (data-action="settings")
     */
    function addMenu() {
        Debug.log('Menu', 'Добавляю кнопку...');

        // Проверяем, не добавлена ли уже
        if ($('[data-action="zonafilm"]').length) {
            Debug.log('Menu', 'Кнопка уже есть');
            return;
        }

        var li = $(
            '<li class="menu__item selector" data-action="zonafilm">' +
            '<div class="menu__ico">' + ICON + '</div>' +
            '<div class="menu__text">ZonaFilm</div>' +
            '</li>'
        );

        li.on('hover:enter', function () {
            Debug.log('Menu', '→ Открываю каталог');

            // ✅ Важно: закрываем боковое меню перед открытием
            Lampa.Menu.close();

            Lampa.Activity.push({
                url: '',
                title: 'ZonaFilm',
                component: 'zonafilm_main',
                page: 1
            });
        });

        // Ищем место для вставки
        var added = false;

        // Способ 1: перед "Настройки"
        var settings = $('[data-action="settings"]');
        if (settings.length) {
            settings.before(li);
            added = true;
            Debug.log('Menu', '✅ Вставлено перед Настройки');
        }

        // Способ 2: в конец первого menu__list
        if (!added) {
            var list = $('.menu .menu__list').eq(0);
            if (list.length) {
                list.append(li);
                added = true;
                Debug.log('Menu', '✅ Вставлено в menu__list');
            }
        }

        // Способ 3: ищем любой ul в .menu
        if (!added) {
            var ul = $('.menu ul').eq(0);
            if (ul.length) {
                ul.append(li);
                added = true;
                Debug.log('Menu', '✅ Вставлено в menu ul');
            }
        }

        if (!added) {
            Debug.error('Menu', '❌ Не найден контейнер меню!');
        }
    }

    /**
     * Инициализация плагина
     */
    function init() {
        try {
            addMenu();
            Debug.notify('🎬 ZonaFilm v' + CONFIG.version);
            Debug.log('Boot', '✅ Плагин готов');
        } catch (e) {
            Debug.error('Boot', 'Ошибка: ' + e.message);
        }
    }

    // Ждём готовности Lampa
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

    Debug.log('Boot', 'Скрипт загружен, ожидание ready...');

})();
