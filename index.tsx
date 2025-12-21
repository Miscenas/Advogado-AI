
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * PONTE DE AMBIENTE JURISPET AI
 * O SDK do Google Gemini exige process.env.API_KEY.
 * Em ambientes Vite/Browser, injetamos isso de forma ultra-segura.
 */
(function polyfillEnv() {
  if (typeof window !== 'undefined') {
    let envKey = "";
    
    // Tentativa de leitura segura em cascata
    try {
      // @ts-ignore
      if (import.meta && import.meta.env) {
        // @ts-ignore
        envKey = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || "";
      }
    } catch (e) {
      console.warn("JurisPet AI: Não foi possível acessar import.meta.env diretamente.");
    }

    // Inicializa o objeto process global
    (window as any).process = (window as any).process || { env: {} };
    (window as any).process.env = (window as any).process.env || {};
    
    // Injeta a chave (prioriza o que já estiver no process.env se houver)
    const finalKey = (window as any).process.env.API_KEY || envKey;
    (window as any).process.env.API_KEY = finalKey;

    // Diagnóstico no console
    if (!finalKey || finalKey === 'undefined' || finalKey === "") {
      console.error("JurisPet AI: [ERRO DE CONFIGURAÇÃO] VITE_API_KEY não encontrada. O sistema de IA não funcionará até que a variável seja configurada no Vercel/Hospedagem.");
    } else {
      console.log("JurisPet AI: [SUCESSO] Chave de API detectada e injetada.");
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
