import React from 'react';

/**
 * Si una pantalla falla al dibujarse, muestra un mensaje en español con un botón para recargar,
 * en lugar de dejar la aplicación en blanco.
 */
export default class BarreraDeErrores extends React.Component<{ children: React.ReactNode }, { fallo: boolean }> {
    state = { fallo: false };

    static getDerivedStateFromError() {
        return { fallo: true };
    }

    componentDidCatch(error: unknown) {
        console.error('Error en la interfaz:', error);
    }

    render() {
        if (!this.state.fallo) return this.props.children;
        return (
            <div role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--pm-bg, #0b0d14)', color: 'var(--pm-text, #e8eaf3)', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ maxWidth: 440, textAlign: 'center' }}>
                    <h1 style={{ fontSize: 22, marginBottom: 8 }}>Algo salió mal en esta pantalla</h1>
                    <p style={{ opacity: 0.85, marginBottom: 20 }}>Sus datos están a salvo: lo que ya se registró quedó guardado. Recargue la página para seguir trabajando.</p>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 18px', borderRadius: 12, border: 0, background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                        Recargar la página
                    </button>
                </div>
            </div>
        );
    }
}
