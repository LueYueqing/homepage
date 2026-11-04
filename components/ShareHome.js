'use client';

import { useEffect, useState } from 'react';

async function postShare(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '操作失败，请稍后再试');
  return data;
}

export default function ShareHome() {
  const [shares, setShares] = useState([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(0);

  async function load() {
    const data = await postShare('/home/share/mine');
    setShares(Array.isArray(data.shares) ? data.shares : []);
    setReady(true);
  }

  useEffect(() => {
    let alive = true;
    postShare('/home/share/mine')
      .then((data) => {
        if (!alive) return;
        setShares(Array.isArray(data.shares) ? data.shares : []);
        setReady(true);
      })
      .catch((error) => {
        if (!alive) return;
        setMessage(error.message);
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function createShare() {
    setBusy(true);
    setMessage('');
    try {
      await postShare('/home/share/create');
      await load();
      setMessage('已生成新的分享链接。');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function stopShare(id) {
    if (!window.confirm('停止后，打开这个链接的人会看到分享已取消。确定停止？')) return;
    setBusy(true);
    setMessage('');
    try {
      await postShare('/home/share/stop', { id });
      await load();
      setMessage('已停止这个分享。');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(share) {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(share.id);
    } catch {
      setMessage('复制失败，请手动选择链接。');
    }
  }

  return (
    <div className="share-panel">
      <p className="share-note">
        生成链接发给朋友。对方没有登录时，首页会轮播你在
        <a href="/set-homepage/upload">上传背景图</a>
        里保存的图片，也可以换一张。对方一旦登录，就只看自己的主页。
      </p>
      <button className="share-btn primary" type="button" onClick={createShare} disabled={busy}>
        创建分享链接
      </button>
      {message ? <p className="share-message">{message}</p> : null}
      {!ready ? <p className="share-note">正在读取分享链接</p> : null}
      {ready && !shares.length ? <p className="share-note">还没有分享链接。</p> : null}
      <div className="share-list">
        {shares.map((share) => (
          <article className="share-item" key={share.id}>
            <input readOnly value={share.url} onFocus={(event) => event.target.select()} />
            <div className="share-meta">
              <span>{share.status === 'active' ? '分享中' : '已停止'}</span>
              <span>打开 {share.open_count} 次</span>
              <span>{share.last_opened_at ? `最近打开 ${share.last_opened_at}` : '还没有人打开'}</span>
              {share.created_at ? <span>创建于 {share.created_at}</span> : null}
            </div>
            <div className="share-actions">
              <button className="share-btn" type="button" onClick={() => copyLink(share)}>
                {copied === share.id ? '已复制' : '复制链接'}
              </button>
              {share.status === 'active' ? (
                <button className="share-btn danger" type="button" onClick={() => stopShare(share.id)} disabled={busy}>
                  停止分享
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
