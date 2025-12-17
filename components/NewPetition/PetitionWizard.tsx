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
  Copy,
  RefreshCw,
  Archive,
  Printer,
  Upload,
  FileCheck,
  Loader2,
  Trash2,
  Plus,
  FileBadge,
  PenTool,
  FileUp,
  X,
  Mic,
  MicOff,
  Download,
  FileAudio,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Info,
  Edit3,
  Briefcase,
  AlertOctagon,
  ExternalLink,
  Globe
} from 'lucide-react';
import { generateLegalPetition, refineLegalPetition, suggestFilingMetadata, extractDataFromDocument, transcribeAudio } from '../../services/aiService';

interface WizardProps {
  userId: string;
  onCancel: () => void;
  onSuccess: () => void;
  usage: UsageLimit | null;
  accountStatus: string;
  isAdmin?: boolean;
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

export const PetitionWizard: React.FC<WizardProps> = ({ userId, onCancel, onSuccess, usage, accountStatus, isAdmin = false }) => {
  const [mode, setMode] = useState<WizardMode>('selection');
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PetitionFormData>(INITIAL_DATA);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [filingSuggestions, setFilingSuggestions] = useState<PetitionFilingMetadata | null>(null);
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionTarget, setTranscriptionTarget] = useState<'facts' | 'requests' | 'refinement'>('facts');

  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [listeningTarget, setListeningTarget] = useState<'facts' | 'requests' | 'refinement'>('facts');
  const [activeDictationField, setActiveDictationField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const getSteps = () => {
    if (mode === 'upload') {
      return [
        { id: 1, title: 'Upload & Análise', icon: Upload },
        { id: 2, title: 'Dados Iniciais', icon: User }, 
        { id: 3, title: 'Revisão Fatos', icon: FileText },
        { id: 4, title: 'Pedidos', icon: Gavel },
        { id: 5, title: 'Gerar Petição', icon: Sparkles },
      ];
    }
    return [
      { id: 1, title: 'Dados Iniciais', icon: User }, 
      { id: 2, title: 'Fatos', icon: FileText },
      { id: 3, title: 'Pedidos', icon: Gavel },
      { id: 4, title: 'Gerar Petição', icon: Sparkles },
    ];
  };

  const STEPS = getSteps();
  const TOTAL_STEPS = STEPS.length;

  useEffect(() => {
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);
  
  useEffect(() => {
    if (isFullScreen && contentRef.current && generatedContent) {
        if (!contentRef.current.innerHTML || contentRef.current.innerHTML === '<br>') {
            contentRef.current.innerHTML = generatedContent;
        }
    }
  }, [isFullScreen]);

  const handleInputChange = (field: keyof PetitionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
      return { ...prev, [type]: prev[type].filter(p => p.id !== id) };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsExtracting(true);
    setUploadSuccess(false);
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64String = event.target?.result as string;
            const base64Data = base64String.split(',')[1];
            const analysis = await extractDataFromDocument(base64Data, file.type);
            
            if (analysis.docType.includes('Leitura Manual') || analysis.docType.includes('Inválido')) {
               alert(`⚠️ Arquivo não identificado como petição.\n\nO sistema não conseguiu extrair os dados automaticamente. Por favor, revise manualmente.`);
            }

            setFormData(prev => {
              const newPlaintiffs = analysis.extractedData.plaintiffs?.map((p: any) => ({...p, id: Math.random().toString()})) || [];
              const newDefendants = analysis.extractedData.defendants?.map((p: any) => ({...p, id: Math.random().toString()})) || [];
              return {
                ...prev,
                area: analysis.extractedData.area || prev.area,
                actionType: analysis.extractedData.actionType || prev.actionType,
                jurisdiction: analysis.extractedData.jurisdiction || prev.jurisdiction,
                facts: (prev.facts ? prev.facts + "\n\n" : "") + (analysis.extractedData.facts || ""),
                plaintiffs: newPlaintiffs.length > 0 ? newPlaintiffs : prev.plaintiffs,
                defendants: newDefendants.length > 0 ? newDefendants : prev.defendants,
                value: analysis.extractedData.value || prev.value,
                analyzedDocuments: [...(prev.analyzedDocuments || []), { id: Math.random().toString(), fileName: file.name, docType: analysis.docType || 'Documento', summary: analysis.summary }]
              };
            });
            setIsExtracting(false);
            setUploadSuccess(true);
        };
        reader.readAsDataURL(file);
    } catch (error) { setIsExtracting(false); }
  };

