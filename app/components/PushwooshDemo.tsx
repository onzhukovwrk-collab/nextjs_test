'use client';

/**
 * Pushwoosh Web SDK — Next.js integration demo.
 *
 * Key rules for Next.js:
 *  1. This file is a Client Component ('use client') — SDK can only run in the browser.
 *  2. SDK is loaded via dynamic import inside useEffect — never on the server.
 *  3. manifest.json and pushwoosh-service-worker.js live in /public so they are
 *     served from the site root (required by the browser).
 */

import { useEffect, useRef, useState } from 'react';

// ─── Config ──────────────────────────────────────────────────────────────────

const APP_CODE  = '9A5E2-629F0';
const API_TOKEN = 'qNJYl6Qj66EG8E7x4L2mRKSA7AQLhjMWtr0rDXduarwMjx9c5qk56rD1Dv6SiGej3bYIOkw5g9mr2q1Bqi1r';

// ─── Types ───────────────────────────────────────────────────────────────────

type ResultState = { text: string; type: 'success' | 'error' | 'info' } | null;
type StatusState = 'loading' | 'subscribed' | 'unsubscribed' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PW = any;

// ─── Component ───────────────────────────────────────────────────────────────

export default function PushwooshDemo() {
  const pwRef = useRef<PW>(null);
  const [ready, setReady]           = useState(false);
  const [status, setStatus]         = useState<StatusState>('loading');
  const [subResult, setSubResult]   = useState<ResultState>(null);
  const [userIdVal, setUserIdVal]   = useState('');
  const [userResult, setUserResult] = useState<ResultState>(null);
  const [tags, setTags]             = useState([{ key: '', value: '' }]);
  const [tagsResult, setTagsResult] = useState<ResultState>(null);
  const [eventName, setEventName]   = useState('');
  const [eventAttrs, setEventAttrs] = useState('');
  const [eventResult, setEventResult] = useState<ResultState>(null);
  const [infoResult, setInfoResult] = useState<ResultState>(null);
  const [inboxMessages, setInboxMessages] = useState<PW[]>([]);
  const [inboxCounts, setInboxCounts]     = useState<{ total: number; unread: number; pending: number } | null>(null);
  const [inboxResult, setInboxResult]     = useState<ResultState>(null);

  // ── SDK initialisation (runs once, client-side only) ──────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Dynamic import ensures the SDK is never imported on the server
      const { default: Pushwoosh } = await import('web-push-notifications');

      Pushwoosh.push(['init', {
        logLevel: 'info',
        applicationCode: APP_CODE,
        apiToken: API_TOKEN,
        defaultNotificationTitle: 'Pushwoosh Next.js Demo',
        autoSubscribe: false,
        serviceWorkerUrl: '/pushwoosh-service-worker.js', // served from /public
        inboxWidget: { enable: false },
      }]);

      Pushwoosh.push(['onReady', async () => {
        if (cancelled) return;
        pwRef.current = Pushwoosh;
        setReady(true);
        const subscribed = await Pushwoosh.isSubscribed();
        setStatus(subscribed ? 'subscribed' : 'unsubscribed');
      }]);

      Pushwoosh.push(['onSubscribe',   () => { if (!cancelled) setStatus('subscribed');   }]);
      Pushwoosh.push(['onUnsubscribe', () => { if (!cancelled) setStatus('unsubscribed'); }]);
    })();

    return () => { cancelled = true; };
  }, []);

  const pw: PW = pwRef.current;

  // ── Subscribe ──────────────────────────────────────────────────────────────
  async function handleSubscribe() {
    try {
      await pw.subscribe();
      setSubResult({ text: 'Successfully subscribed!', type: 'success' });
    } catch (e: unknown) {
      setSubResult({ text: String(e instanceof Error ? e.message : e), type: 'error' });
    }
  }

  // ── Unsubscribe ────────────────────────────────────────────────────────────
  async function handleUnsubscribe() {
    try {
      await pw.unsubscribe();
      setSubResult({ text: 'Successfully unsubscribed.', type: 'info' });
    } catch (e: unknown) {
      setSubResult({ text: String(e instanceof Error ? e.message : e), type: 'error' });
    }
  }

  // ── User ID ────────────────────────────────────────────────────────────────
  async function handleSetUserId() {
    if (!userIdVal.trim()) {
      setUserResult({ text: 'Please enter a User ID.', type: 'error' });
      return;
    }
    pw.push(async (api: PW) => {
      try {
        await api.registerUser(userIdVal.trim());
        setUserResult({ text: `User ID set: ${userIdVal.trim()}`, type: 'success' });
      } catch (e: unknown) {
        setUserResult({ text: String(e instanceof Error ? e.message : e), type: 'error' });
      }
    });
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  function handleSetTags() {
    const tagMap: Record<string, string> = {};
    for (const { key, value } of tags) {
      if (key.trim()) tagMap[key.trim()] = value.trim();
    }
    if (Object.keys(tagMap).length === 0) {
      setTagsResult({ text: 'Add at least one tag.', type: 'error' });
      return;
    }
    pw.push(async (api: PW) => {
      try {
        await api.setTags(tagMap);
        setTagsResult({ text: `Tags set: ${JSON.stringify(tagMap)}`, type: 'success' });
      } catch (e: unknown) {
        setTagsResult({ text: String(e instanceof Error ? e.message : e), type: 'error' });
      }
    });
  }

  function handleGetTags() {
    pw.push((api: PW) => {
      try {
        const result = api.getTags();
        const text   = Object.keys(result).length ? JSON.stringify(result, null, 2) : '(no tags set)';
        setTagsResult({ text, type: 'info' });
      } catch (e: unknown) {
        setTagsResult({ text: String(e instanceof Error ? e.message : e), type: 'error' });
      }
    });
  }

  // ── Post Event ────────────────────────────────────────────────────────────
  async function handlePostEvent() {
    if (!eventName.trim()) {
      setEventResult({ text: 'Please enter an event name.', type: 'error' });
      return;
    }
    let attrs: Record<string, unknown> = {};
    if (eventAttrs.trim()) {
      try { attrs = JSON.parse(eventAttrs); }
      catch { setEventResult({ text: 'Invalid JSON in attributes.', type: 'error' }); return; }
    }
    pw.push(async (api: PW) => {
      try {
        await api.postEvent(eventName.trim(), attrs);
        setEventResult({ text: `Event "${eventName.trim()}" sent!`, type: 'success' });
      } catch (e: unknown) {
        setEventResult({ text: String(e instanceof Error ? e.message : e), type: 'error' });
      }
    });
  }

  // ── Device Info ───────────────────────────────────────────────────────────
  async function handleGetInfo() {
    pw.push(async () => {
      try {
        const hwid   = await pw.getHWID();
        const token  = await pw.getPushToken();
        const userId = await pw.getUserId();
        setInfoResult({
          text: `HWID:       ${hwid  || '—'}\nPush Token: ${token || '—'}\nUser ID:    ${userId || '—'}`,
          type: 'info',
        });
      } catch (e: unknown) {
        setInfoResult({ text: String(e instanceof Error ? e.message : e), type: 'error' });
      }
    });
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────
  async function handleLoadInbox() {
    pw.push(async () => {
      try {
        const inbox = pw.pwinbox;
        await inbox.syncMessages();
        const messages = await inbox.loadMessages();
        const total    = await inbox.messagesCount();
        const unread   = await inbox.unreadMessagesCount();
        const pending  = await inbox.messagesWithNoActionPerformedCount();
        setInboxCounts({ total, unread, pending });
        setInboxMessages(messages ?? []);
        setInboxResult(null);
      } catch (e: unknown) {
        setInboxResult({ text: String(e instanceof Error ? e.message : e), type: 'error' });
      }
    });
  }

  async function handleMarkRead(code: string) {
    pw.push(async () => {
      await pw.pwinbox.readMessagesWithCodes([code]);
      await handleLoadInbox();
    });
  }

  async function handleDeleteMsg(code: string) {
    pw.push(async () => {
      await pw.pwinbox.deleteMessagesWithCodes([code]);
      await handleLoadInbox();
    });
  }

  async function handleOpenMsg(code: string) {
    pw.push(async () => {
      await pw.pwinbox.performActionForMessageWithCode(code);
    });
  }

  // ── Status bar ────────────────────────────────────────────────────────────
  const statusDotColor = { loading: '#ccc', subscribed: '#22c55e', unsubscribed: '#f59e0b', error: '#ef4444' }[status];
  const statusText     = { loading: 'Initialising SDK…', subscribed: 'Subscribed to push notifications', unsubscribed: 'Not subscribed', error: 'SDK error' }[status];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <header>
        <div className="logo">🔔</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Pushwoosh Next.js Demo</h1>
          <p style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Application: {APP_CODE}</p>
        </div>
      </header>

      <div className="status-bar">
        <div className="status-dot" style={{ background: statusDotColor }} />
        <span>{statusText}</span>
      </div>

      <div className="container">

        {/* Subscribe / Unsubscribe */}
        <div className="card">
          <h2><span className="card-icon icon-blue">🔔</span> Push Notifications</h2>
          <div className="btn-row">
            <button className="btn btn-green" onClick={handleSubscribe} disabled={!ready || status === 'subscribed'}>
              ✅ Subscribe
            </button>
            <button className="btn btn-red" onClick={handleUnsubscribe} disabled={!ready || status !== 'subscribed'}>
              🚫 Unsubscribe
            </button>
          </div>
          {subResult && <div className={`result result-${subResult.type}`}>{subResult.text}</div>}
        </div>

        {/* User ID */}
        <div className="card">
          <h2><span className="card-icon icon-purple">👤</span> User ID</h2>
          <div className="field-label">User ID</div>
          <input
            type="text"
            value={userIdVal}
            onChange={e => setUserIdVal(e.target.value)}
            placeholder="e.g. user_12345"
          />
          <button className="btn btn-purple" onClick={handleSetUserId} disabled={!ready}>
            Set User ID
          </button>
          {userResult && <div className={`result result-${userResult.type}`}>{userResult.text}</div>}
        </div>

        {/* Tags */}
        <div className="card full-width">
          <h2><span className="card-icon icon-orange">🏷️</span> Tags</h2>
          {tags.map((tag, i) => (
            <div className="tag-row" key={i}>
              <input
                type="text"
                placeholder="Tag name"
                value={tag.key}
                onChange={e => setTags(tags.map((t, j) => j === i ? { ...t, key: e.target.value } : t))}
              />
              <input
                type="text"
                placeholder="Tag value"
                value={tag.value}
                onChange={e => setTags(tags.map((t, j) => j === i ? { ...t, value: e.target.value } : t))}
              />
              <button
                className="tag-remove-btn"
                onClick={() => tags.length > 1 && setTags(tags.filter((_, j) => j !== i))}
              >✕</button>
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <button
              style={{ padding: '10px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}
              onClick={() => setTags([...tags, { key: '', value: '' }])}
            >＋ Add tag</button>
          </div>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn btn-orange" onClick={handleSetTags} disabled={!ready} style={{ marginTop: 0 }}>Set Tags</button>
            <button className="btn btn-outline" onClick={handleGetTags} disabled={!ready} style={{ marginTop: 0 }}>Get Tags</button>
          </div>
          {tagsResult && <div className={`result result-${tagsResult.type}`}>{tagsResult.text}</div>}
        </div>

        {/* Post Event */}
        <div className="card">
          <h2><span className="card-icon icon-teal">⚡</span> Post Event</h2>
          <div className="field-label">Event Name</div>
          <input
            type="text"
            value={eventName}
            onChange={e => setEventName(e.target.value)}
            placeholder="e.g. purchase, login, page_view"
          />
          <div className="field-label">Attributes (JSON)</div>
          <textarea
            value={eventAttrs}
            onChange={e => setEventAttrs(e.target.value)}
            placeholder='{"amount": 9.99, "currency": "USD"}'
          />
          <button className="btn btn-teal" onClick={handlePostEvent} disabled={!ready}>
            Send Event
          </button>
          {eventResult && <div className={`result result-${eventResult.type}`}>{eventResult.text}</div>}
        </div>

        {/* Device Info */}
        <div className="card">
          <h2><span className="card-icon icon-green">ℹ️</span> Device Info</h2>
          <button className="btn btn-primary" onClick={handleGetInfo} disabled={!ready} style={{ marginTop: 0 }}>
            Load Device Info
          </button>
          {infoResult && <div className={`result result-${infoResult.type}`}>{infoResult.text}</div>}
        </div>

        {/* Inbox */}
        <div className="card full-width">
          <div className="inbox-header">
            <h2 style={{ margin: 0 }}><span className="card-icon icon-blue">📥</span> Inbox</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {inboxCounts && (
                <div className="inbox-counts">
                  <span>Total: <strong>{inboxCounts.total}</strong></span>
                  <span>Unread: <strong>{inboxCounts.unread}</strong></span>
                  <span>Pending: <strong>{inboxCounts.pending}</strong></span>
                </div>
              )}
              <button
                className="btn btn-primary"
                onClick={handleLoadInbox}
                disabled={!ready}
                style={{ width: 'auto', marginTop: 0, padding: '8px 16px', fontSize: 13 }}
              >
                🔄 Load Messages
              </button>
            </div>
          </div>

          {inboxResult && <div className={`result result-${inboxResult.type}`}>{inboxResult.text}</div>}

          <div className="inbox-list">
            {inboxMessages.length === 0 ? (
              <div className="empty-inbox">Click &quot;Load Messages&quot; to fetch your inbox</div>
            ) : (
              inboxMessages.map((msg) => (
                <div key={msg.code} className={`inbox-item${msg.isRead ? '' : ' unread'}`}>
                  <div className="msg-title">{msg.title || '(no title)'}</div>
                  <div className="msg-body">{msg.message || ''}</div>
                  <div className="msg-meta">
                    <span className="msg-date">
                      {msg.sendDate ? new Date(msg.sendDate).toLocaleString() : ''}
                    </span>
                    <div className="msg-actions">
                      {!msg.isRead && (
                        <button className="msg-btn msg-btn-read" onClick={() => handleMarkRead(msg.code)}>
                          Mark read
                        </button>
                      )}
                      {msg.link && (
                        <button className="msg-btn msg-btn-open" onClick={() => handleOpenMsg(msg.code)}>
                          Open
                        </button>
                      )}
                      <button className="msg-btn msg-btn-delete" onClick={() => handleDeleteMsg(msg.code)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </>
  );
}
