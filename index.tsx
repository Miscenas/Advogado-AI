
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * JURISPET AI - SAFE BOOTSTRAP
 * Garante que o objeto process.env e as chaves VITE_ existam globalmente.
 */
(function safeInit() {
  if (typeof window !== 'undefined') {
    const win = window as any;
    
    // Polyfill básico para o SDK da Google
    win.process = win.process || {};
    win.process.env = win.process.env || {};
    
    // Tenta capturar do Vite de forma segura
    let viteEnv: any = {};
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        viteEnv = import.meta.env;
      }
    } catch (e) {}

    // Injeta variáveis no process.env global
    Object.keys(viteEnv).forEach(key => {
      win.process.env[key] = viteEnv[key];
    });

    // Se a chave master estiver no VITE_API_KEY, move para API_KEY (exigido pelo SDK)
    if (win.process.env.VITE_API_KEY && !win.process.env.API_KEY) {
      win.process.env.API_KEY = win.process.env.VITE_API_KEY;
    }

    console.log("JurisPet AI: Ambiente de execução protegido inicializado.");
  }
})();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
