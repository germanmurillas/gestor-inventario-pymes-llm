import axios from 'axios';
import { instalarRedDeSeguridad, mensajeDeError } from './lib/http';

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';

// Errores de axios con mensaje en español (sesión vencida, validación, servidor, sin internet).
// Las pantallas que leen error.response.data siguen funcionando igual.
axios.interceptors.response.use(undefined, (error) => {
    const estado = error?.response?.status ?? 0;
    error.message = mensajeDeError(estado, error?.response?.data);
    return Promise.reject(error);
});

instalarRedDeSeguridad();
