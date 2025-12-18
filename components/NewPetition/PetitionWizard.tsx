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
  Lightbulb
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
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Data = (event.target?.result as string).split(',')[1];
            const analysis = await extractDataFromDocument(base64Data, files[0].type);
            
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
              analyzedDocuments: [{ id: Math.random().toString(), fileName: files[0].name, docType: analysis.docType }]
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
        };
        reader.readAsDataURL(files[0]);
    } catch (error) { setIsExtracting(false); }
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
                const currentRequests = formData.requests.join('\n');
                const newRequests = (currentRequests + (currentRequests ? '\n' : '') + transcription).split('\n');
                setFormData(prev => ({ ...prev, requests: newRequests }));
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
      if (!cnjMetadata) setCnjMetadata(await suggestFilingMetadata(formData));
      const content = await generateLegalPetition(formData);
      setGeneratedContent(content);
      setIsFullScreen(true);
    } catch (error) { alert("Erro ao gerar."); } finally { setIsGenerating(false); }
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
      alert("Salvo com sucesso!");
      onSuccess(); 
    } catch (error) { alert("Erro ao salvar."); } finally { setIsSaving(false); }
  };

  const handleDownloadDoc = () => {
    if (!generatedContent) return;
    
    // Limpeza profunda para evitar que tags HTML sujem o Word
    const cleanContent = generatedContent
        .replace(/<style([\s\S]*?)<\/style>/gi, '')
        .replace(/<html([\s\S]*?)>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<body([\s\S]*?)>/gi, '')
        .replace(/<\/body>/gi, '')
        .replace(/<!DOCTYPE([\s\S]*?)>/gi, '')
        .trim();

    // Template Microsoft Word com margens judiciais oficiais (3cm esquerda, 2cm demais)
    const blobContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          @page Section1 { 
            size: 21cm 29.7cm; 
            margin: 2cm 2cm 2cm 3cm; /* Topo, Direita, Baixo, Esquerda (Padrao Judiciário) */
            mso-header-margin: 35.4pt; 
            mso-footer-margin: 35.4pt; 
            mso-paper-source: 0; 
          }
          div.Section1 { page: Section1; }
          body { 
            font-family: "Times New Roman", serif; 
            font-size: 12pt; 
            line-height: 1.5; 
            text-align: justify; 
            color: #000;
          }
          p { 
            margin: 0; 
            margin-bottom: 12pt; 
            text-indent: 1.25cm; /* Recuo oficial de parágrafo */
            text-align: justify; 
            line-height: 1.5;
          }
          h1, h2, h3 { 
            text-align: center; 
            font-weight: bold; 
            text-transform: uppercase; 
            margin: 18pt 0 12pt 0; 
            text-indent: 0; 
            font-size: 12pt;
          }
          li { text-align: justify; margin-bottom: 6pt; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${cleanContent}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', blobContent], { type: 'application/msword' });
    const fileName = `${formData.actionType || 'Peticao'}_${new Date().getTime()}.doc`;
    saveAs(blob, fileName);
  };

  const handlePrint = () => {
    if (!generatedContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { margin: 2.5cm 2cm 2.5cm 3cm; } 
            body { 
              font-family: "Times New Roman", serif; 
              padding: 0; 
              margin: 0; 
              line-height: 1.5; 
              font-size: 12pt;
              color: #000;
            } 
            p { text-align: justify; text-indent: 1.25cm; margin-bottom: 12pt; margin-top: 0; } 
            h1, h2, h3 { text-align: center; text-transform: uppercase; font-weight: bold; margin: 18pt 0 12pt 0; text-indent: 0; }
            .print-container { padding: 2.5cm 2cm 2.5cm 3cm; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${generatedContent.replace(/<style([\s\S]*?)<\/style>/gi, '')}
          </div>
        </body>
      </html>
    `);
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
                        <p className="font-bold text-sky-700">Analisando documento e extraindo Fatos/Resumo...</p>
                    </div>
                ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-2">
                        <FileCheck className="h-16 w-16 text-green-600 mb-2" />
                        <h3 className="text-xl font-bold text-green-900">Análise Completa!</h3>
                        <p className="text-green-700">Dados das partes, classificação e <strong>Resumo dos Fatos</strong> identificados.</p>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-sky-600 underline mt-4">Trocar Arquivo</button>
                    </div>
                ) : (
                    <>
                        <Upload className="h-16 w-16 text-sky-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900">Upload e Análise de Fatos</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">Extrairemos CPFs, Nomes, Classe, Assunto e um <strong>Resumo Detalhado dos Fatos</strong> do seu documento.</p>
                        <Button variant="primary" onClick={() => fileInputRef.current?.click()}>Selecionar Documento</Button>
                    </>
                )}
             </div>
          </div>
        );
      case 'Dados':
        return (
          <div className="space-y-8 animate-in fade-in">
            {/* Aviso iOS Style para Dados Opcionais */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm backdrop-blur-sm">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                    <Lightbulb size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-amber-900 mb-0.5 tracking-tight">DICA: O preenchimento detalhado é opcional.</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">Você pode narrar os dados das partes (nomes, documentos, endereços) diretamente no passo de <strong>"Fatos"</strong>. A IA organizará tudo no cabeçalho automaticamente.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="w-full">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Área do Direito</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-juris-500 transition-all shadow-sm cursor-pointer"
                    value={formData.area} 
                    onChange={e => handleInputChange('area', e.target.value)}
                  >
                    {AREAS_DO_DIREITO.map(area => (
                      <option key={area.value} value={area.value}>{area.label}</option>
                    ))}
                  </select>
                </div>
                <Input label="Tipo de Ação" value={formData.actionType} onChange={e => handleInputChange('actionType', e.target.value)} placeholder="Ex: Ação de Cobrança, Indenizatória..." />
            </div>
            <Input label="Jurisdição" value={formData.jurisdiction} onChange={e => handleInputChange('jurisdiction', e.target.value)} placeholder="Ex: AO JUÍZO DO FORO CENTRAL..." />
            
            <div className="space-y-8 pt-6 border-t">
               <div className="flex items-center justify-between">
                 <h4 className="font-bold text-sm text-blue-800 flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                   <Users size={16}/> POLO ATIVO
                 </h4>
                 <Button variant="ghost" size="sm" onClick={() => addParty('plaintiffs')} className="text-blue-600 hover:text-blue-800 font-bold">
                   <Plus size={14} className="mr-1"/> Adicionar
                 </Button>
               </div>
               
               <div className="grid gap-6">
                 {formData.plaintiffs.map(p => (
                   <div key={p.id} className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100 border-l-4 border-l-blue-500 relative group shadow-sm">
                      <button onClick={() => removeParty('plaintiffs', p.id!)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-md border border-red-100 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Trash2 size={16}/>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5"><Input label="Nome Completo" placeholder="Nome" value={p.name} onChange={e => updateParty('plaintiffs', p.id!, 'name', e.target.value)} /></div>
                        <div className="md:col-span-3"><Input label="CPF/CNPJ" placeholder="Doc" value={p.doc} onChange={e => updateParty('plaintiffs', p.id!, 'doc', e.target.value)} /></div>
                        <div className="md:col-span-2"><Input label="RG" placeholder="RG" value={p.rg} onChange={e => updateParty('plaintiffs', p.id!, 'rg', e.target.value)} /></div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                          <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={p.type} onChange={e => updateParty('plaintiffs', p.id!, 'type', e.target.value as any)}>
                            <option value="pf">P. Física</option>
                            <option value="pj">P. Jurídica</option>
                          </select>
                        </div>
                        <div className="md:col-span-12">
                          <Input label="Qualificação Completa (Estado Civil, Profissão, Endereço)" placeholder="Nacionalidade, estado civil, profissão, residente e domiciliado em..." value={p.qualification} onChange={e => updateParty('plaintiffs', p.id!, 'qualification', e.target.value)} />
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
               
               <div className="flex items-center justify-between pt-6 border-t">
                 <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                   <Users size={16}/> POLO PASSIVO
                 </h4>
                 <Button variant="ghost" size="sm" onClick={() => addParty('defendants')} className="text-slate-600 hover:text-slate-800 font-bold">
                   <Plus size={14} className="mr-1"/> Adicionar
                 </Button>
               </div>

               <div className="grid gap-6">
                 {formData.defendants.map(d => (
                   <div key={d.id} className="bg-slate-50/30 p-5 rounded-2xl border border-slate-200 border-l-4 border-l-slate-500 relative group shadow-sm">
                      <button onClick={() => removeParty('defendants', d.id!)} className="absolute -top-2 -right-2 bg-white text-slate-400 p-1.5 rounded-full shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Trash2 size={16}/>
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5"><Input label="Nome Completo" placeholder="Nome" value={d.name} onChange={e => updateParty('defendants', d.id!, 'name', e.target.value)} /></div>
                        <div className="md:col-span-3"><Input label="CPF/CNPJ" placeholder="Doc" value={d.doc} onChange={e => updateParty('defendants', d.id!, 'doc', e.target.value)} /></div>
                        <div className="md:col-span-2"><Input label="RG" placeholder="RG" value={d.rg} onChange={e => updateParty('defendants', d.id!, 'rg', e.target.value)} /></div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                          <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={d.type} onChange={e => updateParty('defendants', d.id!, 'type', e.target.value as any)}>
                            <option value="pf">P. Física</option>
                            <option value="pj">P. Jurídica</option>
                          </select>
                        </div>
                        <div className="md:col-span-12">
                          <Input label="Qualificação Completa (Estado Civil, Profissão, Endereço)" placeholder="Endereço para citação, nacionalidade..." value={d.qualification} onChange={e => updateParty('defendants', d.id!, 'qualification', e.target.value)} />
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        );
      case 'Fatos':
        return (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <label className="text-sm font-bold text-gray-700">Fatos e Narrativa</label>
                  <p className="text-xs text-gray-500 mb-2">Descreva o ocorrido detalhadamente.</p>
                </div>
                {/* Destaque iOS para Detalhes nos Fatos */}
                <div className="flex-1 max-w-sm bg-blue-50/50 border border-blue-100 rounded-2xl p-3 flex items-center gap-3 shadow-sm backdrop-blur-sm">
                    <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                        <Sparkles size={16} />
                    </div>
                    <p className="text-[10px] leading-snug text-blue-800 font-medium">
                        <strong>DICA PRO:</strong> Quanto mais rico em detalhes for seu relato, mais robusta e técnica será a fundamentação gerada pela IA.
                    </p>
                </div>
             </div>
             <div className="relative group">
                <textarea 
                  className="w-full h-48 p-5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-juris-500 text-sm shadow-inner transition-all resize-none bg-slate-50/50" 
                  value={formData.facts} 
                  onChange={e => handleInputChange('facts', e.target.value)} 
                  placeholder="Inicie a narrativa dos fatos aqui... Inclua nomes, datas, documentos e valores." 
                />
                {isTranscribing && (
                   <div className="absolute inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center rounded-2xl z-10">
                      <div className="flex flex-col items-center gap-3">
                         <div className="relative">
                            <Loader2 className="h-8 w-8 text-juris-600 animate-spin" />
                            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-pulse" />
                         </div>
                         <span className="text-xs font-bold text-juris-900 tracking-tight">TRANSCREVENDO ÁUDIO...</span>
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
                      {isListening ? 'Parar Agora' : 'Ditar Fatos'}
                    </span>
                </button>
             </div>
          </div>
        );
      case 'Pedidos':
        return (
            <div className="space-y-6 animate-in fade-in">
               <div>
                  <label className="text-sm font-bold text-gray-700">Pedidos e Valor da Causa</label>
                  <p className="text-xs text-gray-500 mb-2">Liste os pedidos ou utilize as ferramentas de voz.</p>
               </div>
               <div className="relative">
                  <textarea 
                    className="w-full h-48 p-5 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-juris-500 text-sm shadow-inner transition-all resize-none bg-slate-50/50" 
                    value={formData.requests.join('\n')} 
                    onChange={e => handleInputChange('requests', e.target.value.split('\n'))} 
                    placeholder="Liste os pedidos, um por linha..." 
                  />
                  {isTranscribing && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center rounded-2xl z-10">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <Loader2 className="h-8 w-8 text-juris-600 animate-spin" />
                                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-pulse" />
                            </div>
                            <span className="text-xs font-bold text-juris-900 tracking-tight">ANALISANDO FALA...</span>
                        </div>
                    </div>
                  )}
               </div>
               <div className="flex gap-4 justify-center mb-6">
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
               <Input label="Valor Estimado da Causa" value={formData.value} onChange={e => handleInputChange('value', e.target.value)} />
            </div>
        );
      case 'Gerar':
        return (
            <div className="text-center py-20 animate-in zoom-in-95">
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-4">
                        <Sparkles className="h-16 w-16 text-juris-500 animate-pulse" />
                        <h3 className="text-2xl font-bold">Redigindo Peça Judicial...</h3>
                        <p className="text-gray-500">Fundamentando Direito e Pedidos com Gemini AI.</p>
                    </div>
                ) : (
                    <>
                        <Scale className="h-16 w-16 text-juris-900 mx-auto mb-6" />
                        <h3 className="text-2xl font-bold mb-2">Tudo pronto!</h3>
                        <p className="text-gray-500 mb-8">Revise os dados antes de gerar a peça final.</p>
                        <Button size="lg" onClick={handleGenerate} className="px-12 h-14 text-lg shadow-xl"><Sparkles className="mr-2"/> Gerar Petição agora</Button>
                    </>
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
             <div className="flex items-center gap-4">
                <button onClick={() => setIsFullScreen(false)} className="p-2 text-gray-400 hover:text-gray-900"><X size={24}/></button>
                <h2 className="text-lg font-bold text-juris-900 leading-tight">Petição Gerada</h2>
             </div>
             <div className="flex gap-2">
                 <Button variant="outline" onClick={handlePrint}><Printer size={16} className="mr-2"/> Imprimir</Button>
                 <Button variant="outline" onClick={handleDownloadDoc}><Download size={16} className="mr-2"/> Word</Button>
                 <Button onClick={handleSave} isLoading={isSaving}><Save size={18} className="mr-2"/> Salvar</Button>
             </div>
         </div>
         <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
             <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col items-center bg-slate-200">
                 <div className="w-full max-w-[21cm] mb-6 flex items-center gap-2 text-juris-800 bg-juris-50 px-4 py-3 rounded-lg border border-juris-100 shadow-sm">
                    <Info size={18} className="text-juris-600 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Modo Edição Ativado: Você pode alterar o texto diretamente na folha branca.</span>
                 </div>
                 <div className="relative w-full max-w-[21cm]">
                   <div 
                      ref={contentRef}
                      className="bg-white shadow-2xl p-[3cm_2cm_3cm_3cm] h-auto min-h-[29.7cm] outline-none border border-gray-100 mb-20 text-justify"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={e => setGeneratedContent(e.currentTarget.innerHTML)}
                      style={{ width: '100%', fontFamily: '"Times New Roman", serif', fontSize: '12pt', lineHeight: '1.5', boxSizing: 'border-box' }}
                   />
                   <style>{`
                      [contenteditable] h1, [contenteditable] h2, [contenteditable] h3 { 
                          text-align: center; 
                          text-transform: uppercase; 
                          margin: 18pt 0 12pt 0; 
                          font-weight: bold; 
                          text-indent: 0;
                          outline: none;
                      }
                      [contenteditable] p { 
                          text-align: justify; 
                          text-indent: 1.25cm; 
                          margin-bottom: 12pt; 
                          margin-top: 0;
                          outline: none;
                      }
                   `}</style>
                 </div>
             </div>
             <div className="w-full md:w-80 p-6 bg-white border-l overflow-y-auto shrink-0 flex flex-col gap-6 shadow-lg">
                {cnjMetadata && (
                  <div className="bg-white rounded-xl border border-juris-100 shadow-sm overflow-hidden">
                    <div className="bg-juris-900 px-4 py-2 text-white text-[10px] font-bold uppercase tracking-wider">Metadados Sugeridos</div>
                    <div className="p-4 space-y-4">
                      <div><label className="text-[9px] font-bold text-gray-400 uppercase">Classe</label><div className="text-xs bg-gray-50 p-2 rounded font-medium">{cnjMetadata.class}</div></div>
                      <div><label className="text-[9px] font-bold text-gray-400 uppercase">Assunto</label><div className="text-xs bg-gray-50 p-2 rounded font-medium">{cnjMetadata.subject}</div></div>
                    </div>
                  </div>
                )}
                <div className="bg-sky-50 rounded-xl border border-sky-100 p-5 shadow-sm">
                   <h4 className="text-xs font-bold text-sky-800 uppercase mb-4 flex items-center gap-2 font-bold"><RefreshCw size={14}/> Refinar com IA</h4>
                   <textarea className="w-full h-32 rounded-lg border border-sky-200 p-3 text-sm mb-3 outline-none focus:ring-2 focus:ring-sky-300 transition-all" placeholder="Ex: Adicione fundamentação sobre danos morais..." value={refinementText} onChange={e => setRefinementText(e.target.value)} />
                   <Button onClick={async () => {
                       if (!generatedContent || !refinementText) return;
                       setIsRefining(true);
                       try { setGeneratedContent(await refineLegalPetition(generatedContent, refinementText)); setRefinementText(''); } catch (e) { alert("Erro ao refinar."); } finally { setIsRefining(false); }
                   }} isLoading={isRefining} className="w-full bg-sky-600 hover:bg-sky-700">Aplicar Ajustes</Button>
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
          <button onClick={() => { setMode('scratch'); setCurrentStep(1); }} className="bg-white border-2 border-gray-100 p-10 rounded-2xl hover:border-juris-500 hover:shadow-xl transition-all h-80 flex flex-col items-center justify-center text-center group">
             <div className="bg-juris-50 p-6 rounded-full group-hover:bg-juris-100 transition-colors mb-6">
                <PenTool size={56} className="text-juris-600" />
             </div>
             <h3 className="text-2xl font-bold text-gray-900">Petição do Zero</h3>
             <p className="text-gray-500 mt-2 max-w-xs">IA redige a peça completa a partir da sua narrativa dos fatos.</p>
          </button>
          <button onClick={() => { setMode('upload'); setCurrentStep(1); }} className="bg-white border-2 border-gray-100 p-10 rounded-2xl hover:border-sky-500 hover:shadow-xl transition-all h-80 flex flex-col items-center justify-center text-center group">
             <div className="bg-sky-50 p-6 rounded-full group-hover:bg-sky-100 transition-colors mb-6">
                <FileUp size={56} className="text-sky-600" />
             </div>
             <h3 className="text-2xl font-bold text-gray-900">Importar Documento</h3>
             <p className="text-gray-500 mt-2 max-w-xs">IA analisa um arquivo existente e preenche os dados automaticamente.</p>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-8 py-4 border-b flex justify-between items-center">
             <div className="flex gap-4">
                {(mode === 'upload' ? ['Upload', 'Dados', 'Fatos', 'Pedidos', 'Gerar'] : ['Dados', 'Fatos', 'Pedidos', 'Gerar']).map((s, idx) => (
                  <div key={s} className={`flex items-center gap-2 ${currentStep === idx + 1 ? 'text-juris-900 font-bold' : idx + 1 < currentStep ? 'text-green-500' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${currentStep === idx + 1 ? 'bg-juris-900 text-white shadow-md' : idx + 1 < currentStep ? 'bg-green-100' : 'bg-gray-100'}`}>{idx+1 < currentStep ? <CheckCircle size={12}/> : idx+1}</div>
                    <span className="hidden sm:inline text-xs uppercase font-bold tracking-wider">{s}</span>
                  </div>
                ))}
             </div>
             <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-2"><X size={20}/></button>
          </div>
          <div className="p-8 min-h-[500px]">
            {renderStep()}
          </div>
          <div className="bg-gray-50 px-8 py-4 border-t flex justify-between">
             <Button variant="outline" onClick={() => { if(currentStep===1) setMode('selection'); else setCurrentStep(prev=>prev-1); }}>Voltar</Button>
             {currentStep < STEPS.length && <Button onClick={() => setCurrentStep(prev=>prev+1)} disabled={mode === 'upload' && currentStep === 1 && !uploadSuccess}>Próximo <ChevronRight size={16}/></Button>}
          </div>
        </div>
      )}
    </div>
  );
};