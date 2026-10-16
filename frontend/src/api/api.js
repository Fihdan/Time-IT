// api.js — адаптер фронта под настоящий бэкенд (FastAPI, app.py).
// Контракт для страниц прежний: get_card / getCurrentUser / get_date_start ...
// create_card заменён на save_card(card, files, session): файлы на бэке привязаны к уже
// созданной открытке, а повторное сохранение обновляет её, а не создаёт новую (см. EditorPage.save).
import apiClient from './axiosInstance.js';
import { getCookie, setCookie, deleteCookie } from './coockie';

const GUEST_DAYS = 7;
const USER_DAYS = 30;

/* ---------- мелкие помощники ---------- */

const get = async (url, params) => (await apiClient.get(url, { params })).data;
const post = async (url, params, body = null) => (await apiClient.post(url, body, { params })).data;

// абсолютный URL для <img>/<audio>: apiClient.baseURL + путь + query
const abs = (url, params) => apiClient.getUri({ url, params });

// бэк принимает int; координаты из редактора могут быть дробными
const int = (v) => Math.round(Number(v) || 0);

// crypto.randomUUID доступен только в безопасном контексте (HTTPS/localhost).
// На LAN-адресе по HTTP его нет, поэтому используем getRandomValues + fallback.
const randomUUID = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
      const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    /* небезопасный контекст — fallback ниже */
  }
  // Формат v4 той же структуры, но на Math.random (не crypto, только для гостевого логина)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

const notFound = () => Object.assign(new Error('not found'), { response: { status: 404 } });

// У текста и картинки на бэке разные имена эндпоинтов, собираем их по ключу поля.
const TEXT_POS = ['x', 'y', 'w', 'z'];
const TEXT_PROPS = ['size', 'font', 'color', 'align', 'text'];
const IMG_POS = ['x', 'y', 'w', 'h', 'z'];

const textSetter = (k) => (TEXT_POS.includes(k) ? `/update_position_${k}_by_text` : `/update_${k}_by_text`);
const textGetter = (k) => (TEXT_POS.includes(k) ? `/get_position_${k}_by_text` : `/get_${k}_by_text`);

// Бэк не хранит фон, размер холста, поворот, наличие рисунка/звука и список скрытых (удалённых) блоков.
// Кладём это JSON-ом в card_name (поле TEXT без ограничений).
const packMeta = (meta) => JSON.stringify(meta);
const unpackMeta = (s) => {
  try {
    const m = JSON.parse(s);
    return m && typeof m === 'object' ? m : {};
  } catch {
    return {};
  }
};

/* ---------- Открытки ---------- */

/**
 * Первое сохранение создаёт открытку, повторные ОБНОВЛЯЮТ её (id и ссылка остаются прежними).
 * Состояние между сохранениями хранится в session: её нужно держать в useRef и передавать каждый раз.
 *
 * card    = { canvas, background, elements, audio: { voiceVol, musicVol } }   (громкость 0..1)
 * files   = { images: Map(elementId -> File), voice: Blob|File|null, music: File|null, drawing: File|null }
 * session = {} (мутируется внутри: id открытки, соответствие id блоков, что уже отправлено)
 * -> { id }
 *
 * Блоки, убранные из редактора, при повторном сохранении удаляются из БД (/delete_text, /delete_image).
 * Если удаление не удалось, блок остаётся в meta.hidden (не показывается) и удаляется при следующем сохранении.
 */
