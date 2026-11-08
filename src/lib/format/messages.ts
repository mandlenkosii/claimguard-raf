/**
 * Message catalogue (Section 10). The only place user-facing system messages are written.
 * `{name}` marks a value filled in at run time with `fillMessage`.
 */

export const PROTOTYPE_NOTICE =
  'ClaimGuard RAF — Concept Prototype. Not an official RAF system. Demonstration data only.';

export const PROTOTYPE_NOTICE_SHORT = 'Concept prototype · Demo data only';

export const NOT_AFFILIATED =
  'Concept prototype — not affiliated with or endorsed by the Road Accident Fund. Demonstration data only.';

export const DEMONSTRATION_DATA_LABEL = 'Demonstration data';

export const TRY_AGAIN = 'Try again';

export const TXT = {
  1: "You're offline. Your changes will be saved when your connection returns.",
  2: 'Something went wrong. Please try again.',
  3: "We couldn't load this page. Please try again.",
  4: 'This field is required.',
  5: 'Enter a valid email address.',
  6: 'Passwords do not match.',
  7: 'Use at least 8 characters, including a letter and a number.',
  8: 'Please accept the privacy notice to continue.',
  9: 'Check your email to confirm your account.',
  10: 'This link has expired. Please request a new one.',
  11: "Your legal practitioner account is waiting for an administrator to verify it. You'll be able to sign in once it is approved.",
  12: 'Your session has ended. Please sign in again.',
  13: 'Profile updated.',
  14: 'Signed out of other sessions.',
  15: 'Draft saved {time} ago',
  16: "We couldn't save your draft. Your changes are still on this page. Please try again.",
  17: 'Complete these fields before continuing: {fields}.',
  18: 'Please give a reason.',
  19: 'Claim status updated to {status}.',
  20: "This status change isn't allowed right now. {reason}",
  21: 'Assignment updated.',
  22: 'Client added.',
  23: 'File is larger than 10 MB.',
  24: 'File type not supported (.{extension})',
  25: 'Upload could not be confirmed. Please try again.',
  26: "We couldn't read this document. Retry, or send it for manual review.",
  27: 'This file failed the security scan and was not uploaded.',
  28: 'Sent for manual review.',
  29: 'Checks updated.',
  30: 'Issue updated.',
  31: 'Alert updated.',
  32: 'Note added.',
  33: 'Please confirm this outcome is based on your own review of the evidence.',
  34: 'Outcome recorded.',
  35: 'Request sent.',
  36: 'Response submitted. An officer will review it.',
  37: 'Request updated.',
  38: 'Message not sent. Please try again.',
  39: 'Invitation sent.',
  40: 'Roles updated.',
  41: 'Account status updated to {status}.',
  42: 'Organisation saved.',
  43: 'Document deleted.',
  44: "This document can't be deleted after the claim has been submitted.",
  45: 'Correction saved.',
  46: 'Weights must add up to 100%.',
  47: 'Rule saved as version {version}.',
  48: "You don't have any claims yet.",
  49: 'No documents uploaded yet.',
  50: "You're all caught up.",
  51: "Checks haven't run for this claim yet.",
  52: 'No risk alerts for this claim.',
  '52b': 'No alerts match these filters.',
  53: 'No information requests yet.',
  54: 'No messages yet. Start a conversation.',
  55: 'No activity matches these filters.',
  56: 'Too many attempts. Please wait a minute and try again.',
  57: 'No clients yet.',
  58: 'Nothing outstanding.',
  59: 'No results for the selected filters.',
} as const;

export type MessageId = keyof typeof TXT;

/** Fills `{name}` placeholders in a catalogue message. */
export function fillMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
