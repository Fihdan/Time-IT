// Recovery.jsx — страница сброса (восстановления) пароля в ЭХО.
// Конвертировано из conv/1.html + conv/2.css + conv/3.js.
// Отправка формы идёт через action маршрута /recovery (router/index.jsx) — useSubmit.
// Реальный бэкенд (send/app.py, POST /recovery_password) не проверяет 6-значный код и не меняет
// пароль — он отправляет текущий пароль пользователя на его почту. Поэтому вместо ячеек кода
// и полей нового пароля на странице одно поле «Логин или email», а результат показывает, на
// какой адрес письмо ушло. Внешний вид панели сохранён из макета.
import { useState } from 'react';
import { Link, useActionData, useSubmit } from 'react-router-dom';
import './recovery.css';

export default function Recovery() {
  const action = useActionData(); // { error } | { success } — ответ action маршрута /recovery
  const submit = useSubmit();

  const [msg, setMsg] = useState(null); // локальное сообщение валидации: { type: 'error', text }

  const show = (text) => setMsg({ type: 'error', text });
  const clearMsg = () => msg && setMsg(null);

  const error = msg?.text ?? action?.error ?? null;
  const success = action?.success ?? null;
  const sent = Boolean(success);

  // Обработка формы — как в conv/3.js, но без кода: проверяем только логин,
  // дальше запрос уходит в action /recovery (api.recoveryPassword).
  const handleSubmit = (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);

    const login = String(fd.get('login') ?? '').trim();

    if (!login) {
      show('Введите логин.');
      return;
    }

    setMsg(null);
    submit(fd, { method: 'post' });
  };

  // Кнопка «Назад» (как в conv/3.js)
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else show('Предыдущая страница не найдена.');
  };

  return (
    <main className="stage-wrapper">
      <section id="fullhd" aria-label="Восстановление пароля в ЭХО">
        <div className="side side--left"></div>
        <div className="side side--right"></div>

        <button
          className="back-button"
          type="button"
          aria-label="Назад"
          title="Назад"
          onClick={goBack}
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M22 9 8 24l14 15M9 24h31" />
          </svg>
        </button>

        <div className="form-panel">
          <h1 className="welcome-title">Сброс пароля</h1>
          <div className="title-underline"></div>

          {sent ? (
            // Шаг выполнен: пароль отправлен на почту
            <div className="recovery-success" role="status">
              <p className="success-text">{success}</p>
              <Link className="recovery-login-link" to="/login">Войти</Link>
            </div>
          ) : (
            <form className="recovery-form" onSubmit={handleSubmit} noValidate>
              <label className="visually-hidden" htmlFor="login">Логин</label>
              <input
                id="login"
                name="login"
                type="text"
                placeholder="Логин"
                autoComplete="username"
                onInput={clearMsg}
              />

              <p className="recovery-hint">
                Укажите логин — на привязанную почту придёт ваш пароль.
              </p>

              <button className="recovery-button" type="submit">Продолжить</button>

              <p
                className={`form-message${error ? ' error' : ''}`}
                role="status"
                aria-live="polite"
              >
                {error}
              </p>
            </form>
          )}

          <p className="login-prompt">
            Вспомнили пароль? <Link to="/login">Войти</Link>
          </p>
        </div>
      </section>
    </main>
  );
}