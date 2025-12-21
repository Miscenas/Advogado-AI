
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * PONTE DE AMBIENTE JURISPET AI
 * O SDK do Google Gemini exige process.env.API_KEY.
 * Em ambientes Vite/Browser, injetamos isso manualmente de forma segura.
 */
if (typeof window !== 'undefined') {
  // Acesso ultra-seguro para evitar: "Cannot read properties of undefined (reading 'VITE_API_KEY')"
  const meta = (import.meta as any);
  const metaEnv = meta.env || {};
  
  const VITE_KEY = metaEnv.VITE_API_KEY;
  const RAW_KEY = metaEnv.API_KEY;
  const ENV_KEY = VITE_KEY || RAW_KEY || "";
  
  // Inicializa o objeto process global se não existir
  (window as any).process = (window as any).process || { env: {} };
  const currentProcessEnv = (window as any).process.env || {};

  // Injeta a chave garantindo que não sobrescreva se já existir uma válida
  (window as any).process.env = {
    ...currentProcessEnv,
    API_KEY: currentProcessEnv.API_KEY || ENV_KEY
  };

  // Log de diagnóstico técnico (útil para debug no F12)
  const finalKey = (window as any).process.env.API_KEY;
  if (!finalKey || finalKey === 'undefined') {
    console.error("JurisPet AI: [ERRO CRÍTICO] Variável VITE_API_KEY não detectada no ambiente.");
  } else {
    console.log("JurisPet AI: [OK] Ponte de ambiente estabelecida com sucesso.");
  }
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
