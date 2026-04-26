export type FreedomContactStatus = 'active' | 'archived';
export type FreedomContactChannelType = 'email' | 'phone' | 'website' | 'address' | 'other';

export interface FreedomContactChannel {
  id: string;
  contactId: string;
  channelType: FreedomContactChannelType;
  label: string | null;
  value: string;
  isPrimary: boolean;
  trustForEmail: boolean;
  approvalRequired: boolean;
  status: FreedomContactStatus;
  sourceKind: string;
  sourceDetail: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface FreedomContact {
  id: string;
  fullName: string;
  preferredName: string | null;
  organization: string | null;
  title: string | null;
  relationshipContext: string | null;
  notes: string | null;
  status: FreedomContactStatus;
  sourceKind: string;
  sourceDetail: string | null;
  createdAt: number;
  updatedAt: number;
  channels: FreedomContactChannel[];
}

export interface FreedomContactSnapshot {
  contacts: FreedomContact[];
  configured: boolean;
}

export interface FreedomContactCreateRequest {
  fullName: string;
  preferredName?: string;
  organization?: string;
  title?: string;
  relationshipContext?: string;
  notes?: string;
  primaryEmail?: string;
  primaryEmailLabel?: string;
  trustForEmail?: boolean;
  approvalRequired?: boolean;
}

export function displayFreedomContactName(contact: Pick<FreedomContact, 'fullName' | 'preferredName'>) {
  return contact.preferredName?.trim() || contact.fullName.trim();
}
