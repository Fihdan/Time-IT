// LibraryModal.jsx — окно «Медиотека / Аудиотека ЭХО»
// Список собирается сам из папок (Vite import.meta.glob), JSON не нужен:
//   src/assets/images/*  — картинки
//   src/assets/music/*   — музыка
// Просто кладите файлы в эти папки. Если папки лежат в другом месте, поменяйте пути в glob ниже.
import { useEffect, useRef, useState } from "react";

const toList = (mod) =>
  Object.entries(mod)
    .map(([path, url]) => {
      const file = path.split("/").pop();
      return { file, url, name: decodeURIComponent(file).replace(/\.[^.]+$/, "") };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

const IMAGES = toList(
  import.meta.glob("../assets/images/*.{png,jpg,jpeg,gif,webp,svg}", { eager: true, query: "?url", import: "default" }),
);
const MUSIC = toList(
  import.meta.glob("../assets/music/*.{mp3,wav,ogg,m4a,aac}", { eager: true, query: "?url", import: "default" }),
);

// свой мини-плеер: одинаковая полоса у всех треков, играет только один
let playingAudio = null;
const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

function Track({ url }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => () => ref.current?.pause(), []);

  const toggle = () => {
    const a = ref.current;
    if (a.paused) {
      if (playingAudio && playingAudio !== a) playingAudio.pause();
      playingAudio = a;
      a.play().catch(() => {});
    } else a.pause();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px minmax(0, 1fr) 76px", gap: 8, alignItems: "center", minWidth: 0 }}>
      <audio
        ref={ref} src={url} preload="metadata"
        onLoadedMetadata={(e) => setDur(e.target.duration)}
        onTimeUpdate={(e) => setCur(e.target.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setCur(0)}
      />
      <button type="button" onClick={toggle} aria-label={playing ? "Пауза" : "Играть"}
        style={{ width: 32, height: 32, padding: 0, borderRadius: "50%", fontSize: 13 }}>
        {playing ? "❚❚" : "▶"}
      </button>
      <input type="range" min="0" max={dur || 1} step="0.1" value={cur}
        onChange={(e) => { ref.current.currentTime = Number(e.target.value); setCur(Number(e.target.value)); }}
        style={{ width: "100%", margin: 0 }} />
      <span style={{ fontSize: 12, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#777568" }}>
        {fmt(cur)} / {fmt(dur)}
      </span>
    </div>
  );
}

export default function LibraryModal({ kind, onClose, onPickImage, onPickMusic }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (!kind) return null;

  const items = kind === "images" ? IMAGES : MUSIC;

  const pick = async (it) => {
    setBusy(true);
    setErr("");
    try {
      const blob = await (await fetch(it.url)).blob();
      const file = new File([blob], it.file, { type: blob.type });
      kind === "images" ? onPickImage(file) : onPickMusic(file);
      onClose();
    } catch {
      setErr("Не удалось загрузить файл");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: "min(480px, 100%)", maxHeight: "80vh", overflowY: "auto", overflowX: "hidden" }}
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{kind === "images" ? "Медиотека ЭХО" : "Аудиотека ЭХО"}</h2>
        {err && <p className="hint">{err}</p>}
        {items.length === 0 && <p className="hint">Пока пусто</p>}

        {kind === "images" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
            {items.map((it) => (
              <button key={it.file} type="button" disabled={busy} onClick={() => pick(it)} title={it.name}
                style={{ padding: 4, borderRadius: 10, background: "#fff", border: "1px solid #e8ddc9" }}>
                <img src={it.url} alt={it.name}
                  style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8, display: "block" }} />
                <small style={{ display: "block", marginTop: 4 }}>{it.name}</small>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it) => (
              <div key={it.file}
                style={{
                  display: "grid", gap: 8, padding: "10px 12px", minWidth: 0,
                  borderRadius: 12, background: "#fff", border: "1px solid #e8ddc9",
                }}>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={it.name}>
                  {it.name}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 104px", gap: 10, alignItems: "center" }}>
                  <Track url={it.url} />
                  <button type="button" disabled={busy} onClick={() => pick(it)} style={{ height: 36, padding: "0 12px" }}>
                    Выбрать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}