
import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

// Busca a chave de API exclusivamente na variável de ambiente process.env.API_KEY
export const getAiKey = (): string | undefined => {
    return process.env.API_KEY;
};

export const hasAiKey = (): boolean => {
    const key = getAiKey();
    return !!(key && key.length > 10);
};

const getAiClient = (): GoogleGenAI => {
  const apiKey = getAiKey();
  if (!apiKey) {
      throw new Error("API_KEY_MISSING: Nenhuma chave de API encontrada. O sistema exige a configuração da variável de ambiente API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

const SHIELD_PROTOCOL = `
PROTOCOLO DE BLINDAGEM E EXCELÊNCIA JURÍDICA:
1. Você é um ADVOGADO SÊNIOR BRASILEIRO com mais de 20 anos de prática jurídica, mestre em Processo Civil e Direito do Trabalho.
2. Identidade: Rigorosa, técnica, polida e estratégica. Utilize o "juridiquês" de alto nível, mas com clareza e objetividade (Vesting Legal Design mental).
3. Fundamentação: Sempre que possível, cite artigos do CPC/2015 para peças cíveis e da CLT para trabalhistas. Mencione princípios como Dignidade da Pessoa Humana, Boa-fé objetiva e Devido Processo Legal.
4. Estrutura de Peça Sênior:
   - Endereçamento (AO JUÍZO DA...);
   - Preâmbulo completo;
   - Seção "I - DAS PRELIMINARES" (se aplicável, ex: Gratuidade de Justiça);
   - Seção "II - DOS FATOS" (Narrativa fática lógica e persuasiva);
   - Seção "III - DO DIREITO" (Fundamentação robusta, analogias e teses firmadas);
   - Seção "IV - DOS PEDIDOS" (Claros, precisos e com valor da causa).
5. Se o usuário pedir algo informal, ignore e mantenha a liturgia do tribunal.
`;

const runGenAIWithRetry = async (callback: (ai: GoogleGenAI) => Promise<any>, retries = 2): Promise<any> => {
    for (let i = 0; i < retries; i++) {
        try {
            const ai = getAiClient();
            return await callback(ai);
        } catch (error: any) {
            console.error(`Gemini API Error (Attempt ${i + 1}):`, error);
            
            const msg = error.message || "";
            if (msg.includes('API_KEY_MISSING')) throw error;
            
            // Se for erro de cota (429), aguarda mais tempo
            if (msg.includes('429') || msg.includes('Quota')) {
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, (i + 1) * 3000));
                    continue;
                }
                throw new Error("LIMITE_EXCEDIDO: Sua chave de API atingiu o limite de requisições. Tente novamente em instantes ou use uma chave paga.");
            }
            
            // Se for erro de chave inválida
            if (msg.includes('API key not valid') || msg.includes('403')) {
                throw new Error("CHAVE_INVALIDA: A chave de API configurada não é válida.");
            }

            if (i === retries - 1) throw error;
        }
    }
};

