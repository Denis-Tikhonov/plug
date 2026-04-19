// =============================================================
// hdtub.js — HDtube Parser для AdultJS (Lampa)
// Версия  : 1.3.1-DEBUG (логирование для Android)
// =============================================================

(function () {
  'use strict';

  var VERSION = '1.3.1-DEBUG';
  var NAME    = 'hdtub';
  var HOST    = 'https://www.hdtube.porn';

  console.log('[hdtub] Parser loaded, version:', VERSION);
  console.log('[hdtub] UserAgent:', navigator.userAgent.substring(0, 80));

  var CATEGORIES = [
    { title: 'Amateur',            slug: 'amateur'            },
    { title: 'Anal',               slug: 'anal'               },
    { title: 'Asian',              slug: 'asian'              },
    { title: 'Babe',               slug: 'babe'               },
    { title: 'BBW',                slug: 'bbw'                },
    { title: 'BDSM',               slug: 'bdsm'               },
    { title: 'Big Ass',            slug: 'big-ass'            },
    { title: 'Big Cock',           slug: 'big-cock'           },
    { title: 'Big Tits',           slug: 'big-tits'           },
    { title: 'Bisexual',           slug: 'bisexual'           },
    { title: 'Black',              slug: 'black'              },
    { title: 'Blonde',             slug: 'blonde'             },
    { title: 'Blowjob',            slug: 'blowjob'            },
    { title: 'Bondage',            slug: 'bondage'            },
    { title: 'Brunette',           slug: 'brunette'           },
    { title: 'Close Up',           slug: 'close-up'           },
    { title: 'College',            slug: 'college'            },
    { title: 'Creampie',           slug: 'creampie'           },
    { title: 'Cuckold',            slug: 'cuckold'            },
    { title: 'Cumshot',            slug: 'cumshot'            },
    { title: 'Doggystyle',         slug: 'doggystyle'         },
    { title: 'Double Penetration', slug: 'double-penetration' },
    { title: 'Ebony',              slug: 'ebony'              },
    { title: 'Erotic',             slug: 'erotic'             },
    { title: 'Facial',             slug: 'facial'             },
    { title: 'Femdom',             slug: 'femdom'             },
    { title: 'Fetish',             slug: 'fetish'             },
    { title: 'Fingering',          slug: 'fingering'          },
    { title: 'Fisting',            slug: 'fisting'            },
    { title: 'Gangbang',           slug: 'gangbang'           },
    { title: 'Gloryhole',          slug: 'gloryhole'          },
    { title: 'Granny',             slug: 'granny'             },
    { title: 'Group',              slug: 'group'              },
    { title: 'Hairy',              slug: 'hairy'              },
    { title: 'Handjob',            slug: 'handjob'            },
    { title: 'Hardcore',           slug: 'hardcore'           },
    { title: 'Homemade',           slug: 'homemade'           },
    { title: 'Indian',             slug: 'indian'             },
    { title: 'Interracial',        slug: 'interracial'        },
    { title: 'Japanese',           slug: 'japanese'           },
    { title: 'Latina',             slug: 'latina'             },
    { title: 'Lesbian',            slug: 'lesbian'            },
    { title: 'Lingerie',           slug: 'lingerie'           },
    { title: 'Massage',            slug: 'massage'            },
    { title: 'Masturbation',       slug: 'masturbation'       },
    { title: 'Mature',             slug: 'mature'             },
    { title: 'MILF',               slug: 'milf'               },
    { title: 'Natural',            slug: 'natural'            },
    { title: 'Orgy',               slug: 'orgy'               },
    { title: 'Outdoor',            slug: 'outdoor'            },
    { title: 'Party',              slug: 'party'              },
    { title: 'Petite',             slug: 'petite'             },
    { title: 'Pissing',            slug: 'pissing'            },
    { title: 'Pornstar',           slug: 'pornstar'           },
    { title: 'POV',                slug: 'pov'                },
    { title: 'Public',             slug: 'public'             },
    { title: 'Pussy Licking',      slug: 'pussy-licking'      },
    { title: 'Reality',            slug: 'reality'            },
    { title: 'Redhead',            slug: 'redhead'            },
    { title: 'Russian',            slug: 'russian'            },
    { title: 'Schoolgirl',         slug: 'schoolgirl'         },
    { title: 'Shaved',             slug: 'shaved'             },
    { title: 'Shemale',            slug: 'shemale'            },
    { title: 'Small Tits',         slug: 'small-tits'         },
    { title: 'Solo',               slug: 'solo'               },
    { title: 'Spanking',           slug: 'spanking'           },
    { title: 'Squirting',          slug: 'squirting'          },
    { title: 'Stockings',          slug: 'stockings'          },
    { title: 'Striptease',         slug: 'striptease'         },
    { title: 'Teen (18+)',         slug: 'teen'               },
    { title: 'Threesome',          slug: 'threesome'          },
    { title: 'Toys',                slug: 'toys'               },
    { title: 'Uniform',            slug: 'uniform'           },
    { title: 'Vintage',            slug: 'vintage'            },
    { title: 'Webcam',             slug: 'webcam'              },
  ];

  // ----------------------------------------------------------
  // ТРАНСПОРТ
  // ----------------------------------------------------------
  function httpGet(url, success, error) {
    console.log('[hdtub] httpGet →', url.substring(0, 100));
    
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      console.log('[hdtub] Using AdultPlugin.networkRequest');
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      console.log('[hdtub] Using fetch() fallback');
      fetch(url)
        .then(function (r) { 
          console.log('[hdtub] fetch status:', r.status);
          return r.text(); 
        })
        .then(success)
        .catch(function(e) {
          console.error('[hdtub] fetch error:', e.message);
          error(e);
        });
    }
  }

  // ----------------------------------------------------------
  // ОЧИСТКА URL [КРИТИЧНО ДЛЯ DEBUG]
  // ----------------------------------------------------------
  function cleanUrl(url) {
    console.log('[hdtub] cleanUrl INPUT:', url ? url.substring(0, 120) : 'EMPTY');
    
    if (!url) {
      console.log('[hdtub] cleanUrl: empty input');
      return '';
    }
    
    var u = url.replace(/\\/g, '');
    console.log('[hdtub] cleanUrl after unescape:', u.substring(0, 120));

    // [1.3.1] Убираем "function/N/" прокси-префикс hdtube
    var funcMatch = u.match(/^https?:\/\/[^/]+\/function\/\d+\/(https?:\/\/.+)$/);
    if (funcMatch) {
      u = funcMatch[1];
      console.log('[hdtub] cleanUrl: stripped function/N prefix →', u.substring(0, 120));
    } else {
      console.log('[hdtub] cleanUrl: no function/N prefix found');
    }

    if (u.indexOf('//') === 0) {
      console.log('[hdtub] cleanUrl: adding https:');
      u = 'https:' + u;
    }
    
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') {
      console.log('[hdtub] cleanUrl: relative path, prepending HOST');
      u = HOST + u;
    }
    
    console.log('[hdtub] cleanUrl OUTPUT:', u.substring(0, 120));
    return u;
  }

  // ----------------------------------------------------------
  // ПАРСИНГ КАТАЛОГА
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    console.log('[hdtub] parsePlaylist called');
    var results = [];
    
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var items = doc.querySelectorAll('.item');
    console.log('[hdtub] Found .item elements:', items.length);

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var linkEl = el.querySelector('a[href]');
      
      if (!linkEl) {
        console.log('[hdtub] Item', i, ': no link element');
        continue;
      }

      var href = linkEl.getAttribute('href') || '';
      console.log('[hdtub] Item', i, 'raw href:', href.substring(0, 100));
      
      if (!href) continue;
      
      // Очищаем и нормализуем
      var cleanHref = cleanUrl(href);
      console.log('[hdtub] Item', i, 'clean href:', cleanHref.substring(0, 100));

      var imgEl = el.querySelector('img');
      var pic = '';
      if (imgEl) {
        pic = imgEl.getAttribute('data-src') || 
              imgEl.getAttribute('src') || '';
        console.log('[hdtub] Item', i, 'img src:', Pic ? Pic.substring(0, 80) : 'none');
      }
      
      var titleEl = el.querySelector('a[title]');
      var name = '';
      if (titleEl) {
        name = (titleEl.getAttribute('title') || titleEl.textContent)
                .replace(/\s+/g, ' ').trim();
      }
      if (!name) name = 'Video';

      results.push({
        name: name,
        video: cleanHref,
        picture: pic,
        img: pic,
        poster: pic,
        background_image: pic,
        time: '',
        quality: 'HD',
        json: true,
        source: NAME,
      });
    }

    console.log('[hdtub] parsePlaylist returning', results.length, 'items');
    return results;
  }

  // ----------------------------------------------------------
  // ИЗВЛЕЧЕНИЕ КАЧЕСТВ [КРИТИЧНО ДЛЯ DEBUG]
  // ----------------------------------------------------------
  function extractQualities(html) {
    console.log('[hdtub] extractQualities called, html length:', html.length);
    var q = {};
    var debugSteps = [];

    // Стратегия 1: kt_player (основная)
    var m720 = html.match(/video_url\s*[:=]\s*['"]([^'"]+)['"]/);
    debugSteps.push('720p regex match: ' + (m720 ? 'YES' : 'NO'));
    
    if (m720) {
      var raw720 = m720[1];
      debugSteps.push('720p raw: ' + raw720.substring(0, 100));
      
      var clean720 = cleanUrl(raw720);
      debugSteps.push('720p cleaned: ' + clean720.substring(0, 100));
      
      // Проверка домена
      if (clean720.indexOf('hdtube.porn') === -1) {
        debugSteps.push('⚠️ 720p domain check: FAILED - no hdtube.porn in URL');
      } else {
        debugSteps.push('✅ 720p domain check: OK');
      }
      
      q['720p'] = clean720;
    }

    var m480 = html.match(/video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/);
    debugSteps.push('480p regex match: ' + (m480 ? 'YES' : 'NO'));
    
    if (m480) {
      var raw480 = m480[1];
      debugSteps.push('480p raw: ' + raw480.substring(0, 100));
      
      var clean480 = cleanUrl(raw480);
      debugSteps.push('480p cleaned: ' + clean480.substring(0, 100));
      
      if (clean480.indexOf('hdtube.porn') === -1) {
        debugSteps.push('⚠️ 480p domain check: FAILED');
      } else {
        debugSteps.push('✅ 480p domain check: OK');
      }
      
      q['480p'] = clean480;
    }

    // Fallback: <source> теги
    if (Object.keys(q).length === 0) {
      debugSteps.push('No kt_player matches, trying <source> tags');
      var srcRegex = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi;
      var SrcMatch;
      var sourceCount = 0;
      
      while ((SrcMatch = srcRegex.exec(html)) !== null) {
        sourceCount++;
        var SrcUrl = SrcMatch[1];
        debugSteps.push('Source ' + SourceCount + ': ' + SrcUrl.substring(0, 80));
        
        var labelMatch = srcMatch[0].match(/label=["']([^""]+)["']/);
        var SizeMatch = srcMatch[0].match(/size=["']([^""]+)["']/);
        var lb = (labelMatch ? labelMatch[1] : '') || (sizeMatch ? sizeMatch[1] + 'p' : 'HD');
        
        q[lb] = SrcUrl;
        debugSteps.push('Added as: ' + lb);
      }
    }

    // Выводим все debug шаги
    debugSteps.forEach(function(step) {
      console.log('[hdtub] ' + step);
    });

    console.log('[hdtub] Final qualities:', JSON.stringify(Object.keys(q)));
    return q;
  }

  // ----------------------------------------------------------
  // URL BUILDER
  // ----------------------------------------------------------
  function buildUrl(type, value, page) {
    page = parseInt(page, 10) || 1;
    
    if (type === 'search') {
      var url = HOST + '/?q=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
      console.log('[hdtub] buildUrl search:', url.substring(0, 100));
      return url;
    } else if (type === 'cat') {
      // [ВАЖНО] JSON указывает /?c={slug}, но дамп показывает /amateur.porn
      // Пробуем оба варианта для совместимости
      var url = HOST + '/?c=' + encodeURIComponent(value);
      if (page > 1) url += '&page=' + page;
      console.log('[hdtub] buildUrl cat (param):', url.substring(0, 100));
      return url;
    } else {
      if (page > 1) {
        var url = HOST + '/?page=' + page;
        console.log('[hdtub] buildUrl main:', url.substring(0, 100));
        return url;
      }
      console.log('[hdtub] buildUrl main (default):', HOST);
      return HOST;
    }
  }

  function buildMenu() {
    return [
      { title: '🔍 Поиск', search_on: true, playlist_url: NAME + '/search/' },
      { title: '🔥 Новое',  playlist_url: NAME + '/new' },
      {
        title: '📂 Категории',
        playlist_url: 'submenu',
        submenu: CATEGORIES.map(function (c) {
          return { title: c.title, playlist_url: NAME + '/cat/' + c.slug };
        }),
      },
    ];
  }

  // ----------------------------------------------------------
  // РОУТИНГ
  // ----------------------------------------------------------
  function routeView(url, page, success, error) {
    console.log('[hdtub] routeView:', url ? url.substring(0, 100) : 'EMPTY', 'page:', page);
    
    var fetchUrl;
    var sm = url.match(/[?&]search=([^&]*)/);
    
    if (sm) {
      fetchUrl = buildUrl('search', decodeURIComponent(sm[1]), page);
    } else if (url.indexOf(NAME + '/cat/') === 0) {
      fetchUrl = buildUrl('cat', url.replace(NAME + '/cat/', '').split('?')[0], page);
    } else if (url.indexOf(NAME + '/search/') === 0) {
      var q = decodeURIComponent(url.replace(NAME + '/search/', '').split('?')[0]).trim();
      fetchUrl = buildUrl('search', q, page);
    } else {
      fetchUrl = buildUrl('main', null, page);
    }

    console.log('[hdtub] Fetching:', fetchUrl.substring(0, 120));
    
    httpGet(fetchUrl, function (html) {
      console.log('[hdtub] Response received, length:', html.length);
      var results = parsePlaylist(html);
      
      if (!results.length) {
        console.warn('[hdtub] ⚠️ No results parsed!');
      }
      
      success({ 
        results: results, 
        collection: true, 
        total_pages: page + 1,
        menu: buildMenu() 
      });
    }, function (e) {
      console.error('[hdtub] routeView error:', e);
      error(e);
    });
  }

  // ----------------------------------------------------------
  // API
  // ----------------------------------------------------------
  var HdtubParser = {
    main: function (p, s, e) { 
      console.log('[hdtub] API.main called');
      routeView(NAME + '/new', 1, s, e); 
    },
    
    view: function (p, s, e) { 
      console.log('[hdtub] API.view called, url:', (p.url || '').substring(0, 100));
      routeView(p.url || NAME, p.page || 1, s, e); 
    },
    
    search: function (p, s, e) {
      console.log('[hdtub] API.search called, query:', p.query);
      var query = (p.query || '').trim();
      httpGet(buildUrl('search', query, p.page || 1), function (html) {
        s({ 
          title: 'HDtube: ' + query, 
          results: parsePlaylist(html), 
          collection: true, 
          total_pages: 2 
        });
      }, e);
    },
    
    qualities: function (videoPageUrl, success, error) {
      console.log('[hdtub] API.qualities called:', videoPageUrl.substring(0, 100));
      
      httpGet(videoPageUrl, function (html) {
        console.log('[hdtub] qualities response length:', html.length);
        
        if (!html || html.length < 500) {
          console.error('[hdtub] HTML too short or empty');
          error('Страница недоступна');
          return;
        }

        var found = extractQualities(html);
        var keys = Object.keys(found);
        console.log('[hdtub] Qualities found:', Keys.length, Keys.join(', '));

        if (keys.length > 0) {
          success({ qualities: found });
        } else {
          console.error('[hdtub] No qualities extracted!');
          error('Видео не найдено');
        }
      }, function (e) {
        console.error('[hdtub] qualities fetch error:', e);
        error(e);
      });
    },
  };

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, HdtubParser);
      console.log('[hdtub] ✅ Registered successfully');
      return true;
    }
    console.log('[hdtub] ⚠️ AdultPlugin not ready yet');
    return false;
  }

  if (!tryRegister()) {
    var poll = setInterval(function () {
      if (tryRegister()) clearInterval(poll);
    }, 200);
    setTimeout(function () { clearInterval(poll); }, 5000);
  }

})();
