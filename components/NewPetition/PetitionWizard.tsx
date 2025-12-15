import React, { useState, useRef } from 'react';
import { PetitionFormData, PetitionFilingMetadata } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  User, 
  Scale, 
  Gavel, 
  CheckCircle, 
  Sparkles,
  Save,
  Copy,
  MessageSquare,
  RefreshCw,
  Archive,
  Tags,
  Building2,
  Printer,
  Upload,
  FileCheck,
  Loader2
} from 'lucide-react';
import { generateLegalPetition, refineLegalPetition, suggestFilingMetadata, extractDataFromDocument } from '../../services/aiService';

interface WizardProps {
  userId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { id: 1, title: 'Tipo & Jurisdição', icon: Scale },
  { id: 2, title: 'Partes', icon: User },
  { id: 3, title: 'Fatos', icon: FileText },
  { id: 4, title: 'Pedidos', icon: Gavel },
  { id: 5, title: 'Revisão & IA', icon: Sparkles },
];

const INITIAL_DATA: PetitionFormData = {
  area: 'civel',
  actionType: '',
  jurisdiction: '',
  plaintiff: { name: '', type: 'pf', doc: '', address: '', qualification: '' },
  defendant: { name: '', type: 'pf', doc: '', address: '', qualification: '' },
  facts: '',
  requests: [],
  evidence: 'Documental, testemunhal e pericial',
  value: 'R$ 0,00'
};