export const save_card = async (card, files = {}, session = {}) => {
  const login = getCookie('login');
  if (!login) throw new Error('no login');
  session.map ??= {}; // id блока на фронте -> { type, back, uploaded }
  session.prev ??= {}; // id блока -> последние отправленные значения (шлём только изменения)
  session.hidden ??= []; // ключи удалённых блоков ('t12' / 'i3')

  if (!session.id) {
    const created = await post('/create_card', { login, card_name: '{}' });
    if (!created) throw new Error('card was not created'); // бэк возвращает false при ошибке
    session.id = created;
  }
  const id = session.id;

  // отправляет только поля, изменившиеся с прошлого сохранения
  const sync = async (elId, values, send) => {
    const prev = session.prev[elId] || {};
    const changed = Object.entries(values).filter(([k, v]) => prev[k] !== v);
    await Promise.all(changed.map(([k, v]) => send(k, v)));
    session.prev[elId] = values;
  };

  const rot = {}; // поворот блоков: 't<id_text>' / 'i<id_image>' -> градусы
  const sorted = [...card.elements].sort((a, b) => a.z - b.z);

  // элементы по очереди, поля одного элемента параллельно
  for (const el of sorted) {
    let m = session.map[el.id];

    if (el.type === 'text') {
      if (!m) m = session.map[el.id] = { type: 'text', back: await post('/create_text', { id_card: id }) };
      const id_text = m.back;
      await sync(
        el.id,
        { x: int(el.x), y: int(el.y), w: int(el.w), z: int(el.z), size: int(el.size),
          font: el.font, color: el.color, align: el.align, text: el.text },
        (k, v) => post(textSetter(k), { id_text, [k]: v }),
      );
      if (el.rotate) rot[`t${id_text}`] = el.rotate;
    } else if (el.type === 'image') {
      const file = files.images?.get(el.id);
      if (!m) {
        if (!file) continue;
        m = session.map[el.id] = { type: 'image', back: await post('/create_image', { id_card: id }), uploaded: false };
      }
      const id_image = m.back;
      const upload = async () => {
        if (m.uploaded || !file) return;
        const form = new FormData();
        form.append('file', file, file.name || 'image.png');
        await post('/update_image', { id_image }, form);
        m.uploaded = true;
      };
      await Promise.all([
        upload(),
        sync(
          el.id,
          { x: int(el.x), y: int(el.y), w: int(el.w), h: int(el.h), z: int(el.z) },
          (k, v) => post(`/update_position_${k}_by_image`, { id_image, [k]: v }),
        ),
      ]);
      if (el.rotate) rot[`i${id_image}`] = el.rotate;
    }
  }

    // блоки, которых в редакторе уже нет: удаляем из БД
  const alive = new Set(card.elements.map((e) => e.id));
  const dead = Object.entries(session.map).filter(([elId]) => !alive.has(elId));
  await Promise.all(
    dead.map(async ([elId, m]) => {
      const key = `${m.type === 'text' ? 't' : 'i'}${m.back}`;
      try {
        const ok =
          m.type === 'text'
            ? await post('/delete_text', { id_text: m.back })
            : await post('/delete_image', { id_image: m.back });
        if (!ok) throw new Error('delete failed'); // бэк отвечает false, а не ошибкой
        delete session.map[elId];
        delete session.prev[elId];
        session.hidden = session.hidden.filter((k) => k !== key);
      } catch {
        // не удалилось: прячем через meta.hidden и повторим при следующем сохранении
        if (!session.hidden.includes(key)) session.hidden.push(key);
      }
    }),
  );

  // ---------- Звук, музыка и рисунок (Финальная рабочая логика) ----------
  const jobs = [];

  // 1. Голос (Voice)
  if (files.voice) {
    // Шлём файл, только если его раньше не было ИЛИ у него изменился размер (базовый маркер нового блоба)
    const isNewFile = !session.voice || session.voice.size !== files.voice.size;
    if (isNewFile) {
      const name = files.voice.name || `voice.${files.voice.type?.includes('mp4') ? 'm4a' : 'webm'}`;
      const form = new FormData();
      form.append('file', files.voice, name);
      jobs.push(post('/update_voice', { id_card: id }, form));
    }
    // Громкость микса шлём всегда
    jobs.push(post('/update_voice_mix', { id_card: id, new_voice_mix: int((card.audio?.voiceVol ?? 0.8) * 100) }));
    session.hidden = session.hidden.filter((k) => k !== 'voice');
  } else if (session.voice) {
    // Файл был в сессии, но теперь пришел null (удаление)
    jobs.push(
      post('/delete_voice', { id_card: id })
        .then((ok) => { if (!ok) throw new Error(); session.hidden = session.hidden.filter((k) => k !== 'voice'); })
        .catch(() => { if (!session.hidden.includes('voice')) session.hidden.push('voice'); })
    );
  }

  // 2. Музыка (Music)
  if (files.music) {
    // Музыку определяем по имени и размеру
    const isNewFile = !session.music || session.music.name !== files.music.name || session.music.size !== files.music.size;
    if (isNewFile) {
      const form = new FormData();
      form.append('file', files.music, files.music.name || 'music.mp3');
      jobs.push(post('/update_music', { id_card: id }, form));
    }
    jobs.push(post('/update_music_mix', { id_card: id, new_music_mix: int((card.audio?.musicVol ?? 0.35) * 100) }));
    session.hidden = session.hidden.filter((k) => k !== 'music');
  } else if (session.music) {
    // Удаление музыки
    jobs.push(
      post('/delete_music', { id_card: id })
        .then((ok) => { if (!ok) throw new Error(); session.hidden = session.hidden.filter((k) => k !== 'music'); })
        .catch(() => { if (!session.hidden.includes('music')) session.hidden.push('music'); })
    );
  }

  // 3. Рисунок (Drawing SVG)
  if (files.drawing) {
    // Так как файл SVG пересоздается при каждом сохранении, проверяем исключительно по его размеру size
    const isNewFile = !session.drawing || session.drawing.size !== files.drawing.size;
    if (isNewFile) {
      const form = new FormData();
      form.append('file', files.drawing, 'drawing.svg');
      jobs.push(post('/update_svg', { id_card: id }, form));
    }
    session.hidden = session.hidden.filter((k) => k !== 'drawing');
  } else if (session.drawing) {
    // Удаление рисунка
    jobs.push(
      post('/delete_svg', { id_card: id })
        .then((ok) => { if (!ok) throw new Error(); session.hidden = session.hidden.filter((k) => k !== 'drawing'); })
        .catch(() => { if (!session.hidden.includes('drawing')) session.hidden.push('drawing'); })
    );
  }

  // Ждем завершения всех сетевых запросов
  await Promise.all(jobs);

  // Сохраняем слепки файлов для сравнения на следующем сохранении
  session.voice = files.voice ? { size: files.voice.size } : null;
  session.music = files.music ? { name: files.music.name, size: files.music.size } : null;
  session.drawing = files.drawing ? { size: files.drawing.size } : null;

  // Формируем мета-имена
  const hasVoice = Boolean(files.voice) && !session.hidden.includes('voice');
  const hasMusic = Boolean(files.music) && !session.hidden.includes('music');
  const hasDrawing = Boolean(files.drawing) && !session.hidden.includes('drawing');

  await post('/update_card_name', {
    id_card: id,
    new_card_name: packMeta({
      v: 1, bg: card.background, canvas: card.canvas, rot, hidden: session.hidden,
      drawing: hasDrawing, voice: hasVoice, music: hasMusic,
    }),
  });

  return { id };
};



