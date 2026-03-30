(function () {
    'use strict';

    // 1. Описываем сам компонент (окно плагина)
    function MyPlugin(object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var html = $('<div class="category-full"></div>');

        this.create = function () {
            // Создаем сетку карточек
            for (var i = 1; i <= 15; i++) {
                var card = $(`
                    <div class="card selector" style="width: 200px; height: 100px; background: #444; margin: 10px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px;">
                        <span>Карточка ${i}</span>
                    </div>
                `);

                card.on('hover:focus', function () {
                    scroll.scrollTo($(this));
                    $(this).css('background', '#fff').css('color', '#000');
                }).on('hover:hover', function () {
                    $(this).css('background', '#444').css('color', '#fff');
                }).on('hover:enter', function () {
                    Lampa.Noty.show('Вы выбрали ' + i);
                });

                html.append(card);
            }
        }

        this.render = function () {
            return scroll.render().append(html);
        }

        this.toggle = function () {
            Lampa.Controller.add('my_plugin_ctrl', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.context('my_plugin_ctrl');
                },
                left: function () { Lampa.Navigator.move('left'); },
                right: function () { Lampa.Navigator.move('right'); },
                up: function () { Lampa.Navigator.move('up'); },
                down: function () { Lampa.Navigator.move('down'); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('my_plugin_ctrl');
        }

        this.destroy = function () {
            scroll.destroy();
            html.remove();
        }
    }

    // 2. Функция инициализации
    function startPlugin() {
        // Регистрация компонента
        Lampa.Component.add('my_test_plugin', MyPlugin);

        // Функция добавления кнопки в меню
        function addMenuItem() {
            // Проверяем, нет ли уже этой кнопки (чтобы не дублировать)
            if ($('.menu [data-action="my_plugin_action"]').length > 0) return;

            var item = $(`
                <li class="menu__item selector" data-action="my_plugin_action">
                    <div class="menu__ico">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    </div>
                    <div class="menu__text">Тест Навигации</div>
                </li>
            `);

            item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Мой плагин',
                    component: 'my_test_plugin',
                    page: 1
                });
            });

            // Добавляем в конец списка меню
            $('.menu .menu__list').append(item);
        }

        // Если Lampa уже загружена — добавляем сразу
        if (window.appready) {
            addMenuItem();
        }

        // Слушаем событие готовности приложения, чтобы добавить пункт меню
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') {
                addMenuItem();
            }
        });
    }

    // Запуск
    if (window.Lampa) {
        startPlugin();
    } else {
        // На случай, если скрипт загрузился слишком рано
        var timer = setInterval(function(){
            if(window.Lampa){
                clearInterval(timer);
                startPlugin();
            }
        }, 100);
    }

})();
