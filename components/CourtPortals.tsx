
import React, { useState } from 'react';
import { 
  Globe, 
  Monitor, 
  ExternalLink, 
  Search, 
  Cpu, 
  Info 
} from 'lucide-react';

const SYSTEM_REQUIREMENTS = [
  {
    name: "PJe (Processo Judicial Eletrônico)",
    description: "Sistema oficial do CNJ usado na maioria dos tribunais brasileiros.",
    requirements: ["Navegador: Firefox ou Chrome.", "Software: PJeOffice (Obrigatório).", "SO: Windows 10/11."]
  },
  {
    name: "e-SAJ (Softplan)",
    description: "Utilizado principalmente em SP, SC, AC, AL, AM, CE, MS.",
    requirements: ["Plugin: WebSigner necessário.", "Navegador: Chrome ou Edge.", "PDF: Adobe Acrobat Reader."]
  },
  {
    name: "E-proc",
    description: "Sistema da 4ª Região, adotado por TRF2, TJRS, TJSC.",
    requirements: ["Assinador: Desktop ou HTML5.", "Moderno: Compatível universal.", "Java: Não exigido no browser."]
  },
  {
    name: "Shodô (Justiça do Trabalho)",
    description: "Assinador digital para PJe-JT da Justiça do Trabalho.",
    requirements: ["Java: Versão 8 mínima.", "Browser: Firefox recomendado.", "Status: Modo Ativo."]
  }
];

const COURTS = {
  superiores: [
    { name: "STF - Supremo Tribunal Federal", link: "https://portal.stf.jus.br/", system: "e-STF" },
    { name: "STJ - Superior Tribunal de Justiça", link: "https://www.stj.jus.br/", system: "Justiça" },
    { name: "TST - Tribunal Superior do Trabalho", link: "https://www.tst.jus.br/", system: "PJe-JT" },
    { name: "TSE - Tribunal Superior Eleitoral", link: "https://www.tse.jus.br/", system: "PJe" },
    { name: "STM - Superior Tribunal Militar", link: "https://www.stm.jus.br/", system: "e-STM" }
  ],
  federais: [
    { name: "TRF-1 (AC, AM, AP, BA, DF, GO, MA, MT, PA, PI, RO, RR, TO)", link: "https://portal.trf1.jus.br/", system: "PJe" },
    { name: "TRF-2 (RJ, ES)", link: "https://www10.trf2.jus.br/portal/", system: "e-Proc" },
    { name: "TRF-3 (SP, MS)", link: "https://www.trf3.jus.br/", system: "PJe" },
    { name: "TRF-4 (RS, SC, PR)", link: "https://www.trf4.jus.br/", system: "e-Proc" },
    { name: "TRF-5 (AL, CE, PB, PE, RN, SE)", link: "https://www.trf5.jus.br/", system: "PJe" },
    { name: "TRF-6 (MG)", link: "https://www.trf6.jus.br/", system: "PJe" }
  ],
  estaduais: [
    { name: "TJAC - Acre", link: "https://www.tjac.jus.br/", system: "e-SAJ" },
    { name: "TJAL - Alagoas", link: "https://www.tjal.jus.br/", system: "e-SAJ" },
    { name: "TJAM - Amazonas", link: "https://www.tjam.jus.br/", system: "e-SAJ" },
    { name: "TJAP - Amapá", link: "https://www.tjap.jus.br/", system: "Tucujuris" },
    { name: "TJBA - Bahia", link: "https://www.tjba.jus.br/", system: "PJe" },
    { name: "TJCE - Ceará", link: "https://www.tjce.jus.br/", system: "e-SAJ" },
    { name: "TJDFT - Distrito Federal", link: "https://www.tjdft.jus.br/", system: "PJe" },
    { name: "TJES - Espírito Santo", link: "https://www.tjes.jus.br/", system: "PJe" },
    { name: "TJGO - Goiás", link: "https://www.tjgo.jus.br/", system: "PJe" },
    { name: "TJMA - Maranhão", link: "http://www.tjma.jus.br/", system: "PJe" },
    { name: "TJMG - Minas Gerais", link: "https://www.tjmg.jus.br/", system: "PJe" },
    { name: "TJMS - Mato Grosso do Sul", link: "https://www.tjms.jus.br/", system: "e-SAJ" },
    { name: "TJMT - Mato Grosso", link: "https://www.tjmt.jus.br/", system: "PJe" },
    { name: "TJPA - Pará", link: "https://www.tjpa.jus.br/", system: "PJe" },
    { name: "TJPB - Paraíba", link: "https://www.tjpb.jus.br/", system: "PJe" },
    { name: "TJPE - Pernambuco", link: "https://www.tjpe.jus.br/", system: "PJe" },
    { name: "TJPI - Piauí", link: "http://www.tjpi.jus.br/", system: "PJe" },
    { name: "TJPR - Paraná", link: "https://www.tjpr.jus.br/", system: "Projudi" },
    { name: "TJRJ - Rio de Janeiro", link: "http://www.tjrj.jus.br/", system: "PJe" },
    { name: "TJRN - Rio Grande do Norte", link: "https://www.tjrn.jus.br/", system: "PJe" },
    { name: "TJRO - Rondônia", link: "https://www.tjro.jus.br/", system: "PJe" },
    { name: "TJRR - Roraima", link: "https://www.tjrr.jus.br/", system: "Projudi" },
    { name: "TJRS - Rio Grande do Sul", link: "https://www.tjrs.jus.br/", system: "e-Proc" },
    { name: "TJSC - Santa Catarina", link: "https://www.tjsc.jus.br/", system: "e-SAJ" },
    { name: "TJSE - Sergipe", link: "https://www.tjse.jus.br/", system: "Projudi" },
    { name: "TJSP - São Paulo", link: "https://www.tjsp.jus.br/", system: "e-SAJ" },
    { name: "TJTO - Tocantins", link: "https://www.tjto.jus.br/", system: "e-Proc" }
  ]
};

