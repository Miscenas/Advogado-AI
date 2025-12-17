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
               alert(`⚠️ Arquivo não identificado como petição.\n\nPor favor, preencha manualmente.`);
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
    } catch (error) { alert("Erro na geração."); } finally { setIsGenerating(false); }
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
             alert(`Limite do plano Gratuito atingido.`);
             return;
        }
    }

    setIsSaving(true);
    try {
      const pName = formData.plaintiffs.map(p => p.name).join(', ');
      const dName = formData.defendants.map(d => d.name).join(', ');
      await supabase.from('petitions').insert([{
          user_id: userId, area: formData.area, action_type: formData.actionType || 'Petição IA', content: generatedContent, created_at: new Date().toISOString(), plaintiff_name: pName, defendant_name: dName, analyzed_documents: formData.analyzedDocuments 
      }]);
      alert("Salvo com sucesso!");
      onSuccess();
    } catch (error) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleDownloadDoc = () => {
    if (!generatedContent) return;
    const blob = new Blob(['\ufeff', `<html><body>${generatedContent}</body></html>`], { type: 'application/msword' });
    saveAs(blob, `Peticao_${new Date().toISOString()}.doc`);
  };

  const toggleRecording = (target: 'facts' | 'requests' | 'refinement') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Navegador sem suporte.");
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    setListeningTarget(target);
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR'; recognition.continuous = true;
    recognition.onresult = (event: any) => {
      let text = ''; for (let i = event.resultIndex; i < event.results.length; ++i) if (event.results[i].isFinal) text += event.results[i][0].transcript;
      if (text) {
          if (target === 'facts') handleInputChange('facts', formData.facts + ' ' + text);
          else if (target === 'refinement') setRefinementText(refinementText + ' ' + text);
      }
    };
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  if (isFullScreen && generatedContent) {
      return (
        <div className="fixed inset-0 z-[200] bg-gray-100 flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
               <div className="flex items-center gap-4">
                  <button onClick={() => setIsFullScreen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={24} /></button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Scale className="text-juris-600 h-5 w-5" /> Revisão da Peça</h2>
                    <p className="text-xs text-gray-500">Documento pronto para protocolo</p>
                  </div>
               </div>
               <div className="flex gap-2">
                   <Button variant="outline" onClick={handleDownloadDoc} className="hidden sm:flex items-center gap-2"><Download size={16} /> Word</Button>
                   <Button onClick={handleSave} isLoading={isSaving} className="flex items-center gap-2 px-6 shadow-lg shadow-juris-900/20"><Save size={18} /> Salvar Petição</Button>
               </div>
           </div>

           <div className="flex-1 overflow-y-auto p-8 relative">
               <div className="w-full max-w-[1400px] mx-auto flex gap-8 items-start justify-center">
                   <div 
                      ref={contentRef}
                      className="flex-shrink-0 bg-white shadow-2xl p-[3cm_2cm_2cm_3cm] text-black focus:outline-none"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => setGeneratedContent(e.currentTarget.innerHTML)}
                      style={{ width: '21cm', minHeight: '29.7cm', fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5' }}
                   />

                   <div className="w-80 hidden xl:flex flex-col gap-4 sticky top-0">
                       {/* FILING SUGGESTION CARD */}
                       {filingSuggestions && (
                           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Archive size={14} /> Sugestão de Protocolo
                               </h4>
                               <div className="space-y-4">
                                   <div>
                                      <span className="text-xs text-gray-400 block">Competência Sugerida</span>
                                      <span className="text-sm font-semibold text-gray-800 leading-tight block">{filingSuggestions.competence}</span>
                                   </div>
                                   <div>
                                      <span className="text-xs text-gray-400 block">Classe / Assunto</span>
                                      <span className="text-sm text-gray-700 block">{filingSuggestions.class} - {filingSuggestions.subject}</span>
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
                                           <p className="text-[10px] text-gray-400 mt-2 text-center">O link abrirá em uma nova aba para você realizar o peticionamento.</p>
                                       </div>
                                   )}
                               </div>
                           </div>
                       )}
                       
                       <div className="bg-sky-50 rounded-lg shadow-sm border border-sky-100 p-4">
                           <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <RefreshCw size={14} /> Ajustar com IA
                           </h4>
                           <textarea
                              className="w-full rounded-md border border-sky-200 p-2 text-sm h-32 mb-2"
                              placeholder="Ex: Reforce o pedido de liminar..."
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

  return (
    <div className="max-w-4xl mx-auto py-8">
      {mode === 'selection' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => setMode('scratch')} className="flex flex-col items-center p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-juris-500 h-64 justify-center">
            <PenTool size={32} className="text-juris-600 mb-4" />
            <h3 className="text-xl font-bold">Petição do Zero</h3>
          </button>
          <button onClick={() => setMode('upload')} className="flex flex-col items-center p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-sky-500 h-64 justify-center">
            <FileUp size={32} className="text-sky-600 mb-4" />
            <h3 className="text-xl font-bold">Análise de Arquivo</h3>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            {currentStep === 1 && mode === 'upload' && (
              <div className="bg-sky-50 border-2 border-dashed border-sky-200 rounded-lg p-6 text-center">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <Upload className="h-8 w-8 text-sky-400 mx-auto mb-2" />
                <h3 className="font-semibold">Upload de Documento</h3>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="mt-2" isLoading={isExtracting}>Selecionar Arquivo</Button>
              </div>
            )}
            
            {((currentStep === 1 && mode === 'scratch') || (currentStep === 2 && mode === 'upload')) && (
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <Input label="Área" value={formData.area} onChange={(e) => handleInputChange('area', e.target.value)} />
                      <Input label="Ação" value={formData.actionType} onChange={(e) => handleInputChange('actionType', e.target.value)} />
                  </div>
                  <Input label="Foro / Jurisdição" placeholder="Ex: Comarca de São Paulo/SP" value={formData.jurisdiction} onChange={(e) => handleInputChange('jurisdiction', e.target.value)} />
               </div>
            )}

            {currentStep === TOTAL_STEPS && !generatedContent && (
               <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-juris-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold">Tudo pronto!</h3>
                  <Button size="lg" onClick={handleGenerate} isLoading={isGenerating} className="mt-6">Gerar Minuta de Petição</Button>
               </div>
            )}
          </div>
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between">
            <Button variant="outline" onClick={() => { if (currentStep === 1) setMode('selection'); else setCurrentStep(currentStep - 1); }}>Voltar</Button>
            {currentStep < TOTAL_STEPS && <Button onClick={() => setCurrentStep(currentStep + 1)}>Próximo</Button>}
          </div>
        </div>
      )}
    </div>
  );
};