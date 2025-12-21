
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * JURISPET AI - CORE ENVIRONMENT BOOTSTRAP
 * Garante que a chave de API esteja disponível para o SDK da Google.
 */
(function bootstrap() {
  if (typeof window !== 'undefined') {
    // 1. Tenta capturar de todas as fontes possíveis (Vite, Vercel, Window)
    const rawKey = 
      // @ts-ignore
      import.meta.env?.VITE_API_KEY || 
      // @ts-ignore
      import.meta.env?.API_KEY || 
      (window as any)._env_?.API_KEY ||
      (window as any).VITE_API_KEY;

    // 2. Cria o objeto process.env no navegador (necessário para o SDK @google/genai)
    const win = window as any;
    win.process = win.process || {};
    win.process.env = win.process.env || {};
    
    // 3. Normaliza a chave para process.env.API_KEY
    if (rawKey && rawKey !== 'undefined' && rawKey.length > 5) {
      win.process.env.API_KEY = rawKey;
      console.log("JurisPet: Motor de IA alimentado com sucesso.");
    } else {
      console.warn("JurisPet: Chave Master não detectada. O sistema operará em modo de configuração.");
    }
  }
})();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
