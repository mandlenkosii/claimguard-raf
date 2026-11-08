// TXT-60 … TXT-64 (Section 10, BR22). The SQL function notification_text() holds the same templates.
// Event type, claim reference and status only: never names, ID numbers, document contents or evidence.
export type NotificationType = 'request' | 'response' | 'assignment' | 'claim_update' | 'message';

export function notificationText(
  type: NotificationType,
  values: { reference: string; status?: string },
): { title: string; summary: string } {
  const { reference, status } = values;
  switch (type) {
    case 'request':
      return { title: 'New information request', summary: `You have a new information request on claim ${reference}.` };
    case 'response':
      return { title: 'New response', summary: `A response was submitted on claim ${reference}.` };
    case 'assignment':
      return { title: 'Claim assigned', summary: `You have been assigned to claim ${reference}.` };
    case 'claim_update':
      return { title: 'Claim status updated', summary: `Claim ${reference} is now ${status}.` };
    case 'message':
      return { title: 'New message', summary: `You have a new message on claim ${reference}.` };
  }
}
