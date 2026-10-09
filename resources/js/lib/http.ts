/**
 * Cliente HTTP de la aplicación: pide siempre JSON, envía el token CSRF y convierte cualquier falla
 * (sesión vencida, validación, permisos, servidor caído, sin internet, respuesta que no es JSON)
 * en un mensaje claro en español. Ninguna pantalla debe mostrar texto técnico como
 * «Unexpected token '<'».
 */

export class ErrorHttp extends Error {
    constructor(mensaje: string, public estado: number, public errores: Record<string, string[]> = {}) {
        super(mensaje);
    }
}

/** Token CSRF: el de la cookie XSRF-TOKEN (se renueva solo) o, si no, el de la etiqueta meta. */
export function tokenCsrf(): Record<string, string> {
    const cookie = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1];
    if (cookie) return { 'X-XSRF-TOKEN': decodeURIComponent(cookie) };
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    return meta ? { 'X-CSRF-TOKEN': meta } : {};
}

/** Mensaje para el usuario según el estado HTTP y el cuerpo de la respuesta (si lo hay). */
export function mensajeDeError(estado: number, cuerpo: any): string {
    const errores = cuerpo?.errors && typeof cuerpo.errors === 'object' ? Object.values(cuerpo.errors).flat() : [];
    const propio = typeof cuerpo?.error === 'string' ? cuerpo.error : null;
    if (estado === 0) return 'No hay conexión con el servidor. Revise el internet e intente de nuevo.';
    if (estado === 401 || estado === 419) return 'Su sesión expiró. Recargue la página (F5) e ingrese de nuevo; lo que escribió no se guardó.';
    if (estado === 403) return propio || 'Su usuario no tiene permiso para hacer esto. Pídale ayuda al administrador.';
    if (estado === 404) return propio || 'No se encontró lo que buscaba. Puede que se haya borrado o cambiado; recargue la página.';
    if (estado === 413) return 'El archivo es demasiado grande.';
    if (estado === 422) return propio || (errores[0] as string) || 'Revise los datos del formulario.';
    if (estado === 429) return 'Demasiados intentos seguidos. Espere un minuto y vuelva a intentar.';
    if (estado >= 500) return 'El servidor tuvo un problema y no se guardó nada. Intente de nuevo en un momento; si sigue, avise al administrador.';
    return propio || 'No se pudo completar la operación. Intente de nuevo.';
}

interface Opciones {
    method?: string;
    /** Objeto (se envía como JSON) o FormData. */
    body?: unknown;
    /** Tiempo máximo de espera; el asistente necesita más que una consulta normal. */
    timeoutMs?: number;
    headers?: Record<string, string>;
}

/** Hace la petición y devuelve el JSON; ante cualquier falla lanza ErrorHttp con un mensaje en español. */
export async function pedir<T = any>(url: string, { method = 'GET', body, timeoutMs = 30000, headers = {} }: Opciones = {}): Promise<T> {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), timeoutMs);
    const esForm = typeof FormData !== 'undefined' && body instanceof FormData;
    let res: Response;
    try {
        res = await fetch(url, {
            method,
            credentials: 'same-origin',
            signal: control.signal,
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(body !== undefined && !esForm ? { 'Content-Type': 'application/json' } : {}), ...tokenCsrf(), ...headers },
            body: body === undefined ? undefined : esForm ? (body as FormData) : JSON.stringify(body),
        });
    } catch (e: any) {
        throw new ErrorHttp(e?.name === 'AbortError' ? 'El servidor tardó demasiado en responder. Intente de nuevo.' : mensajeDeError(0, null), 0);
    } finally {
        clearTimeout(reloj);
    }
    const texto = await res.text();
    let cuerpo: any = null;
    try { cuerpo = texto ? JSON.parse(texto) : null; } catch { cuerpo = null; }
    if (!res.ok) throw new ErrorHttp(mensajeDeError(res.status, cuerpo), res.status, cuerpo?.errors ?? {});
    if (cuerpo === null && texto) throw new ErrorHttp('El servidor respondió algo inesperado. Recargue la página e intente de nuevo.', res.status);
    return cuerpo as T;
}

/**
 * Red de seguridad para las llamadas que todavía usan fetch directamente: a las peticiones a este
 * mismo sitio les agrega «Accept: application/json», para que Laravel responda los errores en JSON
 * y no con una página HTML.
 */
export function instalarRedDeSeguridad(): void {
    const original = window.fetch.bind(window);
    window.fetch = (entrada: RequestInfo | URL, init: RequestInit = {}) => {
        const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
        const mismoSitio = url.startsWith('/') || url.startsWith(window.location.origin);
        if (mismoSitio) {
            const h = new Headers(init.headers || (entrada instanceof Request ? entrada.headers : undefined));
            if (!h.has('Accept')) h.set('Accept', 'application/json');
            if (!h.has('X-Requested-With')) h.set('X-Requested-With', 'XMLHttpRequest');
            init = { ...init, headers: h };
        }
        return original(entrada, init);
    };
}
