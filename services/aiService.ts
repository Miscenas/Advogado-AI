import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

// Helper to safely get the API Key
const getApiKey = () => {
  // Check Import Meta (Vite standard)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_KEY) {
    return (import.meta as any).env.VITE_API_KEY;
  }
  // Check Process Env (Legacy/Node) safely without crashing browser
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

// NOTE: process.env.API_KEY must be configured in your environment.
const apiKey = getApiKey();

// Initialize client conditionally to avoid crash if key is missing during build
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData>;
}> => {
  if (!ai) {
    console.warn("API_KEY missing. Returning mock extraction.");
    return {
      docType: "Contrato / Outros",
      summary: "Documento simulado (Mock - Chave de API ausente) contendo dados de um contrato.",
      extractedData: {
        facts: "Fatos extraídos do documento (Mock): O documento relata um acidente...",
        plaintiffs: [{ name: "João da Silva (Extraído)", doc: "123.456.789-00", type: "pf", address: "Rua A, 1", qualification: "Brasileiro, casado" }],
        actionType: "Ação de Indenização"
      }
    };
  }

  try {
    const prompt = `
      Analise o documento jurídico anexo. 
      
      TAREFA 1: IDENTIFICAÇÃO
      Classifique o documento em uma destas categorias: "Procuração", "Documento de Identidade (RG/CNH)", "Contrato", "Fatura/Recibo", "Petição", "Boletim de Ocorrência" ou "Outros".
      Faça um breve resumo de 1 linha sobre o que se trata.

      TAREFA 2: EXTRAÇÃO DE DADOS PARA PETIÇÃO
      Extraia as informações para preencher uma petição inicial. Se houver múltiplas partes (ex: múltiplos autores num contrato), liste todas.
      
      Identifique:
      1. Área do direito.
      2. Tipo da ação sugerida.
      3. Foro/Jurisdição.
      4. Autores (Lista).
      5. Réus (Lista).
      6. Resumo narrativo dos fatos.
      7. Valor da causa.

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
            docType: { type: Type.STRING, description: "Classificação do documento (ex: Procuração, RG, Contrato)" },
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
    throw new Error("Não foi possível ler o documento.");
  }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  if (!ai) {
    console.warn("API_KEY is missing. Using mock response for demonstration.");
    return mockGeneration(data);
  }

  // Format parties for the prompt
  const formatParty = (p: PetitionParty) => `Nome: ${p.name}, Doc: ${p.doc}, Endereço: ${p.address}, Qualificação: ${p.qualification}`;
  const plaintiffsText = data.plaintiffs.map((p, i) => `AUTOR ${i+1}: ${formatParty(p)}`).join('\n');
  const defendantsText = data.defendants.map((d, i) => `RÉU ${i+1}: ${formatParty(d)}`).join('\n');

  try {
    const prompt = `
      Atue como um advogado sênior especialista em Direito ${data.area} no Brasil.
      Redija uma petição inicial completa e formal para uma "${data.actionType}".
      
      DADOS DO CASO:
      1. EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA COMARCA DE ${data.jurisdiction}.
      
      2. POLO ATIVO (Pluralize se houver mais de um):
         ${plaintiffsText}
         
      3. POLO PASSIVO (Pluralize se houver mais de um):
         ${defendantsText}
         
      4. DOS FATOS:
         ${data.facts}
         
      5. DOS PEDIDOS ESPECÍFICOS:
         ${data.requests.join('; ')}
         
      6. DAS PROVAS:
         ${data.evidence}
         
      7. VALOR DA CAUSA:
         ${data.value}

      INSTRUÇÕES DE REDAÇÃO:
      - Use linguagem jurídica culta, persuasiva e técnica.
      - Se houver múltiplos autores ou réus, faça a concordância correta (ex: "vêm", "os Autores", "em face dos Réus").
      - Cite legislação pertinente (Código Civil, CPC, CLT, Constituição, etc.) e doutrina se aplicável.
      - Estruture em: I - DOS FATOS, II - DO DIREITO/FUNDAMENTAÇÃO, III - DOS PEDIDOS.
      - Formate a saída em Markdown limpo (headers, bold, listas).
    `;

    // Using gemini-2.5-flash instead of pro-preview for better key compatibility
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
      }
    });

    return response.text || "Erro ao gerar conteúdo. Tente novamente.";

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    
    // Fallback to mock if API fails to avoid breaking user flow entirely in demo
    console.warn("Fallback to Mock generation due to API error.");
    return mockGeneration(data) + "\n\n**[Nota: Gerado em modo offline devido a erro de conexão com a IA]**";
  }
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
  if (!ai) {
    return mockMetadata(data);
  }

  try {
    const prompt = `
      Analise os dados desta petição e sugira o preenchimento dos metadados para cadastro no sistema de processo eletrônico (PJe / e-SAJ / Projudi) conforme as Tabelas Processuais Unificadas (TPU) do CNJ.
      
      Ação: ${data.actionType}
      Área: ${data.area}
      Fatos resumidos: ${data.facts}
      
      Retorne a Competência, a Classe Judicial e o Assunto Principal.
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
    console.error("Error generating metadata:", error);
    return mockMetadata(data);
  }
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
  if (!ai) {
    return mockRefinement(currentContent, instructions);
  }

  try {
    const prompt = `
      Atue como um advogado sênior revisando uma peça jurídica.
      
      TEXTO ORIGINAL:
      ---
      ${currentContent}
      ---

      SOLICITAÇÃO DE ALTERAÇÃO:
      "${instructions}"

      TAREFA:
      1. Reescreva a petição mantendo a estrutura original.
      2. Incorpore as alterações solicitadas.
      3. Retorne APENAS o texto completo da petição atualizada.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.3 }
    });

    return response.text || currentContent;
  } catch (error) {
    console.error("Error refining petition:", error);
    throw new Error("Não foi possível refinar a petição.");
  }
};

// Fallback Mock
const mockGeneration = (data: PetitionFormData) => {
  const authorNames = data.plaintiffs.map(p => p.name.toUpperCase()).join(', ');
  const defNames = data.defendants.map(d => d.name.toUpperCase()).join(', ');

  return `
# EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA COMARCA DE ${data.jurisdiction.toUpperCase() || '...'}

**${authorNames || 'NOME DO AUTOR'}**, qualificados nos autos, vêm, respeitosamente, à presença de Vossa Excelência, propor a presente

## ${data.actionType.toUpperCase() || 'AÇÃO'}

em face de **${defNames || 'NOME DO RÉU'}**, pelos fatos e fundamentos a seguir expostos:

### I - DOS FATOS

${data.facts || 'Descreva os fatos aqui...'}

### II - DO DIREITO

(Fundamentação jurídica gerada automaticamente...)

### III - DOS PEDIDOS

Nestes termos,
Pede deferimento.

${data.jurisdiction || 'Local'}, ${new Date().toLocaleDateString('pt-BR')}.

_____________________________
ADVOGADO(A)
  `;
};

const mockMetadata = (data: PetitionFormData): PetitionFilingMetadata => {
  return {
    competence: data.area === 'trabalhista' ? 'Vara do Trabalho' : 'Vara Cível / JEC',
    class: 'Procedimento Comum Cível',
    subject: data.actionType || 'Direito Civil'
  };
};

const mockRefinement = (content: string, instructions: string) => {
  return content + `\n\n[MOCK REFINEMENT: "${instructions}"]`;
};