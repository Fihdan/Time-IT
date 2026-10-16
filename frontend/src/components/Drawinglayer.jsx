// DrawingLayer.jsx
// Прозрачный SVG-слой поверх CardCanvas. Лежит в том же контейнере (position: absolute; inset: 0)
// и вписывается так же, как холст при fit="contain": viewBox = размер холста, preserveAspectRatio = meet.
//
//   active=false -> слой только показывает рисунок и не перехватывает мышь (блоки под ним остаются кликабельными)
//   active=true  -> слой ловит указатель: tool="pen" рисует, tool="eraser" стирает штрихи целиком
import { useRef, useState } from "react";
import { ERASER_RADIUS, newStrokeId, pathD, safeColor, strokeHit } from "./drawing";
 
const round1 = (n) => Math.round(n * 10) / 10;
 
function StrokeShape({ s }) {
  const color = safeColor(s.color);
  const width = Number(s.width) || 6;
  if (s.points.length === 1) {
    return <circle cx={s.points[0][0]} cy={s.points[0][1]} r={width / 2} fill={color} />;
  }
  return <path d={pathD(s.points)} stroke={color} strokeWidth={width} />;
}
 
export default function DrawingLayer({
  strokes,
  size,
  active = false,
  tool = "pen",
  color = "#252318",
  width = 6,
  onCommit,
  onErase,
}) {
  const svgRef = useRef(null);
  const [draft, setDraft] = useState(null); // точки штриха, который рисуется сейчас
  const [hidden, setHidden] = useState(() => new Set()); // штрихи, которые ластик уже задел, но ещё не удалил
  const pointerId = useRef(null);
  // копии в ref: pointerup может прийти раньше, чем React перерисует компонент после pointerdown (быстрый клик)
  const draftRef = useRef(null);
  const hiddenRef = useRef(new Set());
  const { w, h } = size;
 
  // координаты указателя -> единицы холста; getScreenCTM учитывает и масштаб, и «поля» от contain
  const toCanvas = (e) => {
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return [round1(p.x), round1(p.y)];
  };
  const inside = ([x, y]) => x >= 0 && y >= 0 && x <= w && y <= h;
  const clamp = ([x, y]) => [Math.min(w, Math.max(0, x)), Math.min(h, Math.max(0, y))];
 
  const eraseAt = ([x, y]) => {
    let changed = false;
    for (const s of strokes) {
      if (!hiddenRef.current.has(s.id) && strokeHit(s, x, y, ERASER_RADIUS)) {
        hiddenRef.current.add(s.id);
        changed = true;
      }
    }
    if (changed) setHidden(new Set(hiddenRef.current));
  };
 
  const setDraftBoth = (pts) => {
    draftRef.current = pts;
    setDraft(pts);
  };
 
  const onPointerDown = (e) => {
    if (!active || pointerId.current !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
    const p = toCanvas(e);
    if (!p || !inside(p)) return; // нажатие на «поля» рядом с открыткой игнорируем
    pointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    hiddenRef.current = new Set();
    if (tool === "eraser") {
      eraseAt(p);
    } else {
      setDraftBoth([p]);
    }
  };
 
  const onPointerMove = (e) => {
    if (e.pointerId !== pointerId.current) return;
    const raw = toCanvas(e);
    if (!raw) return;
    const p = clamp(raw);
    if (tool === "eraser") {
      eraseAt(p);
      return;
    }
    const prev = draftRef.current;
    if (!prev) return;
    const last = prev[prev.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.8) return; // слишком близкие точки не нужны
    setDraftBoth([...prev, p]);
  };
 
  const finish = (e, cancelled) => {
    if (e.pointerId !== pointerId.current) return;
    pointerId.current = null;
    if (tool === "eraser") {
      if (!cancelled && hiddenRef.current.size) onErase?.([...hiddenRef.current]);
      hiddenRef.current = new Set();
      setHidden(new Set());
    } else {
      const pts = draftRef.current;
      if (!cancelled && pts?.length) onCommit?.({ id: newStrokeId(), color, width, points: pts });
      setDraftBoth(null);
    }
  };
 
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 2147483647, // рисунок всегда поверх любых блоков (у них zIndex = el.z и может расти неограниченно)
        pointerEvents: active ? "auto" : "none",
        touchAction: active ? "none" : "auto", // иначе на телефоне вместо рисования будет прокрутка
        cursor: active ? (tool === "eraser" ? "cell" : "crosshair") : "default",
        userSelect: "none",
      }}
    >
      {strokes.map((s) => (hidden.has(s.id) ? null : <StrokeShape key={s.id} s={s} />))}
      {draft && <StrokeShape s={{ color, width, points: draft }} />}
    </svg>
  );
}