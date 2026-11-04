'use client';

import { useEffect, useRef, useState } from 'react';

const FREE_LIMIT = 20;
const PAGE_SIZE = 48;

function cropFrame(width, height, ratio) {
  const fittedWidth = height * ratio;
  if (Math.abs(width - fittedWidth) <= 2) {
    return { width, height, axis: '', max: 0 };
  }
  if (width > fittedWidth) {
    return { width: fittedWidth, height, axis: 'x', max: width - fittedWidth };
  }
  const fittedHeight = width / ratio;
  return { width, height: fittedHeight, axis: 'y', max: height - fittedHeight };
}

function WallpaperCrop({ image, ratio, busy, error, hasPrev, hasNext, onPrev, onNext, onClose, onApply, onDelete }) {
  const [natural, setNatural] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const frame = natural ? cropFrame(natural.width, natural.height, ratio) : null;
  const scale = natural
    ? Math.min(
      Math.max(280, window.innerWidth - 64) / natural.width,
      Math.max(280, window.innerHeight - 64) / natural.height,
    )
    : 1;

  useEffect(() => {
    setNatural(null);
    setOffset({ x: 0, y: 0 });
    drag.current = null;
  }, [image.id, image.url]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onLoad(event) {
    const width = event.currentTarget.naturalWidth;
    const height = event.currentTarget.naturalHeight;
    const next = cropFrame(width, height, ratio);
    setNatural({ width, height });
    setOffset({
      x: next.axis === 'x' ? next.max / 2 : 0,
      y: next.axis === 'y' ? next.max / 2 : 0,
    });
  }

  function onPointerDown(event) {
    if (!frame || !frame.axis) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      origin: frame.axis === 'x' ? offset.x : offset.y,
      scale,
      axis: frame.axis,
      max: frame.max,
    };
  }

  function onPointerMove(event) {
    const current = drag.current;
    if (!current) return;
    const delta = current.axis === 'x'
      ? (event.clientX - current.x) / current.scale
      : (event.clientY - current.y) / current.scale;
    const next = Math.min(current.max, Math.max(0, current.origin + delta));
    setOffset((value) => (current.axis === 'x' ? { ...value, x: next } : { ...value, y: next }));
  }

  function onPointerUp() {
    drag.current = null;
  }

  const box = frame ? {
    left: offset.x * scale,
    top: offset.y * scale,
    width: frame.width * scale,
    height: frame.height * scale,
  } : null;

  return (
    <div className="crop-layer" role="dialog" aria-modal="true" aria-label="按首页比例裁剪">
      <div className="crop-stage" style={natural ? { width: natural.width * scale, height: natural.height * scale } : undefined}>
        <img
          key={image.url}
          src={image.url}
          alt=""
          draggable="false"
          onLoad={onLoad}
          style={natural ? {
            width: natural.width * scale,
            height: natural.height * scale,
            maxWidth: 'none',
            maxHeight: 'none',
          } : undefined}
        />
        {box ? (
          <div
            className={`crop-box${frame.axis ? ` ${frame.axis}` : ''}`}
            style={box}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        ) : null}
        <button type="button" className="crop-nav prev" aria-label="上一张" disabled={!hasPrev || busy} onClick={onPrev}>‹</button>
        <button type="button" className="crop-nav next" aria-label="下一张" disabled={!hasNext || busy} onClick={onNext}>›</button>
        <button type="button" className="crop-close" onClick={onClose}>关闭</button>
        <div className="crop-actions">
          <button
            type="button"
            className="crop-apply"
            disabled={busy || !frame}
            onClick={() => onApply({
              x: offset.x,
              y: offset.y,
              width: frame.width,
              height: frame.height,
            })}
          >
            {busy ? '裁剪中…' : '按比例裁剪'}
          </button>
          <button type="button" className="crop-delete" aria-label="删除这张图片" disabled={busy} onClick={onDelete}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9z" />
            </svg>
          </button>
        </div>
        {error ? <p className="crop-error">{error}</p> : null}
      </div>
    </div>
  );
}

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
  const [viewer, setViewer] = useState(null);
  const [cropError, setCropError] = useState('');

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

  const thumbsStarted = useRef(false);
  const pageAlive = useRef(true);
  const shownPage = Math.min(page, Math.max(1, Math.ceil(images.length / PAGE_SIZE) || 1));
  const shownMissing = images
    .slice((shownPage - 1) * PAGE_SIZE, shownPage * PAGE_SIZE)
    .some((image) => image && !image.thumb);

  useEffect(() => {
    pageAlive.current = true;
    return () => {
      pageAlive.current = false;
    };
  }, []);

  useEffect(() => {
    load().catch(() => setMessage('读取失败，请刷新页面再试'));
  }, []);

  useEffect(() => {
    if (!shownMissing || thumbsStarted.current) return undefined;
    thumbsStarted.current = true;
    async function fillMissingThumbs() {
      let after = 0;
      for (let step = 0; step < 30 && pageAlive.current; step += 1) {
        const response = await fetch('/home/bg/thumbs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ after }),
        });
        const data = await response.json().catch(() => ({}));
        if (!pageAlive.current || !response.ok) return;
        const updated = Array.isArray(data.updated) ? data.updated : [];
        if (updated.length) {
          setImages((list) => list.map((item) => {
            const next = updated.find((row) => Number(row.id) === item.id);
            return next && next.thumb ? { ...item, thumb: next.thumb } : item;
          }));
        }
        after = Number(data.after || after);
        if (!data.batch || !data.remaining) return;
      }
    }
    fillMissingThumbs().catch(() => {});
    return undefined;
  }, [shownMissing]);

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

  function openCrop(image) {
    setCropError('');
    setViewer({
      image,
      ratio: window.innerWidth / Math.max(window.innerHeight, 1),
    });
  }

  function showNeighbor(step) {
    if (busy || !viewer) return;
    const index = images.findIndex((item) => item.id === viewer.image.id);
    const image = images[index + step];
    if (!image) return;
    setCropError('');
    setViewer({
      image,
      ratio: window.innerWidth / Math.max(window.innerHeight, 1),
    });
  }

  async function applyCrop(rect) {
    if (!viewer) return;
    setBusy(true);
    setCropError('');
    try {
      const body = new FormData();
      body.append('id', String(viewer.image.id));
      body.append('x', String(Math.round(rect.x)));
      body.append('y', String(Math.round(rect.y)));
      body.append('width', String(Math.round(rect.width)));
      body.append('height', String(Math.round(rect.height)));
      const response = await fetch('/home/bg/crop', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.url) {
        setCropError(data.error || '裁剪失败，请稍后再试');
        return;
      }
      const nextUrl = data.url;
      const nextThumb = data.thumb || nextUrl;
      const imageId = viewer.image.id;
      setImages((list) => list.map((item) => (item.id === imageId ? { ...item, url: nextUrl, thumb: nextThumb } : item)));
      setViewer((current) => (current && current.image.id === imageId
        ? { ...current, image: { ...current.image, url: nextUrl, thumb: nextThumb } }
        : current));
      setCropError('');
    } catch {
      setCropError('裁剪失败，请稍后再试');
    } finally {
      setBusy(false);
    }
  }

  async function deleteViewerImage() {
    if (!viewer || busy) return;
    if (!window.confirm('删除这张背景图？')) return;
    const imageId = viewer.image.id;
    const index = images.findIndex((item) => item.id === imageId);
    setBusy(true);
    setCropError('');
    try {
      const body = new FormData();
      body.append('id', String(imageId));
      const response = await fetch('/home/bg/remove', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setCropError(data.error || '删除失败，请稍后再试');
        return;
      }
      const rest = images.filter((item) => item.id !== imageId);
      setImages(rest);
      const neighbor = rest[index] || rest[index - 1];
      if (neighbor) {
        setViewer({
          image: neighbor,
          ratio: window.innerWidth / Math.max(window.innerHeight, 1),
        });
      } else {
        setViewer(null);
      }
    } catch {
      setCropError('删除失败，请稍后再试');
    } finally {
      setBusy(false);
    }
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
          <div className="upload-card" key={image.id} onClick={() => openCrop(image)}>
            <img src={image.thumb || image.url} alt="" />
            <button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); removeImage(image.id); }}>删除</button>
          </div>
        ))}
      </div>
      {renderPager()}
      {viewer ? (
        <WallpaperCrop
          image={viewer.image}
          ratio={viewer.ratio}
          busy={busy}
          error={cropError}
          hasPrev={images.some((item, index) => item.id === viewer.image.id && index > 0)}
          hasNext={images.some((item, index) => item.id === viewer.image.id && index < images.length - 1)}
          onPrev={() => showNeighbor(-1)}
          onNext={() => showNeighbor(1)}
          onClose={() => { if (!busy) setViewer(null); }}
          onApply={(rect) => applyCrop(rect).catch(() => setCropError('裁剪失败，请稍后再试'))}
          onDelete={() => deleteViewerImage().catch(() => setCropError('删除失败，请稍后再试'))}
        />
      ) : null}
    </div>
  );
}
