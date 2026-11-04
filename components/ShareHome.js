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
  const [messageBad, setMessageBad] = useState(false);
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
    setMessageBad(false);
    try {
      await postShare('/home/share/create');
      await load();
      setMessage('已生成新的分享链接。');
    } catch (error) {
      setMessageBad(true);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function stopShare(id) {
    if (!window.confirm('停止后，打开这个链接的人会看到分享已取消。确定停止？')) return;
    setBusy(true);
    setMessage('');
    setMessageBad(false);
    try {
      await postShare('/home/share/stop', { id });
      await load();
      setMessage('已停止这个分享。');
    } catch (error) {
      setMessageBad(true);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function startShare(id) {
    setBusy(true);
    setMessage('');
    setMessageBad(false);
    try {
      await postShare('/home/share/start', { id });
      await load();
      setMessage('已启用这个分享。原来的链接可以继续打开。');
    } catch (error) {
      setMessageBad(true);
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
      setMessageBad(true);
      setMessage('复制失败，请手动选择链接。');
    }
  }

  return (
    <div className="share-panel">
      <p className="share-note">
        把你上传的壁纸分享出去。对方没有登录时，这个网址导航的首页会轮播
        <a href="/set-homepage/upload">上传壁纸</a>
        里的图片，也可以换一张。对方登录后，只看自己的主页。
      </p>
      <button className="share-btn primary" type="button" onClick={createShare} disabled={busy}>
        创建分享链接
      </button>
      {message ? <p className={messageBad ? 'share-message bad' : 'share-message'}>{message}</p> : null}
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
              ) : (
                <button className="share-btn primary" type="button" onClick={() => startShare(share.id)} disabled={busy}>
                  启用分享
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
