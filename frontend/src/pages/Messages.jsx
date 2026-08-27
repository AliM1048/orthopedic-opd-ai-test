import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MessageCircle, Send } from 'lucide-react';
import api from '../api';

const LIST_POLL_MS = 20000;
const THREAD_POLL_MS = 5000;

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2);
}

// Patient-facing two-way chat (mobile app <-> dashboard) — send-only history,
// no read receipts/edit/delete. Backend: routers/chat.py. No live push, so
// this polls: the conversation list lightly (new chats appearing), and the
// open thread more often (feels responsive while actually watching it).
export default function Messages() {
  const [searchParams] = useSearchParams();
  const preselectId = searchParams.get('patient');

  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(preselectId || null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef(null);

  const loadConversations = useCallback(() => {
    api.get('/api/chats').then((res) => setConversations(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadConversations();
    const id = setInterval(loadConversations, LIST_POLL_MS);
    return () => clearInterval(id);
  }, [loadConversations]);

  const loadThread = useCallback(() => {
    if (!selectedId) { setThread([]); return; }
    api.get(`/api/patients/${selectedId}/messages`).then((res) => setThread(res.data)).catch(() => {});
  }, [selectedId]);

  useEffect(() => {
    loadThread();
    if (!selectedId) return;
    const id = setInterval(loadThread, THREAD_POLL_MS);
    return () => clearInterval(id);
  }, [selectedId, loadThread]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const q = search.toLowerCase();
        return c.patientName.toLowerCase().includes(q) || c.patientMrn.toLowerCase().includes(q);
      })
    : conversations;

  const selected = conversations.find((c) => c.patientId === selectedId) || null;

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    api.post(`/api/patients/${selectedId}/messages`, { text })
      .then((res) => {
        setThread((prev) => [...prev, res.data]);
        setDraft('');
        loadConversations();
      })
      .catch(() => {})
      .finally(() => setSending(false));
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Messages</h1>
          <p>Two-way chat with patients via the mobile app</p>
        </div>
      </div>

      <div className="page-body">
        <div className="ps-layout">
          {/* Left — conversation list */}
          <div className="card ps-list-col">
            <div className="search-bar" style={{ marginBottom: 12 }}>
              <Search size={16} color="var(--text-muted)" />
              <input placeholder="Search conversations…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><MessageCircle size={32} /></div>
                <p>No conversations yet.</p>
              </div>
            ) : (
              <div className="ps-patient-list">
                {filtered.map((c) => {
                  const needsReply = c.lastSenderType === 'patient';
                  return (
                    <button
                      key={c.patientId}
                      type="button"
                      className={`ps-patient-row ${selectedId === c.patientId ? 'active' : ''}`}
                      onClick={() => setSelectedId(c.patientId)}
                    >
                      <div className="patient-avatar" style={{ background: c.patientAvatar, width: 36, height: 36, fontSize: 13 }}>
                        {initials(c.patientName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="ps-patient-name">{c.patientName}</div>
                          {needsReply && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />}
                        </div>
                        <div className="text-muted" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.lastSenderType === 'staff' ? 'You: ' : ''}{c.lastMessageText}
                        </div>
                      </div>
                      <div className="text-muted" style={{ fontSize: 10, flexShrink: 0, alignSelf: 'flex-start' }}>{timeAgo(c.lastMessageAt)}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right — selected thread */}
          <div className="ps-detail-col">
            {!selected ? (
              <div className="card empty-state" style={{ padding: 64 }}>
                <div className="empty-state-icon"><MessageCircle size={40} /></div>
                <p>Select a conversation from the list to view it.</p>
              </div>
            ) : (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div className="patient-avatar" style={{ background: selected.patientAvatar, width: 34, height: 34, fontSize: 12 }}>
                    {initials(selected.patientName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.patientName}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{selected.patientMrn}</div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {thread.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: m.senderType === 'staff' ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        background: m.senderType === 'staff' ? 'var(--primary)' : 'var(--surface-2)',
                        color: m.senderType === 'staff' ? '#fff' : 'var(--text-primary)',
                        border: m.senderType === 'staff' ? 'none' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        borderBottomRightRadius: m.senderType === 'staff' ? 4 : 'var(--radius-lg)',
                        borderBottomLeftRadius: m.senderType === 'staff' ? 'var(--radius-lg)' : 4,
                        padding: '9px 13px',
                      }}
                    >
                      <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</div>
                      <div style={{
                        fontSize: 10, marginTop: 3,
                        color: m.senderType === 'staff' ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                      }}>
                        {m.senderType === 'staff' ? (m.senderName || 'Staff') : selected.patientName} · {timeAgo(m.createdAt)}
                      </div>
                    </div>
                  ))}
                  <div ref={threadEndRef} />
                </div>

                <div style={{ display: 'flex', gap: 8, padding: 14, borderTop: '1px solid var(--border)' }}>
                  <input
                    className="form-control"
                    style={{ flex: 1 }}
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  />
                  <button className="btn btn-primary" onClick={handleSend} disabled={!draft.trim() || sending} title="Send" aria-label="Send message">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