export const CourtPortals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'estaduais' | 'federais' | 'superiores'>('estaduais');
  const [search, setSearch] = useState('');

  const filteredCourts = COURTS[activeTab].filter(court => 
    court.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-300 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left border-b border-slate-100 dark:border-slate-800 pb-8 w-full">
        <div className="text-left">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Portais & Sistemas</h1>
          <p className="text-gray-500 dark:text-slate-500 mt-3 font-bold uppercase text-[10px] tracking-[0.3em]">Central de Acessos aos Tribunais de todo o Brasil</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden w-full text-left">
        <div className="px-10 py-6 border-b border-gray-200 dark:border-slate-800 bg-sky-50 dark:bg-sky-950/20 flex items-center gap-3">
           <Monitor size={22} className="text-sky-700 dark:text-sky-400" />
           <h3 className="font-black text-sky-900 dark:text-sky-400 uppercase text-xs tracking-widest">Requisitos de Acesso</h3>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {SYSTEM_REQUIREMENTS.map((sys, idx) => (
             <div key={idx} className="bg-slate-50 dark:bg-slate-950/50 rounded-[2rem] p-6 border border-gray-100 dark:border-slate-800 flex flex-col h-full hover:shadow-lg transition-all group text-left">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Cpu size={20} />
                   </div>
                   <h4 className="font-black text-gray-900 dark:text-white text-[11px] leading-tight uppercase tracking-tight">{sys.name}</h4>
                </div>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed line-clamp-3">{sys.description}</p>
                <ul className="text-[9px] text-slate-400 dark:text-slate-500 space-y-2 list-disc list-inside mb-4 flex-1">
                   {sys.requirements.map((req, rIdx) => (<li key={rIdx} className="font-bold uppercase tracking-tight">{req}</li>))}
                </ul>
             </div>
           ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden w-full text-left">
         <div className="p-10 border-b border-gray-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row gap-8 justify-between items-center w-full">
               <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl w-full md:w-auto">
                  {(['estaduais', 'federais', 'superiores'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-md' : 'text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                  ))}
               </div>
               <div className="relative w-full md:w-80">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 w-5 h-5" />
                   <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Localizar tribunal..." className="w-full h-12 pl-12 pr-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-sm shadow-inner" />
               </div>
            </div>
         </div>
         <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
             {filteredCourts.map((court, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleOpenLink(court.link)}
                  className="border border-slate-100 dark:border-slate-800 rounded-2xl p-6 hover:border-indigo-600 dark:hover:border-indigo-400 hover:shadow-xl transition-all group bg-white dark:bg-slate-950/40 flex justify-between items-center text-left cursor-pointer"
                >
                    <div className="text-left min-w-0">
                       <h4 className="font-black text-gray-900 dark:text-slate-100 text-xs uppercase tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{court.name}</h4>
                       <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-2">
                          {court.system}
                       </span>
                    </div>
                    <div className="p-3 text-slate-300 dark:text-slate-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 bg-slate-50 dark:bg-slate-900 rounded-xl transition-all border border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-900/50 shadow-sm shrink-0">
                      <ExternalLink size={18} />
                    </div>
                </div>
             ))}
         </div>
         {filteredCourts.length === 0 && (
             <div className="p-20 text-center text-slate-400 dark:text-slate-600 font-black uppercase text-xs tracking-widest italic">Nenhum tribunal encontrado para o termo pesquisado.</div>
         )}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-[3rem] border border-amber-100 dark:border-amber-900/50 flex items-start gap-4">
          <Info className="text-amber-600 shrink-0" size={24} />
          <div className="text-left">
              <h4 className="font-black text-amber-900 dark:text-amber-400 uppercase text-xs tracking-widest mb-1">Atenção sobre Certificados Digitais</h4>
              <p className="text-[10px] font-bold text-amber-800/80 dark:text-amber-600 uppercase leading-relaxed tracking-tight">Para acessar a maioria dos portais acima, você precisará de um certificado digital (Token A3 ou Nuvem) ativo e os drivers instalados em sua máquina local. O JurisPet AI recomenda o uso do Firefox para maior compatibilidade com tokens físicos.</p>
          </div>
      </div>
    </div>
  );
};
