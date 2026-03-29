/**
 * ============================================================
 *  LAMPA PLUGIN — ZonaFilm (и другие источники)
 *  Версия: 0.1.0 (Этап 1 — Каркас и меню)
 * ============================================================
 *  
 *  Описание:
 *    Плагин для Lampa (Android TV) — парсинг видео-сайтов,
 *    вывод постеров, поиск, категории, воспроизведение.
 *  
 *  Архитектура:
 *    - SourceManager  — менеджер источников (сайтов)
 *    - Source          — базовый класс источника
 *    - ZonaFilmSource  — конкретный источник (zonafilm.ru)
 *    - PluginUI        — интерфейс (компонент Lampa)
 *    - DebugModule     — отладка и логирование
 *  
 *  Подключение в Lampa:
 *    Настройки → Дополнения → URL плагина:
 *    https://ваш-username.github.io/lampa-plugin/zonafilm.js
 * ============================================================
 */

(function () {
    'use strict';

    /* ==========================================================
     *  БЛОК 1: ОТЛАДОЧНЫЙ МОДУЛЬ (DebugModule)
     *  ---------------------------------------------------------
     *  Логирование, замер времени, вывод в консоль и на экран.
     *  Включается/выключается флагом DEBUG_ENABLED.
     * ========================================================== */

    var DEBUG_ENABLED = true;  // <-- ставьте false для продакшена
    var PLUGIN_NAME   = 'ZonaFilm';

    var DebugModule = {
        /**
         * Лог в консоль с префиксом плагина
         * @param {string} tag   - блок/функция
         * @param {*}      msg   - сообщение или объект
         */
        log: function (tag, msg) {
            if (!DEBUG_ENABLED) return;
            console.log('[' + PLUGIN_NAME + '][' + tag + ']', msg);
        },

        /**
         * Ошибка в консоль
         */
        error: function (tag, msg) {
            console.error('[' + PLUGIN_NAME + '][ERROR][' + tag + ']', msg);
        },

        /**
         * Замер времени выполнения
         */
        timeStart: function (label) {
            if (!DEBUG_ENABLED) return;
            console.time('[' + PLUGIN_NAME + '] ' + label);
        },

        timeEnd: function (label) {
            if (!DEBUG_ENABLED) return;
            console.timeEnd('[' + PLUGIN_NAME + '] ' + label);
        },

        /**
         * Показать уведомление на экране Lampa (Notify)
         * @param {string} text - текст уведомления
         */
        notify: function (text) {
            if (!DEBUG_ENABLED) return;
            if (typeof Lampa !== 'undefined' && Lampa.Noty) {
                Lampa.Noty.show(text);
            }
        }
    };

    DebugModule.log('Init', 'Плагин начинает загрузку...');


    /* ==========================================================
     *  БЛОК 2: МЕНЕДЖЕР ИСТОЧНИКОВ (SourceManager)
     *  ---------------------------------------------------------
     *  Реестр всех доступных источников (сайтов).
     *  Позволяет легко добавлять новые источники:
     *    SourceManager.register('имя', объект_источника);
     * ========================================================== */

    var SourceManager = {
        /** @type {Object.<string, object>} Словарь источников */
        _sources: {},

        /** Текущий активный источник */
        _active: null,

        /**
         * Зарегистрировать новый источник
         * @param {string} name   - уникальное имя ('zonafilm', 'hdrezka' ...)
         * @param {object} source - объект с методами: search, categories, getStream ...
         */
        register: function (name, source) {
            this._sources[name] = source;
            DebugModule.log('SourceManager', 'Зарегистрирован источник: ' + name);
        },

        /**
         * Получить источник по имени
         * @param {string} name
         * @returns {object|null}
         */
        get: function (name) {
            return this._sources[name] || null;
        },

        /**
         * Установить активный источник
         * @param {string} name
         */
        setActive: function (name) {
            if (this._sources[name]) {
                this._active = name;
                DebugModule.log('SourceManager', 'Активный источник: ' + name);
            } else {
                DebugModule.error('SourceManager', 'Источник не найден: ' + name);
            }
        },

        /**
         * Получить активный источник
         * @returns {object|null}
         */
        getActive: function () {
            return this._sources[this._active] || null;
        },

        /**
         * Список всех зарегистрированных имён
         * @returns {string[]}
         */
        list: function () {
            return Object.keys(this._sources);
        }
    };


    /* ==========================================================
     *  БЛОК 3: ИСТОЧНИК — ZONAFILM (ZonaFilmSource)
     *  ---------------------------------------------------------
     *  Парсинг сайта https://zonafilm.ru/
     *  
     *  ЗАГЛУШКИ (будут реализованы на следующих этапах):
     *    - main()        — главная страница (постеры)
     *    - search(query) — поиск
     *    - categories()  — категории
     *    - getDetails(url) — страница фильма
     *    - getStream(url)  — получение видео-потока
     *  
     *  ⚠ На данном этапе все методы возвращают тестовые данные.
     * ========================================================== */

    var ZonaFilmSource = {
        /** Имя источника */
        name: 'ZonaFilm',

        /** Базовый URL сайта */
        baseUrl: 'https://zonafilm.ru',

        /** 
         * Домашняя / главная — список фильмов
         * @param {function} callback - callback(items) где items — массив карточек
         */
        main: function (callback) {
            DebugModule.log('ZonaFilm.main', 'Загрузка главной страницы (заглушка)...');

            // --- ЭТАП 1: тестовые данные-заглушки ---
            var testItems = [
                {
                    title: 'Тестовый фильм 1',
                    poster: '',  // URL постера (пока пусто)
                    url: '/film/test-1',
                    year: '2024'
                },
                {
                    title: 'Тестовый фильм 2',
                    poster: '',
                    url: '/film/test-2',
                    year: '2023'
                },
                {
                    title: 'Тестовый фильм 3',
                    poster: '',
                    url: '/film/test-3',
                    year: '2025'
                }
            ];

            // Имитация задержки сети
            setTimeout(function () {
                DebugModule.log('ZonaFilm.main', 'Получено элементов: ' + testItems.length);
                callback(testItems);
            }, 300);
        },

        /**
         * Поиск (заглушка — будет на этапе 4)
         * @param {string}   query
         * @param {function} callback
         */
        search: function (query, callback) {
            DebugModule.log('ZonaFilm.search', 'Поиск: ' + query + ' (заглушка)');
            callback([]);
        },

        /**
         * Категории (заглушка — будет на этапе 6)
         * @param {function} callback
         */
        categories: function (callback) {
            DebugModule.log('ZonaFilm.categories', 'Загрузка категорий (заглушка)');
            callback([]);
        },

        /**
         * Детали фильма (заглушка — будет на этапе 3)
         * @param {string}   url
         * @param {function} callback
         */
        getDetails: function (url, callback) {
            DebugModule.log('ZonaFilm.getDetails', 'URL: ' + url + ' (заглушка)');
            callback({});
        },

        /**
         * Получить видеопоток (заглушка — будет на этапе 5)
         * @param {string}   url
         * @param {function} callback
         */
        getStream: function (url, callback) {
            DebugModule.log('ZonaFilm.getStream', 'URL: ' + url + ' (заглушка)');
            callback('');
        }
    };

    // Регистрируем источник
    SourceManager.register('zonafilm', ZonaFilmSource);
    SourceManager.setActive('zonafilm');


    /* ==========================================================
     *  БЛОК 4: КОМПОНЕНТ ИНТЕРФЕЙСА (PluginComponent)
     *  ---------------------------------------------------------
     *  Lampa использует свои «компоненты» для отрисовки экранов.
     *  Компонент должен реализовать методы:
     *    - create()    — создать DOM
     *    - start()     — вызывается при открытии
     *    - pause()     — при уходе с экрана
     *    - stop()      — при закрытии
     *    - render()    — вернуть корневой DOM-элемент
     *    - destroy()   — очистка
     * ========================================================== */

    /**
     * Фабрика компонента Lampa
     * @param {object} object — параметры, переданные при activity.push
     */
    function PluginComponent(object) {
        /* ---- Приватные переменные ---- */
        var _self     = this;     // ссылка на экземпляр
        var _scroll   = null;     // Lampa Scroll (прокрутка)
        var _content  = null;     // jQuery-элемент контента
        var _loading  = false;    // флаг загрузки

        DebugModule.log('Component', 'Создание компонента, параметры:', object);

        /* ------------------------------------------------
         *  create() — Инициализация DOM-структуры
         * ------------------------------------------------ */
        this.create = function () {
            DebugModule.log('Component', 'create()');

            // --- Создаём обёртку с прокруткой ---
            // Lampa.Scroll — стандартная прокрутка для ТВ-навигации
            _scroll = new Lampa.Scroll({
                mask: true,        // маска затухания по краям
                over: true         // разрешить выход за пределы
            });

            // --- Корневой контейнер контента ---
            _content = $('<div class="zonafilm-plugin-content"></div>');

            // --- Заголовок ---
            var header = $(
                '<div class="zonafilm-header" style="padding: 1.5em; color: white; font-size: 1.5em;">' +
                    '🎬 ZonaFilm — Плагин загружен!' +
                '</div>'
            );
            _content.append(header);

            // --- Информация об источнике ---
            var source = SourceManager.getActive();
            var info = $(
                '<div class="zonafilm-info" style="padding: 0 1.5em; color: #aaa; font-size: 1em;">' +
                    'Активный источник: ' + (source ? source.name : 'не выбран') + '<br>' +
                    'Базовый URL: ' + (source ? source.baseUrl : '—') + '<br>' +
                    'Зарегистрированные источники: ' + SourceManager.list().join(', ') +
                '</div>'
            );
            _content.append(info);

            // --- Тестовый список фильмов (заглушки) ---
            var listContainer = $(
                '<div class="zonafilm-list" style="padding: 1.5em;">' +
                    '<div style="color: #fff; font-size: 1.2em; margin-bottom: 0.5em;">Каталог:</div>' +
                '</div>'
            );
            _content.append(listContainer);

            // Загружаем данные из активного источника
            if (source) {
                source.main(function (items) {
                    DebugModule.log('Component', 'Отрисовка элементов: ' + items.length);

                    items.forEach(function (item, index) {
                        var card = $(
                            '<div class="zonafilm-card selector" ' +
                            'style="display: inline-block; width: 12em; margin: 0.5em; ' +
                            'vertical-align: top; text-align: center;" ' +
                            'data-url="' + item.url + '">' +
                                '<div style="width: 100%; height: 16em; background: #333; ' +
                                'border-radius: 0.5em; display: flex; align-items: center; ' +
                                'justify-content: center; color: #666; font-size: 3em;">🎬</div>' +
                                '<div style="color: #fff; margin-top: 0.3em; font-size: 0.9em;">' +
                                    item.title +
                                '</div>' +
                                '<div style="color: #666; font-size: 0.8em;">' +
                                    (item.year || '') +
                                '</div>' +
                            '</div>'
                        );

                        // --- Обработка нажатия Enter на карточке ---
                        card.on('hover:enter', function () {
                            DebugModule.log('Component', 'Выбран: ' + item.title + ' (' + item.url + ')');
                            DebugModule.notify('Выбрано: ' + item.title);

                            // TODO (этап 3+): открытие страницы деталей фильма
                            Lampa.Noty.show('🎬 ' + item.title + ' — детали будут на следующем этапе');
                        });

                        listContainer.append(card);
                    });

                    // --- Активировать навигацию после отрисовки ---
                    // Lampa.Controller — управление фокусом для пульта ТВ
                    _self.activateNavigation();
                });
            }

            // Вставляем контент в скролл
            _scroll.append(_content);
        };


        /* ------------------------------------------------
         *  start() — Вызывается при открытии экрана
         * ------------------------------------------------ */
        this.start = function () {
            DebugModule.log('Component', 'start()');

            // Активируем навигацию по элементам
            this.activateNavigation();
        };


        /* ------------------------------------------------
         *  activateNavigation() — Настройка контроллера ТВ
         * ------------------------------------------------
         *  Lampa.Controller управляет фокусом (D-pad пульта):
         *  вверх/вниз/влево/вправо/enter/back
         * ------------------------------------------------ */
        this.activateNavigation = function () {
            DebugModule.log('Component', 'activateNavigation()');

            // Создаём «toggler» — набор правил навигации
            Lampa.Controller.add('content', {
                toggle: [],
                type: 'default',
                link: this,

                // Все элементы с классом .selector — фокусируемые
                target: 'zonafilm-plugin-content',
            });

            // Активируем контроллер и ставим фокус
            Lampa.Controller.toggle('content');

            // Прокрутка следует за фокусом
            _scroll.toggle();
        };


        /* ------------------------------------------------
         *  pause() — При уходе с экрана (не закрытие)
         * ------------------------------------------------ */
        this.pause = function () {
            DebugModule.log('Component', 'pause()');
        };


        /* ------------------------------------------------
         *  stop() — При закрытии экрана
         * ------------------------------------------------ */
        this.stop = function () {
            DebugModule.log('Component', 'stop()');
        };


        /* ------------------------------------------------
         *  render() — Вернуть DOM для вставки в Lampa
         * ------------------------------------------------ */
        this.render = function () {
            return _scroll ? _scroll.render() : $('<div></div>');
        };


        /* ------------------------------------------------
         *  destroy() — Полная очистка при уничтожении
         * ------------------------------------------------ */
        this.destroy = function () {
            DebugModule.log('Component', 'destroy()');

            if (_scroll) _scroll.destroy();
            _scroll  = null;
            _content = null;
        };
    }


    /* ==========================================================
     *  БЛОК 5: РЕГИСТРАЦИЯ КОМПОНЕНТА В LAMPA
     *  ---------------------------------------------------------
     *  Lampa.Component.add — регистрирует наш компонент, чтобы
     *  его можно было вызвать через Lampa.Activity
     * ========================================================== */

    Lampa.Component.add('zonafilm_plugin', PluginComponent);

    DebugModule.log('Init', 'Компонент "zonafilm_plugin" зарегистрирован');


    /* ==========================================================
     *  БЛОК 6: ДОБАВЛЕНИЕ ПУНКТА В БОКОВОЕ МЕНЮ
     *  ---------------------------------------------------------
     *  Lampa.Menu — боковое меню приложения.
     *  Мы добавляем свою кнопку, при нажатии которой открывается
     *  наш компонент через Lampa.Activity.push()
     * ========================================================== */

    /**
     * Иконка для меню (SVG)
     * Простая иконка «плёнка» — можно заменить на любую
     */
    var menuIcon = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">',
        '  <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z',
        '          M8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2z',
        '          m0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>',
        '</svg>'
    ].join('');

    /**
     * Добавляем кнопку в меню
     * Ждём, пока Lampa полностью инициализируется
     */
    function addMenuButton() {
        DebugModule.log('Menu', 'Добавление кнопки в боковое меню...');

        // --- Создаём пункт меню ---
        var menuItem = $(
            '<li class="menu__item selector" data-action="zonafilm_plugin">' +
                '<div class="menu__ico">' + menuIcon + '</div>' +
                '<div class="menu__text">ZonaFilm</div>' +
            '</li>'
        );

        // --- Обработка нажатия ---
        menuItem.on('hover:enter', function () {
            DebugModule.log('Menu', 'Нажата кнопка ZonaFilm в меню');

            // Открываем наш компонент через Activity
            Lampa.Activity.push({
                url: '',                          // URL (не используется напрямую)
                title: 'ZonaFilm',                // Заголовок экрана
                component: 'zonafilm_plugin',     // Имя нашего компонента
                page: 1                           // Для будущей пагинации
            });
        });

        // --- Вставляем в меню ---
        // Ищем контейнер бокового меню и добавляем перед последним элементом
        var menuList = $('.menu .menu__list');

        if (menuList.length) {
            menuList.eq(0).append(menuItem);
            DebugModule.log('Menu', '✅ Кнопка добавлена в меню');
        } else {
            DebugModule.error('Menu', '❌ Контейнер меню не найден!');
        }
    }


    /* ==========================================================
     *  БЛОК 7: ТОЧКА ВХОДА — ИНИЦИАЛИЗАЦИЯ ПЛАГИНА
     *  ---------------------------------------------------------
     *  Ждём события готовности Lampa, затем добавляем меню.
     * ========================================================== */

    // Lampa вызывает 'ready' когда интерфейс полностью загружен
    if (window.appready) {
        // Lampa уже загружена — добавляем сразу
        DebugModule.log('Init', 'Lampa уже готова, добавляем меню');
        addMenuButton();
    } else {
        // Ждём событие готовности
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                DebugModule.log('Init', 'Событие app:ready — добавляем меню');
                addMenuButton();
            }
        });
    }

    DebugModule.log('Init', '✅ Плагин ZonaFilm v0.1.0 загружен полностью');
    DebugModule.notify('Плагин ZonaFilm загружен!');

})();
