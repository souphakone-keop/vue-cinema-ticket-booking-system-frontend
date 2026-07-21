import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// Client for the regular (customer-facing) API. Attaches the user's JWT
// automatically and bounces to /login if the backend says it's expired
// or invalid, since tokens are valid for 7 days per the backend team.
export const http = axios.create({ baseURL: API_BASE });

http.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

http.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.hash = "#/login";
        }
        return Promise.reject(error);
    }
);

// Same idea, but for the admin panel's separate session.
export const adminHttp = axios.create({ baseURL: API_BASE });

adminHttp.interceptors.request.use((config) => {
    const token = localStorage.getItem("admin_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

adminHttp.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_user");
            window.location.hash = "#/admin/login";
        }
        return Promise.reject(error);
    }
);
