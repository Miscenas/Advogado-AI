import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata } from "../types";

// NOTE: process.env.API_KEY must be configured in your environment.
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  if (!apiKey) {
    console.warn("API_KEY is missing. Using mock response for demonstration.");
    return mockGeneration(data);
  }

  try {
    const prompt = `
      Atue como um advogado sênior especialista em Direito ${data.area} no Brasil.
      Redija uma petição inicial completa e formal para uma "${data.actionType}".
      
      DADOS DO CASO:
      1. EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA COMARCA DE ${data.jurisdiction}.
      
      2. AUTOR (Qualificação):
         Nome: ${data.plaintiff.name}
         Documento: ${data.plaintiff.doc}
         Qualificação/Endereço: ${data.plaintiff.qualification}, ${data.plaintiff.address}
         
      3. RÉU (Qualificação):
         Nome: ${data.defendant.name}
         Documento: ${data.defendant.doc}
         Qualificação/Endereço: ${data.defendant.qualification}, ${data.defendant.address}
         
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
      - Cite legislação pertinente (Código Civil, CPC, CLT, Constituição, etc.) e doutrina se aplicável.
      - Estruture em: I - DOS FATOS, II - DO DIREITO/FUNDAMENTAÇÃO, III - DOS PEDIDOS.
      - Formate a saída em Markdown limpo (headers, bold, listas).
    `;

    // Using gemini-3-pro-preview for complex reasoning and legal drafting
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.4, // Lower temperature for more formal/consistent output
        topP: 0.8,
        topK: 40,
      }
    });

    return response.text || "Erro ao gerar conteúdo. Tente novamente.";

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Fallback if API fails (e.g., quota exceeded)
    throw new Error("Falha na comunicação com a IA Jurídica. Verifique sua conexão ou tente mais tarde.");
  }
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
  if (!apiKey) {
    return mockMetadata(data);
  }

  try {
    const prompt = `
      Analise os dados desta petição e sugira o preenchimento dos metadados para cadastro no sistema de processo eletrônico (PJe / e-SAJ / Projudi) conforme as Tabelas Processuais Unificadas (TPU) do CNJ.
      
      Ação: ${data.actionType}
      Área: ${data.area}
      Fatos resumidos: ${data.facts}
      
      Retorne a Competência (órgão julgador sugerido), a Classe Judicial e o Assunto Principal.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            competence: { type: Type.STRING, description: "Sugestão de competência/vara (ex: Vara Cível, Juizado Especial)" },
            class: { type: Type.STRING, description: "Classe processual CNJ (ex: Procedimento Comum Cível)" },
            subject: { type: Type.STRING, description: "Assunto principal CNJ (ex: Indenização por Dano Moral)" }
          },
          required: ["competence", "class", "subject"]
        }
      }
    });
    
    // Parse JSON
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
  if (!apiKey) {
    return mockRefinement(currentContent, instructions);
  }

  try {
    const prompt = `
      Atue como um advogado sênior revisando uma peça jurídica.
      
      TEXTO ORIGINAL DA PETIÇÃO:
      ---
      ${currentContent}
      ---

      SOLICITAÇÃO DE ALTERAÇÃO DO ADVOGADO:
      "${instructions}"

      TAREFA:
      1. Reescreva a petição mantendo a estrutura original, mas incorporando as alterações solicitadas.
      2. Mantenha o tom formal e técnico.
      3. Se a solicitação for para adicionar um pedido ou fato, insira-o na seção logicamente correta (Fatos, Direito ou Pedidos).
      4. Retorne APENAS o texto completo da petição atualizada, sem comentários adicionais.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });

    return response.text || currentContent;
  } catch (error) {
    console.error("Error refining petition:", error);
    throw new Error("Não foi possível refinar a petição no momento.");
  }
};

// Fallback Mock for when API Key is not present in demo environment
const mockGeneration = (data: PetitionFormData) => {
  return `
# EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA COMARCA DE ${data.jurisdiction.toUpperCase()}

**${data.plaintiff.name.toUpperCase()}**, inscrito(a) no CPF/CNPJ sob nº ${data.plaintiff.doc}, residente e domiciliado(a) em ${data.plaintiff.address}, vem, respeitosamente, à presença de Vossa Excelência, propor a presente

## ${data.actionType.toUpperCase()}

em face de **${data.defendant.name.toUpperCase()}**, inscrito(a) no CPF/CNPJ sob nº ${data.defendant.doc}, pelos fatos e fundamentos a seguir expostos:

### I - DOS FATOS

${data.facts}

### II - DO DIREITO

A pretensão da parte Autora encontra amparo legal no ordenamento jurídico pátrio...
*(A IA expandiria aqui com fundamentação baseada na área ${data.area})*

### III - DOS PEDIDOS

Diante do exposto, requer a Vossa Excelência:

${data.requests.map(r => `- A procedência do pedido para condenar o Réu a ${r}`).join('\n')}
- A citação do Réu para, querendo, contestar a presente ação;
- A condenação do Réu ao pagamento de custas e honorários advocatícios.

Protesta provar o alegado por todos os meios de prova em direito admitidos, especialmente ${data.evidence}.

Dá-se à causa o valor de ${data.value}.

Nestes termos,
Pede deferimento.

${data.jurisdiction}, ${new Date().toLocaleDateString('pt-BR')}.

_____________________________
ADVOGADO(A)
OAB/UF
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
  return content + `\n\n[ADICIONADO PELA IA (MOCK) - INSTRUÇÃO: "${instructions}"]\n\n(Aqui a IA reescreveria o texto integrando a solicitação de forma orgânica ao documento)`;
};