import 'server-only';

import type {
  FreedomEmailDelivery,
  FreedomEmailRecipient,
  FreedomEmailRecipientCreateRequest,
  FreedomEmailSendRequest,
  FreedomEmailSendResponse,
  FreedomEmailSnapshot,
  FreedomEmailStatus,
  FreedomOutboundProvider,
} from '@/lib/freedom-email';
import {
  createFreedomContact,
  deleteFreedomContact,
  loadTrustedEmailRecipientsFromContacts,
  resolveTrustedEmailRecipientFromContacts,
} from '@/lib/freedom-contacts-store';
import { normalizeEmailAddress } from '@/lib/freedom-email';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase-admin';

type RecipientRow = {
  id: string;
  label: string;
  destination: string;
  created_at: string;
  updated_at: string;
};

type DeliveryRow = {
  id: string;
  recipient: string;
  subject: string;
  provider: Exclude<FreedomOutboundProvider, 'none'>;
  delivery_id: string;
  delivered_at: string;
};

type EmailSendInput = {
  from: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  html: string;
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

function normalizeProvider(value: string | undefined): FreedomOutboundProvider {
  return value?.trim().toLowerCase() === 'resend' ? 'resend' : 'none';
}

function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === 'PGRST205';
}

function mapRecipient(row: RecipientRow): FreedomEmailRecipient {
  return {
    id:          row.id,
    label:       row.label,
    destination: row.destination,
    createdAt:   toEpoch(row.created_at),
    updatedAt:   toEpoch(row.updated_at),
  };
}

function mapDelivery(row: DeliveryRow): FreedomEmailDelivery {
  return {
    id:          row.id,
    recipient:   row.recipient,
    subject:     row.subject,
    provider:    row.provider,
    deliveryId:  row.delivery_id,
    deliveredAt: toEpoch(row.delivered_at),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMessageHtml(content: string) {
  const paragraphs = content
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/^```[\w-]*\n?/, '').replace(/```$/, '').trim();
      return `\n\n<pre>${escapeHtml(code)}</pre>\n\n`;
    })
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs
    .map((paragraph) =>
      paragraph.startsWith('<pre>')
        ? paragraph.replace('<pre>', '<pre style="background:#0f172a;color:#e2e8f0;padding:14px;border-radius:14px;overflow:auto;font-size:13px;line-height:1.5;">')
        : `<p style="font-size:15px;line-height:1.7;color:#1e293b;margin:0 0 16px;">${escapeHtml(paragraph)}</p>`,
    )
    .join('');
}

function renderOutboundEmail(params: {
  subject: string;
  intro: string;
  body: string;
}) {
  const intro = params.intro.trim();
  const content = params.body.trim();
  const introSection = intro ? `${intro}\n\n` : '';
  const text = `${introSection}${content}\n\nSent from Freedom.`.trim();

  return {
    text,
    html: [
      '<!doctype html>',
      '<html><body style="margin:0;padding:24px;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">',
      '<div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:24px;">',
      `<h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;">${escapeHtml(params.subject)}</h1>`,
      intro ? `<p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 18px;">${escapeHtml(intro)}</p>` : '',
      renderMessageHtml(content),
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;" />',
      '<p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">Sent from Freedom.</p>',
      '</div></body></html>',
    ].join(''),
  };
}

class ResendEmailProvider {
  readonly provider = 'resend' as const;

  constructor(private readonly apiKey: string) {}

  async send(input: EmailSendInput) {
    const response = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: input.from,
        to:   [input.to],
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        subject: input.subject,
        text:    input.text,
        html:    input.html,
      }),
    });

    const body = (await response.json().catch(() => null)) as {
      id?: string;
      message?: string;
    } | null;

    if (!response.ok || !body?.id) {
      throw new Error(body?.message ?? `Resend responded with ${response.status}.`);
    }

    return {
      provider:   this.provider,
      deliveryId: body.id,
    };
  }
}

function createEmailProvider() {
  const provider = normalizeProvider(process.env.OUTBOUND_EMAIL_PROVIDER);
  if (provider !== 'resend') {
    return null;
  }

  const apiKey = normalizeOptional(process.env.RESEND_API_KEY);
  if (!apiKey) {
    return null;
  }

  return new ResendEmailProvider(apiKey);
}

function resolveEmailStatus(recipientCount: number): FreedomEmailStatus {
  const provider = normalizeProvider(process.env.OUTBOUND_EMAIL_PROVIDER);
  const fromAddress = normalizeOptional(process.env.OUTBOUND_EMAIL_FROM);
  const replyToAddress = normalizeOptional(process.env.OUTBOUND_EMAIL_REPLY_TO);
  const apiKey = normalizeOptional(process.env.RESEND_API_KEY);
  const enabled = provider === 'resend' && Boolean(fromAddress && apiKey);

  return {
    enabled,
    provider: enabled ? provider : 'none',
    fromAddress,
    replyToAddress,
    recipientCount,
  };
}

