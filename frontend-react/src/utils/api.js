export const API_URL = 'http://localhost:3000/api/app';

export const getUser = () => {
  const userStr = localStorage.getItem('zapi_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const getClientId = () => {
  const user = getUser();
  if (!user) return null;
  return user.role === 'admin' ? user.id : user.client_id;
};
