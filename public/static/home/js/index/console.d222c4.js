function readReadyWallpaper(){
    try{
        var data=JSON.parse(localStorage.getItem('jf_bg_ready')||'');
        var category=localStorage.getItem('jf_bg_category')||'';
        if(data && data.url && data.category===category){
            return data;
        }
    }catch(e){}
    return null;
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
    var ready=readReadyWallpaper();
    var bg=document.getElementById('bg-wrap');
    if(!ready || !bg){
        return;
    }
    var img=new Image();
    img.onload=function(){
        bg.style.backgroundImage='url("'+ready.url+'")';
    };
    img.onerror=function(){
        localStorage.removeItem('jf_bg_ready');
    };
    img.src=ready.url;
})();
function consolejs(uiData){
    var setState=null;//当前设置项

    //获取壁纸--------------------------
    // var oBgWrap=document.getElementById('bg-wrap');
    //打开页面时的壁纸。已选分类时，按最后使用时间轮换一张。
    var BG_CATEGORY_KEY='jf_bg_category';
    function applyBg(url){
        uiData['bg_url']=url;
        $('#bg-wrap')[0].style.backgroundImage='url("'+url+'")';
        setCookie('loadingbg',url,365);
    }
    var savedBgCategory=localStorage.getItem(BG_CATEGORY_KEY)||'';
    var readyWallpaper=readReadyWallpaper();
    if(savedBgCategory && readyWallpaper){
        var readyImage=new Image();
        readyImage.onload=function(){
            applyBg(readyWallpaper.url);
            markBgUsed(readyWallpaper.url);
            preloadNextBg(savedBgCategory, readyWallpaper.url);
        };
        readyImage.onerror=function(){
            localStorage.removeItem('jf_bg_ready');
            applyBg(uiData['bg_url']);
            rotateBg(savedBgCategory, function(url){
                preloadNextBg(savedBgCategory, url);
            });
        };
        readyImage.src=readyWallpaper.url;
    }
    else if(savedBgCategory){
        applyBg(uiData['bg_url']);
        rotateBg(savedBgCategory, function(url){
            preloadNextBg(savedBgCategory, url);
        });
    }
    else{
        applyBg(uiData['bg_url']);
    }
    // var oBg=document.createElement('iframe');
    // oBg.id="bg";
    // oBgWrap.appendChild(oBg);

    // oBg.src='/home/bg/show?type=show&picurl=';

    //切换随机壁纸图片--------------------------
    $('.console-randbg-btn').click(function(){
        var head=this.querySelector('.pinwheel-head');
        if(head){
            head.classList.remove('is-spinning');
            void head.offsetWidth;
            head.classList.add('is-spinning');
        }
        var category=localStorage.getItem(BG_CATEGORY_KEY)||'';
        rotateBg(category, function(url){
            preloadNextBg(category, url);
        });
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
        switch (showKind){
            case 'menu':
                // alert('主目录')

                $('#console-title-box')[0].style.display='flex';
                $('#save-box')[0].style.display='none';
                $('.console-title-img')[0].src='/static/home/images/console/jianfast.svg';        
                $('.console-title')[0].innerHTML='简法主页';
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
    $(".console-bgset-btn").click(function(){
        showConsole('bgset-lib',0);
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
        $('#bg-wrap')[0].style.backgroundImage='url("'+uiData['bg_url']+'")';
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

        $('#loginBtnA')[0].href='/qqlogin/';


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
    var bgOffset=0;
    var bgNoMore=false;
    var bgRequestId=0;
    $ajaxBgStatus=1;

    function rotateBg(category, done){
        var fd=new FormData();
        if(category){
            fd.append('category', category);
        }
        var req=new XMLHttpRequest();
        req.open('POST','/home/bg/randbg',true);
        req.onreadystatechange=function(){
            if(req.readyState==4 && req.status==200){
                var data=JSON.parse(req.response);
                if(data.success && data.bg_url){
                    nowBgpic=data.bg_url;
                    applyBg(data.bg_url);
                    if(done){
                        done(data.bg_url);
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
                var img=new Image();
                img.onload=function(){
                    localStorage.setItem('jf_bg_ready', JSON.stringify({
                        category: data.category || category,
                        url: data.bg_url
                    }));
                };
                img.src=data.bg_url;
            }
        };
        req.send(fd);
    }

    function renderBgCategories(){
        oBgCategoryBar.innerHTML='';
        var hint=document.createElement('div');
        hint.className='bg-category-hint';
        hint.innerHTML=bgCategory ? '已选择此类目，下次打开页面会换一张' : '点选一个分类，之后每次打开页面会轮换一张';
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

    function chooseBgCategory(category){
        var changed=category!==bgCategory;
        bgCategory=category;
        localStorage.setItem(BG_CATEGORY_KEY, category);
        renderBgCategories();
        resetBgList();
        if(changed){
            rotateBg(category, function(url){
                preloadNextBg(category, url);
            });
        }
    }

    function resetBgList(){
        oBgPicWrap.innerHTML='';
        bgOffset=0;
        bgNoMore=false;
        ajaxBg();
    }

    function openBgLibrary(){
        var preview=bgCategory;
        if(bgCategories.length){
            if(!preview){
                preview=bgCategories[0].category;
            }
            bgCategory=localStorage.getItem(BG_CATEGORY_KEY)||'';
            renderBgCategories();
            resetBgList();
            return;
        }
        var req=new XMLHttpRequest();
        req.open('POST','/home/bg/categories',true);
        req.onreadystatechange=function(){
            if(req.readyState==4 && req.status==200){
                bgCategories=JSON.parse(req.response)||[];
                if(!bgCategory && bgCategories.length){
                    preview=bgCategories[0].category;
                }
                renderBgCategories();
                resetBgList();
            }
        };
        req.send();
    }

    function ajaxBg(){
                if($ajaxBgStatus==0 || bgNoMore){
                    return false;
                }
                var previewCategory=bgCategory || (bgCategories[0] && bgCategories[0].category) || '';
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
                            oBgLoadText.innerHTML='';
                            return;
                        }
                        if(ajaxBgList.length<15){
                            bgNoMore=true;
                        }
                        bgOffset+=ajaxBgList.length;
                        for(var i=0;i<ajaxBgList.length;i++){
                            var oNewBgDiv=document.createElement('div');                            
                            oNewBgDiv.className="bg-pic-box";
                            var realPicPath=ajaxBgList[i].replace('/400/',"/");
                            oNewBgDiv.innerHTML="<a download href='"+realPicPath+"' class='set-pic-btn btn' target='_blank' title='下载壁纸'></a>";
                            oNewBgDiv.style.backgroundImage='url("'+ajaxBgList[i]+'")';
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
            nowBgpic=cssBackgroundUrl(this.style.backgroundImage);
            // alert(nowBgpic);
            $('#bg-wrap')[0].style.backgroundImage='url("'+nowBgpic+'")';
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
            $('#bg-wrap')[0].style.backgroundImage='url("'+nowBgpic+'")';
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