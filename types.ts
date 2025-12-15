
export type AccountStatus = 'trial' | 'active' | 'blocked';
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email?: string; // Added for display in admin panel
  account_status: AccountStatus;
  role: UserRole;
  created_at: string;
}

export interface UsageLimit {
  user_id: string;
  monthly_limit: number;
  used_this_month: number;
  last_reset: string;
}

export interface PetitionFilingMetadata {
  competence: string; // e.g., "Vara Cível" or "Juizado Especial Cível"
  class: string;      // e.g., "Procedimento Comum Cível"
  subject: string;    // e.g., "Indenização por Dano Moral"
}

export interface AnalyzedDocument {
  id: string;
  fileName: string;
  docType: string; // 'procuracao' | 'identidade' | 'contrato' | 'peticao' | 'outros'
  summary?: string;
}

export interface Petition {
  id: string;
  user_id: string;
  area: 'civel' | 'trabalhista' | 'familia' | 'outros';
  action_type: string;
  content: string;
  created_at: string;
  title?: string;
  plaintiff_name?: string;
  defendant_name?: string;
  filed?: boolean; // Indicates if the petition has been filed in court
  analyzed_documents?: AnalyzedDocument[]; // JSONB column from DB
}

export interface Deadline {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date: string; // ISO Date string
  status: 'pending' | 'completed';
  created_at: string;
}

// Advanced Form Types
export interface PetitionParty {
  id?: string; // temporary UI id
  name: string;
  type: 'pf' | 'pj'; // Pessoa Física or Jurídica
  doc: string; // CPF or CNPJ
  address?: string;
  qualification?: string; // Profession, marital status, etc.
}

export interface PetitionFormData {
  area: string;
  actionType: string;
  jurisdiction: string; // Comarca/City
  plaintiffs: PetitionParty[]; // Lista de Autores
  defendants: PetitionParty[]; // Lista de Réus
  facts: string;
  requests: string[]; // List of specific requests
  evidence: string; // Provas a produzir
  value: string; // Valor da causa
  analyzedDocuments?: AnalyzedDocument[]; // Files processed by AI
}

export interface AuthState {
  session: any | null; 
  user: any | null;
  profile: UserProfile | null;
  usage: UsageLimit | null;
  loading: boolean;
}