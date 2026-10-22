function bootHomePage(){
    if (window.__JF_BOOTED__) return;
    window.__JF_BOOTED__ = true;
    
    //自动跳转手机端--------------------------
    var mobileAgent = new Array( "android", "mobile", "blackberry", "webos", "incognito", "webmate", "bada", "nokia","iphone", "ipod", "ipad", "lg", "ucweb", "skyfire");
    var browser = navigator.userAgent.toLowerCase();
    var pcLink = false;
    //判断是否是强制访问电脑版链接  ?pc=1
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            if(pair[0] == 'pc'){
                if(pair[1]==1){
                    pcLink=true;
                }
            }
    }

    // 本地镜像没有 /m 移动端页面，避免跳到不存在的地址
    for (var i=0; i<mobileAgent.length; i++){ 
    if (browser.indexOf(mobileAgent[i])!=-1 && !pcLink){ 
        break;
        }
    }


    








    //点击blackBg事件--------------------------
    var oBlackBg=document.getElementById('blackBg');
    oBlackBg.onclick=function(){
        $("#search-menu-box").fadeOut(200);
        $("#search-keyword-box").fadeOut(200);
        $("#search-type-arrow")[0].style.transform='rotate(0deg)';
    }

    //搜索框获得焦点事件--------------------------
    $('#search')[0].onfocus=function(){
        $('#search-menu-box').fadeOut(200);
        $("#search-type-arrow")[0].style.transform='rotate(0deg)';
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



    /*新用户欢迎显示--------------------------*/    
    if(!$.cookie('wel_code')){
        if(!getQueryVariable('ext')){
            if(!$.cookie('u')){
                var browserInfo = new Browser();
                var browser=browserInfo.browser.toLowerCase();
                if(browser=='edge'){
                    $('#welcome-btn-img').attr('src','/zhuye/images/edge.svg');
                    $('#welcome-btn').attr('href','https://microsoftedge.microsoft.com/addons/detail/%E7%AE%80%E6%B3%95%E4%B8%BB%E9%A1%B5/bagnonhnfegiiobmnkfdafkeaanhojef');            
                    $('.welcome-btn-text').html('添加Edge官方扩展');
                    $('.welcome-btn-tips').html('安装完毕在浏览器在扩展页面“启用”一下扩展');            
                }
                // if(browser=='chrome'){
                //     $('#welcome-btn-img').attr('src','/zhuye/images/chrome.svg');
                //     $('#welcome-btn').attr('href','/pages/chromeext');            
                //     $('.welcome-btn-text').html('添加Chrome官方扩展');
                //     $('.welcome-btn-tips').html('打开浏览器默认显示简法主页');            
                // }
                $('#welcome-wrap').fadeIn(300);
        
            }
        }
    }
    $('#welcome-close').click(function(){
        $('#welcome-wrap').fadeOut(300);
        $.cookie('wel_code', '1', { expires: 3500 });//3500天
    });




    // 原站防盗脚本会在非 jianfast 域名下打乱布局并死循环改写历史记录，
    // 本地镜像（file:// 或 127.0.0.1）因此无法打开，这里已停用。 



    // 用户来源
    function getQueryVariable(variable)
    {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i=0;i<vars.length;i++) {
                    var pair = vars[i].split("=");
                    if(pair[0] == variable){return pair[1];}
            }
            return(false);
    }


    if(getQueryVariable('urm_sour')){
        $.cookie('utime', getQueryVariable('urm_sour'), { expires: 3500 });//3500天
    }
    if(getQueryVariable('page')){
        $.cookie('utime', getQueryVariable('page'), { expires: 3500 });//3500天
    }
    if(getQueryVariable('engine')){
        $.cookie('utime', getQueryVariable('engine'), { expires: 3500 });//3500天
    }
    if(getQueryVariable('time')){
        $.cookie('utime', getQueryVariable('time'), { expires: 3500 });//3500天
    }
    // if(getQueryVariable('ext')){
    //     $.cookie('utime', getQueryVariable('ext'), { expires: 3500 });//3500天
    // }



    

    
    
    site();
    // search();
    // consolejs();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootHomePage);
} else {
    bootHomePage();
}