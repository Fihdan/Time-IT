// LandingPage.jsx
// Главная страница ЭХО: шапка, заголовок, кнопка создания открытки и модальное окно-заглушка.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLoaderData, Form, Outlet } from "react-router-dom";
import { useUser } from "../router/useUser"
import { shortLogin } from "../utils/user"
import "./landing.css";
 
 
// Тексты окон-заглушек, пока нет backend
const MESSAGES = {
  login: {
    title: "Вход в ЭХО",
    text: "Здесь можно подключить форму авторизации, когда будет готов backend.",
  },
};
 
/* ---------- Фон героя: картинка + градиент ---------- */
 
// Положите картинку в public/hero.jpg (в браузере она откроется по адресу /hero.jpg)
const HERO_IMAGE = "/hero.jpg";
 
function HeroMedia() {
  const [missing, setMissing] = useState(false);
 
  return (
    <div className="hero-media" aria-hidden="true">
      {!missing && <img className="hero-image" src={HERO_IMAGE} alt="" onError={() => setMissing(true)} />}
      <div className="hero-gradient" />
      {missing && (
        <div className="hero-placeholder">
          Здесь будет картинка
          <small>положите файл в public/hero.jpg</small>
        </div>
      )}
    </div>
  );
}
 
/* ---------- Модальное окно на нативном <dialog> ---------- */
 
// message = { title, text } открывает окно, null закрывает
function MessageDialog({ message, onClose }) {
  const ref = useRef(null);
 
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
 
    if (!message) {
      if (dialog.open) dialog.close();
      return;
    }
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      // старые браузеры без <dialog>
      window.alert(`${message.title}\n\n${message.text}`);
      onClose();
    }
  }, [message]); // eslint-disable-line react-hooks/exhaustive-deps
 
  return (
    <dialog
      ref={ref}
      className="message-dialog"
      aria-labelledby="dialogTitle"
      onClose={onClose} // срабатывает и на Esc, поэтому состояние не разъезжается с окном
      onClick={(e) => e.target === e.currentTarget && onClose()} // клик по затемнению
    >
      <button className="dialog-close" type="button" aria-label="Закрыть" onClick={onClose}>
        ×
      </button>
      <h2 id="dialogTitle">{message?.title}</h2>
      <p>{message?.text}</p>
      <button className="dialog-confirm" type="button" onClick={onClose}>
        Понятно
      </button>
    </dialog>
  );
}
 
/* ---------- Страница ---------- */
 
export default function LandingPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const close = () => setMessage(null);
  const user = useUser();
 
  // заголовок вкладки на время, пока открыта главная
  useEffect(() => {
    const prev = document.title;
    document.title = "ЭХО — открытки, к которым хочется возвращаться";
    return () => {
      document.title = prev;
    };
  }, []);
 
  return (
    <div className="landing">
      <main className="page">
        <header className="site-header">
          <Link className="landing-brand" to="/" aria-label="ЭХО — главная">
            ЭХО
          </Link>
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
        </header>
 
        <section className="hero" aria-labelledby="heroTitle">
          <HeroMedia />
          <div className="hero-content">
            <h1 id="heroTitle">
              Открытки, к которым<br className="desktop-break" /> хочется возвращаться
            </h1>
            <p className="hero-subtitle">Чтобы близкие всегда звучали чуть ближе</p>
            <div className="hero-actions">
              <button
                className="action-button action-button--primary"
                type="button"
                onClick={() => navigate("/editor")}
              >
                <span>Создать открытку</span>
                <span className="arrow" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>
 
      <MessageDialog message={message} onClose={close} />
    </div>
  );
}