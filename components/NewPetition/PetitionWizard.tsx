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
  Edit3
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
  
  // Full Screen State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Document Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Audio Import State
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionTarget, setTranscriptionTarget] = useState<'facts' | 'requests' | 'refinement'>('facts');

  // Refinement State
  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const [listeningTarget, setListeningTarget] = useState<'facts' | 'requests' | 'refinement'>('facts');
  
  // Specific Party Field Dictation State
  const [activeDictationField, setActiveDictationField] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // Define Steps based on Mode
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
    // Scratch Mode
    return [
      { id: 1, title: 'Dados Iniciais', icon: User }, 
      { id: 2, title: 'Fatos', icon: FileText },
      { id: 3, title: 'Pedidos', icon: Gavel },
      { id: 4, title: 'Gerar Petição', icon: Sparkles },
    ];
  };

  const STEPS = getSteps();
  const TOTAL_STEPS = STEPS.length;

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  // Sync content for editable div
  useEffect(() => {
    if (isFullScreen && contentRef.current && generatedContent) {
        if (contentRef.current.innerHTML !== generatedContent) {
            contentRef.current.innerHTML = generatedContent;
        }
    }
  }, [isFullScreen, generatedContent]);

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
            const analysis = await extractDataFromDocument(base64Data, file.type);
            
            // ERROR CHECKING: If docType suggests an error, don't proceed with success
            if (analysis.docType === 'Erro' || analysis.summary.includes('Erro de Configuração')) {
               alert(`Falha na análise: ${analysis.summary}`);
               setIsExtracting(false);
               return;
            }

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
    // Check local limit first
    if (file.size > 25 * 1024 * 1024) {
        alert("Arquivo de áudio muito grande. Máximo 25MB.");
        return;
    }
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
    } catch (error) {
        console.error(error);
        alert("Erro ao transcrever áudio.");
        setIsTranscribing(false);
    }
  };

  const toggleRecording = (target: 'facts' | 'requests' | 'refinement') => {
    if (activeDictationField) {
        recognitionRef.current?.stop();
        setActiveDictationField(null);
    }
    if (isListening && listeningTarget === target) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    setListeningTarget(target);
    startRecognition((text) => {
        if (target === 'facts') {
            setFormData(prev => ({ ...prev, facts: prev.facts + (prev.facts ? ' ' : '') + text }));
        } else if (target === 'requests') {
             const currentText = formData.requests.join('\n');
             const newText = currentText + (currentText ? ' ' : '') + text;
             setFormData(prev => ({ ...prev, requests: newText.split('\n') }));
        } else if (target === 'refinement') {
            setRefinementText(prev => prev + (prev ? ' ' : '') + text);
        }
    }, () => { setIsListening(true); }, () => { setIsListening(false); });
  };

  const toggleFieldDictation = (type: 'plaintiffs' | 'defendants', id: string, field: keyof PetitionParty) => {
      const dictationKey = `${type}-${id}-${field}`;
      if (activeDictationField === dictationKey) {
          recognitionRef.current?.stop();
          setActiveDictationField(null);
          return;
      }
      if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
      }
      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
      setActiveDictationField(dictationKey);
      startRecognition((text) => {
          setFormData(prev => {
              const list = prev[type];
              const partyIndex = list.findIndex(p => p.id === id);
              if (partyIndex === -1) return prev;
              const currentVal = list[partyIndex][field] || '';
              const newVal = currentVal + (currentVal ? ' ' : '') + text;
              const newList = [...list];
              newList[partyIndex] = { ...newList[partyIndex], [field]: newVal };
              return { ...prev, [type]: newList };
          });
      }, () => {}, () => { setActiveDictationField(null); });
  };

  const startRecognition = (onResult: (text: string) => void, onStart?: () => void, onEnd?: () => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { if (onStart) onStart(); };
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) onResult(finalTranscript);
    };
    recognition.onerror = (event: any) => { console.error("Speech recognition error", event.error); if (onEnd) onEnd(); };
    recognition.onend = () => { if (onEnd) onEnd(); };
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
      // AUTO ENTER FULL SCREEN ON SUCCESS
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
    } catch (error) {
      alert("Erro ao refinar petição.");
    } finally {
      setIsRefining(false);
    }
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
      const pName = formData.plaintiffs.map(p => p.name).join(', ');
      const dName = formData.defendants.map(d => d.name).join(', ');
      const { error } = await supabase.from('petitions').insert([
        {
          user_id: userId,
          area: formData.area,
          action_type: formData.actionType || 'Ação (Detectada pela IA)',
          content: generatedContent,
          created_at: new Date().toISOString(),
          plaintiff_name: pName,
          defendant_name: dName,
          analyzed_documents: formData.analyzedDocuments 
        }
      ]).select().single();
      if (error) throw error;
      alert("Petição salva com sucesso!");
      onSuccess();
    } catch (error: any) {
      console.error('Error saving petition:', JSON.stringify(error, null, 2));
      alert(`Erro ao salvar: ${error.message || 'Erro desconhecido.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadDoc = () => {
    if (!generatedContent) return;
    const fileName = formData.actionType 
        ? `Peticao_${formData.actionType.replace(/\s+/g, '_')}.doc`
        : `Peticao_Juridica_${new Date().toISOString().split('T')[0]}.doc`;
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Petição</title>
        <style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5}p{text-align:justify;text-indent:3cm;margin-bottom:12px}h1,h2,h3{text-align:center;text-transform:uppercase;margin-top:24px;margin-bottom:12px;font-weight:bold}</style>
      </head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + generatedContent + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    saveAs(blob, fileName);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title></title><style>@page{margin:0}body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;margin:2.5cm 2cm}p{text-align:justify;text-indent:3cm;margin-bottom:12px}h1,h2,h3{text-align:center;text-transform:uppercase;margin-top:24px;margin-bottom:12px}</style></head><body>${generatedContent}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const VoiceControls = ({ target }: { target: 'facts' | 'requests' | 'refinement' }) => {
     const isTargetListening = isListening && listeningTarget === target;
     const isTargetTranscribing = isTranscribing && transcriptionTarget === target;
     return (
        <div className="grid grid-cols-2 gap-4 mt-3">
             <Button 
                variant={isTargetListening ? "danger" : "primary"} 
                onClick={() => toggleRecording(target)}
                className={`w-full py-6 text-base font-semibold shadow-md ${isTargetListening ? "animate-pulse ring-2 ring-red-400" : "bg-juris-700 hover:bg-juris-900"}`}
                disabled={isTranscribing}
             >
                {isTargetListening ? <><MicOff className="mr-2" /> Parar</> : <><Mic className="mr-2" /> Ditar</>}
             </Button>
             <Button 
                variant="outline" 
                onClick={() => triggerAudioImport(target)}
                className="w-full py-6 text-base font-semibold border-juris-200 hover:bg-juris-50 text-juris-800"
                disabled={isListening || isTranscribing}
                isLoading={isTargetTranscribing}
             >
                <FileAudio className="mr-2" /> 
                {isTargetTranscribing ? 'Transcrevendo...' : 'Importar Áudio'}
             </Button>
        </div>
     );
  };

  const FieldMicButton = ({ type, id, field }: { type: 'plaintiffs' | 'defendants', id: string, field: keyof PetitionParty }) => {
      const isFieldActive = activeDictationField === `${type}-${id}-${field}`;
      return (
          <button
              onClick={() => toggleFieldDictation(type, id, field)}
              className={`p-1.5 rounded-full transition-colors ${isFieldActive ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-juris-600 hover:bg-gray-100'}`}
              title="Ditar campo"
              tabIndex={-1}
          >
              {isFieldActive ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
      );
  };

  const handleBackToEditing = () => {
      if(window.confirm('Isso descartará a petição gerada para que você possa editar os dados. Deseja continuar?')) {
          setGeneratedContent(null);
          setIsFullScreen(false);
          setCurrentStep(prev => Math.max(1, prev - 1));
      }
  };

  // --- FULL SCREEN PREVIEW MODE ---
  if (isFullScreen && generatedContent) {
      return (
        <div className="fixed inset-0 z-[100] bg-gray-100 flex flex-col animate-in slide-in-from-bottom duration-300">
           {/* Top Toolbar */}
           <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsFullScreen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                    title="Minimizar e Voltar para Ações"
                  >
                     <X size={24} />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                       <Scale className="text-juris-600 h-5 w-5" /> Revisão da Peça
                    </h2>
                    <p className="text-xs text-gray-500">Modo de Leitura Imersiva</p>
                  </div>
               </div>

               <div className="flex gap-2">
                   <Button variant="outline" onClick={handleDownloadDoc} className="hidden sm:flex items-center gap-2">
                      <Download size={16} /> Word
                   </Button>
                   <Button variant="outline" onClick={handlePrint} className="hidden sm:flex items-center gap-2">
                      <Printer size={16} /> Imprimir
                   </Button>
                   <Button onClick={handleSave} isLoading={isSaving} className="flex items-center gap-2 px-6 shadow-lg shadow-juris-900/20">
                      <Save size={18} /> Salvar Petição
                   </Button>
               </div>
           </div>

           {/* Info Banner */}
           <div className="bg-sky-50 border-b border-sky-100 px-4 py-2 text-center text-sm text-sky-800 flex items-center justify-center gap-2 animate-in fade-in">
                <Info size={16} />
                <span>Este documento é editável. A IA entende e preserva as suas edições! Clique no texto para começar.</span>
           </div>

           {/* Main Content Area (Scrollable) */}
           <div className="flex-1 overflow-y-auto p-8 relative">
               <div className="w-full max-w-[1400px] mx-auto flex gap-8 items-start justify-center">
                   {/* Paper Document (Editable) */}
                   <div 
                      id="petition-fullscreen-view"
                      ref={contentRef}
                      className="flex-shrink-0 bg-white shadow-2xl p-[3cm_2cm_2cm_3cm] text-black focus:outline-none focus:ring-1 focus:ring-juris-200 transition-shadow"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => setGeneratedContent(e.currentTarget.innerHTML)}
                      style={{
                          width: '21cm', // Width A4 fixed
                          minHeight: '29.7cm', // Height A4 min
                          fontFamily: '"Times New Roman", Times, serif',
                          fontSize: '12pt',
                          lineHeight: '1.5',
                          outline: 'none'
                      }}
                   />

                   {/* Right Floating Panel for Refinement & Info */}
                   <div className="w-80 hidden xl:flex flex-col gap-4 sticky top-0">
                       {/* Metadata Card */}
                       {filingSuggestions && (
                           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Archive size={14} /> Protocolo CNJ
                               </h4>
                               <div className="space-y-3">
                                   <div>
                                      <span className="text-xs text-gray-400 block">Competência</span>
                                      <span className="text-sm font-semibold text-gray-800">{filingSuggestions.competence}</span>
                                   </div>
                                   <div>
                                      <span className="text-xs text-gray-400 block">Classe</span>
                                      <span className="text-sm font-semibold text-gray-800">{filingSuggestions.class}</span>
                                   </div>
                                   <div>
                                      <span className="text-xs text-gray-400 block">Assunto</span>
                                      <span className="text-sm font-semibold text-gray-800">{filingSuggestions.subject}</span>
                                   </div>
                               </div>
                           </div>
                       )}
                       
                       {/* Refinement Card */}
                       <div className="bg-sky-50 rounded-lg shadow-sm border border-sky-100 p-4">
                           <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <RefreshCw size={14} /> Refinar com IA
                           </h4>
                           <textarea
                              className="w-full rounded-md border border-sky-200 p-2 text-sm focus:ring-2 focus:ring-sky-500 resize-none h-32 bg-white mb-2"
                              placeholder="Ex: Adicione um tópico sobre dano moral..."
                              value={refinementText}
                              onChange={(e) => setRefinementText(e.target.value)}
                           />
                           <Button 
                              onClick={handleRefine} 
                              disabled={!refinementText.trim() || isRefining}
                              isLoading={isRefining}
                              className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                           >
                              Aplicar Ajustes
                           </Button>
                           <div className="mt-2">
                             <button onClick={() => triggerAudioImport('refinement')} className="text-xs text-sky-600 hover:underline flex items-center justify-center w-full gap-1">
                                <Mic size={12} /> Ditar Ajuste
                             </button>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
        </div>
      );
  }

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

  // --- Render Wizard Steps (Inline Mode) ---
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
    // Determine logical steps based on mode
    const isUploadStep = mode === 'upload' && currentStep === 1;
    const isPartiesStep = (mode === 'upload' && currentStep === 2) || (mode !== 'upload' && currentStep === 1);
    const isFactsStep = (mode === 'upload' && currentStep === 3) || (mode !== 'upload' && currentStep === 2);
    const isRequestsStep = (mode === 'upload' && currentStep === 4) || (mode !== 'upload' && currentStep === 3);
    const isGenerateStep = (mode === 'upload' && currentStep === 5) || (mode !== 'upload' && currentStep === 4);

    if (isUploadStep) {
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-sky-50 border-2 border-dashed border-sky-200 rounded-lg p-6 text-center">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf, .txt, image/png, image/jpeg" />
                {isExtracting ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
                        <span className="text-sm font-medium text-sky-700">A IA está analisando e classificando seu documento...</span>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-2 animate-in fade-in">
                        <div className="bg-green-100 p-2 rounded-full"><FileCheck className="h-6 w-6 text-green-600" /></div>
                        <span className="text-sm font-medium text-green-700">Dados extraídos com sucesso! Revise abaixo.</span>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-sky-600 underline">Substituir arquivo</button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-sky-400" />
                        <h3 className="font-semibold text-gray-900">Upload de Documento Base</h3>
                        <p className="text-sm text-gray-500 max-w-sm">Envie petições iniciais, procurações, RGs ou contratos (Max 10MB).</p>
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="mt-2">Selecionar Arquivo</Button>
                    </div>
                )}
            </div>
            {formData.analyzedDocuments && formData.analyzedDocuments.length > 0 && (
                <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Documentos Analisados</h4>
                {formData.analyzedDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="bg-green-100 p-2 rounded-md text-green-700"><FileBadge size={20} /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                            <p className="text-xs font-bold text-juris-700 bg-juris-50 px-2 py-0.5 rounded-full inline-block mt-1">Tipo Identificado: {doc.docType}</p>
                            <p className="text-xs text-gray-500 mt-1 italic">{doc.summary}</p>
                        </div>
                    </div>
                ))}
                </div>
            )}
          </div>
        );
    }

    // ... (Steps 2, 3, 4 are identical to previous) ...
    if (isPartiesStep) {
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
             {/* ... Parties JSX ... */}
             <div className="border-b border-gray-100 pb-4 mb-2">
                 <h2 className="text-lg font-bold text-gray-800">Dados Iniciais (Partes)</h2>
                 <p className="text-sm text-gray-500">Informe quem são as partes envolvidas no processo.</p>
             </div>
             {/* ... (Plaintiffs and Defendants Inputs) ... */}
             <div className="space-y-4">
               {formData.plaintiffs.map((party, index) => (
                 <div key={party.id || index} className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 relative">
                    <span className="text-xs font-bold text-blue-300 absolute -top-2 left-2 bg-white px-2 border border-blue-100 rounded">Autor {index + 1}</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Input label="Nome Completo" value={party.name} onChange={(e) => updateParty('plaintiffs', party.id!, 'name', e.target.value)} />
                        <Input label="CPF / CNPJ" value={party.doc} onChange={(e) => updateParty('plaintiffs', party.id!, 'doc', e.target.value)} />
                    </div>
                 </div>
               ))}
            </div>
             {/* ... (Defendants) ... */}
             <div className="space-y-4 pt-4">
               {formData.defendants.map((party, index) => (
                 <div key={party.id || index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                    <span className="text-xs font-bold text-gray-400 absolute -top-2 left-2 bg-white px-2 border border-gray-200 rounded">Réu {index + 1}</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <Input label="Nome / Razão Social" value={party.name} onChange={(e) => updateParty('defendants', party.id!, 'name', e.target.value)} />
                        <Input label="CPF / CNPJ" value={party.doc} onChange={(e) => updateParty('defendants', party.id!, 'doc', e.target.value)} />
                    </div>
                 </div>
               ))}
            </div>
          </div>
        );
    }
    
    if (isFactsStep) {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                  <label className="block text-sm font-medium text-gray-700">Narrativa dos Fatos</label>
                  <textarea className="w-full h-64 rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-juris-500 text-sm leading-relaxed resize-none" placeholder="Descreva os fatos detalhadamente..." value={formData.facts} onChange={(e) => handleInputChange('facts', e.target.value)} />
                  <VoiceControls target="facts" />
              </div>
            </div>
        )
    }

    if (isRequestsStep) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pedidos (Liste um por linha)</label>
              <textarea className="w-full h-40 rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-juris-500 text-sm" placeholder="1. A condenação ao pagamento de R$ X..." value={formData.requests.join('\n')} onChange={(e) => handleInputChange('requests', e.target.value.split('\n'))} />
              <VoiceControls target="requests" />
            </div>
            </div>
        )
    }

    if (isGenerateStep) {
        if (generatedContent) {
          // Inline success view (shown when user closes Full Screen)
          return (
            <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center justify-center py-8 text-center">
               <div className="bg-green-100 p-4 rounded-full mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
               </div>
               <h3 className="text-2xl font-bold text-gray-900 mb-2">Petição Pronta!</h3>
               <p className="text-gray-500 mb-8 max-w-md">
                 Sua peça jurídica foi gerada. O que deseja fazer agora?
               </p>
               <div className="flex flex-col gap-3 w-full max-w-sm">
                  <Button size="lg" onClick={() => setIsFullScreen(true)}>
                     <Maximize2 size={18} className="mr-2" /> Revisar em Tela Cheia
                  </Button>
                  <Button variant="outline" onClick={handleSave} isLoading={isSaving}>
                     <Save size={18} className="mr-2" /> Salvar na Minha Lista
                  </Button>
                  <button onClick={handleBackToEditing} className="text-sm text-gray-400 hover:text-gray-600 mt-2 flex items-center justify-center gap-1">
                      <Edit3 size={14} /> Descartar e Voltar a Editar
                  </button>
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
    }
    return null;
  };

  return (
    <>
      <div className="max-w-4xl mx-auto transition-all duration-500">
        <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioFileImport} />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'upload' ? 'Criar Petição (Upload & Revisão)' : mode === 'scratch' ? 'Criar Petição (Manual)' : 'Criar Petição'}
          </h1>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-8 flex-1">
            {/* Oculta os passos quando a petição já estiver gerada para limpar a tela de sucesso */}
            {!generatedContent && renderStepIndicator()}
            <div className={generatedContent ? "h-auto" : "min-h-[400px]"}>
              {renderStepContent()}
            </div>
          </div>
          {(!generatedContent) && (
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between items-center">
              <Button variant="outline" onClick={() => { if (currentStep === 1) { setMode('selection'); } else { setCurrentStep(prev => Math.max(1, prev - 1)); } }} disabled={isGenerating}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={() => setCurrentStep(prev => Math.min(TOTAL_STEPS, prev + 1))} disabled={isGenerating}>
                Próximo <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};