/**
 * ============================================================
 *  LAMPA PLUGIN — ZonaFilm
 *  Версия: 0.2.0 (Этап 2 — Парсинг, постеры, детали, видео)
 * ============================================================
 *
 *  Архитектура:
 *    - DebugModule     — отладка и логирование
 *    - NetworkModule   — HTTP-запросы (прокси, CORS)
 *    - ParserModule    — извлечение данных из HTML/JSON
 *    - SourceManager   — реестр источников видео
 *    - ZonaFilmSource  — парсер zonafilm.ru
 *    - PluginComponent — главный экран (каталог постеров)
 *    - DetailComponent — экран деталей фильма
 *    - MenuIntegration — кнопка в боковом меню Lampa
 *
 *  Подключение:
 *    https://YOUR-USERNAME.github.io/lampa-plugin/zonafilm.js
 * ============================================================
 */

(function () {
    'use strict';

    /* ==========================================================
     *  БЛОК 1: КОНФИГУРАЦИЯ
     *  ---------------------------------------------------------
     *  Все настройки в одном месте для удобства изменения.
     * ========================================================== */

    var CONFIG = {
        /** Включить отладочные сообщения */
        debug: true,

        /** Название плагина (для логов и UI) */
        pluginName: 'ZonaFilm',

        /** Версия */
        version: '0.2.0',

        /**
         * CORS-прокси для обхода ограничений.
         * Lampa на Android TV не может напрямую загружать HTML с чужих доменов.
         * 
         * Варианты прокси (раскомментируйте нужный):
         *   - Встроенный прокси Lampa (если есть)
         *   - Публичные прокси (могут быть нестабильны)
         *   - Свой прокси на Cloudflare Workers (рекомендуется)
         * 
         * Формат: прокси + URL = прокси + encodeURIComponent(url)
         * Или:    прокси + URL = прокси + url (зависит от прокси)
         */
        proxyList: [
            // Встроенный прокси Lampa (предпочтительный)
            '{baseUrl}',
            // Публичные прокси (запасные)
            'https://cors-anywhere.herokuapp.com/{baseUrl}',
            'https://api.allorigins.win/raw?url={baseUrl}',
            'https://corsproxy.io/?{baseUrl}'
        ],

        /** Индекс текущего активного прокси */
        activeProxy: 0,

        /** Таймаут запроса в мс */
        requestTimeout: 15000,

        /** Количество карточек в ряду */
        cardsPerRow: 7
    };


    /* ==========================================================
     *  БЛОК 2: ОТЛАДОЧНЫЙ МОДУЛЬ (DebugModule)
     *  ---------------------------------------------------------
     *  Логирование с уровнями, замер времени, экранные нотификации.
     *  Все логи имеют префикс [ZonaFilm] для фильтрации в консоли.
     * ========================================================== */

    var DebugModule = {
        _timers: {},

        /**
         * Обычный лог
         * @param {string} tag — имя модуля/функции
         * @param {*} msg — сообщение
         */
        log: function (tag, msg) {
            if (!CONFIG.debug) return;
            console.log('%c[' + CONFIG.pluginName + '][' + tag + ']',
                'color: #4FC3F7; font-weight: bold;', msg);
        },

        /**
         * Предупреждение
         */
        warn: function (tag, msg) {
            if (!CONFIG.debug) return;
            console.warn('[' + CONFIG.pluginName + '][WARN][' + tag + ']', msg);
        },

        /**
         * Ошибка (всегда показывается, даже если debug=false)
         */
        error: function (tag, msg) {
            console.error('[' + CONFIG.pluginName + '][ERROR][' + tag + ']', msg);
        },

        /**
         * Начать замер времени
         */
        timeStart: function (label) {
            if (!CONFIG.debug) return;
            this._timers[label] = Date.now();
        },

        /**
         * Завершить замер и вывести результат
         */
        timeEnd: function (label) {
            if (!CONFIG.debug) return;
            var start = this._timers[label];
            if (start) {
                var elapsed = Date.now() - start;
                this.log('Timer', label + ': ' + elapsed + 'ms');
                delete this._timers[label];
            }
        },

        /**
         * Экранное уведомление в Lampa
         */
        notify: function (text) {
            try {
                Lampa.Noty.show(text);
            } catch (e) { }
        },

        /**
         * Отладочное уведомление (только если debug=true)
         */
        debugNotify: function (text) {
            if (!CONFIG.debug) return;
            this.notify('🔧 ' + text);
        }
    };

    DebugModule.log('Init', 'Загрузка плагина v' + CONFIG.version + '...');


    /* ==========================================================
     *  БЛОК 3: СЕТЕВОЙ МОДУЛЬ (NetworkModule)
     *  ---------------------------------------------------------
     *  Обёртка над HTTP-запросами с поддержкой CORS-прокси.
     *  Автоматически переключает прокси при ошибках.
     *  
     *  Методы:
     *    - request(url, callback, errorCallback)
     *    - buildProxyUrl(url)
     * ========================================================== */

    var NetworkModule = {
        /**
         * Построить URL через прокси
         * @param {string} url — оригинальный URL
         * @returns {string} URL через прокси
         */
        buildProxyUrl: function (url) {
            // Попробуем использовать встроенный прокси Lampa
            if (typeof Lampa !== 'undefined' && Lampa.Storage) {
                var proxyEnabled = Lampa.Storage.get('proxy_tmdb', false);
                // Если Lampa имеет свой прокси, используем его
            }

            var template = CONFIG.proxyList[CONFIG.activeProxy] || '{baseUrl}';
            var proxyUrl = template.replace('{baseUrl}', encodeURIComponent(url));

            DebugModule.log('Network', 'Прокси URL: ' + proxyUrl);
            return proxyUrl;
        },

        /**
         * HTTP GET запрос
         * @param {object} params — параметры:
         *   - url: string — целевой URL
         *   - useProxy: boolean — использовать прокси (по умолчанию true)
         *   - dataType: string — 'text' или 'json'
         * @param {function} onSuccess — callback(data)
         * @param {function} onError — callback(error)
         */
        request: function (params, onSuccess, onError) {
            var url = params.url;
            var useProxy = params.useProxy !== false;
            var dataType = params.dataType || 'text';

            DebugModule.timeStart('request:' + url);

            var requestUrl = useProxy ? this.buildProxyUrl(url) : url;

            DebugModule.log('Network', 'Запрос: ' + url);

            $.ajax({
                url: requestUrl,
                method: 'GET',
                timeout: CONFIG.requestTimeout,
                dataType: dataType,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                success: function (data) {
                    DebugModule.timeEnd('request:' + url);
                    DebugModule.log('Network', 'Успех: ' + url + ' (' + (typeof data === 'string' ? data.length : 'obj') + ')');
                    if (onSuccess) onSuccess(data);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    DebugModule.timeEnd('request:' + url);
                    DebugModule.error('Network', 'Ошибка (' + textStatus + '): ' + url + ' — ' + errorThrown);

                    // Попытка переключить прокси
                    if (useProxy && CONFIG.activeProxy < CONFIG.proxyList.length - 1) {
                        CONFIG.activeProxy++;
                        DebugModule.warn('Network', 'Переключаю на прокси #' + CONFIG.activeProxy);
                        // Повторяем запрос с новым прокси
                        NetworkModule.request(params, onSuccess, onError);
                    } else {
                        if (onError) onError(textStatus + ': ' + errorThrown);
                    }
                }
            });
        },

        /**
         * Быстрый GET для получения HTML
         */
        getHTML: function (url, onSuccess, onError) {
            this.request({ url: url, dataType: 'text' }, onSuccess, onError);
        },

        /**
         * Быстрый GET для JSON
         */
        getJSON: function (url, onSuccess, onError) {
            this.request({ url: url, dataType: 'json' }, onSuccess, onError);
        }
    };


    /* ==========================================================
     *  БЛОК 4: МОДУЛЬ ПАРСИНГА (ParserModule)
     *  ---------------------------------------------------------
     *  Извлечение структурированных данных из HTML.
     *  Ключевая особенность zonafilm.ru — Next.js приложение,
     *  все данные в <script id="__NEXT_DATA__"> в формате JSON.
     * ========================================================== */

    var ParserModule = {
        /**
         * Извлечь JSON из __NEXT_DATA__ тега в HTML
         * @param {string} html — HTML страницы
         * @returns {object|null} — распарсенный JSON или null
         * 
         * Это ГЛАВНЫЙ метод парсинга для zonafilm.ru!
         * Сайт на Next.js хранит все данные страницы в этом теге.
         */
        extractNextData: function (html) {
            try {
                // Ищем содержимое тега <script id="__NEXT_DATA__">
                var regex = /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/;
                var match = html.match(regex);

                if (match && match[1]) {
                    var data = JSON.parse(match[1]);
                    DebugModule.log('Parser', '__NEXT_DATA__ извлечён, ключи: ' +
                        Object.keys(data.props.pageProps).join(', '));
                    return data;
                }

                DebugModule.error('Parser', '__NEXT_DATA__ не найден в HTML');
                return null;
            } catch (e) {
                DebugModule.error('Parser', 'Ошибка парсинга __NEXT_DATA__: ' + e.message);
                return null;
            }
        },

        /**
         * Извлечь данные о фильме из __NEXT_DATA__
         * @param {object} nextData — результат extractNextData()
         * @returns {object} — нормализованный объект фильма
         */
        parseMovieDetails: function (nextData) {
            try {
                var d = nextData.props.pageProps.data;

                // Определяем жанры и страны из тегов
                var genres = [];
                var countries = [];
                if (d.meta && d.meta.tags) {
                    d.meta.tags.forEach(function (tag) {
                        if (tag.type === 'genre') genres.push(tag.title);
                        if (tag.type === 'country') countries.push(tag.title);
                    });
                }

                // Определяем актёров
                var actors = [];
                if (d.meta && d.meta.actors) {
                    actors = d.meta.actors.map(function (a) {
                        return {
                            name: a.name,
                            photo: a.cover_url || '',
                            role: a.role || ''
                        };
                    });
                }

                var movie = {
                    // Основная информация
                    title:          d.title || '',
                    originalTitle:  d.title_original || d.title_eng || '',
                    slug:           d.slug || '',
                    year:           d.year || 0,
                    description:    d.description || '',

                    // Медиа
                    poster:         d.cover_url || '',
                    backdrop:       nextData.props.pageProps.backdropUrl || d.backdrop_url || '',
                    duration:       d.duration || 0,        // в минутах
                    durationMs:     d.duration_ms || 0,     // в миллисекундах

                    // Рейтинги
                    rating:         d.rating || 0,
                    ratingKP:       d.rating_kp || 0,
                    ratingIMDB:     d.rating_imdb || 0,
                    ratingCount:    d.rating_count || 0,

                    // Метаданные
                    genres:         genres,
                    countries:      countries,
                    directors:      d.directors || '',
                    writers:        d.writers || '',
                    actors:         actors,
                    ageLimit:       d.age_limit || 0,

                    // Видео
                    embedUrl:       'https://zonafilm.ru/movies/embed/' + d.slug,
                    quality:        d.best_quality || '',

                    // Ссылки
                    pageUrl:        'https://zonafilm.ru/movies/' + d.slug,
                    kpId:           d.kp_id || 0
                };

                DebugModule.log('Parser', 'Фильм распарсен: ' + movie.title + ' (' + movie.year + ')');
                return movie;

            } catch (e) {
                DebugModule.error('Parser', 'Ошибка parseMovieDetails: ' + e.message);
                return null;
            }
        },

        /**
         * Извлечь список фильмов из страницы каталога
         * @param {object} nextData — результат extractNextData()
         * @returns {Array} — массив объектов фильмов
         * 
         * Структура __NEXT_DATA__ для каталога может отличаться.
         * Нужно адаптировать под реальные данные (см. вопрос ниже).
         */
        parseMovieList: function (nextData) {
            try {
                var pageProps = nextData.props.pageProps;

                // --- Пробуем разные варианты структуры ---
                // Вариант 1: data — это массив
                var items = null;

                if (pageProps.data && Array.isArray(pageProps.data)) {
                    items = pageProps.data;
                }
                // Вариант 2: data.items или data.results
                else if (pageProps.data && pageProps.data.items) {
                    items = pageProps.data.items;
                }
                else if (pageProps.data && pageProps.data.results) {
                    items = pageProps.data.results;
                }
                // Вариант 3: movies или films в корне pageProps
                else if (pageProps.movies) {
                    items = pageProps.movies;
                }
                else if (pageProps.films) {
                    items = pageProps.films;
                }
                // Вариант 4: sections с массивами
                else if (pageProps.sections) {
                    items = [];
                    pageProps.sections.forEach(function (section) {
                        if (section.items) {
                            items = items.concat(section.items);
                        }
                    });
                }

                if (!items || !items.length) {
                    DebugModule.warn('Parser', 'Список фильмов пуст. Ключи pageProps: ' +
                        Object.keys(pageProps).join(', '));

                    // Отладка: выводим структуру для анализа
                    if (CONFIG.debug) {
                        DebugModule.log('Parser', 'pageProps структура:');
                        Object.keys(pageProps).forEach(function (key) {
                            var val = pageProps[key];
                            var type = Array.isArray(val) ? 'Array[' + val.length + ']' : typeof val;
                            DebugModule.log('Parser', '  ' + key + ': ' + type);
                        });
                    }

                    return [];
                }

                // Нормализуем каждый элемент
                var movies = items.map(function (item) {
                    return {
                        title:      item.title || item.name || '',
                        slug:       item.slug || item.url || '',
                        year:       item.year || 0,
                        poster:     item.cover_url || item.poster || item.image || '',
                        rating:     item.rating || item.rating_kp || 0,
                        duration:   item.duration || 0,
                        quality:    item.best_quality || '',
                        genres:     (item.genres || []).map(function(g){ return g.title || g; }),
                        url:        '/movies/' + (item.slug || '')
                    };
                });

                DebugModule.log('Parser', 'Список: ' + movies.length + ' фильмов');
                return movies;

            } catch (e) {
                DebugModule.error('Parser', 'Ошибка parseMovieList: ' + e.message);
                return [];
            }
        },

        /**
         * Извлечь видео-URL из embed-страницы
         * @param {string} html — HTML embed-страницы
         * @returns {string|null} — прямой URL видео или null
         * 
         * Embed URL: https://zonafilm.ru/movies/embed/{slug}
         * Нужно найти <video src="..."> или JS с URL потока
         */
        parseEmbedVideo: function (html) {
            try {
                // Вариант 1: <video src="...">
                var videoSrc = html.match(/<video[^>]*\ssrc=["']([^"']+)["']/i);
                if (videoSrc && videoSrc[1]) {
                    DebugModule.log('Parser', 'Видео найдено в <video>: ' + videoSrc[1]);
                    return videoSrc[1];
                }

                // Вариант 2: <source src="...">
                var sourceSrc = html.match(/<source[^>]*\ssrc=["']([^"']+)["']/i);
                if (sourceSrc && sourceSrc[1]) {
                    DebugModule.log('Parser', 'Видео найдено в <source>: ' + sourceSrc[1]);
                    return sourceSrc[1];
                }

                // Вариант 3: HLS плейлист (.m3u8) в JS
                var m3u8 = html.match(/["'](https?:\/\/[^"']*\.m3u8[^"']*)["']/i);
                if (m3u8 && m3u8[1]) {
                    DebugModule.log('Parser', 'HLS найден: ' + m3u8[1]);
                    return m3u8[1];
                }

                // Вариант 4: MP4 в JS
                var mp4 = html.match(/["'](https?:\/\/[^"']*\.mp4[^"']*)["']/i);
                if (mp4 && mp4[1]) {
                    DebugModule.log('Parser', 'MP4 найден: ' + mp4[1]);
                    return mp4[1];
                }

                // Вариант 5: iframe с внешним плеером
                var iframe = html.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
                if (iframe && iframe[1]) {
                    DebugModule.log('Parser', 'Iframe найден: ' + iframe[1]);
                    return iframe[1];
                }

                // Вариант 6: поиск в __NEXT_DATA__ embed-страницы
                var nextData = this.extractNextData(html);
                if (nextData) {
                    var pp = nextData.props.pageProps;
                    if (pp.videoUrl)  return pp.videoUrl;
                    if (pp.streamUrl) return pp.streamUrl;
                    if (pp.url)       return pp.url;
                    if (pp.data && pp.data.meta && pp.data.meta.embed_url) {
                        return pp.data.meta.embed_url;
                    }
                }

                DebugModule.warn('Parser', 'Видео URL не найден в embed');
                return null;

            } catch (e) {
                DebugModule.error('Parser', 'Ошибка parseEmbedVideo: ' + e.message);
                return null;
            }
        }
    };


    /* ==========================================================
     *  БЛОК 5: МЕНЕДЖЕР ИСТОЧНИКОВ (SourceManager)
     *  ---------------------------------------------------------
     *  Реестр всех доступных источников видео.
     *  Для добавления нового источника (напр. hdrezka):
     *    1. Создайте объект с методами: main, search, categories, etc.
     *    2. SourceManager.register('hdrezka', HdrezkaSource);
     * ========================================================== */

    var SourceManager = {
        _sources: {},
        _active: null,

        register: function (name, source) {
            this._sources[name] = source;
            DebugModule.log('SourceManager', '+ Источник: ' + name);
        },

        get: function (name) {
            return this._sources[name] || null;
        },

        setActive: function (name) {
            if (this._sources[name]) {
                this._active = name;
                DebugModule.log('SourceManager', 'Активный: ' + name);
            }
        },

        getActive: function () {
            return this._sources[this._active] || null;
        },

        getActiveName: function () {
            return this._active;
        },

        list: function () {
            return Object.keys(this._sources);
        }
    };


    /* ==========================================================
     *  БЛОК 6: ИСТОЧНИК — ZONAFILM (ZonaFilmSource)
     *  ---------------------------------------------------------
     *  Парсер сайта https://zonafilm.ru/
     *  
     *  Сайт на Next.js → все данные в __NEXT_DATA__ (JSON).
     *  
     *  URL-схема:
     *    /movies              — каталог фильмов
     *    /movies/{slug}       — страница фильма
     *    /movies/embed/{slug} — embed-плеер
     *    /tvseries            — сериалы
     *    /movies/filter/genre-{slug}   — жанр
     *    /movies/filter/country-{slug} — страна
     * ========================================================== */

    var ZonaFilmSource = {
        name: 'ZonaFilm',
        baseUrl: 'https://zonafilm.ru',
        icon: '🎬',

        /**
         * Загрузить главную / каталог фильмов
         * @param {number}   page     — номер страницы (1, 2, ...)
         * @param {function} callback — callback(items, hasMore)
         */
        main: function (page, callback) {
            var url = this.baseUrl + '/movies' + (page > 1 ? '?page=' + page : '');

            DebugModule.log('ZonaFilm', 'Загрузка каталога: ' + url);

            NetworkModule.getHTML(url, function (html) {
                var nextData = ParserModule.extractNextData(html);

                if (nextData) {
                    var items = ParserModule.parseMovieList(nextData);
                    callback(items, items.length > 0);
                } else {
                    DebugModule.error('ZonaFilm', 'Не удалось извлечь данные каталога');
                    callback([], false);
                }
            }, function (err) {
                DebugModule.error('ZonaFilm', 'Ошибка загрузки каталога: ' + err);
                callback([], false);
            });
        },

        /**
         * Загрузить детали фильма
         * @param {string}   slug     — slug фильма (напр. 'opasnyi-duet')
         * @param {function} callback — callback(movieObj)
         */
        getDetails: function (slug, callback) {
            var url = this.baseUrl + '/movies/' + slug;

            DebugModule.log('ZonaFilm', 'Загрузка деталей: ' + url);

            NetworkModule.getHTML(url, function (html) {
                var nextData = ParserModule.extractNextData(html);

                if (nextData) {
                    var movie = ParserModule.parseMovieDetails(nextData);
                    callback(movie);
                } else {
                    DebugModule.error('ZonaFilm', 'Не удалось извлечь детали');
                    callback(null);
                }
            }, function (err) {
                DebugModule.error('ZonaFilm', 'Ошибка загрузки деталей: ' + err);
                callback(null);
            });
        },

        /**
         * Получить URL видеопотока для воспроизведения
         * @param {string}   slug     — slug фильма
         * @param {function} callback — callback(videoUrl)
         */
        getStream: function (slug, callback) {
            var embedUrl = this.baseUrl + '/movies/embed/' + slug;

            DebugModule.log('ZonaFilm', 'Загрузка embed: ' + embedUrl);

            NetworkModule.getHTML(embedUrl, function (html) {
                var videoUrl = ParserModule.parseEmbedVideo(html);

                if (videoUrl) {
                    callback(videoUrl);
                } else {
                    // Если embed не дал результата, пробуем страницу фильма
                    DebugModule.warn('ZonaFilm', 'Embed пуст, пробуем feed...');

                    var feedUrl = 'https://zonafilm.ru/movies/feed/' + slug;
                    NetworkModule.getHTML(feedUrl, function (feedHtml) {
                        var videoUrl2 = ParserModule.parseEmbedVideo(feedHtml);
                        callback(videoUrl2);
                    }, function () {
                        callback(null);
                    });
                }
            }, function (err) {
                DebugModule.error('ZonaFilm', 'Ошибка загрузки embed: ' + err);
                callback(null);
            });
        },

        /**
         * Поиск фильмов
         * @param {string}   query    — поисковый запрос
         * @param {function} callback — callback(items)
         * 
         * ZonaFilm использует JS для поиска, скорее всего
         * есть внутренний API. Пробуем разные варианты.
         */
        search: function (query, callback) {
            var self = this;

            // Вариант 1: API-эндпоинт поиска
            // Next.js приложения часто имеют API в /api/
            var apiUrl = this.baseUrl + '/api/search?query=' + encodeURIComponent(query);

            DebugModule.log('ZonaFilm', 'Поиск: ' + query);

            NetworkModule.request({
                url: apiUrl,
                dataType: 'text'
            }, function (data) {
                try {
                    // Пробуем распарсить как JSON (API ответ)
                    var json = JSON.parse(data);

                    var items = [];
                    var results = json.data || json.results || json.items || json;

                    if (Array.isArray(results)) {
                        items = results.map(function (item) {
                            return {
                                title:   item.title || item.name || '',
                                slug:    item.slug || '',
                                year:    item.year || 0,
                                poster:  item.cover_url || item.poster || '',
                                rating:  item.rating || 0,
                                url:     '/movies/' + (item.slug || '')
                            };
                        });
                    }

                    DebugModule.log('ZonaFilm', 'Найдено через API: ' + items.length);
                    callback(items);
                } catch (e) {
                    // Не JSON — возможно это HTML-страница
                    var nextData = ParserModule.extractNextData(data);
                    if (nextData) {
                        callback(ParserModule.parseMovieList(nextData));
                    } else {
                        // Вариант 2: пробуем через _next/data/ роут
                        self._searchFallback(query, callback);
                    }
                }
            }, function () {
                // API не доступен — пробуем fallback
                self._searchFallback(query, callback);
            });
        },

        /**
         * Запасной метод поиска — через Next.js data route
         * @private
         */
        _searchFallback: function (query, callback) {
            // Next.js apps иногда имеют /_next/data/{buildId}/search.json?q=...
            // Или можно попробовать обычный GET с query параметром
            var url = this.baseUrl + '/movies?search=' + encodeURIComponent(query);

            NetworkModule.getHTML(url, function (html) {
                var nextData = ParserModule.extractNextData(html);
                if (nextData) {
                    callback(ParserModule.parseMovieList(nextData));
                } else {
                    callback([]);
                }
            }, function () {
                callback([]);
            });
        },

        /**
         * Получить список категорий (жанров)
         * @param {function} callback — callback(categories)
         */
        categories: function (callback) {
            // Известные категории из HTML (genre-{slug})
            var genres = [
                { title: 'Боевик',       slug: 'boevik',       url: '/movies/filter/genre-boevik' },
                { title: 'Комедия',      slug: 'komediia',     url: '/movies/filter/genre-komediia' },
                { title: 'Драма',        slug: 'drama',        url: '/movies/filter/genre-drama' },
                { title: 'Ужасы',        slug: 'uzhasy',       url: '/movies/filter/genre-uzhasy' },
                { title: 'Фантастика',   slug: 'fantastika',   url: '/movies/filter/genre-fantastika' },
                { title: 'Триллер',      slug: 'triller',      url: '/movies/filter/genre-triller' },
                { title: 'Мелодрама',    slug: 'melodrama',    url: '/movies/filter/genre-melodrama' },
                { title: 'Детектив',     slug: 'detektiv',     url: '/movies/filter/genre-detektiv' },
                { title: 'Криминал',     slug: 'kriminal',     url: '/movies/filter/genre-kriminal' },
                { title: 'Приключения',  slug: 'prikliucheniia', url: '/movies/filter/genre-prikliucheniia' },
                { title: 'Фэнтези',     slug: 'fentezi',      url: '/movies/filter/genre-fentezi' },
                { title: 'Мультфильм',   slug: 'multfilm',     url: '/movies/filter/genre-multfilm' },
                { title: 'Документальный', slug: 'dokumentalnyi', url: '/movies/filter/genre-dokumentalnyi' },
                { title: 'Семейный',     slug: 'semeinyi',     url: '/movies/filter/genre-semeinyi' },
                { title: 'Военный',      slug: 'voennyi',      url: '/movies/filter/genre-voennyi' },
                { title: 'Биография',    slug: 'biografiia',   url: '/movies/filter/genre-biografiia' },
                { title: 'Исторический', slug: 'istoricheskii', url: '/movies/filter/genre-istoricheskii' }
            ];

            callback(genres);
        },

        /**
         * Загрузить фильмы по категории
         * @param {string}   genreSlug — slug жанра
         * @param {number}   page
         * @param {function} callback
         */
        getByCategory: function (genreSlug, page, callback) {
            var url = this.baseUrl + '/movies/filter/genre-' + genreSlug;
            if (page > 1) url += '?page=' + page;

            DebugModule.log('ZonaFilm', 'Категория: ' + url);

            NetworkModule.getHTML(url, function (html) {
                var nextData = ParserModule.extractNextData(html);
                if (nextData) {
                    callback(ParserModule.parseMovieList(nextData));
                } else {
                    callback([]);
                }
            }, function () {
                callback([]);
            });
        }
    };

    // Регистрируем
    SourceManager.register('zonafilm', ZonaFilmSource);
    SourceManager.setActive('zonafilm');


    /* ==========================================================
     *  БЛОК 7: СТИЛИ CSS
     *  ---------------------------------------------------------
     *  Инжектируем CSS для наших компонентов.
     *  Стили адаптированы под TV-интерфейс (крупные элементы).
     * ========================================================== */

    var PLUGIN_CSS = `
        /* ---- Контейнер каталога ---- */
        .zonafilm-catalog {
            padding: 1em;
        }
        
        /* ---- Заголовок секции ---- */
        .zonafilm-section-title {
            color: #fff;
            font-size: 1.4em;
            font-weight: 700;
            padding: 0.5em 0;
            margin-bottom: 0.3em;
        }
        
        /* ---- Сетка карточек ---- */
        .zonafilm-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 0.8em;
        }
        
        /* ---- Карточка фильма ---- */
        .zonafilm-card {
            width: 12em;
            cursor: pointer;
            transition: transform 0.2s ease;
            position: relative;
        }
        .zonafilm-card.focus {
            transform: scale(1.08);
        }
        
        /* ---- Постер ---- */
        .zonafilm-card__poster {
            width: 100%;
            height: 17em;
            border-radius: 0.5em;
            overflow: hidden;
            background: #1a1a2e;
            position: relative;
        }
        .zonafilm-card__poster img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .zonafilm-card__poster-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #444;
            font-size: 3em;
        }
        
        /* ---- Рейтинг на постере ---- */
        .zonafilm-card__rating {
            position: absolute;
            top: 0.3em;
            left: 0.3em;
            background: rgba(0, 0, 0, 0.7);
            color: #4FC3F7;
            padding: 0.15em 0.4em;
            border-radius: 0.3em;
            font-size: 0.8em;
            font-weight: 700;
        }
        .zonafilm-card__rating--good { color: #66BB6A; }
        .zonafilm-card__rating--avg  { color: #FFA726; }
        .zonafilm-card__rating--bad  { color: #EF5350; }
        
        /* ---- Качество ---- */
        .zonafilm-card__quality {
            position: absolute;
            top: 0.3em;
            right: 0.3em;
            background: rgba(255, 152, 0, 0.85);
            color: #fff;
            padding: 0.1em 0.3em;
            border-radius: 0.2em;
            font-size: 0.7em;
            font-weight: 700;
            text-transform: uppercase;
        }
        
        /* ---- Название ---- */
        .zonafilm-card__title {
            color: #fff;
            font-size: 0.85em;
            margin-top: 0.4em;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        /* ---- Год ---- */
        .zonafilm-card__year {
            color: #888;
            font-size: 0.75em;
        }
        
        /* ---- Строка поиска ---- */
        .zonafilm-search-bar {
            display: flex;
            align-items: center;
            gap: 0.5em;
            padding: 0.5em 1em;
            margin-bottom: 0.5em;
        }
        .zonafilm-search-input {
            flex: 1;
            background: #1a1a2e;
            border: 2px solid #333;
            border-radius: 0.5em;
            color: #fff;
            padding: 0.5em 1em;
            font-size: 1.1em;
            outline: none;
        }
        .zonafilm-search-input:focus,
        .zonafilm-search-input.focus {
            border-color: #4FC3F7;
        }
        .zonafilm-search-btn {
            background: #4FC3F7;
            color: #000;
            border: none;
            border-radius: 0.5em;
            padding: 0.5em 1.2em;
            font-size: 1.1em;
            cursor: pointer;
            font-weight: 700;
        }
        
        /* ---- Загрузка ---- */
        .zonafilm-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3em;
            color: #888;
            font-size: 1.2em;
        }
        .zonafilm-loading__spinner {
            display: inline-block;
            width: 2em;
            height: 2em;
            border: 3px solid #333;
            border-top: 3px solid #4FC3F7;
            border-radius: 50%;
            animation: zonafilm-spin 0.8s linear infinite;
            margin-right: 0.8em;
        }
        @keyframes zonafilm-spin {
            to { transform: rotate(360deg); }
        }
        
        /* ---- Страница деталей ---- */
        .zonafilm-detail {
            padding: 1.5em;
            color: #fff;
        }
        .zonafilm-detail__header {
            display: flex;
            gap: 1.5em;
            margin-bottom: 1.5em;
        }
        .zonafilm-detail__poster {
            width: 14em;
            height: 20em;
            border-radius: 0.5em;
            overflow: hidden;
            flex-shrink: 0;
        }
        .zonafilm-detail__poster img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .zonafilm-detail__info {
            flex: 1;
        }
        .zonafilm-detail__title {
            font-size: 1.8em;
            font-weight: 800;
            margin-bottom: 0.2em;
        }
        .zonafilm-detail__orig-title {
            color: #888;
            font-size: 1em;
            margin-bottom: 0.5em;
        }
        .zonafilm-detail__meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5em;
            margin-bottom: 0.8em;
        }
        .zonafilm-detail__tag {
            background: #2a2a4a;
            padding: 0.2em 0.6em;
            border-radius: 0.3em;
            font-size: 0.85em;
            color: #aaa;
        }
        .zonafilm-detail__tag--genre {
            background: #1565C0;
            color: #fff;
        }
        .zonafilm-detail__rating-box {
            display: flex;
            gap: 1.5em;
            margin-bottom: 1em;
        }
        .zonafilm-detail__rating-item {
            text-align: center;
        }
        .zonafilm-detail__rating-value {
            font-size: 1.5em;
            font-weight: 800;
        }
        .zonafilm-detail__rating-label {
            font-size: 0.7em;
            color: #888;
        }
        .zonafilm-detail__description {
            color: #ccc;
            font-size: 0.95em;
            line-height: 1.5;
            margin-bottom: 1em;
        }
        .zonafilm-detail__play-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5em;
            background: #E53935;
            color: #fff;
            border: none;
            border-radius: 0.5em;
            padding: 0.7em 2em;
            font-size: 1.2em;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s, background 0.2s;
        }
        .zonafilm-detail__play-btn.focus {
            background: #F44336;
            transform: scale(1.05);
        }
        
        /* ---- Пустое состояние ---- */
        .zonafilm-empty {
            text-align: center;
            padding: 4em 2em;
            color: #666;
        }
        .zonafilm-empty__icon {
            font-size: 4em;
            margin-bottom: 0.3em;
        }
        
        /* ---- Категории ---- */
        .zonafilm-categories {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5em;
            padding: 0.5em 1em;
            margin-bottom: 0.5em;
        }
        .zonafilm-category-btn {
            background: #2a2a4a;
            color: #ccc;
            border: 2px solid transparent;
            border-radius: 0.5em;
            padding: 0.4em 1em;
            font-size: 0.9em;
            cursor: pointer;
            transition: all 0.2s;
        }
        .zonafilm-category-btn.focus,
        .zonafilm-category-btn--active {
            border-color: #4FC3F7;
            color: #fff;
            background: #1a1a3e;
        }
    `;

    // Инжектируем стили
    $('<style>')
        .attr('id', 'zonafilm-plugin-styles')
        .text(PLUGIN_CSS)
        .appendTo('head');

    DebugModule.log('Init', 'CSS стили инжектированы');


    /* ==========================================================
     *  БЛОК 8: КОМПОНЕНТ КАТАЛОГА (главный экран)
     *  ---------------------------------------------------------
     *  Отображает сетку постеров с возможностью:
     *    - Просмотр каталога
     *    - Поиск (строка поиска вверху)
     *    - Категории (кнопки жанров)
     *    - Навигация пультом ТВ
     *    - Бесконечная прокрутка (подгрузка страниц)
     * ========================================================== */

    function CatalogComponent(object) {
        var _self    = this;
        var _scroll  = null;
        var _content = null;
        var _page    = 1;
        var _loading = false;
        var _hasMore = true;
        var _mode    = 'catalog';  // 'catalog', 'search', 'category'
        var _query   = '';
        var _categorySlug = '';

        DebugModule.log('Catalog', 'Создание компонента каталога');

        /* ---------- create() ---------- */
        this.create = function () {
            DebugModule.log('Catalog', 'create()');

            // Scroll-контейнер Lampa
            _scroll = new Lampa.Scroll({ mask: true, over: true });

            // Корневой контейнер
            _content = $('<div class="zonafilm-catalog"></div>');

            // --- Строка поиска ---
            var searchBar = $(
                '<div class="zonafilm-search-bar">' +
                    '<div class="zonafilm-search-input selector" tabindex="0" ' +
                    'style="display:flex;align-items:center;min-height:2em;">' +
                        '<span style="color:#666;">🔍 Поиск фильмов...</span>' +
                    '</div>' +
                '</div>'
            );

            // По нажатию Enter на строке поиска — открываем клавиатуру
            searchBar.find('.zonafilm-search-input').on('hover:enter', function () {
                _self.openSearch();
            });

            _content.append(searchBar);

            // --- Контейнер категорий (пока скрыт, будет заполнен) ---
            var categoriesContainer = $('<div class="zonafilm-categories" id="zonafilm-cats"></div>');
            _content.append(categoriesContainer);

            // Загружаем категории
            this.loadCategories(categoriesContainer);

            // --- Заголовок секции ---
            var sectionTitle = $('<div class="zonafilm-section-title" id="zonafilm-section-title">📽 Каталог фильмов</div>');
            _content.append(sectionTitle);

            // --- Индикатор загрузки ---
            var loader = $(
                '<div class="zonafilm-loading" id="zonafilm-loader">' +
                    '<div class="zonafilm-loading__spinner"></div>' +
                    '<span>Загрузка...</span>' +
                '</div>'
            );
            _content.append(loader);

            // --- Сетка карточек ---
            var grid = $('<div class="zonafilm-grid" id="zonafilm-grid"></div>');
            _content.append(grid);

            // --- Кнопка "Загрузить ещё" ---
            var loadMore = $(
                '<div class="selector zonafilm-empty" id="zonafilm-loadmore" style="display:none;">' +
                    '<div>⬇️ Загрузить ещё</div>' +
                '</div>'
            );
            loadMore.on('hover:enter', function () {
                _self.loadMore();
            });
            _content.append(loadMore);

            // Вставляем в скролл
            _scroll.append(_content);

            // Загружаем первую страницу каталога
            this.loadCatalog(1);
        };


        /* ---------- loadCategories() ---------- */
        this.loadCategories = function (container) {
            var source = SourceManager.getActive();
            if (!source) return;

            source.categories(function (cats) {
                // Кнопка "Все"
                var allBtn = $(
                    '<div class="zonafilm-category-btn zonafilm-category-btn--active selector" data-slug="">' +
                        'Все' +
                    '</div>'
                );
                allBtn.on('hover:enter', function () {
                    container.find('.zonafilm-category-btn').removeClass('zonafilm-category-btn--active');
                    $(this).addClass('zonafilm-category-btn--active');
                    _self.switchToCategory('');
                });
                container.append(allBtn);

                cats.forEach(function (cat) {
                    var btn = $(
                        '<div class="zonafilm-category-btn selector" data-slug="' + cat.slug + '">' +
                            cat.title +
                        '</div>'
                    );
                    btn.on('hover:enter', function () {
                        container.find('.zonafilm-category-btn').removeClass('zonafilm-category-btn--active');
                        $(this).addClass('zonafilm-category-btn--active');
                        _self.switchToCategory(cat.slug);
                    });
                    container.append(btn);
                });
            });
        };


        /* ---------- switchToCategory() ---------- */
        this.switchToCategory = function (slug) {
            _page = 1;
            _hasMore = true;
            $('#zonafilm-grid').empty();

            if (slug === '') {
                _mode = 'catalog';
                _categorySlug = '';
                $('#zonafilm-section-title').text('📽 Каталог фильмов');
                this.loadCatalog(1);
            } else {
                _mode = 'category';
                _categorySlug = slug;
                $('#zonafilm-section-title').text('📂 Жанр: ' + slug);
                this.loadByCategory(slug, 1);
            }
        };


        /* ---------- loadCatalog() ---------- */
        this.loadCatalog = function (page) {
            if (_loading) return;
            _loading = true;
            this.showLoader(true);

            var source = SourceManager.getActive();
            if (!source) {
                this.showError('Источник не выбран');
                return;
            }

            source.main(page, function (items, hasMore) {
                _loading = false;
                _hasMore = hasMore;
                _self.showLoader(false);
                _self.renderCards(items);
                _self.updateLoadMore();
                _self.activateNavigation();
            });
        };


        /* ---------- loadByCategory() ---------- */
        this.loadByCategory = function (slug, page) {
            if (_loading) return;
            _loading = true;
            this.showLoader(true);

            var source = SourceManager.getActive();
            source.getByCategory(slug, page, function (items) {
                _loading = false;
                _hasMore = items.length > 0;
                _self.showLoader(false);
                _self.renderCards(items);
                _self.updateLoadMore();
                _self.activateNavigation();
            });
        };


        /* ---------- doSearch() ---------- */
        this.doSearch = function (query) {
            if (!query || !query.trim()) return;

            _mode = 'search';
            _query = query.trim();
            _page = 1;
            _hasMore = false;

            $('#zonafilm-grid').empty();
            $('#zonafilm-section-title').text('🔍 Результаты: "' + _query + '"');
            this.showLoader(true);

            var source = SourceManager.getActive();
            source.search(_query, function (items) {
                _loading = false;
                _self.showLoader(false);

                if (items.length === 0) {
                    _self.showEmpty('Ничего не найдено по запросу "' + _query + '"');
                } else {
                    _self.renderCards(items);
                }

                _self.activateNavigation();
            });
        };


        /* ---------- openSearch() ---------- */
        this.openSearch = function () {
            DebugModule.log('Catalog', 'Открытие клавиатуры поиска');

            // Lampa предоставляет встроенную клавиатуру для TV
            Lampa.Input.edit({
                title: 'Поиск фильмов',
                value: _query,
                free: true,
                nosave: true
            }, function (newValue) {
                if (newValue) {
                    DebugModule.log('Catalog', 'Поисковый запрос: ' + newValue);
                    _self.doSearch(newValue);
                }
            });
        };


        /* ---------- loadMore() ---------- */
        this.loadMore = function () {
            _page++;
            DebugModule.log('Catalog', 'Подгрузка страницы: ' + _page);

            if (_mode === 'catalog') {
                this.loadCatalog(_page);
            } else if (_mode === 'category') {
                this.loadByCategory(_categorySlug, _page);
            }
        };


        /* ---------- renderCards() ---------- */
        this.renderCards = function (items) {
            var grid = $('#zonafilm-grid');

            items.forEach(function (item) {
                // Определяем цвет рейтинга
                var ratingClass = '';
                if (item.rating >= 7) ratingClass = 'zonafilm-card__rating--good';
                else if (item.rating >= 5) ratingClass = 'zonafilm-card__rating--avg';
                else if (item.rating > 0) ratingClass = 'zonafilm-card__rating--bad';

                // Качество
                var qualityBadge = '';
                if (item.quality) {
                    var qlabel = item.quality.toUpperCase();
                    if (qlabel === 'LQ') qlabel = 'CAM';
                    qualityBadge = '<div class="zonafilm-card__quality">' + qlabel + '</div>';
                }

                var card = $(
                    '<div class="zonafilm-card selector" data-slug="' + (item.slug || '') + '">' +
                        '<div class="zonafilm-card__poster">' +
                            (item.poster
                                ? '<img src="' + item.poster + '" alt="' + item.title + '" loading="lazy" />'
                                : '<div class="zonafilm-card__poster-placeholder">🎬</div>'
                            ) +
                            (item.rating > 0
                                ? '<div class="zonafilm-card__rating ' + ratingClass + '">' + item.rating.toFixed(1) + '</div>'
                                : ''
                            ) +
                            qualityBadge +
                        '</div>' +
                        '<div class="zonafilm-card__title">' + item.title + '</div>' +
                        '<div class="zonafilm-card__year">' + (item.year || '') + '</div>' +
                    '</div>'
                );

                // Клик по карточке — открыть детали
                card.on('hover:enter', function () {
                    DebugModule.log('Catalog', 'Открытие: ' + item.title + ' [' + item.slug + ']');
                    _self.openDetails(item.slug, item.title);
                });

                // Фокус — подсветка
                card.on('hover:focus', function () {
                    _scroll.update($(this));
                });

                grid.append(card);
            });
        };


        /* ---------- openDetails() ---------- */
        this.openDetails = function (slug, title) {
            DebugModule.log('Catalog', 'Переход на детали: ' + slug);

            Lampa.Activity.push({
                url: slug,
                title: title || 'Фильм',
                component: 'zonafilm_detail',
                slug: slug,
                page: 1
            });
        };


        /* ---------- showLoader() ---------- */
        this.showLoader = function (show) {
            if (show) {
                $('#zonafilm-loader').show();
            } else {
                $('#zonafilm-loader').hide();
            }
        };


        /* ---------- updateLoadMore() ---------- */
        this.updateLoadMore = function () {
            if (_hasMore && _mode !== 'search') {
                $('#zonafilm-loadmore').show();
            } else {
                $('#zonafilm-loadmore').hide();
            }
        };


        /* ---------- showEmpty() ---------- */
        this.showEmpty = function (text) {
            var grid = $('#zonafilm-grid');
            grid.append(
                '<div class="zonafilm-empty">' +
                    '<div class="zonafilm-empty__icon">📭</div>' +
                    '<div>' + (text || 'Нет данных') + '</div>' +
                '</div>'
            );
        };


        /* ---------- showError() ---------- */
        this.showError = function (text) {
            _loading = false;
            this.showLoader(false);
            var grid = $('#zonafilm-grid');
            grid.append(
                '<div class="zonafilm-empty">' +
                    '<div class="zonafilm-empty__icon">⚠️</div>' +
                    '<div style="color:#EF5350;">' + text + '</div>' +
                '</div>'
            );
        };


        /* ---------- activateNavigation() ---------- */
        this.activateNavigation = function () {
            // Все элементы .selector в нашем контенте — фокусируемые
            Lampa.Controller.add('content', {
                toggle: [],
                type: 'default',
                link: _self,
                target: 'zonafilm-catalog'
            });
            Lampa.Controller.toggle('content');
            if (_scroll) _scroll.toggle();
        };


        /* ---------- Стандартные методы Lampa-компонента ---------- */

        this.start = function () {
            DebugModule.log('Catalog', 'start()');
            this.activateNavigation();
        };

        this.pause = function () {
            DebugModule.log('Catalog', 'pause()');
        };

        this.stop = function () {
            DebugModule.log('Catalog', 'stop()');
        };

        this.render = function () {
            return _scroll ? _scroll.render() : $('<div></div>');
        };

        this.destroy = function () {
            DebugModule.log('Catalog', 'destroy()');
            if (_scroll) _scroll.destroy();
            _scroll = null;
            _content = null;
        };
    }


    /* ==========================================================
     *  БЛОК 9: КОМПОНЕНТ ДЕТАЛЕЙ ФИЛЬМА
     *  ---------------------------------------------------------
     *  Показывает подробную информацию о фильме:
     *    - Большой постер + бэкдроп
     *    - Название, год, рейтинги
     *    - Жанры, страны
     *    - Описание
     *    - Актёры
     *    - Кнопка «Смотреть»
     * ========================================================== */

    function DetailComponent(object) {
        var _self   = this;
        var _scroll = null;
        var _content = null;
        var _slug   = object.slug || '';
        var _movie  = null;

        DebugModule.log('Detail', 'Создание, slug: ' + _slug);

        /* ---------- create() ---------- */
        this.create = function () {
            DebugModule.log('Detail', 'create()');

            _scroll = new Lampa.Scroll({ mask: true, over: true });
            _content = $('<div class="zonafilm-detail"></div>');

            // Индикатор загрузки
            _content.append(
                '<div class="zonafilm-loading" id="zonafilm-detail-loader">' +
                    '<div class="zonafilm-loading__spinner"></div>' +
                    '<span>Загрузка информации...</span>' +
                '</div>'
            );

            _scroll.append(_content);

            // Загружаем данные
            this.loadMovie(_slug);
        };


        /* ---------- loadMovie() ---------- */
        this.loadMovie = function (slug) {
            var source = SourceManager.getActive();
            if (!source) return;

            source.getDetails(slug, function (movie) {
                $('#zonafilm-detail-loader').remove();

                if (!movie) {
                    _content.append(
                        '<div class="zonafilm-empty">' +
                            '<div class="zonafilm-empty__icon">⚠️</div>' +
                            '<div>Не удалось загрузить информацию о фильме</div>' +
                        '</div>'
                    );
                    return;
                }

                _movie = movie;
                _self.renderMovie(movie);
                _self.activateNavigation();
            });
        };


        /* ---------- renderMovie() ---------- */
        this.renderMovie = function (m) {
            DebugModule.log('Detail', 'Рендер: ' + m.title);

            // --- Бэкдроп (фоновое изображение) ---
            if (m.backdrop) {
                var backdropEl = $(
                    '<div style="position:relative; width:100%; height:20em; overflow:hidden; ' +
                    'border-radius: 0.5em; margin-bottom: 1.5em;">' +
                        '<img src="' + m.backdrop + '" style="width:100%; height:100%; object-fit:cover; ' +
                        'filter: brightness(0.5);" />' +
                        '<div style="position:absolute; bottom:0; left:0; right:0; ' +
                        'background: linear-gradient(transparent, #0a0a1a); height: 50%;"></div>' +
                    '</div>'
                );
                _content.append(backdropEl);
            }

            // --- Шапка: постер + информация ---
            var header = $('<div class="zonafilm-detail__header"></div>');

            // Постер
            var posterHTML = m.poster
                ? '<img src="' + m.poster + '" alt="' + m.title + '" />'
                : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#444;font-size:4em;">🎬</div>';
            header.append('<div class="zonafilm-detail__poster">' + posterHTML + '</div>');

            // Информация справа от постера
            var info = $('<div class="zonafilm-detail__info"></div>');

            // Название
            info.append('<div class="zonafilm-detail__title">' + m.title + '</div>');

            // Оригинальное название
            if (m.originalTitle) {
                info.append('<div class="zonafilm-detail__orig-title">' + m.originalTitle + '</div>');
            }

            // Мета-теги (год, длительность, возраст)
            var metaHTML = '<div class="zonafilm-detail__meta">';
            if (m.year) metaHTML += '<span class="zonafilm-detail__tag">' + m.year + '</span>';
            if (m.duration) metaHTML += '<span class="zonafilm-detail__tag">' + m.duration + ' мин.</span>';
            if (m.ageLimit) metaHTML += '<span class="zonafilm-detail__tag">' + m.ageLimit + '+</span>';
            if (m.quality) {
                var ql = m.quality.toUpperCase();
                if (ql === 'LQ') ql = 'CAM';
                metaHTML += '<span class="zonafilm-detail__tag" style="background:#E65100;color:#fff;">' + ql + '</span>';
            }
            metaHTML += '</div>';
            info.append(metaHTML);

            // Жанры
            if (m.genres.length) {
                var genresHTML = '<div class="zonafilm-detail__meta">';
                m.genres.forEach(function (g) {
                    genresHTML += '<span class="zonafilm-detail__tag zonafilm-detail__tag--genre">' + g + '</span>';
                });
                genresHTML += '</div>';
                info.append(genresHTML);
            }

            // Страны
            if (m.countries.length) {
                var countriesHTML = '<div style="color:#888; font-size:0.9em; margin-bottom:0.5em;">';
                countriesHTML += '🌍 ' + m.countries.join(', ');
                countriesHTML += '</div>';
                info.append(countriesHTML);
            }

            // Рейтинги
            var ratingsHTML = '<div class="zonafilm-detail__rating-box">';
            if (m.rating > 0) {
                var rColor = m.rating >= 7 ? '#66BB6A' : (m.rating >= 5 ? '#FFA726' : '#EF5350');
                ratingsHTML += '<div class="zonafilm-detail__rating-item">' +
                    '<div class="zonafilm-detail__rating-value" style="color:' + rColor + ';">' + m.rating.toFixed(1) + '</div>' +
                    '<div class="zonafilm-detail__rating-label">Рейтинг</div></div>';
            }
            if (m.ratingKP > 0) {
                ratingsHTML += '<div class="zonafilm-detail__rating-item">' +
                    '<div class="zonafilm-detail__rating-value" style="color:#FF6F00;">' + m.ratingKP.toFixed(1) + '</div>' +
                    '<div class="zonafilm-detail__rating-label">КиноПоиск</div></div>';
            }
            if (m.ratingIMDB > 0) {
                ratingsHTML += '<div class="zonafilm-detail__rating-item">' +
                    '<div class="zonafilm-detail__rating-value" style="color:#F5C518;">' + m.ratingIMDB.toFixed(1) + '</div>' +
                    '<div class="zonafilm-detail__rating-label">IMDb</div></div>';
            }
            ratingsHTML += '</div>';
            info.append(ratingsHTML);

            // Режиссёр, сценарист
            if (m.directors) {
                info.append('<div style="color:#aaa; font-size:0.85em;">🎬 Режиссёр: ' + m.directors + '</div>');
            }
            if (m.writers) {
                info.append('<div style="color:#aaa; font-size:0.85em;">✍️ Сценарий: ' + m.writers + '</div>');
            }

            header.append(info);
            _content.append(header);

            // --- Кнопка СМОТРЕТЬ ---
            var playBtn = $(
                '<div class="zonafilm-detail__play-btn selector" style="margin-bottom:1.5em;">' +
                    '▶ Смотреть' +
                '</div>'
            );
            playBtn.on('hover:enter', function () {
                _self.playMovie(m);
            });
            _content.append(playBtn);

            // --- Описание ---
            if (m.description) {
                _content.append(
                    '<div style="margin-bottom:1.5em;">' +
                        '<div class="zonafilm-section-title">Описание</div>' +
                        '<div class="zonafilm-detail__description">' + m.description + '</div>' +
                    '</div>'
                );
            }

            // --- Актёры ---
            if (m.actors && m.actors.length) {
                var actorsSection = $(
                    '<div style="margin-bottom:1.5em;">' +
                        '<div class="zonafilm-section-title">Актёры</div>' +
                        '<div class="zonafilm-grid" id="zonafilm-actors"></div>' +
                    '</div>'
                );

                m.actors.forEach(function (actor) {
                    var actorCard = $(
                        '<div style="text-align:center; width:7em;">' +
                            '<div style="width:5em; height:5em; border-radius:50%; overflow:hidden; ' +
                            'margin:0 auto 0.3em; background:#222;">' +
                                (actor.photo
                                    ? '<img src="' + actor.photo + '" style="width:100%;height:100%;object-fit:cover;" />'
                                    : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#444;">👤</div>'
                                ) +
                            '</div>' +
                            '<div style="color:#ccc; font-size:0.75em; overflow:hidden; ' +
                            'text-overflow:ellipsis; white-space:nowrap;">' + actor.name + '</div>' +
                        '</div>'
                    );
                    actorsSection.find('#zonafilm-actors').append(actorCard);
                });

                _content.append(actorsSection);
            }
        };


        /* ---------- playMovie() ---------- */
        this.playMovie = function (movie) {
            DebugModule.log('Detail', 'Воспроизведение: ' + movie.title);
            DebugModule.notify('Загрузка видео...');

            var source = SourceManager.getActive();

            source.getStream(movie.slug, function (videoUrl) {
                if (videoUrl) {
                    DebugModule.log('Detail', 'Видео URL: ' + videoUrl);

                    // Проверяем — это прямая ссылка или iframe?
                    if (videoUrl.match(/\.(mp4|m3u8|webm)/i)) {
                        // Прямая ссылка — запускаем встроенный плеер Lampa
                        Lampa.Player.play({
                            title: movie.title,
                            url: videoUrl,
                            subtitles: []
                        });

                        Lampa.Player.playlist([{
                            title: movie.title,
                            url: videoUrl
                        }]);
                    } else {
                        // Iframe или другой формат — открываем в webview
                        DebugModule.log('Detail', 'Открытие в webview: ' + videoUrl);

                        // Пробуем через встроенный плеер как iframe
                        if (typeof Lampa.Iframe !== 'undefined') {
                            Lampa.Iframe.show(videoUrl);
                        } else {
                            // Fallback: открываем в браузере
                            Lampa.Noty.show('🔗 Открытие видео: ' + videoUrl);
                            window.open(videoUrl, '_blank');
                        }
                    }
                } else {
                    DebugModule.error('Detail', 'Видео не найдено');
                    Lampa.Noty.show('⚠️ Видео не найдено. Попробуйте другой источник.');

                    // Fallback: открываем embed-страницу напрямую
                    var embedUrl = movie.embedUrl || (SourceManager.getActive().baseUrl + '/movies/embed/' + movie.slug);
                    _self.openEmbed(embedUrl, movie.title);
                }
            });
        };


        /* ---------- openEmbed() ---------- */
        this.openEmbed = function (url, title) {
            DebugModule.log('Detail', 'Открытие embed: ' + url);

            // Пытаемся открыть embed через webview/iframe
            try {
                // Метод 1: Lampa встроенный webview
                if (Lampa.Platform && Lampa.Platform.is('android')) {
                    // На Android можно использовать интент
                    Lampa.Android.openUrl(url);
                } else {
                    // Метод 2: iframe overlay
                    var overlay = $(
                        '<div style="position:fixed; top:0; left:0; right:0; bottom:0; ' +
                        'z-index:9999; background:#000;">' +
                            '<iframe src="' + url + '" style="width:100%; height:100%; border:none;" ' +
                            'allowfullscreen></iframe>' +
                            '<div class="selector" style="position:absolute; top:1em; right:1em; ' +
                            'background:rgba(0,0,0,0.7); color:white; padding:0.5em 1em; ' +
                            'border-radius:0.5em; cursor:pointer; z-index:10000;">✕ Закрыть</div>' +
                        '</div>'
                    );

                    overlay.find('.selector').on('hover:enter click', function () {
                        overlay.remove();
                    });

                    $('body').append(overlay);
                }
            } catch (e) {
                DebugModule.error('Detail', 'Ошибка открытия embed: ' + e.message);
                Lampa.Noty.show('Не удалось открыть видео');
            }
        };


        /* ---------- Стандартные методы ---------- */

        this.activateNavigation = function () {
            Lampa.Controller.add('content', {
                toggle: [],
                type: 'default',
                link: _self,
                target: 'zonafilm-detail'
            });
            Lampa.Controller.toggle('content');
            if (_scroll) _scroll.toggle();
        };

        this.start = function () {
            this.activateNavigation();
        };

        this.pause = function () { };
        this.stop = function () { };

        this.render = function () {
            return _scroll ? _scroll.render() : $('<div></div>');
        };

        this.destroy = function () {
            if (_scroll) _scroll.destroy();
            _scroll = null;
            _content = null;
        };
    }


    /* ==========================================================
     *  БЛОК 10: РЕГИСТРАЦИЯ КОМПОНЕНТОВ В LAMPA
     * ========================================================== */

    Lampa.Component.add('zonafilm_catalog', CatalogComponent);
    Lampa.Component.add('zonafilm_detail', DetailComponent);

    DebugModule.log('Init', 'Компоненты зарегистрированы: zonafilm_catalog, zonafilm_detail');


    /* ==========================================================
     *  БЛОК 11: КНОПКА В БОКОВОМ МЕНЮ
     * ========================================================== */

    var menuIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">' +
        '<path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>' +
        '</svg>';

    function addMenuButton() {
        DebugModule.log('Menu', 'Добавление кнопки...');

        var menuItem = $(
            '<li class="menu__item selector" data-action="zonafilm">' +
                '<div class="menu__ico">' + menuIcon + '</div>' +
                '<div class="menu__text">ZonaFilm</div>' +
            '</li>'
        );

        menuItem.on('hover:enter', function () {
            DebugModule.log('Menu', '→ Открываем каталог');

            Lampa.Activity.push({
                url: '',
                title: 'ZonaFilm',
                component: 'zonafilm_catalog',
                page: 1
            });
        });

        // Вставляем в меню
        var menuList = $('.menu .menu__list');
        if (menuList.length) {
            // Вставляем после "Настройки" или в конец
            var settingsItem = menuList.find('[data-action="settings"]');
            if (settingsItem.length) {
                settingsItem.after(menuItem);
            } else {
                menuList.eq(0).append(menuItem);
            }
            DebugModule.log('Menu', '✅ Кнопка добавлена');
        } else {
            DebugModule.error('Menu', '❌ Меню не найдено, повтор через 2с...');
            setTimeout(addMenuButton, 2000);
        }
    }


    /* ==========================================================
     *  БЛОК 12: ИНИЦИАЛИЗАЦИЯ
     * ========================================================== */

    function initPlugin() {
        DebugModule.log('Init', '🚀 Инициализация плагина');
        addMenuButton();
        DebugModule.notify('🎬 ZonaFilm v' + CONFIG.version + ' загружен!');
    }

    // Ждём готовности Lampa
    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                initPlugin();
            }
        });
    }

    DebugModule.log('Init', '✅ Скрипт загружен, ожидание app:ready...');

})();
