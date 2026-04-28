(function () {
  'use strict';
  var VERSION = '1.1.0';
  var NAME    = 'szpn';
  var HOST    = 'https://sexzoo.net';
  var TAG     = '[' + NAME + ']';

  var VIDEO_RULES = [
    { label: 'HD', re: /https?:\/\/247sexvideo\.net\/[^"'\s]+\.mp4/ },
    { label: 'MP4', re: /['"](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)['"]/ },
    { label: 'HLS', re: /['"](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)['"]/ }
  ];

  var CARD_SELECTORS = ['.item', '.video', 'div.th'];

  function httpGet(url, s, e) {
    if (window.AdultPlugin && window.AdultPlugin.networkRequest) window.AdultPlugin.networkRequest(url, s, e);
    else fetch(url).then(function(r){return r.text();}).then(s).catch(e);
  }
  function cleanUrl(r) {
    if(!r) return ''; try { var u=r.replace(/\\\//g,'/').replace(/\\/g,'');
    if(u.indexOf('//')===0) u='https:'+u; if(u.charAt(0)==='/'&&u.charAt(1)!=='/') u=HOST+u;
    if(u.length>0&&u.indexOf('http')!==0&&u.charAt(0)!=='/') u=HOST+'/'+u; return u; } catch(e){return r;}
  }
  function extractQualities(html) {
    var q={}, add=function(l,u){var c=cleanUrl(u);if(c&&c.indexOf('{')===-1&&!q[l])q[l]=c;}, m;
    VIDEO_RULES.forEach(function(r){m=html.match(r.re);if(m&&m[1])add(r.label,m[1]);});
    if(!Object.keys(q).length){var a=html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi);if(a)a.forEach(function(u,i){add('HD'+(i||''),u);});}
    return q;
  }
  function makeCard(n,h,p,t){return{name:n,video:h,picture:p,img:p,poster:p,background_image:p,preview:null,time:t||'',quality:'HD',json:true,source:NAME};}
  function parseCard(el) {
    var a=el.querySelector('a[href*="/movie/"]')||el.querySelector('a[href]'); if(!a) return null;
    var href=cleanUrl(a.getAttribute('href')); if(!href) return null;
    var img=el.querySelector('img'); var pic=img?cleanUrl(img.getAttribute('src')||img.getAttribute('data-src')||''):'';
    if(pic&&pic.indexOf('data:image')===0)pic='';
    var name=(a.getAttribute('title')||a.textContent||'').trim(); if(!name)name='Video';
    name=name.replace(/[\t\n\r]+/g,' ').replace(/\s{2,}/g,' ').trim(); if(!name) return null;
    var d=el.querySelector('[class*="duration"],.info'); var time=d?d.textContent.replace(/[^\d:]/g,'').trim():'';
    return makeCard(name,href,pic,time);
  }
  function parsePlaylist(html) {
    var res=[], doc=new DOMParser().parseFromString(html,'text/html'), items;
    for(var s=0;s<CARD_SELECTORS.length;s++){items=doc.querySelectorAll(CARD_SELECTORS[s]);if(items&&items.length)break;}
    if(!items||!items.length) items=doc.querySelectorAll('a[href*="/movie/"]');
    if(items) for(var i=0;i<items.length;i++){var c=parseCard(items[i]);if(c)res.push(c);}
    return res;
  }
  function buildUrl(type,value,page) {
    page=parseInt(page,10)||1; var url=HOST+'/ru/movie/';
    if(type==='search') url+='?q='+encodeURIComponent(value)+'&page='+page;
    else if(type==='cat') url+='?c='+value+'&page='+page;
    else url+='?page='+page;
    return url;
  }
  function buildMenu() {
    return [{title:'🔍 Поиск',search_on:true,playlist_url:NAME+'/search/'},{title:'🔥 Новинки',playlist_url:NAME+'/main'}];
  }
  function routeView(url,page,success,error) {
    var fetchUrl; var sm=url.match(/[?&]search=([^&]*)/);
    if(sm){fetchUrl=buildUrl('search',decodeURIComponent(sm[1]),page);}
    else if(url.indexOf(NAME+'/cat/')===0){fetchUrl=buildUrl('cat',url.replace(NAME+'/cat/','').split('?')[0],page);}
    else if(url.indexOf(NAME+'/search/')===0){var rq=decodeURIComponent(url.replace(NAME+'/search/','').split('?')[0]).trim();if(rq)fetchUrl=buildUrl('search',rq,page);}
    else fetchUrl=buildUrl('main',null,page);
    
    httpGet(fetchUrl,function(html){
      var res=parsePlaylist(html); if(!res.length){error('Не найдено');return;}
      success({results:res,collection:true,total_pages:res.length>=20?page+1:page,menu:buildMenu()});
    },error);
  }
  var SZParser = {
    main:function(p,s,e){routeView(NAME+'/main',1,s,e);},
    view:function(p,s,e){routeView(p.url||NAME,p.page||1,s,e);},
    search:function(p,s,e){
      var q=(p.query||'').trim(),pg=parseInt(p.page,10)||1; if(!q){s({title:'',results:[],collection:true,total_pages:1});return;}
      httpGet(buildUrl('search',q,pg),function(html){var r=parsePlaylist(html);s({title:'SexZoo: '+q,results:r,collection:true,total_pages:r.length>=20?pg+1:pg});},e);
    },
    qualities:function(vUrl,s,e){
      httpGet(vUrl,function(html){
        if(!html||html.length<500){e('Недоступно');return;}
        var f=extractQualities(html); if(Object.keys(f).length>0) s({qualities:f}); else e('Видео не найдено');
      },e);
    }
  };
  function tryRegister(){if(window.AdultPlugin&&window.AdultPlugin.registerParser){window.AdultPlugin.registerParser(NAME,SZParser);return true;}return false;}
  if(!tryRegister()){var poll=setInterval(function(){if(tryRegister())clearInterval(poll);},200);setTimeout(function(){clearInterval(poll);},5000);}
})();
