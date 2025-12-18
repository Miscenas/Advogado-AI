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
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isListening, setIsListening] = useState(false);
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
    if (isFullScreen && contentRef.current && generatedContent) {
        if (!contentRef.current.innerHTML || contentRef.current.innerHTML === '<br>') {
            contentRef.current.innerHTML = generatedContent;
        }
    }
  }, [isFullScreen, generatedContent]);

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
    setIsExtracting(true);
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = (event.target?.result as string).split(',')[1];
            const analysis = await extractDataFromDocument(base64Data, file.type);
            setFormData(prev => {
              const newPlaintiffs = analysis.extractedData.plaintiffs?.map((p: any) => ({...p, id: Math.random().toString()})) || [];
              const newDefendants = analysis.extractedData.defendants?.map((p: any) => ({...p, id: Math.random().toString()})) || [];
              return {
                ...prev,
                area: analysis.extractedData.area || prev.area,
                actionType: analysis.extractedData.actionType ? `Contestação em ${analysis.extractedData.actionType}` : prev.actionType,
                jurisdiction: analysis.extractedData.jurisdiction || prev.jurisdiction,
                facts: `RESUMO DA INICIAL:\n${analysis.summary || ''}\n\n${analysis.extractedData.facts || ''}`,
                plaintiffs: newPlaintiffs.length > 0 ? newPlaintiffs : prev.plaintiffs,
                defendants: newDefendants.length > 0 ? newDefendants : prev.defendants,
                analyzedDocuments: [{ id: Math.random().toString(), fileName: file.name, docType: analysis.docType }]
              };
            });
            setIsExtracting(false);
            setUploadSuccess(true);
        };
        reader.readAsDataURL(file);
    } catch (error) {
        setIsExtracting(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'facts' | 'requests') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsTranscribing(true);
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = (event.target?.result as string).split(',')[1];
            const transcription = await transcribeAudio(base64Data, files[0].type);
            if (targetField === 'facts') {
                setFormData(prev => ({ ...prev, facts: prev.facts + (prev.facts ? '\n\n' : '') + transcription }));
            } else {
                const current = formData.requests.join('\n');
                setFormData(prev => ({ ...prev, requests: (current + (current ? '\n' : '') + transcription).split('\n') }));
            }
            setIsTranscribing(false);
        };
        reader.readAsDataURL(files[0]);
    } catch (error) {
        setIsTranscribing(false);
        alert("Erro ao transcrever áudio.");
    }
  };

  const toggleRecording = (targetField: 'facts' | 'requests') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Sem suporte a voz.");
    if (isListening) { recognitionRef.current?.stop(); return; }
    
    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.onresult = (e: any) => {
        const text = e.results[e.results.length - 1][0].transcript;
        if (targetField === 'facts') {
            setFormData(prev => ({ ...prev, facts: prev.facts + ' ' + text }));
        } else {
            setFormData(prev => {
                const current = prev.requests.join('\n');
                return { ...prev, requests: (current + ' ' + text).split('\n') };
            });
        }
    };
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const content = await generateLegalDefense(formData);
      setGeneratedContent(content);
      setIsFullScreen(true);
    } catch (error) {
      alert("Erro na geração.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !userId) return;
    setIsSaving(true);
    try {
        const { error } = await supabase.from('petitions').insert([{
            user_id: userId,
            area: formData.area || 'civel',
            action_type: formData.actionType || 'Contestação',
            content: generatedContent,
            created_at: new Date().toISOString(),
            plaintiff_name: formData.plaintiffs[0]?.name || 'Polo Ativo',
            defendant_name: formData.defendants[0]?.name || 'Polo Passivo',
            analyzed_documents: formData.analyzedDocuments || [],
            filed: false
        }]).select().single();

        if(error) throw error;
        alert("Contestação salva com sucesso!");
        onSuccess();
    } catch(e: any) { alert("Erro ao salvar: " + e.message); } finally { setIsSaving(false); }
  };

  const handleDownloadDoc = () => {
    if (!generatedContent) return;
    const blob = new Blob(['\ufeff', `<html><body>${generatedContent}</body></html>`], { type: 'application/msword' });
    saveAs(blob, `Contestacao.doc`);
  };

  const handlePrint = () => {
      const w = window.open('','_blank');
      w?.document.write(`<html><body>${generatedContent}</body></html>`);
      w?.document.close();
      setTimeout(()=>w?.print(), 500);
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
        return (
          <div className="space-y-6 text-center py-10">
             <div className={`border-2 border-dashed rounded-xl p-12 transition-colors ${uploadSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf, .txt, image/*" />
                {isExtracting ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 text-red-600 animate-spin" />
                        <p className="font-bold text-red-700">Analisando peça adversa e extraindo Fatos/Resumo...</p>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-2">
                        <FileCheck className="h-16 w-16 text-green-600 mb-2" />
                        <h3 className="text-xl font-bold text-green-900">Peça Analisada!</h3>
                        <p className="text-green-700">Dados e <strong>Resumo da Inicial</strong> extraídos para contestação.</p>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-red-600 underline mt-4">Trocar Arquivo</button>
                    </div>
                ) : (
                    <>
                        <ShieldAlert className="h-16 w-16 text-red-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900">Upload e Análise de Fatos</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">Envie a Inicial ou Sentença. Extrairemos os dados e o <strong>Resumo dos Fatos</strong> para gerar sua defesa.</p>
                        <Button variant="danger" onClick={() => fileInputRef.current?.click()}>Selecionar Documento</Button>
                    </>
                )}
             </div>
          </div>
        );
    }
    if (currentStep === 2) {
        return (
          <div className="space-y-8 animate-in fade-in">
             <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                 <h2 className="text-sm font-bold text-blue-900 mb-2">SEU CLIENTE (RÉU)</h2>
                 {formData.defendants.map((party) => (
                    <div key={party.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        <Input value={party.name} onChange={(e) => updateParty('defendants', party.id!, 'name', e.target.value)} placeholder="Nome" />
                        <Input value={party.doc} onChange={(e) => updateParty('defendants', party.id!, 'doc', e.target.value)} placeholder="CPF/CNPJ" />
                    </div>
                 ))}
             </div>
             <div className="bg-red-50 p-4 rounded-md border border-red-200">
                 <h2 className="text-sm font-bold text-red-900 mb-2">PARTE CONTRÁRIA (AUTOR)</h2>
                 {formData.plaintiffs.map((party) => (
                    <div key={party.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        <Input value={party.name} onChange={(e) => updateParty('plaintiffs', party.id!, 'name', e.target.value)} placeholder="Nome" />
                        <Input value={party.doc} onChange={(e) => updateParty('plaintiffs', party.id!, 'doc', e.target.value)} placeholder="CPF/CNPJ" />
                    </div>
                 ))}
             </div>
          </div>
        );
    }
    if (currentStep === 3) {
        return (
          <div className="space-y-6 animate-in fade-in">
              <div>
                <label className="text-sm font-bold text-gray-700">Tese de Defesa</label>
                <p className="text-xs text-gray-500 mb-2">Desenvolva a fundamentação jurídica de defesa.</p>
              </div>
              <div className="relative">
                <textarea 
                  className="w-full h-48 p-5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 text-sm shadow-inner transition-all resize-none bg-red-50/10" 
                  value={formData.facts} 
                  onChange={(e) => handleInputChange('facts', e.target.value)} 
                  placeholder="Escreva os argumentos de defesa ou use as ferramentas de voz abaixo..." 
                />
                {isTranscribing && (
                   <div className="absolute inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center rounded-2xl z-10">
                      <div className="flex flex-col items-center gap-3">
                         <div className="relative">
                            <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
                            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-red-400 animate-pulse" />
                         </div>
                         <span className="text-xs font-bold text-red-900 tracking-tight">TRANSCREVENDO ÁUDIO...</span>
                      </div>
                   </div>
                )}
              </div>
              <div className="flex gap-4 justify-center pt-2">
                 <input type="file" ref={audioInputRef} onChange={e => handleAudioUpload(e, 'facts')} className="hidden" accept="audio/*" />
                 <button 
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isTranscribing}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                 >
                    <FileAudio size={20} className="drop-shadow-sm" />
                    <span className="text-sm font-bold tracking-wide uppercase">Importar Áudio</span>
                 </button>
                 <button 
                    onClick={() => toggleRecording('facts')}
                    disabled={isTranscribing}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                      isListening 
                      ? 'bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 animate-pulse text-white shadow-rose-500/40' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                 >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} className="text-rose-500" />}
                    <span className="text-sm font-bold tracking-wide uppercase">
                      {isListening ? 'Parar Agora' : 'Ditar Tese'}
                    </span>
                 </button>
              </div>
          </div>
        );
    }
    if (currentStep === 4) {
         return (
          <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-gray-700">Pedidos da Contestação</label>
                <p className="text-xs text-gray-500 mb-2">Descreva os pedidos de improcedência.</p>
              </div>
              <div className="relative">
                <textarea 
                  className="w-full h-48 p-5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 text-sm shadow-inner transition-all resize-none bg-red-50/10" 
                  value={formData.requests.join('\n')} 
                  onChange={(e) => handleInputChange('requests', e.target.value.split('\n'))} 
                  placeholder="Liste os pedidos defensivos..." 
                />
                {isTranscribing && (
                   <div className="absolute inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center rounded-2xl z-10">
                      <div className="flex flex-col items-center gap-3">
                         <div className="relative">
                            <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
                            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-red-400 animate-pulse" />
                         </div>
                         <span className="text-xs font-bold text-red-900 tracking-tight">ANALISANDO FALA...</span>
                      </div>
                   </div>
                )}
              </div>
              <div className="flex gap-4 justify-center">
                 <input type="file" ref={audioInputRef} onChange={e => handleAudioUpload(e, 'requests')} className="hidden" accept="audio/*" />
                 <button 
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isTranscribing}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                 >
                    <FileAudio size={20} className="drop-shadow-sm" />
                    <span className="text-sm font-bold tracking-wide uppercase">Importar Áudio</span>
                 </button>
                 <button 
                    onClick={() => toggleRecording('requests')}
                    disabled={isTranscribing}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                      isListening 
                      ? 'bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 animate-pulse text-white shadow-rose-500/40' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                 >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} className="text-rose-500" />}
                    <span className="text-sm font-bold tracking-wide uppercase">
                      {isListening ? 'Parar' : 'Ditar Pedidos'}
                    </span>
                 </button>
              </div>
          </div>
        );
    }
    if (currentStep === 5) {
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4">
                 <Loader2 className="h-12 w-12 text-red-600 animate-spin" />
                 <h3 className="text-xl font-bold">Gerando Contestação Técnica...</h3>
              </div>
            ) : (
              <>
                <ShieldCheck className="h-16 w-16 text-red-800 mb-4" />
                <h3 className="text-xl font-bold mb-8">Pronto para gerar a defesa técnica.</h3>
                <Button size="lg" onClick={handleGenerate} className="bg-red-700 hover:bg-red-800">
                  <Sparkles className="mr-2" /> Gerar Contestação
                </Button>
              </>
            )}
          </div>
        );
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><ShieldAlert className="text-red-600" /> Contestação</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-8">{renderStepContent()}</div>
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 1}>Voltar</Button>
              <Button onClick={() => setCurrentStep(prev => prev + 1)} disabled={currentStep === 5}>Próximo</Button>
          </div>
        </div>
    </div>
  );
};