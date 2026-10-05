type JsonRecord = Record<string, unknown>;

export type OneSignalDelivery = {
  delivered: boolean;
  notificationId: string | null;
  recipients: number | null;
  errors: string[];
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeErrors = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((error) => String(error));
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  return [];
};

export const parseOneSignalDelivery = (response: unknown): OneSignalDelivery => {
  const envelope = isRecord(response) ? response : {};
  const payload = isRecord(envelope.data) ? envelope.data : envelope;
  const notificationId =
    typeof payload.id === "string" && payload.id.trim() ? payload.id : null;
  const recipients =
    typeof payload.recipients === "number"
      ? payload.recipients
      : typeof payload.successful === "number"
        ? payload.successful
        : null;
  const errors = normalizeErrors(payload.errors ?? envelope.errors);

  return {
    delivered:
      Boolean(notificationId) &&
      errors.length === 0 &&
      (recipients === null || recipients > 0),
    notificationId,
    recipients,
    errors,
  };
};