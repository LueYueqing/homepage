function searchjs(engineData){



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
    
    


        var searchEngine=engineData;    
        var oSearchMenu=document.getElementById('search-menu');
        var oSearchMenuBox=document.getElementById('search-menu-box');
        oSearchMenu.innerHTML='';
        //<li><img src='/static/images/movie4.jpg'><span>百度搜索</span></li>
        for(var i=0;i<searchEngine.length;i++){
            searchEngine[i]['icon']=searchEngine[i]['icon'].replace(/\\/g,'/');            
            var oSearchTypeNewDiv=document.createElement('div'); 
            oSearchTypeNewDiv.className='search-engine';   
            oSearchTypeNewDiv.innerHTML="<img class='engine-img'><span class='engine-title'></span><img class='engine-delete' title='删除' src='/static/home/images/siteSetDelete.png'><img class='engine-edit' title='编辑' src='/static/home/images/siteSetChange.png'>";
            var oEngineDeleteBtn=oSearchTypeNewDiv.getElementsByTagName("img")[1];
            var oEngineEditBtn=oSearchTypeNewDiv.getElementsByTagName("img")[2];
            oSearchTypeNewDiv.dataset.engineStart=searchEngine[i]['url1'];
            oSearchTypeNewDiv.dataset.engineEnd=searchEngine[i]['url2'];
            oSearchTypeNewDiv.children[0].src=searchEngine[i]['icon'];
            oSearchTypeNewDiv.children[1].innerHTML=searchEngine[i]['title'];
            oSearchTypeNewDiv.dataset.sort=oEngineDeleteBtn.dataset.sort=oEngineEditBtn.dataset.sort=searchEngine[i]["sort"];
                            
            oSearchMenu.appendChild(oSearchTypeNewDiv);
        }
    
    //切换搜索引擎--------------------------
        var oSearchType=document.getElementById('search-type');
        //var oSearchTypeIcon=document.getElementById('search-type-icon');
        oSearchType.onclick=function(){
            if(oSearchMenuBox.style.display=='block'){
                $("#search-menu-box").fadeOut(200);
                $("#search-type-arrow")[0].style.transform='rotate(0deg)';
            }
            else{
                $("#search-menu-box").fadeIn(200);
                $("#search-type-arrow")[0].style.transform='rotate(180deg)';
            };             
        }
    
        var oSearchTypeEngine=document.getElementsByClassName('search-engine');
        //var oSearchTypeName=document.getElementById('search-type-name');
        var oSearchLinkStart='';
        var oSearchLinkEnd='';
    
    //切换搜索引擎函数--------------------------
        function changeSearchType(i){
                if(i>=engineData.length){
                    i=0;
                }
                var oSearch=document.getElementById('search');
                oSearchLinkStart=oSearch.dataset.engineStart=searchEngine[i]['url1'];
                oSearchLinkEnd=oSearch.dataset.engineEnd=searchEngine[i]['url2'];
                oSearchType.style.backgroundImage="url("+searchEngine[i]['icon']+")";
                window.localStorage.setItem('searchType',i);
        }
        // for(var i=0;i<oSearchTypeEngine.length;i++){
        //     oSearchTypeEngine[i].index=i;
        //     oSearchTypeEngine[i].onclick=function(){
        //         changeSearchType(this.index);
        //         oSearchMenuBox.style.display='none';
        //     }
        // };
        $('.search-engine').click(function(){
            changeSearchType(this.dataset.sort);
            oSearchMenuBox.style.display='none';
        })


        
    
    //打开页面时的引擎--------------------------
        if(window.localStorage.getItem('searchType')){
            changeSearchType(Number(window.localStorage.getItem('searchType')));
        }
        else{
            changeSearchType(0);
        }

            // 函数：获取URL参数
            function getUrlParameter(name) {
                // 构造一个正则表达式，用于匹配参数
                const regex = new RegExp(`[?&]${name}=([^&#]*)`);
                // 匹配当前URL
                const results = regex.exec(window.location.search);
                // 返回解码参数值，如果如果不存在参数则返回null
                return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
            }

            if(getUrlParameter('ext')=="c"){
                var oSearch=document.getElementById('search');
                oSearchLinkStart=oSearch.dataset.engineStart="https://www.google.com/search?q=";
                oSearchLinkEnd=oSearch.dataset.engineEnd="&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBBzU0MGowajGoAgiwAgE&sourceid=chrome&ie=UTF-8";
                oSearchType.style.backgroundImage="url('/static/home/images/searchChoice/google.svg')";
                // window.localStorage.setItem('searchType',i);
            }
    
    //点击搜索按钮跳转--------------------------
        var oSearch=document.getElementById('search');
        var oSearchBtn=document.getElementById('search-btn');
        var oSearchForm=document.getElementById('search-form');
        oSearchForm.addEventListener("submit",function(event){
            if (oSearch.value) {
                var searchUrl=oSearchLinkStart+replaceStr(oSearch.value)+oSearchLinkEnd;
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
                    window.open(searchUrl);//新标签页打开搜素词   
                }
            }//提交搜索 以及对% #等字符转码
            else if(oSearch.placeholder){                
                if(parseInt($('#search')[0].dataset.open)==0){
                    window.location.href=oSearchLinkStart+replaceStr(oSearch.placeholder)+oSearchLinkEnd;//原标签页打开搜素词
                }
                else{
                    window.open(oSearchLinkStart+replaceStr(oSearch.placeholder)+oSearchLinkEnd);//新标签页打开搜素词
                }
            };

            event.preventDefault();
            return false;   
        });






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












    //点击搜索引擎编辑按钮-------------------------- 
    var oSearchMenu=document.getElementById('search-menu'); 

    $('.console-engineset-btn').click(function(){
        if($("#search-btn-big-box")[0].style.display=='flex'){//已经处于编辑模式下，不重复开启
            return false;
        }
        if(!this.dataset.usertype){//用户未登录,弹出登录界面
            showLoginBtn();
            return false;
        }
        else{//用户已经登录
            initEngineEdit();

            toAddEngine();//添加引擎
            toDeleteEngine()//删除搜索引擎
            toEditEngine();//编辑修改            
        }
    })


    //弹出登录框，并且加来源后缀
    function showLoginBtn(){        
        $('#loginBlackBg').css('display','block');
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
            $('#loginBtnA')[0].href='/qqlogin/?time='+getQueryVariable('urm_sour');
        }
        if(getQueryVariable('page')){
            $('#loginBtnA')[0].href='/qqlogin/?time='+getQueryVariable('page');
        }
        if(getQueryVariable('engine')){
            $('#loginBtnA')[0].href='/qqlogin/?time='+getQueryVariable('engine');
        }
        if(getQueryVariable('time')){
            $('#loginBtnA')[0].href='/qqlogin/?time='+getQueryVariable('time');
        }
        if(getQueryVariable('ext')){
            $('#loginBtnA')[0].href='/qqlogin/?time='+'bl3'+getQueryVariable('ext');
        }        
        return false;
    }

    //初始化搜索引擎编辑状态--------------------------
    function initEngineEdit(){
        //生成网站添加按钮
        var addBtn=document.createElement('sban');
        addBtn.className="add-engine-btn";
        addBtn.innerHTML="<img class='engine-img' src='/static/home/images/addsite.png'>";
        oSearchMenu.appendChild(addBtn);        

        $('#site-wrap').fadeOut(300);
        $('#console-wrap').fadeOut(300);
        $("#fixedBtnBox").fadeOut(300);
        $("#beian-wrap").fadeOut(300);

        $("#search-wrap").css({'opacity':'1',"margin-bottom":"340px"});
        $("#search-menu-box").fadeIn(200);
        $("#search-type-arrow")[0].style.transform='rotate(180deg)';
        $(".search-engine").css('background','#f7f7f7');
        $(".engine-delete").css('display','block');
        $(".engine-edit").css('display','block');
        $("#search-btn-big-box").css('display','flex');

        $(".search-engine").off();//
        document.getElementById('blackBg').onclick=function(){};
        document.getElementById('search-type').onclick=function(){};
        $('#search').fadeOut();
        $('#search-keyword-box').fadeOut();
        // $('#search-btn').fadeOut();
        
            
        
        $( "#search-menu" ).sortable({//jquery sortable.js 拖动模块
            items: "div"
        });
        
    }

	//添加搜索引擎--------------------------
    var oEngineUrlInput=document.getElementById('engineUrlInput');
    var oEngineNameInput=document.getElementById('engineNameInput');
    var oEngineImg=document.getElementById('engineIcon');
	function toAddEngine(){
        $(".add-engine-btn")[0].onclick=function(ev){
            if($('.search-engine').length>45){
                showmsg("无法添加更多的搜索引擎！");
                return false;
            }
            var maxSort=$('.search-engine').length;   //获得sort，当前网址个数
            var oEvent=ev||event;
            oEvent.preventDefault();
            oEngineUrlInput.value=null;
            oEngineNameInput.value=null;
            //oNssIconInput.value=null;
            oEngineImg.src="/static/home/images/defaultsicon/null.png";
            oEngineImg.icontype=1;
            $('#engineSetBlackBg').fadeIn(300);
            $('#engine-edit-box').animate({marginTop:"-150px"},300);
            oEngineUrlInput.focus();            
            $("#engineConfirm")[0].onclick=function(){
                var re=/[^\s]+\.[^\s]+/i;
                if(!re.test(oEngineUrlInput.value)||oEngineUrlInput.value.search('简法')==-1&&oEngineUrlInput.value.search(/jianfast/i)==-1){
                    showmsg("获取图标失败！未输入网址或格式不正确");	
                    return false;
                }
                autoGetSiteTitle();
                //添加网站时Ajax至服务器                                    
                var searchEngine=null;
                var fd = new FormData();		//文件
                var req=new XMLHttpRequest();
                req.open('POST','/home/engine/add',true);//异步
                fd.append("sort",maxSort);
                fd.append("title", oEngineNameInput.value);
                fd.append("url", oEngineUrlInput.value);
                fd.append("icontype", oEngineImg.icontype);
                fd.append("icon", oEngineImg.getAttribute("src"));
                /* 把文件添加到表单里 */
                fd.append("iconfile", document.getElementById("engineIconfile").files[0]);
                 
                req.onreadystatechange=function(){					    	
                    if(req.readyState==4 && req.status==200){					    	
                        if(JSON.parse(req.response)['error']){
                            showmsg(JSON.parse(req.response)['error']);
                            return false;						    		
                        }
                        else if(JSON.parse(req.response)['success']){
                            showmsg(JSON.parse(req.response)['success']);
                            searchEngine=JSON.parse(req.response);
                            	
                            //在页面上写入新增的引擎div
                            var oSearchTypeNewDiv=document.createElement('div'); 
                            oSearchTypeNewDiv.className='search-engine';   
                            oSearchTypeNewDiv.innerHTML="<img class='engine-img'><span class='engine-title'></span><img class='engine-delete' title='删除' src='/static/home/images/siteSetDelete.png'><img class='engine-edit' title='编辑' src='/static/home/images/siteSetChange.png'>";
                            var oEngineDeleteBtn=oSearchTypeNewDiv.getElementsByTagName("img")[1];
                            var oEngineEditBtn=oSearchTypeNewDiv.getElementsByTagName("img")[2];
                            oSearchTypeNewDiv.dataset.engineStart=searchEngine['url1'];
                            oSearchTypeNewDiv.dataset.engineEnd=searchEngine['url2'];
                            oSearchTypeNewDiv.children[0].src=searchEngine['icon'];
                            oSearchTypeNewDiv.children[1].innerHTML=searchEngine['title'];
                            oSearchTypeNewDiv.dataset.sort=oEngineDeleteBtn.dataset.sort=oEngineEditBtn.dataset.sort=searchEngine["sort"];                                            
                           
                            oSearchMenu.insertBefore(oSearchTypeNewDiv,$(".add-engine-btn")[0]);

                            //consolejs(uiData);//更新ui设置
                            $(".engine-delete").fadeIn(1);
                            $(".engine-edit").fadeIn(1);
                            toDeleteEngine();
                            toEditEngine();
                            $(".search-engine").css('background','#f7f7f7');

                            $('#engineSetBlackBg').fadeOut(300);
                        }
                        else{						    		
                            return false;
                        }
                    }
                }
                //req.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=UTF-8");
                req.send(fd);
				
            }

        }
    }

	//编辑修改搜索引擎--------------------------
	function toEditEngine(){
		for(var i=0;i<$(".engine-edit").length;i++){		
				$(".engine-edit")[i].onclick=function(ev){				
					var oEvent=ev||event;
					oEvent.preventDefault();
					oEngineUrlInput.value=this.parentNode.dataset.engineStart+'jianfast'+this.parentNode.dataset.engineEnd;
					oEngineNameInput.value=this.parentNode.children[1].innerHTML;
					
					oEngineImg.src=this.parentNode.children[0].getAttribute("src");
					oEngineImg.icontype=1;

					$('#engineSetBlackBg').fadeIn(300);
					$('#engine-edit-box').animate({marginTop:"-150px"},300);
					oEngineUrlInput.focus();
                    var sort=this.dataset.sort;
					$("#engineConfirm")[0].onclick=function(){	                        		
						if(oEngineUrlInput.value.search(/\./)==-1||oEngineUrlInput.value.search('简法')==-1&&oEngineUrlInput.value.search(/jianfast/i)==-1){
							showmsg("保存失败！未输入网址或格式不正确");	
							return false;
						}
						autoGetSiteTitle();
						var fd = new FormData();		//文件
					    var req=new XMLHttpRequest();
					    req.open('POST','/home/engine/edit',true);//同步
						fd.append("sort",sort);
						fd.append("title", oEngineNameInput.value);
						fd.append("url", oEngineUrlInput.value);
						fd.append("icontype", oEngineImg.icontype);
						fd.append("icon", oEngineImg.getAttribute("src"));
						/* 把文件添加到表单里 */
						fd.append("iconfile", document.getElementById("engineIconfile").files[0]);
					    req.onreadystatechange=function(){					    	
						    if(req.readyState==4 && req.status==200){					    	
						    	if(JSON.parse(req.response)['error']){
							    	showmsg(JSON.parse(req.response)['error']);
						    		return false;						    		
						    	}
						    	else if(JSON.parse(req.response)['success']){							    	
							    	var ajaxData=JSON.parse(req.response);
                                    for(var e=0;e<$(".search-engine").length;e++){	                                        							
                                        if($('.search-engine')[e].dataset.sort==sort){                                            
                                            $('.search-engine')[e].dataset.engineStart=ajaxData['url1'];
                                            $('.search-engine')[e].dataset.engineEnd=ajaxData['url2'];
                                            $('.engine-title')[e].innerHTML=ajaxData['title'];
                                            $('.engine-img')[e].src=ajaxData['icon'];            
                                            $('#engineSetBlackBg').fadeOut(300);
                                        }
                                    }	
                                    showmsg(JSON.parse(req.response)['success']);			    		
						    	}
						    	else{						    		
						    		return false;
						    	}
						    }
						}
						//req.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=UTF-8");
						req.send(fd);  

					}

				}

		}
	}

	//删除搜索引擎--------------------------
	function toDeleteEngine(){
		for(var i=0;i<$(".engine-delete").length;i++){            
            $(".engine-delete")[i].onclick=function(ev){
                for(var j=0;j<$(".engine-delete").length;j++){
                    if($(".engine-delete")[j].dataset.sort==this.dataset.sort){
                        var nowIndex=j;
                        break;
                    }
                }
                var oEvent=ev||event;
                var msg = "确定要删除 "+$(".engine-title")[nowIndex].innerHTML+" 吗?";
                if (confirm(msg)==false){
                 return false;
                }
                oEvent.preventDefault();
                var sort=parseInt(this.dataset.sort);
                //alert(sort);
                if($('.search-engine').length==1){
                    showmsg('至少须保留一个网址');
                    return false;
                }
                //删除网站时Ajax至服务器
                var req=new XMLHttpRequest();
                req.open('POST','/home/engine/delete',true);//异步
                req.onreadystatechange=function(){
                    if(req.readyState==4 && req.status==200){					    	
                        if(JSON.parse(req.response)['error']){
                            showmsg(JSON.parse(req.response)['error']);						    	
                            return false;						    		
                        }
                        if(JSON.parse(req.response)['success']){                            
                            //删除后剩下的网站重新排序                     
                            $('.search-engine')[nowIndex].innerHTML='';
                            $('.search-engine')[nowIndex].style='display:none';	
                            $('.search-engine')[nowIndex].className='engineHide';
                            
                            for(var s=0;s<$('.search-engine').length;s++){
                                if(parseInt($('.search-engine')[s].dataset.sort)>sort){
                                    $('.search-engine')[s].dataset.sort--;
                                    $('.engine-delete')[s].dataset.sort--;
                                    $('.engine-edit')[s].dataset.sort--;
                                }
                            }
                            showmsg(JSON.parse(req.response)['success']);
                        }
                    }
                }
                req.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=UTF-8");
                req.send("sort="+sort);					
            }		
		}
	}


    //网站名称留空时，根据域名自动命名--------------------------
    function autoGetSiteTitle(){
		if(oEngineNameInput.value==""){
			var urlValueSplit=oEngineUrlInput.value.split('/');
			//var urlValue=urlValueSplit[0]+'/'+urlValueSplit[1]+'/'+urlValueSplit[2];
            //oNssNameInput.value=urlValue.split("//")[1];
            var split2=urlValueSplit[2].split('.');
			var valueStr=split2[split2.length-2].toLowerCase();
            oEngineNameInput.value=valueStr.substr(0,1).toUpperCase()+valueStr.substr(1,valueStr.length);
		}
	}

    //关闭网站编辑框--------------------------
    $("#engineCancel")[0].onclick=function(){
		$('#engineSetBlackBg').fadeOut(300);
	}


	//网址input失去焦点自动添加http://--------------------------
	oEngineUrlInput.onblur=function(){
		this.value=this.value.replace(/。/g,".");
		if(this.value!="" && this.value.search("http")==-1){
			this.value="http://"+this.value;
		}
	}


	//保存排序序列数组--------------------------
	function toSort(){
		var sortarray=new Array();
		for(var i=0;i<$('.search-engine').length;i++){
			sortarray.push($('.search-engine')[i].dataset.sort);
		}        
		//alert(sortarray);
		//排序时Ajax至服务器
	    var req=new XMLHttpRequest();
	    req.open('POST','/home/engine/sort',true);//异步
	    req.onreadystatechange=function(){
		    if(req.readyState==4 && req.status==200){					    	
		    	if(JSON.parse(req.response)['error']){
			    	showmsg(JSON.parse(req.response)['error']);						    	
		    		return false;						    		
		    	}
		    	if(JSON.parse(req.response)['success']){
			    	showmsg(JSON.parse(req.response)['success']);			    	
		    	}
		    }
		}
		req.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=UTF-8");
		req.send("sortarray="+sortarray);
		return false;
	}

	$("#engine-confirm")[0].onclick=function(){
		toSort();
		setTimeout(function(){
			location.reload()
		},2000);
	}


    //重置网站数据（清除用户下所有网站，恢复至默认）--------------------------
	function toDeleteAllEngine(){
		//排序时Ajax至服务器
        var fd = new FormData();		//文件
	    var req=new XMLHttpRequest();
	    req.open('POST','/home/engine/deleteallengine',true);//异步
        fd.append("deleteall",'real');
	    req.onreadystatechange=function(){
		    if(req.readyState==4 && req.status==200){
		    	if(JSON.parse(req.response)['success']){
			    	showmsg(JSON.parse(req.response)['success']);			    	
		    	}
		    }
		}
		req.send(fd);
    }

    $("#deleteAllEngine-btn")[0].onclick=function(ev){
        var oEvent=ev||event;
        var msg = "请谨慎操作！\r\n重置引擎数据会删除你自定义的所有搜索引擎，并恢复到默认数据\r\n如果你确定需要重置搜索引擎数据，请输入'全部删除'";
        var word = prompt(msg,"");
        if (word=='全部删除'){
            toDeleteAllEngine();
            setTimeout(function(){
                 location.reload()
            },2000);
        }
	}


    //上传按钮点击
	$('#engineUploadBtn')[0].onclick=function(){		
		$('#engineIconfile')[0].click();
	}
	$('#engineIconfile')[0].onchange=function(){
		verifiUploadIcon(this,'engineIcon');
	}

	//上传图片后立即预览 file对象,图片容器id--------------------------
	function verifiUploadIcon(fileObj,imgId) {
        var fileTypes = [".jpg", ".png",'.jpeg','.gif'];
        var filePath = fileObj.value;
        //当括号里面的值为0、空字符、false 、null 、undefined的时候就相当于false
        if(filePath){
            var isNext = false;
            var fileEnd = filePath.substring(filePath.indexOf("."));
            for (var i = 0; i < fileTypes.length; i++) {
                if (fileTypes[i] == fileEnd) {
                    isNext = true;
                    break;
                }
            }
            if (!isNext){                
                showmsg('请上传jpg / jpeg / png / gif 格式图片');
                fileObj.value = "";
                return false;
            }
        }else {
            return false;
        }
        var fileSize = 0;
        var fileMaxSize = 2048;//2M
        if(filePath){
            fileSize =fileObj.files[0].size;
            var size = fileSize / 1024;
            if (size > fileMaxSize) {
                showmsg("上传图标文件大小不能大于2M！")
                fileObj.value = "";
                return false;
            }else if (size <= 0) {
                showmsg("上传图标文件不能为空！");
                fileObj.value = "";
                return false;
            }
        }else{
            return false;
        }

	    var file=fileObj.files[0];
	           var r = new FileReader();
	                r.readAsDataURL(file);
	                $(r).load(function() {
	                    $('#'+imgId).attr("src", this.result);
	                    oEngineImg.icontype=4;
	            })                   
	     
	}


	//抓取名称和图标--------------------------
	$("#engineZhuaqu")[0].onclick=function(){
		var re=/[^\s]+\.[^\s]+/i;
		if(!re.test(oEngineUrlInput.value)||oEngineUrlInput.value.search('简法')==-1&&oEngineUrlInput.value.search(/jianfast/i)==-1){
			showmsg("获取图标失败！未输入网址或格式不正确");	
			return false;
		}

		//抓取图标时Ajax至服务器
	    var req=new XMLHttpRequest();
	    req.open('POST','/home/site/getIcon',true);//异步

	    req.onreadystatechange=function(){
		    if(req.readyState==4 && req.status==200){					    	
		    	if(JSON.parse(req.response)['error']){
			    	showmsg(JSON.parse(req.response)['error']);
			    	//$('#siteSetBlackBg').fadeOut(300);
		    		return false;						    		
		    	}
		    	else if(JSON.parse(req.response)['success']){
			    	showmsg(JSON.parse(req.response)['success']);
					oEngineImg.icontype=JSON.parse(req.response)['icontype'];
					oEngineImg.src=JSON.parse(req.response)['icon'];				    		
		    	}
		    }
		}
		req.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=UTF-8");
		req.send("url="+replaceStr(oEngineUrlInput.value));	
	}





    
    
    
    
       
    
    
    
    
};//end