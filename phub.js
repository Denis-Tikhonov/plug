(function () {
    'use strict';

    var CONFIG = {
        base_url: 'https://rt.pornhub.com',
        sel: {
            item: '.pcVideoListItem',
            title: '.title a',
            thumb: 'img',
            duration: '.duration'
        }
    };

    var PhubParser = {
        // Главный метод: список видео
        view: function(params, success, error) {
            var url = params.url + (params.url.indexOf('?') > -1 ? '&' : '?') + 'page=' + (params.page || 1);
            
            // Используем глобальный Http утилиту из AdultJS
            window.AdultPlugin.Http.fetch(url, function(html) {
                var items = PhubParser.parsePage(html);
                if (items.length > 0) {
                    success({
                        results: items,
                        total_pages: 100, // Условно
                        page: params.page || 1
                    });
                } else {
                    error('Ничего не найдено');
                }
            }, error);
        },

        // Гибридный парсинг (Regex + DOM)
        parsePage: function(html) {
            var results = [];
            
            // 1. Пытаемся быстрым Regex (для слабых ТВ)
            var regex = /<li[^>]+class="[^"]*pcVideoListItem[\s\S]*?<\/li>/g;
            var match;
            
            while ((match = regex.exec(html)) !== null) {
                var li = match[0];
                try {
                    var title = li.match(/title="([^"]+)"/)[1];
                    var href = li.match(/href="(\/view_video\.php\?viewkey=[^"]+)"/)[1];
                    var img = li.match(/data-mediumthumb="([^"]+)"/);
                    
                    results.push({
                        name: title,
                        video: CONFIG.base_url + href,
                        picture: img ? img[1] : '',
                        source: 'PornHub'
                    });
                } catch (e) {}
            }

            // 2. Если Regex не сработал, используем DOMParser
            if (results.length === 0) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var nodes = doc.querySelectorAll(CONFIG.sel.item);
                nodes.forEach(function(node) {
                    var a = node.querySelector(CONFIG.sel.title);
                    var img = node.querySelector(CONFIG.sel.thumb);
                    if (a) {
                        results.push({
                            name: a.textContent.trim(),
                            video: CONFIG.base_url + a.getAttribute('href'),
                            picture: img ? (img.getAttribute('data-mediumthumb') || img.src) : '',
                            source: 'PornHub'
                        });
                    }
                });
            }

            return results;
        },

        // Поиск
        search: function(params, success, error) {
            params.url = CONFIG.base_url + '/video/search?search=' + encodeURIComponent(params.query);
            this.view(params, success, error);
        },

        // Получение прямой ссылки (Video Resolver)
        video: function(params, success, error) {
            window.AdultPlugin.Http.fetch(params.url, function(html) {
                // Ищем flashvars или медиа-объекты в скриптах
                var videoMatch = html.match(/"videoUrl":"([^"]+)"/);
                if (videoMatch) {
                    var url = videoMatch[1].replace(/\\/g, '');
                    success({ path: url });
                } else {
                    // Fallback для скриптов медиа-определений
                    var mediaMatch = html.match(/mediaDefinitions":(\[.*?\])/);
                    if (mediaMatch) {
                        try {
                            var media = JSON.parse(mediaMatch[1]);
                            var best = media.filter(m => m.videoUrl).sort((a,b) => b.quality - a.quality)[0];
                            success({ path: best.videoUrl });
                        } catch(e) { error('Link parse error'); }
                    } else {
                        error('Стрипинг ссылки не удался. Возможно, нужна авторизация или прокси.');
                    }
                }
            }, error);
        }
    };

    // Регистрация в глобальном реестре
    if (window.AdultPlugin && window.AdultPlugin.registerParser) {
        window.AdultPlugin.registerParser('phub', PhubParser);
    }
})();
