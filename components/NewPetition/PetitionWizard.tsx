import React, { useState, useRef } from 'react';
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from '../../types';
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
  RefreshCw,
  Archive,
  Tags,
  Building2,
  Printer,
  Upload,
  FileCheck,
  Loader2,
  Trash2,
  Plus,
  FileBadge,
  PenTool,
  FileUp,
  CalendarClock,
  X
} from 'lucide-react';
import { generateLegalPetition, refineLegalPetition, suggestFilingMetadata, extractDataFromDocument } from '../../services/aiService';

interface WizardProps {
  userId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

type WizardMode = 'selection' | 'scratch' | 'upload';

const INITIAL_PARTY: PetitionParty = {
  id: '1',
  name: '', type: 'pf', doc: '', address: '', qualification: ''
};

const INITIAL_DATA: PetitionFormData = {
  area: 'civel',
  actionType: '',
  jurisdiction: '',
  plaintiffs: [{...INITIAL_PARTY, id: 'p1'}],
  defendants: [{...INITIAL_PARTY, id: 'd1'}],
  facts: '',
  requests: [],
  evidence: 'Documental, testemunhal e pericial',
  value: 'R$ 0,00',
  analyzedDocuments: []
};

export const PetitionWizard: React.FC<WizardProps> = ({ userId, onCancel, onSuccess }) => {
  const [mode, setMode] = useState<WizardMode>('selection');
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

  // Deadline Modal State
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);

  // Define Steps based on Mode
  const getSteps = () => {
    if (mode === 'upload') {
      return [
        { id: 1, title: 'Upload & Análise', icon: Upload },
        { id: 2, title: 'Revisão Partes', icon: User },
        { id: 3, title: 'Revisão Fatos', icon: FileText },
        { id: 4, title: 'Pedidos', icon: Gavel },
        { id: 5, title: 'Gerar Petição', icon: Sparkles },
      ];
    }
    return [
      { id: 1, title: 'Dados Iniciais', icon: Scale },
      { id: 2, title: 'Partes', icon: User },
      { id: 3, title: 'Fatos', icon: FileText },
      { id: 4, title: 'Pedidos', icon: Gavel },
      { id: 5, title: 'Gerar Petição', icon: Sparkles },
    ];
  };

  const STEPS = getSteps();
  
