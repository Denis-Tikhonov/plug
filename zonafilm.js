/**
 * ============================================================
 *  LAMPA PLUGIN — Grid Navigation Test (Debug Version)
 *  Простой тест навигации по карточкам с визуальной отладкой
 * ============================================================
 */

(function() {
    'use strict';

    var CONFIG = {
        debug: true,
        cardsCount: 12,      // Количество тестовых карточек
        cols: 4,             // Количество колонок
        title: 'Test Grid'
    };

    // ======== ВИЗУАЛЬНАЯ ОТЛАДКА ========
    function log(type, msg, data) {
        if (!CONFIG.debug) return;
        var prefix = '[GRID-TEST][' + type + ']';
        console.log(prefix, msg, data || '');
        
        // Визуальный лог на экране (для TV)
        var debugEl = document.getElementById('grid-debug');
        if (!debugEl) {
            debugEl = document.createElement('div');
            debugEl.id = 'grid-debug';
            debugEl.style.cssText = 'position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.9);color:#0f0;padding:10px;font-family:monospace;font-size:14px;z-index:9999;max-width:300px;max-height:200px;overflow:auto;border:2px solid #0f0;';
            document.body.appendChild(debugEl);
        }
        var entry = document.createElement('div');
        entry.style.cssText = 'margin:2px 0;border-bottom:1px solid #333;';
        entry.textContent = type + ': ' + msg;
        debugEl.appendChild(entry);
        // Ограничиваем количество записей
        while (debugEl.children.length > 10) {
            debugEl.removeChild(debugEl.firstChild);
        }
    }

    // ======== СТИЛИ ========
    var CSS = '\
        .test-grid-wrap{position:relative;height:100%;overflow:hidden}\
        .test-grid{display:flex;flex-wrap:wrap;gap:20px;padding:40px;align-content:flex-start}\
        .test-card{width:22%;height:180px;background:#333;border-radius:12px;position:relative;transition:all 0.2s;overflow:hidden}\
        .test-card.focus{background:#4FC3F7;transform:scale(1.08);box-shadow:0 0 20px rgba(79,195,247,0.6);z-index:10}\
        .test-card.focus .test-num{color:#000;font-weight:bold}\
        .test-card:hover{background:#555}\
        .test-poster{width:100%;height:120px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;font-size:48px;color:rgba(255,255,255,0.3)}\
        .test-info{padding:10px;color:#fff}\
        .test-num{position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.7);color:#fff;padding:4px 8px;border-radius:4px;font-size:12px}\
        .test-title{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
        .test-status{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#4FC3F7;padding:15px 30px;border-radius:8px;font-size:16px;z-index:100;display:none}\
        .test-status.active{display:block}\
        .test-legend{position:fixed;bottom:80px;left:20px;background:rgba(0,0,0,0.8);color:#aaa;padding:15px;border-radius:8px;font-size:12px;line-height:1.6}\
        .test-legend span{color:#4FC3F7}\
    ';
    
    $('<style>').text(CSS).appendTo('head');

    // ======== КОМПОНЕНТ СЕТКИ ========
    function GridComponent(object) {
        var self = this;
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var grid = $('<div class="test-grid"></div>');
        var status = $('<div class="test-status"></div>');
        var legend = $('<div class="test-legend">' +
            '<span>Управление:</span><br>' +
            '↑↓←→ — перемещение<br>' +
            'OK/Enter — выбор<br>' +
            'Назад — выход' +
        '</div>');

        // ======== РЕГИСТРАЦИЯ КОНТРОЛЛЕРА НАВИГАЦИИ ========
        // ЭТО КЛЮЧЕВОЙ БЛОК — без него стрелки не работают!
        var controller = Lampa.Controller.add('content', {
            // Включение контроллера (вызывается при toggle)
            toggle: function() {
                log('CTRL', 'toggle() вызван');
                // Устанавливаем коллекцию элементов
                Lampa.Controller.collectionSet(grid);
                // Устанавливаем фокус (false = первый элемент, или конкретный элемент)
                Lampa.Controller.collectionFocus(false, grid);
                self.updateStatus('Навигация активна');
            },
            
            // Обработчики стрелок — они вызывают collectionMove
            up: function() {
                log('NAV', '↑ вверх');
                Lampa.Controller.collectionMove('up');
                self.showFocused();
            },
            down: function() {
                log('NAV', '↓ вниз');
                Lampa.Controller.collectionMove('down');
                self.showFocused();
            },
            left: function() {
                log('NAV', '← влево');
                Lampa.Controller.collectionMove('left');
                self.showFocused();
            },
            right: function() {
                log('NAV', '→ вправо');
                Lampa.Controller.collectionMove('right');
                self.showFocused();
            },
            
            // Назад — выход из активности
            back: function() {
                log('CTRL', 'back() — выход');
                Lampa.Activity.backward();
            }
        });

        // ======== СОЗДАНИЕ КАРТОЧЕК ========
        this.create = function() {
            log('LIFE', 'create() — создание сетки');
            
            var wrap = $('<div class="test-grid-wrap"></div>');
            wrap.append(grid);
            scroll.append(wrap);
            
            // Создаем тестовые карточки
            for (var i = 1; i <= CONFIG.cardsCount; i++) {
                var card = this.createCard(i);
                grid.append(card);
            }
            
            // Добавляем в DOM
            $('body').append(scroll.render());
            $('body').append(status);
            $('body').append(legend);
            
            log('GRID', 'Создано карточек: ' + CONFIG.cardsCount);
        };

        // ======== СОЗДАНИЕ ОДНОЙ КАРТОЧКИ ========
        this.createCard = function(index) {
            // ВАЖНО: класс 'card' нужен для правильного расчета размеров
            // класс 'selector' — для поиска Lampa
            var card = $('<div class="test-card card selector">' +
                '<div class="test-num">#' + index + '</div>' +
                '<div class="test-poster">🎬</div>' +
                '<div class="test-info">' +
                    '<div class="test-title">Видео ' + index + '</div>' +
                '</div>' +
            '</div>');
            
            // События Lampa (не стандартные DOM!)
            card.on('hover:focus', function(e) {
                // Фокус перемещен на эту карточку
                $(this).addClass('focus');
                scroll.update($(this)); // Прокрутка к элементу
                log('FOCUS', 'Карточка #' + index);
            });
            
            card.on('hover:blur', function(e) {
                // Фокус ушел с карточки
                $(this).removeClass('focus');
            });
            
            card.on('hover:enter', function(e) {
                // Нажатие OK/Enter
                log('ACTION', 'Выбрана карточка #' + index);
                self.updateStatus('Выбрано: #' + index);
                // Здесь можно открыть плеер или детали
                // Lampa.Activity.push({...});
            });
            
            return card;
        };

        // ======== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ========
        this.showFocused = function() {
            var focused = grid.find('.focus');
            var num = focused.find('.test-num').text() || 'none';
            this.updateStatus('Фокус: ' + num);
        };

        this.updateStatus = function(text) {
            status.text(text).addClass('active');
            clearTimeout(this.statusTimer);
            this.statusTimer = setTimeout(function() {
                status.removeClass('active');
            }, 2000);
        };

        // ======== ЖИЗНЕННЫЙ ЦИКЛ ========
        this.start = function() {
            log('LIFE', 'start() — активация');
            // Включаем наш контроллер 'content'
            Lampa.Controller.enable('content');
        };

        this.pause = function() {
            log('LIFE', 'pause()');
            Lampa.Controller.disable('content');
        };

        this.stop = function() {
            log('LIFE', 'stop()');
            Lampa.Controller.disable('content');
        };

        this.toggle = function() {
            log('LIFE', 'toggle() — восстановление');
            // При возврате к этому экрану восстанавливаем фокус
            Lampa.Controller.collectionSet(grid);
            // Ищем последнюю активную карточку или берем первую
            var lastFocus = grid.find('.focus');
            Lampa.Controller.collectionFocus(lastFocus.length ? lastFocus : false, grid);
        };

        this.render = function() {
            return scroll.render();
        };

        this.destroy = function() {
            log('LIFE', 'destroy() — очистка');
            // Удаляем контроллер при уничтожении!
            Lampa.Controller.remove('content');
            scroll.destroy();
            grid.remove();
           
