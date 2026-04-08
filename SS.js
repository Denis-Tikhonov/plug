(function () {
    'use strict';

     var PLUGIN_VERSION = '1.2.0';
    var PLUGIN_ID = 'adult_plugin';
    // ✅ ИСПРАВЛЕНО: Прямая ссылка на menu.json (raw GitHub)
    var MENU_URL = 'https://denis-tikhonov.github.io/lampa-plugin/menu.json';
    var PARSERS_URL = 'https://denis-tikhonov.github.io/lampa-plugin/';

    // =============================================================
    // [1] СИСТЕМА ЛОГИРОВАНИЯ
    // =============================================================
    var Logger = {
        levels: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
        currentLevel: Lampa.Storage.field('adult_debug_mode') ? 0 : 1,
        
        log: function(level, component, msg, data) {
            if (level < this.currentLevel) return;
            var timestamp = new Date().toLocaleTimeString();
            var levelStr = Object.keys(this.levels).find(k => this.levels[k] === level);
            console.log(`[${timestamp}] [AdultJS] [${component}] ${levelStr}: ${msg}`, data || '');
            
            if (level >= 2) { // Сохраняем только WARN и ERROR для экономии памяти
                var logs = Lampa.Storage.get('adult_debug_logs', []);
                logs.push({ t: timestamp, c: component, l: levelStr, m: msg });
                Lampa.Storage.set('adult_debug_logs', logs.slice(-50));
            }
        },
        debug: function(c, m, d) { this.log(0, c, m, d); },
        info: function(c, m, d) { this.log(1, c, m, d); },
        warn: function(c, m, d) { this.log(2, c, m, d); },
        error: function(c, m, d) { this.log(3, c, m, d); }
    };

    // =============================================================
    // [2] УМНЫЙ КЭШ
    // =============================================================
    var SmartCache = {
        _data: {},
        set: function(key, value, ttl_ms) {
            this._data[key] = { v: value, e: Date.now() + (ttl_ms || 3600000) };
        },
        get: function(key) {
            var item = this._data[key];
            if (!item) return null;
            if (Date.now() > item.e) { delete this._data[key]; return null; }
            return item.v;
        },
        clear: function() { this._data = {}; }
    };

    // =============================================================
    // [3] СЕТЕВЫЕ УТИЛИТЫ (CORS & PROXY)
    // =============================================================
    var Http = {
        proxies: [
            '', // Напрямую
            'https://cors-anywhere.herokuapp.com/',
            'https://api.allorigins.win/raw?url='
        ],
        fetch: function(url, success, error, attempt) {
            attempt = attempt || 0;
            var _this = this;
            var proxyMode = Lampa.Storage.field('adult_proxy_mode') || 'auto';
            
            var finalUrl = url;
            if (proxyMode === 'always' || (proxyMode === 'auto' && attempt > 0)) {
                var p = this.proxies[attempt % this.proxies.length];
                finalUrl = p ? p + encodeURIComponent(url) : url;
            }

            Logger.debug('Http', 'Fetching: ' + finalUrl);

            var network = new Lampa.Reguest();
            network.silent(finalUrl, function(str) {
                if (str && str.length > 100) success(str);
                else _this.retry(url, success, error, attempt);
            }, function() {
                _this.retry(url, success, error, attempt);
            }, false, { dataType: 'text', timeout: 15000 });
        },
        retry: function(url, success, error, attempt) {
            if (attempt < 2) this.fetch(url, success, error, attempt + 1);
            else {
                Logger.error('Http', 'Failed to load: ' + url);
                error('Network error');
            }
        }
    };

    // =============================================================
    // [4] РЕЕСТР ПАРСЕРОВ
    // =============================================================
    window.AdultPlugin = {
        parsers: {},
        registerParser: function(name, obj) {
            this.parsers[name] = obj;
            Logger.info('Registry', 'Parser registered: ' + name);
        }
    };

    // =============================================================
    // [5] ОСНОВНАЯ ЛОГИКА
    // =============================================================
    function startPlugin() {
        Lampa.Component.add('adult', function(object) {
            var comp = this;
            this.create = function() {
                this.activity.loader(true);
                this.loadMenu();
                return this.render();
            };

            this.loadMenu = function() {
                var cachedMenu = SmartCache.get('main_menu');
                if (cachedMenu) return this.showMenu(cachedMenu);

                var net = new Lampa.Reguest();
                net.silent(MENU_URL, function(data) {
                    if (data && data.channels) {
                        SmartCache.set('main_menu', data.channels, 86400000);
                        comp.showMenu(data.channels);
                    }
                }, function() {
                    Lampa.Noty.show('Ошибка загрузки меню');
                }, false, { dataType: 'json' });
            };

            this.showMenu = function(channels) {
                this.activity.loader(false);
                var items = channels.map(function(ch) {
                    return {
                        title: ch.title,
                        description: ch.playlist_url,
                        image: ch.icon,
                        parser: ch.parser
                    };
                });

                this.display(items);
            };

            this.display = function(items) {
                var scroll = new Lampa.Scroll({mask: true, over: true});
                items.forEach(function(item) {
                    var card = Lampa.Template.get('button', {title: item.title});
                    card.on('hover:enter', function() {
                        comp.openChannel(item);
                    });
                    scroll.append(card);
                });
                comp.append(scroll.render());
            };

            this.openChannel = function(item) {
                var parser = window.AdultPlugin.parsers[item.parser];
                if (!parser) {
                    this.injectParser(item.parser, function() {
                        comp.openChannel(item);
                    });
                    return;
                }
                
                Lampa.Activity.push({
                    url: item.description,
                    title: item.title,
                    component: 'adult_view',
                    page: 1,
                    parser: item.parser
                });
            };

            this.injectParser = function(name, cb) {
                var script = document.createElement('script');
                script.src = 'https://yumata.github.io/lampa-adult/parsers/' + name + '.js'; // Путь к вашим парсерам
                script.onload = cb;
                document.head.appendChild(script);
            };
        });

        setupSettings();
    }

    // =============================================================
    // [6] НАСТРОЙКИ
    // =============================================================
    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'adult_settings',
            name: 'Клубничка',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" fill="white"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'adult_settings',
            param: { name: 'adult_proxy_mode', type: 'select', values: { 'auto': 'Авто', 'always': 'Всегда', 'none': 'Нет' }, default: 'auto' },
            field: { name: 'Использовать прокси', description: 'Помогает обходить блокировки' }
        });

        Lampa.SettingsApi.addParam({
            component: 'adult_settings',
            param: { name: 'adult_debug_mode', type: 'trigger', default: false },
            field: { name: 'Режим отладки', description: 'Детальные логи в консоли' }
        });
    }

    // ✅ ИСПРАВЛЕНО: Новая функция инъекции парсеров
    var ParserLoader = {
        loaded: {},
        load: function(parserName, callback) {
            if (this.loaded[parserName]) {
                callback();
                return;
            }

            var script = document.createElement('script');
            script.src = PARSERS_URL + parserName + '.js';
            script.onload = function() {
                ParserLoader.loaded[parserName] = true;
                callback();
            };
            script.onerror = function() {
                Logger.error('ParserLoader', 'Failed to load: ' + parserName);
            };
            document.head.appendChild(script);
        }
    };

    function startPlugin() {
        Lampa.Component.add('adult', function(object) {
            var comp = this;
            this.create = function() {
                this.activity.loader(true);
                this.loadMenu();
                return this.render();
            };

            this.loadMenu = function() {
                var cachedMenu = SmartCache.get('main_menu');
                if (cachedMenu) return this.showMenu(cachedMenu);

                var net = new Lampa.Reguest();
                net.silent(MENU_URL, function(data) {
                    if (data && data.channels) {
                        SmartCache.set('main_menu', data.channels, 86400000);
                        comp.showMenu(data.channels);
                    }
                }, function() {
                    Lampa.Noty.show('Ошибка загрузки меню');
                }, false, { dataType: 'json' });
            };

            this.showMenu = function(channels) {
                this.activity.loader(false);
                var items = channels.map(function(ch) {
                    return {
                        title: ch.title,
                        description: ch.playlist_url,
                        image: ch.icon,
                        parser: ch.parser
                    };
                });

                this.display(items);
            };

            this.display = function(items) {
                var scroll = new Lampa.Scroll({mask: true, over: true});
                items.forEach(function(item) {
                    var card = Lampa.Template.get('button', {title: item.title});
                    card.on('hover:enter', function() {
                        comp.openChannel(item);
                    });
                    scroll.append(card);
                });
                comp.append(scroll.render());
            };

            this.openChannel = function(item) {
                var parser = window.AdultPlugin.parsers[item.parser];
                if (!parser) {
                    // ✅ ИСПРАВЛЕНО: Используем новый загрузчик
                    ParserLoader.load(item.parser, function() {
                        comp.openChannel(item);
                    });
                    return;
                }
                
                Lampa.Activity.push({
                    url: item.description,
                    title: item.title,
                    component: 'adult_view',
                    page: 1,
                    parser: item.parser
                });
            };
        });

        setupSettings();
    }

    // Запуск
    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') startPlugin();
    });

})();
