'use client';

import { useEffect, useState } from 'react';

const LIMIT = 20;

export default function UploadBackgrounds() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [images, setImages] = useState([]);
  const [message, setMessage] = useState('正在读取已上传的背景图');
  const [busy, setBusy] = useState(false);

  async function load(keepMessage) {
    const response = await fetch('/home/bg/mine', { method: 'POST' });
    const data = await response.json();
    setLoggedIn(Boolean(data.logged_in));
    setImages(Array.isArray(data.images) ? data.images : []);
    if (!keepMessage) setMessage('');
    setReady(true);
  }

  useEffect(() => {
    load().catch(() => setMessage('读取失败，请刷新页面再试'));
  }, []);

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    setMessage('');
    let remain = LIMIT - images.length;
    for (const file of files) {
      if (remain <= 0) {
        setMessage(`最多上传 ${LIMIT} 张背景图`);
        setBusy(false);
        return;
      }
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/home/bg/upload', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setMessage(data.error || '上传失败，请稍后再试');
        await load(true).catch(() => {});
        setBusy(false);
        return;
      }
      remain -= 1;
    }
    await load().catch(() => {});
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

  if (!ready) {
    return <p>{message || '正在读取已上传的背景图'}</p>;
  }

  if (!loggedIn) {
    return (
      <div className="upload-panel">
        <p>登录后才能上传背景图。每个账号最多 {LIMIT} 张，首页壁纸库选择「自选」时会轮换这些图片。</p>
        <a className="upload-btn" href="/wechat/login?next=/zhuye/upload">微信登录</a>
      </div>
    );
  }

  return (
    <div className="upload-panel">
      <p>每个账号最多 {LIMIT} 张。上传后，在首页壁纸设置里选择「自选」，就会使用这些背景图。</p>
      <div className="upload-row">
        <label className={`upload-btn${busy || images.length >= LIMIT ? ' disabled' : ''}`}>
          {busy ? '处理中…' : '选择图片'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy || images.length >= LIMIT}
            onChange={(event) => {
              const { files } = event.target;
              event.target.value = '';
              uploadFiles(files).catch(() => setMessage('上传失败，请稍后再试'));
            }}
          />
        </label>
        <span>{images.length}/{LIMIT}</span>
      </div>
      <p className="upload-note">支持 JPG、PNG、WEBP，单张不超过 8MB。</p>
      {message ? <p className="upload-message">{message}</p> : null}
      <div className="upload-grid">
        {images.map((image) => (
          <div className="upload-card" key={image.id} style={{ backgroundImage: `url("${image.url}")` }}>
            <button type="button" disabled={busy} onClick={() => removeImage(image.id)}>删除</button>
          </div>
        ))}
      </div>
    </div>
  );
}
