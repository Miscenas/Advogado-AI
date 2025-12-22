
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill básico para compatibilidade com o SDK da Google se necessário
if (typeof window !== 'undefined') {
  const win = window as any;
  win.process = win.process || { env: {} };
  
  // Captura chaves se existirem, mas não trava se faltarem
  try {
    // @ts-ignore
    const env = import.meta.env || {};
    Object.assign(win.process.env, env);
    if (env.VITE_API_KEY) win.process.env.API_KEY = env.VITE_API_KEY;
  } catch (e) {}
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
