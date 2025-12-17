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
    // Silently fail to mock mode without warning the user console too aggressively
    return null;
  }
  
  return new GoogleGenAI({ apiKey });
};

// --- FUNÇÕES MOCK (SIMULAÇÃO/FALLBACK) ---

const mockAnalysisResult = (errorMessage?: string) => {
    // Mensagem amigável para o advogado, sem tecniquês
    const summaryMsg = "O sistema não identificou o arquivo como uma petição ou documento legível. Prossiga com o preenchimento manual.";

    // Placeholder para o campo de fatos
    const factsMsg = "A leitura automática não foi possível para este arquivo.\n\nIsso ocorre quando:\n1. O documento não é uma peça jurídica padrão (ex: é uma foto, planta, recibo).\n2. O texto está ilegível ou manuscrito.\n3. O sistema de análise está momentaneamente indisponível.\n\n➡️ Por favor, descreva os fatos do caso neste campo manualmente.";

    return {
        docType: "Leitura Manual Necessária",
        summary: summaryMsg,
        extractedData: {
            area: "civel",
            actionType: "",
            jurisdiction: "",
            plaintiffs: [],
            defendants: [],
            facts: factsMsg,
            value: ""
        }
    };
};

const mockTranscription = "Transcrição indisponível no momento. Por favor, digite o conteúdo do áudio.";

// --- HELPER DE TRATAMENTO DE ERROS ---

const parseAiError = (error: any): string => {
    // Log interno para o desenvolvedor, mas retorno genérico para o usuário
    console.warn("AI Error:", error);
    return "O sistema não conseguiu processar este arquivo automaticamente.";
};

