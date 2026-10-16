// EditorPage.jsx
import { useEffect, useReducer, useRef, useState } from "react";
import { Form, Link, useNavigate } from "react-router-dom";
import { useUser } from "../router/useUser";
import { shortLogin } from "../utils/user";
import { save_card, update_start, get_date_start, del_date_start } from "../api/api";
import { CardCanvas, CANVAS } from "../components/CardCanvas";
import DrawingLayer from "../components/Drawinglayer";
import VoiceRecorder from "../components/VoiceRecorder";
import LibraryModal from "../components/LibraryModal";
import { DRAW_COLORS, DRAW_WIDTHS, historyReducer, initialHistory, strokesToSvg } from "../components/drawing";
import "./editor.css";
 
const FONTS = [
  { label: "Классический", value: "Georgia, serif" },
  { label: "Современный", value: "Inter, Arial, sans-serif" },
  { label: "Рукописный", value: "'Segoe Script', cursive" },
];
const ALIGNS = [
  { label: "По центру", value: "center" },
  { label: "По левому краю", value: "left" },
  { label: "По правому краю", value: "right" },
];
const SIZES = [
  { label: "Маленький", value: 20 },
  { label: "Средний", value: 28 },
  { label: "Большой", value: 40 },
  { label: "Очень большой", value: 56 },
];
const BACKGROUNDS = ["#fffdf8", "#e8d9c3", "#f6dcc4", "#dfe6c8", "#d9e4ee"];
 
const uid = () => Math.random().toString(36).slice(2, 10);
 
const ICONS = {
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5M12 15V3" />
    </>
  ),
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2z" />
    </>
  ),
  record: (
    <>
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8" />
    </>
  ),
  audio: (
    <>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M13 2v7h7M2 12v5l4 2v-9z" />
      <path d="m10 13 3-2v8l-3-2" />
    </>
  ),
  text: <path d="M4 4h16M12 4v17" />,
  clipboard: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5M12 3v12" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="15" height="15" rx="2" />
      <path d="m3 16 5-5 4 4 2-2 4 4" />
      <circle cx="13" cy="9" r="1.5" />
      <path d="M7 3h12a2 2 0 0 1 2 2v12" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  mute: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="m17 9 5 6m0-6-5 6" />
    </>
  ),
  loud: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" />
    </>
  ),
  templateBig: (
    <>
      <rect x="4" y="7" width="40" height="34" />
      <path d="M30 7v34M9 13h16M9 19h13M9 25h16" />
      <rect x="34" y="13" width="5" height="11" />
    </>
  ),
  musicBig: (
    <>
      <path d="M21 35V7l22-5v28" />
      <circle cx="12" cy="36" r="8" />
      <circle cx="34" cy="30" r="8" />
    </>
  ),
  // ——— иконки рисования ———
  pen: (
    <>
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </>
  ),
  eraser: (
    <>
      <path d="m7 21-4.3-4.3a2 2 0 0 1 0-2.8l9.6-9.6a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13 21" />
      <path d="M22 21H7M5 11l9 9" />
    </>
  ),
  undo: (
    <>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </>
  ),
  redo: (
    <>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
};
 
function Icon({ name, box = 24, sw = 1.7 }) {
  return (
    <svg viewBox={`0 0 ${box} ${box}`} fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}
 
function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="accordion" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="chevron" sw={1.8} />
        {title}
      </button>
      {open && <div className="accordion-panel">{children}</div>}
    </>
  );
}
 
function Range({ id, label, value, onChange }) {
  return (
    <div className="range-setting">
      <label htmlFor={id}>{label}</label>
      <div className="range-row">
        <Icon name="mute" />
        <input id={id} type="range" min="0" max="100" value={value}
          onChange={(e) => onChange(Number(e.target.value))} />
        <Icon name="loud" />
      </div>
    </div>
  );
}
 
function useToast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef();
  const show = (m) => {
    setMsg(m);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2600);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return [msg, visible, show];
}
 
function useObjectUrl(blob) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
 
