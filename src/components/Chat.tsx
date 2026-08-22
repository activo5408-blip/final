import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  chatAPI,
  ChatMessage,
  FileSendProgressData,
  FileSendStartData,
  PeerClient,
  formatBytes,
  toFileUrl,
} from "../lib/api";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😉", "😍", "😘", "😜", "🤔",
  "😎", "🙂", "😴", "😢", "😭", "😡", "😱", "🥳", "🤗", "🤩",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "👋", "✌️", "🤝", "❤️",
  "🔥", "🎉", "✅", "❌", "⭐", "💯", "☕", "🍕", "🎮", "📌",
];

const INPUT_MAX_HEIGHT = 110;

type PendingUpload = FileSendStartData & { percent: number; sentBytes: number };

export default function Chat() {
  const [peer, setPeer] = useState<PeerClient | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [peerOnline, setPeerOnline] = useState(false);
  const [typingActive, setTypingActive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<Map<string, PendingUpload>>(new Map());
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const currentPeerId = peer?.id ?? null;
  const currentPeerIdRef = useRef<string | null>(null);
  currentPeerIdRef.current = currentPeerId;

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingClearTimer = useRef<number | null>(null);
  const typingSendTimer = useRef<number | null>(null);
  const dragDepth = useRef(0);

  // ---------------- Suscripciones a eventos del backend ----------------
  useEffect(() => {
    const unlistens = [
      chatAPI.onActivePeer(async (data) => {
        setPeer(data.peer);
        setHistory(data.history || []);
        setPeerOnline(data.peer.online);
        clearTyping();
        setText("");
        setEmojiOpen(false);
        setNotice(null);
        setTimeout(() => inputRef.current?.focus(), 0);
      }),
      chatAPI.onSeenUpdated((data) => {
        if (data.peerId !== currentPeerIdRef.current) return;
        setHistory((prev) =>
          prev.map((m) => (m.fromMe && !m.seen && m.timestamp <= data.upto ? { ...m, seen: true } : m))
        );
      }),
      chatAPI.onPeersUpdated((list) => {
        if (!currentPeerIdRef.current) return;
        const found = list.find((p) => p.id === currentPeerIdRef.current);
        if (found) {
          setPeer(found);
          setPeerOnline(found.online);
        } else {
          setPeerOnline(false);
        }
      }),
      chatAPI.onMessageReceived((msg) => {
        setHistory((prev) => [...prev, msg]);
      }),
      chatAPI.onTypingReceived((data) => {
        if (data.peerId === currentPeerIdRef.current) showTyping();
      }),
      chatAPI.onFileSendStart((data) => {
        if (data.peerId !== currentPeerIdRef.current) return;
        setPendingUploads((prev) => new Map(prev).set(data.tempId, { ...data, percent: 0, sentBytes: 0 }));
      }),
      chatAPI.onFileSendProgress((data: FileSendProgressData) => {
        setPendingUploads((prev) => {
          if (!prev.has(data.tempId)) return prev;
          const next = new Map(prev);
          const item = next.get(data.tempId)!;
          next.set(data.tempId, { ...item, percent: data.percent, sentBytes: data.sentBytes });
          return next;
        });
      }),
      chatAPI.onFileSendError((data) => {
        setPendingUploads((prev) => {
          if (!prev.has(data.tempId)) return prev;
          const next = new Map(prev);
          next.delete(data.tempId);
          return next;
        });
        setNotice("No se pudo enviar el archivo. ¿La otra persona sigue conectada?");
      }),
    ];
    return (
    <div className="window-frame chat-window">
      <div className="chat-topbar" data-tauri-drag-region>
        <div className="chat-header-info">
          <span className="avatar chat-avatar" style={{ ...(peer?.avatar ? { backgroundImage: `url(${peer.avatar})` } : {}) }}>
            {!peer?.avatar && (peer?.username?.[0] || "?")}
          </span>
          <span className="chat-user-copy">
            <span className="chat-name">{peer?.username || "ChatLAN"}</span>
            <span className={"chat-status " + statusClass}><span className="chat-status-dot" />{statusText}</span>
          </span>
        </div>
        <button className="chat-close" aria-label="Cerrar conversación" onClick={() => chatAPI.hideWindow()}>×</button>
      </div>

      <div className="messages" ref={messagesRef}>
        <div className="date-chip">HOY</div>
        {visibleHistory.map((m, i) => <MessageRow key={i} msg={m} />)}
        {notice && <div className="system-notice notice-pill">{notice}<button onClick={() => setNotice(null)}>×</button></div>}
        {uploadsForPeer.map((item) => <PendingRow key={item.tempId} item={item} />)}
      </div>

      <div className={"drop-overlay" + (dragOver ? "" : " hidden")}>Suelta aquí para enviar archivos</div>
      <div className={"emoji-panel modern-emoji-panel" + (emojiOpen ? "" : " hidden")}>{EMOJIS.map((emoji) => <button key={emoji} type="button" className="emoji-option" onClick={() => insertEmoji(emoji)}>{emoji}</button>)}</div>

      <form className="message-form modern-composer" onSubmit={handleSubmit}>
        <button type="button" className="composer-icon" aria-label="Emojis" onClick={() => setEmojiOpen((v) => !v)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>
        </button>
        <button type="button" className="composer-icon" aria-label="Adjuntar archivo" disabled={attaching} onClick={handleAttachClick}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12.5 6.4-6.4a3.2 3.2 0 0 1 4.5 4.5l-7.7 7.7a4.5 4.5 0 0 1-6.4-6.4l7.2-7.2"/></svg>
        </button>
        <textarea ref={inputRef} rows={1} placeholder="Escribe un mensaje..." value={text} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={handleKeyDown} />
        <button type="submit" className="send-button" aria-label="Enviar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 4 14 8-14 8 2.2-6.5L14 12l-6.8-1.5L5 4Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round"/></svg>
        </button>
      </form>
    </div>
  );
}

function MessageRow({ msg }: { msg: ChatMessage }) {
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={"msg-row " + (msg.fromMe ? "me" : "them") }>
      <div className="message-wrap">
        <div className="bubble">
          {msg.type === "file" ? (
            msg.mimeType?.startsWith("image/") ? <img className="chat-image" src={toFileUrl(msg.filePath || "")} alt={msg.fileName} onClick={() => msg.filePath && chatAPI.openFile(msg.filePath)} /> :
            <div className="file-card" onClick={() => msg.filePath && chatAPI.openFile(msg.filePath)}><span className="file-icon">📄</span><span className="file-info"><span className="file-name">{msg.fileName}</span><span className="file-size">{formatBytes(msg.fileSize)}</span></span><span className="download-mark">↓</span></div>
          ) : <span>{msg.text}</span>}
          <span className="msg-meta"><span className="time">{time}</span>{msg.fromMe && <span className={"msg-status" + (msg.seen ? " seen" : "")}>{msg.seen ? "✓✓" : "✓"}</span>}</span>
        </div>
      </div>
    </div>
  );
}

function PendingRow({ item }: { item: PendingUpload }) {
  const isImage = item.mimeType?.startsWith("image/");
  return (
    <div className="msg-row me">
      <div className="bubble">
        <div className="file-card">
          <span className="file-icon">{isImage ? "🖼️" : "📄"}</span>
          <span className="file-info">
            <span className="file-name">{item.fileName}</span>
          </span>
        </div>
        <div className="upload-info">
          Enviando… {formatBytes(item.sentBytes || 0)} / {formatBytes(item.fileSize)} · {item.percent || 0}%
        </div>
        <div className="upload-progress">
          <div className="upload-progress-fill" style={{ width: (item.percent || 0) + "%" }} />
        </div>
      </div>
    </div>
  );
}
