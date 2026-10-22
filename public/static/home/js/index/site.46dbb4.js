function site(){

    var oSiteBox=document.getElementById('site-box');

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

    //刷新用户--------------------------
    var userData=false;
    var writeSiteMenu=null;
    var engineData=null;
    var uidata=null;
    function clogin(){
            var bodyWidth=document.body.offsetWidth;
            var fd = new FormData();		//文件
            var req=new XMLHttpRequest();
            req.open('post','/home/user/clogin',true);//异步
            fd.append("bodyWidth",bodyWidth);            
            req.onreadystatechange=function(){
                if(req.readyState==4 && req.status==200){
                    var ajaxData=JSON.parse(req.response);
                    // console.log(ajaxData);
                    userData=ajaxData['userData'];
                    writeSiteMenu=ajaxData['siteData'];
                    engineData=ajaxData['engineData'];
                    uiData=ajaxData['uiData'];
                    toWriteSite();
                    if(userData['user_type']==0){//未登录，type为0
                        $('#user-box')[0].style.cursor='pointer';
                        $("#beian-wrap").fadeIn(300);//显示备案                        
                        return false;
                    }
                    else{
                        $('.user-head')[0].style.backgroundImage="url('"+userData['user_headimg'].replace('http://',"https://")+"')";
                        $('.user-name')[0].innerHTML=userData['user_name'];
                        $('#signout-btn')[0].style.display='inline-block';
                        $('.console-menu-btn').attr("data-usertype","1");
                        $('.menu-item').attr("data-usertype","1");                        
                        $('#engineSetBtn').attr("data-usertype","1");
                    }
                }	    	
                
            }
            req.send(fd);
    }
    clogin();

    //退出登录--------------------------
    var oSignOutBtn=document.getElementById('signout-btn')
	oSignOutBtn.onclick=function(){

        //退出登录时Ajax至服务器											
        
        var req=new XMLHttpRequest();
        req.open('POST','/home/user/logout',false);//同步

        req.onreadystatechange=function(){
            if(req.readyState==4 && req.status==200){					    	
                if(JSON.parse(req.response)['error']){					    	
                    return false;						    		
                }
                else if(JSON.parse(req.response)['success']){						    			    		
                }
            }
        }
        req.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=UTF-8");
        req.send();

        setTimeout(function(){
            location.reload()
        },500)

        }	




    //获取用户网址导航数据--------------------------
    /*
    var writeSiteMenu=null;
    var uidata=null;
    function getsite(){
        var req=new XMLHttpRequest();
        req.open('post','/home/site/getsite',true);//异步
        req.onreadystatechange=function(){
            if(req.readyState==4 && req.status==200){
                if(JSON.parse(req.response)['error']){
                    showmsg(JSON.parse(req.response)['error']);
                    return false;
                }
                var str=req.response;
                var ajaxData=JSON.parse(str);
                writeSiteMenu=ajaxData['siteData'];
                uiData=ajaxData['uiData'];
                toWriteSite();
            }
        }
        req.send();
    }
    getsite();
    */


    //getsite获取的数据写入前端--------------------------    
    function toWriteSite(){

        if(!writeSiteMenu){
            return false;
        }
        

        oSiteBox.innerHTML="";
        for(var i=0;i<writeSiteMenu.length;i++){
            var oSiteAs=document.createElement('a');
            oSiteAs.className="site-wrap-a siteA siteAs";
            oSiteAs.innerHTML="<li class='site-wrap-li siteLi'><img class='site-img'><img class='site-delete' title='删除' src='/static/home/images/siteSetDelete.png'><img class='site-edit' title='编辑' src='/static/home/images/siteSetChange.png'></li><span class='site-title'></span>";
            for(var j=0;j<writeSiteMenu.length;j++){
                if(writeSiteMenu[j]["sort"]==i){
                    oSiteAs.href=writeSiteMenu[j]["url"];
                    oSiteAs.target="_blank";				
                    oSiteBox.appendChild(oSiteAs);
                    var oSiteAsImg=oSiteAs.getElementsByTagName("img")[0];
                    oSiteAsImg.src=writeSiteMenu[j]["icon"];
                    var oSiteDeleteBtn=oSiteAs.getElementsByTagName("img")[1];
                    var oSiteEditBtn=oSiteAs.getElementsByTagName("img")[2];                 
                    var oSiteAsSpan=oSiteAs.getElementsByTagName("span")[0];
                    oSiteAsSpan.innerHTML=writeSiteMenu[j]["title"];
                    oSiteAs.dataset.sort=oSiteDeleteBtn.dataset.sort=oSiteEditBtn.dataset.sort=writeSiteMenu[j]["sort"];
                }
            }		
        }
        consolejs(uiData);
        searchjs(engineData);
        //显示main-wrap
        // if(writeSiteMenu.length>18){
        //     $('#search-wrap')[0].style.marginBottom='140px';
        // }
        // if(writeSiteMenu.length>36){
        //     $('#search-wrap')[0].style.marginBottom='100px';
        // }

            $('#search-wrap')[0].style.display='flex';
            $('#search')[0].focus();
   
        
    };

    // 原站防盗脚本在本地域名下会卡死页面，已停用。 


    //点击网站编辑按钮--------------------------  
    $('.console-siteset-btn').click(function(){
        if($("#site-btn-box")[0].style.display=='flex'){//已经处于编辑模式下，不重复开启
            return false;
        }
        if($("#site-box")[0].style.display!=='flex'){//所有图标被隐藏
            showmsg('请先在页面布局设置中显示链接图标');
            return false;
        }
        if(userData['user_type']==0){//用户未登录,弹出登录界面
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
            return false;
        }
        else{//用户已经登录
            initSiteEdit();

            toAddSite();//添加网站
            toDeleteSite()//删除网站
            toEditSite();//编辑修改
            
        }
    });

    //初始化网址编辑状态--------------------------
    function initSiteEdit(){
        //生成网站添加按钮
        var addBtn=document.createElement('div');
        addBtn.className="site-wrap-a add-site-btn-div";
        addBtn.innerHTML="<li title='添加' class='site-wrap-li add-site-btn-li'><img class='site-img' src='/static/home/images/addsite.png'></li>";
        oSiteBox.appendChild(addBtn);

        $('#console-wrap').fadeOut(300);
        $("#fixedBtnBox").fadeOut(300);
        $("#beian-wrap").fadeOut(300);

        $("#site-text-span").fadeIn(300);
        $(".site-delete").fadeIn(300);
        $(".site-edit").fadeIn(300);
        $("#site-btn-box").css({'display':'flex'});

            
        $( "#site-wrap" ).sortable({//jquery sortable.js 拖动模块
            items: "a:not(.siteBasic)"
        });

        consolejs(uiData);//更新ui设置
        
    }


	var oNssUrlInput=document.getElementById('nssUrlInput');
	var oNssNameInput=document.getElementById('nssNameInput');
	var oNssIconInput=document.getElementById('nssIconInput');
	var oNssIconBox=document.getElementById('nssIconBox');
	var oNssImg=oNssIconBox.getElementsByTagName('img')[0];
	var oNssiconfile=document.getElementById('iconfile');


	//添加网站--------------------------
	function toAddSite(){
        $(".add-site-btn-div")[0].onclick=function(ev){
            if($('.siteA').length>199){
                showmsg("无法添加更多网站！");
                return false;
            }
            var maxSort=$('.siteA').length;   //获得sort，当前网址个数
            var oEvent=ev||event;
            oEvent.preventDefault();
            oNssUrlInput.value=null;
            oNssNameInput.value=null;
            //oNssIconInput.value=null;
            oNssImg.src="/static/home/images/defaultsicon/null.png";
            oNssImg.icontype=1;
            $('#siteSetBlackBg').fadeIn(300);
            $('#newSiteSetBox').animate({marginTop:"-150px"},300);
            oNssUrlInput.focus();            
            $("#nssConfirm")[0].onclick=function(){
                var re=/[^\s]+\.[^\s]+/i;
                if(!re.test(oNssUrlInput.value)){
                    showmsg("获取图标失败！未输入网址或格式不正确");	
                    return false;
                }
                autoGetSiteTitle();
                //添加网站时Ajax至服务器                                    
                var addRightSite=null;
                var fd = new FormData();		//文件
                var req=new XMLHttpRequest();
                req.open('POST','/home/site/create',true);//异步
                fd.append("sort",maxSort);
                fd.append("title", oNssNameInput.value);
                fd.append("url", oNssUrlInput.value);
                fd.append("icontype", oNssImg.icontype);
                fd.append("icon", oNssImg.getAttribute("src"));
                /* 把文件添加到表单里 */
                fd.append("iconfile", document.getElementById("iconfile").files[0]);
                 
                req.onreadystatechange=function(){					    	
                    if(req.readyState==4 && req.status==200){					    	
                        if(JSON.parse(req.response)['error']){
                            showmsg(JSON.parse(req.response)['error']);
                            return false;						    		
                        }
                        else if(JSON.parse(req.response)['success']){
                            showmsg(JSON.parse(req.response)['success']);
                            addRightSite=JSON.parse(req.response);	
                            //在页面上写入新增的网站标签
                            var oSiteAs=document.createElement('a');
                            oSiteAs.className="site-wrap-a siteA siteAs";
                            oSiteAs.innerHTML="<li class='site-wrap-li siteLi'><img class='site-img'><img class='site-delete' title='删除' src='/static/home/images/siteSetDelete.png'><img class='site-edit' title='编辑' src='/static/home/images/siteSetChange.png'></li><span class='site-title'></span>";
            
                            oSiteAs.href=addRightSite["url"];
                            oSiteAs.target="_blank";				
                            oSiteBox.insertBefore(oSiteAs,$(".add-site-btn-div")[0]);
                            var oSiteAsImg=oSiteAs.getElementsByTagName("img")[0];
                            oSiteAsImg.src=addRightSite["icon"];
                            var oSiteDeleteBtn=oSiteAs.getElementsByTagName("img")[1];
                            var oSiteEditBtn=oSiteAs.getElementsByTagName("img")[2];                 
                            var oSiteAsSpan=oSiteAs.getElementsByTagName("span")[0];
                            oSiteAsSpan.innerHTML=addRightSite["title"];
                            oSiteAs.dataset.sort=oSiteDeleteBtn.dataset.sort=oSiteEditBtn.dataset.sort=addRightSite["sort"];
                            
                            consolejs(uiData);//更新ui设置
                            $(".site-delete").fadeIn(1);
                            $(".site-edit").fadeIn(1);
                            toDeleteSite();
                            toEditSite();
            
                            $('#siteSetBlackBg').fadeOut(300);	
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

	//删除网站--------------------------
	function toDeleteSite(){
		for(var i=0;i<$(".site-delete").length;i++){            
            $(".site-delete")[i].onclick=function(ev){
                for(var j=0;j<$(".site-delete").length;j++){
                    if($(".site-delete")[j].dataset.sort==this.dataset.sort){
                        var nowIndex=j;
                        break;
                    }
                }

                var oEvent=ev||event;
                if($(".site-title")[nowIndex].innerHTML.search('京东')!=-1 ||$(".site-title")[nowIndex].innerHTML.search('淘宝')!=-1){
                    var msg =`
确定要删除${$(".site-title")[nowIndex].innerHTML}吗?
                    `;
                    if (confirm(msg)==false){
                     return false;
                    }
                    oEvent.preventDefault();

                }else{
                    // var msg = "确定要删除 "+$(".site-title")[nowIndex].innerHTML+" 吗?";
                    // if (confirm(msg)==false){
                    //  return false;
                    // }
                    oEvent.preventDefault();
                }
                

                var sort=parseInt(this.dataset.sort);
                //alert(sort);
                if($('.siteA').length==1){
                    showmsg('至少须保留一个网址，如需隐藏所有图标，请在页面布局中设置"隐藏所有图标"');
                    return false;
                }
                //删除网站时Ajax至服务器
                var req=new XMLHttpRequest();
                req.open('POST','/home/site/delete',true);//异步
                req.onreadystatechange=function(){
                    if(req.readyState==4 && req.status==200){					    	
                        if(JSON.parse(req.response)['error']){
                            showmsg(JSON.parse(req.response)['error']);						    	
                            return false;						    		
                        }
                        if(JSON.parse(req.response)['success']){                            
                            //删除后剩下的网站重新排序                     
                            $('.siteA')[nowIndex].innerHTML='';
                            $('.siteA')[nowIndex].style='';	
                            $('.siteA')[nowIndex].className='siteAsHide';
                            
                            for(var s=0;s<$('.siteA').length;s++){
                                if(parseInt($('.siteA')[s].dataset.sort)>sort){
                                    $('.siteA')[s].dataset.sort--;
                                    $('.site-delete')[s].dataset.sort--;
                                    $('.site-edit')[s].dataset.sort--;
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

	//编辑网站--------------------------
	function toEditSite(){
		for(var i=0;i<$(".site-edit").length;i++){		
				$(".site-edit")[i].onclick=function(ev){				
					var oEvent=ev||event;
					oEvent.preventDefault();
					oNssUrlInput.value=this.parentNode.parentNode.href;
					oNssNameInput.value=this.parentNode.parentNode.children[1].innerHTML;
					//oNssIconInput.value=this.parentNode.children[0].children[0].getAttribute("src");
					oNssImg.src=this.parentNode.children[0].getAttribute("src");
					oNssImg.icontype=1;

					$('#siteSetBlackBg').fadeIn(300);
					$('#newSiteSetBox').animate({marginTop:"-150px"},300);
					oNssUrlInput.focus();
                    var sort=this.dataset.sort;
					$("#nssConfirm")[0].onclick=function(){	                        		
						if(oNssUrlInput.value.search(/\./)==-1){
							showmsg("保存失败！未输入网址或格式不正确");	
							return false;
						}
						autoGetSiteTitle();
						var fd = new FormData();		//文件
					    var req=new XMLHttpRequest();
					    req.open('POST','/home/site/edit',true);//同步
						fd.append("sort",sort);
						fd.append("title", oNssNameInput.value);
						fd.append("url", oNssUrlInput.value);
						fd.append("icontype", oNssImg.icontype);
						fd.append("icon", oNssImg.getAttribute("src"));
						/* 把文件添加到表单里 */
						fd.append("iconfile", document.getElementById("iconfile").files[0]);
					    req.onreadystatechange=function(){					    	
						    if(req.readyState==4 && req.status==200){					    	
						    	if(JSON.parse(req.response)['error']){
							    	showmsg(JSON.parse(req.response)['error']);
						    		return false;						    		
						    	}
						    	else if(JSON.parse(req.response)['success']){							    	
							    	var ajaxData=JSON.parse(req.response);
                                    for(var e=0;e<$(".siteAs").length;e++){	                                        							
                                        if($('.siteAs')[e].dataset.sort==sort){                                            
                                            $('.siteAs')[e].href=ajaxData['url'];
                                            $('.site-title')[e].innerHTML=ajaxData['title'];
                                            $('.site-img')[e].src=ajaxData['icon'];            
                                            $('#siteSetBlackBg').fadeOut(300);
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

	//保存排序序列数组--------------------------
	function toWriteLocal(){
		var sortarray=new Array();
		for(var i=0;i<$('.siteA').length;i++){
			sortarray.push($('.siteA')[i].dataset.sort);
		}
		//alert(sortarray);
		//排序时Ajax至服务器
	    var req=new XMLHttpRequest();
	    req.open('POST','/home/site/sort',true);//异步
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

	$("#site-confirm")[0].onclick=function(){
		toWriteLocal();
		setTimeout(function(){
			location.reload()
		},2000);
	}


    //重置网站数据（清除用户下所有网站，恢复至默认）--------------------------
	function toDeleteAllSite(){
		//排序时Ajax至服务器
        var fd = new FormData();		//文件
	    var req=new XMLHttpRequest();
	    req.open('POST','/home/site/deleteallsite',true);//异步
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

    $("#deleteAllSite-btn")[0].onclick=function(ev){
        var oEvent=ev||event;
        var msg = "请谨慎操作！\r\n重置网站数据会删除你自定义的所有网站，并恢复到默认数据\r\n如果你确定需要重置网站数据，请输入'全部删除'";
        var word = prompt(msg,"");
        if (word=='全部删除'){
            toDeleteAllSite();
            setTimeout(function(){
                 location.reload()
             },2000);
        }
	}


	//抓取名称和图标--------------------------
	$("#nssZhuaqu")[0].onclick=function(){
		var re=/[^\s]+\.[^\s]+/i;
		if(!re.test(oNssUrlInput.value)){
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
					oNssImg.icontype=JSON.parse(req.response)['icontype'];
					oNssImg.src=JSON.parse(req.response)['icon'];				    		
		    	}
		    }
		}
		req.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=UTF-8");
		req.send("url="+replaceStr(oNssUrlInput.value));	
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
	                    oNssImg.icontype=4;
	            })                   
	     
	}

	//上传按钮点击
	$('#nssUploadBtn')[0].onclick=function(){		
		$('#iconfile')[0].click();
	}
	$('#iconfile')[0].onchange=function(){
		verifiUploadIcon(this,'nssIcon');
	}

    //网站名称留空时，根据域名自动命名--------------------------
    function autoGetSiteTitle(){
		if(oNssNameInput.value==""){
			var urlValueSplit=oNssUrlInput.value.split('/');
			//var urlValue=urlValueSplit[0]+'/'+urlValueSplit[1]+'/'+urlValueSplit[2];
            //oNssNameInput.value=urlValue.split("//")[1];
            var split2=urlValueSplit[2].split('.');
			var valueStr=split2[split2.length-2].toLowerCase();
            oNssNameInput.value=valueStr.substr(0,1).toUpperCase()+valueStr.substr(1,valueStr.length);
		}
	}

    //关闭网站编辑框--------------------------
    $("#nssCancel")[0].onclick=function(){
		$('#siteSetBlackBg').fadeOut(300);
	}

	//网址input失去焦点自动添加http://--------------------------
	oNssUrlInput.onblur=function(){
		this.value=this.value.replace(/。/g,".");
		if(this.value!="" && this.value.search("http")==-1){
			this.value="http://"+this.value;
		}

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
        return str;
    }

    //暂不登录按钮--------------------------

    $('#noLoginBtn')[0].onclick=function(){
        $('#loginBlackBg').fadeOut(300);
    }






}//function site end