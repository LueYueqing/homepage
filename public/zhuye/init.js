var browserInfo = new Browser();
var browser = browserInfo.browser.toLowerCase();

var oBrowserBtn = document.getElementsByClassName('browser-btn');
var oBrowserSetText = document.getElementsByClassName('browser-set-text');
var oCopyBtn = document.getElementsByClassName('copy-btn');

for (var j = 0; j < oBrowserSetText.length; j++) {
  if (browser.search(oBrowserBtn[j].dataset.browser) != -1) {
    oBrowserBtn[j].style.order = -1;
    $('.browser-img')[j].className = 'browser-img current-browser-img';
    $('.browser-name')[j].className = 'browser-name current-browser-name';
    oBrowserSetText[j].style.display = 'block';
  }
}

for (var i = 0; i < oBrowserBtn.length; i++) {
  oBrowserBtn[i].index = i;
  oBrowserBtn[i].onclick = function () {
    $('.browser-img').removeClass('current-browser-img');
    $('.browser-img')[this.index].className = 'browser-img current-browser-img';
    $('.browser-name').removeClass('current-browser-name');
    $('.browser-name')[this.index].className = 'browser-name current-browser-name';
    $('.browser-set-text').hide();
    for (var n = 0; n < oBrowserSetText.length; n++) {
      if (oBrowserSetText[n].dataset.browser == this.dataset.browser) {
        oBrowserSetText[n].style.display = 'block';
      }
    }
  };
}

for (var k = 0; k < oCopyBtn.length; k++) {
  oCopyBtn[k].onclick = function () {
    $('.copy-btn').html('复制');
    var copyData = this.dataset.copy;
    var transfer = document.createElement('input');
    document.body.appendChild(transfer);
    transfer.value = copyData;
    transfer.select();
    if (document.execCommand('copy')) {
      document.execCommand('copy');
    }
    document.body.removeChild(transfer);
    this.innerHTML = '复制成功';
  };
}
