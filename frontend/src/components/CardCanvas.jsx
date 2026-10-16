// CardCanvas.jsx  (замена и CardEditor.jsx, и t2.jsx)
// Холст открытки: текст и картинки с drag and drop (react-rnd).
// Используется и в редакторе, и на странице просмотра (readOnly).
// Установка: npm i react-rnd
import { useLayoutEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
 
// Логический размер холста. Координаты блоков хранятся в этих единицах.
export const CANVAS = { w: 800, h: 500 };
 
/*
  Формат блоков:
  { id, type: "text",  x, y, w, z, text, size, color, font, align, rotate }   // высота авто
  { id, type: "image", x, y, w, h, z, url, rotate }
  rotate - угол в градусах (по часовой), необязательный, 0 по умолчанию
*/
 
const TAP_SLOP = 4; // сдвиг меньше этого (в единицах холста) считается тапом, а не перетаскиванием
 
// Допустимая область для НЕповёрнутой рамки блока (w x h), при которой его повёрнутый контур
// остаётся внутри холста. Для повёрнутого на 90° блока область шире по одной оси и уже по другой.
function boundsOf(w, h, deg, size) {
  const r = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  const dx = (w * c + h * s - w) / 2; // на сколько повёрнутый контур выступает за рамку (может быть < 0)
  const dy = (w * s + h * c - h) / 2;
  let left = dx;
  let width = size.w - 2 * dx;
  let top = dy;
  let height = size.h - 2 * dy;
  if (width < w) { left = (size.w - w) / 2; width = w; } // блок крупнее холста: просто центрируем
  if (height < h) { top = (size.h - h) / 2; height = h; }
  return { left, top, width, height };
}
 
const textStyle = (el) => ({
  fontFamily: el.font,
  fontSize: el.size,
  color: el.color,
  textAlign: el.align || "center",
  lineHeight: 1.25,
  margin: 0,
  padding: 4,
  width: "100%",
  boxSizing: "border-box",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});
 
function TextView({ el, editing, onText, onDone, onDoubleClick }) {
  const ref = useRef(null);
 
  // textarea растёт вместе с текстом
  useLayoutEffect(() => {
    const t = ref.current;
    if (t) {
      t.style.height = "auto";
      t.style.height = t.scrollHeight + "px";
    }
  }, [editing, el.text, el.size, el.w, el.font]);
 
  if (editing) {
    return (
      <textarea
        ref={ref}
        className="no-drag" // react-rnd не начнёт перетаскивание с этого элемента
        autoFocus
        value={el.text}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onText(e.target.value)}
        onBlur={onDone}
        style={{
          ...textStyle(el),
          display: "block",
          background: "transparent",
          border: "none",
          outline: "none",
          resize: "none",
          overflow: "hidden",
        }}
      />
    );
  }
 
  return (
    <div
      style={{
        ...textStyle(el),
        // без этого при перетаскивании браузер выделяет текст и движение "дёргается"
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
      onDoubleClick={onDoubleClick}
    >
      {el.text || " "}
    </div>
  );
}
 
function ImageView({ el }) {
  return (
    <img
      src={el.url}
      alt=""
      draggable={false}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
    />
  );
}
 
// Ручка поворота: круглая кнопка над блоком (или под ним, если сверху нет места).
// Тянем её вокруг центра блока, угол считается по положению курсора. Shift или близость к кратным 15° - прилипание.
function RotateHandle({ scale, below, rotate = 0, onRotate }) {
  const ref = useRef(null);
  const hs = Math.max(22, 30 / scale); // размер в единицах холста, на экране не меньше ~30px
 
  const down = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const box = ref.current.parentElement.getBoundingClientRect(); // поворот не сдвигает центр
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
 
    const raw = (ev) => (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + (below ? -90 : 90);
    const grab = raw(e) - rotate; // смещение захвата: ручка не «прыгает» под курсор в первый момент
    const move = (ev) => {
      let a = raw(ev) - grab;
      a = ((((a + 180) % 360) + 360) % 360) - 180; // в диапазон [-180, 180)
      const snap = Math.round(a / 15) * 15;
      if (ev.shiftKey || Math.abs(a - snap) < 4) a = snap;
      onRotate(Math.round(a * 10) / 10);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
 
  return (
    <div
      ref={ref}
      className="no-drag" // react-rnd не начнёт перетаскивание блока с этой ручки
      onPointerDown={down}
      style={{
        position: "absolute",
        left: "50%",
        [below ? "bottom" : "top"]: -hs * 1.4,
        width: hs,
        height: hs,
        marginLeft: -hs / 2,
        borderRadius: "50%",
        background: "#4c8bf5",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontSize: hs * 0.62,
        lineHeight: 1,
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      ↻
    </div>
  );
}
 
// Круглая точка изменения размера на пунктирной рамке. Видимая точка маленькая,
// зона нажатия вокруг неё большая (удобно пальцем). Размеры в единицах холста, поэтому делим на scale.
function Dot({ left, top, cursor, scale, onDown }) {
  const hit = Math.max(28, 36 / scale);
  const dot = Math.max(10, 14 / scale);
  return (
    <div
      className="no-drag" // react-rnd не начнёт перетаскивание блока с этой точки
      onPointerDown={onDown}
      style={{
        position: "absolute",
        left,
        top,
        width: hit,
        height: hit,
        marginLeft: -hit / 2,
        marginTop: -hit / 2,
        display: "grid",
        placeItems: "center",
        cursor,
        touchAction: "none",
      }}
    >
      <div
        style={{
          width: dot,
          height: dot,
          boxSizing: "border-box",
          borderRadius: "50%",
          background: "#fff",
          border: `${Math.max(2, 2 / scale)}px solid #4c8bf5`,
        }}
      />
    </div>
  );
}
 
/*
  Пропсы:
  elements, background, readOnly, selectedId, editingId
  size   - логический размер холста (по умолчанию CANVAS; на просмотре передайте card.canvas)
  fit    - "width" (по ширине контейнера) или "contain" (вписать в контейнер целиком)
           В редакторе используйте "contain", иначе низ холста может обрезаться рамкой.
  onSelect(id | null), onEdit(id | null), onChange(id, patch)
*/
export function CardCanvas({
  elements,
  background = "#fffdf8",
  readOnly = false,
  locked = false, // при locked блоки нельзя двигать/менять размер/поворачивать (например, во время рисования)
  size = CANVAS,
  fit = "contain",
  selectedId = null,
  editingId = null,
  onSelect,
  onEdit,
  onChange,
  children,
}) {
  const wrapRef = useRef(null);
  const wasSelected = useRef(false); // был ли блок выбран до начала нажатия
  const canvasRef = useRef(null); // сам холст (в нём считаем координаты курсора)
  const [scale, setScale] = useState(1);
  const contain = fit === "contain";
 
  // Изменение размера за круглую точку. side: "l" | "r" (текст, меняется ширина) или "tl" | "tr" | "bl" | "br" (картинка, пропорционально).
  // Противоположная сторона/угол остаётся на месте, в том числе у повёрнутого блока: считаем в осях блока.
  const beginResize = (e, el, side) => {
    e.stopPropagation();
    e.preventDefault();
    const node = wrapRef.current.querySelector(`.el-${el.id}`);
    if (!node) return;
    const isText = el.type === "text";
    const w0 = node.offsetWidth;
    const h0 = node.offsetHeight;
    const rad = ((el.rotate || 0) * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const sx = side.includes("r") ? 1 : -1;
    const sy = side.includes("b") ? 1 : -1;
    const minW = isText ? 60 : 40;
 
    const toCanvas = (ev) => {
      const r = canvasRef.current.getBoundingClientRect();
      const k = r.width / size.w; // реальный масштаб на экране
      return { x: (ev.clientX - r.left) / k, y: (ev.clientY - r.top) / k };
    };
 
    // положение ручки и противоположной точки (якоря) в координатах холста
    const lx0 = (sx * w0) / 2;
    const ly0 = isText ? 0 : (sy * h0) / 2;
    const C = { x: el.x + w0 / 2, y: el.y + h0 / 2 };
    const H = { x: C.x + c * lx0 - s * ly0, y: C.y + s * lx0 + c * ly0 };
    const A = { x: C.x - c * lx0 + s * ly0, y: C.y - s * lx0 - c * ly0 };
    const p0 = toCanvas(e);
    const grab = { x: p0.x - H.x, y: p0.y - H.y }; // смещение захвата: блок не дёргается, когда схватили не ровно за центр точки
 
    let last = null;
    const move = (ev) => {
      const p = toCanvas(ev);
      const vx = p.x - grab.x - A.x;
      const vy = p.y - grab.y - A.y;
      const lx = vx * c + vy * s; // вектор от якоря в осях блока
      const ly = -vx * s + vy * c;
      let w;
      let h = h0;
      if (isText) {
        w = lx * sx;
      } else {
        const k = (lx * sx * w0 + ly * sy * h0) / (w0 * w0 + h0 * h0); // проекция на диагональ = пропорциональный масштаб
        w = k * w0;
      }
      w = Math.max(minW, Math.min(size.w, w));
      if (!isText) h = (w * h0) / w0;
      const nlx = (sx * w) / 2;
      const nly = isText ? 0 : (sy * h) / 2;
      const Cn = { x: A.x + c * nlx - s * nly, y: A.y + s * nlx + c * nly };
      last = { w: Math.round(w), h: Math.round(h), x: Math.round(Cn.x - w / 2), y: Math.round(Cn.y - h / 2) };
      onChange?.(el.id, isText ? { w: last.w, x: last.x, y: last.y } : last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (!last) return;
      // по окончании возвращаем блок в допустимую область холста
      const hh = isText ? node.offsetHeight : last.h;
      const b = boundsOf(last.w, hh, el.rotate || 0, size);
      const nx = Math.round(Math.min(Math.max(last.x, b.left), b.left + b.width - last.w));
      const ny = Math.round(Math.min(Math.max(last.y, b.top), b.top + b.height - hh));
      if (nx !== last.x || ny !== last.y) onChange?.(el.id, { x: nx, y: ny });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
 
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const byW = el.clientWidth / size.w;
      const byH = el.clientHeight / size.h;
      const next = contain ? Math.min(byW, byH) : byW;
      // нулевой/NaN масштаб ломает react-rnd, пропускаем такие значения
      if (Number.isFinite(next) && next > 0) setScale((prev) => (Math.abs(prev - next) < 0.0005 ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [contain, size.w, size.h]);
 
  // Границы перетаскивания пересчитываем после каждого рендера: они зависят от поворота
  // и от реальной высоты текста. Rnd берёт их из невидимых элементов [data-bound].
  useLayoutEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    for (const el of elements) {
      const node = root.querySelector(`.el-${el.id}`);
      const b = root.querySelector(`[data-bound="${el.id}"]`);
      if (!node || !b) continue;
      const r = boundsOf(node.offsetWidth, node.offsetHeight, el.rotate || 0, size);
      b.style.left = r.left + "px";
      b.style.top = r.top + "px";
      b.style.width = r.width + "px";
      b.style.height = r.height + "px";
    }
  });
 
  return (
    <div
      ref={wrapRef}
      style={
        contain
          ? { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }
          : { width: "100%", height: size.h * scale }
      }
    >
      <div style={{ width: size.w * scale, height: size.h * scale, flexShrink: 0 }}>
        <div
          ref={canvasRef}
          style={{
            width: size.w,
            height: size.h,
            position: "relative",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            overflow: "hidden",
            background,
            boxShadow: "0 6px 24px rgba(58, 45, 21, 0.18)",
          }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onSelect?.(null); // клик по пустому месту
          }}
        >
          {/* невидимые рамки-границы для react-rnd, по одной на блок (размеры задаёт useLayoutEffect выше) */}
          {!readOnly &&
            elements.map((el) => (
              <div
                key={`b-${el.id}`}
                data-bound={el.id}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: size.w,
                  height: size.h,
                  visibility: "hidden",
                  pointerEvents: "none",
                }}
              />
            ))}
          {elements.map((el) => {
            const isText = el.type === "text";
            const selected = !readOnly && !locked && selectedId === el.id;
            const editing = !readOnly && !locked && editingId === el.id;
 
            return (
              <Rnd
                key={el.id}
                className={`el-${el.id}`}
                bounds={readOnly ? undefined : `[data-bound="${el.id}"]`} // вместо "parent": учитывает поворот
                scale={scale} // обязательно, если холст масштабируется
                position={{ x: el.x, y: el.y }}
                size={{ width: el.w, height: isText ? "auto" : el.h }}
                style={{
                  zIndex: el.z,
                  touchAction: readOnly || locked ? undefined : "none",
                  cursor: readOnly || locked ? "default" : editing ? "text" : "move",
                }}
                disableDragging={readOnly || editing || locked}
                enableResizing={false} // размер меняется круглыми точками (Dot), а не краями Rnd
                cancel=".no-drag"
                onDragStart={() => {
                  wasSelected.current = selectedId === el.id;
                  onSelect?.(el.id);
                }}
                onDragStop={(_, d) => {
                  // страховка: даже если Rnd не нашёл границу, возвращаем блок в допустимую область
                  const w = d.node.offsetWidth;
                  const h = d.node.offsetHeight;
                  const b = boundsOf(w, h, el.rotate || 0, size);
                  const nx = Math.min(Math.max(d.x, b.left), b.left + b.width - w);
                  const ny = Math.min(Math.max(d.y, b.top), b.top + b.height - h);
                  const moved = Math.abs(nx - el.x) > TAP_SLOP || Math.abs(ny - el.y) > TAP_SLOP;
                  if (moved) {
                    onChange?.(el.id, { x: Math.round(nx), y: Math.round(ny) });
                  } else if (isText && wasSelected.current) {
                    onEdit?.(el.id); // повторный тап по выбранному тексту = редактировать (работает и на телефоне)
                  }
                }}
              >
                {/* поворачиваем содержимое, а не сам Rnd: он занимает transform под перетаскивание */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: isText ? undefined : "100%",
                    transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
                    transformOrigin: "50% 50%",
                    outline: selected ? "2px dashed #4c8bf5" : "none", // рамка поворачивается вместе с блоком
                  }}
                >
                  {isText ? (
                    <TextView
                      el={el}
                      editing={editing}
                      onText={(text) => onChange?.(el.id, { text })}
                      onDone={() => onEdit?.(null)}
                      onDoubleClick={() => !readOnly && onEdit?.(el.id)}
                    />
                  ) : (
                    <ImageView el={el} />
                  )}
                  {selected && !editing && (
                    <>
                      {/* точки лежат внутри повёрнутой обёртки, поэтому всегда стоят ровно на пунктире */}
                      {isText ? (
                        <>
                          <Dot left="0%" top="50%" cursor="ew-resize" scale={scale} onDown={(e) => beginResize(e, el, "l")} />
                          <Dot left="100%" top="50%" cursor="ew-resize" scale={scale} onDown={(e) => beginResize(e, el, "r")} />
                        </>
                      ) : (
                        <>
                          <Dot left="0%" top="0%" cursor="nwse-resize" scale={scale} onDown={(e) => beginResize(e, el, "tl")} />
                          <Dot left="100%" top="0%" cursor="nesw-resize" scale={scale} onDown={(e) => beginResize(e, el, "tr")} />
                          <Dot left="0%" top="100%" cursor="nesw-resize" scale={scale} onDown={(e) => beginResize(e, el, "bl")} />
                          <Dot left="100%" top="100%" cursor="nwse-resize" scale={scale} onDown={(e) => beginResize(e, el, "br")} />
                        </>
                      )}
                      <RotateHandle
                        scale={scale}
                        below={el.y < 50 / scale}
                        rotate={el.rotate || 0}
                        onRotate={(rotate) => onChange?.(el.id, { rotate })}
                      />
                    </>
                  )}
                </div>
              </Rnd>
            );
          })}
          {children}
        </div>
      </div>
    </div>
  );
}