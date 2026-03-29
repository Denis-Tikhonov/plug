/**
 * ============================================================
 *  LAMPA PLUGIN — ZonaFilm v0.5.0
 * ============================================================
 *
 *  ИСПРАВЛЕНИЯ v0.5:
 *    ✅ Автоопределение buildId (не нужно обновлять вручную)
 *    ✅ Навигация по карточкам и категориям пультом ТВ
 *    ✅ Кнопка в боковом меню (как в v0.1)
 *    ✅ BACK работает корректно
 *    ✅ Фокус перемещается по карточкам
 *
 *  БЛОКИ:
 *    1. Конфигурация
 *    2. Отладка
 *    3. Сеть (CORS прокси)
 *    4. Источник ZonaFilm (с автоопределением buildId)
 *    5. CSS
 *    6. Каталог (главный экран)
 *    7. Детали фильма
 *    8. Регистрация + меню + запуск
 * ============================================================
 */

(function () {
    'use strict';


    /* ==========================================================
     *  БЛОК 1: КОНФИГУРАЦИЯ
     * ========================================================== */

    var CONFIG = {
        debug: true,
        name: 'ZonaFilm',
        version: '0.5.0',
        site: 'https://zonafilm.ru',

        /**
         * BuildId Next.js — определяется автоматически.
         * Если задан и работает — используется как есть.
         * Если 404 — плагин загрузит HTML и извлечёт новый.
         */
        buildId: '',

        /**
         * CORS прокси.
         * {u} заменяется на encodeURIComponent(url)
         */
        proxy: [
            'https://api.codetabs.com/v1/proxy?quest={u}',
            'https://corsproxy.io/?{u}',
            'https://api.allorigins.win/raw?url={u}'
        ],
        proxyIdx: 0,
        timeout: 15000
    };


    /* ==========================================================
     *  БЛОК 2: ОТЛАДКА
     * ========================================================== */

    var D = {
        log:  function (t, m) { if (CONFIG.debug) console.log('%c[ZF][' + t + ']', 'color:#4FC3F7;font-weight:bold', m); },
        warn: function (t, m) { console.warn('[ZF][' + t + ']', m); },
        err:  function (t, m) { console.error('[ZF][ERR][' + t + ']', m); },
        noty: function (m)    { try { Lampa.Noty.show(m); } catch(e){} }
    };

    D.log('Boot', 'v' + CONFIG.version + ' загружается...');


    /* ==========================================================
     *  БЛОК 3: СЕТЬ
     *  ---------------------------------------------------------
     *  GET через CORS-прокси. При ошибке — следующий прокси.
     * ========================================================== */

    var Net = {
        get: function (url, ok, fail, _i) {
            var i = typeof _i === 'number' ? _i : CONFIG.proxyIdx;
            if (i >= CONFIG.proxy.length) {
                D.err('Net', 'Прокси исчерпаны: ' + url);
                if (fail) fail('no_proxy');
                return;
            }

            var purl = CONFIG.proxy[i].replace('{u}', encodeURIComponent(url));
            D.log('Net', '#' + i + ' → ' + url);

            $.ajax({
                url: purl,
                timeout: CONFIG.timeout,
                success: function (data) {
                    CONFIG.proxyIdx = i;
                    if (ok) ok(data);
                },
                error: function () {
                    D.warn('Net', '#' + i + ' fail');
                    Net.get(url, ok, fail, i + 1);
                }
            });
        }
    };


    /* ==========================================================
     *  БЛОК 4: ИСТОЧНИК ZONAFILM
     *  ---------------------------------------------------------
     *  Два способа получения данных:
     *    1) Data API: /_next/data/{buildId}/movies.json (быстро)
     *    2) HTML парсинг: /movies → извлечение __NEXT_DATA__
     *
     *  Если buildId неизвестен или устарел — используется HTML,
     *  из которого автоматически извлекается новый buildId.
     * ========================================================== */

    var Source = {
        name: 'ZonaFilm',

        /**
         * Получить buildId и вызвать callback
         * Если buildId уже известен — сразу callback
         * Иначе — загружает HTML главной и парсит
         *
         * @param {function} cb — callback(buildId_or_null)
         */
        _ensureBuildId: function (cb) {
            // Если уже есть — используем
            if (CONFIG.buildId) {
                cb(CONFIG.buildId);
                return;
            }

            D.log('Src', 'BuildId неизвестен, определяю из HTML...');

            Net.get(CONFIG.site + '/movies', function (html) {
                if (typeof html !== 'string') {
                    D.err('Src', 'HTML не строка');
                    cb(null);
                    return;
                }

                // Ищем buildId в __NEXT_DATA__
                var m = html.match(/"buildId"\s*:\s*"([^"]+)"/);
                if (m && m[1]) {
                    CONFIG.buildId = m[1];
                    D.log('Src', '✅ BuildId: ' + CONFIG.buildId);
                    cb(CONFIG.buildId);
                } else {
                    D.err('Src', 'BuildId не найден в HTML');
                    cb(null);
                }
            }, function () {
                D.err('Src', 'Не удалось загрузить HTML для buildId');
                cb(null);
            });
        },

        /**
         * Извлечь __NEXT_DATA__ из HTML
         * @param {string} html
         * @returns {object|null} pageProps или null
         */
        _parseHTML: function (html) {
            try {
                var tag = '__NEXT_DATA__" type="application/json">';
                var s = html.indexOf(tag);
                if (s === -1) return null;
                s += tag.length;
                var e = html.indexOf('</script>', s);
                if (e === -1) return null;
                var json = JSON.parse(html.substring(s, e));

                // Попутно обновляем buildId
                if (json.buildId) CONFIG.buildId = json.buildId;

                return json.pageProps || json.props.pageProps || null;
            } catch (ex) {
                D.err('Src', 'parseHTML: ' + ex.message);
                return null;
            }
        },

        /**
         * Нормализовать массив фильмов из pageProps
         */
        _normalizeList: function (pp) {
            var arr = pp.data || pp.items || pp.movies || [];
            if (!Array.isArray(arr)) {
                // data может быть объект с items
                arr = arr.items || arr.results || [];
            }

            return arr.map(function (m) {
                return {
                    title:   m.title || '',
                    slug:    m.slug || '',
                    year:    m.year || 0,
                    poster:  m.cover_url || '',
                    rating:  m.rating || 0,
                    quality: m.best_quality || ''
                };
            });
        },

        /**
         * ЗАГРУЗИТЬ КАТАЛОГ
         *
         * Стратегия:
         *   1. Определить buildId
         *   2. Попробовать Data API (JSON)
         *   3. Если 404 — загрузить HTML и распарсить
         */
        main: function (page, cb) {
            var self = this;

            this._ensureBuildId(function (bid) {
                if (bid) {
                    // Пробуем Data API
                    var url = CONFIG.site + '/_next/data/' + bid + '/movies.json';
                    if (page > 1) url += '?page=' + page;

                    D.log('Src', 'Data API: ' + url);

                    Net.get(url, function (raw) {
                        try {
                            var json = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            var pp = json.pageProps || json;
                            var items = self._normalizeList(pp);
                            var hasNext = !!(pp.links && pp.links.next);

                            if (items.length > 0) {
                                D.log('Src', 'Data API OK: ' + items.length);
                                cb(items, hasNext);
                                return;
                            }
                        } catch (e) {}

                        // Data API не сработал — fallback на HTML
                        D.warn('Src', 'Data API пуст, fallback HTML');
                        CONFIG.buildId = ''; // сброс — может устарел
                        self._mainHTML(page, cb);

                    }, function () {
                        D.warn('Src', 'Data API fail, fallback HTML');
                        CONFIG.buildId = ''; // сброс
                        self._mainHTML(page, cb);
                    });
                } else {
                    // BuildId не найден — пробуем HTML напрямую
                    self._mainHTML(page, cb);
                }
            });
        },

        /**
         * Fallback: каталог через HTML парсинг
         */
        _mainHTML: function (page, cb) {
            var self = this;
            var url = CONFIG.site + '/movies' + (page > 1 ? '?page=' + page : '');

            D.log('Src', 'HTML fallback: ' + url);

            Net.get(url, function (html) {
                var pp = self._parseHTML(html);
                if (pp) {
                    var items = self._normalizeList(pp);
                    var hasNext = !!(pp.links && pp.links.next);
                    D.log('Src', 'HTML OK: ' + items.length);
                    cb(items, hasNext);
                } else {
                    D.err('Src', 'HTML парсинг fail');
                    cb([], false);
                }
            }, function () {
                D.err('Src', 'Загрузка HTML fail');
                cb([], false);
            });
        },

        /**
         * ДЕТАЛИ ФИЛЬМА
         */
        getDetails: function (slug, cb) {
            var self = this;

            this._ensureBuildId(function (bid) {
                if (bid) {
                    var url = CONFIG.site + '/_next/data/' + bid + '/movies/' + slug + '.json';

                    Net.get(url, function (raw) {
                        try {
                            var json = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            var d = (json.pageProps || json).data;
                            if (d) {
                                cb(self._normalizeDetail(d, json.pageProps));
                                return;
                            }
                        } catch (e) {}

                        // Fallback HTML
                        self._detailHTML(slug, cb);

                    }, function () {
                        self._detailHTML(slug, cb);
                    });
                } else {
                    self._detailHTML(slug, cb);
                }
            });
        },

        _detailHTML: function (slug, cb) {
            var self = this;
            var url = CONFIG.site + '/movies/' + slug;

            Net.get(url, function (html) {
                var pp = self._parseHTML(html);
                if (pp && pp.data) {
                    cb(self._normalizeDetail(pp.data, pp));
                } else {
                    cb(null);
                }
            }, function () {
                cb(null);
            });
        },

        /**
         * Нормализовать объект деталей фильма
         */
        _normalizeDetail: function (d, pp) {
            var genres = [], countries = [];
            ((d.meta && d.meta.tags) || []).forEach(function (t) {
                if (t.type === 'genre')   genres.push(t.title);
                if (t.type === 'country') countries.push(t.title);
            });

            var actors = ((d.meta && d.meta.actors) || []).map(function (a) {
                return { name: a.name || '', photo: a.cover_url || '' };
            });

            return {
                title:         d.title || '',
                originalTitle: d.title_original || '',
                slug:          d.slug || '',
                year:          d.year || 0,
                description:   d.description || '',
                poster:        d.cover_url || '',
                backdrop:      (pp && pp.backdropUrl) || d.backdrop_url || '',
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
            };
        },

        /**
         * ПОИСК (клиентская фильтрация)
         */
        search: function (query, cb) {
            var q = query.toLowerCase();
            this.main(1, function (items) {
                var found = items.filter(function (m) {
                    return m.title.toLowerCase().indexOf(q) !== -1;
                });
                cb(found);
            });
        },

        /**
         * URL ВОСПРОИЗВЕДЕНИЯ
         */
        getStreamUrl: function (slug) {
            return CONFIG.site + '/movies/' + slug;
        },

        /**
         * КАТЕГОРИИ (жанры)
         */
        categories: function () {
            return [
                { title: 'Все',         slug: '' },
                { title: 'Боевик',      slug: 'boevik' },
                { title: 'Комедия',     slug: 'komediia' },
                { title: 'Драма',       slug: 'drama' },
                { title: 'Ужасы',       slug: 'uzhasy' },
                { title: 'Фантастика',  slug: 'fantastika' },
                { title: 'Триллер',     slug: 'triller' },
                { title: 'Мелодрама',   slug: 'melodrama' },
                { title: 'Детектив',    slug: 'detektiv' },
                { title: 'Криминал',    slug: 'kriminal' },
                { title: 'Приключения', slug: 'prikliucheniia' },
                { title: 'Фэнтези',    slug: 'fentezi' },
                { title: 'Мультфильм',  slug: 'multfilm' },
                { title: 'Семейный',    slug: 'semeinyi' },
                { title: 'Военный',     slug: 'voennyi' }
            ];
        },

        /**
         * ФИЛЬМЫ ПО ЖАНРУ
         */
        getByGenre: function (slug, page, cb) {
            var self = this;

            this._ensureBuildId(function (bid) {
                if (!bid) { cb([], false); return; }

                var url = CONFIG.site + '/_next/data/' + bid +
                          '/movies/filter/genre-' + slug + '.json';
                if (page > 1) url += '?page=' + page;

                Net.get(url, function (raw) {
                    try {
                        var json = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        var pp = json.pageProps || json;
                        var items = self._normalizeList(pp);
                        var hasNext = !!(pp.links && pp.links.next);
                        cb(items, hasNext);
                    } catch (e) {
                        cb([], false);
                    }
                }, function () {
                    cb([], false);
                });
            });
        }
    };


    /* ==========================================================
     *  БЛОК 5: CSS
     * ========================================================== */

    var CSS = '\
        .zf { padding: 1.5em; }\
        .zf-search {\
            display: inline-block; background: #1e1e3a;\
            border: 2px solid #333; border-radius: 0.5em;\
            color: #888; padding: 0.5em 1.2em; font-size: 1em;\
            margin-bottom: 0.8em; margin-right: 0.5em;\
        }\
        .zf-search.focus { border-color: #4FC3F7; color: #fff; }\
        .zf-cats { display: flex; flex-wrap: wrap; gap: 0.4em; margin-bottom: 1em; }\
        .zf-cat {\
            background: #1e1e3a; color: #aaa;\
            border: 2px solid transparent; border-radius: 0.4em;\
            padding: 0.3em 0.8em; font-size: 0.85em;\
        }\
        .zf-cat.focus, .zf-cat--on { border-color: #4FC3F7; color: #fff; background: #2a2a5a; }\
        .zf-ht { color: #fff; font-size: 1.3em; font-weight: 700; margin-bottom: 0.5em; }\
        .zf-grid { display: flex; flex-wrap: wrap; gap: 0.6em; }\
        .zf-c { width: 10.5em; position: relative; transition: transform 0.15s; }\
        .zf-c.focus { transform: scale(1.08); }\
        .zf-p { width: 100%; height: 15em; border-radius: 0.4em; overflow: hidden; background: #111; }\
        .zf-p img { width: 100%; height: 100%; object-fit: cover; }\
        .zf-b {\
            position: absolute; top: 0.3em; left: 0.3em;\
            background: rgba(0,0,0,0.75); padding: 0.1em 0.35em;\
            border-radius: 0.2em; font-size: 0.7em; font-weight: 700;\
        }\
        .zf-bg { color: #66BB6A; }\
        .zf-by { color: #FFA726; }\
        .zf-br { color: #EF5350; }\
        .zf-q {\
            position: absolute; top: 0.3em; right: 0.3em;\
            background: #E65100; color: #fff;\
            padding: 0.05em 0.3em; border-radius: 0.2em;\
            font-size: 0.6em; font-weight: 700; text-transform: uppercase;\
        }\
        .zf-n { color: #eee; font-size: 0.78em; margin-top: 0.3em;\
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\
        .zf-y { color: #666; font-size: 0.7em; }\
        .zf-ld { display: flex; align-items: center; justify-content: center;\
            padding: 2em; color: #888; }\
        .zf-sp { display: inline-block; width: 1.4em; height: 1.4em;\
            border: 3px solid #333; border-top-color: #4FC3F7;\
            border-radius: 50%; margin-right: 0.5em;\
            animation: zfsp 0.7s linear infinite; }\
        @keyframes zfsp { to { transform: rotate(360deg); } }\
        .zf-em { text-align: center; padding: 3em; color: #555; }\
        .zf-mr { text-align: center; padding: 1em; color: #4FC3F7; margin-top: 1em; }\
        .zf-mr.focus { color: #fff; }\
        .zf-dt { padding: 1.5em; color: #fff; }\
        .zf-dt-top { display: flex; gap: 1.5em; margin-bottom: 1em; }\
        .zf-dt-poster { width: 12em; height: 17em; border-radius: 0.5em;\
            overflow: hidden; flex-shrink: 0; background: #111; }\
        .zf-dt-poster img { width: 100%; height: 100%; object-fit: cover; }\
        .zf-dt-info { flex: 1; }\
        .zf-dt-title { font-size: 1.5em; font-weight: 800; }\
        .zf-dt-orig { color: #888; font-size: 0.85em; margin-bottom: 0.3em; }\
        .zf-dt-tags { display: flex; flex-wrap: wrap; gap: 0.3em; margin: 0.4em 0; }\
        .zf-tg { background: #2a2a4a; padding: 0.15em 0.5em; border-radius: 0.3em;\
            font-size: 0.8em; color: #aaa; }\
        .zf-tg-g { background: #1565C0; color: #fff; }\
        .zf-dt-desc { color: #bbb; font-size: 0.85em; line-height: 1.5; margin: 0.8em 0; }\
        .zf-pl { display: inline-block; background: #E53935; color: #fff;\
            border-radius: 0.5em; padding: 0.5em 1.8em; font-size: 1.1em;\
            font-weight: 700; margin: 0.5em 0 1em;\
            transition: transform 0.15s, background 0.15s; }\
        .zf-pl.focus { background: #F44336; transform: scale(1.06); }\
    ';

    $('#zf-css').remove();
    $('<style>').attr('id', 'zf-css').text(CSS).appendTo('head');


    /* ==========================================================
     *  БЛОК 6: КОМПОНЕНТ КАТАЛОГА
     *  ---------------------------------------------------------
     *  ✅ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ НАВИГАЦИИ:
     *
     *  Lampa использует класс .selector для фокусируемых элементов.
     *  Навигация D-pad реализуется через:
     *    1. Controller.add('content', { ... })
     *    2. Controller.toggle('content')
     *
     *  Но для ПЕРЕМЕЩЕНИЯ между элементами нужно:
     *    - Все .selector внутри scroll.render()
     *    - После добавления карточек — вызвать Controller.toggle
     *    - Lampa сама найдёт .selector и построит навигационную
     *      сетку по координатам элементов
     * ========================================================== */

    function CatComp(object) {
        var self    = this;
        var scroll  = new Lampa.Scroll({ mask: true, over: true });
        var body    = $('<div class="zf"></div>');
        var grid    = $('<div class="zf-grid"></div>');
        var page    = 1;
        var hasMore = true;
        var busy    = false;
        var mode    = 'catalog';  // catalog | search | genre
        var gSlug   = '';

        this.create = function () {
            D.log('Cat', 'create()');

            // --- Поиск ---
            var sb = $('<div class="zf-search selector">🔍 Поиск фильмов...</div>');
            sb.on('hover:enter', function () {
                Lampa.Input.edit({
                    title: 'Поиск фильмов',
                    value: '',
                    free: true,
                    nosave: true
                }, function (v) {
                    if (v && v.trim()) self.doSearch(v.trim());
                });
            });
            body.append(sb);

            // --- Категории ---
            var cats = $('<div class="zf-cats"></div>');
            Source.categories().forEach(function (c) {
                var b = $('<div class="zf-cat selector' +
                    (c.slug === '' ? ' zf-cat--on' : '') + '">' +
                    c.title + '</div>');

                b.on('hover:enter', function () {
                    cats.find('.zf-cat').removeClass('zf-cat--on');
                    b.addClass('zf-cat--on');
                    grid.empty();
                    page = 1;
                    hasMore = true;
                    if (c.slug === '') {
                        mode = 'catalog';
                        body.find('.zf-ht').text('📽 Каталог');
                        self.load(1);
                    } else {
                        mode = 'genre';
                        gSlug = c.slug;
                        body.find('.zf-ht').text('📂 ' + c.title);
                        self.loadG(c.slug, 1);
                    }
                });
                cats.append(b);
            });
            body.append(cats);

            // --- Заголовок ---
            body.append('<div class="zf-ht">📽 Каталог</div>');

            // --- Загрузка ---
            body.append('<div class="zf-ld" id="zf-ld"><div class="zf-sp"></div>Загрузка...</div>');

            // --- Сетка ---
            body.append(grid);

            // --- Ещё ---
            var mr = $('<div class="zf-mr selector" id="zf-mr" style="display:none">⬇ Ещё</div>');
            mr.on('hover:enter', function () {
                page++;
                if (mode === 'catalog') self.load(page);
                else if (mode === 'genre') self.loadG(gSlug, page);
            });
            body.append(mr);

            scroll.append(body);

            this.load(1);
        };

        /* ---------- Загрузка каталога ---------- */
        this.load = function (p) {
            if (busy) return;
            busy = true;
            $('#zf-ld').show();

            Source.main(p, function (items, more) {
                busy = false;
                hasMore = more;
                $('#zf-ld').hide();

                if (!items.length && p === 1) {
                    grid.html('<div class="zf-em">📭 Не удалось загрузить</div>');
                } else {
                    self.cards(items);
                }

                $('#zf-mr').toggle(hasMore && mode !== 'search');

                /**
                 * ✅ ПОСЛЕ ДОБАВЛЕНИЯ КАРТОЧЕК — ОБНОВЛЯЕМ НАВИГАЦИЮ
                 * Это ключевой момент: Lampa должна пересканировать
                 * .selector элементы для D-pad навигации
                 */
                self.nav();
            });
        };

        /* ---------- Загрузка по жанру ---------- */
        this.loadG = function (slug, p) {
            if (busy) return;
            busy = true;
            $('#zf-ld').show();

            Source.getByGenre(slug, p, function (items, more) {
                busy = false;
                hasMore = more;
                $('#zf-ld').hide();

                if (!items.length && p === 1) {
                    grid.html('<div class="zf-em">📭 Ничего</div>');
                } else {
                    self.cards(items);
                }

                $('#zf-mr').toggle(more);
                self.nav();
            });
        };

        /* ---------- Поиск ---------- */
        this.doSearch = function (q) {
            mode = 'search';
            grid.empty();
            busy = true;
            $('#zf-ld').show();
            $('#zf-mr').hide();
            body.find('.zf-ht').text('🔍 ' + q);

            Source.search(q, function (items) {
                busy = false;
                $('#zf-ld').hide();
                if (!items.length) {
                    grid.html('<div class="zf-em">📭 Не найдено</div>');
                } else {
                    self.cards(items);
                }
                self.nav();
            });
        };

        /* ---------- Карточки ---------- */
        this.cards = function (items) {
            items.forEach(function (m) {
                var rc = m.rating >= 7 ? 'zf-bg' : (m.rating >= 5 ? 'zf-by' : 'zf-br');
                var ql = m.quality ? m.quality.toUpperCase() : '';
                if (ql === 'LQ') ql = 'CAM';
                if (ql === 'MQ') ql = 'HD';

                var c = $(
                    '<div class="zf-c selector" data-s="' + m.slug + '">' +
                    '<div class="zf-p">' +
                        (m.poster ? '<img src="' + m.poster + '" loading="lazy"/>' :
                        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#333;font-size:2.5em">🎬</div>') +
                    '</div>' +
                    (m.rating > 0 ? '<div class="zf-b ' + rc + '">★ ' + m.rating.toFixed(1) + '</div>' : '') +
                    (ql ? '<div class="zf-q">' + ql + '</div>' : '') +
                    '<div class="zf-n">' + m.title + '</div>' +
                    '<div class="zf-y">' + (m.year || '') + '</div>' +
                    '</div>'
                );

                c.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url: '',
                        title: m.title,
                        component: 'zf_detail',
                        slug: m.slug,
                        page: 1
                    });
                });

                /**
                 * ✅ hover:focus — вызывается Lampa при перемещении
                 * фокуса D-pad. Обновляем позицию скролла.
                 */
                c.on('hover:focus', function () {
                    scroll.update($(this));
                });

                grid.append(c);
            });
        };

        /* ============================================
         *  ✅ НАВИГАЦИЯ — ИСПРАВЛЕННАЯ ВЕРСИЯ
         *  -------------------------------------------
         *  Ключевые принципы:
         *  1. Controller.add() регистрирует контроллер
         *  2. back() ОБЯЗАТЕЛЕН — иначе зависание
         *  3. Controller.toggle() АКТИВИРУЕТ навигацию
         *  4. Lampa автоматически находит .selector
         *     в DOM и строит навигационную сетку
         *  5. scroll.toggle() связывает скролл с фокусом
         * ============================================ */
        this.nav = function () {
            /**
             * Lampa.Controller.add регистрирует набор правил.
             * 'content' — стандартное имя для основного контента.
             *
             * type: 'default' — навигация по координатам
             *   (вверх/вниз/влево/вправо по позициям .selector)
             */
            Lampa.Controller.add('content', {
                toggle: [],
                type: 'default',
                link: self,
                back: function () {
                    D.log('Cat', '← back');
                    Lampa.Activity.backward();
                }
            });

            /**
             * toggle('content') — активирует контроллер.
             * Lampa сканирует DOM внутри текущего Activity,
             * находит все .selector и разрешает навигацию.
             */
            Lampa.Controller.toggle('content');

            /**
             * scroll.toggle() — привязывает скролл к системе
             * фокуса, чтобы при перемещении скролл следовал
             * за выделенным элементом.
             */
            scroll.toggle();
        };

        /* --- Стандартные методы --- */

        this.start = function () {
            D.log('Cat', 'start()');

            /**
             * ✅ При ВОЗВРАТЕ на этот экран (после деталей)
             * навигация должна быть переактивирована,
             * иначе D-pad перестанет работать.
             */
            this.nav();
        };

        this.pause   = function () {};
        this.stop    = function () {};
        this.render  = function () { return scroll.render(); };
        this.destroy = function () {
            D.log('Cat', 'destroy');
            scroll.destroy();
        };
    }


    /* ==========================================================
     *  БЛОК 7: КОМПОНЕНТ ДЕТАЛЕЙ
     * ========================================================== */

    function DetComp(object) {
        var self    = this;
        var scroll  = new Lampa.Scroll({ mask: true, over: true });
        var body    = $('<div class="zf-dt"></div>');
        var slug    = object.slug || '';

        this.create = function () {
            D.log('Det', 'create slug=' + slug);

            body.append('<div class="zf-ld" id="zf-dl"><div class="zf-sp"></div>Загрузка...</div>');
            scroll.append(body);

            Source.getDetails(slug, function (m) {
                $('#zf-dl').remove();

                if (!m) {
                    body.append('<div class="zf-em">⚠ Ошибка загрузки</div>');
                    self.nav();
                    return;
                }

                self.show(m);
                self.nav();
            });
        };

        this.show = function (m) {
            // Бэкдроп
            if (m.backdrop) {
                body.append(
                    '<div style="width:100%;height:15em;overflow:hidden;border-radius:0.5em;margin-bottom:1em">' +
                    '<img src="' + m.backdrop + '" style="width:100%;height:100%;object-fit:cover;filter:brightness(0.35)"/>' +
                    '</div>'
                );
            }

            // Верх
            var top = $('<div class="zf-dt-top"></div>');
            top.append(
                '<div class="zf-dt-poster">' +
                (m.poster ? '<img src="' + m.poster + '"/>' : '') +
                '</div>'
            );

            var inf = $('<div class="zf-dt-info"></div>');
            inf.append('<div class="zf-dt-title">' + m.title + '</div>');
            if (m.originalTitle) inf.append('<div class="zf-dt-orig">' + m.originalTitle + '</div>');

            // Теги
            var t = '<div class="zf-dt-tags">';
            if (m.year) t += '<span class="zf-tg">' + m.year + '</span>';
            if (m.duration) t += '<span class="zf-tg">' + m.duration + ' мин</span>';
            if (m.ageLimit) t += '<span class="zf-tg">' + m.ageLimit + '+</span>';
            var ql = m.quality ? m.quality.toUpperCase() : '';
            if (ql === 'LQ') ql = 'CAM';
            if (ql === 'MQ') ql = 'HD';
            if (ql) t += '<span class="zf-tg" style="background:#E65100;color:#fff">' + ql + '</span>';
            m.genres.forEach(function (g) { t += '<span class="zf-tg zf-tg-g">' + g + '</span>'; });
            m.countries.forEach(function (c) { t += '<span class="zf-tg">' + c + '</span>'; });
            t += '</div>';
            inf.append(t);

            // Рейтинг
            if (m.rating > 0) {
                var rc = m.rating >= 7 ? '#66BB6A' : (m.rating >= 5 ? '#FFA726' : '#EF5350');
                inf.append(
                    '<div style="margin:0.5em 0">' +
                    '<span style="font-size:1.6em;font-weight:800;color:' + rc + '">★ ' + m.rating.toFixed(1) + '</span>' +
                    (m.ratingKP ? '<span style="color:#FF6F00;margin-left:1em;font-size:0.85em">КП ' + m.ratingKP.toFixed(1) + '</span>' : '') +
                    (m.ratingIMDB ? '<span style="color:#F5C518;margin-left:1em;font-size:0.85em">IMDb ' + m.ratingIMDB.toFixed(1) + '</span>' : '') +
                    '</div>'
                );
            }

            if (m.directors) inf.append('<div style="color:#aaa;font-size:0.8em">🎬 ' + m.directors + '</div>');

            top.append(inf);
            body.append(top);

            // Кнопка
            var pb = $('<div class="zf-pl selector">▶ Смотреть</div>');
            pb.on('hover:enter', function () { self.play(m); });
            pb.on('hover:focus', function () { scroll.update($(this)); });
            body.append(pb);

            // Описание
            if (m.description) {
                body.append('<div class="zf-ht" style="margin-top:1em">Описание</div>' +
                    '<div class="zf-dt-desc">' + m.description + '</div>');
            }

            // Актёры
            if (m.actors && m.actors.length) {
                var ah = '<div class="zf-ht">Актёры</div><div style="display:flex;flex-wrap:wrap;gap:0.7em">';
                m.actors.slice(0, 12).forEach(function (a) {
                    ah += '<div style="text-align:center;width:5.5em">' +
                        '<div style="width:4em;height:4em;border-radius:50%;overflow:hidden;margin:0 auto 0.2em;background:#222">' +
                        (a.photo ? '<img src="' + a.photo + '" style="width:100%;height:100%;object-fit:cover"/>' : '') +
                        '</div><div style="color:#ccc;font-size:0.65em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                        a.name + '</div></div>';
                });
                ah += '</div>';
                body.append(ah);
            }
        };

        this.play = function (m) {
            var url = Source.getStreamUrl(m.slug);
            D.log('Det', 'Play: ' + url);

            // Android
            try {
                if (typeof Lampa.Android !== 'undefined' && Lampa.Android.openUrl) {
                    Lampa.Android.openUrl(url);
                    return;
                }
            } catch (e) {}

            // iframe overlay
            var ov = $(
                '<div style="position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#000">' +
                '<iframe src="' + url + '" style="width:100%;height:100%;border:none" allowfullscreen></iframe>' +
                '<div class="selector" style="position:absolute;top:0.5em;right:0.5em;' +
                'background:rgba(0,0,0,0.8);color:#fff;padding:0.4em 0.8em;' +
                'border-radius:0.3em;z-index:100000;font-size:1.2em">✕</div></div>'
            );

            var close = function () {
                ov.remove();
                self.nav();
            };

            ov.find('.selector').on('hover:enter click', close);

            Lampa.Controller.add('content', {
                toggle: [], type: 'default', link: self,
                back: close
            });
            Lampa.Controller.toggle('content');

            $('body').append(ov);
        };

        this.nav = function () {
            Lampa.Controller.add('content', {
                toggle: [], type: 'default', link: self,
                back: function () {
                    D.log('Det', '← back');
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');
            scroll.toggle();
        };

        this.start   = function () { this.nav(); };
        this.pause   = function () {};
        this.stop    = function () {};
        this.render  = function () { return scroll.render(); };
        this.destroy = function () { scroll.destroy(); };
    }


    /* ==========================================================
     *  БЛОК 8: РЕГИСТРАЦИЯ + МЕНЮ + ЗАПУСК
     * ========================================================== */

    Lampa.Component.add('zf_main', CatComp);
    Lampa.Component.add('zf_detail', DetComp);

    /* --- Иконка --- */
    var ICO = '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z' +
        'M8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z' +
        'm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>';

    /**
     * Добавление кнопки в БОКОВОЕ МЕНЮ
     *
     * Используем тот же способ что работал в v0.1:
     * Ищем .menu__list и append в конец.
     */
    function addMenu() {
        if ($('[data-action="zonafilm"]').length) return;

        D.log('Menu', 'Добавляю...');

        var li = $(
            '<li class="menu__item selector" data-action="zonafilm">' +
            '<div class="menu__ico">' + ICO + '</div>' +
            '<div class="menu__text">ZonaFilm</div>' +
            '</li>'
        );

        li.on('hover:enter', function () {
            D.log('Menu', '→ каталог');

            /**
             * ✅ Закрываем меню перед переходом.
             * Lampa.Menu может не существовать — оборачиваем в try.
             */
            try { Lampa.Menu.close(); } catch(e) {}

            Lampa.Activity.push({
                url: '',
                title: 'ZonaFilm',
                component: 'zf_main',
                page: 1
            });
        });

        /**
         * Вставляем в боковое меню.
         * Перебираем способы — от точного к общему.
         */
        var list = $('.menu .menu__list');
        if (list.length) {
            list.eq(0).append(li);
            D.log('Menu', '✅ В menu__list');
            return;
        }

        // fallback
        var ul = $('.menu ul');
        if (ul.length) {
            ul.eq(0).append(li);
            D.log('Menu', '✅ В menu ul');
            return;
        }

        D.err('Menu', '❌ Меню не найдено');
    }

    /* --- Запуск --- */
    function init() {
        try {
            addMenu();
            D.noty('🎬 ZonaFilm v' + CONFIG.version);
            D.log('Boot', '✅ OK');
        } catch (e) {
            D.err('Boot', e.message);
        }
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

    D.log('Boot', 'Ожидание ready...');

})();
