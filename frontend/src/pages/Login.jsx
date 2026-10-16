// Login.jsx — страница входа в ЭХО.
// Конвертировано из conv/index (3).html + conv/a.js + conv/style (2).css.
// Отправка формы идёт через action маршрута /login (router/index.jsx) — useSubmit.
import { useState } from 'react';
import { Link, useActionData, useSubmit } from 'react-router-dom';
import './login.css';

export default function Login() {
  const actionError = useActionData()?.error; // ошибка от action: «Пользователь не найден», «Сервер недоступен»
  const submit = useSubmit();

  const [msg, setMsg] = useState(null); // локальное сообщение валидации: { type: 'error'|'success', text }
  const [showPassword, setShowPassword] = useState(false); // показывать/скрывать пароль

  const show = (text, type = 'error') => setMsg({ type, text });
  const clearMsg = () => msg && setMsg(null);

  const message = msg?.text ?? actionError ?? null;

  // Обработка входа — как в conv/a.js, затем отправка в action /login
  const handleSubmit = (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);

    const login = String(fd.get('login') ?? '').trim();
    const password = String(fd.get('password') ?? '');

    if (!login || !password) {
      show('Введите почту и пароль.');
      return;
    }

    setMsg(null);
    submit(fd, { method: 'post' });
  };

  // Кнопка «Назад» (как в conv/a.js)
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else show('Предыдущая страница не найдена.');
  };

  return (
    <main className="page-shell">
      <section className="login-screen" aria-label="Вход в ЭХО">
        <div className="side-bar side-bar--left"></div>
        <div className="side-bar side-bar--right"></div>

        <button
          className="back-button"
          type="button"
          aria-label="Вернуться назад"
          title="Назад"
          onClick={goBack}
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M22 9 8 24l14 15M9 24h31" />
          </svg>
        </button>

        <section className="login-panel">
          <h1>Добро пожаловать в ЭХО!</h1>
          <div className="heading-line"></div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label className="visually-hidden" htmlFor="login">Логин</label>
            <input
              id="login"
              name="login"
              type="text"
              placeholder="Логин"
              autoComplete="username"
              onInput={clearMsg}
            />

            <label className="visually-hidden" htmlFor="password">Пароль</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль"
                autoComplete={showPassword ? 'off' : 'current-password'}
                onInput={clearMsg}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
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

            <button className="submit-button" type="submit">Войти</button>
          </form>

          <Link className="reset-link" to="/recovery">
            Сбросить пароль
          </Link>

          <p className="register-prompt">
            Нет аккаунта? <Link to="/register">Бесплатная регистрация</Link>
          </p>

          <p
            className={`form-message${msg?.type ? ` ${msg.type}` : actionError ? ' error' : ''}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        </section>
      </section>
    </main>
  );
}