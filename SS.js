(function () {
    'use strict';

    var PLUGIN_VERSION = '1.2.0';
    var PLUGIN_ID = 'adult_plugin';
    
    var MENU_URL = 'https://raw.githubusercontent.com/Denis-Tikhonov/lampa-plugin/main/menu.json';
    var PARSERS_URL = 'https://raw.githubusercontent.com/Denis-Tikhonov/lampa-plugin/main/';

    // Логирование
    var Logger = {
        show: function(msg) {
            if (Lampa.Noty) {
                Lampa.Noty.show(msg);
            }
            console.log('[SS] ' + msg);
        },
        error: function(msg) {
            if (Lampa.Noty) {
                Lampa.Noty.show('❌ ' + msg, 'error');
            }
            console.error('[SS] ERROR: ' + msg);
        }
    };

    // Кэш
    var Cache = {
        data: {},
        set: function(key, value) {
            this.data[key] = value;
        },
        get: function(key) {
            return this.data[key] || null;
        }
    };

    // Реестр парсеров
    window.AdultPlugin = {
        parsers: {},
        registerParser: function(name, obj) {
            this.parsers[name] = obj;
        }
    };

    // Загрузчик парсеров
    var ParserLoader = {
        loaded: {},
        load: function(parserName, callback) {
            if (this.loaded[parserName]) {
                callback();
                return;
            }

            var scriptUrl = PARSERS_URL + parserName + '.js';
            var script = document.createElement('script');
            script.src = scriptUrl;
            
            script.onload = function() {
                ParserLoader.loaded[parserName] = true;
                callback();
            };
            
            script.onerror = function() {
                Logger.error('Failed to load: ' + parserName);
                callback();
            };
            
            document.head.appendChild(script);
        }
    };

    // =============================================================
    // КОМПОНЕНТ ПРОСМОТРА (adult_view)
    // =============================================================
    Lampa.Component.add('adult_view', function(object) {
        var comp = this;
        var current_item = null;

        this.create = function() {
            this.activity.loader(true);
            
            var parser = window.AdultPlugin.parsers[object.parser];
            if (!parser) {
                Logger.error('Parser not found: ' + object.parser);
                this.activity.loader(false);
                return this.render();
            }

            // Загружаем список видео
            parser.view({
                url: object.url,
                page: object.page || 1,
                parser: object.parser
            }, function(data) {
                comp.activity.loader(false);
                comp.showList(data.results || []);
            }, function(err) {
                Logger.error(err);
                comp.activity.loader(false);
            });

            return this.render();
        };

        this.showList = function(items) {
            var scroll = new Lampa.Scroll({ mask: true, over: true });

            items.forEach(function(item) {
                var card = Lampa.Template.get('card', {
                    title: item.name,
                    image: item.picture || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23333" width="300" height="200"/%3E%3Ctext fill="%23fff" x="50%" y="50%" text-anchor="middle" dy=".3em"%3E' + encodeURIComponent(item.name) + '%3C/text%3E%3C/svg%3E',
                    description: item.source || ''
                });

                card.on('hover:enter', function() {
                    current_item = item;
                    comp.playVideo(item);
                });

                scroll.append(card);
            });

            comp.append(scroll.render());
        };

        this.playVideo = function(item) {
            Logger.show('⏯️ Playing: ' + item.name);

            var parser = window.AdultPlugin.parsers[object.parser];
            
            this.activity.loader(true);
            parser.video({
                url: item.video
            }, function(data) {
                comp.activity.loader(false);
                
                if (data && data.path) {
                    Lampa.Player.play({
                        title: item.name,
                        picture: item.picture,
                        url: data.path
                    });
                } else {
                    Logger.error('No video URL received');
                }
            }, function(err) {
                Logger.error('Video error: ' + err);
                comp.activity.loader(false);
            });
        };
    });

    // =============================================================
    // ОСНОВНОЙ КОМПОНЕНТ (adult)
    // =============================================================
    Lampa.Component.add('adult', function(object) {
        var comp = this;
        
        this.create = function() {
            this.activity.loader(true);
            this.loadMenu();
            return this.render();
        };

        this.loadMenu = function() {
            var cachedMenu = Cache.get('main_menu');
            
            if (cachedMenu) {
                comp.showMenu(cachedMenu);
                return;
            }

            var net = new Lampa.Reguest();
            net.silent(MENU_URL, function(data) {
                if (data && data.channels && data.channels.length > 0) {
                    Cache.set('main_menu', data.channels);
                    comp.showMenu(data.channels);
                } else {
                    Logger.error('Invalid menu data');
                    comp.activity.loader(false);
                }
            }, function(err) {
                Logger.error('Menu load failed');
                comp.activity.loader(false);
            }, false, { dataType: 'json', timeout: 10000 });
        };

        this.showMenu = function(channels) {
            comp.activity.loader(false);
            
            var scroll = new Lampa.Scroll({ mask: true, over: true });
            
            channels.forEach(function(ch) {
                var item = {
                    title: ch.title,
                    description: ch.playlist_url,
                    image: ch.icon || '',
                    parser: ch.parser || 'phub'
                };

                // ✅ ВАЖНО: Используем Template.get для создания правильного элемента меню
                var card = Lampa.Template.get('card', {
                    title: item.title,
                    image: item.image,
                    description: 'Клубничка'
                });

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

    // =============================================================
    // ДОБАВЛЕНИЕ В ГЛАВНОЕ МЕНЮ
    // =============================================================
    function addToMainMenu() {
        // Способ 1: Добавить в меню категорий
        try {
            Lampa.MainMenu.add({
                title: '🔞 Клубничка',
                description: 'Взрослый контент',
                component: 'adult',
                weight: 999 // Вес для сортировки
            });
            Logger.show('✅ Плагин добавлен в меню');
        } catch(e) {
            Logger.error('MainMenu add failed: ' + e.message);
            
            // Способ 2: Добавить через Lampa.Channels
            try {
                Lampa.Channels.add({
                    title: '🔞 Клубничка',
                    description: 'Взрослый контент',
                    component: 'adult',
                    icon: '<svg height="36" viewBox="0 0 24 24" width="36"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" fill="white"/></svg>'
                });
            } catch(e2) {
                console.log('[SS] Both menu methods failed');
            }
        }
    }

    // =============================================================
    // ЗАПУСК ПЛАГИНА
    // =============================================================
    function init() {
        Logger.show('📺 SS Plugin v' + PLUGIN_VERSION);
        addToMainMenu();
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type == 'ready') init();
        });
    }

})();