/* ——— Плавающая панель рисования ——— */
function DrawingToolbar({
  tool, setTool, color, setColor, width, setWidth,
  canUndo, canRedo, canClear, onUndo, onRedo, onClear, onDone,
}) {
  const barStyle = {
    position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)",
    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
    borderRadius: 999, background: "#fffdf8",
    boxShadow: "0 8px 24px rgba(58, 45, 21, 0.25)",
    border: "1px solid rgba(37, 35, 24, 0.12)", zIndex: 1000,
  };
  const btn = (active) => ({
    width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(37,35,24,0.15)",
    background: active ? "#4c8bf5" : "#fffdf8",
    color: active ? "#fffdf8" : "#252318",
    display: "grid", placeItems: "center", cursor: "pointer", padding: 0,
  });
  const swatch = (c) => ({
    width: 22, height: 22, borderRadius: "50%", cursor: "pointer", padding: 0,
    background: c, border: color === c ? "2px solid #4c8bf5" : "1px solid rgba(37,35,24,0.25)",
    boxShadow: c === "#ffffff" ? "inset 0 0 0 1px rgba(0,0,0,0.08)" : undefined,
  });
  const div = { width: 1, height: 24, background: "rgba(37,35,24,0.15)", margin: "0 2px" };
 
  return (
    <div style={barStyle} role="toolbar" aria-label="Инструменты рисования">
      <button type="button" title="Кисть" style={btn(tool === "pen")} onClick={() => setTool("pen")}>
        <Icon name="pen" sw={1.8} />
      </button>
      <button type="button" title="Ластик" style={btn(tool === "eraser")} onClick={() => setTool("eraser")}>
        <Icon name="eraser" sw={1.8} />
      </button>
      <span style={div} />
      {DRAW_COLORS.map((c) => (
        <button key={c} type="button" style={swatch(c)} onClick={() => setColor(c)} aria-label={`цвет ${c}`} />
      ))}
      <span style={div} />
      <select value={width} onChange={(e) => setWidth(Number(e.target.value))}
        style={{ borderRadius: 8, padding: "4px 6px", border: "1px solid rgba(37,35,24,0.2)", background: "transparent" }}>
        {DRAW_WIDTHS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
      </select>
      <span style={div} />
      <button type="button" title="Отменить" style={btn(false)} disabled={!canUndo} onClick={onUndo}>
        <Icon name="undo" sw={1.8} />
      </button>
      <button type="button" title="Вернуть" style={btn(false)} disabled={!canRedo} onClick={onRedo}>
        <Icon name="redo" sw={1.8} />
      </button>
      <button type="button" title="Очистить рисунок" style={btn(false)} disabled={!canClear} onClick={onClear}>
        <Icon name="trash" sw={1.8} />
      </button>
      <span style={div} />
      <button type="button" onClick={onDone}
        style={{ borderRadius: 999, padding: "6px 14px", border: 0, background: "#252318", color: "#fffdf8", cursor: "pointer" }}>
        Готово
      </button>
    </div>
  );
}
 
