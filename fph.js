(function () {
  'use strict';
  var VERSION = '1.1.0';
  var NAME    = 'fph';
  var HOST    = 'https://ru.faphouse.com';
  var TAG     = '[' + NAME + ']';

  var VIDEO_RULES = [
    { label: 'HD', re: /video_url\s*[:=]\s*['"]([^'"]+)['"]/ },
    { label: 'SD', re: /video_alt_url\s*[:=]\s*['"]([^'"]+)['"]/ },
    { label: 'HLS', re: /['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/ },
    { label: 'MP4', re: /['"](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)['"]/ }
  ];

  var CARD_SELECTORS = ['.thumb', '.video-item', '.item'];

  var CATEGORIES = [
    {title:"Такси",slug:"taxi"},{title:"Нудизм",slug:"nudist"},{title:"Ужасы",slug:"horror"},
    {title:"Средние века",slug:"medieval"},{title:"Индийки",slug:"indian"},{title:"18 летние",slug:"18-year-old"},
    {title:"Японки",slug:"japanese"},{title:"Русские",slug:"russian"},{title:"Мамки",slug:"mom"},
    {title:"Американки",slug:"american"},{title:"Домашнее",slug:"homemade"},{title:"Любительницы",slug:"amateur"},
    {title:"Зрелые",slug:"mature"},{title:"Немцы",slug:"german"},{title:"Дези",slug:"desi"},
    {title:"Анал",slug:"anal"},{title:"Большие жопы",slug:"big-ass"},{title:"Милфа",slug:"milf"}
  ];

  function httpGet(url, s, e) {
    if (window.AdultPlugin && window.AdultPlugin.networkRequest) window.AdultPlugin.networkRequest(url, s, e);
    else fetch(url).then(function(r){return r.text();}).then(s).catch(e);
  }
  function cleanUrl(r) {
    if(!r) return ''; try { var u=r.replace(/\\\//g,'/').replace(/\\/g,'');
    if(u.indexOf('%')!==-1) try{u=decodeURIComponent(u);}catch(e){}
    if(u.indexOf('//')===0) u='https:'+u; if(u.charAt(0)==='/'&&u.charAt(1)!=='/') u=HOST+u;
    if(u.length>0&&u.indexOf('http')!==0&&u.charAt(0)!=='/') u=HOST+'/'+u; return u; } catch(e){return r;}
  }
  function extractQualities(html) {
    var q={}, add=function(l,u){var c=cleanUrl(u);if(c&&c.indexOf('{')===-1&&!q[l])q[l]=c;}, m;
    VIDEO_RULES.forEach(function(r){m=html.match(r.re);if(m&&m[1])add(r.label,m[1]);});
    if(!Object.keys(q).length){
      try{var doc=new DOMParser().parseFromString(html,'text/html');
      doc.querySelectorAll('video source[src]').forEach(function(s){var src=s.getAttribute('src');if(src&&src.indexOf('blob:')!==0)add(s.getAttribute('label')||'Auto',src);});}catch(e){}
    }
    if(!Object.keys(q).length){var a=html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi);if(a)a.forEach(function(u,i){add('HD'+(i||''),u);});}
    return q;
  }
  function makeCard(n,h,p,t){return{name:n,video:h,picture:p,img:p,poster:p,background_image:p,preview:null,time:t||'',quality:'HD',json:true,source:NAME};}
  function parseCard(el) {
    var a=el.querySelector('a[href*="/videos/"]'); if(!a) return null;
    // Обрезаем якорь #dmVwPU1haW4... который идет в ссылках FapHouse
    var rawHref = (a.getAttribute('href') || '').split('#')[0];
    var href=cleanUrl(rawHref); if(!href) return null;
    var img=el.querySelector('img'); var pic=img?cleanUrl(img.getAttribute('src')||''):'';
    if(pic&&pic.indexOf('data:image')===0)pic='';
    var t=el.querySelector('[class*="title"]'); var name=t?t.textContent.trim():''; 
    if(!name) name = (a.getAttribute('title') || 'Video').trim();
    name=name.replace(/[\t\n\r]+/g,' ').replace(/\s{2,}/g,' ').trim(); if(!name) return null;
    var d=el.querySelector('span'); var time=d?d.textContent.replace(/[^\d:]/g,'').trim():'';
    return makeCard(name,href,pic,time);
  }
  function parsePlaylist(html) {
    var res=[], doc=new DOMParser().parseFromString(html,'text/html'), items;
    for(var s=0;s<CARD_SELECTORS.length;s++){items=doc.querySelectorAll(CARD_SELECTORS[s]);if(items&&items.length)break;}
    if(!items||!items.length) items=doc.querySelectorAll('a[href*="/videos/"]');
    if(items) for(var i=0;i<items.length;i++){var c=parseCard(items[i]);if(c)res.push(c);}
    return res;
  }
  function buildUrl(type,value,page) {
    page=parseInt(page,10)||1; var url=HOST;
    if(type==='search') url+='/search/videos?q='+encodeURIComponent(value)+'&page='+page;
    else if(type==='cat') url+='/?c='+value+'&page='+page;
    else url+='/?page='+page;
    return url;
  }
  function buildMenu() {
    return [
      {title:'🔍 Поиск',search_on:true,playlist_url:NAME+'/search/'},
      {title:'🔥 Новинки',playlist_url:NAME+'/main'},
      {title:'📂 Категории',playlist_url:'submenu',submenu:CATEGORIES.map(function(c){return{title:c.title,playlist_url:NAME+'/cat/'+c.slug};})}
    ];
  }
  function routeView(url,page,success,error) {
    var fetchUrl; var sm=url.match(/[?&]search=([^&]*)/);
    if(sm){fetchUrl=buildUrl('search',decodeURIComponent(sm[1]),page);}
    else if(url.indexOf(NAME+'/cat/')===0){fetchUrl=buildUrl('cat',url.replace(NAME+'/cat/','').split('?')[0],page);}
    else if(url.indexOf(NAME+'/search/')===0){var rq=decodeURIComponent(url.replace(NAME+'/search/','').split('?')[0]).trim();if(rq)fetchUrl=buildUrl('search',rq,page);}
    else fetchUrl=buildUrl('main',null,page);
    
    httpGet(fetchUrl,function(html){
      var res=parsePlaylist(html); if(!res.length){error('Не найдено');return;}
      success({results:res,collection:true,total_pages:res.length>=24?page+1:page,menu:buildMenu()});
    },error);
  }
  var FPHParser = {
    main:function(p,s,e){routeView(NAME+'/main',1,s,e);},
    view:function(p,s,e){routeView(p.url||NAME,p.page||1,s,e);},
    search:function(p,s,e){
      var q=(p.query||'').trim(),pg=parseInt(p.page,10)||1; if(!q){s({title:'',results:[],collection:true,total_pages:1});return;}
      httpGet(buildUrl('search',q,pg),function(html){var r=parsePlaylist(html);s({title:'FapHouse: '+q,results:r,collection:true,total_pages:r.length>=24?pg+1:pg});},e);
    },
    qualities:function(vUrl,s,e){
      httpGet(vUrl,function(html){
        if(!html||html.length<500){e('Недоступно');return;}
        var f=extractQualities(html); if(Object.keys(f).length>0) s({qualities:f}); else e('Видео не найдено');
      },e);
    }
  };
  function tryRegister(){if(window.AdultPlugin&&window.AdultPlugin.registerParser){window.AdultPlugin.registerParser(NAME,FPHParser);return true;}return false;}
  if(!tryRegister()){var poll=setInterval(function(){if(tryRegister())clearInterval(poll);},200);setTimeout(function(){clearInterval(poll);},5000);}
})();
