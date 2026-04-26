import 'server-only';

import type { FreedomEmailRecipient } from '@/lib/freedom-email';
import {
  displayFreedomContactName,
  type FreedomContact,
  type FreedomContactChannel,
  type FreedomContactCreateRequest,
  type FreedomContactSnapshot,
  type FreedomContactStatus,
} from '@/lib/freedom-contacts';
import { normalizeEmailAddress } from '@/lib/freedom-email';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase-admin';

type ContactRow = {
  id: string;
  full_name: string;
  preferred_name: string | null;
  organization: string | null;
  title: string | null;
  relationship_context: string | null;
  notes: string | null;
  status: FreedomContactStatus;
  source_kind: string;
  source_detail: string | null;
  created_at: string;
  updated_at: string;
};

type ContactChannelRow = {
  id: string;
  contact_id: string;
  channel_type: FreedomContactChannel['channelType'];
  label: string | null;
  value: string;
  is_primary: boolean;
  trust_for_email: boolean;
  approval_required: boolean;
  status: FreedomContactStatus;
  source_kind: string;
  source_detail: string | null;
  created_at: string;
  updated_at: string;
};

function toEpoch(value: string) {
  return new Date(value).getTime();
}

function toIso(value: number) {
  return new Date(value).toISOString();
}

function normalizeOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === 'PGRST205';
}

function mapChannel(row: ContactChannelRow): FreedomContactChannel {
  return {
    id: row.id,
    contactId: row.contact_id,
    channelType: row.channel_type,
    label: row.label,
    value: row.value,
    isPrimary: row.is_primary,
    trustForEmail: row.trust_for_email,
    approvalRequired: row.approval_required,
    status: row.status,
    sourceKind: row.source_kind,
    sourceDetail: row.source_detail,
    createdAt: toEpoch(row.created_at),
    updatedAt: toEpoch(row.updated_at),
  };
}

function mapContact(row: ContactRow, channels: FreedomContactChannel[]): FreedomContact {
  return {
    id: row.id,
    fullName: row.full_name,
    preferredName: row.preferred_name,
    organization: row.organization,
    title: row.title,
    relationshipContext: row.relationship_context,
    notes: row.notes,
    status: row.status,
    sourceKind: row.source_kind,
    sourceDetail: row.source_detail,
    createdAt: toEpoch(row.created_at),
    updatedAt: toEpoch(row.updated_at),
    channels,
  };
}

function toEmailRecipient(contact: FreedomContact, channel: FreedomContactChannel): FreedomEmailRecipient {
  return {
    id: channel.id,
    label: displayFreedomContactName(contact),
    destination: channel.value,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  };
}

async function upsertLegacyEmailRecipient(input: {
  label: string;
  destination: string;
  createdAt: number;
  updatedAt: number;
}) {
  const client = createSupabaseAdminClient();
  const { error } = await client
    .from('freedom_email_recipients')
    .upsert({
      label: input.label,
      destination: input.destination,
      created_at: toIso(input.createdAt),
      updated_at: toIso(input.updatedAt),
    }, {
      onConflict: 'destination',
    });

  if (error && !isMissingTableError(error)) {
    throw error;
  }
}

async function deleteLegacyEmailRecipients(destinations: string[]) {
  if (!destinations.length) {
    return;
  }

  const client = createSupabaseAdminClient();
  const { error } = await client
    .from('freedom_email_recipients')
    .delete()
    .in('destination', destinations);

  if (error && !isMissingTableError(error)) {
    throw error;
  }
}

export async function loadFreedomContactSnapshot(): Promise<FreedomContactSnapshot> {
  if (!isSupabaseAdminConfigured()) {
    return {
      contacts: [],
      configured: false,
    };
  }

  const client = createSupabaseAdminClient();
  const [contactsResult, channelsResult] = await Promise.all([
    client
      .from('freedom_contacts')
      .select('id, full_name, preferred_name, organization, title, relationship_context, notes, status, source_kind, source_detail, created_at, updated_at')
      .order('updated_at', { ascending: false }),
    client
      .from('freedom_contact_channels')
      .select('id, contact_id, channel_type, label, value, is_primary, trust_for_email, approval_required, status, source_kind, source_detail, created_at, updated_at')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
  ]);

  if (contactsResult.error && !isMissingTableError(contactsResult.error)) {
    throw contactsResult.error;
  }

  if (channelsResult.error && !isMissingTableError(channelsResult.error)) {
    throw channelsResult.error;
  }

  const channelMap = new Map<string, FreedomContactChannel[]>();
  for (const row of (channelsResult.data ?? []).map(mapChannel)) {
    const list = channelMap.get(row.contactId) ?? [];
    list.push(row);
    channelMap.set(row.contactId, list);
  }

  const contacts = (contactsResult.data ?? []).map((row) =>
    mapContact(row, channelMap.get(row.id) ?? []),
  );

  return {
    contacts,
    configured: true,
  };
}