/* ——— Страница ——— */
export default function EditorPage() {
  const navigate = useNavigate();
  const user = useUser();
  const [els, setEls] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [background, setBackground] = useState(BACKGROUNDS[0]);
 
  const [voice, setVoice] = useState(null);
  const [music, setMusic] = useState(null);
  const [voiceVol, setVoiceVol] = useState(80);
  const [musicVol, setMusicVol] = useState(35);
  const [recorderKey, setRecorderKey] = useState(0);
 
  // ——— рисование ———
  const [drawHistory, dispatchDraw] = useReducer(historyReducer, initialHistory);
  const strokes = drawHistory.present;
  const [drawMode, setDrawMode] = useState(null); // null | "pen" | "eraser"
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[1].value);
 
  const [recordOpen, setRecordOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [timeSettings, setTimeSettings] = useState({ available_date: "", available_time: "" });
  // Отложенная настройка времени: undefined — не меняли, null — «доступна сразу» (удалить),
  // ISO-строка — установить. Отправляется только при общем сохранении открытки.
  const [pendingTime, setPendingTime] = useState();
  // Пользователь уже ввёл свои дату/время в меню: ответ бэка не должен перезаписывать их
  const timeDirtyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [libKind, setLibKind] = useState(null); // null | "images" | "music"
  const [toastMsg, toastOn, toast] = useToast();
 
  const imageFiles = useRef(new Map());
  const imageInput = useRef(null);
  const imageMenuRef = useRef(null);
  const timeMenuRef = useRef(null);
  const datePickerRef = useRef(null);
  const voiceInput = useRef(null);
  const musicInput = useRef(null);
  const audioRef = useRef([]);
  const voiceRecorderRef = useRef(null); // чтобы остановить запись по кнопке «Готово»
 
  const voiceUrl = useObjectUrl(voice);
  const musicUrl = useObjectUrl(music);
 
  const selected = els.find((e) => e.id === selectedId) || null;
  const selText = selected?.type === "text" ? selected : null;
 
  const sig = JSON.stringify([
    els, strokes, background, voiceVol, musicVol, voice?.size ?? 0, music?.name ?? "",
  ]);
  const [baseSig, setBaseSig] = useState(sig);
  const [saved, setSaved] = useState(false);
  // отложенное время (pendingTime) в sig не входит, поэтому учитываем его отдельно
  const status =
    sig !== baseSig || pendingTime !== undefined
      ? "Есть несохранённые изменения"
      : saved ? "Сохранено" : "Черновик не сохранён";
 
  /* ----- блоки ----- */
  const maxZ = () => Math.max(0, ...els.map((e) => e.z));
  const minZ = () => Math.min(0, ...els.map((e) => e.z));
  const patch = (id, p) => setEls((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const setSel = (p) => selText && patch(selText.id, p);
 
  const addText = () => {
    const n = els.length % 6;
    const el = {
      id: uid(), type: "text", x: 200 + n * 20, y: 150 + n * 30, w: 400, z: maxZ() + 1,
      text: "Новый текст", size: 28, color: "#252318", font: FONTS[0].value, align: "center",
    };
    setEls((p) => [...p, el]);
    setSelectedId(el.id);
    setEditingId(el.id);
  };
 
  const addImage = (file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(320 / img.naturalWidth, (CANVAS.h * 0.8) / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * k);
      const h = Math.round(img.naturalHeight * k);
      const id = uid();
      imageFiles.current.set(id, file);
      setEls((p) => [...p, {
        id, type: "image",
        x: Math.round((CANVAS.w - w) / 2), y: Math.round((CANVAS.h - h) / 2),
        w, h, z: Math.max(0, ...p.map((e) => e.z)) + 1, url,
      }]);
      setSelectedId(id);
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Не удалось открыть изображение"); };
    img.src = url;
  };
 
  const remove = (id) => {
    const el = els.find((e) => e.id === id);
    if (el?.type === "image") { URL.revokeObjectURL(el.url); imageFiles.current.delete(id); }
    setEls((p) => p.filter((e) => e.id !== id));
    setSelectedId(null); setEditingId(null);
  };
 
  const stopEdit = () => {
    if (editingId) {
      setEls((p) => p.filter((e) => e.id !== editingId || e.type !== "text" || e.text.trim() !== ""));
    }
    setEditingId(null);
  };
 
  const select = (id) => {
    setSelectedId(id);
    if (id !== editingId) stopEdit();
  };
 
  useEffect(() => {
    const onKey = (e) => {
      if (recordOpen || previewOpen || drawMode !== null) return;
      const tag = document.activeElement?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) remove(selectedId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, els, recordOpen, previewOpen, drawMode]); // eslint-disable-line
 
  // вставка картинки из буфера обмена по Ctrl+V
  useEffect(() => {
    const onPaste = (e) => {
      if (recordOpen || previewOpen || drawMode !== null) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            addImage(file);
            toast("Картинка вставлена из буфера обмена");
          }
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [recordOpen, previewOpen, drawMode]); // eslint-disable-line

  // закрытие меню «Вставка картинки» по клику вне него или по Escape
  useEffect(() => {
    if (!imageMenuOpen) return;
    const onDown = (e) => {
      if (imageMenuRef.current && !imageMenuRef.current.contains(e.target)) setImageMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setImageMenuOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [imageMenuOpen]);

  // закрытие меню «Время открытки» по клику вне него или по Escape
  useEffect(() => {
    if (!timeMenuOpen) return;
    const onDown = (e) => {
      if (timeMenuRef.current && !timeMenuRef.current.contains(e.target)) setTimeMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setTimeMenuOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [timeMenuOpen]);

  /* ----- файлы ----- */
  const onPickImage = (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (f) addImage(f);
  };
  // вставка картинки из буфера обмена по кнопке меню (navigator.clipboard.read)
  const pasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) return toast("Скопируйте картинку и нажмите Ctrl+V");
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        const ext = type.split("/")[1].split("+")[0] || "png";
        addImage(new File([blob], `clipboard-${Date.now()}.${ext}`, { type }));
        toast("Картинка вставлена из буфера обмена");
        return;
      }
      toast("В буфере обмена нет картинки");
    } catch {
      toast("Не удалось прочитать буфер обмена. Попробуйте Ctrl+V");
    }
  };
  const onPickVoice = (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setVoice(f); setRecorderKey((k) => k + 1); toast(`Голос: ${f.name}`);
  };
  const onPickMusic = (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setMusic(f); toast(`Музыка: ${f.name}`);
  };
  const clearVoice = () => { setVoice(null); setRecorderKey((k) => k + 1); };
 
  /* ----- рисование ----- */
  const startDrawing = (tool = "pen") => {
    setSelectedId(null);
    setEditingId(null);
    setDrawMode(tool);
  };
  const stopDrawing = () => setDrawMode(null);
 
  /* ----- предпросмотр со звуком ----- */
  const stopAudio = () => { audioRef.current.forEach((a) => a.pause()); audioRef.current = []; };
  const startAudio = () => {
    stopAudio();
    const list = [];
    if (musicUrl) {
      const a = new Audio(musicUrl); a.loop = true; a.volume = musicVol / 100;
      a.play().catch(() => {}); list.push(a);
    }
    if (voiceUrl) {
      const a = new Audio(voiceUrl); a.volume = voiceVol / 100;
      a.play().catch(() => {}); list.push(a);
    }
    audioRef.current = list;
  };
  const openPreview = () => {
    setSelectedId(null); setEditingId(null); setDrawMode(null);
    setPreviewOpen(true); startAudio();
  };
  const closePreview = () => { setPreviewOpen(false); stopAudio(); };
  useEffect(() => stopAudio, []); // eslint-disable-line
 
  /* ----- сохранение и отправка ----- */
  const lastSaved = useRef({ sig: null, link: null });
  const session = useRef({}); // id открытки и что уже отправлено: повторное сохранение обновляет ту же открытку
  const savePromise = useRef(null); // текущее сохранение: повторные вызовы ждут его, а не запускают второе

  // применяет настройку времени на бэке; вызывается только внутри save(), когда открытка уже создана
  const syncTime = async (id) => {
    if (pendingTime === undefined) return; // время не меняли — ничего не отправляем
    if (pendingTime === null) {
      // «доступна сразу»: удаляем ограничение; false = ограничения и не было — тоже успех
      await del_date_start({ id_card: id });
    } else {
      // бэкенд принимает строго date_start (+ id_card) — см. app.py: /update_start
      const ok = await update_start({ id_card: id, date_start: pendingTime });
      if (ok === false) throw new Error("time update failed");
    }
    setPendingTime(undefined);
  };

  const save = async () => {
    if (savePromise.current) return savePromise.current; // сохранение уже идёт — ждём его результат
    setSaving(true);
    const p = (async () => {
      try {
        // открытка не менялась, но менялось время — отправляем только его
        if (lastSaved.current.sig === sig && lastSaved.current.link) {
          if (pendingTime !== undefined && session.current.id) await syncTime(session.current.id);
          return lastSaved.current.link;
        }

        // рисунок -> SVG-файл; всё остальное api.save_card загрузит сам, уже привязав файлы к открытке
        const drawing = strokes.length
          ? new File([strokesToSvg(strokes, CANVAS.w, CANVAS.h)], "drawing.svg", { type: "image/svg+xml" })
          : null;

        const { id } = await save_card(
          {
            canvas: CANVAS,
            background,
            elements: els,
            audio: { voiceVol: voiceVol / 100, musicVol: musicVol / 100 },
          },
          { images: imageFiles.current, voice, music, drawing },
          session.current,
        );

        await syncTime(id);
        setBaseSig(sig);
        setSaved(true);
        const link = `${location.origin}/c/${id}`;
        lastSaved.current = { sig, link };
        return link;
      } finally {
        // ничего не сбрасываем здесь: если в теле нет await, finally выполнится
        // раньше присваивания savePromise.current и промис «залипнет» навсегда
      }
    })();
    savePromise.current = p;
    const done = () => {
      if (savePromise.current === p) savePromise.current = null;
      setSaving(false);
    };
    p.then(done, done); // сброс строго после присваивания; ошибку отдаёт сам p
    return p;
  };
 
  const onSave = async () => {
    try { await save(); toast("Открытка сохранена"); }
    catch { toast("Не удалось сохранить открытку"); }
  };

  // «Поделиться» выдаёт только ссылку: новую, если открытка изменилась, или ту же самую
  const share = async () => {
    if (!els.length && !strokes.length) return toast("Сначала добавьте на открытку текст, картинку или рисунок");
    let link;
    try { link = await save(); } catch { return toast("Не удалось сохранить открытку"); }
    try { await navigator.clipboard.writeText(link); toast("Ссылка скопирована"); }
    catch { window.prompt("Ссылка на открытку:", link); }
  };

  /* ----- время открытки ----- */
  // ISO-строка с бэка -> локальные дата (ДД.ММ.ГГГГ) и время (ЧЧ:ММ) для отдельных полей
  const toLocalParts = (iso) => {
    // «2026-10-16 15:00:00» с пробелом Safari/iOS не понимает — приводим к ISO-виду
    const d = new Date(String(iso).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return { date: "", time: "" };
    const pad = (n) => String(n).padStart(2, "0");
    return {
      date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  };

  const loadTimeSettings = async () => {
    if (!session.current.id) return;
    // есть отложенное изменение — показываем его, а не значения с бэка
    if (pendingTime !== undefined) {
      if (pendingTime === null) {
        setTimeSettings({ available_date: "", available_time: "" });
      } else {
        const { date, time } = toLocalParts(pendingTime);
        setTimeSettings({ available_date: date, available_time: time });
      }
      return;
    }
    try {
      const t = await get_date_start({ id_card: session.current.id });
      // пользователь уже начал вводить свои значения — не перезаписываем их
      if (timeDirtyRef.current) return;
      // бэк возвращает саму дату строкой, а не объектом — поддерживаем оба варианта
      const raw = typeof t === "string" ? t : t?.available_from;
      if (raw) {
        const { date, time } = toLocalParts(raw);
        setTimeSettings({ available_date: date, available_time: time });
      } else {
        setTimeSettings({ available_date: "", available_time: "" });
      }
    } catch { /* бэк ещё не готов — оставляем текущие значения */ }
  };

  const saveTimeSettings = () => {
    // Никаких запросов: только валидация и запись в стейт.
    // На бэк время уйдёт при нажатии общей кнопки «Сохранить».
    const date = timeSettings.available_date.trim();
    const time = timeSettings.available_time.trim();
    // дата и время вводятся с клавиатуры: проверяем формат ДД.ММ.ГГГГ и ЧЧ:ММ
    let availableFrom = null; // null — «доступна сразу»
    if (date || time) {
      // дата вводится как ДД.ММ.ГГГГ — приводим к ISO ГГГГ-ММ-ДД
      const m = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      if (!m || !/^\d{2}:\d{2}$/.test(time)) {
        toast("Укажите дату в формате ДД.ММ.ГГГГ и время ЧЧ:ММ");
        return;
      }
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      const [hh, mi] = time.split(":").map(Number);
      const d = new Date(yyyy, mm - 1, dd, hh, mi);
      // new Date молча «переносит» 31.02 на март и 25:99 на следующий день — сверяем обратно
      if (
        Number.isNaN(d.getTime()) ||
        d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd ||
        d.getHours() !== hh || d.getMinutes() !== mi
      ) {
        toast("Некорректная дата или время");
        return;
      }
      availableFrom = d.toISOString();
    }
    timeDirtyRef.current = false;
    setPendingTime(availableFrom);
    setTimeMenuOpen(false);
    toast(
      availableFrom && new Date(availableFrom).getTime() <= Date.now()
        ? "Эта дата уже прошла — открытка будет доступна сразу. Нажмите «Сохранить»"
        : "Время запишется при нажатии «Сохранить»",
    );
  };

  const clearTimeSettings = () => {
    timeDirtyRef.current = false;
    setTimeSettings({ available_date: "", available_time: "" });
    setPendingTime(null); // при общем сохранении ограничение будет удалено
    setTimeMenuOpen(false);
    toast("Ограничение времени снимется при сохранении");
  };

  const toggleTimeMenu = () => {
    setDrawMode(null);
    if (!timeMenuOpen && session.current.id) {
      timeDirtyRef.current = false; // открываем меню — поля считаем «не тронутыми»
      loadTimeSettings();
    }
    setTimeMenuOpen((o) => !o);
  };

  // рукописный ввод даты: только цифры, автоформат ДД.ММ.ГГГГ,
  // год не длиннее 4 цифр (всего 8 цифр: дд + мм + гггг)
  const onDateChange = (e) => {
    timeDirtyRef.current = true; // пользователь вводит свои значения
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    let out = digits;
    if (digits.length > 2) out = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length > 4) out = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
    setTimeSettings((s) => ({ ...s, available_date: out }));
  };

  // рукописный ввод времени как у даты: только цифры, автоформат ЧЧ:ММ
  const onTimeChange = (e) => {
    timeDirtyRef.current = true; // пользователь вводит свои значения
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    let out = digits;
    if (digits.length > 2) out = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    setTimeSettings((s) => ({ ...s, available_time: out }));
  };

  const openDatePicker = () => {
    try { datePickerRef.current?.showPicker?.(); } catch { /* браузер не поддерживает showPicker */ }
  };
 
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e) => e.key === "Escape" && closePreview();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]); // eslint-disable-line
 
  /* ----- принудительный ландшафт на телефоне ----- */
  // На телефоне редактор удобнее в горизонтальной ориентации: в портретном режиме
  // показываем экран «Поверните телефон» и пробуем зафиксировать ландшафт.
  const [needRotate, setNeedRotate] = useState(false);

  useEffect(() => {
    const portrait = window.matchMedia("(orientation: portrait)");
    const phone = window.matchMedia("(max-width: 950px) and (pointer: coarse)");
    const update = () => setNeedRotate(portrait.matches && phone.matches);
    update();
    portrait.addEventListener("change", update);
    phone.addEventListener("change", update);
    // пробуем зафиксировать ландшафт сразу (сработает, если браузер это разрешает)
    try { screen.orientation?.lock?.("landscape")?.catch?.(() => {}); } catch { /* не поддерживается */ }
    return () => {
      portrait.removeEventListener("change", update);
      phone.removeEventListener("change", update);
    };
  }, []);

  // Авто-поворот: в Chrome на Android требует полноэкранного режима.
  // Если браузер не поддерживает — пользователь просто повернёт телефон вручную.
  const lockLandscape = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation?.lock) await screen.orientation.lock("landscape");
    } catch { /* браузер не поддерживает авто-поворот */ }
  };
  
  /* ----- левая панель ----- */
  const tools = [
    { id: "record", icon: "record", label: "Запись голоса", run: () => { setDrawMode(null); setRecordOpen(true); } },
    { id: "audio",  icon: "audio",  label: "Загрузить голос", run: () => { setDrawMode(null); voiceInput.current.click(); } },
    { id: "text",   icon: "text",   label: "Ввести текст",      run: () => { setDrawMode(null); addText(); } },
    { id: "image",  icon: "image",  label: "Вставка картинки",   run: () => { setDrawMode(null); setImageMenuOpen((o) => !o); } },
    { id: "music",  icon: "music",  label: "Выбрать музыку",    run: () => { setDrawMode(null); musicInput.current.click(); } },
    { id: "draw",   icon: "pen",    label: "Рисование",         run: () => startDrawing("pen") },
    { id: "time",   icon: "clock",  label: "Время открытки",    run: toggleTimeMenu },
  ];
 
  return (
    <>
      <div className="app" >
        <header className="topbar">
          <Link className="brand" to="/" aria-label="ЭХО — на главную">ЭХО</Link>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Сохранить открытку" title="Сохранить открытку"
              onClick={onSave} disabled={saving}>
              <Icon name="save" />
            </button>
            <button className="icon-button" type="button" aria-label="Поделиться открыткой" title="Поделиться открыткой"
              onClick={share} disabled={saving}>
              <Icon name="share" />
            </button>
            {user.isGuest ? (
              <button className="login-button" type="button" onClick={() => navigate("/login")}>
                <span>Войти</span>
                <svg className="user-icon" viewBox="0 0 40 44" aria-hidden="true">
                  <circle cx="20" cy="11" r="8.5" />
                  <path d="M5 39V32.5C5 26.7 9.7 22 15.5 22h9C30.3 22 35 26.7 35 32.5V39H5Z" />
                </svg>
              </button>
            ) : (
              <div className="user-panel">
                <Link className="user-login" to="/profile" title="Профиль">{shortLogin(user.login)}</Link>
                <Form method="post" action="/logout">
                  <button className="logout-button" type="submit">Выйти</button>
                </Form>
              </div>
            )}
          </div>
        </header>
 
        <main className="workspace">
          <nav className="tool-sidebar" aria-label="Инструменты открытки">
            {tools.map((t) =>
              t.id === "image" ? (
                // «Вставка картинки»: совмещённое меню (буфер обмена / файл)
                <div className="tool-button-wrap" ref={imageMenuRef} key={t.id}>
                  <button
                    className={`tool-button${imageMenuOpen ? " is-active" : ""}`}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={imageMenuOpen}
                    onClick={t.run}
                  >
                    <Icon name={t.icon} sw={1.6} />
                    <span>{t.label}</span>
                  </button>
                  {imageMenuOpen && (
                    <div className="tool-menu" role="menu" aria-label="Вставка картинки">
                      <button className="tool-menu-item" type="button" role="menuitem"
                        onClick={() => { setImageMenuOpen(false); pasteFromClipboard(); }}>
                        <Icon name="clipboard" sw={1.6} />
                        <span>
                          <strong>Из буфера обмена</strong>
                          <small>скопируйте картинку заранее</small>
                        </span>
                      </button>
                      <button className="tool-menu-item" type="button" role="menuitem"
                        onClick={() => { setImageMenuOpen(false); imageInput.current.click(); }}>
                        <Icon name="upload" sw={1.6} />
                        <span>
                          <strong>Выбрать файл</strong>
                          <small>JPG, PNG, GIF</small>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : t.id === "time" ? (
                // «Время открытки»: меню с настройками времени
                <div className="tool-button-wrap" ref={timeMenuRef} key={t.id}>
                  <button
                    className={`tool-button${timeMenuOpen ? " is-active" : ""}`}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={timeMenuOpen}
                    onClick={t.run}
                  >
                    <Icon name={t.icon} sw={1.6} />
                    <span>{t.label}</span>
                  </button>
                  {timeMenuOpen && (
                    <div className="tool-menu tool-menu-time" role="menu" aria-label="Время открытки">
                      <div className="time-field">
                        <label>Доступна с</label>
                        <div className="time-row">
                          <div className="date-wrap">
                            <input type="text" inputMode="numeric" placeholder="ДД.ММ.ГГГГ" maxLength={10}
                              aria-label="Дата, с которой открытка доступна"
                              value={timeSettings.available_date}
                              onChange={onDateChange} />
                            <button type="button" className="date-picker-btn" aria-label="Открыть календарь"
                              onClick={openDatePicker}>
                              <Icon name="calendar" sw={1.6} />
                            </button>
                            <input ref={datePickerRef} type="date" className="visually-hidden" tabIndex={-1}
                              aria-hidden="true"
                              onChange={(e) => {
                                if (e.target.value) {
                                  timeDirtyRef.current = true; // выбор из календаря — тоже правка
                                  const [y, mo, d] = e.target.value.split("-");
                                  setTimeSettings((s) => ({ ...s, available_date: `${d}.${mo}.${y}` }));
                                }
                              }} />
                          </div>
                          <input type="text" inputMode="numeric" placeholder="ЧЧ:ММ" maxLength={5}
                            aria-label="Время, с которого открытка доступна"
                            value={timeSettings.available_time}
                            onChange={onTimeChange} />
                        </div>
                        <small>оставьте пустым, чтобы открыть сразу</small>
                      </div>
                      <div className="time-actions">
                        <button className="tool-menu-item" type="button" role="menuitem"
                          onClick={saveTimeSettings}>
                          <Icon name="save" sw={1.6} />
                          <span>
                            <strong>ОК</strong>
                            <small>запомнить для общего сохранения</small>
                          </span>
                        </button>
                        <button className="tool-menu-item" type="button" role="menuitem"
                          onClick={clearTimeSettings}>
                          <Icon name="trash" sw={1.6} />
                          <span>
                            <strong>Сбросить</strong>
                            <small>убрать ограничение при сохранении</small>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button key={t.id} className="tool-button" type="button" onClick={t.run}>
                  <Icon name={t.icon} sw={1.6} />
                  <span>{t.label}</span>
                </button>
              )
            )}
          </nav>
 
          <section className="editor" aria-labelledby="editorTitle">
            <div className="editor-heading">
              <div>
                <p className="eyebrow">Твоя история в открытке</p>
                <h2 id="editorTitle">Создание открытки</h2>
              </div>
              <span className="save-status" role="status">
                {saving ? "Сохраняем…" : status}
              </span>
            </div>
 
            <section className="postcard" aria-label="Редактор открытки">
              <div className="postcard-stage">
                <CardCanvas
                  elements={els}
                  background={background}
                  fit="contain"
                  selectedId={selectedId}
                  editingId={editingId}
                  locked={drawMode !== null} // во время рисования объекты нельзя двигать и изменять
                  onSelect={select}
                  onEdit={(id) => (id ? setEditingId(id) : stopEdit())}
                  onChange={patch}
                >
                  {/* ——— слой рисования поверх всего холста ——— */}
                  <DrawingLayer
                    strokes={strokes}
                    size={CANVAS}
                    active={drawMode !== null}
                    tool={drawMode === "eraser" ? "eraser" : "pen"}
                    color={drawColor}
                    width={drawWidth}
                    onCommit={(s) => dispatchDraw({ type: "add", stroke: s })}
                    onErase={(ids) => dispatchDraw({ type: "erase", ids })}
                  />
                </CardCanvas>
              </div>
              {!els.length && !strokes.length && drawMode === null && (
                <button className="empty-prompt" type="button" onClick={addText}>
                  Создайте открытку прямо сейчас!
                </button>
              )}
            </section>
 
            {/* текст про авторские права: при необходимости поправьте формулировку */}
            <p className="copyright-note">
              Загружая изображения, музыку и текст, вы подтверждаете, что имеете права на этот контент и
              его использование не нарушает авторские права третьих лиц.
            </p>

            <div className="quick-actions">
              <button className="quick-card" type="button" onClick={() => setLibKind("images")}>
                <span>Медиотека ЭХО</span>
                <Icon name="templateBig" box={48} />
              </button>
              <button className="quick-card" type="button" onClick={() => setLibKind("music")}>
                <span>Аудиотека ЭХО</span>
                <Icon name="musicBig" box={48} />
              </button>
            </div>
 
            <input ref={imageInput} className="visually-hidden" type="file" accept="image/*" onChange={onPickImage} />
            <input ref={voiceInput} className="visually-hidden" type="file" accept="audio/*" onChange={onPickVoice} />
            <input ref={musicInput} className="visually-hidden" type="file" accept="audio/*" onChange={onPickMusic} />
          </section>
 
          <aside className="settings" aria-labelledby="settingsTitle">
            <h2 id="settingsTitle">Настройки открытки</h2>
 
            <section className="setting-section" aria-labelledby="volumeTitle">
              <h3 className="section-title" id="volumeTitle">Громкость</h3>
              <Range id="voiceVolume" label="Голос" value={voiceVol} onChange={setVoiceVol} />
              <Range id="musicVolume" label="Музыка" value={musicVol} onChange={setMusicVol} />
              {voice && (
                <p className="attached">
                  <span>Голос: {voice.name || "запись"}</span>
                  <button type="button" onClick={clearVoice} aria-label="Убрать голос">✕</button>
                </p>
              )}
              {music && (
                <p className="attached">
                  <span>Музыка: {music.name}</span>
                  <button type="button" onClick={() => setMusic(null)} aria-label="Убрать музыку">✕</button>
                </p>
              )}
            </section>
 
            <section className="setting-section" aria-labelledby="textSettingsTitle">
              <h3 className="section-title" id="textSettingsTitle">Текст</h3>
              {!selText && <p className="hint">Выберите текстовый блок на открытке или нажмите «Ввести текст»</p>}
 
              <Accordion title="Шрифт">
                <label className="field-label">
                  Гарнитура
                  <select disabled={!selText} value={selText?.font ?? FONTS[0].value}
                    onChange={(e) => setSel({ font: e.target.value })}>
                    {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </label>
              </Accordion>
              <Accordion title="Выравнивание">
                <label className="field-label">
                  Расположение текста
                  <select disabled={!selText} value={selText?.align ?? "center"}
                    onChange={(e) => setSel({ align: e.target.value })}>
                    {ALIGNS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </label>
              </Accordion>
              <Accordion title="Размер">
                <label className="field-label">
                  Размер текста
                  <select disabled={!selText} value={selText?.size ?? 28}
                    onChange={(e) => setSel({ size: Number(e.target.value) })}>
                    {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </Accordion>
              <Accordion title="Цвет">
                <label className="field-label">
                  Цвет текста
                  <input type="color" disabled={!selText} value={selText?.color ?? "#252318"}
                    onChange={(e) => setSel({ color: e.target.value })} />
                </label>
              </Accordion>
            </section>
 
            {selected && (
              <section className="setting-section" aria-labelledby="blockTitle">
                <h3 className="section-title" id="blockTitle">Выбранный блок</h3>
                <div className="range-setting">
                  <label htmlFor="rotate">Поворот: {Math.round(selected.rotate || 0)}°</label>
                  <input id="rotate" type="range" min="-180" max="180" step="1"
                    value={selected.rotate || 0}
                    onChange={(e) => patch(selected.id, { rotate: Number(e.target.value) })} />
                  <button className="mini-button" type="button" onClick={() => patch(selected.id, { rotate: 0 })}>
                    Сбросить поворот
                  </button>
                </div>
                <div className="btn-row">
                  <button className="mini-button" type="button" onClick={() => patch(selected.id, { z: maxZ() + 1 })}>Наверх</button>
                  <button className="mini-button" type="button" onClick={() => patch(selected.id, { z: minZ() - 1 })}>Назад</button>
                  <button className="mini-button" type="button" onClick={() => remove(selected.id)}>Удалить</button>
                </div>
              </section>
            )}
 
            <button className="preview-button" type="button" onClick={openPreview}>
              Предпросмотр открытки
            </button>
          </aside>
        </main>
      </div>
 
      {drawMode !== null && (
        <DrawingToolbar
          tool={drawMode}
          setTool={(t) => setDrawMode(t)}
          color={drawColor}
          setColor={setDrawColor}
          width={drawWidth}
          setWidth={setDrawWidth}
          canUndo={drawHistory.past.length > 0}
          canRedo={drawHistory.future.length > 0}
          canClear={strokes.length > 0}
          onUndo={() => dispatchDraw({ type: "undo" })}
          onRedo={() => dispatchDraw({ type: "redo" })}
          onClear={() => dispatchDraw({ type: "clear" })}
          onDone={stopDrawing}
        />
      )}
 
      <div
        className="modal-backdrop"
        hidden={!recordOpen}
        onClick={() => {
          voiceRecorderRef.current?.stop(); // останавливаем запись, если она идёт
          setRecordOpen(false);
        }}
      >
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="recordTitle"
          onClick={(e) => e.stopPropagation()}>
          <h2 id="recordTitle">Запись голоса</h2>
          <VoiceRecorder key={recorderKey} ref={voiceRecorderRef} onChange={setVoice} />
          <button
            className="preview-button"
            type="button"
            onClick={() => {
              voiceRecorderRef.current?.stop(); // останавливаем запись, если она идёт
              setRecordOpen(false);
            }}
          >
            Готово
          </button>
        </div>
      </div>
 
      {previewOpen && (
        <div className="preview-overlay">
          <CardCanvas elements={els} background={background} fit="contain" readOnly>
            <DrawingLayer strokes={strokes} size={CANVAS} />
          </CardCanvas>
          <button className="preview-close" type="button" onClick={closePreview}>✕ Закрыть</button>
        </div>
      )}
 
      <LibraryModal
        kind={libKind}
        onClose={() => setLibKind(null)}
        onPickImage={addImage}
        onPickMusic={(f) => { setMusic(f); toast(`Музыка: ${f.name}`); }}
      />

      {needRotate && (
        <div className="rotate-overlay" role="dialog" aria-modal="true" aria-label="Поверните телефон">
          <div className="rotate-phone" aria-hidden="true">
            <span className="rotate-phone-screen" />
          </div>
          <p>Поверните телефон горизонтально</p>
          <small>
            В горизонтальном режиме холст открытки и панели инструментов помещаются целиком —
            так работать удобнее.
          </small>
          <button type="button" onClick={lockLandscape}>Повернуть автоматически</button>
        </div>
      )}

      <div className={`toast${toastOn ? " is-visible" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </>
  );
}