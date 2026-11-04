var BG_CATEGORY_KEY='jf_bg_category';
var BG_READY_KEY='jf_bg_ready';
function isBgCategory(value){
    return /^[a-z0-9-]{1,32}$/.test(String(value||''));
}
function isUserWallpaper(url){
    return /^https:\/\/[^?#]+\/whatab\/[0-9]+\/[a-f0-9]{16}\.(jpg|png|webp)$/i.test(String(url||'').split('?')[0]);
}
function isLibraryWallpaper(url){
    return /\/wallpapers\/[a-z0-9-]+\/[a-f0-9]{16}\.jpg$/i.test(String(url||'').split('?')[0]);
}
function wallpaperInCategory(url, category){
    if(category==='custom' || category==='share') return isUserWallpaper(url);
    var path=String(url||'').split('?')[0];
    if(!isBgCategory(category)) return false;
    if(path.indexOf('/uploads/bg/'+category+'/')===0) return true;
    return isLibraryWallpaper(path) && path.indexOf('/wallpapers/'+category+'/')!==-1;
}
function thumbForWallpaper(url){
    var path=String(url||'').split('?')[0];
    var matched=path.match(/^(.*\/wallpapers\/[a-z0-9-]+)\/([a-f0-9]{16}\.jpg)$/i);
    if(!matched || /\/400$/i.test(matched[1])){
        return '';
    }
    return matched[1]+'/400/'+matched[2];
}
function rememberedThumb(url){
    try{
        var data=JSON.parse(localStorage.getItem('jf_bg_thumb')||'');
        if(data && data.url===url && data.thumb && data.thumb!==url){
            return data.thumb;
        }
    }catch(e){}
    return '';
}
function rememberThumb(url, thumb){
    if(!url || !thumb || thumb===url){
        return;
    }
    try{
        localStorage.setItem('jf_bg_thumb', JSON.stringify({url:url, thumb:thumb}));
    }catch(e){}
}
var wallpaperPaintSeq=0;
function paintWallpaper(node, url, thumb){
    if(!node){
        return;
    }
    var full=cssBackgroundUrl(String(url||'').split('?')[0]);
    if(!full){
        return;
    }
    var preview=thumb || rememberedThumb(full) || thumbForWallpaper(full);
    if(!preview || preview===full){
        preview='';
    }
    var seq=++wallpaperPaintSeq;
    node.dataset.bgPaint=String(seq);
    function apply(imageUrl){
        if(node.dataset.bgPaint!==String(seq)){
            return;
        }
        node.style.backgroundImage='url("'+imageUrl+'")';
        if(isUserWallpaper(full)){
            node.style.backgroundSize='contain';
            node.style.backgroundColor='#111111';
        }else{
            node.style.backgroundSize='cover';
            node.style.backgroundColor='transparent';
        }
    }
    if(preview){
        rememberThumb(full, preview);
        apply(preview);
        var img=new Image();
        img.onload=function(){
            apply(full);
        };
        img.src=full;
        return;
    }
    apply(full);
}
function isWallpaperPath(url){
    var path=String(url||'').split('?')[0];
    return /^\/uploads\/bg\/[a-z0-9-]+\/[a-z0-9-]+\.jpg$/.test(path) || isUserWallpaper(path) || isLibraryWallpaper(path);
}
function readStoredCategory(){
    var value='';
    try{
        value=localStorage.getItem(BG_CATEGORY_KEY)||'';
    }catch(e){}
    if(!isBgCategory(value) && typeof getCookie==='function'){
        value=getCookie(BG_CATEGORY_KEY)||'';
    }
    value=String(value||'').trim();
    return isBgCategory(value) ? value : '';
}
function writeStoredCategory(category){
    if(!isBgCategory(category)){
        return;
    }
    try{
        localStorage.setItem(BG_CATEGORY_KEY, category);
    }catch(e){}
    var exp=new Date();
    exp.setTime(exp.getTime()+365*24*60*60*1000);
    document.cookie=BG_CATEGORY_KEY+'='+encodeURIComponent(category)+';path=/;expires='+exp.toUTCString();
}
function readReadyWallpaper(){
    try{
        var data=JSON.parse(localStorage.getItem(BG_READY_KEY)||'');
        var category=readStoredCategory();
        if(!data || !data.url){
            return null;
        }
        if(category){
            if(data.category===category && wallpaperInCategory(data.url, category)){
                return data;
            }
            return null;
        }
        if(!data.category && isWallpaperPath(data.url)){
            return data;
        }
    }catch(e){}
    return null;
}
var NAV_CATEGORY_KEY='jf_nav_categories';
function parseNavCategoryRaw(raw){
    if(!raw){
        return [];
    }
    try{
        var parsed=JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }catch(e){}
    try{
        var decoded=JSON.parse(decodeURIComponent(raw));
        return Array.isArray(decoded) ? decoded : [];
    }catch(e2){}
    return [];
}
function readNavCategories(){
    var raw='';
    try{
        raw=localStorage.getItem(NAV_CATEGORY_KEY)||'';
    }catch(e){}
    if(!raw && typeof getCookie==='function'){
        raw=getCookie(NAV_CATEGORY_KEY)||'';
    }
    var seen={};
    var safe=[];
    var list=parseNavCategoryRaw(raw);
    for(var i=0;i<list.length;i++){
        var code=String(list[i]||'').trim();
        if(!/^[a-z0-9-]{1,32}$/.test(code) || seen[code]){
            continue;
        }
        seen[code]=1;
        safe.push(code);
    }
    return safe;
}
function saveUserPref(fields){
    var fd=new FormData();
    for(var key in fields){
        if(Object.prototype.hasOwnProperty.call(fields, key)){
            fd.append(key, fields[key]);
        }
    }
    var req=new XMLHttpRequest();
    req.open('POST','/home/user/prefs',true);
    req.send(fd);
}
function writeNavCategories(list){
    var raw=JSON.stringify(list);
    try{
        localStorage.setItem(NAV_CATEGORY_KEY, raw);
    }catch(e){}
    var exp=new Date();
    exp.setTime(exp.getTime()+365*24*60*60*1000);
    document.cookie=NAV_CATEGORY_KEY+'='+encodeURIComponent(raw)+';path=/;expires='+exp.toUTCString();
}
function cssBackgroundUrl(value){
    var text=String(value||'');
    var matched=text.match(/url\((['"]?)(.*?)\1\)/i);
    if(matched){
        text=matched[2];
    }
    return text.replace('/400/','/');
}
(function(){
    var shareNow=/(?:^|[?&])share=[a-f0-9]{32}(?:&|$)/i.test(location.search) || /(?:^|;\s*)wa_shared=1(?:;|$)/.test(document.cookie);
    if(shareNow){
        return;
    }
    var ready=readReadyWallpaper();
    var bg=document.getElementById('bg-wrap');
    if(!ready || !bg){
        return;
    }
    paintWallpaper(bg, ready.url, ready.thumb);
})();
function consolejs(uiData){
    var setState=null;//当前设置项

    //获取壁纸--------------------------
    // var oBgWrap=document.getElementById('bg-wrap');
    //打开页面时的壁纸。未选分类时从全部壁纸里轮换，已选分类时只在该分类里轮换。
    function applyBg(url, thumb){
        uiData['bg_url']=url;
        paintWallpaper($('#bg-wrap')[0], url, thumb);
        setCookie('loadingbg',url,365);
    }
    var savedBgCategory=readStoredCategory();
    var bgRotateSeq=0;
    if(savedBgCategory){
        writeStoredCategory(savedBgCategory);
    }
    if(!window.__jfBgBooted){
        window.__jfBgBooted=true;
        var readyWallpaper=readReadyWallpaper();
        if(savedBgCategory && readyWallpaper){
            applyBg(readyWallpaper.url, readyWallpaper.thumb);
            markBgUsed(readyWallpaper.url);
            preloadNextBg(savedBgCategory, readyWallpaper.url);
        }
        else if(savedBgCategory){
            var cookieBg=(typeof getCookie==='function') ? getCookie('loadingbg') : '';
            if(wallpaperInCategory(cookieBg, savedBgCategory)){
                applyBg(cookieBg);
            }
            rotateBg(savedBgCategory, function(url){
                preloadNextBg(savedBgCategory, url);
            });
        }
        else if(window.__jfUser && window.__jfUser.user_type==1 && isWallpaperPath(uiData['bg_url'])){
            applyBg(uiData['bg_url']);
        }
        else if(readyWallpaper){
            applyBg(readyWallpaper.url, readyWallpaper.thumb);
            markBgUsed(readyWallpaper.url);
            preloadNextBg('', readyWallpaper.url);
        }
        else{
            var savedBg=(typeof getCookie==='function') ? getCookie('loadingbg') : '';
            if(isWallpaperPath(savedBg)){
                applyBg(savedBg);
            }
            rotateBg('', function(url){
                preloadNextBg('', url);
            });
        }
    }
    // var oBg=document.createElement('iframe');
    // oBg.id="bg";
    // oBgWrap.appendChild(oBg);

    // oBg.src='/home/bg/show?type=show&picurl=';

    //切换随机壁纸图片--------------------------
    $('.console-randbg-btn').off('click').on('click', function(){
        var category=readStoredCategory();
        rotateBg(category, function(url){
            preloadNextBg(category, url);
        }, true);
    });

    function showShareLink(data){
        var box=document.getElementById('share-link-box');
        if(!box){
            box=document.createElement('div');
            box.id='share-link-box';
            box.style.cssText='position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;';
            var card=document.createElement('div');
            card.style.cssText='width:min(440px,calc(100% - 32px));background:#fff;color:#333;border-radius:12px;padding:20px;line-height:1.6;';
            card.innerHTML='<div style="font-size:16px;margin-bottom:8px;">分享我的主页</div><p id="share-link-note" style="margin:0 0 8px;font-size:13px;color:#666;"></p><input id="share-link-input" readonly style="width:100%;box-sizing:border-box;margin:8px 0;padding:8px;border:1px solid #ddd;border-radius:8px;color:#333;"><p id="share-link-stat" style="margin:0 0 8px;font-size:13px;color:#666;"></p><div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;"><a id="share-manage-link" href="/share" style="margin-right:auto;color:#2c7bf6;">管理分享</a><button type="button" id="share-copy-btn" style="border:0;border-radius:100px;padding:8px 16px;background:#2c7bf6;color:#fff;cursor:pointer;">复制链接</button><button type="button" id="share-close-btn" style="border:0;border-radius:100px;padding:8px 16px;background:#f2f2f2;color:#333;cursor:pointer;">关闭</button></div>';
            box.appendChild(card);
            document.body.appendChild(box);
            box.addEventListener('click', function(event){
                if(event.target===box){
                    box.style.display='none';
                }
            });
            document.getElementById('share-close-btn').onclick=function(){
                box.style.display='none';
            };
            document.getElementById('share-copy-btn').onclick=function(){
                var input=document.getElementById('share-link-input');
                var button=this;
                input.select();
                var done=function(){
                    button.textContent='已复制';
                    setTimeout(function(){ button.textContent='复制链接'; }, 1500);
                };
                if(navigator.clipboard && navigator.clipboard.writeText){
                    navigator.clipboard.writeText(input.value).then(done, function(){});
                }
            };
        }
        document.getElementById('share-link-note').textContent=data.reused
            ? '这是你正在使用的分享链接。要新建或停止，请打开「分享主页」。'
            : '已生成分享链接。别人打开后，壁纸库里会出现「分享」，可以预览和轮播你上传的壁纸。';
        document.getElementById('share-link-input').value=data.url||'';
        document.getElementById('share-link-stat').textContent=data.open_count
            ? ('已打开 '+data.open_count+' 次'+(data.last_opened_at ? '，最近 '+data.last_opened_at : ''))
            : '还没有人打开';
        box.style.display='flex';
    }

    $('.console-share-btn').off('click').on('click', function(){
        if(!(window.__jfUser && Number(window.__jfUser.user_type)===1)){
            showLoginBtn();
            return;
        }
        var req=new XMLHttpRequest();
        req.open('POST','/home/share/create',true);
        var fd=new FormData();
        fd.append('reuse','1');
        req.onreadystatechange=function(){
            if(req.readyState!==4){
                return;
            }
            var data={};
            try{ data=JSON.parse(req.response||'{}'); }catch(e){}
            if(req.status===200 && data.url){
                showShareLink(data);
                return;
            }
            if(data.login){
                showLoginBtn();
                return;
            }
            showmsg(data.error||'暂时无法创建分享', 4000);
        };
        req.send(fd);
    });

    //下载当前壁纸    
    $('.console-downloadcurrent-btn').click(function(){
        window.open(uiData['bg_url']);
    });

    // console.log(uiData['site_opacity']);
    if(uiData){        
        // var tempUiData=uiData;
        let tempUiData1 = $.extend(true,[],uiData);
        var tempUiData=tempUiData1;
        uiDrawing(uiData,0);
    } 





    //ui panel
    $('.ui-adjust-btn').mousedown(function(){
        uiAdjust(this,this.dataset.paramsname,this.dataset.paramsmin,this.dataset.paramsmax,this.dataset.paramsunit);	
    });

    $('.ui-switch-btn').click(function(){
        if(parseInt(tempUiData[this.dataset.paramsname])==1){
            this.className="ui-switch-btn ui-switch-btn-0";
            tempUiData[this.dataset.paramsname]=0;
        }
        else{
            this.className="ui-switch-btn ui-switch-btn-1";
            tempUiData[this.dataset.paramsname]=1;
        }
        
        //showConsoleBtn(tempUiData);
        uiDrawing(tempUiData,1);
    });

    // $('.uiAdjustSearchWidth .uiAdjustBtn')[0].onmousedown=function(){
    //     uiAdjust(this,'searchWidth','20','100','%');	
    // }

    //ui滑动按钮
    function uiAdjust(btnObj,paramsName,paramsMin,paramsMax,paramsUnit,e){
        var evt=e||event;
        var btnx=evt.clientX-btnObj.offsetLeft;	//按钮初始位置

        document.onmousemove=function(ev){			
            var event=ev||event;
            var moveLength=event.clientX-btnx;
            var adjustLength=btnObj.parentNode.offsetWidth-btnObj.offsetWidth;
            if(moveLength<=0){
                moveLength=0;
            }			
            else if(moveLength>=adjustLength){
                moveLength=adjustLength;
            }
            var paramObj=btnObj.parentNode.parentNode.getElementsByClassName('ui-params')[0];
            var params=parseInt(paramsMin)+parseInt(moveLength/adjustLength*(paramsMax-paramsMin));
            paramObj.innerHTML=params+paramsUnit;			
            btnObj.style.left=moveLength+'px';
            btnObj.parentNode.getElementsByClassName('ui-adjust-line')[0].style.width=moveLength+2+'px';
            tempUiData[paramsName]=params;
            //showConsoleBtn(tempUiData);
            uiDrawing(tempUiData,1);

        }

        document.onmouseup=function(){
            document.onmousemove=null;
        }
    }

    //ui切换按钮
    function uiSwitch(){

    }

    function initConsoleBtn(uiData){   
        for (let o in uiData) {
            for(var j=0;j<$('.ui-adjust-btn').length;j++){
                if($('.ui-adjust-btn')[j].dataset.paramsname==o){
                    var currentBtn=$('.ui-adjust-btn')[j];
                    var paramObj=currentBtn.parentNode.parentNode.getElementsByClassName('ui-params')[0];
                    paramObj.innerHTML=uiData[o]+currentBtn.dataset.paramsunit;	
                    var adjustLength=currentBtn.parentNode.offsetWidth-currentBtn.offsetWidth;
                    // console.log(adjustLength);
                    var leftNum=adjustLength*((parseInt(uiData[o])-parseInt(currentBtn.dataset.paramsmin))/(parseInt(currentBtn.dataset.paramsmax)-parseInt(currentBtn.dataset.paramsmin)));
                    currentBtn.style.left=leftNum+'px';
                    currentBtn.parentNode.getElementsByClassName('ui-adjust-line')[0].style.width=leftNum+2+'px';
                    //console.log(o);    //遍历的实际上是对象的属性名称 a,b,c
                }
            }

            for(var k=0;k<$('.ui-switch-btn').length;k++){
                if($('.ui-switch-btn')[k].dataset.paramsname==o){
                    if(uiData[$('.ui-switch-btn')[k].dataset.paramsname]){
                        $('.ui-switch-btn')[k].className="ui-switch-btn ui-switch-btn-1";
                    }
                    else{
                        $('.ui-switch-btn')[k].className="ui-switch-btn ui-switch-btn-0";
                    }
                }
            }
        }
    }
    
    
//页面元素尺寸响应式调整
//（输入要响应式调整的数据，以及可选参数（调整系数），返回实际屏幕宽度和1920宽度计算后的结果）
function resData(data,ratio){
    // console.log(data);
    //var nowWidth=window.innerWidth;
    var nowWidth=document.body.scrollWidth
    
    if(nowWidth>2560){
        nowWidth=2560;
    }
    if(nowWidth<1200){
        nowWidth=1200;
    }
    data=parseInt(data);
    var oRatio=ratio|| 0.5;//默认调整系数    
    var resData=data+Math.round(data*(nowWidth-1920)/1920*oRatio);
    // console.log(resData);
    // console.log('nowWid:'+nowWidth);
    return resData;
}

//uiDrawing *****************
    function uiDrawing(uiData,showsave){
        // console.log(uiData);
     
        if(showsave){
            $('#console-title-box')[0].style.display='none';
            $('#save-box')[0].style.display='flex';
        }

        $('#search-wrap').css({
            'opacity':uiData['search_opacity']/100,
            "filter": "alpha(opacity="+uiData['search_opacity']+")",//搜索框透明度

            "width":uiData['search_width']+"%",//搜索框占比宽度

            // "height":uiData['search_height']+"px",//搜索框高度值
            "height":resData(uiData['search_height'])+"px",//搜索框高度值

            "border-radius":uiData['search_radius']+"px",//圆角大小

            // "margin-bottom":uiData['search_spacing']+"px",//搜索框和网站栏间距
            "margin-bottom":resData(uiData['search_spacing'])+"px",//搜索框和网站栏间距
        
        });
        $('#search').attr({
            'data-open':parseInt(uiData['search_open'])==1?'1':'0',  //新标签页打开搜索结果
            'data-keyword':parseInt(uiData['search_keyword'])==1?'1':'0',  //输入时显示联想词
            'placeholder':parseInt(uiData['search_hotword'])==1?getNews():'',//显示热搜
            'data-empty':parseInt(uiData['search_empty'])==1?'1':'0',  //搜索后清空搜索框
            
        })

        $('.site-wrap-li').css({
            "border-radius":uiData['site_radius']+"%",//圆角大小
            
            //"width":uiData['siteli_size']+"px",
            //"height":uiData['siteli_size']+"px",//li大小
            "width":resData(uiData['siteli_size'])+"px",//li大小
            "height":resData(uiData['siteli_size'])+"px",//li大小            
        
        });

        $('.site-wrap-a').css({
            'opacity':uiData['site_opacity']/100,
            "filter": "alpha(opacity="+uiData['site_opacity']+")",//网站链接透明度

            // "margin-left":Math.round(parseInt(uiData['site_row'])/2)+"px",
            // "margin-right":Math.round(parseInt(uiData['site_row'])/2)+"px",
            "margin-left":Math.round(resData(uiData['site_row'])/2)+"px",
            "margin-right":Math.round(resData(uiData['site_row'])/2)+"px",

            // "margin-top":Math.round(parseInt(uiData['site_column'])/2)+"px",
            // "margin-bottom":Math.round(parseInt(uiData['site_column'])/2)+"px",
            "margin-top":Math.round(resData(uiData['site_column'])/2)+"px",
            "margin-bottom":Math.round(resData(uiData['site_column'])/2)+"px",
        });

        $('.site-wrap-a').attr({
            'target':parseInt(uiData['site_open'])==1?'_blank':'_self',  //新标签页打开链接
        })

        $('.site-title').css({            
            //"width":parseInt(uiData['siteli_size'])+20+"px",//根据li大小调整最大显示宽度
            "width":resData(uiData['siteli_size'])+20+"px",//根据li大小调整最大显示宽度
            "opacity":parseInt(uiData['site_titleshow'])==1?1:0,  //显示图标名称  
        });

        $('#site-box').css({            
            "width":uiData['site_width']+"%",//网站栏宽度占比 
            'display':parseInt(uiData['site_allhide'])==1?'none':'flex',  //隐藏所有链接图标
        });

        $('#main-wrap').css({            
            //"max-width":uiData['main_width']+"px",//总宽度
            "max-width":resData(uiData['main_width'])+"px",//总宽度  
        });

        $('#blackBg').css({            
            // 'opacity':uiData['mask_opacity']/100,
            // "filter": "alpha(opacity="+uiData['mask_opacity']+")",//遮罩浓度
            'background-color': 'rgba(0, 0, 0, '+uiData['mask_opacity']/100+')',//遮罩浓度
        });

        $('#blackBg').css({            
            'backdrop-filter':'blur('+uiData['bg_blur']+'px)',//壁纸模糊度
        });
        
    }
    

    //窗口尺寸变化时，响应式变化页面元素尺寸
    window.addEventListener('resize',function(e){                
        if($('#save-box')[0].style.display=='flex'&&$('#console-wrap')[0].style.display=='block'){//处于编辑模式下
            uiDrawing(tempUiData,1);
        }
        else{
            uiDrawing(uiData,0);
        }
    })

//点击设置最上面标题,返回主目录
$('#console-title-box').click(function(){
    showConsole('menu',0);
    tempUiData = $.extend(true,[],uiData);//重置tempUiData
});

//点击眼睛图标（隐藏console框）*****************
    $('#console-eye-btn').mousedown(function(){
        $('#console-wrap').css({
            'opacity':0.03,
            "filter": "alpha(opacity=3)",
        });
    });

    $('#console-eye-btn').mouseup(function(){
        $('#console-wrap').css({
            'opacity':1,
            "filter": "alpha(opacity=100)",
        });
    });

    $('#console-eye-btn').mousemove(function(){
        $('#console-wrap').css({
            'opacity':1,
            "filter": "alpha(opacity=100)",
        });
    });
    

//标准预设 *****************
    $('.ui-default-btn').click(function(){
        var uiNumber = this.dataset.defaultdata;
        var fd = new FormData();		//文件
        var req=new XMLHttpRequest();
        req.open('POST','/home/ui/getDefaultUi',true);//异步
        fd.append("uiNumber",uiNumber);
        req.onreadystatechange=function(){
            if(req.readyState==4 && req.status==200){
                var newUidata=JSON.parse(req.response);
                tempUiData = newUidata;
                // console.log(tempUiData);
                uiDrawing(tempUiData,1);
                initConsoleBtn(tempUiData);
            }	    	
            
        }
        req.send(fd);

    });


    //小齿轮 点击 打开console wrap
    $('#console-btn').click(function(){   
        
        showConsole('menu',1);

    });

    //console-wrap弹出显示方式 20230225
    function showConsole(showKind,animate){
        if(animate){//是否需要弹出动画
            $("#fixedBtnBox").fadeOut(300);
            $("#beian-wrap").fadeOut(300);
            $('#console-wrap').fadeIn(300);  
        }
        else{
            $('#console-wrap').fadeIn(0); 
        }

        $("#fixedBtnBox").hide();
        $('#console-content').hide();
        $('#console-bg-content').hide();  
        $('.bg-title-box').hide();
        $('#bg-category-bar').hide();
        $('#nav-category-panel').hide();
        switch (showKind){
            case 'menu':
                // alert('主目录')

                $('#console-title-box')[0].style.display='flex';
                $('#save-box')[0].style.display='none';
                $('.console-title-img')[0].src='/static/home/images/console/jianfast.svg';        
                $('.console-title')[0].innerHTML='哇塔主页';
                $('#console-menu')[0].style.display='flex';        

                break;
            case 'bgset-lib':
                // alert('壁纸库');
                setState='bg';
                $('#console-title-box')[0].style.display='flex';
                $('.bg-title-box')[0].style.display='flex';                
                $('#save-box')[0].style.display='none';
                $('.console-title-img')[0].src='/static/home/images/console/set1.svg';        
                $('.console-title')[0].innerHTML='设置壁纸';                
                $('#console-menu').hide();        
                $('#console-bg-content').show();
                $('#bg-category-bar').css('display','flex');
                $('.bg-title-left')[0].innerHTML='使用本地/网络壁纸';
                $('.bg-title-right')[0].innerHTML='壁纸库';
                oBgPicWrap.style.display='flex';
                oBgLoadText.style.display='block';
                oSetPicurlWrap.style.display='none';
                openBgLibrary();
                break;
            case 'navset':
                $('#console-title-box')[0].style.display='flex';
                $('#save-box')[0].style.display='none';
                $('.console-title-img')[0].src='/static/home/images/console/set1.svg';
                $('.console-title')[0].innerHTML='网站分类';
                $('#console-menu').hide();
                $('#nav-category-panel').css('display','flex');
                openNavCategories();
                break;
            case 'bgset-upload':
                setState='bg';
                // alert('使用本地壁纸、壁纸上传');
                $('#console-title-box')[0].style.display='flex';
                $('.bg-title-box')[0].style.display='flex';                
                $('#save-box')[0].style.display='none';
                $('.console-title-img')[0].src='/static/home/images/console/set1.svg';        
                $('.console-title')[0].innerHTML='壁纸设置';                
                $('#console-menu').hide();        
                $('#console-bg-content').show();
                $('.bg-title-left')[0].innerHTML='壁纸库';
                $('.bg-title-right')[0].innerHTML='使用本地/网络壁纸';
                oBgPicWrap.style.display='none';
                oBgLoadText.style.display='none';
                oSetPicurlWrap.style.display='block';
                break;
            case 'uiset':        
                setState='ui';        
                $('#console-title-box')[0].style.display='flex';
                $('#save-box')[0].style.display='none';
                $('.console-title-img')[0].src='/static/home/images/console/set1.svg';        
                $('.console-title')[0].innerHTML='设置页面布局';                
                $('#console-menu').hide();        
                $('#console-content').show();
                initConsoleBtn(uiData);
                break;
            default :
                return false;
        }

    }


    //背景设置按钮 点击
    $(".console-bgset-btn").off('click').on('click', function(){
        showConsole('bgset-lib',0);
    });

    $(".console-navcat-btn").off('click').on('click', function(){
        showConsole('navset',0);
    });




    //界面设置按钮 点击
    $(".console-uiset-btn").click(function(){
        if(!$('.console-menu-btn')[0].dataset.usertype){
            showLoginBtn();
            return false;
        }
        showConsole('uiset',0);
    });


    // var oBgPicBox=document.getElementById('bg');
    // var originalBg=oBgPicBox.src;
    //界面设置关闭按钮 点击
    $('#console-close-btn').click(function(){
        // alert('关闭')        
        $("#fixedBtnBox").fadeIn(300);       
        $('#console-wrap').fadeOut(300);
        $('#console-bg-content').fadeOut();  
        $('.bg-title-box').fadeOut(); 
        uiDrawing(uiData,0);
        //打开页面时的壁纸
        paintWallpaper($('#bg-wrap')[0], uiData['bg_url']);
        tempUiData = $.extend(true,[],uiData);//重置tempUiData
    });


    //用户头像框 点击
    $('#user-box').click(function(){        
        if(!$('.console-menu-btn')[0].dataset.usertype){
            showLoginBtn();
        }
    });


    //保存ui/bg界面设置按钮 点击
    $('#console-save-btn').click(function(){
                if(setState=='bg'){

                    //Ajax至服务器 //2025aa
                    var fd = new FormData();		//文件
                    var req=new XMLHttpRequest();
                    req.open('POST','home/bg/save',true);//异步
                    fd.append("bg", nowBgpic);                 
                    req.onreadystatechange=function(){					    	
                        if(req.readyState==4 && req.status==200){					    	
                            if(JSON.parse(req.response)['success']){                            
                                uiData['bg_url']=nowBgpic;
                                showmsg('壁纸保存成功');   
                                $("#fixedBtnBox").fadeIn(300);       
                                $('#console-wrap').fadeOut(300); 
                            }
                        }
                    }
                    req.send(fd);



                    // oBgPicBox.src='./home/bg/show?type=update&picurl='+nowBgpic;

                    // $('#console-wrap').fadeOut(300);
                    // setTimeout(function(){
                    //     location.reload()
                    // },2000);
                    return false;
                }   
                //Ajax至服务器
                var fd = new FormData();		//文件
                var req=new XMLHttpRequest();
                req.open('POST','/home/ui/saveui',true);//异步
                for (let o in tempUiData) {
                    fd.append(o,tempUiData[o]);
                }
                
                req.onreadystatechange=function(){
                    if(req.readyState==4 && req.status==200){					    	
                        if(JSON.parse(req.response)['error']){
                            showmsg(JSON.parse(req.response)['error']);						    	
                            return false;						    		
                        }
                        if(JSON.parse(req.response)['success']){
                            //关闭console wrap
                            $("#fixedBtnBox").fadeIn(300);       
                            $('#console-wrap').fadeOut(300);
                            // uiDrawing(JSON.parse(req.response));

                            showmsg(JSON.parse(req.response)['success']);
                            setTimeout(function(){
                                location.reload()
                            },2000);
                        }
                    }
                }
               
                req.send(fd);	
    });

    //弹出登录框，并且加来源后缀
    function showLoginBtn(){
        $('#loginBlackBg').css('display','block');
        return false;
    }

    //展示提示框showmsg--------------------------
    function showmsg(msgtext,showtime){
        var showtime=showtime||2000;
        //$('#msgbox').fadeIn(300);
        $('#msg-box').animate({opacity:"0.8",marginTop:"50px"},300);
        $('#msg-box')[0].style.display='inline-block';
        $('#msg-box')[0].innerHTML=msgtext;				

        setTimeout(function(){
            $('#msg-box').animate({opacity:"0"},300);
            setTimeout(function(){
                $('#msg-box')[0].style.display='none';
                $('#msg-box')[0].style.marginTop='20px';
                $('#msg-box')[0].innerHTML='';	
            },280);

        },showtime);
        
    }











    //壁纸设置部分--------------------------

    var nowBgpic=null;
    var oBgPicWrap=document.getElementById('bg-pic-wrap');
    var oSetPicurlWrap=document.getElementById('set-picurl-wrap');    
    var oBgLoadText=document.getElementById('bg-load-text');
    var oBgCategoryBar=document.getElementById('bg-category-bar');
    var bgCategories=[];
    var bgCategory=savedBgCategory;
    var navCategoryList=[];
    var navCategoriesSelected=readNavCategories();
    var navViewCategory=navCategoriesSelected[0]||'';
    var navSiteOffset=0;
    var navSiteLoading=false;
    var navSiteDone=false;
    var navSiteRequestId=0;
    var bgOffset=0;
    var bgNoMore=false;
    var bgRequestId=0;
    $ajaxBgStatus=1;

    function rotateBg(category, done, notify){
        var requestId=++bgRotateSeq;
        var fd=new FormData();
        if(category){
            fd.append('category', category);
        }
        var req=new XMLHttpRequest();
        req.open('POST','/home/bg/randbg',true);
        req.onreadystatechange=function(){
            if(req.readyState==4 && req.status==200){
                if(requestId!==bgRotateSeq){
                    return;
                }
                var data=JSON.parse(req.response);
                if(data && data.stopped && typeof window.showShareStopped==='function'){
                    window.showShareStopped();
                    return;
                }
                if(data.success && data.bg_url && (!category || (data.category===category && wallpaperInCategory(data.bg_url, category)))){
                    nowBgpic=data.bg_url;
                    applyBg(data.bg_url, data.thumb);
                    if(done){
                        done(data.bg_url);
                    }
                    return;
                }
                if(notify && category==='custom' && data && data.error){
                    showmsg(data.error);
                    if(data.login){
                        showLoginBtn();
                    }
                }
            }
        };
        req.send(fd);
    }

    function markBgUsed(url){
        var fd=new FormData();
        fd.append('image_path', url);
        var req=new XMLHttpRequest();
        req.open('POST','/home/bg/use',true);
        req.send(fd);
    }

    function preloadNextBg(category, currentUrl){
        var fd=new FormData();
        if(category){
            fd.append('category', category);
        }
        if(currentUrl){
            fd.append('exclude', currentUrl);
        }
        var req=new XMLHttpRequest();
        req.open('POST','/home/bg/peek',true);
        req.onreadystatechange=function(){
            if(req.readyState==4 && req.status==200){
                var data=JSON.parse(req.response);
                if(!data.success || !data.bg_url){
                    return;
                }
                if(category && (data.category!==category || !wallpaperInCategory(data.bg_url, category))){
                    return;
                }
                if(readStoredCategory()!==category){
                    return;
                }
                var preview=data.thumb || thumbForWallpaper(data.bg_url);
                try{
                    localStorage.setItem(BG_READY_KEY, JSON.stringify({
                        category: category,
                        url: data.bg_url,
                        thumb: preview || ''
                    }));
                }catch(e){}
                if(preview){
                    var thumbImg=new Image();
                    thumbImg.src=preview;
                }
                var fullImg=new Image();
                fullImg.src=data.bg_url;
            }
        };
        req.send(fd);
    }

    function renderBgCategories(){
        oBgCategoryBar.innerHTML='';
        var hint=document.createElement('div');
        hint.className='bg-category-hint';
        var currentNote='';
        for(var n=0;n<bgCategories.length;n++){
            if(bgCategories[n].category==bgCategory){
                currentNote=bgCategories[n].category_note;
            }
        }
        hint.innerHTML=bgCategory==='share'
            ? '已选中「分享」，首页会轮换别人分享的壁纸'
            : (bgCategory==='custom'
                ? '已选中「自选」，首页会轮换你上传的壁纸'
                : (currentNote ? '已选中「'+currentNote+'」，下次打开页面会换一张' : '未选分类时，每次打开都会从全部壁纸里换一张'));
        for(var i=0;i<bgCategories.length;i++){
            var item=bgCategories[i];
            var chip=document.createElement('div');
            chip.className='bg-category-chip'+(item.category==bgCategory?' active':'');
            chip.innerHTML=item.category_note;
            chip.dataset.category=item.category;
            chip.onclick=function(){
                chooseBgCategory(this.dataset.category);
            };
            oBgCategoryBar.appendChild(chip);
        }
        oBgCategoryBar.appendChild(hint);
    }

    function appendCustomUpload(){
        if(bgCategory!=='custom' || !(window.__jfUser && Number(window.__jfUser.user_type)===1)){
            return;
        }
        var entry=document.createElement('a');
        entry.className='bg-upload-entry';
        entry.href='/set-homepage/upload';
        entry.textContent='上传壁纸';
        oBgPicWrap.appendChild(entry);
    }

    function leaveShare(){
        var req=new XMLHttpRequest();
        req.open('POST','/home/share/leave',true);
        req.onreadystatechange=function(){
            if(req.readyState!==4){
                return;
            }
            window.__jfShare=null;
            try{ localStorage.removeItem('jf_bg_category'); }catch(e){}
            try{ localStorage.removeItem('jf_bg_ready'); }catch(e){}
            try{ localStorage.removeItem('jf_bg_thumb'); }catch(e){}
            document.cookie='jf_bg_category=;path=/;max-age=0';
            document.cookie='wa_shared=;path=/;max-age=0';
            bgCategories=bgCategories.filter(function(item){ return item.category!=='share'; });
            bgCategory='';
            renderBgCategories();
            resetBgList();
            rotateBg('', function(url){
                preloadNextBg('', url);
            }, true);
            showmsg('已去掉分享');
        };
        req.send();
    }

    function appendShareLeave(){
        if(bgCategory!=='share' || !window.__jfShare){
            return;
        }
        var entry=document.createElement('button');
        entry.type='button';
        entry.className='bg-upload-entry';
        entry.textContent='去掉分享';
        entry.onclick=function(event){
            event.preventDefault();
            event.stopPropagation();
            leaveShare();
        };
        oBgPicWrap.appendChild(entry);
    }

    function chooseBgCategory(category){
        if(!isBgCategory(category)){
            return;
        }
        if(category==='custom' && !(window.__jfUser && Number(window.__jfUser.user_type)===1)){
            showLoginBtn();
            return;
        }
        if(category==='share' && !window.__jfShare){
            showmsg('没有正在使用的分享');
            return;
        }
        var changed=category!==bgCategory;
        bgCategory=category;
        writeStoredCategory(category);
        if(category!=='share'){
            saveUserPref({bg_category: category});
        }
        renderBgCategories();
        resetBgList();
        if(changed){
            try{ localStorage.removeItem(BG_READY_KEY); }catch(e){}
            rotateBg(category, function(url){
                preloadNextBg(category, url);
            }, true);
        }
    }

    function resetBgList(){
        oBgPicWrap.innerHTML='';
        bgOffset=0;
        bgNoMore=false;
        if(!bgCategory){
            oBgLoadText.innerHTML='请先点选一个分类';
            return;
        }
        appendCustomUpload();
        appendShareLeave();
        ajaxBg();
    }

    function openBgLibrary(){
        bgCategory=readStoredCategory();
        if(bgCategories.length){
            renderBgCategories();
            resetBgList();
            return;
        }
        var req=new XMLHttpRequest();
        req.open('POST','/home/bg/categories',true);
        req.onreadystatechange=function(){
            if(req.readyState==4 && req.status==200){
                bgCategories=JSON.parse(req.response)||[];
                bgCategory=readStoredCategory();
                renderBgCategories();
                resetBgList();
            }
        };
        req.send();
    }

    function renderNavCategoryList(){
        var list=document.getElementById('nav-category-list');
        list.innerHTML='';
        var items=[{category:'', category_note:'默认'}].concat(navCategoryList);
        for(var i=0;i<items.length;i++){
            var item=items[i];
            var row=document.createElement('div');
            row.className='nav-category-item'+(item.category===navViewCategory?' active':'');
            row.textContent=item.category_note;
            row.title=item.total ? item.category_note+' '+item.total+' 个' : item.category_note;
            row.dataset.category=item.category;
            row.onclick=function(){
                chooseNavCategory(this.dataset.category||'');
            };
            list.appendChild(row);
        }
    }

    function setNavSiteStatus(text){
        document.getElementById('nav-site-status').textContent=text;
    }

    function resetNavSites(){
        navSiteOffset=0;
        navSiteDone=false;
        navSiteLoading=false;
        navSiteRequestId++;
        document.getElementById('nav-site-list').innerHTML='';
        document.getElementById('nav-site-pane').scrollTop=0;
        if(!navViewCategory){
            setNavSiteStatus('当前使用首页原来的网站。点左侧分类可查看并记住。');
            return;
        }
        setNavSiteStatus('加载中……');
        loadNavSites();
    }

    function appendNavSites(rows){
        var list=document.getElementById('nav-site-list');
        for(var i=0;i<rows.length;i++){
            var item=rows[i];
            var link=document.createElement('a');
            link.className='nav-site-row';
            link.target='_blank';
            link.rel='nofollow noopener';
            var url=String(item.url||'');
            if(/^https?:\/\//i.test(url) || url.charAt(0)==='/'){
                link.href=url;
            }
            var img=document.createElement('img');
            img.alt='';
            var icon=String(item.icon||'');
            if(icon){
                img.src=icon;
                img.onerror=function(){
                    this.style.visibility='hidden';
                };
            }
            var name=document.createElement('span');
            name.textContent=item.title||'';
            link.appendChild(img);
            link.appendChild(name);
            list.appendChild(link);
        }
    }

    function loadNavSites(){
        if(!navViewCategory || navSiteLoading || navSiteDone){
            return;
        }
        navSiteLoading=true;
        var requestId=++navSiteRequestId;
        var category=navViewCategory;
        var fd=new FormData();
        fd.append('category', category);
        fd.append('offset', navSiteOffset);
        var req=new XMLHttpRequest();
        req.open('POST','/home/nav/sites',true);
        req.onreadystatechange=function(){
            if(req.readyState!==4){
                return;
            }
            if(requestId!==navSiteRequestId || category!==navViewCategory){
                return;
            }
            navSiteLoading=false;
            if(req.status!==200){
                setNavSiteStatus('加载失败');
                return;
            }
            var rows=JSON.parse(req.response)||[];
            appendNavSites(rows);
            navSiteOffset+=rows.length;
            if(rows.length<30){
                navSiteDone=true;
                setNavSiteStatus(navSiteOffset ? '共 '+navSiteOffset+' 个' : '这个分类还没有网站');
            }
            else{
                setNavSiteStatus('继续下滑加载更多');
                var pane=document.getElementById('nav-site-pane');
                if(pane.scrollHeight<=pane.clientHeight+40){
                    loadNavSites();
                }
            }
        };
        req.send(fd);
    }

    function chooseNavCategory(category){
        if(category && !/^[a-z0-9-]{1,32}$/.test(category)){
            return;
        }
        if(category===navViewCategory && document.getElementById('nav-site-list').children.length){
            return;
        }
        navViewCategory=category||'';
        navCategoriesSelected=navViewCategory ? [navViewCategory] : [];
        writeNavCategories(navCategoriesSelected);
        saveUserPref({nav_categories: JSON.stringify(navCategoriesSelected)});
        renderNavCategoryList();
        resetNavSites();
        if(window.reloadNavSites){
            window.reloadNavSites();
        }
    }

    function bindNavSiteScroll(){
        var pane=document.getElementById('nav-site-pane');
        if(pane.dataset.bound){
            return;
        }
        pane.dataset.bound='1';
        pane.onscroll=function(){
            if(pane.scrollHeight-pane.clientHeight-pane.scrollTop<=80){
                loadNavSites();
            }
        };
    }

    function openNavCategories(){
        navCategoriesSelected=readNavCategories();
        navViewCategory=navCategoriesSelected[0]||'';
        bindNavSiteScroll();
        if(navCategoryList.length){
            renderNavCategoryList();
            resetNavSites();
            return;
        }
        var req=new XMLHttpRequest();
        req.open('POST','/home/nav/categories',true);
        req.onreadystatechange=function(){
            if(req.readyState==4 && req.status==200){
                navCategoryList=JSON.parse(req.response)||[];
                navCategoriesSelected=readNavCategories();
                navViewCategory=navCategoriesSelected[0]||'';
                renderNavCategoryList();
                resetNavSites();
            }
        };
        req.send();
    }

    function ajaxBg(){
                if($ajaxBgStatus==0 || bgNoMore){
                    return false;
                }
                var previewCategory=bgCategory;
                if(!previewCategory){
                    return false;
                }
                $ajaxBgStatus=0;
                var requestId=++bgRequestId;
                var fd = new FormData();
                fd.append('category', previewCategory);
                fd.append('offset', bgOffset);
                var req=new XMLHttpRequest();
                req.open('POST','/home/bg/ajaxbg',true);
                req.onreadystatechange=function(){
                    if(req.readyState==4 && req.status==200){
                        if(requestId!==bgRequestId){
                            $ajaxBgStatus=1;
                            return;
                        }
                        $ajaxBgStatus=1;
                        var ajaxBgList=JSON.parse(req.response);
                        if(!ajaxBgList.length){
                            bgNoMore=true;
                            if(previewCategory==='share' && bgOffset===0){
                                oBgLoadText.innerHTML='分享的壁纸还没有图片';
                            }else if(previewCategory==='custom' && bgOffset===0){
                                oBgLoadText.innerHTML=(window.__jfUser && Number(window.__jfUser.user_type)===1)
                                    ? '还没有壁纸'
                                    : '登录后才能使用自选壁纸';
                            }else{
                                oBgLoadText.innerHTML='';
                            }
                            return;
                        }
                        if(ajaxBgList.length<15){
                            bgNoMore=true;
                        }
                        bgOffset+=ajaxBgList.length;
                        for(var i=0;i<ajaxBgList.length;i++){
                            var oNewBgDiv=document.createElement('div');                            
                            oNewBgDiv.className="bg-pic-box";
                            var item=ajaxBgList[i];
                            var preview=typeof item==='string' ? item : (item.thumb||item.url||'');
                            var full=typeof item==='string' ? item.replace('/400/','/') : (item.url||preview);
                            oNewBgDiv.dataset.full=full;
                            if(preview && preview!==full){
                                oNewBgDiv.dataset.thumb=preview;
                            }
                            oNewBgDiv.innerHTML="<a download href='"+full+"' class='set-pic-btn btn' target='_blank' title='下载壁纸'></a>";
                            oNewBgDiv.style.backgroundImage='url("'+preview+'")';
                            if(previewCategory==='custom' || previewCategory==='share'){
                                oNewBgDiv.style.backgroundSize='contain';
                            }
                            oNewBgDiv.style.height=((oBgPicWrap.clientWidth||320)/16*9)+'px';
                            oBgPicWrap.appendChild(oNewBgDiv);
                        }
                        oBgLoadText.innerHTML='';
                        clickBgPic();
                    }
                };
                req.send(fd);	
    }
    

    //点击壁纸pic-box--------------------------
    
    function clickBgPic(){
        $(".bg-pic-box").click(function(){
            nowBgpic=this.dataset.full || cssBackgroundUrl(this.style.backgroundImage);
            // alert(nowBgpic);
            paintWallpaper($('#bg-wrap')[0], nowBgpic, this.dataset.thumb||'');
            // oBgPicBox.src='./home/bg/show?type=temp&picurl='+nowBgpic;
            $('#console-title-box')[0].style.display='none';
            $('#save-box')[0].style.display='flex';
        })
    }



    //滑动到底部加载壁纸--------------------------
    var oBgContent=document.getElementById('console-bg-content');
    const scroll = document.getElementById('console-bg-content');

    oBgContent.onscroll=function(){        
        if ((scroll.scrollHeight-(scroll.clientHeight + parseInt(scroll.scrollTop))) <=200 && oBgTitleLeft.innerHTML=='使用本地/网络壁纸') 
        {
            ajaxBg();
            oBgLoadText.innerHTML='壁纸加载中……';
        }
    }

    //切换壁纸设置模式--------------------------
    var oBgTitleLeft=document.getElementsByClassName('bg-title-left')[0];
    var oBgTitleRight=document.getElementsByClassName('bg-title-right')[0];
    

    oBgTitleLeft.onclick=function(){
        if(this.innerHTML=='壁纸库'){
            showConsole('bgset-lib',0);
        }
        else{
            showConsole('bgset-upload',0);
        }

    }

    //点击本地壁纸输入框确认按钮--------------------------
    var oBgBtn=document.getElementById('set-picurl-btn');
    var oBgInput=document.getElementById('set-picurl-input');
    var oBgWarning=document.getElementById('set-picurl-warning');

    oBgBtn.onclick=function(){
        if(oBgInput.value){
            if (oBgInput.value.search(/https\:\/\//i)==-1||(oBgInput.value.search(/\.jpg/i) ==-1&&oBgInput.value.search(/\.jpeg/i)==-1&&oBgInput.value.search(/\.png/i)==-1&&oBgInput.value.search(/\.gif/i)==-1&&oBgInput.value.search(/\.bmp/i)==-1)) {
                oBgWarning.style.color='red';
                return false;
            }
            oBgWarning.style.color='#7f7f7f'; 
            nowBgpic=oBgInput.value;           
            paintWallpaper($('#bg-wrap')[0], nowBgpic);
            $('#console-title-box')[0].style.display='none';
            $('#save-box')[0].style.display='flex';
        }
    }








//右键点击显示目录菜单 20230223--------------------
var oMenuBg=document.querySelector('#blackBg');
var oSiteBox=document.querySelector('#site-box');
var oSearchMenu=document.querySelector('#search-menu');
var oText=document.querySelector('#text');
var oMenuWrap=document.querySelector('#menu-wrap');
var oMenuItem=document.querySelectorAll('.menu-item');

oMenuBg.addEventListener('click',function(){
    oMenuWrap.style.display='none';
});
oSiteBox.addEventListener('click',function(){
    oMenuWrap.style.display='none';
});    
$('.menu-item').click(function(){
    oMenuWrap.style.display='none';
})
    


oMenuBg.oncontextmenu= function(event){
    $('.console-siteset-btn')[0].style.order=5;
    $('.console-engineset-btn')[0].style.order=6;
    $('.console-uiset-btn')[0].style.order=4;
    $('.console-downloadcurrent-btn')[0].style.order=3;
    $('.console-randbg-btn')[0].style.order=2;
    $('.console-bgset-btn')[0].style.order=1;
    showMenu(event);
    return false;//阻止浏览器的默认弹窗行为
}
oSiteBox.oncontextmenu=oSearchMenu.oncontextmenu = function(event){
    $('.console-siteset-btn')[0].style.order=1;
    $('.console-engineset-btn')[0].style.order=2;
    $('.console-uiset-btn')[0].style.order=3;
    $('.console-downloadcurrent-btn')[0].style.order=6;
    $('.console-randbg-btn')[0].style.order=4;
    $('.console-bgset-btn')[0].style.order=5;
    showMenu(event);
    return false;//阻止浏览器的默认弹窗行为
}
oSearchMenu.oncontextmenu = function(event){
    $('.console-siteset-btn')[0].style.order=2;
    $('.console-engineset-btn')[0].style.order=1;
    $('.console-uiset-btn')[0].style.order=3;
    $('.console-downloadcurrent-btn')[0].style.order=6;
    $('.console-randbg-btn')[0].style.order=4;
    $('.console-bgset-btn')[0].style.order=5;

    showMenu(event);
    return false;//阻止浏览器的默认弹窗行为
}

//弹出右键目录菜单
function showMenu(event){
    if($("#search-btn-big-box")[0].style.display=='flex'||$("#site-btn-box")[0].style.display=='flex'){//已经处于图标、引擎编辑模式下，不重复开启
        return false;
    }
    var e = event || window.event;
    oMenuWrap.style.display='flex';
    var oLeft=e.clientX;
    var oTop=e.clientY;
    var oMenuWidth=oMenuWrap.offsetWidth;
    var oMenuHeight=oMenuWrap.offsetHeight;
    var oBodyWidth=document.querySelector('body').offsetWidth;
    var oBodyHeight=document.querySelector('body').offsetHeight;

    // console.log('left:'+oLeft+' /top:'+oTop+' /menuWidth:'+oMenuWidth+' /menuHeith:'+oMenuHeight+' /bodywidht:'+oBodyWidth);
    
    if(oBodyWidth-oLeft<=oMenuWidth){
        oLeft=oBodyWidth-oMenuWidth;
    }
    if(oBodyHeight-oTop<=oMenuHeight){
        oTop=oBodyHeight-oMenuHeight;
    }
    oMenuWrap.style.left=oLeft+'px';
    oMenuWrap.style.top=oTop+'px';
    return false;//阻止浏览器的默认弹窗行为
}


    //获取新闻news placeholder
    var oNewsList=null;
    function getNews(){
        if($('#save-box')[0].style.display=='flex'&&$('#console-wrap')[0].style.display=='block'){//处于编辑模式下
            return '热搜资讯';
        }
        else{
            if(oNewsList==null){
                var fd = new FormData();		//文件
                var req=new XMLHttpRequest();
                req.open('POST','/home/engine/getnews',true);//异步
                 
                req.onreadystatechange=function(){					    	
                    if(req.readyState==4 && req.status==200){
                        oNewsList=JSON.parse(req.response);
                        var i=0
                        $('#search')[0].placeholder=oNewsList[i];
                        setInterval(function(){    
                                if(i<oNewsList.length-1){
                                    i++;                                 
                                }
                                else{
                                    i=0;
                                }
                                if($('#search')[0].placeholder!=''){
                                    $('#search')[0].placeholder=oNewsList[i];
                                }
                        }, 8000);
                    }
                }
                req.send(fd);
            }

        }
        

    }





    //评价按钮
    /*
    if(!getCookie('rating_btn')){
        $('.console-rating')[0].style.display='flex';
        if(window.location.href.search('ext=ch')!=-1){
            $('.console-rating')[0].href='https://chrome.google.com/webstore/detail/%E7%AE%80%E6%B3%95%E4%B8%BB%E9%A1%B5/ipkflbbmmgipgkeokeejadapmdeoldgp?hl=zh-CN';
            $('.console-rating-span')[0].innerHTML="期待你的<span style='text-decoration: underline;'>好评支持</span>！";
            $('.console-rating-img')[0].src="/static/home/images/console/5star.svg";
        }
        else if(window.location.href.search('ext=e')!=-1) {
            $('.console-rating')[0].href='https://microsoftedge.microsoft.com/addons/detail/%E7%AE%80%E6%B3%95%E4%B8%BB%E9%A1%B5/bagnonhnfegiiobmnkfdafkeaanhojef';
            $('.console-rating-span')[0].innerHTML="期待你的<span style='text-decoration: underline;'>好评支持</span>！";
            $('.console-rating-img')[0].src="/static/home/images/console/5star.svg";
        } 
        else {
            $('.console-rating')[0].href='https://zhuanlan.zhihu.com/p/125682754';
            $('.console-rating-span')[0].innerHTML="期待你的<span style='text-decoration: underline;'>点赞支持</span>！";
            $('.console-rating-img')[0].src="/static/home/images/console/dianzan.svg";
        }
    }

    $('.console-rating')[0].onclick=function(){
        setCookie('rating_btn',1,30)
    }
    */


    
    




}//consolejsend