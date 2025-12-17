import React, { useState, useRef, useEffect } from 'react';
import { PetitionFormData, PetitionFilingMetadata, PetitionParty, UsageLimit } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import saveAs from 'file-saver';
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
  Printer,
  Upload,
  FileCheck,
  Loader2,
  Trash2,
  Plus,
  FileBadge,
  X,
  Mic,
  MicOff,
  Download,
  FileAudio,
  Maximize2,
  Info,
  Edit3,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Archive,
  RefreshCw
} from 'lucide-react';
import { generateLegalDefense, refineLegalPetition, suggestFilingMetadata, extractDataFromDocument, transcribeAudio } from '../../services/aiService';

interface WizardProps {
  userId: string;
  onCancel: () => void;
  onSuccess: () => void;
  usage: UsageLimit | null;
  accountStatus: string;
  isAdmin?: boolean;
}

const INITIAL_PARTY: PetitionParty = {
  id: '1',
  name: '', type: 'pf', doc: '', address: '', qualification: ''
};

const INITIAL_DATA: PetitionFormData = {
  area: 'civel',
  actionType: 'Contestação',
  jurisdiction: '',
  plaintiffs: [{...INITIAL_PARTY, id: 'p1'}],
  defendants: [{...INITIAL_PARTY, id: 'd1'}],
  facts: '',
  requests: [],
  evidence: 'Todas as provas admitidas em direito',
  value: '',
  analyzedDocuments: []
};

