
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Ponte de compatibilidade para o SDK do Google Gemini em ambientes Vite/Browser
// Isso garante que process.env.API_KEY esteja disponível globalmente
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
  (window as any).process.env = {
    ...((window as any).process.env || {}),
    // Tenta capturar de todas as formas que o Vite/Vercel podem injetar
    API_KEY: (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.API_KEY || (window as any).process.env?.API_KEY
  };
}

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
