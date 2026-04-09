(function () {
    'use strict';

    function Briz(api) {
        // Главное меню поиска
        this.search = function (query) {
            var url = 'https://pornbriz.com/search/' + encodeURIComponent(query);
            
            api.network.native(url, function (html) {
                if (!html) return api.error();
                
                var items = [];
                // Регулярное выражение для парсинга (проверьте селекторы сайта)
                var matches = html.match(/<div class="video-item">([\s\S]*?)<\/div>/g);
                
                if (matches) {
                    matches.forEach(function (item) {
                        var title = item.match(/title="([^"]+)"/);
                        var link = item.match(/href="([^"]+)"/);
                        var img = item.match(/src="([^"]+)"/);
                        
                        if (title && link) {
                            items.push({
                                title: title[1],
                                url: link[1],
                                img: img ? img[1] : ''
                            });
                        }
                    });
                }
                
                api.result(items);
            });
        };

        // Обработка конкретного видео
        this.any = function (url) {
            api.network.native(url, function (html) {
                if (!html) return api.error();
                
                var video_url = html.match(/source src="([^"]+)"/);
                if (video_url) {
                    api.play({
                        url: video_url[1]
                    });
                } else {
                    api.error();
                }
            });
        };
    }

    // Регистрация плагина в системе Lampa
    if (window.AdultJS) {
        window.AdultJS.register('Briz', Briz);
    } else {
        console.error('Lampa AdultJS не найден');
    }
})();
