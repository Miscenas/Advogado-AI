import React, { useState } from 'react';
import { 
  Globe, 
  Download, 
  Monitor, 
  ExternalLink, 
  Search, 
  Shield, 
  Cpu, 
  AlertCircle 
} from 'lucide-react';
import { Button } from './ui/Button';

// Dados dos Sistemas e Requisitos
const SYSTEM_REQUIREMENTS = [
  {
    name: "PJe (Processo Judicial Eletrônico)",
    description: "Sistema oficial do CNJ usado na maioria dos tribunais.",
    requirements: [
      "Navegador: PJe Navegador ou Firefox/Chrome atualizados.",
      "Software de Assinatura: PJeOffice (Obrigatório em muitos TJs).",
      "Sistema Operacional: Windows 10/11 (Recomendado)."
    ],
    downloadLink: "https://www.pje.jus.br/wiki/index.php/PJeOffice",
    downloadLabel: "Baixar PJeOffice"
  },
  {
    name: "e-SAJ (Softplan)",
    description: "Utilizado principalmente em SP, SC, AC, AL, AM, CE, MS.",
    requirements: [
      "Navegador: Google Chrome ou WebSigner configurado.",
      "Plugin: WebSigner (necessário para assinar documentos).",
      "PDF: Adobe Acrobat Reader para visualização."
    ],
    downloadLink: "https://www.tjsp.jus.br/CanaisComunicacao/Faq/WebSigner",
    downloadLabel: "Instalar WebSigner"
  },
  {
    name: "E-proc",
    description: "Sistema da Justiça Federal da 4ª Região, adotado por TRF2, TJRS, TJSC, etc.",
    requirements: [
      "Navegador: Compatível com qualquer navegador moderno.",
      "Java: Não exige Java no navegador (assinatura via aplicativo local ou HTML5).",
    ],
    downloadLink: "https://eproc.trf4.jus.br/eproc2trf4/",
    downloadLabel: "Acessar Manual E-proc"
  },
  {
    name: "Shodô (Justiça do Trabalho)",
    description: "Assinador digital utilizado no PJe da Justiça do Trabalho.",
    requirements: [
      "Java: Requer Java 8 instalado.",
      "Navegador: Firefox ou Chrome.",
      "Habilitação: Necessário ativar o modo 'Assinador Shodô' no PJe."
    ],
    downloadLink: "https://pje.csjt.jus.br/shodo/inicial",
    downloadLabel: "Baixar Shodô"
  }
];

// Dados dos Tribunais
const COURTS = {
  superiores: [
    { name: "STF - Supremo Tribunal Federal", link: "https://portal.stf.jus.br/", system: "e-STF" },
    { name: "STJ - Superior Tribunal de Justiça", link: "https://www.stj.jus.br/", system: "Justiça" },
    { name: "TST - Tribunal Superior do Trabalho", link: "https://www.tst.jus.br/", system: "PJe" },
    { name: "TSE - Tribunal Superior Eleitoral", link: "https://www.tse.jus.br/", system: "PJe" },
    { name: "STM - Superior Tribunal Militar", link: "https://www.stm.jus.br/", system: "e-Proc" },
  ],
  federais: [
    { name: "TRF-1 (DF, MG, BA, PI, MA, GO, MT, TO, AC, AM, AP, PA, RO, RR)", link: "https://portal.trf1.jus.br/", system: "PJe" },
    { name: "TRF-2 (RJ, ES)", link: "https://www10.trf2.jus.br/portal/", system: "e-Proc" },
    { name: "TRF-3 (SP, MS)", link: "https://www.trf3.jus.br/", system: "PJe" },
    { name: "TRF-4 (RS, SC, PR)", link: "https://www.trf4.jus.br/", system: "e-Proc" },
    { name: "TRF-5 (PE, CE, AL, SE, RN, PB)", link: "https://www.trf5.jus.br/", system: "PJe" },
    { name: "TRF-6 (MG - Novo)", link: "https://portal.trf6.jus.br/", system: "PJe" },
  ],
  estaduais: [
    { name: "TJAC - Acre", link: "https://www.tjac.jus.br/", system: "e-SAJ" },
    { name: "TJAL - Alagoas", link: "https://www.tjal.jus.br/", system: "e-SAJ" },
    { name: "TJAM - Amazonas", link: "https://www.tjam.jus.br/", system: "e-SAJ" },
    { name: "TJAP - Amapá", link: "https://www.tjap.jus.br/", system: "Tucujuris" },
    { name: "TJBA - Bahia", link: "http://www.tjba.jus.br/", system: "PJe" },
    { name: "TJCE - Ceará", link: "https://www.tjce.jus.br/", system: "e-SAJ" },
    { name: "TJDFT - Distrito Federal", link: "https://www.tjdft.jus.br/", system: "PJe" },
    { name: "TJES - Espírito Santo", link: "https://www.tjes.jus.br/", system: "PJe" },
    { name: "TJGO - Goiás", link: "https://www.tjgo.jus.br/", system: "Projudi/PJe" },
    { name: "TJMA - Maranhão", link: "https://www.tjma.jus.br/", system: "PJe" },
    { name: "TJMG - Minas Gerais", link: "https://www.tjmg.jus.br/", system: "PJe/JPe" },
    { name: "TJMS - Mato Grosso do Sul", link: "https://www.tjms.jus.br/", system: "e-SAJ" },
    { name: "TJMT - Mato Grosso", link: "https://www.tjmt.jus.br/", system: "PJe" },
    { name: "TJPA - Pará", link: "https://www.tjpa.jus.br/", system: "PJe" },
    { name: "TJPB - Paraíba", link: "https://www.tjpb.jus.br/", system: "PJe" },
    { name: "TJPE - Pernambuco", link: "https://www.tjpe.jus.br/", system: "PJe" },
    { name: "TJPI - Piauí", link: "https://www.tjpi.jus.br/", system: "PJe" },
    { name: "TJPR - Paraná", link: "https://www.tjpr.jus.br/", system: "Projudi/e-Proc" },
    { name: "TJRJ - Rio de Janeiro", link: "http://www.tjrj.jus.br/", system: "PJe/DJE" },
    { name: "TJRN - Rio Grande do Norte", link: "https://www.tjrn.jus.br/", system: "PJe" },
    { name: "TJRO - Rondônia", link: "https://www.tjro.jus.br/", system: "PJe" },
    { name: "TJRR - Roraima", link: "https://www.tjrr.jus.br/", system: "Projudi" },
    { name: "TJRS - Rio Grande do Sul", link: "https://www.tjrs.jus.br/", system: "e-Proc" },
    { name: "TJSC - Santa Catarina", link: "https://www.tjsc.jus.br/", system: "e-Proc" },
    { name: "TJSE - Sergipe", link: "https://www.tjse.jus.br/", system: "SCP" },
    { name: "TJSP - São Paulo", link: "https://www.tjsp.jus.br/", system: "e-SAJ" },
    { name: "TJTO - Tocantins", link: "https://www.tjto.jus.br/", system: "e-Proc" },
  ]
};

