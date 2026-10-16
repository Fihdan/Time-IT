// VoiceRecorder.jsx
// Запись голоса через MediaRecorder. Зависимостей нет.
// Работает только на HTTPS или на localhost.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

// Chrome/Firefox пишут webm, Safari (iOS) пишет mp4 - берём первый поддерживаемый формат
function pickMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";
}

// Проверка среды: null - всё хорошо, иначе текст причины
function checkSupport() {
  if (typeof window === "undefined") return null; // SSR: проверим уже в браузере
  if (!window.isSecureContext) return "Запись работает только по HTTPS (или на localhost)";
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    return "Этот браузер не поддерживает запись звука";
  }
  return null;
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/*
  Пропсы:
  onChange(blob | null) - вызывается, когда запись готова (Blob) или удалена (null)
  maxSec                - максимальная длина записи, по умолчанию 60 секунд
*/
const VoiceRecorder = forwardRef(function VoiceRecorder({ onChange, maxSec = 60 }, ref) {
  const [status, setStatus] = useState("idle"); // idle | recording | recorded
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [unsupported, setUnsupported] = useState(null); // причина, почему запись невозможна

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const urlRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // проверяем поддержку один раз при монтировании
  useEffect(() => {
    setUnsupported(checkSupport());
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop()); // гасим индикатор микрофона
    streamRef.current = null;
  };

  const start = async () => {
    setError(null);

    const problem = checkSupport();
    if (problem) {
      setUnsupported(problem);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const type = rec.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const objectUrl = URL.createObjectURL(blob);
        urlRef.current = objectUrl;
        setUrl(objectUrl);
        setStatus("recorded");
        stopStream();
        onChangeRef.current?.(blob);
      };

      rec.start();
      recorderRef.current = rec;
      setSeconds(0);
      setStatus("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      stopStream();
      if (e.name === "NotAllowedError") {
        setError("Доступ к микрофону запрещён. Разрешите его в настройках браузера");
      } else if (e.name === "NotFoundError") {
        setError("Микрофон не найден");
      } else if (e.name === "NotReadableError") {
        setError("Микрофон занят другим приложением");
      } else {
        setError("Не удалось начать запись");
      }
    }
  };

  const stop = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  // даём родителю возможность остановить запись (например, по кнопке «Готово»)
  useImperativeHandle(ref, () => ({ stop }));

  const reset = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setUrl(null);
    setSeconds(0);
    setStatus("idle");
    onChangeRef.current?.(null);
  };

  // автоостановка по лимиту времени
  useEffect(() => {
    if (status === "recording" && seconds >= maxSec) stop();
  }, [seconds, status, maxSec]);

  // уборка при уходе со страницы
  useEffect(
    () => () => {
      clearInterval(timerRef.current);
      // отключаем onstop, иначе после ухода запись «воскреснёт» и перезапишет выбранный файл
      if (recorderRef.current) recorderRef.current.onstop = null;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      stopStream();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  // запись невозможна: вместо кнопки показываем причину
  if (unsupported) {
    return <p style={{ color: "crimson", margin: 0 }}>{unsupported}</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: "100%" }}>
      {status === "idle" && <button onClick={start}>🎙 Записать голос</button>}

      {status === "recording" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "crimson" }}>
            ● Идёт запись {fmt(seconds)} / {fmt(maxSec)}
          </span>
          <button onClick={stop}>■ Стоп</button>
        </div>
      )}

      {status === "recorded" && (
        <>
          <audio controls src={url} style={{ width: "100%" }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>Длительность: {fmt(seconds)}</span>
            <button onClick={reset}>↺ Перезаписать</button>
          </div>
        </>
      )}

      {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
    </div>
  );
});

export default VoiceRecorder;

/* ---------- Пример использования ----------

import VoiceRecorder from "./VoiceRecorder";

function CreatePage() {
  const [els, setEls] = useState([]);
  const [voice, setVoice] = useState(null); // Blob | null

  const save = async () => {
    let voiceUrl = null;

    // когда бэкенд будет готов: загрузить голос и получить ссылку на файл
    if (voice) {
      const ext = voice.type.includes("mp4") ? "m4a" : "webm";
      const form = new FormData();
      form.append("file", voice, `voice.${ext}`);
      const { data } = await apiClient.post("/assets", form);
      voiceUrl = data.url;
    }

    const { data } = await apiClient.post("/cards", {
      canvas: CANVAS,
      elements: els,
      audio: { voiceUrl, voiceVol: 1 },
    });
    prompt("Ссылка:", `${location.origin}/c/${data.id}`);
  };

  return (
    <>
      <CardEditor onChange={setEls} />
      <VoiceRecorder onChange={setVoice} />
      <button onClick={save}>Получить ссылку</button>
    </>
  );
}
*/