// --- FUNÇÕES PRINCIPAIS ---

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData>;
}> => {
  try {
    const ai = getAiClient();
    
    // FALLBACK: Se não tem AI configurada no sistema, retorna Mock direto pedindo preenchimento manual
    if (!ai) {
        await new Promise(r => setTimeout(r, 1000));
        return mockAnalysisResult();
    }

    const prompt = `
      Analise o documento jurídico anexo.
      Se o documento NÃO FOR uma peça jurídica ou documento de identificação claro, defina docType como "Inválido".
      
      Retorne um JSON com: 
      - docType (Classificação ex: "Petição Inicial", "Contestação", "Sentença", "RG/CPF").
      - summary (Resumo de 1 linha).
      - extractedData (Objeto com area, actionType, jurisdiction, plaintiffs, defendants, facts, value).
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
    const result = JSON.parse(jsonStr);

    // Se a IA disse que é inválido ou veio vazio, retorna mensagem de preenchimento manual
    if (result.docType === 'Inválido' || !result.extractedData || (result.extractedData?.facts?.length || 0) < 5) {
        return mockAnalysisResult("Documento não reconhecido.");
    }

    return result;

  } catch (error: any) {
    // Qualquer erro (429, 500, Key inválida) cai aqui e retorna a mensagem amigável
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
    return mockTranscription;
  }
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) {
        return `
        <div class="p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 mb-4 text-sm">
           <strong>Busca Indisponível:</strong> O sistema de pesquisa inteligente está temporariamente offline. Tente novamente mais tarde.
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
    return `<p class="text-red-500">Erro momentâneo na busca. Tente refazer a pesquisa.</p>`;
  }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  const ai = getAiClient();
  
  if (!ai) {
      await new Promise(r => setTimeout(r, 1500));
      return mockGeneration(data, true);
  }

  try {
    const isCriminal = data.area === 'criminal';
    
    let systemRole = "ATUE COMO UM ADVOGADO SÊNIOR COM 20 ANOS DE EXPERIÊNCIA.";
    let styleGuide = `
      ESTILO DE REDAÇÃO:
      - Linguagem culta, técnica, persuasiva e direta.
      - Use termos jurídicos adequados e brocardos latinos pertinentes.
      - CITE ARTIGOS DE LEI ESPECÍFICOS (CF/88, CP, CPP, CC, CPC, CLT).
      - CITE JURISPRUDÊNCIA RECENTE (STF/STJ) como fundamento.
      - Formatação HTML limpa: <h3> para títulos (centralizados), <p> justificados, <ul> para listas.
    `;

    let structureInstructions = "";

    if (isCriminal) {
        systemRole = "ATUE COMO UM ADVOGADO CRIMINALISTA SÊNIOR DE ALTA PERFORMANCE.";
        structureInstructions = `
          ESTRUTURA CRIMINAL OBRIGATÓRIA:
          1. ENDEREÇAMENTO: Excelentíssimo Senhor Doutor Juiz de Direito da Vara Criminal da Comarca de... (ou autoridade policial/Tribunal competente).
          2. PREÂMBULO: Qualificação completa do ${data.actionType?.includes('Queixa') ? 'Querelante' : 'Requerente/Paciente'}.
          3. I - DOS FATOS: Narrativa cronológica, clara e objetiva do ocorrido.
          4. II - DO DIREITO (FUNDAMENTAÇÃO ROBUSTA):
             - Discorra sobre a Tipicidade, Ilicitude e Culpabilidade (se defesa) ou Materialidade e Autoria (se acusação).
             - Invoque princípios constitucionais (Presunção de Inocência, Devido Processo Legal, Ampla Defesa).
             - Cite artigos do Código Penal e Processo Penal.
             - Cite Súmulas do STF/STJ.
          5. III - DOS PEDIDOS: Liste os requerimentos de forma técnica.
          6. FECHAMENTO: Local, Data, Advogado OAB.
        `;
    } else {
        structureInstructions = `
          ESTRUTURA CÍVEL/GERAL:
          1. ENDEREÇAMENTO (Excelentíssimo...).
          2. QUALIFICAÇÃO DAS PARTES.
          3. I - DOS FATOS (Narrativa persuasiva).
          4. II - DO DIREITO (Fundamentação legal e jurisprudencial).
          5. III - DOS PEDIDOS (Lista numerada e valor da causa).
          6. FECHAMENTO.
        `;
    }

    const prompt = `
      ${systemRole}
      
      Redija uma peça processual completa: ${data.actionType?.toUpperCase() || 'PETIÇÃO INICIAL'}.
      
      DADOS DO CASO:
      - Área: ${data.area.toUpperCase()}
      - Foro: ${data.jurisdiction}
      - Polo Ativo: ${data.plaintiffs.map(p => `${p.name} (${p.type}, Doc: ${p.doc})`).join(', ')}
      - Polo Passivo: ${data.defendants.map(d => `${d.name} (${d.type}, Doc: ${d.doc})`).join(', ')}
      - Fatos: ${data.facts}
      - Pedidos Específicos: ${data.requests.join('; ')}
      ${isCriminal ? '' : `- Valor da Causa: ${data.value}`}
      
      ${styleGuide}
      
      ${structureInstructions}

      Gere APENAS o HTML do conteúdo da petição (sem tags <html> ou <body> externas).
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
          ATUE COMO UM ADVOGADO DE DEFESA SÊNIOR.
          Redija uma CONTESTAÇÃO/DEFESA PRÉVIA em HTML.
          Área: ${data.area}
          Ação Originária: ${data.actionType}
          Tese de Defesa/Fatos: ${data.facts}
          Pedidos da Defesa: ${data.requests.join('; ')}
          
          Estruture com:
          I. Das Preliminares (Nulidades, Incompetência, Ilegitimidade).
          II. Do Mérito (Ataque direto aos fatos e fundamentos jurídicos da acusação/inicial).
          III. Dos Pedidos.
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
        contents: `Analise esta ação: "${data.actionType}" na área "${data.area}". Retorne JSON: { "competence": "X", "class": "Y", "subject": "Z" } (Baseado nas tabelas do CNJ)`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "{}");
  } catch (e) { return mockMetadata(data); }
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return currentContent + "<br><p style='color:red;'><strong>[Aviso]</strong> Não foi possível processar a alteração solicitada automaticamente.</p>";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
              Você é um editor jurídico sênior.
              O usuário quer alterar a seguinte petição HTML.
              Instrução de alteração: "${instructions}".
              
              Retorne APENAS o HTML atualizado, mantendo a formatação original e o tom formal.
              
              HTML Original:
              ${currentContent}
            `
        });
        return response.text.replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return currentContent; }
};

