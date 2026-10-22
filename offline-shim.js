/*!
 * jianfast 本地镜像 —— 离线补丁 (offline-shim.js)
 * 在页面脚本发起请求之前，用本地数据应答 /home/* 接口。
 * 数据优先读 _api/*.json（http 服务）；file:// 下改用 _api/payload.js。
 */
(function () {
  'use strict';
  if (window.__JF_OFFLINE__) return;
  window.__JF_OFFLINE__ = true;

  var OrigXHR = window.XMLHttpRequest;
  var LOCAL_BG = 'static/home/images/bg-default.jpg';

  function loadJsonSync(name) {
    try {
      var x = new OrigXHR();
      x.open('GET', '_api/' + name, false);
      x.send(null);
      if ((x.status === 200 || x.status === 0) && x.responseText) {
        return JSON.parse(x.responseText);
      }
    } catch (e) {}
    return null;
  }

  function fixAsset(p) {
    if (typeof p !== 'string' || !p) return LOCAL_BG;
    if (p.indexOf('uploads/') !== -1) return LOCAL_BG;
    if (p.charAt(0) === '/') return p.slice(1);
    return p;
  }

  var files = window.__JF_FILES__ || {};
  var siteData = loadJsonSync('siteData.json') || files.siteData || [];
  var engineData = loadJsonSync('engineData.json') || files.engineData || [];
  var uiData = loadJsonSync('uiData.json') || files.uiData || {};
  var bgList = loadJsonSync('home_bg_ajaxbg.json') || files.bgList || [LOCAL_BG];

  uiData = Object.assign({}, uiData);
  uiData.bg_url = fixAsset(uiData.bg_url || LOCAL_BG);
  siteData = siteData.map(function (item) {
    var next = Object.assign({}, item);
    next.icon = fixAsset(next.icon);
    return next;
  });
  engineData = engineData.map(function (item) {
    var next = Object.assign({}, item);
    next.icon = fixAsset(next.icon);
    return next;
  });
  bgList = (bgList || []).map(fixAsset).filter(Boolean);
  if (!bgList.length) bgList = [LOCAL_BG];

  var payload = {
    userData: { user_type: 0 },
    siteData: siteData,
    engineData: engineData,
    uiData: uiData
  };
  window.__JF_PAYLOAD__ = payload;

  function route(url) {
    var path = String(url || '').split('?')[0];
    var at = path.indexOf('home/');
    if (at === -1) return null;
    var key = '/' + path.slice(at);
    if (key.indexOf('/home/user/clogin') === 0 || key === '/home/user/login') return payload;
    if (key.indexOf('/home/bg/ajaxbg') === 0) return bgList;
    if (key.indexOf('/home/bg/randbg') === 0) return { success: 1, bg_url: LOCAL_BG };
    if (key.indexOf('/home/ui/getDefaultUi') === 0) return uiData;
    if (key.indexOf('/home/engine/getnews') === 0) {
      return ['搜你想搜的', '简法主页', '今日热搜'];
    }
    if (key.indexOf('/home/') === 0) {
      return { success: '本地预览模式，修改不会写回服务器' };
    }
    return null;
  }

  function LocalXHR() {
    this.readyState = 0;
    this.status = 0;
    this.statusText = '';
    this.responseText = '';
    this.response = '';
    this.responseType = '';
    this.withCredentials = false;
    this.timeout = 0;
    this.upload = {};
    this.onreadystatechange = null;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
    this.ontimeout = null;
    this._real = null;
    this._local = false;
    this._async = true;
    this._url = '';
  }

  LocalXHR.prototype.open = function (method, url, async) {
    this._url = String(url || '');
    this._async = async !== false;
    this._local = route(this._url) !== null;
    this.readyState = 1;
    if (!this._local) {
      this._real = new OrigXHR();
      return this._real.open.apply(this._real, arguments);
    }
  };

  LocalXHR.prototype.setRequestHeader = function () {
    if (this._real) return this._real.setRequestHeader.apply(this._real, arguments);
  };

  LocalXHR.prototype.overrideMimeType = function () {
    if (this._real) return this._real.overrideMimeType.apply(this._real, arguments);
  };

  LocalXHR.prototype.getAllResponseHeaders = function () {
    if (this._real) return this._real.getAllResponseHeaders();
    return '';
  };

  LocalXHR.prototype.getResponseHeader = function (name) {
    if (this._real) return this._real.getResponseHeader(name);
    if (String(name).toLowerCase() === 'content-type') return 'application/json; charset=utf-8';
    return null;
  };

  LocalXHR.prototype.abort = function () {
    if (this._real) return this._real.abort();
    this.readyState = 0;
  };

  LocalXHR.prototype.send = function (body) {
    var self = this;
    if (this._real) {
      this._real.onreadystatechange = function () {
        self.readyState = self._real.readyState;
        self.status = self._real.status;
        self.statusText = self._real.statusText;
        try { self.responseText = self._real.responseText; } catch (e) { self.responseText = ''; }
        try { self.response = self._real.response; } catch (e2) { self.response = self.responseText; }
        if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
      };
      this._real.onload = function () {
        if (typeof self.onload === 'function') self.onload();
      };
      this._real.onerror = function () {
        if (typeof self.onerror === 'function') self.onerror();
      };
      return this._real.send(body);
    }

    var data = route(this._url);
    var text = typeof data === 'string' ? data : JSON.stringify(data);
    var finish = function () {
      self.readyState = 4;
      self.status = 200;
      self.statusText = 'OK';
      self.responseText = text;
      self.response = text;
      if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
      if (typeof self.onload === 'function') self.onload();
    };
    if (this._async) setTimeout(finish, 0);
    else finish();
  };

  LocalXHR.UNSENT = 0;
  LocalXHR.OPENED = 1;
  LocalXHR.HEADERS_RECEIVED = 2;
  LocalXHR.LOADING = 3;
  LocalXHR.DONE = 4;

  window.XMLHttpRequest = LocalXHR;
})();