  const triggerAudioImport = (target: 'facts' | 'requests' | 'refinement') => {
      setTranscriptionTarget(target);
      if (audioInputRef.current) {
          audioInputRef.current.value = '';
          audioInputRef.current.click();
      }
  };

  const handleAudioFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsTranscribing(true);
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64String = event.target?.result as string;
            const base64Data = base64String.split(',')[1];
            const text = await transcribeAudio(base64Data, file.type);
            if (transcriptionTarget === 'facts') {
                setFormData(prev => ({ ...prev, facts: prev.facts + (prev.facts ? '\n\n' : '') + text }));
            } else if (transcriptionTarget === 'requests') {
                const newRequests = formData.requests.join('\n') + (formData.requests.length ? '\n' : '') + text;
                setFormData(prev => ({ ...prev, requests: newRequests.split('\n') }));
            } else if (transcriptionTarget === 'refinement') {
                setRefinementText(prev => prev + (prev ? ' ' : '') + text);
            }
            setIsTranscribing(false);
        };
        reader.readAsDataURL(file);
    } catch (error) { setIsTranscribing(false); }
  };

  const toggleRecording = (target: 'facts' | 'requests' | 'refinement') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Seu navegador não suporta reconhecimento de voz.");
    
    if (isListening && listeningTarget === target) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    setListeningTarget(target);
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
          if (target === 'facts') setFormData(prev => ({ ...prev, facts: prev.facts + (prev.facts ? ' ' : '') + finalTranscript }));
          else if (target === 'refinement') setRefinementText(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
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
      setIsFullScreen(true);
    } catch (error) { alert("Erro na geração. Tente novamente."); } finally { setIsGenerating(false); }
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
    if (!isAdmin) {
        const currentCount = usage?.petitions_this_month || 0;
        if (accountStatus === 'trial' && currentCount >= (usage?.petitions_limit || 5)) {
             alert(`Limite do plano Gratuito atingido (${usage?.petitions_limit || 5} petições). Faça upgrade para o plano Pro.`);
             return;
        }
    }

    setIsSaving(true);
    try {
      const pName = formData.plaintiffs.map(p => p.name).join(', ');
      const dName = formData.defendants.map(d => d.name).join(', ');
      await supabase.from('petitions').insert([{
          user_id: userId,
          area: formData.area,
          action_type: formData.actionType || 'Petição IA',
          content: generatedContent,
          created_at: new Date().toISOString(),
          plaintiff_name: pName,
          defendant_name: dName,
          analyzed_documents: formData.analyzedDocuments 
      }]);
      alert("Petição salva com sucesso!");
      onSuccess();
    } catch (error) { alert("Erro ao salvar petição."); } finally { setIsSaving(false); }
  };

  const handleDownloadDoc = () => {
    if (!generatedContent) return;
    const blob = new Blob(['\ufeff', `<html><head><meta charset='utf-8'></head><body>${generatedContent}</body></html>`], { type: 'application/msword' });
    saveAs(blob, `Peticao_${new Date().toISOString().split('T')[0]}.doc`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><body>${generatedContent}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-juris-900 text-white shadow-lg scale-110' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
              </div>
              <span className={`text-[10px] mt-2 font-medium ${isActive ? 'text-juris-900' : 'text-gray-400'}`}>{step.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const VoiceControls = ({ target }: { target: 'facts' | 'requests' | 'refinement' }) => {
     const isTargetListening = isListening && listeningTarget === target;
     const isTargetTranscribing = isTranscribing && transcriptionTarget === target;
     return (
        <div className="grid grid-cols-2 gap-4 mt-3">
             <Button 
                variant={isTargetListening ? "danger" : "primary"} 
                onClick={() => toggleRecording(target)}
                className={`w-full py-4 text-sm font-semibold ${isTargetListening ? "animate-pulse" : ""}`}
                disabled={isTranscribing}
             >
                {isTargetListening ? <><MicOff className="mr-2" size={16}/> Parar</> : <><Mic className="mr-2" size={16}/> Ditar</>}
             </Button>
             <Button 
                variant="outline" 
                onClick={() => triggerAudioImport(target)}
                className="w-full py-4 text-sm font-semibold"
                disabled={isListening || isTranscribing}
                isLoading={isTargetTranscribing}
             >
                <FileAudio className="mr-2" size={16}/> {isTargetTranscribing ? 'Processando...' : 'Áudio'}
             </Button>
        </div>
     );
  };

  if (isFullScreen && generatedContent) {
      return (
        <div className="fixed inset-0 z-[200] bg-gray-100 flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
               <div className="flex items-center gap-4">
                  <button onClick={() => setIsFullScreen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900"><X size={24} /></button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Scale className="text-juris-600 h-5 w-5" /> Revisão da Peça</h2>
                    <p className="text-xs text-gray-500">A4 • Times New Roman 12 • Editável</p>
                  </div>
               </div>
               <div className="flex gap-2">
                   <Button variant="outline" onClick={handleDownloadDoc} className="hidden sm:flex items-center gap-2"><Download size={16} /> Word</Button>
                   <Button variant="outline" onClick={handlePrint} className="hidden sm:flex items-center gap-2"><Printer size={16} /> Imprimir</Button>
                   <Button onClick={handleSave} isLoading={isSaving} className="flex items-center gap-2 px-6 shadow-lg shadow-juris-900/20"><Save size={18} /> Salvar Petição</Button>
               </div>
           </div>

           <div className="flex-1 overflow-y-auto p-8 relative">
               <div className="w-full max-w-[1400px] mx-auto flex gap-8 items-start justify-center">
                   <div 
                      ref={contentRef}
                      className="flex-shrink-0 bg-white shadow-2xl p-[3cm_2cm_2cm_3cm] text-black focus:outline-none focus:ring-1 focus:ring-juris-200"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => setGeneratedContent(e.currentTarget.innerHTML)}
                      style={{ width: '21cm', minHeight: '29.7cm', fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5', outline: 'none' }}
                   />

                   <div className="w-80 hidden xl:flex flex-col gap-4 sticky top-0">
                       {/* PROTOCOL CARD WITH LINK */}
                       {filingSuggestions && (
                           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Archive size={14} /> Sugestão de Protocolo
                               </h4>
                               <div className="space-y-4">
                                   <div>
                                      <span className="text-xs text-gray-400 block">Competência</span>
                                      <span className="text-sm font-semibold text-gray-800 leading-tight block">{filingSuggestions.competence}</span>
                                   </div>
                                   <div>
                                      <span className="text-xs text-gray-400 block">Classe / Assunto</span>
                                      <span className="text-sm text-gray-700 block">{filingSuggestions.class}</span>
                                      <span className="text-[10px] text-gray-400 block mt-1">{filingSuggestions.subject}</span>
                                   </div>
                                   
                                   {filingSuggestions.filingUrl && (
                                       <div className="pt-2 border-t border-gray-100">
                                           <a 
                                              href={filingSuggestions.filingUrl} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="w-full inline-flex items-center justify-center gap-2 bg-juris-900 text-white py-3 px-4 rounded-md font-bold text-xs hover:bg-juris-800 transition-colors"
                                           >
                                              <Globe size={14} /> Acessar Portal do Tribunal <ExternalLink size={12} />
                                           </a>
                                           <p className="text-[10px] text-gray-400 mt-2 text-center italic">Link sugerido com base na sua jurisdição.</p>
                                       </div>
                                   )}
                               </div>
                           </div>
                       )}
                       
                       <div className="bg-sky-50 rounded-lg shadow-sm border border-sky-100 p-4">
                           <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <RefreshCw size={14} /> Refinar com IA
                           </h4>
                           <textarea
                              className="w-full rounded-md border border-sky-200 p-2 text-sm h-32 mb-2 focus:ring-2 focus:ring-sky-500"
                              placeholder="Ex: Adicione um tópico sobre prioridade de idoso..."
                              value={refinementText}
                              onChange={(e) => setRefinementText(e.target.value)}
                           />
                           <Button onClick={handleRefine} isLoading={isRefining} className="w-full bg-sky-600 hover:bg-sky-700">Aplicar Ajustes</Button>
                       </div>
                   </div>
               </div>
           </div>
        </div>
      );
  }

  const renderCurrentStep = () => {
    // CONTENT STEPS LOGIC
    const isUploadStep = mode === 'upload' && currentStep === 1;
    const isDataStep = (mode === 'upload' && currentStep === 2) || (mode !== 'upload' && currentStep === 1);
    const isFactsStep = (mode === 'upload' && currentStep === 3) || (mode !== 'upload' && currentStep === 2);
    const isRequestsStep = (mode === 'upload' && currentStep === 4) || (mode !== 'upload' && currentStep === 3);
    const isFinishStep = (mode === 'upload' && currentStep === 5) || (mode !== 'upload' && currentStep === 4);

    if (isUploadStep) {
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             <div className="bg-sky-50 border-2 border-dashed border-sky-200 rounded-lg p-10 text-center">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf, .txt, image/*" />
                {isExtracting ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-10 w-10 text-sky-600 animate-spin" />
                        <span className="text-sm font-medium text-sky-700">Analisando documento...</span>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="bg-green-100 p-3 rounded-full"><FileCheck className="h-8 w-8 text-green-600" /></div>
                        <span className="text-sm font-medium text-green-700">Dados extraídos! Revise nas próximas etapas.</span>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-sky-600 underline">Trocar arquivo</button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="h-10 w-10 text-sky-400 mx-auto mb-2" />
                        <h3 className="font-bold text-gray-900">Upload de Arquivo Base</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">Envie Petições Iniciais, Contratos ou RGs para que a IA preencha os dados automaticamente.</p>
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="mt-4">Selecionar PDF / Imagem</Button>
                    </div>
                )}
            </div>
          </div>
        );
    }

    if (isDataStep) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input label="Esfera do Direito" value={formData.area} onChange={(e) => handleInputChange('area', e.target.value)} placeholder="Cível, Trabalhista, etc" />
                   <Input label="Tipo de Ação" value={formData.actionType} onChange={(e) => handleInputChange('actionType', e.target.value)} placeholder="Ex: Indenizatória, Reclamatória..." />
               </div>
               <Input 
                  label="Foro / Jurisdição" 
                  placeholder="Ex: Comarca de São Paulo/SP" 
                  value={formData.jurisdiction} 
                  onChange={(e) => handleInputChange('jurisdiction', e.target.value)} 
               />
               
               <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-sm border-b pb-2">Partes Envolvidas</h3>
                  {formData.plaintiffs.map((p, idx) => (
                      <div key={idx} className="flex gap-2">
                         <Input placeholder="Nome do Autor" value={p.name} onChange={(e) => updateParty('plaintiffs', p.id!, 'name', e.target.value)} />
                         <Input placeholder="CPF/CNPJ" value={p.doc} onChange={(e) => updateParty('plaintiffs', p.id!, 'doc', e.target.value)} />
                      </div>
                  ))}
                  <button onClick={() => addParty('plaintiffs')} className="text-xs text-juris-600 hover:underline flex items-center gap-1"><Plus size={12}/> Adicionar Autor</button>
                  
                  {formData.defendants.map((p, idx) => (
                      <div key={idx} className="flex gap-2">
                         <Input placeholder="Nome do Réu" value={p.name} onChange={(e) => updateParty('defendants', p.id!, 'name', e.target.value)} />
                         <Input placeholder="CPF/CNPJ" value={p.doc} onChange={(e) => updateParty('defendants', p.id!, 'doc', e.target.value)} />
                      </div>
                  ))}
                  <button onClick={() => addParty('defendants')} className="text-xs text-red-600 hover:underline flex items-center gap-1"><Plus size={12}/> Adicionar Réu</button>
               </div>
            </div>
        );
    }

    if (isFactsStep) {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Narrativa dos Fatos</label>
                  <textarea 
                    className="w-full h-80 rounded-md border border-gray-300 p-4 bg-white focus:ring-2 focus:ring-juris-500 text-sm leading-relaxed" 
                    placeholder="Descreva o que aconteceu..." 
                    value={formData.facts} 
                    onChange={(e) => handleInputChange('facts', e.target.value)} 
                  />
                  <VoiceControls target="facts" />
               </div>
            </div>
        );
    }

    if (isRequestsStep) {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pedidos (Um por linha)</label>
                  <textarea 
                    className="w-full h-64 rounded-md border border-gray-300 p-4 bg-white focus:ring-2 focus:ring-juris-500 text-sm" 
                    placeholder="1. A citação do réu..." 
                    value={formData.requests.join('\n')} 
                    onChange={(e) => handleInputChange('requests', e.target.value.split('\n'))} 
                  />
                  <VoiceControls target="requests" />
               </div>
               <Input label="Valor da Causa" value={formData.value} onChange={(e) => handleInputChange('value', e.target.value)} />
            </div>
        );
    }

    if (isFinishStep) {
        return (
            <div className="text-center py-12 animate-in fade-in">
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-4">
                        <Sparkles className="h-16 w-16 text-juris-500 animate-pulse" />
                        <h3 className="text-xl font-bold">Gerando Minuta Jurídica...</h3>
                        <p className="text-gray-500 max-w-sm">Aguarde alguns segundos enquanto a IA redige a peça com base nos seus dados.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-juris-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <Scale className="h-12 w-12 text-juris-800" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Tudo pronto!</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">As informações estão preenchidas. Clique abaixo para gerar a primeira versão da sua petição.</p>
                        <Button size="lg" onClick={handleGenerate} className="px-10 h-14 text-lg shadow-xl">
                            <Sparkles className="mr-2" size={20} /> Gerar Petição (IA Sênior)
                        </Button>
                    </>
                )}
            </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioFileImport} />
      
      <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
             {mode === 'selection' ? 'Nova Petição' : mode === 'scratch' ? 'Criação Manual' : 'Criação via Análise'}
          </h1>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>

      {mode === 'selection' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => setMode('scratch')} className="flex flex-col items-center p-10 bg-white border-2 border-gray-100 rounded-2xl hover:border-juris-500 hover:shadow-xl transition-all h-80 justify-center group">
            <div className="bg-juris-50 p-6 rounded-full group-hover:bg-juris-100 mb-4 transition-colors">
                <PenTool size={48} className="text-juris-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Petição do Zero</h3>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">Preencha o formulário e deixe a IA redigir toda a fundamentação jurídica.</p>
          </button>
          
          <button onClick={() => setMode('upload')} className="flex flex-col items-center p-10 bg-white border-2 border-gray-100 rounded-2xl hover:border-sky-500 hover:shadow-xl transition-all h-80 justify-center group">
            <div className="bg-sky-50 p-6 rounded-full group-hover:bg-sky-100 mb-4 transition-colors">
                <FileUp size={48} className="text-sky-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Upload & Análise</h3>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">Envie documentos base para que a IA extraia nomes, fatos e crie a minuta inicial.</p>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-8 flex-1 min-h-[500px]">
            {renderStepIndicator()}
            {renderCurrentStep()}
          </div>
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between items-center">
            <Button 
                variant="outline" 
                onClick={() => { if (currentStep === 1) setMode('selection'); else setCurrentStep(currentStep - 1); }}
                disabled={isGenerating}
            >
                <ChevronLeft className="mr-2" size={16} /> Voltar
            </Button>
            {currentStep < TOTAL_STEPS && (
                <Button 
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={isGenerating || (mode === 'upload' && currentStep === 1 && !uploadSuccess)}
                >
                    Próximo <ChevronRight className="ml-2" size={16} />
                </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};