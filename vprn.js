/**
 * Parser for: winporn.com
 * Strategy: SSR + Asset Brute (S2)
 * Constraints: Age Gate (Cookie), Referer Required
 */

async function parseWinPorn(html, url, workerIdx) {
    const HOST = "https://www.winporn.com";
    
    // Блок 1: Если мы на странице каталога/поиска
    if (!url.includes('/video/')) {
        const cards = [];
        const containerRegex = /<div[^>]+class="thumb"[^>]*>([\s\S]*?)<\/div>/g;
        let match;

        while ((match = containerRegex.exec(html)) !== null) {
            const block = match[1];
            const link = block.match(/href="([^"]*\/video\/[^"]*)"/)?.[1];
            const title = block.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)/)?.[1];
            const thumb = block.match(/src="([^"]+)"/)?.[1];
            const duration = block.match(/class="[^"]*duration[^"]*"[^>]*>([^<]+)/)?.[1];

            if (link) {
                cards.push({
                    name: title ? title.trim() : "Video",
                    url: link.startsWith('http') ? link : HOST + link,
                    img: thumb,
                    time: duration ? duration.trim() : ""
                });
            }
        }
        return { cards };
    }

    // Блок 2: Если мы на странице видео (Стратегический выбор: S2)
    // Нам не нужен универсальный поиск, JSON говорит о 19 совпадениях mp4.
    const videoUrls = [];
    
    // Регулярка для извлечения прямых ссылок на MP4 с учетом CDN паттерна wppsn.com
    const mp4Regex = /https?:\/\/[a-z0-9]+\.wppsn\.com\/media\/videos\/[^\s"']+\.mp4[^\s"']*/g;
    const matches = html.match(mp4Regex) || [];
    
    // Удаляем дубликаты и очищаем
    const uniqueMatches = [...new Set(matches)];

    uniqueMatches.forEach((rawUrl, index) => {
        // Очистка по правилам из JSON: unescape-backslash
        let cleanUrl = rawUrl.replace(/\\/g, '');
        
        // Определение качества на основе вхождения в строку (если есть) или индекса
        let quality = "SD";
        if (cleanUrl.includes('720p')) quality = "720p";
        if (cleanUrl.includes('1080p')) quality = "1080p";
        if (uniqueMatches.length > 1) quality = `${quality} [src${index}]`;

        videoUrls.push({
            url: cleanUrl,
            quality: quality,
            proxy: {
                // Стратегическое требование из JSON: Worker Verdict
                "Cookie": "mature=1",
                "Referer": HOST + "/"
            }
        });
    });

    return {
        videos: videoUrls,
        info: {
            title: html.match(/<title>([^<]+)<\/title>/)?.[1]?.split('-')[0].trim()
        }
    };
}
