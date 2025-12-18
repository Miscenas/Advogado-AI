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
  RefreshCw,
  Printer,
  Upload,
  FileCheck,
  Loader2,
  Plus,
  PenTool,
  FileUp,
  X,
  Mic,
  MicOff,
  Download,
  Edit3,
  Info,
  Trash2,
  Users,
  FileAudio,
  Lightbulb,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert
} from 'lucide-react';
import { generateLegalPetition, refineLegalPetition, extractDataFromDocument, suggestFilingMetadata, transcribeAudio } from '../../services/aiService';

interface WizardProps {
  userId: string;
  onCancel: () => void;
  onSuccess: () => void;
  usage: UsageLimit | null;
  accountStatus: string;
  isAdmin?: boolean;
}

type WizardMode = 'selection' | 'scratch' | 'upload';

const INITIAL_PARTY: PetitionParty = { id: '', name: '', type: 'pf', doc: '', rg: '', address: '', qualification: '' };

const INITIAL_DATA: PetitionFormData = {
  area: 'civel',
  actionType: '',
  jurisdiction: '',
  plaintiffs: [{...INITIAL_PARTY, id: 'p1'}],
  defendants: [{...INITIAL_PARTY, id: 'd1'}],
  facts: '',
  requests: [],
  evidence: 'Documental e testemunhal',
  value: 'R$ 0,00',
  analyzedDocuments: []
};

const AREAS_DO_DIREITO = [
  { value: 'civel', label: 'Cível' },
  { value: 'trabalhista', label: 'Trabalhista' },
  { value: 'familia', label: 'Família e Sucessões' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'previdenciario', label: 'Previdenciário' },
  { value: 'consumidor', label: 'Consumidor' },
  { value: 'tributario', label: 'Tributário' },
  { value: 'imobiliario', label: 'Imobiliário' },
  { value: 'digital', label: 'Digital' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'outros', label: 'Outros' }
];