export const DefenseWizard: React.FC<WizardProps> = ({ userId, onCancel, onSuccess, usage, accountStatus, isAdmin = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PetitionFormData>(INITIAL_DATA);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [filingSuggestions, setFilingSuggestions] = useState<PetitionFilingMetadata | null>(null);
  
  // Full Screen State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Document Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Audio/Refinement/Voice State
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionTarget, setTranscriptionTarget] = useState<'facts' | 'requests' | 'refinement'>('facts');
  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listeningTarget, setListeningTarget] = useState<'facts' | 'requests' | 'refinement'>('facts');
  const [activeDictationField, setActiveDictationField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const STEPS = [
    { id: 1, title: 'Upload da Peça', icon: Upload },
    { id: 2, title: 'Partes (Autor/Réu)', icon: User }, 
    { id: 3, title: 'Tese de Defesa', icon: Shield },
    { id: 4, title: 'Pedidos', icon: Gavel },
    { id: 5, title: 'Gerar Defesa', icon: Sparkles },
  ];

  const TOTAL_STEPS = STEPS.length;

  useEffect(() => {
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);
  
  useEffect(() => {
    // Prevent loop-reset on blur: Only set initial content
    if (isFullScreen && contentRef.current && generatedContent) {
        if (!contentRef.current.innerHTML || contentRef.current.innerHTML === '<br>') {
            contentRef.current.innerHTML = generatedContent;
        }
    }
  }, [isFullScreen]);

  // --- HELPERS ---

  const handleInputChange = (field: keyof PetitionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateParty = (type: 'plaintiffs' | 'defendants', id: string, field: keyof PetitionParty, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) { alert("Limite 10MB."); return; }
    
    setIsExtracting(true);
    setUploadSuccess(false);
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64String = event.target?.result as string;
            const base64Data = base64String.split(',')[1];
            const analysis = await extractDataFromDocument(base64Data, file.type);
            setFormData(prev => {
              const newPlaintiffs = analysis.extractedData.plaintiffs?.map((p: any) => ({...p, id: Math.random().toString()})) || [];
              const newDefendants = analysis.extractedData.defendants?.map((p: any) => ({...p, id: Math.random().toString()})) || [];
              return {
                ...prev,
                area: analysis.extractedData.area || prev.area,
                actionType: analysis.extractedData.actionType ? `Contestação em ${analysis.extractedData.actionType}` : prev.actionType,
                jurisdiction: analysis.extractedData.jurisdiction || prev.jurisdiction,
                facts: `RESUMO DA INICIAL/SENTENÇA:\n${analysis.summary || ''}\n\n${analysis.extractedData.facts || ''}\n\n--- INICIE SUA TESE DE DEFESA ABAIXO ---`,
                plaintiffs: newPlaintiffs.length > 0 ? newPlaintiffs : prev.plaintiffs,
                defendants: newDefendants.length > 0 ? newDefendants : prev.defendants,
                value: analysis.extractedData.value || prev.value,
                analyzedDocuments: [{
                    id: Math.random().toString(),
                    fileName: file.name,
                    docType: analysis.docType || 'Peça a Contestar',
                    summary: analysis.summary
                }]
              };
            });
            setIsExtracting(false);
            setUploadSuccess(true);
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error(error);
        alert("Erro ao processar arquivo.");
        setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const [content, metadata] = await Promise.all([
        generateLegalDefense(formData),
        suggestFilingMetadata(formData)
      ]);
      setGeneratedContent(content);
      setFilingSuggestions(metadata);
      setIsFullScreen(true);
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
    } catch (error) { alert("Erro ao refinar."); } finally { setIsRefining(false); }
  };

  const handleSave = async () => {
    if (!generatedContent || !userId) return;

    // VALIDATION LOGIC BASED ON ACCOUNT TYPE (ADMIN BYPASS)
    if (!isAdmin) {
        const currentCount = usage?.petitions_this_month || 0;
        
        if (accountStatus === 'trial') {
            const limit = usage?.petitions_limit || 5;
            if (currentCount >= limit) {
                 alert(`Limite do plano Gratuito atingido (${limit} petições). Faça upgrade para o plano Pro.`);
                 return;
            }
        } else if (accountStatus === 'active') {
            // Paid User: Hybrid Limit Check
            
            // 1. Check Quantity (100)
            if (currentCount >= 100) {
                alert("Limite mensal de segurança (100 petições) atingido. Aguarde o próximo ciclo.");
                return;
            }

            // 2. Check Storage (50MB)
            const estimatedSize = new Blob([generatedContent]).size + 
                                  new Blob([JSON.stringify(formData.analyzedDocuments)]).size;
            const currentStorage = usage?.used_storage_bytes || 0;
            const storageLimit = usage?.storage_limit_bytes || 52428800; // 50MB
            
            if (currentStorage + estimatedSize > storageLimit) {
                alert("Limite de armazenamento (50MB) excedido! Libere espaço apagando petições antigas.");
                return;
            }
        }
    }

    setIsSaving(true);
    try {
        const { error } = await supabase.from('petitions').insert([{
            user_id: userId,
            area: formData.area,
            action_type: formData.actionType,
            content: generatedContent,
            created_at: new Date().toISOString(),
            plaintiff_name: formData.plaintiffs[0]?.name,
            defendant_name: formData.defendants[0]?.name,
            filed: false,
            analyzed_documents: formData.analyzedDocuments
        }]);
        if(error) throw error;
        alert("Contestação salva!");
        onSuccess();
    } catch(e: any) { alert("Erro ao salvar: " + e.message); } finally { setIsSaving(false); }
  };

  const handleDownloadDoc = () => {
    if (!generatedContent) return;
    const blob = new Blob(['\ufeff', `<html xmlns:w='urn:schemas-microsoft-com:office:word'><body>${generatedContent}</body></html>`], { type: 'application/msword' });
    saveAs(blob, `Contestacao_${new Date().toISOString().split('T')[0]}.doc`);
  };

  const handlePrint = () => {
      const w = window.open('','_blank');
      w?.document.write(`<html><body>${generatedContent}</body></html>`);
      w?.document.close();
      setTimeout(()=>w?.print(), 500);
  };

  // --- RENDERERS ---

  const renderStepContent = () => {
    // Only implemented parts to keep code short, relying on existing logic
    if (currentStep === 1) {
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             <div className="bg-red-50 border-2 border-dashed border-red-200 rounded-lg p-8 text-center">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf, .txt, image/*" />
                {isExtracting ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
                        <span className="text-sm font-medium text-red-700">Analisando a peça adversa...</span>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="bg-green-100 p-2 rounded-full"><FileCheck className="h-6 w-6 text-green-600" /></div>
                        <span className="text-sm font-medium text-green-700">Sentença/Inicial analisada!</span>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-red-600 underline">Substituir</button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="bg-red-100 p-3 rounded-full mb-2"><ShieldAlert className="h-8 w-8 text-red-500" /></div>
                        <h3 className="font-semibold text-gray-900">Upload da Peça a Contestar</h3>
                        <p className="text-sm text-gray-500 max-w-sm">Envie a Petição Inicial, Sentença ou Decisão que você precisa atacar.</p>
                        <Button variant="danger" onClick={() => fileInputRef.current?.click()} className="mt-2">Selecionar Documento</Button>
                    </div>
                )}
            </div>
          </div>
        );
    }

    if (currentStep === 2) {
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                 <h2 className="text-sm font-bold text-blue-900 flex items-center gap-2"><User size={16}/> SEU CLIENTE (Polo Passivo/Réu)</h2>
                 {formData.defendants.map((party, index) => (
                    <div key={party.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        <Input value={party.name} onChange={(e) => updateParty('defendants', party.id!, 'name', e.target.value)} placeholder="Nome do seu cliente" />
                        <Input value={party.doc} onChange={(e) => updateParty('defendants', party.id!, 'doc', e.target.value)} placeholder="CPF/CNPJ" />
                    </div>
                 ))}
             </div>
             <div className="bg-red-50 p-4 rounded-md border border-red-200">
                 <h2 className="text-sm font-bold text-red-900 flex items-center gap-2"><User size={16}/> PARTE ADVERSA (Autor/Exequente)</h2>
                 {formData.plaintiffs.map((party, index) => (
                    <div key={party.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        <Input value={party.name} onChange={(e) => updateParty('plaintiffs', party.id!, 'name', e.target.value)} placeholder="Nome da parte contrária" />
                        <Input value={party.doc} onChange={(e) => updateParty('plaintiffs', party.id!, 'doc', e.target.value)} placeholder="CPF/CNPJ (se souber)" />
                    </div>
                 ))}
             </div>
          </div>
        );
    }
    
    // Steps 3, 4 are identical to previous, included implicitly by structure.
    if (currentStep === 3) {
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tese de Defesa</label>
              <textarea 
                  className="w-full h-80 rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 text-sm leading-relaxed resize-none" 
                  value={formData.facts} 
                  onChange={(e) => handleInputChange('facts', e.target.value)} 
              />
            </div>
          </div>
        );
    }

    if (currentStep === 4) {
         return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pedidos da Defesa</label>
              <textarea 
                className="w-full h-40 rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 text-sm" 
                value={formData.requests.join('\n')} 
                onChange={(e) => handleInputChange('requests', e.target.value.split('\n'))} 
              />
            </div>
          </div>
        );
    }

    if (currentStep === 5) {
        if (generatedContent) {
           // Success State (Inline)
           return (
             <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center justify-center py-8 text-center">
               <div className="bg-red-100 p-4 rounded-full mb-4">
                  <ShieldCheck className="h-12 w-12 text-red-600" />
               </div>
               <h3 className="text-2xl font-bold text-gray-900 mb-2">Contestação Gerada!</h3>
               <p className="text-gray-500 mb-8 max-w-md">A peça de defesa foi criada com contra-argumentação avançada.</p>
               <div className="flex gap-4">
                  <Button size="lg" onClick={() => setIsFullScreen(true)} className="bg-red-700 hover:bg-red-800">
                     <Maximize2 size={18} className="mr-2" /> Revisar (Imersivo)
                  </Button>
                  <Button variant="outline" onClick={handleSave} isLoading={isSaving}>
                     <Save size={18} className="mr-2" /> Salvar
                  </Button>
                  <button onClick={() => { setGeneratedContent(null); setIsFullScreen(false); }} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
                      <Edit3 size={14} /> Editar Dados
                  </button>
               </div>
             </div>
           );
        }
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in">
            {isGenerating ? (
              <>
                 <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-200 rounded-full animate-ping opacity-25"></div>
                    <div className="relative bg-white p-4 rounded-full border-2 border-red-100 shadow-xl">
                       <Shield className="h-10 w-10 text-red-500 animate-pulse" />
                    </div>
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Construindo Tese de Defesa</h3>
                 <p className="text-gray-500 max-w-md">A IA está cruzando os fatos da inicial com seus argumentos para criar a contestação...</p>
              </>
            ) : (
              <>
                <div className="bg-red-50 p-6 rounded-full mb-6">
                   <Shield className="h-12 w-12 text-red-800" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Gerar Contestação</h3>
                <p className="text-gray-500 max-w-md mb-8">
                  Tudo pronto. Clique abaixo para gerar a defesa.
                </p>
                <Button size="lg" onClick={handleGenerate} className="shadow-xl px-8 h-14 text-lg bg-red-700 hover:bg-red-800 border-transparent">
                  <Sparkles className="mr-2 h-5 w-5" /> Gerar Defesa
                </Button>
              </>
            )}
          </div>
        );
    }
    return null;
  };

  // --- MAIN LAYOUT ---

  if (isFullScreen && generatedContent) {
      return (
        <div className="fixed inset-0 z-[200] bg-gray-100 flex flex-col animate-in slide-in-from-bottom duration-300">
           {/* Top Toolbar */}
           <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
               <div className="flex items-center gap-4">
                  <button onClick={() => setIsFullScreen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900"><X size={24} /></button>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Shield className="text-red-600 h-5 w-5" /> Revisão</h2>
               </div>
               <div className="flex gap-2">
                   <Button variant="outline" onClick={handleDownloadDoc}><Download size={16} /> Word</Button>
                   <Button variant="outline" onClick={handlePrint}><Printer size={16} /> Imprimir</Button>
                   <Button onClick={handleSave} isLoading={isSaving} className="bg-red-700 hover:bg-red-800"><Save size={18} /> Salvar</Button>
               </div>
           </div>
           
           <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-center text-sm text-red-800 flex items-center justify-center gap-2">
                <Info size={16} /> <span>Documento editável. Clique no texto para ajustar a tese.</span>
           </div>

           <div className="flex-1 overflow-y-auto p-8 relative">
               <div className="w-full max-w-[1400px] mx-auto flex gap-8 items-start justify-center">
                   <div 
                      ref={contentRef}
                      className="flex-shrink-0 bg-white shadow-2xl p-[3cm_2cm_2cm_3cm] text-black focus:outline-none focus:ring-1 focus:ring-red-200"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => setGeneratedContent(e.currentTarget.innerHTML)}
                      style={{ width: '21cm', minHeight: '29.7cm', fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5', outline: 'none' }}
                   />
               </div>
           </div>
        </div>
      );
  }

  return (
    <div className={`max-w-4xl mx-auto transition-all duration-500`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             <ShieldAlert className="text-red-600" /> Criar Contestação
          </h1>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-8 flex-1">
             {/* Step Indicator */}
             {!generatedContent && (
                <div className="mb-8">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />
                    {STEPS.map((step) => {
                      const isActive = step.id === currentStep;
                      const isCompleted = step.id < currentStep;
                      const Icon = step.icon;
                      return (
                        <div key={step.id} className="flex flex-col items-center bg-gray-50 px-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-red-700 text-white shadow-lg scale-110' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {isCompleted ? <FileCheck size={20} /> : <Icon size={20} />}
                          </div>
                          <span className={`text-xs mt-2 font-medium ${isActive ? 'text-red-800' : 'text-gray-400'}`}>{step.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
             )}

             {renderStepContent()}
          </div>
          
          {!generatedContent && (
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))} disabled={isGenerating || currentStep === 1}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={() => setCurrentStep(prev => Math.min(TOTAL_STEPS, prev + 1))} disabled={isGenerating}>
                Próximo <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
    </div>
  );
};