  // Helpers
  const handleInputChange = (field: keyof PetitionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Multiple Parties Logic
  const updateParty = (type: 'plaintiffs' | 'defendants', id: string, field: keyof PetitionParty, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const addParty = (type: 'plaintiffs' | 'defendants') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { ...INITIAL_PARTY, id: Math.random().toString(36).substr(2, 9) }]
    }));
  };

  const removeParty = (type: 'plaintiffs' | 'defendants', id: string) => {
    setFormData(prev => {
      if (prev[type].length <= 1) return prev;
      return {
        ...prev,
        [type]: prev[type].filter(p => p.id !== id)
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // VALIDATION: Max size 10MB
    if (file.size > 10 * 1024 * 1024) {
        alert("O arquivo é muito grande. O limite máximo para análise é 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setIsExtracting(true);
    setUploadSuccess(false);

    try {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            const base64String = event.target?.result as string;
            const base64Data = base64String.split(',')[1];
            
            // Call AI
            const analysis = await extractDataFromDocument(base64Data, file.type);
            
            setFormData(prev => {
              const newPlaintiffs = analysis.extractedData.plaintiffs?.map((p: any) => ({...p, id: Math.random().toString()})) || [];
              const newDefendants = analysis.extractedData.defendants?.map((p: any) => ({...p, id: Math.random().toString()})) || [];

              return {
                ...prev,
                area: prev.area === 'civel' && analysis.extractedData.area ? analysis.extractedData.area : prev.area,
                actionType: analysis.extractedData.actionType || prev.actionType,
                jurisdiction: analysis.extractedData.jurisdiction || prev.jurisdiction,
                facts: (prev.facts ? prev.facts + "\n\n" : "") + (analysis.extractedData.facts || ""),
                plaintiffs: newPlaintiffs.length > 0 ? newPlaintiffs : prev.plaintiffs,
                defendants: newDefendants.length > 0 ? newDefendants : prev.defendants,
                value: analysis.extractedData.value || prev.value,
                analyzedDocuments: [
                  ...(prev.analyzedDocuments || []),
                  {
                    id: Math.random().toString(),
                    fileName: file.name,
                    docType: analysis.docType || 'Desconhecido',
                    summary: analysis.summary
                  }
                ]
              };
            });
            setIsExtracting(false);
            setUploadSuccess(true);
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error(error);
        alert("Erro ao processar o arquivo.");
        setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
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
      setRefinementText('');
    } catch (error) {
      alert("Erro ao refinar petição.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !userId) return;

    setIsSaving(true);
    try {
      const pName = formData.plaintiffs.map(p => p.name).join(', ');
      const dName = formData.defendants.map(d => d.name).join(', ');

      const { error } = await supabase.from('petitions').insert([
        {
          user_id: userId,
          area: formData.area,
          action_type: formData.actionType,
          content: generatedContent,
          created_at: new Date().toISOString(),
          plaintiff_name: pName,
          defendant_name: dName
        }
      ]).select().single();

      if (error) throw error;
      
      // Ao invés de sucesso imediato, abrir modal de prazo
      setShowDeadlineModal(true);
      
    } catch (error) {
      console.error('Error saving petition:', error);
      alert('Erro ao salvar petição.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDeadlineAndFinish = async () => {
     if (!deadlineDate) return;
     setIsSavingDeadline(true);
     try {
         // Added .select().single() to ensure compatibility with Mock Client execution logic
         const { error } = await supabase.from('deadlines').insert([{
             user_id: userId,
             title: `Prazo: ${formData.actionType || 'Petição Sem Título'}`,
             due_date: deadlineDate,
             status: 'pending',
             created_at: new Date().toISOString()
         }]).select().single();

         if (error) throw error;
         onSuccess(); // Finish wizard
     } catch (error) {
         console.error(error);
         alert("Erro ao salvar prazo, mas a petição foi salva.");
         onSuccess(); // Finish anyway
     } finally {
         setIsSavingDeadline(false);
     }
  };

  const handleSkipDeadline = () => {
      onSuccess();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Impressão</title><style>body{font-family:'Times New Roman';font-size:12pt;padding:40px;}</style></head><body><div style="white-space:pre-wrap">${generatedContent}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // --- Render Selection Screen (Step 0) ---
  if (mode === 'selection') {
      return (
          <div className="max-w-4xl mx-auto py-8">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Iniciar Nova Petição</h1>
                <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    onClick={() => setMode('scratch')}
                    className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-juris-500 hover:shadow-md transition-all group text-center h-64"
                  >
                      <div className="w-16 h-16 bg-juris-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-juris-100 transition-colors">
                          <PenTool size={32} className="text-juris-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Petição do Zero</h3>
                      <p className="text-gray-500 text-sm max-w-xs">
                          Preencha o formulário guiado manualmente e deixe a IA redigir a peça jurídica para você.
                      </p>
                  </button>

                  <button 
                    onClick={() => setMode('upload')}
                    className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-sky-500 hover:shadow-md transition-all group text-center h-64"
                  >
                      <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-sky-100 transition-colors">
                          <FileUp size={32} className="text-sky-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Upload & Revisão</h3>
                      <p className="text-gray-500 text-sm max-w-xs">
                          Envie um documento (PDF/IMG/TXT) para a IA extrair os dados, classificar e gerar a petição.
                      </p>
                  </button>
              </div>
          </div>
      );
  }

  // --- Render Wizard Steps ---

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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-juris-900 text-white shadow-lg scale-110' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
              </div>
              <span className={`text-xs mt-2 font-medium ${isActive ? 'text-juris-900' : 'text-gray-400'}`}>{step.title}</span>
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
             {/* Show Upload ONLY if mode is 'upload' */}
             {mode === 'upload' && (
                 <>
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
                                <span className="text-sm font-medium text-sky-700">A IA está analisando e classificando seu documento...</span>
                            </div>
                        ) : uploadSuccess ? (
                            <div className="flex flex-col items-center gap-2 animate-in fade-in">
                                <div className="bg-green-100 p-2 rounded-full">
                                    <FileCheck className="h-6 w-6 text-green-600" />
                                </div>
                                <span className="text-sm font-medium text-green-700">Dados extraídos com sucesso! Revise abaixo.</span>
                                <button onClick={() => fileInputRef.current?.click()} className="text-xs text-sky-600 underline">Substituir arquivo</button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="h-8 w-8 text-sky-400" />
                                <h3 className="font-semibold text-gray-900">Upload de Documento Base</h3>
                                <p className="text-sm text-gray-500 max-w-sm">
                                Envie petições iniciais, procurações, RGs ou contratos (Max 10MB).
                                </p>
                                <Button 
                                variant="secondary" 
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2"
                                >
                                Selecionar Arquivo
                                </Button>
                            </div>
                        )}
                    </div>
                    {/* Analyzed Documents List */}
                    {formData.analyzedDocuments && formData.analyzedDocuments.length > 0 && (
                        <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Documentos Analisados</h4>
                        {formData.analyzedDocuments.map((doc, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <div className="bg-green-100 p-2 rounded-md text-green-700">
                                    <FileBadge size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                                    <p className="text-xs font-bold text-juris-700 bg-juris-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                    Tipo Identificado: {doc.docType}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 italic">{doc.summary}</p>
                                </div>
                            </div>
                        ))}
                        </div>
                    )}
                 </>
             )}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${mode === 'upload' ? 'pt-4 border-t border-gray-100' : ''}`}>
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
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
             {mode === 'upload' && (
                <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-sm text-amber-800 flex items-center gap-2 mb-4">
                    <CheckCircle size={16} />
                    Confira se os dados das partes foram extraídos corretamente do documento.
                </div>
             )}

            {/* Plaintiffs Section */}
            <div className="space-y-4">
               <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-semibold text-juris-900 flex items-center gap-2">
                    <User size={18} /> Polo Ativo (Autores)
                  </h3>
                  <Button size="sm" variant="secondary" onClick={() => addParty('plaintiffs')} className="gap-1">
                    <Plus size={14} /> Adicionar Autor
                  </Button>
               </div>
               
               {formData.plaintiffs.map((party, index) => (
                 <div key={party.id || index} className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 relative">
                    {formData.plaintiffs.length > 1 && (
                      <button 
                        onClick={() => removeParty('plaintiffs', party.id!)}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <span className="text-xs font-bold text-blue-300 absolute -top-2 left-2 bg-white px-2 border border-blue-100 rounded">Autor {index + 1}</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Input 
                          label="Nome Completo"
                          value={party.name}
                          onChange={(e) => updateParty('plaintiffs', party.id!, 'name', e.target.value)}
                        />
                        <Input 
                          label="CPF / CNPJ"
                          value={party.doc}
                          onChange={(e) => updateParty('plaintiffs', party.id!, 'doc', e.target.value)}
                        />
                        <div className="md:col-span-2">
                          <Input 
                            label="Qualificação"
                            placeholder="Nacionalidade, estado civil, profissão"
                            value={party.qualification}
                            onChange={(e) => updateParty('plaintiffs', party.id!, 'qualification', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Input 
                            label="Endereço"
                            value={party.address}
                            onChange={(e) => updateParty('plaintiffs', party.id!, 'address', e.target.value)}
                          />
                        </div>
                    </div>
                 </div>
               ))}
            </div>

            {/* Defendants Section */}
            <div className="space-y-4 pt-4">
               <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <User size={18} /> Polo Passivo (Réus)
                  </h3>
                  <Button size="sm" variant="secondary" onClick={() => addParty('defendants')} className="gap-1">
                    <Plus size={14} /> Adicionar Réu
                  </Button>
               </div>
               
               {formData.defendants.map((party, index) => (
                 <div key={party.id || index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                    {formData.defendants.length > 1 && (
                      <button 
                        onClick={() => removeParty('defendants', party.id!)}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <span className="text-xs font-bold text-gray-400 absolute -top-2 left-2 bg-white px-2 border border-gray-200 rounded">Réu {index + 1}</span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Input 
                          label="Nome / Razão Social"
                          value={party.name}
                          onChange={(e) => updateParty('defendants', party.id!, 'name', e.target.value)}
                        />
                        <Input 
                          label="CPF / CNPJ"
                          value={party.doc}
                          onChange={(e) => updateParty('defendants', party.id!, 'doc', e.target.value)}
                        />
                        <div className="md:col-span-2">
                          <Input 
                            label="Endereço"
                            value={party.address}
                            onChange={(e) => updateParty('defendants', party.id!, 'address', e.target.value)}
                          />
                        </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
             {mode === 'upload' && (
                <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-sm text-amber-800 flex items-center gap-2 mb-4">
                    <CheckCircle size={16} />
                    O resumo dos fatos foi gerado pela IA com base no documento. Edite se necessário.
                </div>
             )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Narrativa dos Fatos</label>
              <textarea 
                className="w-full h-64 rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-juris-500 text-sm leading-relaxed resize-none"
                placeholder="No dia XX/XX/XXXX..."
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
                     <Button variant="outline" onClick={() => navigator.clipboard.writeText(generatedContent!)} className="gap-2 bg-white flex-1 sm:flex-none">
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
               
               <div className="flex-1 h-[60vh] bg-white border border-gray-300 rounded-lg p-8 shadow-sm overflow-y-auto font-serif leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {generatedContent}
               </div>

               {filingSuggestions && (
                 <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                       <Archive size={14} /> Sugestão para Protocolo (CNJ)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="bg-white rounded border border-indigo-200 px-3 py-2">
                          <span className="text-xs text-indigo-500 block">Competência</span>
                          <span className="text-sm font-semibold text-gray-800">{filingSuggestions.competence}</span>
                       </div>
                       <div className="bg-white rounded border border-indigo-200 px-3 py-2">
                          <span className="text-xs text-indigo-500 block">Classe</span>
                          <span className="text-sm font-semibold text-gray-800">{filingSuggestions.class}</span>
                       </div>
                       <div className="bg-white rounded border border-indigo-200 px-3 py-2">
                          <span className="text-xs text-indigo-500 block">Assunto</span>
                          <span className="text-sm font-semibold text-gray-800">{filingSuggestions.subject}</span>
                       </div>
                    </div>
                 </div>
               )}

               <div className="bg-sky-50 p-4 rounded-lg border border-sky-100 shadow-sm flex gap-3">
                  <textarea
                     className="flex-1 rounded-md border border-sky-200 p-3 text-sm focus:ring-2 focus:ring-juris-500 resize-none h-20 bg-white"
                     placeholder="Solicite ajustes para a IA reescrever a peça..."
                     value={refinementText}
                     onChange={(e) => setRefinementText(e.target.value)}
                  />
                  <Button 
                     onClick={handleRefine} 
                     disabled={!refinementText.trim() || isRefining}
                     isLoading={isRefining}
                     className="h-20 w-32 md:w-48 bg-sky-600 hover:bg-sky-700 text-white"
                  >
                     <RefreshCw size={16} className={isRefining ? "animate-spin mr-2" : "mr-2"} />
                     Refinar
                  </Button>
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
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Gerando sua Petição</h3>
                 <p className="text-gray-500 max-w-md">Analisando {formData.analyzedDocuments?.length || 0} documento(s), {formData.plaintiffs.length} autor(es) e {formData.defendants.length} réu(s)...</p>
              </>
            ) : (
              <>
                <div className="bg-juris-50 p-6 rounded-full mb-6">
                   <Scale className="h-12 w-12 text-juris-800" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pronto para gerar</h3>
                <p className="text-gray-500 max-w-md mb-8">
                  As informações foram preenchidas. Clique abaixo para criar a minuta.
                </p>
                <Button size="lg" onClick={handleGenerate} className="shadow-xl px-8 h-14 text-lg">
                  <Sparkles className="mr-2 h-5 w-5" /> Gerar Petição
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
    <>
      <div className={`max-w-4xl mx-auto ${currentStep === 5 && generatedContent ? 'max-w-6xl' : ''} transition-all duration-500`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'upload' ? 'Nova Petição (Upload & Revisão)' : mode === 'scratch' ? 'Nova Petição (Manual)' : 'Nova Petição'}
          </h1>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-8 flex-1">
            {renderStepIndicator()}
            
            <div className={currentStep === 5 && generatedContent ? "h-auto" : "min-h-[400px]"}>
              {renderStepContent()}
            </div>
          </div>

          {(!generatedContent || currentStep !== 5) && (
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  // If at step 1, go back to selection
                  if (currentStep === 1) {
                      setMode('selection');
                  } else {
                      setCurrentStep(prev => Math.max(1, prev - 1));
                  }
                }}
                disabled={isGenerating}
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

      {/* Deadline Modal */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 transform animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="bg-green-100 p-3 rounded-full mb-4">
                             <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Petição Salva com Sucesso!</h2>
                        <p className="text-gray-500 text-sm mt-2">Deseja agendar um prazo ou audiência vinculado a esta petição na sua agenda?</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                              <CalendarClock size={16} /> Data do Prazo / Vencimento
                           </label>
                           <Input 
                              type="date" 
                              value={deadlineDate}
                              onChange={(e) => setDeadlineDate(e.target.value)}
                           />
                           <p className="text-xs text-gray-400 mt-1">
                              Será salvo como: "Prazo: {formData.actionType || 'Petição'}"
                           </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-8">
                        <Button 
                            onClick={handleSaveDeadlineAndFinish} 
                            disabled={!deadlineDate}
                            isLoading={isSavingDeadline}
                            className="w-full"
                        >
                            Agendar Prazo e Finalizar
                        </Button>
                        <Button 
                            variant="ghost" 
                            onClick={handleSkipDeadline}
                            className="w-full text-gray-500"
                        >
                            Não há prazo (Apenas finalizar)
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};