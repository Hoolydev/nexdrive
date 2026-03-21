/**
 * Phase 1 PRD Types — Supplementary type definitions for new tables.
 * Do NOT modify the existing types.ts; import from here instead.
 */

// ---------------------------------------------------------------------------
// Entity (Cadastro Global Polimórfico)
// ---------------------------------------------------------------------------

export interface Entity {
  id: string;
  user_id: string;
  document_num: string | null;
  document_type: 'CPF' | 'CNPJ';
  name: string;
  trade_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  rg: string | null;
  rg_issuer: string | null;
  cnh: string | null;
  cnh_expiry: string | null;
  birth_date: string | null;
  nationality: string;
  marital_status: string | null;
  occupation: string | null;
  bank_code: string | null;
  bank_name: string | null;
  agency: string | null;
  account: string | null;
  account_type: 'corrente' | 'poupanca';
  pix_key: string | null;
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null;
  is_client: boolean;
  is_supplier: boolean;
  is_seller: boolean;
  is_investor: boolean;
  commission_rate: number | null;
  commission_pay_rule: string | null;
  seller_active: boolean;
  investor_roi_type: 'fixed_monthly' | 'net_profit' | 'revenue_share' | null;
  investor_roi_rate: number | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EntityInsert = Omit<Entity, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type EntityUpdate = Partial<EntityInsert>;

// ---------------------------------------------------------------------------
// EntityRelationship
// ---------------------------------------------------------------------------

export interface EntityRelationship {
  id: string;
  parent_entity_id: string;
  child_entity_id: string;
  relationship_type: 'partner' | 'representative' | 'dependent' | 'guarantor';
  equity_percentage: number | null;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// ChartOfAccount
// ---------------------------------------------------------------------------

export interface ChartOfAccount {
  id: string;
  user_id: string;
  code: string;
  name: string;
  level: 1 | 2 | 3;
  parent_id: string | null;
  type: 'income' | 'expense';
  dre_mapping_key: string | null;
  dre_order: number | null;
  is_system: boolean;
  active: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// FinancialTransaction
// ---------------------------------------------------------------------------

export interface FinancialTransaction {
  id: string;
  user_id: string;
  account_category_id: string;
  entity_id: string;
  vehicle_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'open' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  payment_method: string | null;
  installment_number: number | null;
  installment_total: number | null;
  parent_transaction_id: string | null;
  is_refundable: boolean;
  refund_target_entity_id: string | null;
  commission_source_transaction_id: string | null;
  seller_entity_id: string | null;
  description: string | null;
  notes: string | null;
  document_url: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type FinancialTransactionInsert = Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type FinancialTransactionUpdate = Partial<FinancialTransactionInsert>;

// ---------------------------------------------------------------------------
// VehicleOwner
// ---------------------------------------------------------------------------

export interface VehicleOwner {
  id: string;
  vehicle_id: string;
  entity_id: string;
  equity_percentage: number;
  ownership_type: 'own' | 'consigned' | 'investor';
  entry_date: string;
  exit_date: string | null;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// VehicleStatus type
// ---------------------------------------------------------------------------

export type VehicleStatus = 'shadow_inventory' | 'quarantine' | 'active' | 'sold' | 'archived';

export interface CrmFunnel {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type CrmFunnelInsert = Omit<CrmFunnel, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CrmFunnelUpdate = Partial<CrmFunnelInsert>;

// ---------------------------------------------------------------------------
// CrmFunnelStage
// ---------------------------------------------------------------------------

export interface CrmFunnelStage {
  id: string;
  funnel_id: string;
  name: string;
  color_theme: string;
  stage_order: number;
  is_system_won: boolean;
  is_system_lost: boolean;
  created_at: string;
  updated_at: string;
}

export type CrmFunnelStageInsert = Omit<CrmFunnelStage, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CrmFunnelStageUpdate = Partial<CrmFunnelStageInsert>;

// ---------------------------------------------------------------------------
// CrmLead
// ---------------------------------------------------------------------------

export interface CrmLead {
  id: string;
  user_id: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  origin: 'marketplace' | 'whatsapp' | 'phone' | 'walk_in' | 'website' | 'referral' | 'other';
  status_step: string; /* Legacy column, kept for fallback */
  funnel_id: string | null;
  stage_id: string | null;
  vehicle_interest_id: string | null;
  assigned_seller_id: string | null;
  converted_entity_id: string | null;
  notes: string | null;
  lost_reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CrmLeadInsert = Omit<CrmLead, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CrmLeadUpdate = Partial<CrmLeadInsert>;

// ---------------------------------------------------------------------------
// Attachment (GED)
// ---------------------------------------------------------------------------

export interface Attachment {
  id: string;
  user_id: string;
  attachable_type: 'entity' | 'vehicle' | 'transaction';
  attachable_id: string;
  file_type: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export interface Contract {
  id: string;
  user_id: string;
  contract_type: 'CONSIGNMENT_IN' | 'PURCHASE_IN' | 'SALE_OUT' | 'SERVICE_ORDER';
  status: 'draft' | 'registered' | 'cancelled';
  entity_id: string;
  secondary_entity_id: string | null;
  vehicle_id: string | null;
  total_value: number | null;
  down_payment: number | null;
  financing_value: number | null;
  trade_in_vehicle_id: string | null;
  trade_in_value: number | null;
  warranty_months: number | null;
  warranty_km: number | null;
  payment_method: string | null;
  installments: number | null;
  template_id: string | null;
  generated_pdf_url: string | null;
  registered_at: string | null;
  registered_by: string | null;
  sign_date: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ContractInsert = Omit<Contract, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ContractUpdate = Partial<ContractInsert>;

// ---------------------------------------------------------------------------
// AuditLog (read-only)
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'CASCADE' | 'REVERSAL';
  table_name: string;
  record_id: string;
  payload_before: Record<string, unknown> | null;
  payload_after: Record<string, unknown> | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helper types and constants
// ---------------------------------------------------------------------------

export type EntityRole = 'client' | 'supplier' | 'seller' | 'investor';

export const CRM_STEPS = ['new', 'contacted', 'qualified', 'negotiation', 'proposal', 'converted', 'lost'] as const;

export const CRM_STEP_LABELS: Record<CrmLead['status_step'], string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  negotiation: 'Em Negociação',
  proposal: 'Proposta',
  converted: 'Convertido',
  lost: 'Perdido',
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  shadow_inventory: 'Estoque Sombra',
  quarantine: 'Quarentena',
  active: 'Em Estoque',
  sold: 'Vendido',
  archived: 'Concluído',
};

export const ENTITY_ROLE_LABELS: Record<EntityRole, string> = {
  client: 'Cliente',
  supplier: 'Fornecedor',
  seller: 'Vendedor',
  investor: 'Investidor',
};