export const PetitionWizard: React.FC<WizardProps> = ({ userId, onCancel, onSuccess, usage, accountStatus, isAdmin = false }) => {
  const [mode, setMode] = useState<WizardMode>('selection');
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PetitionFormData>(INITIAL_DATA);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [refinementText, setRefinementText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const STEPS = mode === 'upload' 
    ? ['Upload', 'Dados', 'Fatos', 'Pedidos', 'Gerar'] 
    : ['Dados', 'Fatos', 'Pedidos', 'Gerar'];

  useEffect(() => {
    if (isFullScreen && contentRef.current && generatedContent) {
        contentRef.current.innerHTML = generatedContent.replace(/<style([\s\S]*?)<\/style>/gi, '');
    }
  }, [isFullScreen, generatedContent]);

  useEffect(() => {
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  const handleInputChange = (field: keyof PetitionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsExtracting(true);
    setUploadSuccess(false);
    setGenError(null);
    
    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const base64Data = (event.target?.result as string).split(',')[1];
        if (!base64Data) throw new Error("Falha ao ler o arquivo.");

        const analysis = await extractDataFromDocument(base64Data, file.type);
        
        const aiPlaintiffs = (analysis.extractedData.plaintiffs || []).map((p: any) => ({...INITIAL_PARTY, ...p, id: 'pl-' + Math.random().toString(36).substr(2, 9)}));
        const aiDefendants = (analysis.extractedData.defendants || []).map((p: any) => ({...INITIAL_PARTY, ...p, id: 'df-' + Math.random().toString(36).substr(2, 9)}));

        setFormData(prev => ({
          ...prev,
          area: analysis.extractedData.area || prev.area,
          actionType: analysis.extractedData.actionType || prev.actionType,
          jurisdiction: analysis.extractedData.jurisdiction || prev.jurisdiction,
          facts: analysis.extractedData.facts || prev.facts,
          plaintiffs: aiPlaintiffs.length > 0 ? aiPlaintiffs : prev.plaintiffs,
          defendants: aiDefendants.length > 0 ? aiDefendants : prev.defendants,
          value: analysis.extractedData.value || prev.value,
          analyzedDocuments: [{ id: Math.random().toString(), fileName: file.name, docType: analysis.docType }]
        }));

        setIsExtracting(false);
        setUploadSuccess(true);
      } catch (error: any) {
        setIsExtracting(false);
        if (error.message?.includes("API_KEY_NOT_FOUND") || error.message?.includes("process is not defined") || error.message?.includes("apiKey")) {
           setGenError("API_KEY_MISSING");
        } else {
           alert("Erro na análise: " + (error.message || "Tente novamente."));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = (targetField: 'facts' | 'requests') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Seu navegador não suporta reconhecimento de voz.");
    if (isListening) { recognitionRef.current?.stop(); return; }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (targetField === 'facts') {
        setFormData(prev => ({ ...prev, facts: prev.facts + (prev.facts ? ' ' : '') + transcript }));
      } else {
        setFormData(prev => {
          const current = prev.requests.join('\n');
          return { ...prev, requests: (current + (current ? '\n' : '') + transcript).split('\n') };
        });
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const content = await generateLegalPetition(formData);
      setGeneratedContent(content);
      setIsFullScreen(true);
    } catch (error: any) { 
        if (error.message?.includes("API_KEY_NOT_FOUND") || error.message?.includes("process is not defined") || error.message?.includes("apiKey")) {
          setGenError("API_KEY_MISSING");
        } else {
          setGenError(error.message || "Erro na geração.");
        }
    } finally { 
        setIsGenerating(false); 
    }
  };

  const ErrorDisplay = () => (
    <div className="flex flex-col items-center gap-6 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-xl mx-auto animate-in zoom-in-95 text-center">
        <div className="bg-amber-100 p-4 rounded-full text-amber-600">
            <ShieldAlert size={48} />
        </div>
        <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Chave de API não configurada corretamente</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                No Vercel, o Vite não "enxerga" sua chave se ela tiver o prefixo <strong>VITE_</strong> no painel de ambiente, mas o código buscar por <strong>process.env.API_KEY</strong>.
            </p>
            
            <div className="space-y-4 text-left">
                <div className="p-5 rounded-3xl bg-indigo-50 border border-indigo-100 shadow-sm">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase mb-3 flex items-center gap-2">
                      <Info size={14}/> Guia de Correção no Vercel:
                    </h4>
                    <ol className="text-xs text-indigo-800 space-y-3 list-decimal list-inside font-medium">
                        <li>Vá no dashboard do seu projeto no **Vercel**.</li>
                        <li>Em **Settings > Environment Variables**, altere o nome de <code className="bg-white px-1 rounded border">VITE_API_KEY</code> para apenas <strong className="bg-white px-1 rounded border">API_KEY</strong>.</li>
                        <li>Salve a alteração.</li>
                        <li>Vá na aba **Deployments**, clique nos três pontinhos do último deploy e selecione **REDEPLOY**.</li>
                    </ol>
                </div>
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-800 font-bold">IMPORTANTE: Salvar a variável não basta. O "Redeploy" é obrigatório para aplicar a mudança no código do navegador.</p>
                </div>
            </div>
        </div>
        
        <div className="flex gap-3 w-full">
           <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => window.location.reload()}>Já fiz o Redeploy, Atualizar</Button>
           <Button className="flex-1 rounded-2xl bg-slate-900 h-12 shadow-lg" onClick={onCancel}>Sair do Assistente</Button>
        </div>
    </div>
  );

  const renderStep = () => {
    const step = STEPS[currentStep - 1];
    if (genError === "API_KEY_MISSING") return <ErrorDisplay />;

    switch (step) {
      case 'Upload':
        return (
          <div className="space-y-6 text-center py-10">
             <div className={`border-2 border-dashed rounded-[2.5rem] p-16 transition-all duration-500 ${uploadSuccess ? 'bg-emerald-50 border-emerald-200 shadow-inner' : 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf, .txt, image/*" />
                {isExtracting ? (
                    <div className="flex flex-col items-center gap-5">
                        <div className="relative">
                            <Loader2 className="h-16 w-16 text-indigo-600 animate-spin" />
                            <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-indigo-400 animate-pulse" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-lg">Processando Documento...</p>
                            <p className="text-sm text-slate-500">A IA está mapeando partes e fatos principais.</p>
                        </div>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                        <div className="bg-emerald-100 p-5 rounded-full text-emerald-600 shadow-lg shadow-emerald-100">
                            <CheckCircle size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Análise Concluída!</h3>
                        <p className="text-slate-500">Documento processado. Prossiga para revisar os dados.</p>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="mt-4 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-100">Substituir Arquivo</Button>
                    </div>
                ) : (
                    <>
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm inline-block mb-6 border border-slate-100">
                            <FileUp className="h-12 w-12 text-indigo-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Importação Inteligente</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-10">Envie um arquivo para que a IA preencha os dados do processo automaticamente.</p>
                        <Button className="h-16 px-12 rounded-2xl bg-indigo-600 text-lg shadow-2xl shadow-indigo-100 hover:scale-105 transition-transform" onClick={() => fileInputRef.current?.click()}>Escolher PDF ou Imagem</Button>
                    </>
                )}
             </div>
          </div>
        );
      case 'Gerar':
        return (
            <div className="text-center py-20 animate-in zoom-in-95">
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <Sparkles className="h-20 w-20 text-indigo-500 animate-pulse" />
                            <div className="absolute inset-0 bg-indigo-200 blur-3xl opacity-30 animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Redigindo Peça Jurídica...</h3>
                        <p className="text-sm text-slate-500">Organizando fundamentos e estruturando pedidos.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-slate-100 p-8 rounded-[3rem] inline-block mb-8 shadow-sm">
                            <Scale className="h-16 w-16 text-slate-900" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 mb-4">Minuta Pronta para Geração</h3>
                        <p className="text-slate-500 mb-10 text-lg max-w-md mx-auto">Nossa IA Sênior irá gerar o texto completo com base em todas as suas instruções.</p>
                        <Button size="lg" onClick={handleGenerate} className="px-14 h-16 text-xl rounded-2xl shadow-2xl bg-slate-900 hover:bg-black transition-all">
                           <Sparkles className="mr-3 h-6 w-6"/> Gerar Petição Final
                        </Button>
                    </>
                )}
            </div>
        );
      default:
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {step === 'Dados' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="w-full">
                          <label className="mb-2 block text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Área de Atuação</label>
                          <select className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm" value={formData.area} onChange={e => handleInputChange('area', e.target.value)}>
                            {AREAS_DO_DIREITO.map(area => (<option key={area.value} value={area.value}>{area.label}</option>))}
                          </select>
                        </div>
                        <Input label="Nomenclatura da Ação" value={formData.actionType} onChange={e => handleInputChange('actionType', e.target.value)} placeholder="Ex: Indenizatória" className="h-12 rounded-2xl" />
                    </div>
                    <Input label="Endereçamento (Jurisdição)" value={formData.jurisdiction} onChange={e => handleInputChange('jurisdiction', e.target.value)} placeholder="Ex: AO JUÍZO DA VARA CÍVEL..." className="h-12 rounded-2xl" />
                  </div>
                )}
                {step === 'Fatos' && (
                  <div className="space-y-6">
                     <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Descrição dos Fatos</label>
                     <div className="relative group">
                        <textarea className="w-full h-64 p-8 border border-slate-200 rounded-[2.5rem] focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner transition-all resize-none bg-slate-50/50" value={formData.facts} onChange={e => handleInputChange('facts', e.target.value)} placeholder="Narre os fatos detalhadamente..." />
                     </div>
                     <div className="flex gap-4 justify-center">
                        <button onClick={() => toggleRecording('facts')} className={`flex items-center gap-3 px-10 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
                           {isListening ? <MicOff size={22} /> : <Mic size={22} className="text-rose-500" />}
                           <span className="text-sm font-bold uppercase tracking-wide">{isListening ? 'Parar' : 'Ditar Fatos'}</span>
                        </button>
                     </div>
                  </div>
                )}
                {step === 'Pedidos' && (
                  <div className="space-y-6">
                     <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Relação de Pedidos</label>
                     <textarea className="w-full h-48 p-8 border border-slate-200 rounded-[2.5rem] focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner transition-all resize-none bg-slate-50/50" value={formData.requests.join('\n')} onChange={e => handleInputChange('requests', e.target.value.split('\n'))} placeholder="Liste os pedidos (ex: Tutela antecipada...)" />
                     <Input label="Valor da Causa" value={formData.value} onChange={e => handleInputChange('value', e.target.value)} placeholder="R$ 0,00" className="h-12 rounded-2xl" />
                  </div>
                )}
            </div>
        );
    }
  };

  if (isFullScreen && generatedContent) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-100 flex flex-col h-screen overflow-hidden">
         <div className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm shrink-0">
             <div className="flex items-center gap-4">
                <button onClick={() => setIsFullScreen(false)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-full transition-all hover:rotate-90"><X size={20}/></button>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Editor de Petição</h2>
             </div>
             <div className="flex gap-3">
                <Button variant="outline" onClick={() => window.print()} className="rounded-2xl h-12"><Printer size={18} className="mr-2"/> Imprimir</Button>
                <Button variant="outline" onClick={() => {
                    const blob = new Blob(['\ufeff', generatedContent], { type: 'application/msword' });
                    saveAs(blob, `Peticao_${formData.actionType || 'Juridica'}.doc`);
                }} className="rounded-2xl h-12"><Download size={18} className="mr-2"/> Word</Button>
                <Button onClick={async () => {
                    setIsSaving(true);
                    try {
                        await supabase.from('petitions').insert([{
                            user_id: userId, area: formData.area, action_type: formData.actionType,
                            content: generatedContent, plaintiff_name: formData.plaintiffs[0]?.name,
                            defendant_name: formData.defendants[0]?.name, created_at: new Date().toISOString()
                        }]);
                        onSuccess();
                    } catch (e) { alert("Erro ao salvar no sistema."); }
                    finally { setIsSaving(false); }
                }} isLoading={isSaving} className="rounded-2xl bg-slate-900 px-8 h-12 shadow-xl shadow-slate-200"><Save size={18} className="mr-2"/> Salvar e Sair</Button>
             </div>
         </div>
         <div className="flex-1 overflow-hidden flex">
             <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center bg-slate-200/50">
                 <div className="w-full max-w-[21cm] bg-white shadow-2xl rounded-sm p-[3cm_2cm_3cm_3cm] h-auto min-h-[29.7cm] border border-slate-200" contentEditable={true} suppressContentEditableWarning={true} onBlur={e => setGeneratedContent(e.currentTarget.innerHTML)} style={{ fontFamily: '"Times New Roman", serif', fontSize: '12pt', lineHeight: '1.5' }}>
                    <div dangerouslySetInnerHTML={{ __html: generatedContent }} />
                 </div>
                 <style>{`[contenteditable] h1, [contenteditable] h2, [contenteditable] h3 { text-align: center; text-transform: uppercase; margin: 18pt 0 12pt 0; font-weight: bold; } [contenteditable] p { text-align: justify; text-indent: 1.25cm; margin-bottom: 12pt; }`}</style>
             </div>
             <div className="w-96 p-8 bg-white border-l overflow-y-auto shrink-0 flex flex-col gap-6">
                <div className="bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 p-8 shadow-sm">
                   <h4 className="text-xs font-bold text-indigo-900 uppercase mb-4 flex items-center gap-2 tracking-widest"><RefreshCw size={14} className="animate-spin-slow"/> Refinar com IA</h4>
                   <textarea className="w-full h-40 rounded-2xl border border-indigo-200 p-4 text-sm mb-4 outline-none focus:ring-2 focus:ring-indigo-300 transition-all bg-white shadow-inner" placeholder="Instrua a IA sobre ajustes..." value={refinementText} onChange={(e) => setRefinementText(e.target.value)} />
                   <Button onClick={async () => {
                       if (!generatedContent || !refinementText) return;
                       setIsRefining(true);
                       try {
                           const res = await refineLegalPetition(generatedContent, refinementText);
                           setGeneratedContent(res);
                           setRefinementText('');
                       } catch (e) { alert("Erro no ajuste automático."); }
                       finally { setIsRefining(false); }
                   }} isLoading={isRefining} className="w-full h-14 bg-indigo-600 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700">Aplicar Ajuste</Button>
                </div>
             </div>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      {mode === 'selection' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button onClick={() => { setMode('scratch'); setCurrentStep(1); }} className="bg-white border-2 border-slate-100 p-12 rounded-[3.5rem] hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-50 transition-all h-[400px] flex flex-col items-center justify-center text-center group">
            <div className="bg-indigo-50 p-10 rounded-[2.5rem] group-hover:bg-indigo-100 transition-all group-hover:scale-110 mb-8 shadow-sm">
                <PenTool size={64} className="text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Nova Petição</h3>
            <p className="text-slate-500 mt-3 max-w-xs leading-relaxed">Narre os fatos livremente e deixe a IA estruturar a peça.</p>
          </button>
          
          <button onClick={() => { setMode('upload'); setCurrentStep(1); }} className="bg-white border-2 border-slate-100 p-12 rounded-[3.5rem] hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-50 transition-all h-[400px] flex flex-col items-center justify-center text-center group">
            <div className="bg-emerald-50 p-10 rounded-[2.5rem] group-hover:bg-emerald-100 transition-all group-hover:scale-110 mb-8 shadow-sm">
                <FileUp size={64} className="text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Análise de Documento</h3>
            <p className="text-slate-500 mt-3 max-w-xs leading-relaxed">Envie um PDF para extração automática de dados e fatos.</p>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
          <div className="bg-slate-50/80 backdrop-blur-md px-10 py-6 border-b flex justify-between items-center">
            <div className="flex gap-6 overflow-x-auto pb-1 no-scrollbar">
                {STEPS.map((s, idx) => (
                    <div key={s} className={`flex items-center gap-2 shrink-0 ${currentStep === idx + 1 ? 'text-slate-900 opacity-100' : 'text-slate-400 opacity-50'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter transition-all ${currentStep === idx + 1 ? 'bg-slate-900 text-white scale-110' : 'bg-slate-200 text-slate-500'}`}>{idx+1}</div>
                        <span className="hidden sm:inline text-[10px] uppercase font-black tracking-[0.2em]">{s}</span>
                    </div>
                ))}
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-900 transition-all bg-white p-3 rounded-full border border-slate-100 hover:rotate-90 shadow-sm"><X size={18}/></button>
          </div>
          
          <div className="p-12 min-h-[500px]">{renderStep()}</div>
          
          <div className="bg-slate-50/50 px-10 py-6 border-t flex justify-between items-center">
              <Button variant="outline" className="rounded-2xl px-10 h-12 font-bold" onClick={() => { if(currentStep===1) setMode('selection'); else setCurrentStep(prev=>prev-1); }}>Voltar</Button>
              {currentStep < STEPS.length && (
                  <Button className="rounded-2xl px-12 h-12 bg-slate-900 font-bold shadow-lg shadow-slate-200" onClick={() => setCurrentStep(prev=>prev+1)} disabled={mode === 'upload' && currentStep === 1 && !uploadSuccess && !isExtracting}>Avançar <ChevronRight size={18} className="ml-2"/></Button>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
