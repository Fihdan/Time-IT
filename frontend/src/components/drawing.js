// drawing.js
// Логика рисования без React: сглаживание линий, экспорт в SVG, ластик, история (отмена/возврат).
// Координаты всегда в единицах холста (800x500), как у остальных блоков открытки.

export const DRAW_COLORS = ["#252318", "#c0392b", "#d98324", "#2e7d4f", "#2b6cb0", "#ffffff"];
export const DRAW_WIDTHS = [
  { label: "Тонкая", value: 3 },
  { label: "Средняя", value: 6 },
  { label: "Толстая", value: 14 },
];
export const ERASER_RADIUS = 10; // в единицах холста

export const newStrokeId = () => Math.random().toString(36).slice(2, 10);

const round1 = (n) => Math.round(n * 10) / 10;

// цвет попадёт внутрь SVG-текста, поэтому пропускаем только #rgb / #rrggbb / #rrggbbaa
export const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : "#252318");
const safeWidth = (w) => {
  const n = Number(w);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 6;
};

/** Точки -> атрибут d для <path>. Углы сглаживаются квадратичными кривыми через середины отрезков. */
export function pathD(points) {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
  }
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += `Q${x} ${y} ${round1((x + nx) / 2)} ${round1((y + ny) / 2)}`;
  }
  const last = points[points.length - 1];
  return `${d}L${last[0]} ${last[1]}`;
}

/** Один штрих -> строка SVG. Одиночный клик рисуется кружком (нулевой путь в разных браузерах ведёт себя по-разному). */
export function strokeToSvg(s) {
  const color = safeColor(s.color);
  const width = safeWidth(s.width);
  if (!s.points || s.points.length === 0) return "";
  if (s.points.length === 1) {
    const [x, y] = s.points[0];
    return `<circle cx="${Number(x)}" cy="${Number(y)}" r="${width / 2}" fill="${color}"/>`;
  }
  return `<path d="${pathD(s.points)}" stroke="${color}" stroke-width="${width}"/>`;
}

/** Все штрихи -> полноценный SVG-файл размером с холст, фон прозрачный. */
export function strokesToSvg(strokes, w, h) {
  const body = strokes.map(strokeToSvg).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ` +
    `fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  );
}

/* ---------- Ластик ---------- */

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Задевает ли круг радиуса r с центром (x, y) этот штрих (с учётом его толщины). */
export function strokeHit(stroke, x, y, r = ERASER_RADIUS) {
  const reach = r + safeWidth(stroke.width) / 2;
  const pts = stroke.points;
  if (pts.length === 1) return Math.hypot(x - pts[0][0], y - pts[0][1]) <= reach;
  for (let i = 1; i < pts.length; i++) {
    if (distToSegment(x, y, pts[i - 1], pts[i]) <= reach) return true;
  }
  return false;
}

/* ---------- История: отмена / возврат ---------- */
// Один жест (штрих или проход ластика) = один шаг истории.

export const initialHistory = { past: [], present: [], future: [] };

export function historyReducer(s, a) {
  switch (a.type) {
    case "add":
      return { past: [...s.past, s.present], present: [...s.present, a.stroke], future: [] };
    case "erase": {
      const ids = new Set(a.ids);
      const present = s.present.filter((st) => !ids.has(st.id));
      if (present.length === s.present.length) return s;
      return { past: [...s.past, s.present], present, future: [] };
    }
    case "clear":
      if (!s.present.length) return s;
      return { past: [...s.past, s.present], present: [], future: [] };
    case "undo":
      if (!s.past.length) return s;
      return { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] };
    case "redo":
      if (!s.future.length) return s;
      return { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) };
    default:
      return s;
  }
}