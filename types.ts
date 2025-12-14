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
}

// Advanced Form Types
export interface PetitionParty {
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
  plaintiff: PetitionParty; // Autor
  defendant: PetitionParty; // Réu
  facts: string;
  requests: string[]; // List of specific requests
  evidence: string; // Provas a produzir
  value: string; // Valor da causa
}

export interface AuthState {
  session: any | null; 
  user: any | null;
  profile: UserProfile | null;
  usage: UsageLimit | null;
  loading: boolean;
}