export async function loadFreedomEmailSnapshot(): Promise<FreedomEmailSnapshot> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: {
        enabled:        false,
        provider:       'none',
        fromAddress:    null,
        replyToAddress: null,
        recipientCount: 0,
      },
      recipients:       [],
      recentDeliveries: [],
      configured:       false,
    };
  }

  const client = createSupabaseAdminClient();
  const [trustedRecipients, deliveriesResult] = await Promise.all([
    loadTrustedEmailRecipientsFromContacts(),
    client
      .from('freedom_email_deliveries')
      .select('id, recipient, subject, provider, delivery_id, delivered_at')
      .order('delivered_at', { ascending: false })
      .limit(10),
  ]);

  if (deliveriesResult.error) {
    throw deliveriesResult.error;
  }

  let recipients = trustedRecipients;
  if (!recipients.length) {
    const recipientsResult = await client
      .from('freedom_email_recipients')
      .select('id, label, destination, created_at, updated_at')
      .order('label', { ascending: true });

    if (recipientsResult.error && !isMissingTableError(recipientsResult.error)) {
      throw recipientsResult.error;
    }

    recipients = (recipientsResult.data ?? []).map(mapRecipient);
  }

  return {
    status:           resolveEmailStatus(recipients.length),
    recipients,
    recentDeliveries: (deliveriesResult.data ?? []).map(mapDelivery),
    configured:       true,
  };
}

export async function createFreedomEmailRecipient(
  input: FreedomEmailRecipientCreateRequest,
): Promise<FreedomEmailRecipient> {
  const contact = await createFreedomContact({
    fullName: input.label,
    primaryEmail: input.destination,
    primaryEmailLabel: 'Primary email',
    trustForEmail: true,
    approvalRequired: true,
    relationshipContext: 'Created from the trusted outbound email shortcut.',
  });

  const emailChannel = contact.channels.find((channel) => channel.channelType === 'email');
  if (!emailChannel) {
    throw new Error('Freedom could not create a trusted email channel for that contact.');
  }

  return {
    id: emailChannel.id,
    label: contact.preferredName?.trim() || contact.fullName.trim(),
    destination: emailChannel.value,
    createdAt: emailChannel.createdAt,
    updatedAt: emailChannel.updatedAt,
  };
}

export async function deleteFreedomEmailRecipient(recipientId: string) {
  const client = createSupabaseAdminClient();
  const trustedRecipient = await resolveTrustedEmailRecipientFromContacts({
    recipientId,
  });

  if (trustedRecipient) {
    const { data: channelRow, error: channelError } = await client
      .from('freedom_contact_channels')
      .select('contact_id')
      .eq('id', recipientId)
      .single();

    if (channelError) {
      throw channelError;
    }

    return deleteFreedomContact(channelRow.contact_id);
  }

  const { error } = await client
    .from('freedom_email_recipients')
    .delete()
    .eq('id', recipientId);

  if (error && !isMissingTableError(error)) {
    throw error;
  }

  return { ok: true as const, deletedRecipientId: recipientId };
}

async function resolveTrustedRecipient(input: {
  recipientId?: string | null;
  recipientDestination?: string | null;
}) {
  const contactRecipient = await resolveTrustedEmailRecipientFromContacts(input);
  if (contactRecipient) {
    return contactRecipient;
  }

  const client = createSupabaseAdminClient();
  if (input.recipientId) {
    const { data, error } = await client
      .from('freedom_email_recipients')
      .select('id, label, destination, created_at, updated_at')
      .eq('id', input.recipientId)
      .single();

    if (error && !isMissingTableError(error)) {
      throw error;
    }

    if (data) {
      return mapRecipient(data);
    }
  }

  const destination = normalizeOptional(input.recipientDestination ?? undefined);
  if (!destination) {
    throw new Error('A trusted recipient is required before Freedom can send email.');
  }

  const { data, error } = await client
    .from('freedom_email_recipients')
    .select('id, label, destination, created_at, updated_at')
    .eq('destination', normalizeEmailAddress(destination))
    .single();

  if (error && !isMissingTableError(error)) {
    throw error;
  }

  if (!data) {
    throw new Error('Recipient is not trusted yet. Add it on the Contacts page first.');
  }

  return mapRecipient(data);
}

export async function sendFreedomEmail(
  input: FreedomEmailSendRequest,
): Promise<FreedomEmailSendResponse> {
  const provider = createEmailProvider();
  const snapshot = await loadFreedomEmailSnapshot();

  if (!provider || !snapshot.status.enabled || !snapshot.status.fromAddress) {
    throw new Error('Outbound email is not configured for Freedom yet.');
  }

  const recipient = await resolveTrustedRecipient({
    recipientId:          input.recipientId,
    recipientDestination: input.recipientDestination,
  });
  const rendered = renderOutboundEmail({
    subject: input.subject.trim(),
    intro:   input.intro?.trim() ?? '',
    body:    input.body.trim(),
  });

  const delivery = await provider.send({
    from:    snapshot.status.fromAddress,
    to:      recipient.destination,
    replyTo: snapshot.status.replyToAddress,
    subject: input.subject.trim(),
    text:    rendered.text,
    html:    rendered.html,
  });

  const deliveredAt = Date.now();
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from('freedom_email_deliveries')
    .insert({
      recipient:    recipient.destination,
      subject:      input.subject.trim(),
      provider:     delivery.provider,
      delivery_id:  delivery.deliveryId,
      delivered_at: toIso(deliveredAt),
    })
    .select('id, recipient, subject, provider, delivery_id, delivered_at')
    .single();

  if (error) {
    throw error;
  }

  void data;

  return {
    ok: true,
    recipient,
    deliveryId:  delivery.deliveryId,
    provider:    delivery.provider,
    deliveredAt,
  };
}
