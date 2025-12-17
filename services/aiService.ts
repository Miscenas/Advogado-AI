import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

// Helper para obter a chave de API de forma segura em diferentes ambientes (Vite/Node)
const getApiKey = (): string => {
  // Tenta acessar via process.env (Node.js / Webpack / Algumas configs de CI)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // Tenta acessar via import.meta.env (Vite Padrão)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env.VITE_API_KEY || (import.meta as any).env.API_KEY || '';
  }
  return '';
};

// Inicializa AI client com a chave recuperada de forma segura
const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData>;
}> => {
  try {
    const prompt = `
      Analise o documento jurídico anexo. 
      
      TAREFA 1: IDENTIFICAÇÃO
      Classifique o documento em uma destas categorias: "Petição Inicial", "Sentença", "Decisão Interlocutória", "Procuração", "Documento de Identidade (RG/CNH)", "Contrato", "Fatura/Recibo" ou "Outros".
      Faça um breve resumo de 1 linha sobre o que se trata.

      TAREFA 2: EXTRAÇÃO DE DADOS
      Extraia as informações das partes e do caso.
      
      Identifique:
      1. Área do direito.
      2. Tipo da ação (Se for inicial) ou Objeto da decisão (se for sentença).
      3. Foro/Jurisdição.
      4. Autores/Exequentes (Lista).
      5. Réus/Executados (Lista).
      6. Resumo narrativo dos fatos ou dispositivo da sentença.
      7. Valor da causa (se houver).

      Retorne APENAS um JSON estrito.
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
            docType: { type: Type.STRING, description: "Classificação do documento" },
            summary: { type: Type.STRING, description: "Resumo de 1 linha do conteúdo" },
            extractedData: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING, enum: ["civel", "trabalhista", "familia", "consumidor"] },
                actionType: { type: Type.STRING },
                jurisdiction: { type: Type.STRING },
                plaintiffs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      doc: { type: Type.STRING },
                      address: { type: Type.STRING },
                      qualification: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ["pf", "pj"] }
                    }
                  }
                },
                defendants: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      doc: { type: Type.STRING },
                      address: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ["pf", "pj"] }
                    }
                  }
                },
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

  } catch (error) {
    console.error("Error extracting document data:", error);
    return {
      docType: "Erro na Leitura",
      summary: "Falha ao processar o documento ou chave de API inválida.",
      extractedData: {}
    };
  }
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const prompt = `
      Você é um assistente jurídico. 
      Transcreva o áudio anexo fielmente para texto. 
      Se houver termos coloquiais, mantenha o sentido mas ajuste levemente para uma linguagem clara (sem gírias excessivas), pronta para ser usada como base de fatos em uma petição.
      Retorne APENAS o texto transcrito.
    `;

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
    console.error("Error transcribing audio:", error);
    throw new Error("Falha na transcrição do áudio. Verifique a chave de API.");
  }
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  try {
    const prompt = `
      ATUE COMO UM PESQUISADOR JURÍDICO ESPECIALISTA.
      O usuário busca jurisprudência sobre: "${query}".
      
      FILTRO/ESCOPO: ${scope === 'federal' ? 'Tribunais Federais (TRF, STJ, STF)' : scope === 'estadual' ? 'Tribunais de Justiça Estaduais (TJ)' : 'Todos os Tribunais Brasileiros'}.
      
      TAREFA:
      1. Encontre/Gere 3 Ementas de julgados relevantes e recentes (preferencialmente últimos 5 anos) que se encaixem no tema.
      2. Formate a saída em HTML limpo, usando cartões para cada julgado.
      
      FORMATO DE CADA JULGADO (HTML):
      <div class="juris-card">
        <h4>[TRIBUNAL] - [TIPO DO RECURSO] nº [NÚMERO FICTÍCIO SE NÃO TIVER ACESSO WEB]</h4>
        <p><strong>Relator:</strong> [Nome]</p>
        <p><strong>Data de Julgamento:</strong> [Data Recente]</p>
        <p class="ementa"><strong>Ementa:</strong> [Texto da Ementa...]</p>
      </div>

      IMPORTANTE:
      - Se você não tiver acesso à internet em tempo real, use seu conhecimento da base de dados para gerar jurisprudência REAL ou SIMULADA baseada no entendimento majoritário atual.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 }
    });

    let text = response.text || "Nenhum resultado encontrado.";
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;

  } catch (error: any) {
    console.error("Error searching jurisprudence:", error);
    return `<p class="text-red-500">Erro ao buscar jurisprudência. (${error.message})</p>`;
  }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  const formatParty = (p: PetitionParty) => `Nome: ${p.name}, Doc: ${p.doc}, Endereço: ${p.address}, Qualificação: ${p.qualification}`;
  const plaintiffsText = data.plaintiffs.map((p, i) => `AUTOR ${i+1}: ${formatParty(p)}`).join('\n');
  const defendantsText = data.defendants.map((d, i) => `RÉU ${i+1}: ${formatParty(d)}`).join('\n');

  try {
    const prompt = `
      ATUE COMO UM JURISTA SÊNIOR DE ELITE (20+ ANOS DE EXPERIÊNCIA EM DIREITO BRASILEIRO).
      OBJETIVO: Criar uma Petição Inicial IMPECÁVEL, ROBUSTA, ARGUMENTATIVA e DETALHADA.

      DADOS DO CASO:
      - ÁREA: ${data.area}
      - AÇÃO: ${data.actionType || '(DEDUZIR PELOS FATOS)'}
      - JURISDIÇÃO: ${data.jurisdiction || '(Deixar espaço para preencher)'}
      - AUTOR(ES): ${plaintiffsText}
      - RÉU(S): ${defendantsText}
      - FATOS BRUTOS: ${data.facts}
      - PEDIDOS ESPECÍFICOS: ${data.requests.join('; ')}
      - PROVAS: ${data.evidence}
      - VALOR DA CAUSA: ${data.value}

      ESTRUTURA OBRIGATÓRIA (FORMATO HTML):
      - Endereçamento (CAIXA ALTA, CENTRALIZADO).
      - Qualificação Completa.
      - Títulos das Seções (H3, CENTRALIZADO).
         I. DOS FATOS
         II. DO DIREITO
         III. DA TUTELA DE URGÊNCIA (Se aplicável)
         IV. DA GRATUIDADE DA JUSTIÇA (Se aplicável)
         V. DOS PEDIDOS
      - Fechamento (Local, Data, Advogado).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.6,
        topP: 0.9,
        topK: 40,
      }
    });

    let text = response.text || "Erro ao gerar conteúdo.";
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    return mockGeneration(data) + "<br><br><p style='color:red; text-align:center;'><b>[Erro: Falha na conexão com a IA.]</b></p>";
  }
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
  const formatParty = (p: PetitionParty) => `Nome: ${p.name}, Doc: ${p.doc}`;
  const plaintiffsText = data.plaintiffs.map((p, i) => `AUTOR (Adverso): ${formatParty(p)}`).join('\n');
  const defendantsText = data.defendants.map((d, i) => `RÉU (Meu Cliente): ${formatParty(d)}`).join('\n');

  let documentContext = "";
  if (data.analyzedDocuments && data.analyzedDocuments.length > 0) {
      documentContext = `
      RESUMO/CONTEÚDO DA PEÇA A SER CONTESTADA: 
      ${data.analyzedDocuments[0].summary}
      `;
  }

  try {
    const prompt = `
      ATUE COMO UM ADVOGADO DE DEFESA BRILHANTE E COMBATIVO.
      OBJETIVO: Criar uma CONTESTAÇÃO técnica e robusta.

      DADOS DO PROCESSO:
      - ÁREA: ${data.area}
      - AÇÃO: ${data.actionType}
      - JUÍZO: ${data.jurisdiction}
      - PARTE CONTRÁRIA: ${plaintiffsText}
      - MEU CLIENTE: ${defendantsText}
      
      ${documentContext}

      TESE DE DEFESA:
      ${data.facts}
      
      PEDIDOS DA DEFESA: ${data.requests.join('; ')}

      DIRETRIZES (HTML):
      1. ENDEREÇAMENTO
      2. PRELIMINARES DE MÉRITO (Inépcia, Ilegitimidade, Prescrição, etc).
      3. SÍNTESE DA DEMANDA
      4. DA REALIDADE DOS FATOS
      5. DO DIREITO (Impugnação Específica)
      6. DOS PEDIDOS
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
        topP: 0.95,
        topK: 40,
      }
    });

    let text = response.text || "Erro ao gerar contestação.";
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;

  } catch (error: any) {
    console.error("Error generating defense:", error);
    return mockGeneration(data) + "<br><br><p style='color:red; text-align:center;'><b>[Erro: Falha na conexão com a IA.]</b></p>";
  }
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
  try {
    const prompt = `
      Analise os dados desta petição e sugira metadados para o PJe (TPU CNJ).
      Ação: ${data.actionType}
      Área: ${data.area}
      Fatos: ${data.facts}
      
      Retorne Competência, Classe Judicial e Assunto Principal.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            competence: { type: Type.STRING },
            class: { type: Type.STRING },
            subject: { type: Type.STRING }
          },
          required: ["competence", "class", "subject"]
        }
      }
    });
    
    const jsonStr = response.text || "{}";
    const result = JSON.parse(jsonStr);
    
    return {
      competence: result.competence || "A definir",
      class: result.class || "Procedimento Comum",
      subject: result.subject || "Direito Civil"
    };

  } catch (error) {
    return mockMetadata(data);
  }
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
  try {
    const prompt = `
      Atue como um advogado sênior revisando uma peça jurídica (HTML).
      CONTEÚDO ORIGINAL: ${currentContent}
      ALTERAÇÃO SOLICITADA: "${instructions}"
      TAREFA: Reescreva a petição em HTML incorporando as alterações.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.4 }
    });

    let text = response.text || currentContent;
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;

  } catch (error) {
    throw new Error("Não foi possível refinar a petição.");
  }
};

const mockGeneration = (data: PetitionFormData) => {
  return `
<h3 style="text-align: center;">EXCELENTÍSSIMO JUÍZO DA COMARCA DE ${data.jurisdiction?.toUpperCase() || '...'}</h3>
<br><p><b>${data.plaintiffs[0]?.name || 'AUTOR'}</b>, vem propor a presente <b>${data.actionType?.toUpperCase()}</b>...</p>
<br><h3 style="text-align: center;">DOS FATOS</h3><p>${data.facts}</p>
<br><h3 style="text-align: center;">DOS PEDIDOS</h3><p>Pede deferimento.</p>
  `;
};

const mockMetadata = (data: PetitionFormData): PetitionFilingMetadata => {
  return {
    competence: 'Vara Cível',
    class: 'Procedimento Comum',
    subject: data.actionType || 'Direito Civil'
  };
};