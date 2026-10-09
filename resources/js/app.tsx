import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { applyTheme, DEFAULT_THEME } from './lib/theme';
import Avisos from './Components/Avisos';
import BarreraDeErrores from './Components/BarreraDeErrores';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Pymetory';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup({ el, App, props }) {
        // Reconciliar tema: si el usuario tiene tema guardado en settings
        // compartido por Inertia (props.initialPage.props.auth?.user?.theme),
        // gana el valor de DB sobre el de localStorage.
        // @ts-ignore — Inertia props dinámicos
        const dbTheme: string | undefined = props?.initialPage?.props?.auth?.user?.theme;
        if (dbTheme && typeof dbTheme === 'string') applyTheme(dbTheme);
        else if (!document.documentElement.dataset.theme) applyTheme(DEFAULT_THEME);

        const root = createRoot(el);
        // @ts-ignore — Inertia props dinámicos
        const flash = props?.initialPage?.props?.flash;
        root.render(
            <>
                <BarreraDeErrores><App {...props} /></BarreraDeErrores>
                <Avisos flashInicial={flash} />
            </>,
        );
    },
    progress: {
        color: '#111111',
    },
});
