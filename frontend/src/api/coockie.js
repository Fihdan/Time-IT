// cookies.js
export const getCookie = (name) => {
  const row = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
  return row ? decodeURIComponent(row.split('=')[1]) : null;
};

export const setCookie = (name, value, days) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${days * 86400}; path=/; SameSite=Lax`;
};

export const deleteCookie = (name) => {
  document.cookie = `${name}=; max-age=0; path=/`;
};