
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * JURISPET AI - BOOTSTRAP DE AMBIENTE
 * Esta função garante que o objeto process.env.API_KEY exigido pelo SDK do Google
 * esteja presente no navegador, mapeando-o a partir das variáveis do Vite.
 */
(function initializeJurisPetEnvironment() {
  if (typeof window !== 'undefined') {
    // 1. Tenta obter a chave do Vite (Build Time)
    const viteKey = (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.API_KEY;
    
    // 2. Garante a existência do objeto process.env para o SDK
    (window as any).process = (window as any).process || {};
    (window as any).process.env = (window as any).process.env || {};
    
    // 3. Injeta a chave apenas se ela ainda não existir (preservando injeções externas)
    if (!(window as any).process.env.API_KEY || (window as any).process.env.API_KEY === 'undefined') {
      (window as any).process.env.API_KEY = viteKey || "";
    }

    // Diagnóstico silencioso para o desenvolvedor
    const finalKey = (window as any).process.env.API_KEY;
    if (!finalKey) {
      console.warn("JurisPet AI: Chave de ambiente não detectada. O sistema poderá solicitar seleção manual.");
    }
  }
})();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
