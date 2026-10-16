// Страница просмотра: по временной ссылке /c/:id собирает всю сцену из данных бэкенда
// (координаты текстов и картинок, фон, голос, музыка и SVG-рисунок).
// Редактировать здесь ничего нельзя.
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CardCanvas, CANVAS } from "../components/CardCanvas";
import { get_card, get_date_start } from "../api/api";
 
 
// ждём загрузки всех картинок (включая SVG-рисунок), чтобы сцена не «собиралась» на глазах
const preloadImage = (url) =>
  new Promise((res) => {
    if (!url) return res();
    const img = new Image();
    img.onload = img.onerror = res; // битый файл не должен ломать всю открытку
    img.src = url;
  });
 
const preload = (elements, drawingUrl) =>
  Promise.all([
    ...elements
      .filter((e) => e.type === "image" && e.url)
      .map((e) => preloadImage(e.url)),
    preloadImage(drawingUrl),
  ]);

// парсим дату с бэка: строка ISO, число-таймстамп или объект { available_from }
const parseDate = (d) => {
  if (d == null) return null;
  if (typeof d === "number") return new Date(d);
  const raw = typeof d === "string" ? d : d?.available_from;
  if (!raw) return null;
  // «2026-10-16 15:00:00» с пробелом тоже приводим к ISO-виду
  const from = new Date(String(raw).replace(" ", "T"));
  return Number.isNaN(from.getTime()) ? null : from;
};
 
export default function CardView() {
  const { id } = useParams(); // маршрут /c/:id
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const [locked, setLocked] = useState(null); // Date, до которого открытка закрыта, или null
  const [started, setStarted] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef([]);
 
  useEffect(() => {
    let dead = false;
    let timer;
    setCard(null);
    setError(null);
    setLocked(null);

    const fail = (e) => {
      if (dead) return;
      const st = e?.response?.status;
      setError(
        st === 410
          ? "Срок действия ссылки истёк"
          : st === 404
            ? "Открытка не найдена"
            : "Не удалось загрузить открытку",
      );
    };

    // сначала проверяем ограничение по времени и только потом грузим саму открытку
    const load = async () => {
      const from = parseDate(await get_date_start({ id_card: id }).catch(() => null));
      if (dead) return;
      if (from && from.getTime() > Date.now()) {
        setLocked(from);
        // setTimeout не держит задержку больше ~24 дней: ждём кусками и перепроверяем
        const wait = Math.min(from.getTime() - Date.now() + 500, 2 ** 31 - 1);
        timer = setTimeout(() => load().catch(fail), wait);
        return;
      }
      setLocked(null);
      const c = await get_card(id);
      const elements = Array.isArray(c.elements) ? c.elements : [];
      await preload(elements, c.drawing?.url ?? null);
      if (!dead) setCard({ ...c, elements });
    };

    load().catch(fail);
    return () => {
      dead = true;
      clearTimeout(timer);
    };
  }, [id]);
 
  const stopAudio = () => {
    audioRef.current.forEach((a) => a.pause());
    audioRef.current = [];
  };
  useEffect(() => stopAudio, []);
 
  // звук можно запускать только из клика, поэтому сначала экран с кнопкой
  const start = () => {
    setStarted(true);
    const au = card.audio || {};
    const list = [];
    const play = (url, volume, loop, label) => {
      const a = new Audio();
      a.loop = loop;
      a.volume = Math.min(1, Math.max(0, volume));
      a.onerror = () => {
        console.error(`${label}: не загрузился`, url, a.error);
        setAudioError(`${label}: файл не загрузился или формат не поддерживается`);
      };
      a.src = url;
      a.play().catch((e) => {
        console.error(`${label}: play() отклонён`, url, e);
        setAudioError(`${label}: браузер не дал включить звук (${e.name})`);
      });
      list.push(a);
    };
    if (au.musicUrl) play(au.musicUrl, au.musicVol ?? 0.35, true, "Музыка");
    if (au.voiceUrl) play(au.voiceUrl, au.voiceVol ?? 0.8, false, "Голос");
    audioRef.current = list;
  };
 
  const screen = {
    position: "fixed",
    inset: 0,
    background: "#2b281d",
    color: "#fffdf8",
    display: "grid",
    placeItems: "center",
    padding: 16,
    textAlign: "center",
  };
 
  if (error) return <div style={screen}>{error}</div>;
  if (locked)
    return (
      <div style={screen}>
        <div>
          <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Открытка пока недоступна</p>
          <p style={{ margin: 0, opacity: 0.85 }}>
            Она откроется{" "}
            {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(locked)}
          </p>
        </div>
      </div>
    );
  if (!card) return <div style={screen}>Загружаем открытку…</div>;
 
  const size = card.canvas || CANVAS;
  const drawingUrl = card.drawing?.url ?? null;
  // рисунок всегда поверх картинок/текста: zIndex выше максимального z среди блоков
  const maxElZ = (card.elements || []).reduce((m, e) => Math.max(m, e.z || 0), 0);
 
  return (
    <div style={{ ...screen, display: "block" }}>
      <CardCanvas
        elements={card.elements}
        background={card.background}
        size={size}
        fit="contain"
        readOnly
      >
        {/* SVG-рисунок, пришедший с бэкенда как обычная картинка.
            Лежит внутри холста (а значит внутри transform: scale), поэтому
            viewBox SVG сам совпадает с координатами открытки 1:1. */}
        {drawingUrl && (
          <img
            src={drawingUrl}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: maxElZ + 1, // поверх всех блоков, как в редакторе
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        )}
      </CardCanvas>
 
      {audioError && (
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            padding: "8px 12px",
            borderRadius: 8,
            background: "#252318",
            color: "#fffdf8",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {audioError}
        </div>
      )}
 
      {!started && (
        <button
          type="button"
          onClick={start}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            border: 0,
            background: "rgba(43, 40, 29, 0.72)",
            color: "#fffdf8",
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ▶ Открыть открытку
        </button>
      )}
    </div>
  );
}