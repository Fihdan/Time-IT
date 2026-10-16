// Register.jsx — страница регистрации в ЭХО.
// Конвертировано из conv/index (4).html + conv/a.js + conv/style (3).css.
// Отправка формы идёт через action маршрута /register (router/index.jsx) — useSubmit.
import { useState } from 'react';
import { Link, useActionData, useSubmit } from 'react-router-dom';
import './register.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_RE = /^[^\s@]{3,}$/; // минимум 3 символа, без пробелов и «@»

export default function Register() {
  const actionError = useActionData()?.error; // ошибка от action: «Логин или email уже заняты» и т.п.
  const submit = useSubmit();

  const [msg, setMsg] = useState(null); // локальное сообщение валидации: { type: 'error'|'success', text }
  const [terms, setTerms] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false); // показывать/скрывать пароль
  const [confirmVisible, setConfirmVisible] = useState(false); // показывать/скрывать повтор пароля

  const show = (text, type = 'error') => setMsg({ type, text });
  const clearMsg = () => msg && setMsg(null);

  const message = msg?.text ?? actionError ?? null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);

    const first_name = String(fd.get('first_name') ?? '').trim();
    const last_name = String(fd.get('last_name') ?? '').trim();
    const login = String(fd.get('login') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const password = String(fd.get('password') ?? '');
    const confirmPassword = String(fd.get('confirm_password') ?? '');

    // Валидация — как в conv/a.js
    if (!first_name || !last_name || !login || !email || !password || !confirmPassword) {
      show('Заполните все поля.');
      return;
    }
    if (!LOGIN_RE.test(login)) {
      show('Логин должен содержать не менее 3 символов и не содержать пробелов.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      show('Введите корректный адрес электронной почты.');
      return;
    }
    if (password.length < 8) {
      show('Пароль должен содержать не менее 8 символов.');
      return;
    }
    if (password !== confirmPassword) {
      show('Пароли не совпадают.');
      return;
    }
    if (!terms) {
      show('Необходимо принять условия использования.');
      return;
    }

    // Логин пользователь задаёт сам, email хранится отдельно и не обрезается.
    fd.set('email', email);
    fd.set('login', login);
    fd.delete('confirm_password'); // серверу это поле не нужно

    setMsg(null);
    submit(fd, { method: 'post' });
  };

  // Кнопка возврата (как в conv/a.js)
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else show('Предыдущая страница не найдена.');
  };

  // Открыть документ (правила или политику) в новой вкладке «в фоне» (без перехвата фокуса)
  const openDocument = (url) => (e) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
    window.focus(); // возвращаем фокус на текущую вкладку
  };

  return (
    <main className="stage-wrapper">
      <section id="fullhd" aria-label="Регистрация в ЭХО">
        <div className="side side--left"></div>
        <div className="side side--right"></div>

        <button className="back-button" type="button" aria-label="Назад" onClick={goBack}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M22 9 8 24l14 15M9 24h31" />
          </svg>
        </button>

        <div className="form-panel">
          <h1 className="welcome-title">Добро пожаловать в ЭХО!</h1>
          <div className="title-underline"></div>

          <form className="registration-form" onSubmit={handleSubmit} noValidate>
            <label className="visually-hidden" htmlFor="first-name">Имя</label>
            <input
              className="form-input input-name"
              id="first-name"
              name="first_name"
              type="text"
              placeholder="Имя"
              autoComplete="given-name"
              onInput={clearMsg}
            />

            <label className="visually-hidden" htmlFor="last-name">Фамилия</label>
            <input
              className="form-input input-surname"
              id="last-name"
              name="last_name"
              type="text"
              placeholder="Фамилия"
              autoComplete="family-name"
              onInput={clearMsg}
            />

            <label className="visually-hidden" htmlFor="login">Логин</label>
            <input
              className="form-input input-login"
              id="login"
              name="login"
              type="text"
              placeholder="Логин"
              autoComplete="username"
              onInput={clearMsg}
            />

            <label className="visually-hidden" htmlFor="email">Электронная почта</label>
            <input
              className="form-input input-email"
              id="email"
              name="email"
              type="email"
              placeholder="Электронная почта"
              autoComplete="email"
              onInput={clearMsg}
            />

            <label className="visually-hidden" htmlFor="password">Пароль</label>
            <div className="password-field password-field--password">
              <input
                className="form-input input-password"
                id="password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                placeholder="Пароль"
                autoComplete={passwordVisible ? 'off' : 'new-password'}
                minLength="8"
                onInput={clearMsg}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                title={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((v) => !v)}
              >
                {passwordVisible ? (
                  // Открытый замок — пароль виден
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </svg>
                ) : (
                  // Закрытый замок — пароль скрыт
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </button>
            </div>

            <label className="visually-hidden" htmlFor="confirm-password">Повторите пароль</label>
            <div className="password-field password-field--confirm">
              <input
                className="form-input input-confirm-password"
                id="confirm-password"
                name="confirm_password"
                type={confirmVisible ? 'text' : 'password'}
                placeholder="Повторите пароль"
                autoComplete={confirmVisible ? 'off' : 'new-password'}
                onInput={clearMsg}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={confirmVisible ? 'Скрыть пароль' : 'Показать пароль'}
                title={confirmVisible ? 'Скрыть пароль' : 'Показать пароль'}
                aria-pressed={confirmVisible}
                onClick={() => setConfirmVisible((v) => !v)}
              >
                {confirmVisible ? (
                  // Открытый замок — пароль виден
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </svg>
                ) : (
                  // Закрытый замок — пароль скрыт
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </button>
            </div>

            <div className="terms-row">
              <input
                id="terms"
                type="checkbox"
                checked={terms}
                onChange={(e) => {
                  setTerms(e.target.checked);
                  clearMsg();
                }}
              />
              <label htmlFor="terms">
                Я принимаю{' '}
                <a
                  href="/rules"
                  className="terms-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={openDocument('/rules')}
                >
                  Правила пользования
                </a>{' '}
                и{' '}
                <a
                  href="/privacy"
                  className="terms-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={openDocument('/privacy')}
                >
                  Политику конфиденциальности
                </a>{' '}
                перед использованием продукта.
              </label>
            </div>

            <button className="register-button" type="submit">Зарегистрироваться</button>

            <p
              className={`form-message${msg?.type ? ` ${msg.type}` : actionError ? ' error' : ''}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          </form>

          <p className="login-prompt">
            Уже есть аккаунт?{' '}
            <Link to="/login" id="login-link">Войти</Link>
          </p>
        </div>
      </section>
    </main>
  );
}