export async function createFreedomContact(
  input: FreedomContactCreateRequest,
): Promise<FreedomContact> {
  const client = createSupabaseAdminClient();
  const now = Date.now();
  const fullName = input.fullName.trim();

  if (!fullName) {
    throw new Error('Full name is required.');
  }

  const { data: contactRow, error: contactError } = await client
    .from('freedom_contacts')
    .insert({
      full_name: fullName,
      preferred_name: normalizeOptional(input.preferredName),
      organization: normalizeOptional(input.organization),
      title: normalizeOptional(input.title),
      relationship_context: normalizeOptional(input.relationshipContext),
      notes: normalizeOptional(input.notes),
      status: 'active',
      source_kind: 'manual',
      source_detail: 'communications',
      created_at: toIso(now),
      updated_at: toIso(now),
    })
    .select('id, full_name, preferred_name, organization, title, relationship_context, notes, status, source_kind, source_detail, created_at, updated_at')
    .single();

  if (contactError) {
    throw contactError;
  }

  const channels: FreedomContactChannel[] = [];
  const primaryEmail = normalizeOptional(input.primaryEmail);
  if (primaryEmail) {
    const { data: channelRow, error: channelError } = await client
      .from('freedom_contact_channels')
      .insert({
        contact_id: contactRow.id,
        channel_type: 'email',
        label: normalizeOptional(input.primaryEmailLabel) ?? 'Primary email',
        value: normalizeEmailAddress(primaryEmail),
        is_primary: true,
        trust_for_email: input.trustForEmail ?? true,
        approval_required: input.approvalRequired ?? true,
        status: 'active',
        source_kind: 'manual',
        source_detail: 'communications',
        created_at: toIso(now),
        updated_at: toIso(now),
      })
      .select('id, contact_id, channel_type, label, value, is_primary, trust_for_email, approval_required, status, source_kind, source_detail, created_at, updated_at')
      .single();

    if (channelError) {
      throw channelError;
    }

    const mappedChannel = mapChannel(channelRow);
    channels.push(mappedChannel);

    if (mappedChannel.trustForEmail) {
      await upsertLegacyEmailRecipient({
        label: displayFreedomContactName({
          fullName: contactRow.full_name,
          preferredName: contactRow.preferred_name,
        }),
        destination: mappedChannel.value,
        createdAt: mappedChannel.createdAt,
        updatedAt: mappedChannel.updatedAt,
      });
    }
  }

  return mapContact(contactRow, channels);
}

export async function deleteFreedomContact(contactId: string) {
  const client = createSupabaseAdminClient();
  const { data: channels, error: channelError } = await client
    .from('freedom_contact_channels')
    .select('id, contact_id, channel_type, label, value, is_primary, trust_for_email, approval_required, status, source_kind, source_detail, created_at, updated_at')
    .eq('contact_id', contactId);

  if (channelError && !isMissingTableError(channelError)) {
    throw channelError;
  }

  const trustedEmailDestinations = (channels ?? [])
    .map(mapChannel)
    .filter((channel) => channel.channelType === 'email' && channel.trustForEmail)
    .map((channel) => channel.value);

  const { error } = await client
    .from('freedom_contacts')
    .delete()
    .eq('id', contactId);

  if (error) {
    throw error;
  }

  await deleteLegacyEmailRecipients(trustedEmailDestinations);

  return { ok: true as const, deletedContactId: contactId };
}

export async function loadTrustedEmailRecipientsFromContacts() {
  const snapshot = await loadFreedomContactSnapshot();

  return snapshot.contacts
    .flatMap((contact) =>
      contact.channels
        .filter((channel) => channel.channelType === 'email' && channel.status === 'active' && channel.trustForEmail)
        .map((channel) => toEmailRecipient(contact, channel)),
    )
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function resolveTrustedEmailRecipientFromContacts(input: {
  recipientId?: string | null;
  recipientDestination?: string | null;
}) {
  const recipients = await loadTrustedEmailRecipientsFromContacts();

  if (input.recipientId) {
    return recipients.find((recipient) => recipient.id === input.recipientId) ?? null;
  }

  const destination = normalizeOptional(input.recipientDestination ?? undefined);
  if (!destination) {
    return null;
  }

  return (
    recipients.find((recipient) => normalizeEmailAddress(recipient.destination) === normalizeEmailAddress(destination))
    ?? null
  );
}
