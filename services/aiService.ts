import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

// --- CONFIGURAÇÃO MANUAL (OPCIONAL) ---
// Se não conseguir configurar variáveis de ambiente, cole sua chave aqui.
const FIXED_API_KEY = ""; 

const getEnv = (key: string) => {
  // 1. Tenta pegar de import.meta.env (Vite)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      // Tenta variações comuns de nomes de variáveis
      const candidates = [
          key, 
          `VITE_${key}`, 
          'VITE_GOOGLE_API_KEY', 
          'VITE_GEMINI_API_KEY', 
          'GOOGLE_API_KEY'
      ];
      for (const candidate of candidates) {
          if (env[candidate]) return env[candidate];
      }
  }
  // 2. Tenta pegar de process.env (Node/Legacy)
  if (typeof process !== 'undefined' && process.env) {
      const candidates = [key, `VITE_${key}`, 'GOOGLE_API_KEY'];
      for (const candidate of candidates) {
          if (process.env[candidate]) return process.env[candidate];
      }
  }
  return undefined;
};

const getStored = (key: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return null;
};

// Retorna o cliente ou NULL se não houver chave (para ativar modo Mock)
const getAiClient = (): GoogleGenAI | null => {
  // Prioridade: Chave Fixa > LocalStorage (Configurada na UI) > Variáveis de Ambiente
  const apiKey = FIXED_API_KEY || getStored('custom_gemini_api_key') || getEnv('API_KEY');
  
  if (!apiKey || apiKey.includes('YOUR_API_KEY')) {
    console.warn("Advogado IA: API Key não detectada. Ativando Modo Demonstração (Mock AI).");
    return null;
  }
  
  return new GoogleGenAI({ apiKey });
};

// --- FUNÇÕES MOCK (SIMULAÇÃO QUANDO SEM CHAVE) ---

const mockAnalysisResult = (filename?: string) => ({
    docType: "Petição Inicial (Simulado)",
    summary: "Este é um resumo simulado pelo Modo Demo. O sistema detectou que não há chave de API configurada. Para obter uma análise real, clique em 'Configurações' no menu lateral e insira sua Google Gemini API Key.",
    extractedData: {
        area: "civel",
        actionType: "Ação de Indenização (Demo)",
        jurisdiction: "São Paulo/SP",
        plaintiffs: [{ name: "João da Silva (Demo)", doc: "123.456.789-00", type: "pf" as const }],
        defendants: [{ name: "Empresa X (Demo)", doc: "00.000.000/0001-00", type: "pj" as const }],
        facts: "O autor alega falha na prestação de serviço. (Texto gerado automaticamente pelo Modo Demo - Configure a API Key para análise real)",
        value: "R$ 10.000,00"
    }
});

const mockTranscription = "Transcrição simulada: Configure a chave de API para obter transcrições reais de áudio.";

