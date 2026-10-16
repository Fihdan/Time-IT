// EditorPage.jsx
// Страница создания открытки: дизайн «ЭХО» + редактор с drag and drop.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CardCanvas, CANVAS } from "./CardCanvas";
import VoiceRecorder from "./VoiceRecorder";
import { create_card, uploadAsset } from "../api/api";
import "./editor.css";
 
/* ---------- Настройки ---------- */
 
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
// размеры в единицах холста (800x500)
const SIZES = [
  { label: "Маленький", value: 20 },
  { label: "Средний", value: 28 },
  { label: "Большой", value: 40 },
  { label: "Очень большой", value: 56 },
];
const BACKGROUNDS = ["#fffdf8", "#e8d9c3", "#f6dcc4", "#dfe6c8", "#d9e4ee"]; // «Макет открытки»
 
const uid = () => Math.random().toString(36).slice(2, 10);
 
/* ---------- Иконки (из дизайна) ---------- */
 
const ICONS = {
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5M12 15V3" />
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
  image: (
    <>
      <rect x="3" y="5" width="15" height="15" rx="2" />
      <path d="m3 16 5-5 4 4 2-2 4 4" />
      <circle cx="13" cy="9" r="1.5" />
      <path d="M7 3h12a2 2 0 0 1 2 2v12" />
    </>
  ),
  clipboard: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h4" />
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
};
 