export const CourtPortals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'estaduais' | 'federais' | 'superiores'>('estaduais');
  const [search, setSearch] = useState('');

  const filteredCourts = COURTS[activeTab].filter(court => 
    court.name.toLowerCase().includes(search.toLowerCase()) || 
    court.system.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="text-juris-800" />
            Portais da Justiça & Softwares
          </h1>
          <p className="text-gray-500">Acesso rápido aos sistemas dos tribunais e downloads essenciais.</p>
        </div>
      </div>

      {/* Seção de Requisitos e Downloads */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-sky-50 flex items-center gap-2">
           <Monitor size={20} className="text-sky-700" />
           <h3 className="font-bold text-sky-900">Softwares Essenciais e Requisitos</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {SYSTEM_REQUIREMENTS.map((sys, idx) => (
             <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                   <div className="p-2 bg-white rounded-md shadow-sm border border-gray-100">
                      <Cpu size={20} className="text-juris-600" />
                   </div>
                   <h4 className="font-bold text-gray-900 text-sm leading-tight">{sys.name}</h4>
                </div>
                <p className="text-xs text-gray-500 mb-3 min-h-[40px]">{sys.description}</p>
                
                <div className="mb-4 flex-1">
                  <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                     <AlertCircle size={10} /> Requisitos Mínimos:
                  </p>
                  <ul className="text-[11px] text-gray-600 space-y-1 list-disc list-inside">
                     {sys.requirements.map((req, rIdx) => (
                       <li key={rIdx}>{req}</li>
                     ))}
                  </ul>
                </div>

                <a 
                  href={sys.downloadLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-auto w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-juris-600 hover:bg-juris-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-juris-500"
                >
                  <Download size={14} className="mr-2" /> {sys.downloadLabel}
                </a>
             </div>
           ))}
        </div>
      </div>

      {/* Seção de Tribunais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
         <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
               <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
                  <button 
                    onClick={() => setActiveTab('estaduais')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'estaduais' ? 'bg-white text-juris-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Estaduais (TJ)
                  </button>
                  <button 
                    onClick={() => setActiveTab('federais')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'federais' ? 'bg-white text-juris-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Federais (TRF)
                  </button>
                  <button 
                    onClick={() => setActiveTab('superiores')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'superiores' ? 'bg-white text-juris-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Superiores (STF/STJ)
                  </button>
               </div>

               <div className="relative w-full md:w-64">
                   <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                   <input 
                     type="text" 
                     placeholder="Buscar tribunal..." 
                     className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-juris-500 focus:outline-none text-sm"
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                   />
               </div>
            </div>
         </div>

         <div className="p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {filteredCourts.map((court, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-juris-300 hover:shadow-sm transition-all flex justify-between items-center group bg-white">
                        <div>
                           <h4 className="font-semibold text-gray-900 text-sm group-hover:text-juris-800">{court.name}</h4>
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 mt-1">
                              Sistema: {court.system}
                           </span>
                        </div>
                        <a 
                          href={court.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-juris-600 hover:bg-juris-50 rounded-full transition-colors"
                          title="Acessar Portal"
                        >
                           <ExternalLink size={18} />
                        </a>
                    </div>
                 ))}
             </div>
             {filteredCourts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                   Nenhum tribunal encontrado para "{search}".
                </div>
             )}
         </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex gap-3 items-start">
         <Shield size={20} className="flex-shrink-0 mt-0.5" />
         <div>
            <span className="font-bold block mb-1">Nota de Segurança:</span>
            Sempre verifique se está acessando o site oficial do tribunal (terminado em <strong>.jus.br</strong>). Jamais insira sua senha do PJe ou Token em sites desconhecidos.
         </div>
      </div>
    </div>
  );
};