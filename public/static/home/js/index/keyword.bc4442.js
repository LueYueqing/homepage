

$(document).ready(function(){
    /*-----------------获取关键词js---------------------*/
    var textb=$("#search");
    var timer=null;//搜索框防抖
    textb.keyup(function(event){
        clearTimeout(timer);
        

        if(parseInt($('#search')[0].dataset.keyword)==0){//用户ui设置不显示关键词
            return false;
        }

        if(textb.val()==""||textb.val()==" "){
            // $("#search-btn").fadeOut(500); 
            var keywordbox=$("#search-keyword-box");//关键词盒子
            keywordbox.animate({
                height:0//关键盒子收缩效果
            },100,function(){
                keywordbox.css({display:"none",height:"auto"});
                keywordbox.empty();//清空盒子内容
            });
            return;
        }
        if(event.which!=39&&event.which!=40&&event.which!=37&&event.which!=38&&event.which!=13){
            $("#search-menu-box").fadeOut(200);
            // $("#search-btn").fadeIn(500); 
            $("#search-wrap").animate({opacity: 1},0);            
            timer=setTimeout(function(){ //搜索框防抖
                toAjax();
            },200);
        }
    });

    function toAjax(){
        $.ajax({
            url:"https://sp0.baidu.com/5a1Fazu8AA54nxGko9WTAnF6hhy/su",
            type:"GET",
            dataType:"jsonp",
            jsonp: 'jsoncallback',
            // async: false,//同步
            timeout: 5000,//请求超时
            data:{
                "wd":textb.val(),
                "cb":"keydata"
            },
            success: function (json) {
            },
            error: function (xhr) {
                return;
            }

        });
    }

});



//打印关键词
var aiState=0;
function keydata(keys){
        var len=keys.s.length;
        var keywordbox=$("#search-keyword-box");//关键词盒子
        var textb=$("#search");
        var subb=$("#search-btn");
        var oBg=document.getElementById('blackBg');


 
        var searchCheck=document.getElementById('search-form');
    
        if(len==0){
            keywordbox.css({display:"none"});
        }else{
            keywordbox.css({display:"block"});
        }
        var spans="";
        for(var i=0;i<len;i++)
        {
            // if(i==0){
            //     spans+="<div class='search-keyword' data-ai='"+textb[0].value+"' style='display:flex;text-indent:6px;align-items:center'><img src='/static/home/images/siteimg/xiezuomao24.png' style='height:58%'>"+"AI搜索: "+textb.val()+"</div>"
            // }
            spans+="<div class='search-keyword'>"+keys.s[i]+"</div>"
        }
        keywordbox.html(spans);//把关键词写入关键词盒子
        keywordbox.animate({
            height:(keywordbox.children().height())*len//关键词下滑效果
        },100);                        

        //点击候选词汇

        keywordbox.children().click(function(){
            keywordbox.animate({
                height:0//关键盒子收缩效果
            },100,function(){
                keywordbox.css({display:"none",height:"auto"});
                keywordbox.empty();//清空盒子内容
            });

            textb.focus();//输入框获取焦点*/
            if (textb[0].value) {
                var searchUrl=textb[0].dataset.engineStart+replaceStr(textb[0].value)+textb[0].dataset.engineEnd;
                // if(searchUrl.search('www.baidu.com')!=-1){//跳转百度去除referrer
                //     var oDate = new Date();
                //     window.open('javascript:window.name', '<script>location.replace("'+searchUrl+'")<\/script>'+oDate.getTime());
                // }
                if(parseInt($('#search')[0].dataset.empty)==1){//用户ui设置搜索后清空搜索词
                    $('#search')[0].value='';
                }

                if(parseInt($('#search')[0].dataset.open)==0){
                    window.location.href=searchUrl;//原标签页打开搜素词
                }
                else{
                    if(this.dataset.ai){
                        window.open("https://metaso.cn/?s=jf2nm&referrer_s=jf2nm&q="+replaceStr(textb[0].value))//AI搜索
                    }
                    else{
                        textb.val($(this).html());//选中词汇放入输入框
                        searchUrl=textb[0].dataset.engineStart+replaceStr(textb[0].value)+textb[0].dataset.engineEnd;
                        window.open(searchUrl);//新标签页打开搜素词     
                    }
                                
                }
                
            }//提交搜索 以及对% #等字符转码
        });

        //提交按钮获取焦点后
        subb.focus(function(){//提交按钮获取焦点后
            keywordbox.animate({
                height:0//关键盒子收缩效果
            },100,function(){
                keywordbox.css({display:"none",height:"auto"});
                keywordbox.empty();//清空盒子内容

            });
        });

        var numspan=0;//用来指定选择候选词（通过方向键改变）
        textb.keydown(function(event){//如果使用回车提交时，关键词盒子也可以自动收缩
            if(event.which==13){
                //$('#blackBg').fadeOut(0);//去掉blackBg
                keywordbox.animate({
                height:0//关键盒子收缩效果
                },100,function(){
                    keywordbox.css({display:"none",height:"auto"});
                    keywordbox.empty();//清空盒子内容
                });
            }
            //按下下方向键
            if(event.which==40){
                if(numspan==len)
                    numspan=0;
                for(var i=0;i<len;i++){
                    if(numspan==i){
                        keywordbox.children().eq(i).css({
                            "background-color":"#f1f1f1"
                        });
                    }else{
                        keywordbox.children().eq(i).css({
                            "background-color":"rgba(255,255,255,0.3)"
                        });
                    }
                }

                // if(numspan!=0){
                //     aiState=0;
                    textb.val(keywordbox.children().eq(numspan).html());
                // }
                // else{
                //     aiState=1;
                //     textb.val(keywordbox.children().eq(numspan).data('ai'));
                // }  

                numspan++;
            }
            //按下上方向键
            if(event.which==38){

                numspan--;
                if(numspan==len)
                    numspan=0;
                for(var i=0;i<len;i++){
                    if(numspan==i){
                        keywordbox.children().eq(i).css({
                            "background-color":"#f1f1f1"
                        });
                    }else{
                        keywordbox.children().eq(i).css({
                            "background-color":"rgba(255,255,255,0.3)"
                        });
                    }
                }
                // if(numspan!=0){
                //     aiState=0;
                    textb.val(keywordbox.children().eq(numspan).html());
                // }
                // else{
                //     aiState=1;
                //     textb.val(keywordbox.children().eq(numspan).data('ai'));
                // }  

            }
        });
        keywordbox.children().mouseover(function(){
            numspan=$(this).index();
            for(var i=0;i<len;i++){
                    if(numspan==i){
                        keywordbox.children().eq(i).css({
                            "background-color":"#f1f1f1"
                        });
                    }else{
                        keywordbox.children().eq(i).css({
                            "background-color":"rgba(255,255,255,0.3)"
                        });
                    }
                }
                
        });
}


//特殊字符转义--------------------------
function replaceStr(str){
    str = str.replace(/\%/g, "%25");
    str = str.replace(/\:/g, "%3A");
    str = str.replace(/\//g, "%2F");
    str = str.replace(/\?/g, "%3F");
    str = str.replace(/\=/g, "%3D");
    str = str.replace(/\&/g, "%26");
    str = str.replace(/\+/g, "%2B");
    str = str.replace(/\ /g, "%20");
    str = str.replace(/\#/g, "%23");
    str = str.replace(/\''/g, "%27");			    
    return str;
}