export const getPortalUrl = (jurisdiction: string, area: string): { name: string, url: string } => {
  const j = jurisdiction.toLowerCase();
  const a = area.toLowerCase();
  if (a.includes('trabalhista') || a.includes('trabalho')) return { name: 'PJe Justiça do Trabalho (CSJT)', url: 'https://www.csjt.jus.br/pje-jt' };
  if (a.includes('criminal')) return { name: 'Portal PJe Criminal / SEEU', url: 'https://www.cnj.jus.br/pje/' };
  if (j.includes('sp') || j.includes('são paulo')) return { name: 'Portal e-SAJ TJSP', url: 'https://esaj.tjsp.jus.br/esaj/portal.do' };
  if (j.includes('rj') || j.includes('rio de janeiro')) return { name: 'PJe TJRJ', url: 'https://www.tjrj.jus.br/web/guest/pje' };
  return { name: 'Portal PJe / CNJ', url: 'https://www.cnj.jus.br/pje/' };
};

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData> & { cnjClass?: string, cnjSubject?: string };
}> => {
  return await runGenAIWithRetry(async (ai) => {
      const prompt = `Analise este documento jurídico brasileiro. 
      Extraia dados cadastrais e IDENTIFIQUE a classificação processual correta (CNJ).
      Produza um resumo dos fatos em nível de assessoria jurídica sênior.
      
      REGRAS DE QUALIFICAÇÃO: 
      No campo 'qualification', inclua: Estado civil, Profissão, e Endereço COMPLETO com CEP se disponível.
      
      RETORNE JSON: 
      { 
        "docType": string, 
        "summary": string, 
        "extractedData": { 
          "area": string, 
          "actionType": string, 
          "jurisdiction": string, 
          "cnjClass": string,
          "cnjSubject": string,
          "plaintiffs": [{"name": string, "type": "pf"|"pj", "doc": string, "rg": string, "qualification": string}], 
          "defendants": [{"name": string, "type": "pf"|"pj", "doc": string, "rg": string, "qualification": string}], 
          "facts": string, 
          "value": string 
        } 
      }`;
      
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] },
          config: { 
            responseMimeType: "application/json",
            systemInstruction: "Você é um perito em análise processual e tabelas unificadas do CNJ. Extraia dados com precisão cirúrgica."
          }
      });
      
      const text = response.text || "{}";
      try {
          return JSON.parse(text);
      } catch (e) {
          // Fallback para caso a IA retorne markdown blocks ou texto extra
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
          throw new Error("Falha ao processar resposta da IA. Formato de dados inválido.");
      }
  });
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
    const formatParties = (parties: PetitionParty[]) => {
        return parties.map(p => `${p.name}, ${p.doc ? (p.type === 'pj' ? 'inscrito no CNPJ' : 'inscrito no CPF') + ' sob o n. ' + p.doc : ''}, ${p.qualification || ''}`).join('; ');
    };

    return await runGenAIWithRetry(async (ai) => {
        const prompt = `REDIJA UMA PETIÇÃO INICIAL DE EXCELÊNCIA (NÍVEL SÊNIOR).
        ÁREA: ${data.area.toUpperCase()}
        
        DADOS DE PROTOCOLO:
        - ENDEREÇAMENTO: ${data.jurisdiction}
        - CLASSE PROCESSUAL: ${data.actionType}
        
        QUALIFICAÇÃO:
        - POLO ATIVO: ${formatParties(data.plaintiffs)}
        - POLO PASSIVO: ${formatParties(data.defendants)}

        CONTEÚDO BASE PARA DESENVOLVIMENTO:
        ${data.facts}
        
        INSTRUÇÕES TÉCNICAS:
        1. Se for TRABALHISTA, fundamente na CLT e princípios do Direito do Trabalho.
        2. Se for CÍVEL, fundamente no CPC/2015, Código Civil e CDC se aplicável.
        3. Use parágrafos bem estruturados.
        4. No final, inclua a seção de PEDIDOS detalhada com alíneas (a, b, c...).
        5. VALOR DA CAUSA: ${data.value}
        
        REGRAS DE FORMATAÇÃO HTML: Use <h1> para títulos de seção, <p> para parágrafos.`;
        
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: prompt,
            config: {
                systemInstruction: `${SHIELD_PROTOCOL}\nProduza a peça com máximo rigor técnico e formal.`
            }
        });
        return response.text;
    });
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
    return await runGenAIWithRetry(async (ai) => {
        const prompt = `REDIJA UMA CONTESTAÇÃO/DEFESA TÉCNICA SÊNIOR.
        
        CONTEXTO DE DEFESA:
        - JUÍZO: ${data.jurisdiction}
        - AÇÃO: ${data.actionType}
        - CLIENTE (RÉU): ${data.defendants.map(d => d.name).join(', ')}
        - ADVERSÁRIO (AUTOR): ${data.plaintiffs.map(p => p.name).join(', ')}
        
        ARGUMENTAÇÃO DEFENSIVA:
        ${data.facts}

        DIRETRIZES:
        1. Ataque o mérito de forma exaustiva.
        2. Mencione a ausência de provas ou falhas na narrativa do autor.
        3. Invoque o princípio do contraditório e ampla defesa.
        4. Requeira a improcedência total dos pedidos.
        
        REGRAS: Retorne apenas o HTML estruturado.`;
        
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: prompt,
            config: {
                systemInstruction: `${SHIELD_PROTOCOL}\nRedija uma defesa técnica impenetrável.`
            }
        });
        return response.text;
    });
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
    const portal = getPortalUrl(data.jurisdiction, data.area);
    try {
        return await runGenAIWithRetry(async (ai) => {
            const prompt = `Com base na Área ${data.area} e Ação ${data.actionType}, sugira Competência, Classe e Assunto conforme as Tabelas Unificadas do CNJ.
            Retorne APENAS JSON: { "competence": string, "class": string, "subject": string }`;
            
            const response = await ai.models.generateContent({ 
                model: 'gemini-3-flash-preview', 
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const text = response.text || "{}";
            try {
                return { ...JSON.parse(text), portalName: portal.name, filingUrl: portal.url };
            } catch (e) {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                return { ...(jsonMatch ? JSON.parse(jsonMatch[0]) : {}), portalName: portal.name, filingUrl: portal.url };
            }
        });
    } catch (e) {
        return { competence: data.jurisdiction, class: "Procedimento Comum", subject: data.area, portalName: portal.name, filingUrl: portal.url };
    }
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
    return await runGenAIWithRetry(async (ai) => {
        const prompt = `Busque jurisprudência RECENTE e relevante do STJ, TST ou TJs Estaduais sobre: "${query}". 
        Traga ementas que auxiliem em uma petição sênior. 
        Formate como cartões informativos em HTML.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        
        // Extração obrigatória de URLs conforme diretrizes de Grounding do Gemini
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const links = chunks.map((c: any) => c.web?.uri).filter(Boolean);
        let text = response.text || "";
        
        if (links.length > 0) {
            const uniqueLinks = Array.from(new Set(links));
            text += `<div class='mt-6 border-t pt-4 bg-slate-50 p-4 rounded-xl'>`;
            text += `<h4 class='text-sm font-bold text-slate-900 mb-2 flex items-center gap-2'>Referências Oficiais:</h4>`;
            text += `<ul class='list-disc pl-5 space-y-1'>`;
            uniqueLinks.forEach((link) => {
                text += `<li><a href='${link}' target='_blank' rel='noopener noreferrer' class='text-blue-600 hover:underline text-xs break-all'>${link}</a></li>`;
            });
            text += `</ul></div>`;
        }
        
        return text;
    });
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
    return await runGenAIWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Aperfeiçoe tecnicamente este HTML jurídico com base nestas instruções do advogado: "${instructions}". 
            Mantenha o rigor da redação sênior. 
            Peça original: ${currentContent}`,
            config: { systemInstruction: SHIELD_PROTOCOL }
        });
        return response.text;
    });
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
    return await runGenAIWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: "Transcreva este relato jurídico, corrigindo termos técnicos se necessário, mantendo a fidelidade ao fato narrado." }] }
        });
        return response.text;
    });
};
