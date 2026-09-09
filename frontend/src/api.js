import axios from 'axios';

// VITE_API_BASE_URL lets this be overridden per environment — set it in
// frontend/.env.production (or the host's env var config, e.g. Vercel/Netlify)
// to point at the deployed backend (e.g. https://orthopedic-opd-ai-test-backend.onrender.com),
// and leave it unset locally to fall back to localhost. Also covers loading
// the page from a different device than the dev server — e.g. embedded in
// the mobile app's WebView on a phone, where "localhost" would otherwise
// mean the phone itself, not the dev machine. Exported so every other file
// that needs the backend origin (not just axios calls) uses the same value
// instead of hardcoding it separately.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// /audio and /documents are staff-auth-protected but loaded directly by
// <audio src>/<a href> elements, which can't attach an Authorization header
// the way the axios interceptor above does — so the backend also accepts the
// token as a query param for those two routes (see
// get_current_user_from_header_or_query in backend/auth.py). Appends the
// *current* token at render time rather than baking it into a stored URL, so
// a stale/expired token in a persisted record never gets reused.
export function withAuthToken(url) {
  if (!url) return url;
  const token = localStorage.getItem('token');
  if (!token) return url;
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
}

export default api;
