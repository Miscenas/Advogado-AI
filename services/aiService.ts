import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

// Helper to safely get the API Key without crashing if process is undefined (Browser/Vite)
const getApiKey = (): string => {
  try {
    // Check if process.env exists (Node/Webpack/Some Vite setups)
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore reference errors
  }
  return '';
};

// Initialize AI client with safe key access
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
      summary: "Falha ao processar o documento. Verifique a chave de API.",
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

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  const formatParty = (p: PetitionParty) => `Nome: ${p.name}, Doc: ${p.doc}, Endereço: ${p.address}, Qualificação: ${p.qualification}`;
  const plaintiffsText = data.plaintiffs.map((p, i) => `AUTOR ${i+1}: ${formatParty(p)}`).join('\n');
  const defendantsText = data.defendants.map((d, i) => `RÉU ${i+1}: ${formatParty(d)}`).join('\n');

  try {
    const prompt = `
      ATUE COMO UM JURISTA SÊNIOR DE ELITE (20+ ANOS DE EXPERIÊNCIA EM DIREITO BRASILEIRO).
      OBJETIVO: Criar uma Petição Inicial IMPECÁVEL, ROBUSTA, ARGUMENTATIVA e DETALHADA, independentemente da área (Cível, Trabalhista, Família, Consumidor, etc).

      PROTOCOLO DE EXPANSÃO NARRATIVA E JURÍDICA:
      O usuário fornecerá apenas os fatos brutos. Você NÃO DEVE apenas repetir esses dados. Você deve transformá-los em uma peça jurídica completa, como se tivesse entrevistado o cliente por horas, preenchendo as lacunas lógicas com argumentação jurídica padrão e narrativa persuasiva.

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

      ESTRUTURA OBRIGATÓRIA (FORMATO HTML PARA WORD):
      - Endereçamento (CAIXA ALTA, CENTRALIZADO).
      - Qualificação Completa (Parágrafo único).
      - Títulos das Seções (H3, CENTRALIZADO, UPPERCASE).
         I. DOS FATOS (Narrativa expandida e detalhada em tópicos).
         II. DO DIREITO (Argumentação robusta com artigos de lei e jurisprudência mencionada).
         III. DA TUTELA DE URGÊNCIA (Se aplicável aos fatos, crie este tópico citando Art. 300 CPC).
         IV. DA GRATUIDADE DA JUSTIÇA (Sempre inclua preliminarmente, citando Art. 98 CPC, salvo se for PJ grande).
         V. DOS PEDIDOS (Lista numerada detalhada).
      - Fechamento (Local, Data, Advogado).

      ESTILO DE REDAÇÃO:
      Use "Vossa Excelência", "Douto Magistrado". Texto justificado (<p>).
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
    return mockGeneration(data) + "<br><br><p style='color:red; text-align:center;'><b>[Erro: Falha na conexão com a IA. Verifique sua chave de API.]</b></p>";
  }
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
  const formatParty = (p: PetitionParty) => `Nome: ${p.name}, Doc: ${p.doc}`;
  const plaintiffsText = data.plaintiffs.map((p, i) => `AUTOR (Adverso): ${formatParty(p)}`).join('\n');
  const defendantsText = data.defendants.map((d, i) => `RÉU (Meu Cliente): ${formatParty(d)}`).join('\n');

  let documentContext = "";
  if (data.analyzedDocuments && data.analyzedDocuments.length > 0) {
      documentContext = `
      RESUMO/CONTEÚDO DA PEÇA A SER CONTESTADA (Extraído do Upload): 
      ${data.analyzedDocuments[0].summary}
      (Considere que este é o documento base que devemos atacar/contestar).
      `;
  }

  try {
    const prompt = `
      ATUE COMO UM ADVOGADO DE DEFESA BRILHANTE E COMBATIVO.
      OBJETIVO: Criar uma CONTESTAÇÃO (ou Recurso, dependendo do contexto) robusta e técnica.

      CENÁRIO:
      Você recebeu informações sobre um processo movido contra seu cliente.
      Sua tarefa é desconstruir os argumentos da parte autora ou da sentença.

      DADOS DO PROCESSO:
      - ÁREA: ${data.area}
      - AÇÃO ORIGINÁRIA: ${data.actionType}
      - JUÍZO: ${data.jurisdiction}
      - PARTE CONTRÁRIA (AUTOR): ${plaintiffsText}
      - MEU CLIENTE (RÉU): ${defendantsText}
      
      ${documentContext}

      TESE DE DEFESA / PONTOS A REBATER (Fornecidos pelo Advogado):
      ${data.facts} (AQUI ESTÃO OS ARGUMENTOS DE DEFESA E A VERSÃO DO RÉU)
      
      PEDIDOS DA DEFESA: ${data.requests.join('; ')}

      DIRETRIZES ESTRUTURAIS (FORMATO HTML):
      1. ENDEREÇAMENTO: Ao Juízo competente.
      2. PRELIMINARES DE MÉRITO (CRUCIAL):
         - Analise se cabe: Inépcia da Inicial, Ilegitimidade de Parte, Prescrição, Decadência, Falta de Interesse de Agir.
         - Se a "Tese de Defesa" citar algo processual, crie um tópico de preliminar forte.
      3. SÍNTESE DA DEMANDA: Breve resumo do que o autor alegou (em tom crítico).
      4. DA REALIDADE DOS FATOS (MÉRITO): Apresente a versão do Réu de forma persuasiva.
      5. DO DIREITO:
         - Rebata ponto a ponto.
         - Use o princípio da "Impugnação Específica" (Art. 341 CPC).
         - Cite jurisprudência favorável ao Réu.
      6. DOS PEDIDOS:
         - Improcedência total da ação.
         - Condenação em sucumbência.
         - Provas a produzir.

      ESTILO:
      Formal, técnico, porém agressivo na defesa de direitos. Use HTML para formatação (h3, p, b).
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
      3. Mantenha o tom formal e jurídico avançado.
      4. Retorne APENAS o HTML completo.
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
    console.error("Error refining petition:", error);
    throw new Error("Não foi possível refinar a petição. Verifique a chave de API.");
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
