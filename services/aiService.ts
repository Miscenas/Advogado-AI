import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

// --- CONFIGURAÇÃO MANUAL (MÉTODO INFALÍVEL) ---
// Se a configuração via menu não funcionar, cole sua chave entre as aspas abaixo:
const FIXED_API_KEY = ""; 

const getEnv = (key: string) => {
  // 1. Tenta pegar de import.meta.env (Vite)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      const candidates = [
          key, 
          `VITE_${key}`, 
          'VITE_GOOGLE_API_KEY', 
          'VITE_GEMINI_API_KEY', 
          'GOOGLE_API_KEY',
          'GEMINI_API_KEY'
      ];
      for (const candidate of candidates) {
          if (env[candidate]) return env[candidate];
      }
  }
  // 2. Tenta pegar de process.env (Node/Legacy)
  if (typeof process !== 'undefined' && process.env) {
      const candidates = [key, `VITE_${key}`, 'GOOGLE_API_KEY', 'GEMINI_API_KEY'];
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

// Verifica se existe uma chave configurada (para uso na UI)
export const hasAiKey = (): boolean => {
    const key = FIXED_API_KEY || getStored('custom_gemini_api_key') || getEnv('API_KEY');
    return !!(key && key.length > 10 && !key.includes('YOUR_API_KEY'));
};

// Retorna o cliente ou NULL se não houver chave (para ativar modo Mock)
const getAiClient = (): GoogleGenAI | null => {
  // Prioridade: Chave Fixa > LocalStorage (Configurada na UI) > Variáveis de Ambiente
  const apiKey = FIXED_API_KEY || getStored('custom_gemini_api_key') || getEnv('API_KEY');
  
  if (!apiKey || apiKey.length < 10 || apiKey.includes('YOUR_API_KEY')) {
    console.warn("Advogado IA: API Key não detectada ou inválida. Ativando Modo Demonstração (Mock AI).");
    console.log("Dica: Vá em Configurações no menu lateral e cole sua chave API.");
    return null;
  }
  
  // Debug (sem expor a chave inteira)
  // console.log("Advogado IA: Chave API detectada (inicia com " + apiKey.substring(0, 4) + "...)");
  
  return new GoogleGenAI({ apiKey });
};

// --- FUNÇÕES MOCK (SIMULAÇÃO QUANDO SEM CHAVE) ---

const mockAnalysisResult = (filename?: string) => ({
    docType: "Petição (Simulado - Falta Chave API)",
    summary: "O SISTEMA ESTÁ EM MODO DEMONSTRAÇÃO. Configure a 'Google Gemini API Key' no menu lateral para usar a IA real.",
    extractedData: {
        area: "civel",
        actionType: "Ação de Indenização (Exemplo)",
        jurisdiction: "São Paulo/SP",
        plaintiffs: [{ name: "Cliente Exemplo (Demo)", doc: "000.000.000-00", type: "pf" as const }],
        defendants: [{ name: "Empresa Ré (Demo)", doc: "00.000.000/0001-00", type: "pj" as const }],
        facts: "Este texto é um exemplo fictício gerado porque a Chave de API da Inteligência Artificial não foi encontrada. Por favor, insira sua chave nas Configurações.",
        value: "R$ 10.000,00"
    }
});

const mockTranscription = "Transcrição indisponível: Chave de API não configurada. Vá em Configurações > Google Gemini API.";

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
        await new Promise(r => setTimeout(r, 1000));
        return mockAnalysisResult();
    }

    const prompt = `
      Analise o documento jurídico anexo. 
      Retorne um JSON com: docType (Classificação ex: "Petição Inicial", "Contestação", "Sentença"), summary (Resumo 1 linha) e extractedData (Objeto com area, actionType, jurisdiction, plaintiffs, defendants, facts, value).
      Se for imagem ilegível, retorne docType: "Erro".
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
    // Se erro for de API (403, 400), retorna mock com aviso
    const mock = mockAnalysisResult();
    mock.summary = `Erro na API: ${error.message || 'Chave inválida ou cota excedida'}`;
    return mock;
  }
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) {
        await new Promise(r => setTimeout(r, 1000));
        return mockTranscription;
    }

    const prompt = "Transcreva o áudio anexo para texto corrido em português. Ignore ruídos.";
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
        <div class="p-4 bg-red-50 border border-red-200 rounded text-red-800 mb-4 text-sm">
           <strong>IA Desconectada:</strong> Insira sua API Key nas Configurações para realizar pesquisas reais.
        </div>
        <div class="juris-card opacity-50">
            <h4>RESULTADO EXEMPLO (MODO DEMO)</h4>
            <p><strong>Relator:</strong> IA JurisPet</p>
            <p class="ementa"><strong>Ementa:</strong> Este resultado é fictício porque o sistema não detectou uma chave de API válida.</p>
        </div>`;
    }

    const prompt = `
      ATUE COMO UM PESQUISADOR JURÍDICO.
      Busque jurisprudência real e recente sobre: "${query}". Escopo: ${scope}.
      Retorne 3 julgados formatados em HTML, cada um dentro de uma div com a classe 'juris-card'.
      Inclua: Tribunal, Número do Processo (invente se não achar real), Relator, Data e Ementa Resumida.
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
      await new Promise(r => setTimeout(r, 1500));
      return mockGeneration(data, true);
  }

  try {
    const prompt = `
      ATUE COMO UM ADVOGADO SÊNIOR ESPECIALISTA.
      Redija uma PETIÇÃO INICIAL completa e bem fundamentada em formato HTML (sem tags html/body/head externas, apenas o conteúdo).
      
      DADOS DO CASO:
      - Área: ${data.area}
      - Ação: ${data.actionType}
      - Foro: ${data.jurisdiction}
      - Autores: ${data.plaintiffs.map(p => `${p.name} (${p.type}, Doc: ${p.doc})`).join(', ')}
      - Réus: ${data.defendants.map(d => `${d.name} (${d.type}, Doc: ${d.doc})`).join(', ')}
      - Fatos: ${data.facts}
      - Pedidos Específicos: ${data.requests.join('; ')}
      - Valor da Causa: ${data.value}
      
      ESTRUTURA:
      1. Endereçamento (Excelentíssimo...)
      2. Qualificação das partes
      3. Dos Fatos (Narrativa persuasiva)
      4. Do Direito (Fundamentação legal e jurisprudencial breve)
      5. Dos Pedidos (Lista numerada)
      6. Fechamento (Valor, data, local, assinatura)

      Use tags <h3> para títulos, <p> para parágrafos, <ul>/<li> para listas.
      Formatação limpa e profissional.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    
    let text = response.text || "";
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;

  } catch (error) {
    console.error("Generation error", error);
    return mockGeneration(data, true); 
  }
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return mockGeneration(data, true);
    
    try {
        const prompt = `
          ATUE COMO UM ADVOGADO DE DEFESA.
          Redija uma CONTESTAÇÃO em HTML.
          Ação Originária: ${data.actionType}
          Tese de Defesa/Fatos: ${data.facts}
          Pedidos da Defesa: ${data.requests.join('; ')}
          
          Estruture com Preliminares (se houver), Mérito e Pedidos.
        `;
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
        contents: `Analise esta ação: "${data.actionType}". Retorne JSON: { "competence": "X", "class": "Y", "subject": "Z" } (Baseado nas tabelas do CNJ)`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "{}");
  } catch (e) { return mockMetadata(data); }
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return currentContent + "<br><p style='color:red;'><strong>[IA Offline]</strong> Não foi possível processar a alteração: " + instructions + "</p>";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
              Você é um editor jurídico.
              O usuário quer alterar a seguinte petição HTML.
              Instrução de alteração: "${instructions}".
              
              Retorne APENAS o HTML atualizado, mantendo a formatação original.
              
              HTML Original:
              ${currentContent}
            `
        });
        return response.text.replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return currentContent; }
};

// --- MOCKS DE GERAÇÃO ---

const mockGeneration = (data: PetitionFormData, showWarning = false) => {
  const warning = showWarning ? 
    `<div style="background:#fef2f2; border:1px solid #fee2e2; color:#991b1b; padding:20px; margin-bottom:20px; border-radius:8px; text-align:center;">
        <h3 style="margin:0 0 10px 0;">⚠️ MODO DEMONSTRAÇÃO (IA DESCONECTADA)</h3>
        <p style="margin:0;">Esta petição é apenas um modelo genérico.</p>
        <p style="margin:5px 0 0 0; font-size:0.9em;">Para gerar conteúdo real, insira sua <strong>API Key</strong> no menu Configurações.</p>
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
<p>${data.facts || 'O autor alega que os fatos ocorreram conforme narrativa inserida no formulário. (Texto placeholder do modo demonstração - A IA não processou os fatos reais pois a chave não foi detectada).'}</p>
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
    competence: 'Configurar API Key',
    class: 'Modo Demo',
    subject: data.actionType || 'Direito Civil'
  };
};