/** -> { canvas, background, elements, drawing: {url}|null, audio: { voiceUrl, musicUrl, voiceVol, musicVol } } */
export const get_card = async (card_id) => {
  const id = Number(card_id);
  if (!Number.isInteger(id)) throw notFound();

  const name = await get('/get_card_name', { id_card: id });
  if (name === false || name === null) throw notFound(); // бэк отвечает false, если открытки нет
  const meta = unpackMeta(name);
  const rot = meta.rot || {};
  const hidden = new Set(meta.hidden || []);

  const textIds = (await get('/get_all_texts_by_card', { id_card: id })).map((r) => r[0]);
  const imageIds = (await get('/get_all_images_by_card', { id_card: id })).map((r) => r[0]);

  const texts = await Promise.all(
    textIds.map(async (id_text) => {
      const keys = [...TEXT_POS, ...TEXT_PROPS];
      const vals = await Promise.all(keys.map((k) => get(textGetter(k), { id_text })));
      const el = { id: `t${id_text}`, type: 'text', rotate: rot[`t${id_text}`] || 0 };
      keys.forEach((k, i) => (el[k] = vals[i]));
      return el;
    }),
  );

  const images = await Promise.all(
    imageIds.map(async (id_image) => {
      const vals = await Promise.all(IMG_POS.map((k) => get(`/get_position_${k}_by_image`, { id_image })));
      const el = { id: `i${id_image}`, type: 'image', url: abs('/get_image', { id_image }), rotate: rot[`i${id_image}`] || 0 };
      IMG_POS.forEach((k, i) => (el[k] = vals[i]));
      return el;
    }),
  );

  const [voiceMix, musicMix] = await Promise.all([
    get('/get_voice_mix', { id_card: id }),
    get('/get_music_mix', { id_card: id }),
  ]);
  // наличие файла берём из meta: громкость в БД остаётся и после того, как голос убрали из редактора
  const hasV = meta.voice === true && typeof voiceMix === 'number';
  const hasM = meta.music === true && typeof musicMix === 'number';

  return {
    id,
    canvas: meta.canvas || { w: 800, h: 500 },
    background: meta.bg || '#fffdf8',
    elements: [...texts, ...images].filter((e) => !hidden.has(e.id)),
    drawing: meta.drawing ? { url: abs('/get_svg', { id_card: id }) } : null,
    audio: {
      voiceUrl: hasV ? abs('/get_voice', { id_card: id }) : null,
      musicUrl: hasM ? abs('/get_music', { id_card: id }) : null,
      voiceVol: hasV ? voiceMix / 100 : 0.8,
      musicVol: hasM ? musicMix / 100 : 0.35,
    },
  };
};

