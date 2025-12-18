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
  ExternalLink
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
  const [cnjMetadata, setCnjMetadata] = useState<PetitionFilingMetadata | null>(null);
  
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

  useEffect(() => {
    if (isFullScreen && contentRef.current && generatedContent) {
        contentRef.current.innerHTML = generatedContent.replace(/<style([\s\S]*?)<\/style>/gi, '');
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

  const addParty = (type: 'plaintiffs' | 'defendants') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { ...INITIAL_PARTY, id: Math.random().toString(36).substr(2, 9) }]
    }));
  };

  const removeParty = (type: 'plaintiffs' | 'defendants', id: string) => {
    if (formData[type].length <= 1) return;
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(p => p.id !== id)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsExtracting(true);
    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const base64Data = (event.target?.result as string).split(',')[1];
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

        if (analysis.extractedData.cnjClass || analysis.extractedData.cnjSubject) {
            setCnjMetadata({
                competence: analysis.extractedData.jurisdiction || 'Não Identificada',
                class: analysis.extractedData.cnjClass || 'Petição Inicial',
                subject: analysis.extractedData.cnjSubject || 'Direito Civil'
            });
        }
        setIsExtracting(false);
        setUploadSuccess(true);
      } catch (error: any) {
        console.error("Erro no processamento:", error);
        setIsExtracting(false);
        
        const errorMessage = error.message || "";
        if (errorMessage.includes("API_KEY_MISSING")) {
           setGenError("A chave da Inteligência Artificial (API_KEY) não foi configurada no servidor. Por favor, adicione sua chave do Gemini nas variáveis de ambiente do deploy.");
        } else {
           alert("Erro na análise: " + (errorMessage || "Falha ao processar arquivo. Verifique sua conexão."));
        }
      }
    };

    reader.onerror = () => {
      setIsExtracting(false);
      alert("Erro ao ler o arquivo.");
    };

    reader.readAsDataURL(file);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'facts' | 'requests') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsTranscribing(true);
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
              const base64Data = (event.target?.result as string).split(',')[1];
              const transcription = await transcribeAudio(base64Data, files[0].type);
              if (targetField === 'facts') {
                  setFormData(prev => ({ ...prev, facts: prev.facts + (prev.facts ? '\n\n' : '') + transcription }));
              } else {
                  const currentRequests = formData.requests.join('\n');
                  const newRequests = (currentRequests + (currentRequests ? '\n' : '') + transcription).split('\n');
                  setFormData(prev => ({ ...prev, requests: newRequests }));
              }
              setIsTranscribing(false);
            } catch (err: any) {
              setIsTranscribing(false);
              alert("Erro na transcrição: " + (err.message || "Tente novamente."));
            }
        };
        reader.readAsDataURL(files[0]);
    } catch (error) {
        setIsTranscribing(false);
        alert("Erro ao ler áudio.");
    }
  };

  const toggleRecording = (targetField: 'facts' | 'requests') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Navegador sem suporte a voz.");
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
    setGenError(null);
    try {
      if (!cnjMetadata) setCnjMetadata(await suggestFilingMetadata(formData));
      const content = await generateLegalPetition(formData);
      setGeneratedContent(content);
      setIsFullScreen(true);
    } catch (error: any) { 
        setGenError(error.message || "Erro desconhecido ao gerar a peça.");
    } finally { 
        setIsGenerating(false); 
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !userId) return;
    setIsSaving(true);
    try {
      await supabase.from('petitions').insert([{
          user_id: userId, area: formData.area || 'civel', action_type: formData.actionType || 'Petição Inicial',
          content: generatedContent, plaintiff_name: formData.plaintiffs[0]?.name, defendant_name: formData.defendants[0]?.name, 
          analyzed_documents: formData.analyzedDocuments, created_at: new Date().toISOString()
      }]).select().single();
      alert("Peça salva com sucesso!");
      onSuccess(); 
    } catch (error) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleDownloadDoc = () => {
    if (!generatedContent) return;
    const cleanContent = generatedContent.replace(/<style([\s\S]*?)<\/style>/gi, '').trim();
    const blobContent = `<html><head><meta charset='utf-8'><style>body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; text-align: justify; } p { text-indent: 1.25cm; margin-bottom: 12pt; } h1, h2, h3 { text-align: center; font-weight: bold; text-transform: uppercase; margin: 18pt 0 12pt 0; }</style></head><body>${cleanContent}</body></html>`;
    const blob = new Blob(['\ufeff', blobContent], { type: 'application/msword' });
    saveAs(blob, `${formData.actionType || 'Peticao'}.doc`);
  };

  const handlePrint = () => {
    if (!generatedContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><style>@page { margin: 2.5cm 2cm 2.5cm 3cm; } body { font-family: "Times New Roman", serif; font-size: 12pt; } p { text-align: justify; text-indent: 1.25cm; } h1, h2, h3 { text-align: center; text-transform: uppercase; }</style></head><body>${generatedContent}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const STEPS = mode === 'upload' ? 
    ['Upload', 'Dados', 'Fatos', 'Pedidos', 'Gerar'] : 
    ['Dados', 'Fatos', 'Pedidos', 'Gerar'];

  const renderStep = () => {
    const step = STEPS[currentStep - 1];
    switch (step) {
      case 'Upload':
        return (
          <div className="space-y-6 text-center py-10">
             <div className={`border-2 border-dashed rounded-xl p-12 transition-colors ${uploadSuccess ? 'bg-green-50 border-green-200' : 'bg-sky-50 border-sky-200'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf, .txt, image/*" />
                {isExtracting ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 text-sky-600 animate-spin" />
                        <p className="font-bold text-sky-700">Analisando documento...</p>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-2">
                        <FileCheck className="h-16 w-16 text-green-600 mb-2" />
                        <h3 className="text-xl font-bold text-green-900">Análise Completa!</h3>
                        <p className="text-green-700">Dados e fatos extraídos.</p>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-sky-600 underline mt-4">Trocar Arquivo</button>
                    </div>
                ) : (
                    <>
                        <Upload className="h-16 w-16 text-sky-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900">Upload para Análise</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">Extrairemos CPFs, Nomes e Resumo dos Fatos do documento enviado.</p>
                        <Button variant="primary" onClick={() => fileInputRef.current?.click()}>Selecionar Documento</Button>
                    </>
                )}
             </div>
          </div>
        );
      case 'Dados':
        return (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm backdrop-blur-sm">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600"><Lightbulb size={20} /></div>
                <div>
                    <h4 className="text-sm font-bold text-amber-900 mb-0.5 tracking-tight">DICA: Preenchimento opcional.</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">Se você narrar os nomes no texto dos fatos, a IA irá qualificar as partes automaticamente.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="w-full">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Área do Direito</label>
                  <select className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-juris-500 transition-all shadow-sm cursor-pointer" value={formData.area} onChange={e => handleInputChange('area', e.target.value)}>
                    {AREAS_DO_DIREITO.map(area => (<option key={area.value} value={area.value}>{area.label}</option>))}
                  </select>
                </div>
                <Input label="Tipo de Ação" value={formData.actionType} onChange={e => handleInputChange('actionType', e.target.value)} placeholder="Indenizatória, Cobrança..." />
            </div>
            <Input label="Jurisdição" value={formData.jurisdiction} onChange={e => handleInputChange('jurisdiction', e.target.value)} placeholder="AO JUÍZO DA..." />
          </div>
        );
      case 'Fatos':
        return (
          <div className="space-y-6 animate-in fade-in">
             <label className="text-sm font-bold text-gray-700">Narrativa dos Fatos</label>
             <div className="relative group">
                <textarea className="w-full h-48 p-5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-juris-500 text-sm shadow-inner transition-all resize-none bg-slate-50/50" value={formData.facts} onChange={e => handleInputChange('facts', e.target.value)} placeholder="Relate o ocorrido com o máximo de detalhes..." />
                {isTranscribing && (<div className="absolute inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center rounded-2xl z-10"><div className="flex flex-col items-center gap-3"><Loader2 className="h-8 w-8 text-juris-600 animate-spin" /><span className="text-xs font-bold text-juris-900">TRANSCREVENDO...</span></div></div>)}
             </div>
             <div className="flex gap-4 justify-center pt-2">
                <input type="file" ref={audioInputRef} onChange={e => handleAudioUpload(e, 'facts')} className="hidden" accept="audio/*" />
                <button onClick={() => audioInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:-translate-y-0.5 transition-all"><FileAudio size={20} /><span className="text-sm font-bold uppercase">Importar Áudio</span></button>
                <button onClick={() => toggleRecording('facts')} className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-700'}`}>{isListening ? <MicOff size={20} /> : <Mic size={20} className="text-red-500" />}<span className="text-sm font-bold uppercase">{isListening ? 'Parar' : 'Ditar Fatos'}</span></button>
             </div>
          </div>
        );
      case 'Pedidos':
        return (
            <div className="space-y-6 animate-in fade-in">
               <label className="text-sm font-bold text-gray-700">Pedidos e Valor da Causa</label>
               <textarea className="w-full h-48 p-5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-juris-500 text-sm shadow-inner transition-all resize-none bg-slate-50/50" value={formData.requests.join('\n')} onChange={e => handleInputChange('requests', e.target.value.split('\n'))} placeholder="Liste os pedidos principais..." />
               <Input label="Valor da Causa (Estimado)" value={formData.value} onChange={e => handleInputChange('value', e.target.value)} />
            </div>
        );
      case 'Gerar':
        return (
            <div className="text-center py-20 animate-in zoom-in-95">
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-4"><Sparkles className="h-16 w-16 text-juris-500 animate-pulse" /><h3 className="text-2xl font-bold">Redigindo Peça de Excelência...</h3><p className="text-gray-500">Isso pode levar alguns segundos dependendo da complexidade.</p></div>
                ) : genError ? (
                    <div className="flex flex-col items-center gap-4 bg-red-50 p-8 rounded-[2.5rem] border border-red-100 max-w-lg mx-auto">
                        <AlertTriangle className="h-12 w-12 text-red-600" />
                        <h3 className="text-lg font-bold text-red-900">Configuração Necessária</h3>
                        <p className="text-sm text-red-700 text-center leading-relaxed">
                          {genError.includes("API_KEY_MISSING") 
                            ? "A chave de API do Gemini não foi configurada nas variáveis de ambiente do seu servidor. Vá ao painel do seu deploy (Vercel/Netlify) e adicione a variável 'API_KEY'." 
                            : genError}
                        </p>
                        
                        {genError.includes("API_KEY_MISSING") && (
                          <a href="https://aistudio.google.com/app/apikey" target="_blank" className="flex items-center gap-2 text-xs font-bold text-red-800 hover:underline mt-2 bg-white px-4 py-2 rounded-full shadow-sm">
                            <ExternalLink size={14}/> Obter chave gratuita
                          </a>
                        )}

                        <div className="flex gap-2 mt-6">
                           <Button variant="outline" onClick={() => setGenError(null)}>Tentar novamente</Button>
                           <Button onClick={onCancel}>Sair</Button>
                        </div>
                    </div>
                ) : (
                    <><Scale className="h-16 w-16 text-juris-900 mx-auto mb-6" /><h3 className="text-2xl font-bold mb-2">Petição Pronta para Geração</h3><p className="text-gray-500 mb-8">A IA irá fundamentar sua peça com base na narrativa fornecida.</p><Button size="lg" onClick={handleGenerate} className="px-12 h-14 text-lg shadow-xl"><Sparkles className="mr-2"/> Gerar Petição agora</Button></>
                )}
            </div>
        );
      default: return null;
    }
  };

  if (isFullScreen && generatedContent) {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-100 flex flex-col h-screen overflow-hidden">
         <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm shrink-0">
             <div className="flex items-center gap-4"><button onClick={() => setIsFullScreen(false)} className="p-2 text-gray-400 hover:text-gray-900"><X size={24}/></button><h2 className="text-lg font-bold text-juris-900">Visualização da Peça</h2></div>
             <div className="flex gap-2"><Button variant="outline" onClick={handlePrint}><Printer size={16} className="mr-2"/> Imprimir</Button><Button variant="outline" onClick={handleDownloadDoc}><Download size={16} className="mr-2"/> Word</Button><Button onClick={handleSave} isLoading={isSaving}><Save size={18} className="mr-2"/> Salvar no Sistema</Button></div>
         </div>
         <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
             <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col items-center bg-slate-200">
                 <div className="relative w-full max-w-[21cm]">
                   <div ref={contentRef} className="bg-white shadow-2xl p-[3cm_2cm_3cm_3cm] h-auto min-h-[29.7cm] outline-none border border-gray-100 mb-20 text-justify" contentEditable={true} suppressContentEditableWarning={true} onBlur={e => setGeneratedContent(e.currentTarget.innerHTML)} style={{ width: '100%', fontFamily: '"Times New Roman", serif', fontSize: '12pt', lineHeight: '1.5', boxSizing: 'border-box' }} />
                   <style>{`[contenteditable] h1, [contenteditable] h2, [contenteditable] h3 { text-align: center; text-transform: uppercase; margin: 18pt 0 12pt 0; font-weight: bold; outline: none; } [contenteditable] p { text-align: justify; text-indent: 1.25cm; margin-bottom: 12pt; margin-top: 0; outline: none; }`}</style>
                 </div>
             </div>
             <div className="w-full md:w-80 p-6 bg-white border-l overflow-y-auto shrink-0 flex flex-col gap-6 shadow-lg">
                <div className="bg-sky-50 rounded-xl border border-sky-100 p-5 shadow-sm">
                   <h4 className="text-xs font-bold text-sky-800 uppercase mb-4 flex items-center gap-2 font-bold"><RefreshCw size={14}/> Refinar Texto</h4>
                   <textarea className="w-full h-32 rounded-lg border border-sky-200 p-3 text-sm mb-3 outline-none focus:ring-2 focus:ring-sky-300 transition-all" placeholder="Ex: Adicione fundamentação sobre o Art. 186 do CC..." value={refinementText} onChange={e => setRefinementText(e.target.value)} />
                   <Button onClick={async () => { if (!generatedContent || !refinementText) return; setIsRefining(true); try { setGeneratedContent(await refineLegalPetition(generatedContent, refinementText)); setRefinementText(''); } catch (e) { alert("Erro ao refinar."); } finally { setIsRefining(false); } }} isLoading={isRefining} className="w-full bg-sky-600 hover:bg-sky-700">Aplicar Ajuste</Button>
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
          <button onClick={() => { setMode('scratch'); setCurrentStep(1); }} className="bg-white border-2 border-gray-100 p-10 rounded-2xl hover:border-juris-500 hover:shadow-xl transition-all h-80 flex flex-col items-center justify-center text-center group"><div className="bg-juris-50 p-6 rounded-full group-hover:bg-juris-100 transition-colors mb-6"><PenTool size={56} className="text-juris-600" /></div><h3 className="text-2xl font-bold text-gray-900">Petição do Zero</h3><p className="text-gray-500 mt-2 max-w-xs">Narre os fatos e a IA redigirá a peça completa para você.</p></button>
          <button onClick={() => { setMode('upload'); setCurrentStep(1); }} className="bg-white border-2 border-gray-100 p-10 rounded-2xl hover:border-sky-500 hover:shadow-xl transition-all h-80 flex flex-col items-center justify-center text-center group"><div className="bg-sky-50 p-6 rounded-full group-hover:bg-sky-100 transition-colors mb-6"><FileUp size={56} className="text-sky-600" /></div><h3 className="text-2xl font-bold text-gray-900">Analisar Documento</h3><p className="text-gray-500 mt-2 max-w-xs">Envie um documento para extração automática de dados.</p></button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-8 py-4 border-b flex justify-between items-center"><div className="flex gap-4">{(mode === 'upload' ? ['Upload', 'Dados', 'Fatos', 'Pedidos', 'Gerar'] : ['Dados', 'Fatos', 'Pedidos', 'Gerar']).map((s, idx) => (<div key={s} className={`flex items-center gap-2 ${currentStep === idx + 1 ? 'text-juris-900 font-bold' : idx + 1 < currentStep ? 'text-green-500' : 'text-gray-400'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${currentStep === idx + 1 ? 'bg-juris-900 text-white shadow-md' : idx + 1 < currentStep ? 'bg-green-100' : 'bg-gray-100'}`}>{idx+1 < currentStep ? <CheckCircle size={12}/> : idx+1}</div><span className="hidden sm:inline text-xs uppercase font-bold tracking-wider">{s}</span></div>))}</div><button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-2"><X size={20}/></button></div>
          <div className="p-8 min-h-[500px]">{renderStep()}</div>
          <div className="bg-gray-50 px-8 py-4 border-t flex justify-between"><Button variant="outline" onClick={() => { if(currentStep===1) setMode('selection'); else setCurrentStep(prev=>prev-1); }}>Voltar</Button>{currentStep < STEPS.length && <Button onClick={() => setCurrentStep(prev=>prev+1)} disabled={mode === 'upload' && currentStep === 1 && !uploadSuccess}>Próximo <ChevronRight size={16}/></Button>}</div>
        </div>
      )}
    </div>
  );
};