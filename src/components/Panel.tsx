import { useEffect, useMemo, useState } from "react";
import { chatAPI, PeerClient } from "../lib/api";

type Tab = "contacts" | "settings";

export default function Panel() {
  const [myName, setMyName] = useState("");
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [peers, setPeers] = useState<PeerClient[]>([]);
  const [autostart, setAutostart] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [tab, setTab] = useState<Tab>("contacts");
  const [nameDraft, setNameDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    chatAPI.getInit().then((data) => {
      setMyName(data.username || "");
      setNameDraft(data.username || "");
      setMyAvatar(data.avatar);
      setPeers(data.peers || []);
    });
    chatAPI.getAutostart().then(setAutostart);
    setDark(localStorage.getItem("chatlan-theme") !== "light");

    const unlisten = chatAPI.onPeersUpdated((list) => setPeers(list));
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("chatlan-theme", dark ? "dark" : "light");
  }, [dark]);

  async function handleAvatarClick() {
    setPickingAvatar(true);
    try {
      const result = await chatAPI.pickAvatar();
      if (result && "avatar" in result && result.avatar) setMyAvatar(result.avatar);
    } finally { setPickingAvatar(false); }
  }

  async function handleAutostartChange(checked: boolean) {
    setAutostart(checked);
    await chatAPI.setAutostart(checked);
  }

  const sorted = useMemo(() => {
    return [...peers].sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username));
  }, [peers]);

  const unreadTotal = peers.reduce((n, p) => n + (p.unread || 0), 0);

  return (
    <div className="window-frame app-panel">
      <div className="flyout-header panel-header" data-tauri-drag-region>
        <div className="brand-mini"><span className="brand-dot" /> ChatLAN</div>
        <div className="header-actions">
          <button className="close-btn" aria-label="Ocultar" onClick={() => chatAPI.hideWindow()}>✕</button>
        </div>
      </div>

      <div className="profile-strip">
        <button type="button" className="avatar avatar-btn profile-avatar" title="Cambiar foto" disabled={pickingAvatar}
          style={myAvatar ? { backgroundImage: `url(${myAvatar})` } : undefined} onClick={handleAvatarClick}>
          {!myAvatar && (myName[0] || "C")}
        </button>
        <div className="profile-copy"><strong>{myName || "ChatLAN"}</strong></div>
      </div>

      {tab === "contacts" && (
        <>
          <div className="contacts-heading">
            <span>Contactos</span>
            <span className="contacts-count">{sorted.length}</span>
          </div>
          <div className="peer-list modern-list">
            {sorted.length === 0 && <div className="empty-state"><div>⌁</div><b>No hay contactos</b><span>ChatLAN buscará automáticamente otras PCs conectadas a esta red.</span></div>}
            {sorted.map((peer) => (
              <button key={peer.id} className="peer-item modern-peer" onClick={() => chatAPI.openChat(peer.id)}>
                <span className="avatar-wrap">
                  <span className="avatar peer-avatar" style={peer.avatar ? { backgroundImage: `url(${peer.avatar})` } : undefined}>
                    {!peer.avatar && peer.username[0]}
                  </span>
                </span>
                <span className="peer-info"><span className="peer-name">{peer.username}</span></span>
                <span className={"presence-dot " + (peer.online ? "online" : "sleep")} title={peer.online ? "Conectado" : "No disponible"} />
                {peer.unread > 0 && <span className="peer-badge">{peer.unread}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "settings" && (
        <div className="settings-page">
          <div className="settings-title">Ajustes</div>
          <div className="profile-editor-card">
            <button type="button" className="avatar avatar-btn profile-editor-avatar" title="Cambiar foto de perfil" disabled={pickingAvatar} style={myAvatar ? { backgroundImage: `url(${myAvatar})` } : undefined} onClick={handleAvatarClick}>
              {!myAvatar && (myName[0] || "C")}
            </button>
            <div className="profile-editor-copy"><b>Foto de perfil</b><span>Haz clic en la foto para cambiarla.</span></div>
          </div>
          <div className="setting-card profile-name-card"><div><b>Nombre</b><span>Así te verán las demás PCs de la red.</span></div><input className="profile-name-input" value={nameDraft} maxLength={40} onChange={(e) => setNameDraft(e.target.value)} /></div>
          <button className="save-profile-btn" disabled={savingProfile || !nameDraft.trim()} onClick={async () => {
            setSavingProfile(true);
            try { const result = await chatAPI.setUsername(nameDraft); setMyName(result.username); setNameDraft(result.username); } finally { setSavingProfile(false); }
          }}>{savingProfile ? "Guardando…" : "Guardar perfil"}</button>
          <div className="setting-card"><div><b>Iniciar con Windows</b><span>Abre ChatLAN automáticamente.</span></div><input type="checkbox" checked={autostart} onChange={(e) => handleAutostartChange(e.target.checked)} /></div>
          <div className="setting-card"><div><b>Tema</b><span>{dark ? "Oscuro" : "Claro"}</span></div><button className="theme-switch" onClick={() => setDark((v) => !v)}>{dark ? "☾" : "☀"}</button></div>
          <div className="setting-card static"><div><b>Red local</b><span>Descubrimiento automático P2P · sin servidor</span></div><span className="connected-pill">ACTIVO</span></div>
          <div className="about-box"><strong>ChatLAN 2.0</strong><span>Mensajería privada dentro de tu red local.</span></div>
        </div>
      )}

      <nav className="bottom-nav two-tabs">
        <button className={tab === "contacts" ? "selected" : ""} onClick={() => setTab("contacts")}><span>♙</span>Contactos</button>
        <button className={tab === "settings" ? "selected" : ""} onClick={() => setTab("settings")}><span>⚙</span>Ajustes</button>
      </nav>
    </div>
  );
}
