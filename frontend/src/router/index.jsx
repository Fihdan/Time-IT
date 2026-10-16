import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, redirect, Navigate } from 'react-router-dom';

import { getCurrentUser, auth, register, saveLogin, logout, update_start, recoveryPassword } from '../api/api';
import { getCookie } from '../api/coockie';
import { useUser } from './useUser';

import LandingPage from '../pages/LandingPage';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Recovery from '../pages/Recovery';
import Privacy from '../pages/Privacy';
import Rules from '../pages/Rules';
import Profile from '../pages/Profile';
import EditorPage from '../pages/EditorPage';
import CardView from '../pages/CardView';

// Редактор только для вошедших: гость (guest_*) или отсутствие логина -> на страницу входа.
// Проверка по user дублирует loader: loader не пускает сразу, а эта обёртка ловит случай,
// когда cookie есть, но сессии в БД нет и корневой loader заменил пользователя на гостя.
function RequireAuth({ children }) {
  const user = useUser();
  return user.isGuest ? <Navigate to="/login" replace /> : children;
}

const isLoggedIn = () => {
  const login = getCookie('login');
  return Boolean(login) && !login.startsWith('guest_');
};

// Показывается, если упал загрузчик (обычно бэк недоступен)
function RootError() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <p>Не удалось связаться с сервером.</p>
      <button type="button" onClick={() => location.reload()}>Попробовать снова</button>
    </div>
  );
}

// Пользователь { login, isGuest, data } загружается один раз в корне.
// В любом компоненте он доступен через useUser() (router/useUser.js).
const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    loader: async () => ({ user: await getCurrentUser() }),
    // пользователя перечитываем только после входа, регистрации и выхода
    shouldRevalidate: ({ formAction }) => Boolean(formAction) && formAction !== '/subscribe',
    children: [
      { index: true, element: <LandingPage /> },
      {
        path: 'editor',
        loader: () => (isLoggedIn() ? null : redirect('/login')),
        element: (
          <RequireAuth>
            <EditorPage />
          </RequireAuth>
        ),
      },
      { path: 'c/:id', element: <CardView /> },

      {
        path: 'profile',
        element: <Profile />,
      },

      {
        path: 'login',
        element: <Login />,
        action: async ({ request }) => {
          const fd = await request.formData();
          const value = String(fd.get('login') ?? '').trim();
          const password = String(fd.get('password') ?? '');
          try {
            // Поле «Логин»: пробуем введённое значение как есть, а для почты также её
            // часть до «@». Новые логины задаёт сам пользователь при регистрации, а у старых
            // аккаунтов логин хранится как почта без «@gmail.com» («example@gmail.com» → «example»),
            // поэтому войти можно и полной почтой, и просто именем логина.
            // Пароль передаём на бэк (POST /auth): он проверяет логин+пароль и отвечает true/false.
            const at = value.indexOf('@');
            const candidates = at === -1 || !value ? [value] : [value, value.slice(0, at)];
            let login = null;
            for (const candidate of candidates) {
              if (candidate && (await auth(candidate, password))) {
                login = candidate;
                break;
              }
            }
            if (!login) return { error: 'Неверный логин или пароль' };
            saveLogin(login);
            return redirect('/');
          } catch {
            return { error: 'Сервер недоступен' };
          }
        },
      },

      {
        path: 'register',
        element: <Register />,
        action: async ({ request }) => {
          // Пустые поля не отправляем: у email в базе UNIQUE, и пустая строка заняла бы его для всех.
          const form = Object.fromEntries([...(await request.formData())].filter(([, v]) => String(v).trim() !== ''));
          try {
            // исходный бэк не бросает ошибку на занятый логин, он отвечает false
            if (!(await register(form))) return { error: 'Логин или email уже заняты' };
          } catch {
            return { error: 'Ошибка регистрации' };
          }
          saveLogin(form.login);
          return redirect('/');
        },
      },

      {
        path: 'privacy',
        element: <Privacy />,
      },

      {
        path: 'rules',
        element: <Rules />,
      },

      {
        path: 'recovery',
        element: <Recovery />,
        // Восстановление: бэк отправляет текущий пароль пользователя на его почту
        action: async ({ request }) => {
          const raw = String((await request.formData()).get('login') ?? '').trim();
          if (!raw) return { error: 'Введите логин или email.' };
          try {
            // Логин хранится как почта без «@gmail.com», поэтому принимаем и полную почту.
            const login = raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw;
            const email = await recoveryPassword(login);
            // бэк отвечает null, если пользователь не найден или письмо не отправилось
            if (!email) return { error: 'Пользователь не найден или не удалось отправить письмо.' };
            return { success: `На ${email} отправлен ваш пароль. Проверьте почту, в т.ч. папку «Спам».` };
          } catch {
            return { error: 'Сервер недоступен.' };
          }
        },
      },

      {
        path: 'logout',
        action: () => {
          logout();
          return redirect('/'); // корневой loader создаст нового гостя
        },
      },

      {
        path: 'subscribe',
        action: async ({ request }) => {
          const n = Number((await request.formData()).get('n'));
          const login = getCookie('login');
          if (login && n > 0) await update_start({ login, n });
          return redirect('/profile'); // у /subscribe нет страницы: без редиректа был бы пустой экран
        },
      },

      { path: '*', loader: () => redirect('/') }, // неизвестный адрес -> на главную
    ],
  },
]);

createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);