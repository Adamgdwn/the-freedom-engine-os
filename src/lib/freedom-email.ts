export type FreedomOutboundProvider = 'none' | 'resend';

export interface FreedomEmailStatus {
  enabled:          boolean;
  provider:         FreedomOutboundProvider;
  fromAddress:      string | null;
  replyToAddress:   string | null;
  recipientCount:   number;
}

export interface FreedomEmailRecipient {
  id:          string;
  label:       string;
  destination: string;
  createdAt:   number;
  updatedAt:   number;
}

export interface FreedomEmailDelivery {
  id:          string;
  recipient:   string;
  subject:     string;
  provider:    Exclude<FreedomOutboundProvider, 'none'>;
  deliveryId:  string;
  deliveredAt: number;
}

export interface FreedomEmailDraft {
  id:                   string;
  recipientLabel:       string | null;
  recipientDestination: string;
  subject:              string;
  intro:                string;
  body:                 string;
  createdAt:            number;
}

export type FreedomEmailDraftUpdate =
  | { type: 'created'; draft: FreedomEmailDraft }
  | { type: 'cleared'; draftId?: string };

export interface FreedomEmailSnapshot {
  status:           FreedomEmailStatus;
  recipients:       FreedomEmailRecipient[];
  recentDeliveries: FreedomEmailDelivery[];
  configured:       boolean;
}

export interface FreedomEmailSendRequest {
  draftId?:              string | null;
  recipientId?:          string | null;
  recipientDestination?: string | null;
  recipientLabel?:       string | null;
  subject:               string;
  intro?:                string;
  body:                  string;
}

export interface FreedomEmailSendResponse {
  ok:          true;
  recipient:   FreedomEmailRecipient;
  deliveryId:  string;
  provider:    Exclude<FreedomOutboundProvider, 'none'>;
  deliveredAt: number;
}

export interface FreedomEmailRecipientCreateRequest {
  label:       string;
  destination: string;
}

export function applyFreedomEmailDraftUpdate(
  currentDraft: FreedomEmailDraft | null,
  update: FreedomEmailDraftUpdate,
): FreedomEmailDraft | null {
  if (update.type === 'created') {
    return update.draft;
  }

  if (!currentDraft) {
    return null;
  }

  if (!update.draftId || currentDraft.id === update.draftId) {
    return null;
  }

  return currentDraft;
}

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}
