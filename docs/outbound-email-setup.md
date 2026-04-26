# Outbound Email Setup

Document status: live reference

## Recommended Sender Path

Use Resend for outbound delivery and keep Google mailbox credentials out of the Freedom desktop runtime.

For `freedom@agoperations.ca`, verify `agoperations.ca` in Resend, then send from:

```env
OUTBOUND_EMAIL_FROM=freedom@agoperations.ca
OUTBOUND_EMAIL_REPLY_TO=freedom@agoperations.ca
```

## Desktop `.env`

Put these values in the root `.env` on the desktop that runs the gateway:

```env
OUTBOUND_EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
OUTBOUND_EMAIL_FROM=freedom@agoperations.ca
OUTBOUND_EMAIL_REPLY_TO=freedom@agoperations.ca
```

Do not put a Google mailbox password in the repo or in Freedom desktop runtime config.

## Resend Setup

1. Create a Resend account.
2. Add `agoperations.ca` as a verified domain.
3. Complete the DNS verification steps in Resend.
4. Create a Resend API key.
5. Put that API key into the desktop `.env`.

## Freedom Control-Plane Flow

1. Open `/contacts` in the Next.js control plane.
2. Add one or more contact cards with trusted email channels.
3. Open `/communications` and confirm email delivery shows as ready from `freedom@agoperations.ca`.
4. Ask Freedom by voice to email a summary or update.
5. Review the pending draft in the desktop voice console, mobile session flow, or the Communications page.
6. Confirm the send explicitly in the UI.

## Mobile Flow (legacy Connect path)

1. Refresh the phone against the desktop.
2. Open `Host -> External Reports`.
3. Add one or more trusted recipient email addresses.
4. In chat, open a completed assistant reply.
5. Tap `Email this reply`, or ask for the email naturally in voice and confirm when Freedom prepares the draft.
6. Choose the recipient, edit subject/intro, and send.

## Validation

1. Confirm `/communications` says email delivery is ready from `freedom@agoperations.ca`.
2. Add a contact with a trusted email channel in `/contacts`.
3. Ask Freedom to prepare an email draft for that recipient.
4. Confirm the email arrives and the Communications page shows a delivery log entry.
5. If you are validating the older mobile flow, also confirm `Host -> External Reports`
   still reports email delivery as ready.

## Notes

- The default send path reuses existing assistant output and does not call the model again.
- The canonical desktop operator flow now uses the Contacts page for manual entry and retrieval,
  then uses Communications for governed send confirmation and delivery audit.
- The legacy mobile path still uses gateway-local trusted recipient state.
- The current control-plane path stores contacts plus trusted email channels in Supabase so the
  newer web voice/runtime path does not depend on gateway-local recipient state.
- If delivery fails, check `RESEND_API_KEY`, domain verification, and the sender address first.