// --- MOCKS DE GERAÇÃO (Fallback se a IA falhar na geração) ---

const mockGeneration = (data: PetitionFormData, showWarning = false) => {
  // Aviso sutil apenas no topo, sem falar de API Key
  const warning = showWarning ? 
    `<div style="background:#fff7ed; border:1px solid #ffedd5; color:#9a3412; padding:15px; margin-bottom:20px; border-radius:8px; text-align:center; font-size: 0.9em;">
        <strong>Nota:</strong> O sistema de IA está temporariamente indisponível. Esta é uma minuta modelo baseada nos dados inseridos. Recomendamos revisão manual atenta.
    </div>` : '';

  const isCriminal = data.area === 'criminal';
  
  if (isCriminal) {
      return `
        ${warning}
        <h3 style="text-align: center;">EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CRIMINAL DA COMARCA DE ${data.jurisdiction?.toUpperCase() || '...'}</h3>
        <br><br>
        <p><b>${data.plaintiffs[0]?.name || 'NOME'}</b>, já qualificado nos autos, vem, respeitosamente, perante Vossa Excelência, por meio de seu advogado infra-assinado...</p>
        <h3 style="text-align: center;">${data.actionType?.toUpperCase() || 'REQUERIMENTO CRIMINAL'}</h3>
        <br>
        <h3 style="text-align: center;">I - DOS FATOS</h3>
        <p>${data.facts || 'Narrativa dos fatos conforme informado.'}</p>
        <br>
        <h3 style="text-align: center;">II - DO DIREITO</h3>
        <p>O direito assiste ao requerente, com base no princípio do <i>in dubio pro reo</i> e na legislação vigente (CP/CPP).</p>
        <br>
        <h3 style="text-align: center;">III - DOS PEDIDOS</h3>
        <p>Ante o exposto, requer:</p>
        <ul>${data.requests.map(r => `<li>${r}</li>`).join('')}</ul>
        <br>
        <p style="text-align: center;">Termos em que,<br>Pede deferimento.</p>
        <p style="text-align: center;">${data.jurisdiction || 'Local'}, ${new Date().toLocaleDateString()}.</p>
        <p style="text-align: center;"><b>ADVOGADO OAB/...</b></p>
      `;
  }

  return `
${warning}
<h3 style="text-align: center;">EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DA COMARCA DE ${data.jurisdiction?.toUpperCase() || '...'}</h3>
<br><br>
<p><b>${data.plaintiffs[0]?.name || 'NOME DO AUTOR'}</b>, pessoa física/jurídica, inscrito no CPF/CNPJ sob nº ${data.plaintiffs[0]?.doc || '...'}, vem, respeitosamente, perante Vossa Excelência, propor a presente</p>
<h3 style="text-align: center;">${data.actionType?.toUpperCase() || 'AÇÃO JUDICIAL'}</h3>
<p>em face de <b>${data.defendants[0]?.name || 'NOME DO RÉU'}</b>, pelos motivos de fato e de direito a seguir aduzidos.</p>
<br>
<h3 style="text-align: center;">I - DOS FATOS</h3>
<p>${data.facts || 'O autor alega que os fatos ocorreram conforme narrativa inserida no formulário.'}</p>
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
    competence: data.jurisdiction || (data.area === 'criminal' ? 'Juízo Criminal Competente' : 'Juízo Cível Competente'),
    class: data.actionType || 'Procedimento Comum',
    subject: data.area === 'criminal' ? 'Direito Penal' : 'Direito Civil / Processual'
  };
};