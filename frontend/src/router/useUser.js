import { useRouteLoaderData } from 'react-router-dom';

// Текущий пользователь { login, isGuest, data } из корневого loader.
// Работает в любом компоненте внутри роутера, пропсы тянуть не нужно.
export const useUser = () => useRouteLoaderData('root').user;