function Icon({ name, box = 24, sw = 1.7 }) {
  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
 
/* ---------- Мелкие компоненты ---------- */
 
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
        <input
          id={id}
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
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
 
// blob/файл -> временный адрес для <audio>
function useObjectUrl(blob) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
 
/* ---------- Страница ---------- */
 
export default function EditorPage() {
  const [els, setEls] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [background, setBackground] = useState(BACKGROUNDS[0]);
 
  const [voice, setVoice] = useState(null); // Blob (запись) или File (аудиофайл)
  const [music, setMusic] = useState(null); // File
  const [voiceVol, setVoiceVol] = useState(80);
  const [musicVol, setMusicVol] = useState(35);
  const [recorderKey, setRecorderKey] = useState(0); // сброс компонента записи
  const voiceRecorderRef = useRef(null); // чтобы остановить запись по кнопке «Готово»
 
  const [recordOpen, setRecordOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, toastOn, toast] = useToast();

  const imageFiles = useRef(new Map()); // id блока -> File (для загрузки на сервер)
  const imageInput = useRef(null);
  const imageMenuRef = useRef(null);
  const voiceInput = useRef(null);
  const musicInput = useRef(null);
  const audioRef = useRef([]);
 
  const voiceUrl = useObjectUrl(voice);
  const musicUrl = useObjectUrl(music);
 
  const selected = els.find((e) => e.id === selectedId) || null;
  const selText = selected?.type === "text" ? selected : null;
 
  // статус сохранения
  const sig = JSON.stringify([els, background, voiceVol, musicVol, voice?.size ?? 0, music?.name ?? ""]);
  const [baseSig, setBaseSig] = useState(sig);
  const [saved, setSaved] = useState(false);
  const status =
    sig === baseSig ? (saved ? "Сохранено" : "Черновик не сохранён") : "Есть несохранённые изменения";
 
  /* ----- блоки ----- */
 
  const maxZ = () => Math.max(0, ...els.map((e) => e.z));
  const minZ = () => Math.min(0, ...els.map((e) => e.z));
  const patch = (id, p) => setEls((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const setSel = (p) => selText && patch(selText.id, p);
 
  const addText = () => {
    const n = els.length % 6; // небольшой сдвиг, чтобы блоки не лежали друг на друге
    const el = {
      id: uid(),
      type: "text",
      x: 200 + n * 20,
      y: 150 + n * 30,
      w: 400,
      z: maxZ() + 1,
      text: "Новый текст",
      size: 28,
      color: "#252318",
      font: FONTS[0].value,
      align: "center",
    };
    setEls((p) => [...p, el]);
    setSelectedId(el.id);
    setEditingId(el.id); // сразу в режиме ввода
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
      setEls((p) => [
        ...p,
        {
          id,
          type: "image",
          x: Math.round((CANVAS.w - w) / 2),
          y: Math.round((CANVAS.h - h) / 2),
          w,
          h,
          z: Math.max(0, ...p.map((e) => e.z)) + 1,
          url,
        },
      ]);
      setSelectedId(id);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast("Не удалось открыть изображение");
    };
    img.src = url;
  };
 
  const remove = (id) => {
    const el = els.find((e) => e.id === id);
    if (el?.type === "image") {
      URL.revokeObjectURL(el.url);
      imageFiles.current.delete(id);
    }
    setEls((p) => p.filter((e) => e.id !== id));
    setSelectedId(null);
    setEditingId(null);
  };
 
  // закончить ввод; пустой текстовый блок удаляется
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
 
  // Delete / Backspace удаляют выбранный блок (если не идёт ввод текста)
  useEffect(() => {
    const onKey = (e) => {
      if (recordOpen || previewOpen) return;
      const tag = document.activeElement?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) remove(selectedId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, els, recordOpen, previewOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Вставка картинки из буфера обмена (Ctrl+V)
  useEffect(() => {
    const onPaste = (e) => {
      if (recordOpen || previewOpen) return;
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
  }, [recordOpen, previewOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // закрытие меню «Вставка картинки» по клику вне или по Escape
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

  /* ----- файлы ----- */
 
  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) addImage(f);
  };
  // вставка картинки из буфера обмена по кнопке (navigator.clipboard.read)
  const pasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) return toast("Скопируйте картинку и нажмите Ctrl+V");
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        const file = new File([blob], `clipboard-${Date.now()}.png`, { type });
        addImage(file);
        toast("Картинка вставлена из буфера обмена");
        return;
      }
      toast("В буфере обмена нет картинки");
    } catch {
      toast("Не удалось прочитать буфер обмена");
    }
  };
  const onPickVoice = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setVoice(f);
    setRecorderKey((k) => k + 1);
    toast(`Голос: ${f.name}`);
  };
  const onPickMusic = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setMusic(f);
    toast(`Музыка: ${f.name}`);
  };
  const clearVoice = () => {
    setVoice(null);
    setRecorderKey((k) => k + 1);
  };
 
  const nextTemplate = () => {
    const i = BACKGROUNDS.indexOf(background);
    setBackground(BACKGROUNDS[(i + 1) % BACKGROUNDS.length]);
    toast("Макет изменён. Нажмите ещё раз для другого цвета");
  };
 
  /* ----- предпросмотр со звуком ----- */
 
  const stopAudio = () => {
    audioRef.current.forEach((a) => a.pause());
    audioRef.current = [];
  };
  const startAudio = () => {
    stopAudio();
    const list = [];
    if (musicUrl) {
      const a = new Audio(musicUrl);
      a.loop = true;
      a.volume = musicVol / 100;
      a.play().catch(() => {});
      list.push(a);
    }
    if (voiceUrl) {
      const a = new Audio(voiceUrl);
      a.volume = voiceVol / 100;
      a.play().catch(() => {});
      list.push(a);
    }
    audioRef.current = list;
  };
  const openPreview = () => {
    setSelectedId(null);
    setEditingId(null);
    setPreviewOpen(true);
    startAudio(); // запускаем из клика, иначе браузер заблокирует звук
  };
  const closePreview = () => {
    setPreviewOpen(false);
    stopAudio();
  };
  useEffect(() => stopAudio, []); // eslint-disable-line react-hooks/exhaustive-deps
 
  /* ----- сохранение и отправка ----- */
 
  const lastSaved = useRef({ sig: null, link: null }); // чтобы не грузить всё заново при повторном "Поделиться"
 
  const save = async () => {
    if (lastSaved.current.sig === sig && lastSaved.current.link) return lastSaved.current.link;
    setSaving(true);
    try {
      // 1) картинки: blob-адреса -> файлы на сервере
      const elements = [];
      for (const el of els) {
        if (el.type === "image") {
          const { url, assetId } = await uploadAsset(imageFiles.current.get(el.id));
          elements.push({ ...el, url, assetId });
        } else {
          elements.push(el);
        }
      }
      // 2) голос и музыка
      const voiceName = voice?.name || `voice.${voice?.type?.includes("mp4") ? "m4a" : "webm"}`;
      const savedVoiceUrl = voice ? (await uploadAsset(voice, voiceName)).url : null;
      const savedMusicUrl = music ? (await uploadAsset(music)).url : null;
      // 3) сама открытка
      const { id } = await create_card({
        canvas: CANVAS,
        background,
        elements,
        audio: {
          voiceUrl: savedVoiceUrl,
          musicUrl: savedMusicUrl,
          voiceVol: voiceVol / 100,
          musicVol: musicVol / 100,
        },
      });
      setBaseSig(sig);
      setSaved(true);
      const link = `${location.origin}/c/${id}`;
      lastSaved.current = { sig, link };
      return link;
    } finally {
      setSaving(false);
    }
  };
 
  const share = async () => {
    if (!els.length) return toast("Сначала добавьте на открытку текст или картинку");
    let link;
    try {
      link = await save();
    } catch {
      return toast("Не удалось сохранить открытку");
    }
    // после await браузер может отказать navigator.share (нет «жеста пользователя») - тогда копируем
    try {
      if (navigator.share) {
        await navigator.share({ title: "Моя открытка — ЭХО", url: link });
        return;
      }
    } catch (e) {
      if (e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(link);
      toast("Ссылка скопирована");
    } catch {
      window.prompt("Ссылка на открытку:", link);
    }
  };
 
  // Escape закрывает предпросмотр
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e) => e.key === "Escape" && closePreview();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]); // eslint-disable-line react-hooks/exhaustive-deps
 
  /* ----- левая панель ----- */
 
  // кнопка «Вставка картинки» вынесена отдельно: у неё выпадающее меню с буфером и файлом
  const tools = [
    { id: "record", icon: "record", label: "Запись голоса", run: () => setRecordOpen(true) },
    { id: "audio", icon: "audio", label: "Выбрать аудиофайл", run: () => voiceInput.current.click() },
    { id: "text", icon: "text", label: "Ввести текст", run: addText },
    { id: "music", icon: "music", label: "Выбрать музыку", run: () => musicInput.current.click() },
  ];
 
  return (
    <>
      <div className="app">
        <header className="topbar">
          <Link className="brand" to="/" aria-label="ЭХО — на главную">ЭХО</Link>
          <div className="topbar-actions">
            <button
              className="icon-button"
              type="button"
              aria-label="Скачать открытку"
              title="Скачать открытку"
              onClick={() => toast("Скачивание картинкой подключим позже")}
            >
              <Icon name="download" />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Поделиться открыткой"
              title="Поделиться открыткой"
              onClick={share}
              disabled={saving}
            >
              <Icon name="share" />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Профиль"
              title="Профиль"
              onClick={() => toast("Профиль подключим через бэкенд")}
            >
              <Icon name="profile" />
            </button>
          </div>
        </header>
 
        <main className="workspace">
          <nav className="tool-sidebar" aria-label="Инструменты открытки">
            {tools.map((t) => (
              <button key={t.id} className="tool-button" type="button" title={t.label} onClick={t.run}>
                <Icon name={t.icon} sw={1.6} />
                <span>{t.label}</span>
              </button>
            ))}

            {/* Вставка картинки: совмещённое меню (буфер обмена / файл) */}
            <div className="tool-button-wrap" ref={imageMenuRef}>
              <button
                className={`tool-button${imageMenuOpen ? " is-active" : ""}`}
                type="button"
                title="Вставка картинки"
                aria-haspopup="menu"
                aria-expanded={imageMenuOpen}
                onClick={() => setImageMenuOpen((open) => !open)}
              >
                <Icon name="image" sw={1.6} />
                <span>Вставка картинки</span>
              </button>
              {imageMenuOpen && (
                <div className="tool-menu" role="menu" aria-label="Вставка картинки">
                  <button
                    className="tool-menu-item"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setImageMenuOpen(false);
                      pasteFromClipboard();
                    }}
                  >
                    <Icon name="clipboard" sw={1.6} />
                    <span>
                      <strong>Из буфера обмена</strong>
                      <small>скопируйте картинку заранее</small>
                    </span>
                  </button>
                  <button
                    className="tool-menu-item"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setImageMenuOpen(false);
                      imageInput.current.click();
                    }}
                  >
                    <Icon name="download" sw={1.6} />
                    <span>
                      <strong>Выбрать файл</strong>
                      <small>JPG, PNG, GIF</small>
                    </span>
                  </button>
                </div>
              )}
            </div>
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
                  onSelect={select}
                  onEdit={(id) => (id ? setEditingId(id) : stopEdit())}
                  onChange={patch}
                />
              </div>
              {!els.length && (
                <button className="empty-prompt" type="button" onClick={addText}>
                  Создайте открытку прямо сейчас!
                </button>
              )}
            </section>

            <p className="hint">Совет: скопируйте картинку и нажмите Ctrl+V, чтобы вставить её на открытку</p>

            {/* место под текст об авторских правах: отредактируйте формулировку при необходимости */}
            <p className="copyright-note">
              Загружая изображения, музыку и текст, вы подтверждаете, что имеете права на этот контент и
              его использование не нарушает авторские права третьих лиц.
            </p>

            <div className="quick-actions">
              <button className="quick-card" type="button" onClick={nextTemplate}>
                <span>Макет открытки</span>
                <Icon name="templateBig" box={48} />
              </button>
              <button className="quick-card" type="button" onClick={() => musicInput.current.click()}>
                <span>Выбрать музыку</span>
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
              <h3 className="section-title" id="volumeTitle">
                Громкость
              </h3>
              <Range id="voiceVolume" label="Голос" value={voiceVol} onChange={setVoiceVol} />
              <Range id="musicVolume" label="Музыка" value={musicVol} onChange={setMusicVol} />
              {voice && (
                <p className="attached">
                  <span>Голос: {voice.name || "запись"}</span>
                  <button type="button" onClick={clearVoice} aria-label="Убрать голос">
                    ✕
                  </button>
                </p>
              )}
              {music && (
                <p className="attached">
                  <span>Музыка: {music.name}</span>
                  <button type="button" onClick={() => setMusic(null)} aria-label="Убрать музыку">
                    ✕
                  </button>
                </p>
              )}
            </section>
 
            <section className="setting-section" aria-labelledby="textSettingsTitle">
              <h3 className="section-title" id="textSettingsTitle">
                Текст
              </h3>
              {!selText && <p className="hint">Выберите текстовый блок на открытке или нажмите «Ввести текст»</p>}
 
              <Accordion title="Шрифт">
                <label className="field-label">
                  Гарнитура
                  <select
                    disabled={!selText}
                    value={selText?.font ?? FONTS[0].value}
                    onChange={(e) => setSel({ font: e.target.value })}
                  >
                    {FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
              </Accordion>
 
              <Accordion title="Выравнивание">
                <label className="field-label">
                  Расположение текста
                  <select
                    disabled={!selText}
                    value={selText?.align ?? "center"}
                    onChange={(e) => setSel({ align: e.target.value })}
                  >
                    {ALIGNS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </label>
              </Accordion>
 
              <Accordion title="Размер">
                <label className="field-label">
                  Размер текста
                  <select
                    disabled={!selText}
                    value={selText?.size ?? 28}
                    onChange={(e) => setSel({ size: Number(e.target.value) })}
                  >
                    {SIZES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </Accordion>
 
              <Accordion title="Цвет">
                <label className="field-label">
                  Цвет текста
                  <input
                    type="color"
                    disabled={!selText}
                    value={selText?.color ?? "#252318"}
                    onChange={(e) => setSel({ color: e.target.value })}
                  />
                </label>
              </Accordion>
            </section>
 
            {selected && (
              <section className="setting-section" aria-labelledby="blockTitle">
                <h3 className="section-title" id="blockTitle">
                  Выбранный блок
                </h3>
                <div className="btn-row">
                  <button className="mini-button" type="button" onClick={() => patch(selected.id, { z: maxZ() + 1 })}>
                    Наверх
                  </button>
                  <button className="mini-button" type="button" onClick={() => patch(selected.id, { z: minZ() - 1 })}>
                    Назад
                  </button>
                  <button className="mini-button" type="button" onClick={() => remove(selected.id)}>
                    Удалить
                  </button>
                </div>
              </section>
            )}
 
            <button className="preview-button" type="button" onClick={openPreview}>
              Предпросмотр открытки
            </button>
          </aside>
        </main>
      </div>
 
      {/* запись голоса; не размонтируется, чтобы не терять запись */}
      <div
        className="modal-backdrop"
        hidden={!recordOpen}
        onClick={() => {
          voiceRecorderRef.current?.stop(); // останавливаем запись, если она идёт
          setRecordOpen(false);
        }}
      >
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recordTitle"
          onClick={(e) => e.stopPropagation()}
        >
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
 
      {/* предпросмотр на весь экран */}
      {previewOpen && (
        <div className="preview-overlay">
          <CardCanvas elements={els} background={background} fit="contain" readOnly />
          <button className="preview-close" type="button" onClick={closePreview}>
            ✕ Закрыть
          </button>
        </div>
      )}
 
      <div className={`toast${toastOn ? " is-visible" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </>
  );
}