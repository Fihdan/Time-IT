// Страница профиля. Тот же масштаб и оформление, что у страниц входа и регистрации:
// кремовый холст на весь экран, оливковые полосы по краям, песочная панель
// по центру на всю высоту, размеры элементов адаптивные через clamp() —
// без фиксированного макета и transform scale().
import { useState } from "react";
import { Form, useNavigate } from "react-router-dom";
import { useUser } from "../router/useUser";
import { shortLogin } from "../utils/user";
import { get_all_names_card_by_user } from "../api/api";
import "./profile.css";

// Имя открытки для списка. Бэк хранит в card_name meta-JSON редактора
// (там нет понятного названия), поэтому для таких открыток показываем
// «Открытка №id», а обычный текст-название выводим как есть.
const cardLabel = (id, raw) => {
  if (typeof raw === "string" && raw.trim() !== "") {
    try {
      const m = JSON.parse(raw);
      if (m && typeof m === "object" && !Array.isArray(m)) return `Открытка №${id}`;
    } catch {
      return raw.trim();
    }
  }
  return `Открытка №${id}`;
};

export default function Profile() {
  const user = useUser();
  const navigate = useNavigate();

  const [cardsOpen, setCardsOpen] = useState(false);
  const [cards, setCards] = useState([]); // [ [id_card, card_name], ... ]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // назад по истории, а если пришли на страницу напрямую — на главную
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/"));
  const openSettings = () => {};

  // ссылка на открытку: публичный просмотр по маршруту /c/:id
  const cardLink = (id) => `${window.location.origin}/c/${id}`;

  // открыть меню: каждый раз подгружаем свежий список открыток
  const openCards = async () => {
    setCardsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const rows = await get_all_names_card_by_user(user.login);
      setCards(Array.isArray(rows) ? rows : []);
    } catch {
      setCards([]);
      setError("Не удалось загрузить открытки");
    } finally {
      setLoading(false);
    }
  };

  const closeCards = () => {
    setCardsOpen(false);
    setCopiedId(null);
  };

  const copyLink = async (id) => {
    const link = cardLink(id);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // fallback для небезопасного контекста и старых браузеров
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <main className="pf-root">
      <section className="pf-screen" aria-label="Профиль пользователя">
        <div className="pf-side pf-side--left" />
        <div className="pf-side pf-side--right" />

        <button className="pf-back" type="button" aria-label="Назад" onClick={goBack}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M22 9 8 24l14 15M9 24h31" />
          </svg>
        </button>

        <section className="pf-panel">
          <div className="pf-avatar">
            <svg className="pf-avatar-icon" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="64" r="45" />
              <path d="M38 166 Q100 112 162 166" />
            </svg>
          </div>

          <div className="pf-name">{shortLogin(user.login)}</div>
          <div className="pf-underline" />

          <button className="pf-menu" type="button" onClick={openCards}>
            <svg className="pf-menu-icon" viewBox="0 0 85 70" aria-hidden="true">
              <rect x="6" y="10" width="73" height="50" rx="6" />
              <path d="M6 26h73M40 26v34M66 26v10" />
            </svg>
            <span>Мои открытки</span>
          </button>

          <button className="pf-menu" type="button" onClick={openSettings}>
            <svg className="pf-menu-icon" viewBox="0 0 85 70" aria-hidden="true">
              <g>
                <path d="M4 10H24M40 10H81M4 36H37M54 36H81M4 62H30M47 62H81" />
                <circle cx="31" cy="10" r="6" />
                <circle cx="46" cy="36" r="6" />
                <circle cx="39" cy="62" r="6" />
              </g>
            </svg>
            <span>Настройки</span>
          </button>

          <Form method="post" action="/logout" onSubmit={(e) => {
            if (!window.confirm("Вы действительно хотите выйти из аккаунта?")) e.preventDefault();
          }}>
            <button className="pf-logout" type="submit">
              Выйти из аккаунта
            </button>
          </Form>
        </section>
      </section>

      {cardsOpen && (
        <div className="pf-cards-backdrop" onClick={closeCards}>
          <section
            className="pf-cards-popup"
            role="dialog"
            aria-modal="true"
            aria-label="Мои открытки"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pf-cards-head">
              <div className="pf-cards-title">Мои открытки</div>
              <button className="pf-cards-close" type="button" aria-label="Закрыть" onClick={closeCards}>
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M12 12l24 24M36 12 12 36" />
                </svg>
              </button>
            </div>

            <div className="pf-cards-body">
              {loading && <div className="pf-cards-empty">Загрузка…</div>}
              {!loading && error && <div className="pf-cards-empty pf-cards-error">{error}</div>}
              {!loading && !error && cards.length === 0 && (
                <div className="pf-cards-empty">Открыток пока нет</div>
              )}
              {!loading && !error && cards.length > 0 && (
                <ul className="pf-cards-list">
                  {cards.map(([id, name]) => (
                    <li className="pf-cards-item" key={id}>
                      <span className="pf-cards-name">{cardLabel(id, name)}</span>
                      <button
                        className={copiedId === id ? "pf-cards-copy pf-cards-copy--done" : "pf-cards-copy"}
                        type="button"
                        onClick={() => copyLink(id)}
                      >
                        {copiedId === id ? "Скопировано ✓" : "Копировать ссылку"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
