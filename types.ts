
export type AccountStatus = 'trial' | 'active' | 'blocked';
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email?: string; 
  account_status: AccountStatus;
  role: UserRole;
  created_at: string;
}

export interface UsageLimit {
  user_id: string;
  petitions_limit: number; 
  petitions_this_month: number;
  last_reset: string;
  storage_limit_bytes: number; 
  used_storage_bytes: number;
  last_update: string;
}

export interface PetitionFilingMetadata {
  competence: string; 
  class: string;      
  subject: string;    
  filingUrl?: string;
  portalName?: string;
}

export interface AnalyzedDocument {
  id: string;
  fileName: string;
  docType: string; 
  summary?: string;
}

export interface Petition {
  id: string;
  user_id: string;
  area: 'civel' | 'trabalhista' | 'familia' | 'criminal' | 'outros';
  action_type: string;
  content: string;
  created_at: string;
  title?: string;
  plaintiff_name?: string;
  defendant_name?: string;
  filed?: boolean; 
  analyzed_documents?: AnalyzedDocument[];
  // Novos campos de Metadados
  competence?: string;
  legal_class?: string;
  subject?: string;
  filing_url?: string;
}

export interface Deadline {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date: string; 
  status: 'pending' | 'completed';
  created_at: string;
}

export interface SavedJurisprudence {
  id: string;
  user_id: string;
  query: string;
  result: string; 
  created_at: string;
}

export interface PetitionParty {
  id?: string; 
  name: string;
  type: 'pf' | 'pj'; 
  doc: string; 
  rg?: string;
  address?: string;
  qualification?: string; 
}

export interface PetitionFormData {
  area: string;
  actionType: string;
  jurisdiction: string; 
  plaintiffs: PetitionParty[]; 
  defendants: PetitionParty[]; 
  facts: string;
  requests: string[]; 
  evidence: string; 
  value: string; 
  analyzedDocuments?: AnalyzedDocument[]; 
}

export interface AuthState {
  session: any | null; 
  user: any | null;
  profile: UserProfile | null;
  usage: UsageLimit | null;
  loading: boolean;
}
