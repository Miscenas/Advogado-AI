
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * JURISPET AI - UNIVERSAL ENV BOOTSTRAP
 * Garante que o ambiente tenha acesso às variáveis VITE_ configuradas no Vercel.
 */
(function initializeEnvironment() {
  if (typeof window !== 'undefined') {
    const win = window as any;
    
    // 1. Cria o polyfill do process.env se não existir
    win.process = win.process || {};
    win.process.env = win.process.env || {};
    
    // 2. Mapeia variáveis do Vite (import.meta.env) para o process.env global
    try {
      // @ts-ignore
      const metaEnv = import.meta.env || {};
      Object.keys(metaEnv).forEach(key => {
        if (key.startsWith('VITE_') || key === 'API_KEY') {
          win.process.env[key] = metaEnv[key];
        }
      });
    } catch (e) {
      console.debug("Ambiente sem suporte nativo a import.meta.env");
    }

    // 3. Mapeia chaves específicas configuradas no painel do Vercel
    const MASTER_KEY = win.process.env.VITE_API_KEY || win.VITE_API_KEY;
    if (MASTER_KEY && !win.process.env.API_KEY) {
      win.process.env.API_KEY = MASTER_KEY;
    }

    console.log("JurisPet AI: Ambiente de execução inicializado.");
  }
})();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
