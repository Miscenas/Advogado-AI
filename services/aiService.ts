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

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  if (!ai) {
    console.warn("API_KEY missing. Returning mock transcription.");
    return "Transcrição simulada: O cliente relata que sofreu danos materiais...";
  }

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
    throw new Error("Falha na transcrição do áudio.");
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
      Redija uma petição inicial completa e formal.
      
      IMPORTANTE SOBRE DADOS FALTANTES:
      O usuário pode NÃO ter informado o TIPO DA AÇÃO ou a JURISDIÇÃO.
      1. Se "TIPO DE AÇÃO" estiver vazio, você DEVE DEDUZIR a ação correta baseando-se nos FATOS e PEDIDOS narrados (ex: Ação de Cobrança, Indenizatória, Alimentos, etc.).
      2. Se "JURISDIÇÃO" estiver vazio, deixe um espaço em branco sublinhado (ex: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___________________").
      
      DADOS DO CASO:
      1. JURISDIÇÃO INFORMADA: ${data.jurisdiction || '(Não informada - Usar placeholder)'}.
      2. TIPO DE AÇÃO INFORMADO: ${data.actionType || '(Não informado - DEDUZIR DO CONTEXTO)'}.
      3. POLO ATIVO: ${plaintiffsText}
      4. POLO PASSIVO: ${defendantsText}
      5. FATOS: ${data.facts}
      6. PEDIDOS: ${data.requests.join('; ')}
      7. PROVAS: ${data.evidence}
      8. VALOR: ${data.value}

      INSTRUÇÕES DE FORMATAÇÃO E ESTILO (PADRÃO WORD/JURÍDICO):
      - Retorne a resposta EXCLUSIVAMENTE em HTML (sem tags de markdown como \`\`\`html).
      - Use a tag <h3> com style="text-align: center; text-transform: uppercase;" para o Endereçamento e para os Títulos das Seções (DOS FATOS, DO DIREITO, etc).
      - Use a tag <p> para todos os parágrafos de texto.
      - Use a tag <b> para negritos (nomes das partes, destaques).
      - NÃO use listas com marcadores (bullet points) para a narrativa. Use texto corrido.
      - O Endereçamento deve ser em CAIXA ALTA e centralizado.
      - A qualificação das partes deve ser um parágrafo único e formal.
      - A estrutura deve ser: ENDEREÇAMENTO -> QUALIFICAÇÃO -> DOS FATOS -> DO DIREITO -> DOS PEDIDOS -> FECHAMENTO.
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

    let text = response.text || "Erro ao gerar conteúdo.";
    // Clean up if the model adds markdown code blocks despite instructions
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    console.warn("Fallback to Mock generation due to API error.");
    return mockGeneration(data) + "<br><br><p><b>[Nota: Gerado em modo offline devido a erro de conexão com a IA]</b></p>";
  }
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
  if (!ai) {
    return mockMetadata(data);
  }

  try {
    const prompt = `
      Analise os dados desta petição e sugira o preenchimento dos metadados para cadastro no sistema de processo eletrônico (PJe / e-SAJ / Projudi) conforme as Tabelas Processuais Unificadas (TPU) do CNJ.
      
      Se a Ação não estiver explícita, deduza pelos fatos.

      Ação/Input: ${data.actionType}
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
      Atue como um advogado sênior revisando uma peça jurídica (HTML).
      
      CONTEÚDO ORIGINAL (HTML):
      ${currentContent}

      SOLICITAÇÃO DE ALTERAÇÃO:
      "${instructions}"

      TAREFA:
      1. Reescreva a petição mantendo a formatação HTML (h3 centralizado, p, b).
      2. Incorpore as alterações solicitadas.
      3. Retorne APENAS o HTML completo.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.3 }
    });

    let text = response.text || currentContent;
    text = text.replace(/```html/g, '').replace(/```/g, '');
    return text;

  } catch (error) {
    console.error("Error refining petition:", error);
    throw new Error("Não foi possível refinar a petição.");
  }
};

// Fallback Mock with HTML
const mockGeneration = (data: PetitionFormData) => {
  const authorNames = data.plaintiffs.map(p => p.name.toUpperCase()).join(', ');
  const defNames = data.defendants.map(d => d.name.toUpperCase()).join(', ');

  return `
<h3 style="text-align: center; text-transform: uppercase;">EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA COMARCA DE ${data.jurisdiction?.toUpperCase() || '...'}</h3>
<br>
<br>
<p><b>${authorNames || 'NOME DO AUTOR'}</b>, qualificados nos autos, vêm, respeitosamente, à presença de Vossa Excelência, propor a presente</p>
<br>
<h3 style="text-align: center; text-transform: uppercase;">${data.actionType?.toUpperCase() || 'AÇÃO'}</h3>
<br>
<p>em face de <b>${defNames || 'NOME DO RÉU'}</b>, pelos fatos e fundamentos a seguir expostos:</p>
<br>
<h3 style="text-align: center; text-transform: uppercase;">I - DOS FATOS</h3>
<p>${data.facts || 'Descreva os fatos aqui...'}</p>
<br>
<h3 style="text-align: center; text-transform: uppercase;">II - DO DIREITO</h3>
<p>(Fundamentação jurídica gerada automaticamente...)</p>
<br>
<h3 style="text-align: center; text-transform: uppercase;">III - DOS PEDIDOS</h3>
<p>Nestes termos,</p>
<p>Pede deferimento.</p>
<br>
<p>${data.jurisdiction || 'Local'}, ${new Date().toLocaleDateString('pt-BR')}.</p>
<br>
<br>
<p>_____________________________</p>
<p>ADVOGADO(A)</p>
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
  return content + `<br><p style="color: red;">[MOCK REFINEMENT: "${instructions}"]</p>`;
};