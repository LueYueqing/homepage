'use client';

import { useEffect, useState } from 'react';

const FREE_LIMIT = 20;
const PAGE_SIZE = 48;

export default function UploadBackgrounds() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [images, setImages] = useState([]);
  const [limit, setLimit] = useState(FREE_LIMIT);
  const [isVip, setIsVip] = useState(false);
  const [vipUntil, setVipUntil] = useState('');
  const [priceYuan, setPriceYuan] = useState('5');
  const [message, setMessage] = useState('正在读取已上传的背景图');
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState('');
  const [pending, setPending] = useState([]);
  const [progress, setProgress] = useState(null);
  const [qr, setQr] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [page, setPage] = useState(1);

  function applyAccount(data) {
    setLoggedIn(Boolean(data.logged_in));
    setImages(Array.isArray(data.images) ? data.images : []);
    setLimit(Number(data.limit) || FREE_LIMIT);
    setIsVip(Boolean(data.is_vip));
    setVipUntil(data.vip_until || '');
    setPriceYuan(String(Number(data.price_yuan) || 5));
  }

  async function load(keepMessage) {
    const response = await fetch('/home/bg/mine', { method: 'POST' });
    const data = await response.json();
    applyAccount(data);
    if (!keepMessage) setMessage('');
    setReady(true);
    return data;
  }

  useEffect(() => {
    load().catch(() => setMessage('读取失败，请刷新页面再试'));
  }, []);

  useEffect(() => {
    const saved = window.sessionStorage.getItem('wa_vip_order') || '';
    if (saved) setOrderNo(saved);
  }, []);

  useEffect(() => {
    if (!orderNo || !loggedIn) return undefined;
    let stopped = false;
    let timer = 0;
    async function poll() {
      const body = new FormData();
      body.append('out_trade_no', orderNo);
      const response = await fetch('/home/vip/status', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (stopped || !response.ok) return;
      if (data.status === 'paid') {
        stopped = true;
        window.clearInterval(timer);
        window.sessionStorage.removeItem('wa_vip_order');
        setOrderNo('');
        setQr('');
        setPaying('');
        await load(true);
        setMessage('会员已开通，现在最多可以上传 100 张');
      }
    }
    poll().catch(() => {});
    timer = window.setInterval(() => poll().catch(() => {}), 2000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [loggedIn, orderNo]);

  function chooseFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = limit - images.length;
    const chosen = files.slice(0, Math.max(room, 0));
    setPending(chosen);
    setProgress(null);
    if (!chosen.length) {
      setMessage(`最多上传 ${limit} 张背景图`);
      return;
    }
    const extra = files.length - chosen.length;
    setMessage(extra > 0
      ? `已选择 ${chosen.length} 张，还有 ${extra} 张超出 ${limit} 张上限`
      : `已选择 ${chosen.length} 张，点「上传」后才会提交`);
  }

  async function uploadFiles() {
    if (!pending.length) return;
    const total = pending.length;
    setBusy(true);
    setMessage('');
    setProgress({ done: 0, total });
    let remain = limit - images.length;
    for (let index = 0; index < pending.length; index += 1) {
      if (remain <= 0) {
        setPending(pending.slice(index));
        setMessage(`最多上传 ${limit} 张背景图`);
        setBusy(false);
        return;
      }
      const body = new FormData();
      body.append('file', pending[index]);
      const response = await fetch('/home/bg/upload', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setPending(pending.slice(index));
        setProgress({ done: index, total });
        setMessage(data.error || '上传失败，请稍后再试');
        await load(true).catch(() => {});
        setBusy(false);
        return;
      }
      remain -= 1;
      setProgress({ done: index + 1, total });
    }
    setPending([]);
    setProgress(null);
    setPage(1);
    await load(true).catch(() => {});
    setMessage('上传成功。到首页壁纸库选择「自选」即可使用');
    setBusy(false);
  }

  async function removeImage(id) {
    setBusy(true);
    setMessage('');
    const body = new FormData();
    body.append('id', String(id));
    const response = await fetch('/home/bg/remove', { method: 'POST', body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      setMessage(data.error || '删除失败，请稍后再试');
      setBusy(false);
      return;
    }
    await load().catch(() => {});
    setBusy(false);
  }

  async function startPay(provider) {
    setPaying(provider);
    setQr('');
    setMessage(provider === 'wechat' ? '正在生成微信支付' : '正在生成支付宝支付');
    const body = new FormData();
    body.append('provider', provider);
    const response = await fetch('/home/vip/create', { method: 'POST', body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      setPaying('');
      setMessage(data.error || '暂时无法发起支付');
      return;
    }
    if (data.out_trade_no) {
      window.sessionStorage.setItem('wa_vip_order', data.out_trade_no);
      setOrderNo(data.out_trade_no);
    }
    if (data.qr) {
      setQr(data.qr);
      setMessage(provider === 'wechat'
        ? '请用微信扫码支付 5 元。支付完成后会员会自动开通'
        : '请用支付宝扫码支付 5 元。支付完成后会员会自动开通');
      setPaying('');
      return;
    }
    setPaying('');
    setMessage('暂时无法发起支付');
  }

  if (!ready) {
    return <p>{message || '正在读取已上传的背景图'}</p>;
  }

  if (!loggedIn) {
    return (
      <div className="upload-panel">
        <p>登录后才能上传背景图。普通用户最多 20 张，会员一年 {priceYuan} 元可上传 100 张。首页壁纸库选择「自选」时会轮换这些图片。</p>
        <a className="upload-btn" href="/wechat/login?next=/set-homepage/upload">微信登录</a>
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageImages = images.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function showPage(next) {
    setPage(Math.min(Math.max(1, next), pageCount));
  }

  function renderPager() {
    if (pageCount <= 1) return null;
    return (
      <div className="upload-pager">
        <button type="button" className="upload-btn" disabled={currentPage <= 1} onClick={() => showPage(currentPage - 1)}>上一页</button>
        <span>{currentPage} / {pageCount}</span>
        <button type="button" className="upload-btn" disabled={currentPage >= pageCount} onClick={() => showPage(currentPage + 1)}>下一页</button>
      </div>
    );
  }

  const vipText = isVip
    ? `会员有效期至 ${vipUntil}，最多可以上传 ${limit} 张。续费再延长一年。`
    : `当前是普通用户，最多 ${limit} 张。会员一年 ${priceYuan} 元，最多 100 张。`;

  return (
    <div className="upload-panel">
      <div className="vip-box">
        <p>{vipText}</p>
        <div className="vip-actions">
          <button type="button" className="upload-submit" disabled={Boolean(paying)} onClick={() => startPay('wechat').catch(() => setMessage('暂时无法发起支付'))}>
            {paying === 'wechat' ? '正在打开…' : '微信支付'}
          </button>
          <button type="button" className="upload-btn" disabled={Boolean(paying)} onClick={() => startPay('alipay').catch(() => setMessage('暂时无法发起支付'))}>
            {paying === 'alipay' ? '正在打开…' : '支付宝支付'}
          </button>
        </div>
        {qr ? <img className="vip-qr" src={qr} alt="支付二维码" /> : null}
      </div>
      <p>上传后，在首页壁纸设置里选择「自选」，就会使用这些背景图。</p>
      <div className="upload-row">
        <label className={`upload-btn${busy || images.length >= limit ? ' disabled' : ''}`}>
          选择图片
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy || images.length >= limit}
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = '';
              chooseFiles(files);
            }}
          />
        </label>
        <button
          type="button"
          className="upload-submit"
          disabled={busy || !pending.length || images.length >= limit}
          onClick={() => uploadFiles().catch(() => setMessage('上传失败，请稍后再试'))}
        >
          {busy ? '上传中…' : '上传'}
        </button>
        <span>{images.length}/{limit}</span>
      </div>
      {progress ? (
        <div className="upload-progress" role="progressbar" aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total}>
          <div className="upload-progress-bar" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
          <span>{progress.done}/{progress.total}</span>
        </div>
      ) : null}
      <p className="upload-note">先选择图片，再点「上传」。支持 JPG、PNG、WEBP，单张不超过 8MB。</p>
      {message ? <p className={/失败|最多|没有|请|还没有|暂时/.test(message) ? 'upload-message' : 'upload-note'}>{message}</p> : null}
      {renderPager()}
      <div className="upload-grid">
        {pageImages.map((image) => (
          <div className="upload-card" key={image.id}>
            <img src={image.url} alt="" />
            <button type="button" disabled={busy} onClick={() => removeImage(image.id)}>删除</button>
          </div>
        ))}
      </div>
      {renderPager()}
    </div>
  );
}
