// ============================================================
//  LAMPA PLUGIN — Grid Test (ES5 Compatible)
//  Сохранить в UTF-8 без BOM!
// ============================================================

(function() {
    'use strict';

    // Проверка загрузки
    console.log('[GRID-TEST] Plugin loading started');

    var CONFIG = {
        debug: true,
        cardsCount: 12,
        title: 'Test Grid'
    };

    // Проверка доступности Lampa
    if (typeof Lampa === 'undefined') {
        console.error('[GRID-TEST] Lampa not found!');
        return;
    }

    // ======== СТИЛИ (ES5 строки) ========
    var CSS = [
        '.test-grid-wrap{position:relative;height:100%;overflow:hidden}',
        '.test-grid{display:flex;flex-wrap:wrap;gap:20px;padding:40px}',
        '.test-card{width:22%;height:180px;background:#333;border-radius:12px;position:relative;transition:all 0.2s}',
        '.test-card.focus{background:#4FC3F7;transform:scale(1.08);box-shadow:0 0 20px rgba(79,195,247,0.6)}',
        '.test-poster{width:100%;height:120px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:48px}',
        '.test-info{padding:10px;color:#fff;font-size:14px}'
    ].join('');

    // Добавляем стили
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    // ======== КОМПОНЕНТ ========
    function GridComponent(object) {
        var self = this;
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var grid = document.createElement('div');
        grid.className = 'test-grid';

        // Регистрация контроллера
        Lampa.Controller.add('content', {
            toggle: function() {
                console.log('[GRID-TEST] Controller toggle');
                Lampa.Controller.collectionSet(grid);
                Lampa.Controller.collectionFocus(false, grid);
            },
            up: function() { Lampa.Controller.collectionMove('up'); },
            down: function() { Lampa.Controller.collectionMove('down'); },
            left: function() { Lampa.Controller.collectionMove('left'); },
            right: function() { Lampa.Controller.collectionMove('right'); },
            back: function() { Lampa.Activity.backward(); }
        });

        this.create = function() {
            console.log('[GRID-TEST] Creating grid');
            
            var wrap = document.createElement('div');
            wrap.className = 'test-grid-wrap';
            wrap.appendChild(grid);
            scroll.append(wrap);

            // Создаем карточки
            for (var i = 1; i <= CONFIG.cardsCount; i++) {
                var card = document.createElement('div');
                card.className = 'test-card card selector';
                card.innerHTML = [
                    '<div class="test-poster">#' + i + '</div>',
                    '<div class="test-info">Видео ' + i + '</div>'
                ].join('');

                // События через jQuery/Lampa
                $(card).on('hover:focus', function() {
                    $(this).addClass('focus');
                    scroll.update($(this));
                });
                $(card).on('hover:blur', function() {
                    $(this).removeClass('focus');
                });
                $(card).on('hover:enter', function() {
                    console.log('[GRID-TEST] Selected:', this.textContent);
                });

                grid.appendChild(card);
            }

            document.body.appendChild(scroll.render());
        };

        this.start = function() {
            console.log('[GRID-TEST] Start called');
            Lampa.Controller.enable('content');
        };

        this.pause = function() {
            Lampa.Controller.disable('content');
        };

        this.stop = function() {
            Lampa.Controller.disable('content');
        };

        this.toggle = function() {
            Lampa.Controller.collectionSet(grid);
            Lampa.Controller.collectionFocus(false, grid);
        };

        this.render = function() {
            return scroll.render();
        };

        this.destroy = function() {
            Lampa.Controller.remove('content');
            scroll.destroy();
        };
    }

    // Регистрация
    Lampa.Component.add('grid_test', GridComponent);
    console.log('[GRID-TEST] Component registered');

    // Добавление в меню
    function addMenu() {
        var item = document.createElement('li');
        item.className = 'menu__item selector';
        item.setAttribute('data-action', 'grid_test');
        item.innerHTML = '<div class="menu__ico">🔲</div><div class="menu__text">Test Grid</div>';
        
        $(item).on('hover:enter', function() {
            Lampa.Activity.push({
                url: '',
                title: CONFIG.title,
                component: 'grid_test',
                page: 1
            });
        });

        var menuList = document.querySelector('.menu .menu__list');
        if (menuList) {
            menuList.appendChild(item);
            console.log('[GRID-TEST] Menu item added');
        }
    }

    // Запуск
    if (window.appready) {
        addMenu();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') addMenu();
        });
    }

    console.log('[GRID-TEST] Plugin loaded successfully');

})();