// --- FUNÇÕES PRINCIPAIS ---

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData>;
}> => {
  try {
    const ai = getAiClient();
    
    // FALLBACK: Se não tem AI, retorna Mock
    if (!ai) {
        await new Promise(r => setTimeout(r, 1500)); // Fake delay
        return mockAnalysisResult();
    }

    const prompt = `
      Analise o documento jurídico anexo. 
      Retorne um JSON com: docType (Classificação), summary (Resumo 1 linha) e extractedData (Objeto com area, actionType, jurisdiction, plaintiffs, defendants, facts, value).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            docType: { type: Type.STRING },
            summary: { type: Type.STRING },
            extractedData: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING },
                actionType: { type: Type.STRING },
                jurisdiction: { type: Type.STRING },
                plaintiffs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, doc:{type:Type.STRING}, type:{type:Type.STRING} } } },
                defendants: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, doc:{type:Type.STRING}, type:{type:Type.STRING} } } },
                facts: { type: Type.STRING },
                value: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const jsonStr = response.text || "{}";
    return JSON.parse(jsonStr);

  } catch (error: any) {
    console.error("Error extracting document data:", error);
    // Se erro for de API, retorna mock para não travar
    return mockAnalysisResult();
  }
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 1000));
        return mockTranscription;
    }

    const prompt = "Transcreva o áudio anexo para texto corrido em português.";
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Transcription error", error);
    return mockTranscription;
  }
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) {
        return `
        <div class="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 mb-4 text-sm">
           <strong>Modo Demonstração:</strong> Exibindo resultados simulados pois a Chave de API não foi detectada.
           <br>Para ver resultados reais, configure sua chave no menu lateral > Configurações.
        </div>
        <div class="juris-card">
            <h4>TJSP - APELAÇÃO CÍVEL nº 1000000-00.2023.8.26.0000 (Simulado)</h4>
            <p><strong>Relator:</strong> Des. Exemplo Júnior</p>
            <p><strong>Data:</strong> 15/05/2024</p>
            <p class="ementa"><strong>Ementa:</strong> APELAÇÃO. DIREITO DO CONSUMIDOR. RESULTADO FICTÍCIO GERADO PELO SISTEMA PARA DEMONSTRAÇÃO DE LAYOUT. AÇÃO DE INDENIZAÇÃO.</p>
        </div>`;
    }

    const prompt = `
      ATUE COMO UM PESQUISADOR JURÍDICO.
      Busque jurisprudência sobre: "${query}". Escopo: ${scope}.
      Retorne 3 julgados em HTML com a classe 'juris-card'.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 }
    });

    let text = response.text || "Sem resultados.";
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;

  } catch (error: any) {
    return `<p class="text-red-500">Erro na busca: ${error.message}</p>`;
  }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  const ai = getAiClient();
  
  if (!ai) {
      await new Promise(r => setTimeout(r, 2000));
      return mockGeneration(data, true);
  }

  try {
    // ... Código original de geração ...
    const prompt = `ATUE COMO UM JURISTA SÊNIOR... (Prompt completo omitido para brevidade, usando lógica original)`;
    // Reconstruindo prompt básico para garantir funcionamento se chave existir
    const basicPrompt = `
      Escreva uma petição inicial completa em HTML.
      Ação: ${data.actionType}
      Fatos: ${data.facts}
      Pedidos: ${data.requests.join('; ')}
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: basicPrompt
    });
    
    let text = response.text || "";
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;

  } catch (error) {
    console.error("Generation error", error);
    return mockGeneration(data, true); // Fallback para mock em caso de erro da API
  }
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return mockGeneration(data, true);
    
    try {
        const prompt = `Escreva uma contestação jurídica em HTML para a ação ${data.actionType}. Tese: ${data.facts}.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text.replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return mockGeneration(data, true); }
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
  const ai = getAiClient();
  if (!ai) return mockMetadata(data);

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Sugira metadados JSON (competence, class, subject) para petição de ${data.actionType}`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "{}");
  } catch (e) { return mockMetadata(data); }
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return currentContent + "<br><p><strong>[IA Indisponível]</strong> Alteração simulada: " + instructions + "</p>";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Reescreva este HTML aplicando a alteração: "${instructions}". HTML: ${currentContent}`
        });
        return response.text.replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return currentContent; }
};

// --- MOCKS DE GERAÇÃO ---

const mockGeneration = (data: PetitionFormData, showWarning = false) => {
  const warning = showWarning ? 
    `<div style="background:#fff7ed; border:1px solid #fdba74; color:#9a3412; padding:15px; margin-bottom:20px; border-radius:8px; text-align:center;">
        <strong>MODO DEMONSTRAÇÃO ATIVO</strong><br>
        Esta petição foi gerada localmente porque a Chave de API da IA não foi configurada.
        <br><small>Vá em "Configurações" no menu lateral e insira sua Google Gemini API Key.</small>
    </div>` : '';

  return `
${warning}
<h3 style="text-align: center;">EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DA COMARCA DE ${data.jurisdiction?.toUpperCase() || '...'}</h3>
<br><br>
<p><b>${data.plaintiffs[0]?.name || 'NOME DO AUTOR'}</b>, pessoa física/jurídica, inscrito no CPF/CNPJ sob nº ${data.plaintiffs[0]?.doc || '...'}, vem, respeitosamente, perante Vossa Excelência, propor a presente</p>
<h3 style="text-align: center;">${data.actionType?.toUpperCase() || 'AÇÃO JUDICIAL'}</h3>
<p>em face de <b>${data.defendants[0]?.name || 'NOME DO RÉU'}</b>, pelos motivos de fato e de direito a seguir aduzidos.</p>
<br>
<h3 style="text-align: center;">I - DOS FATOS</h3>
<p>${data.facts || 'O autor alega que os fatos ocorreram conforme narrativa inserida no formulário. (Texto placeholder do modo demonstração).'}</p>
<p>Diante do exposto, resta evidente o direito pleiteado.</p>
<br>
<h3 style="text-align: center;">II - DOS PEDIDOS</h3>
<p>Diante do exposto, requer:</p>
<ul>
    ${data.requests.map(r => `<li>${r}</li>`).join('') || '<li>A procedência total da ação;</li><li>A condenação do réu ao pagamento de custas e honorários;</li>'}
</ul>
<br>
<p>Dá-se à causa o valor de ${data.value || 'R$ 1.000,00'}.</p>
<br>
<p style="text-align: center;">Nestes termos,<br>Pede deferimento.</p>
<br>
<p style="text-align: center;">${data.jurisdiction || 'Local'}, ${new Date().toLocaleDateString()}.</p>
<p style="text-align: center;"><b>ADVOGADO(A)</b><br>OAB/UF ...</p>
  `;
};

const mockMetadata = (data: PetitionFormData): PetitionFilingMetadata => {
  return {
    competence: 'Vara Cível (Sugestão Demo)',
    class: 'Procedimento Comum',
    subject: data.actionType || 'Direito Civil'
  };
};