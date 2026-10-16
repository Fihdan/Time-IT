// user.js — мелкие помощники для отображения данных пользователя.
// При регистрации логином служит полный email, но в интерфейсе его принято показывать
// коротко, без домена: user@example.com -> user.
export const shortLogin = (login) => {
  const s = String(login ?? '');
  const at = s.indexOf('@');
  return at === -1 ? s : s.slice(0, at);
};