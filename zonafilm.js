// ============================================================
//  LAMPA PLUGIN — Grid Navigation (Emergency Fix)
//  Принудительная активация контроллера
// ============================================================

(function() {
    'use strict';

    // ======== ОТЛАДКА НА ЭКРАНЕ ========
    var DEBUG = true;
    var debugLines = [];
    
    function log(msg) {
        if (!DEBUG) return;
        console.log('[GRID]', msg);
        debugLines.push(msg);
        if (debugLines.length > 10) debugLines.shift();
        updateDebugScreen();
    }
    
    function updateDebugScreen() {
        var box = document.getElementById('grid-debug');
        if (!box) {
            box = document.createElement('div');
            box.id = 'grid-debug';
            box.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:rgba(0,0,0,0.95);color:#0f0;padding:15px;font-family:monospace;font-size:14px;z-index:99999;min-height:100px;border:3px solid #0f0;white-space:pre-wrap;pointer-events:none;';
            document.body.appendChild(box);
        }
        box.textContent = debugLines.join('\n');
    }

    log('=== PLUGIN START ===');

    // ======== ПРОВЕРКА LAMPA ========
    if (typeof Lampa === 'undefined') {
        log('FATAL: Lampa undefined');
        return;
    }
    
    log('Lampa OK');
    log('Controller exists: ' + (typeof Lampa.Controller !== 'undefined'));
    log('Controller.add exists: ' + (typeof Lampa.Controller?.add !== 'undefined'));
    log('Controller.enable exists: ' + (typeof Lampa.Controller?.enable !== 'undefined'));

    // ======== СТИЛИ ========
    var STYLE = [
        '.gx-wrap{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;background:#1a1a1a}',
        '.gx-grid{display:flex;flex-wrap:wrap;gap:20px;padding:40px;justify-content:flex-start}',
        '.gx-card{width:20%;height:180px;background:#333;border-radius:12px;position:relative;transition:all 0.2s;border:4px solid #555;cursor:pointer}',
        '.gx-card.focus{background:#4FC3F7;border-color:#fff;transform:scale(1.1);box-shadow:0 0 40px rgba(79,195,247,0.9);z-index:1000}',
        '.gx-num{position:absolute;top:10px;left:10px;background:#000;color:#0f0;padding:6px 12px;border-radius:6px;font-size:18px;font-weight:bold}',
        '.gx-card.focus .gx-num{background:#fff;color:#000}',
        '.gx-title{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);color:#fff;padding:15px;text-align:center;font-size:16px}'
    ].join('');
    $('<style>').text(STYLE).appendTo('head');

    // ======== КОМПОНЕНТ ========
    function GridXComponent(object) {
        log('=== COMPONENT CONSTRUCTOR ===');
        
        var self = this;
        this.activity = object;
        this.scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        this.grid = $('<div class="gx-grid"></div>');
        this.cards = [];

        // ======== УДАЛЕНИЕ СТАРОГО КОНТРОЛЛЕРА ========
        try {
            Lampa.Controller.remove('content');
            log('Old controller removed');
        } catch(e) {
            log('No old controller: ' + e.message);
        }

        // ======== СОЗДАНИЕ КОНТРОЛЛЕРА ========
        log('Creating controller...');
        
        // Пробуем разные способы создания
        var controllerMethods = {
            toggle: function() {
                log('CTRL: toggle()');
                log('Setting collection...');
                try {
                    Lampa.Controller.collectionSet(self.grid);
                    log('Collection set OK');
                } catch(e) {
                    log('CollectionSet ERROR: ' + e.message);
                }
                
                log('Setting focus...');
                try {
                    var first = self.grid.find('.selector').first();
                    log('First card found: ' + first.length);
                    Lampa.Controller.collectionFocus(first, self.grid);
                    log('Focus set OK');
                } catch(e) {
                    log('Focus ERROR: ' + e.message);
                }
            },
            
            up: function() {
                log('KEY: UP');
                self.move('up');
            },
            down: function() {
                log('KEY: DOWN');
                self.move('down');
            },
            left: function() {
                log('KEY: LEFT');
                self.move('left');
            },
            right: function() {
                log('KEY: RIGHT');
                self.move('right');
            },
            
            back: function() {
                log('KEY: BACK');
                Lampa.Activity.backward();
            }
        };

        // Регистрируем
        try {
            this.controller = Lampa.Controller.add('content', controllerMethods);
            log('Controller registered: ' + (this.controller ? 'SUCCESS' : 'NULL'));
        } catch(e) {
            log('Controller registration FAILED: ' + e.message);
            // Пробуем альтернативный способ
            log('Trying alternative registration...');
            Lampa.Controller.list = Lampa.Controller.list || {};
            Lampa.Controller.list['content'] = controllerMethods;
            this.controller = controllerMethods;
        }

        // ======== РУЧНАЯ НАВИГАЦИЯ (запасной вариант) ========
        this.move = function(dir) {
            log('Manual move: ' + dir);
            
            var cards = this.grid.find('.selector');
            var current = this.grid.find('.focus');
            var idx = cards.index(current);
            var cols = 4;
            var total = cards.length;
            
            log('Current index: ' + idx + ', total: ' + total);
            
            var newIdx;
            switch(dir) {
                case 'up': newIdx = idx - cols; break;
                case 'down': newIdx = idx + cols; break;
                case 'left': newIdx = idx - 1; break;
                case 'right': newIdx = idx + 1; break;
            }
            
            if (newIdx >= 0 && newIdx < total) {
                current.removeClass('focus');
                var next = cards.eq(newIdx);
                next.addClass('focus');
                this.scroll.update(next);
                log('Moved to: ' + newIdx);
            } else {
                log('Move blocked: out of bounds');
            }
        };

        // ======== СОЗДАНИЕ КАРТОЧЕК ========
        this.createCard = function(i) {
            var card = $('<div class="gx-card card selector" data-idx="' + i + '">' +
                '<div class="gx-num">#' + i + '</div>' +
                '<div class="gx-title">Video ' + i + '</div>' +
            '</div>');

            card.on('hover:focus', function() {
                $(this).addClass('focus');
                self.scroll.update($(this));
            });

            card.on('hover:blur', function() {
                $(this).removeClass('focus');
            });

            card.on('hover:enter', function() {
                log('ENTER on #' + i);
                try { Lampa.Noty.show('Selected #' + i); } catch(e) {}
            });

            return card;
        };

        // ======== ЖИЗНЕННЫЙ ЦИКЛ ========
        
        this.create = function() {
            log('=== CREATE ===');
            
            var wrap = $('<div class="gx-wrap"></div>');
            
            // Создаем карточки
            for (var i = 1; i <= 12; i++) {
                var c = this.createCard(i);
                this.grid.append(c);
                this.cards.push(c);
            }
            log('Cards created: ' + this.cards.length);
            
            wrap.append(this.grid);
            
            // Добавляем в scroll
            var scrollEl = this.scroll.render();
            scrollEl.append(wrap);
            
            log('Create finished');
            return scrollEl;
        };

        this.start = function() {
            log('=== START ===');
            
            // Проверяем текущее состояние
            var before = 'undefined';
            try {
                var enabled = Lampa.Controller.enabled();
                before = enabled ? enabled.name : 'null';
            } catch(e) {
                before = 'error: ' + e.message;
            }
            log('Before enable: ' + before);
            
            // Пробуем включить контроллер
            log('Calling enable(content)...');
            try {
                Lampa.Controller.enable('content');
                log('Enable called without error');
            } catch(e) {
                log('Enable ERROR: ' + e.message);
            }
            
            // Проверяем после
            var after = 'undefined';
            try {
                var enabled2 = Lampa.Controller.enabled();
                after = enabled2 ? enabled2.name : 'null';
            } catch(e) {
                after = 'error: ' + e.message;
            }
            log('After enable: ' + after);
            
            // Принудительная активация toggle с задержкой
            setTimeout(function() {
                log('Delayed activation...');
                try {
                    if (self.controller && self.controller.toggle) {
                        self.controller.toggle();
                        log('Toggle called directly');
                    } else {
                        log('No controller.toggle available');
                    }
                } catch(e) {
                    log('Toggle ERROR: ' + e.message);
                }
                
                // Устанавливаем фокус вручную если нужно
                if (self.grid.find('.focus').length === 0) {
                    log('No focus found, setting manually');
                    var first = self.grid.find('.selector').first();
                    first.addClass('focus');
                    self.scroll.update(first);
                }
            }, 200);
        };

        this.pause = function() {
            log('PAUSE');
            try { Lampa.Controller.disable('content'); } catch(e) {}
        };

        this.stop = function() {
            log('STOP');
            try { Lampa.Controller.disable('content'); } catch(e) {}
        };

        this.toggle = function() {
            log('TOGGLE');
            try {
                Lampa.Controller.collectionSet(this.grid);
                var focused = this.grid.find('.focus');
                Lampa.Controller.collectionFocus(focused.length ? focused : false, this.grid);
            } catch(e) {
                log('Toggle ERROR: ' + e.message);
            }
        };

        this.render = function() {
            log('RENDER');
            return this.scroll.render();
        };

        this.destroy = function() {
            log('DESTROY');
            try { Lampa.Controller.remove('content'); } catch(e) {}
            this.scroll.destroy();
        };
    }

    // ======== РЕГИСТРАЦИЯ ========
    log('Registering component...');
    Lampa.Component.add('grid_x', GridXComponent);
    log('Component registered');

    // ======== МЕНЮ ========
    function addMenu() {
        log('Adding menu...');
        
        var item = $('<li class="menu__item selector" data-action="grid_x">' +
            '<div class="menu__ico">🎮</div>' +
            '<div class="menu__text">GRID TEST</div>' +
        '</li>');

        item.on('hover:enter', function() {
            log('Menu clicked!');
            Lampa.Activity.push({
                url: '',
                title: 'Grid Test',
                component: 'grid_x',
                page: 1
            });
        });

        $('.menu .menu__list').eq(0).append(item);
        log('Menu added');
    }

    // ======== ЗАПУСК ========
    if (window.appready) {
        log('App already ready');
        addMenu();
    } else {
        log('Waiting for app ready...');
        Lampa.Listener.follow('app', function(e) {
            log('App event: ' + e.type);
            if (e.type === 'ready') addMenu();
        });
    }

    log('=== PLUGIN LOADED ===');
})();
