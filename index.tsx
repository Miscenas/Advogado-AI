
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * JURISPET AI - INITIALIZATION ENGINE
 * Este bloco garante que o SDK do Google encontre a chave de API 
 * em process.env.API_KEY, independentemente de como o Vercel/Vite a injete.
 */
(function initializeJurisPetCore() {
  if (typeof window !== 'undefined') {
    // 1. Tenta capturar a chave de todas as fontes possíveis do Vite/Browser
    // @ts-ignore
    const masterKey = import.meta.env?.VITE_API_KEY || 
                     // @ts-ignore
                     import.meta.env?.API_KEY || 
                     (window as any)._env_?.VITE_API_KEY;
    
    // 2. Cria o polyfill do objeto process.env exigido pelo SDK @google/genai
    const win = window as any;
    win.process = win.process || {};
    win.process.env = win.process.env || {};
    
    // 3. Injeta a chave Master no local global
    if (masterKey && masterKey !== 'undefined') {
      win.process.env.API_KEY = masterKey;
      console.log("JurisPet: Chave Master injetada com sucesso.");
    } else {
      console.warn("JurisPet: Chave Master não encontrada no ambiente de build.");
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