export const PetitionWizard: React.FC<WizardProps> = ({ userId, onCancel, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PetitionFormData>(INITIAL_DATA);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [filingSuggestions, setFilingSuggestions] = useState<PetitionFilingMetadata | null>(null);
  
  // Document Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Refinement State
  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  // Helper for text areas
  const handleInputChange = (field: keyof PetitionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePartyChange = (party: 'plaintiff' | 'defendant', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [party]: { ...prev[party], [field]: value }
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setUploadSuccess(false);

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64String = event.target?.result as string;
            // Remove data URL prefix (e.g., "data:application/pdf;base64,")
            const base64Data = base64String.split(',')[1];
            
            const extractedData = await extractDataFromDocument(base64Data, file.type);
            
            // Merge extracted data into form
            setFormData(prev => ({
                ...prev,
                ...extractedData,
                plaintiff: { ...prev.plaintiff, ...extractedData.plaintiff },
                defendant: { ...prev.defendant, ...extractedData.defendant },
            }));
            
            setUploadSuccess(true);
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error(error);
        alert("Erro ao processar o arquivo. Tente preencher manualmente.");
    } finally {
        setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Run generation and metadata suggestion in parallel for efficiency
      const [content, metadata] = await Promise.all([
        generateLegalPetition(formData),
        suggestFilingMetadata(formData)
      ]);
      
      setGeneratedContent(content);
      setFilingSuggestions(metadata);
    } catch (error) {
      alert("Erro na geração. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!generatedContent || !refinementText.trim()) return;
    
    setIsRefining(true);
    try {
      const refinedResult = await refineLegalPetition(generatedContent, refinementText);
      setGeneratedContent(refinedResult);
      setRefinementText(''); // Clear input after success
    } catch (error) {
      alert("Erro ao refinar petição. Tente novamente.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !userId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('petitions').insert([
        {
          user_id: userId,
          area: formData.area,
          action_type: formData.actionType,
          content: generatedContent,
          created_at: new Date().toISOString(),
          plaintiff_name: formData.plaintiff.name,
          defendant_name: formData.defendant.name
        }
      ]).select().single();

      if (error) throw error;
      
      onSuccess();
    } catch (error) {
      console.error('Error saving petition:', error);
      alert('Erro ao salvar petição. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor, permita popups para imprimir.");
        return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Impressão - Advogado AI</title>
          <style>
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt;
              line-height: 1.5;
              padding: 40px;
              color: #000;
            }
            .content {
              white-space: pre-wrap;
            }
            @media print {
              body { padding: 0; margin: 2cm; }
            }
          </style>
        </head>
        <body>
          <div class="content">${generatedContent}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        // Alguns navegadores/usuários preferem que a janela não feche automaticamente
        // printWindow.close(); 
    }, 500);
  };

  const copyToClipboard = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      alert("Copiado!");
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />
        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex flex-col items-center bg-gray-50 px-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive ? 'bg-juris-900 text-white shadow-lg scale-110' : 
                  isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
              </div>
              <span className={`text-xs mt-2 font-medium ${isActive ? 'text-juris-900' : 'text-gray-400'}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             {/* Document Upload Area */}
             <div className="bg-sky-50 border-2 border-dashed border-sky-200 rounded-lg p-6 text-center">
                 <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf, .txt, image/png, image/jpeg"
                 />
                 
                 {isExtracting ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
                        <span className="text-sm font-medium text-sky-700">Lendo documento e extraindo dados...</span>
                    </div>
                 ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="bg-green-100 p-2 rounded-full">
                           <FileCheck className="h-6 w-6 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-green-700">Dados extraídos com sucesso! Revise abaixo.</span>
                        <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="text-xs text-sky-600 underline hover:text-sky-800"
                        >
                           Enviar outro arquivo
                        </button>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-sky-400" />
                        <h3 className="font-semibold text-gray-900">Tem um documento do caso?</h3>
                        <p className="text-sm text-gray-500 max-w-sm">
                           Envie um PDF, Imagem ou Texto. Nossa IA irá ler e preencher as partes e fatos automaticamente.
                        </p>
                        <Button 
                           variant="secondary" 
                           onClick={() => fileInputRef.current?.click()}
                           className="mt-2"
                        >
                           Carregar Arquivo
                        </Button>
                    </div>
                 )}
             </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Área do Direito</label>
                <select 
                  className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-juris-500"
                  value={formData.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                >
                  <option value="civel">Cível</option>
                  <option value="trabalhista">Trabalhista</option>
                  <option value="familia">Família</option>
                  <option value="consumidor">Consumidor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foro / Comarca</label>
                <Input 
                  placeholder="Ex: São Paulo - SP" 
                  value={formData.jurisdiction}
                  onChange={(e) => handleInputChange('jurisdiction', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Ação</label>
              <Input 
                placeholder="Ex: Ação de Indenização por Danos Morais" 
                value={formData.actionType}
                onChange={(e) => handleInputChange('actionType', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Isso definirá a estrutura base da peça jurídica.</p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Plaintiff */}
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-lg font-semibold text-juris-900 mb-4 flex items-center gap-2">
                <User size={18} /> Polo Ativo (Autor)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Nome Completo / Razão Social"
                  placeholder="João da Silva"
                  value={formData.plaintiff.name}
                  onChange={(e) => handlePartyChange('plaintiff', 'name', e.target.value)}
                />
                <Input 
                  label="CPF / CNPJ"
                  placeholder="000.000.000-00"
                  value={formData.plaintiff.doc}
                  onChange={(e) => handlePartyChange('plaintiff', 'doc', e.target.value)}
                />
                <div className="md:col-span-2">
                  <Input 
                    label="Qualificação (Estado civil, profissão)"
                    placeholder="Brasileiro, casado, engenheiro..."
                    value={formData.plaintiff.qualification}
                    onChange={(e) => handlePartyChange('plaintiff', 'qualification', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input 
                    label="Endereço Completo"
                    placeholder="Rua das Flores, 123 - Centro..."
                    value={formData.plaintiff.address}
                    onChange={(e) => handlePartyChange('plaintiff', 'address', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Defendant */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User size={18} /> Polo Passivo (Réu)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Nome Completo / Razão Social"
                  placeholder="Empresa XYZ Ltda"
                  value={formData.defendant.name}
                  onChange={(e) => handlePartyChange('defendant', 'name', e.target.value)}
                />
                <Input 
                  label="CPF / CNPJ"
                  placeholder="00.000.000/0001-00"
                  value={formData.defendant.doc}
                  onChange={(e) => handlePartyChange('defendant', 'doc', e.target.value)}
                />
                <div className="md:col-span-2">
                  <Input 
                    label="Endereço (se conhecido)"
                    value={formData.defendant.address}
                    onChange={(e) => handlePartyChange('defendant', 'address', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-amber-800 mb-4">
              <strong>Dica:</strong> Detalhe os acontecimentos em ordem cronológica. Quanto mais detalhes, melhor a fundamentação que a IA criará.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Narrativa dos Fatos</label>
              <textarea 
                className="w-full h-64 rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-juris-500 text-sm leading-relaxed resize-none"
                placeholder="No dia XX/XX/XXXX, o autor firmou contrato com o réu..."
                value={formData.facts}
                onChange={(e) => handleInputChange('facts', e.target.value)}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pedidos (Liste um por linha)</label>
              <textarea 
                className="w-full h-40 rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-juris-500 text-sm"
                placeholder="1. A condenação ao pagamento de R$ X..."
                value={formData.requests.join('\n')}
                onChange={(e) => handleInputChange('requests', e.target.value.split('\n'))}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor da Causa</label>
                <Input 
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provas a Produzir</label>
                <Input 
                  value={formData.evidence}
                  onChange={(e) => handleInputChange('evidence', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        if (generatedContent) {
          return (
            <div className="animate-in fade-in zoom-in-95 duration-300 h-full flex flex-col gap-4">
               {/* Header & Actions */}
               <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200 gap-3">
                  <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" /> Petição Gerada
                  </h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                     <Button variant="outline" onClick={() => copyToClipboard(generatedContent)} className="gap-2 bg-white flex-1 sm:flex-none">
                        <Copy size={16} /> <span className="hidden sm:inline">Copiar</span>
                     </Button>
                     <Button variant="outline" onClick={handlePrint} className="gap-2 bg-white flex-1 sm:flex-none">
                        <Printer size={16} /> <span className="hidden sm:inline">Imprimir</span>
                     </Button>
                     <Button onClick={handleSave} className="gap-2 flex-1 sm:flex-none" isLoading={isSaving}>
                        <Save size={16} /> <span className="hidden sm:inline">Salvar</span>
                     </Button>
                  </div>
               </div>
               
               {/* Content Area */}
               <div 
                id="petition-content" 
                className="flex-1 h-[60vh] bg-white border border-gray-300 rounded-lg p-8 shadow-sm overflow-y-auto font-serif leading-relaxed text-gray-800 whitespace-pre-wrap"
               >
                  {generatedContent}
               </div>

               {/* Filing Metadata Suggestions (Horizontal Bar) */}
               {filingSuggestions && (
                 <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                       <Archive size={14} /> Sugestão para Protocolo / Cadastro (CNJ)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="flex flex-col gap-1">
                          <span className="text-xs text-indigo-500 font-medium flex items-center gap-1">
                             <Building2 size={12} /> Competência
                          </span>
                          <div className="flex items-center justify-between bg-white rounded border border-indigo-200 px-3 py-2">
                             <span className="text-sm font-semibold text-gray-800 truncate" title={filingSuggestions.competence}>
                                {filingSuggestions.competence}
                             </span>
                             <button onClick={() => copyToClipboard(filingSuggestions.competence)} className="text-indigo-300 hover:text-indigo-600">
                                <Copy size={12} />
                             </button>
                          </div>
                       </div>

                       <div className="flex flex-col gap-1">
                          <span className="text-xs text-indigo-500 font-medium flex items-center gap-1">
                             <Archive size={12} /> Classe Judicial
                          </span>
                          <div className="flex items-center justify-between bg-white rounded border border-indigo-200 px-3 py-2">
                             <span className="text-sm font-semibold text-gray-800 truncate" title={filingSuggestions.class}>
                                {filingSuggestions.class}
                             </span>
                             <button onClick={() => copyToClipboard(filingSuggestions.class)} className="text-indigo-300 hover:text-indigo-600">
                                <Copy size={12} />
                             </button>
                          </div>
                       </div>

                       <div className="flex flex-col gap-1">
                          <span className="text-xs text-indigo-500 font-medium flex items-center gap-1">
                             <Tags size={12} /> Assunto Principal
                          </span>
                          <div className="flex items-center justify-between bg-white rounded border border-indigo-200 px-3 py-2">
                             <span className="text-sm font-semibold text-gray-800 truncate" title={filingSuggestions.subject}>
                                {filingSuggestions.subject}
                             </span>
                             <button onClick={() => copyToClipboard(filingSuggestions.subject)} className="text-indigo-300 hover:text-indigo-600">
                                <Copy size={12} />
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {/* Refinement Panel */}
               <div className="bg-sky-50 p-4 rounded-lg border border-sky-100 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-juris-900 flex items-center gap-2 text-sm">
                           <Sparkles size={16} />
                           Refinar com Inteligência Artificial
                        </h3>
                        <p className="text-xs text-juris-600 hidden sm:block">
                           Descreva alterações para reescrever a peça
                        </p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <textarea
                           className="flex-1 rounded-md border border-sky-200 p-3 text-sm focus:ring-2 focus:ring-juris-500 resize-none h-20 bg-white"
                           placeholder="Ex: Adicione um pedido de tutela de urgência para retirada do nome do SPC/Serasa..."
                           value={refinementText}
                           onChange={(e) => setRefinementText(e.target.value)}
                        />
                        <Button 
                           onClick={handleRefine} 
                           disabled={!refinementText.trim() || isRefining}
                           isLoading={isRefining}
                           className="h-20 md:w-48 gap-2 bg-sky-600 hover:bg-sky-700 border-transparent text-white whitespace-nowrap"
                        >
                           <RefreshCw size={16} className={isRefining ? "animate-spin" : ""} />
                           {isRefining ? 'Reescrevendo...' : 'Atualizar'}
                        </Button>
                    </div>
                  </div>
               </div>
            </div>
          );
        }

        return (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
            {isGenerating ? (
              <>
                 <div className="relative mb-6">
                    <div className="absolute inset-0 bg-sky-200 rounded-full animate-ping opacity-25"></div>
                    <div className="relative bg-white p-4 rounded-full border-2 border-sky-100 shadow-xl">
                       <Sparkles className="h-10 w-10 text-juris-500 animate-pulse" />
                    </div>
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">A Inteligência Artificial está trabalhando</h3>
                 <p className="text-gray-500 max-w-md">
                   Analisando os fatos, pesquisando jurisprudência atualizada e redigindo sua petição com base no Direito {formData.area === 'civel' ? 'Cível' : 'Trabalhista'}...
                 </p>
              </>
            ) : (
              <>
                <div className="bg-juris-50 p-6 rounded-full mb-6">
                   <Scale className="h-12 w-12 text-juris-800" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Tudo pronto para gerar</h3>
                <p className="text-gray-500 max-w-md mb-8">
                  Revisamos suas informações. Clique abaixo para que a IA elabore a minuta inicial da sua petição de <strong>{formData.actionType}</strong>.
                </p>
                <Button size="lg" onClick={handleGenerate} className="shadow-xl shadow-sky-900/20 text-lg px-8 h-14">
                  <Sparkles className="mr-2 h-5 w-5" /> Gerar Petição Agora
                </Button>
              </>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`max-w-4xl mx-auto ${currentStep === 5 && generatedContent ? 'max-w-6xl' : ''} transition-all duration-500`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nova Petição</h1>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-8 flex-1">
          {renderStepIndicator()}
          
          <div className={currentStep === 5 && generatedContent ? "h-auto" : "min-h-[400px]"}>
            {renderStepContent()}
          </div>
        </div>

        {/* Footer Navigation - Hide on Step 5 Result View to avoid clutter */}
        {(!generatedContent || currentStep !== 5) && (
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1 || isGenerating}
              className={currentStep === 1 ? 'invisible' : ''}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>

            <Button 
              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
              disabled={isGenerating}
            >
              Próximo <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};