/**
 * Список открыток пользователя (GET /get_all_names_card_by_user?login=...).
 * -> [ [id_card, card_name], ... ] — по паре на каждую открытку.
 */
export const get_all_names_card_by_user = (login) => get('/get_all_names_card_by_user', { login });

/* ---------- Время (руты: update_start / get_date_start / del_date_start) ---------- */

/**
 * Обновляет настройку времени открытки: update_start({ id_card, date_start }).
 * date_start — строка даты/времени, с которой открытка доступна.
 * @returns {Promise<boolean>} true, если настройка сохранена
 */
export const update_start = (params) => post('/update_start', params);

/**
 * Возвращает настройку времени открытки: get_date_start({ id_card }) -> строка даты | null.
 * null, если настройка не задана или открытки нет.
 */
export const get_date_start = async (params) => {
  const t = await get('/get_date_start', params);
  return t === false || t === null ? null : t;
};

/**
 * Удаляет настройку времени открытки (доступна сразу): del_date_start({ id_card }).
 * @returns {Promise<boolean>}
 */
export const del_date_start = (params) => post('/del_date_start', params);

/* ---------- Пользователь ---------- */

// -> true | false (занят логин или email)
// После успешной регистрации бэк выдаёт сессионные куки (id_session, csrftoken) —
// сохраняем их в БД через /save_session, чтобы сессия восстановилась при перезагрузке.
export const register = async ({ login, password, email, first_name, last_name }) =>
  post('/register', { login, password, email, first_name, last_name }); // undefined-поля axios не отправляет; куки выдаёт бэк

// -> true | false: проверка логина и пароля на бэке (POST /auth)
// При успехе бэк выдаёт сессионные куки — сохраняем их в БД через /save_session.
export const auth = async (login, password) => Boolean(await post('/auth', { login, password }));

// POST /save_session?login=... — сохраняет сессионные куки браузера (id_session, csrftoken)
// в БД для пользователя. Куки отправляются автоматически (withCredentials в axiosInstance).
export const saveSession = (login) => post('/save_session', { login });

// GET /get_session?login=... — восстанавливает сессионные куки пользователя из БД
// (бэк ставит их в ответ). -> truthy, если сессия есть, иначе null (404).
export const getSession = async (login) => {
  try {
    return (await get('/get_session', { login })) || null;
  } catch (e) {
    if (e?.response?.status === 404) return null; // сессии нет — пользователь не восстановится
    throw e;
  }
};

// -> truthy, если у пользователя есть сохранённая сессия, иначе null
export const authByLogin = getSession;

export const createGuest = async () => {
  const login = `guest_${randomUUID().slice(0, 8)}`;
  await register({ login, password: randomUUID(), email: `${login}@guest.local` });
  setCookie('login', login, GUEST_DAYS);
  return login;
};

export const getCurrentUser = async () => {
  let login = getCookie('login');
  let data = login ? await getSession(login) : null;
  if (!data) {
    // куки нет, истекла или сессии пользователя нет в БД
    deleteCookie('login');
    login = await createGuest();
    data = await getSession(login);
  }
  return { login, isGuest: login.startsWith('guest_'), data: Boolean(data) };
};

export const logout = () => {
  deleteCookie('login');
  deleteCookie('id_session');
  deleteCookie('csrftoken');
};
export const saveLogin = (login) => setCookie('login', login, USER_DAYS);

/* ---------- Восстановление пароля ---------- */

/**
 * Бэк отправляет текущий пароль пользователя на его почту (POST /recovery_password).
 * -> email, на который отправлено письмо, либо null, если пользователь не найден
 *    или письмо не удалось отправить.
 */
export const recoveryPassword = (login) => post('/recovery_password', { login });