export interface EmailDraftResult {
  subject: string;
  body: string;
}

export async function emailDraftAgent(
  query: string,
  context?: string,
): Promise<EmailDraftResult> {
  const subject = "Real Estate Summary";

  const body = [
    "Hi,",
    "",
    "Here is the requested real estate summary:",
    "",
    context ?? query,
    "",
    "Best,",
    "IDX Exchange",
  ].join("\n");

  return {
    subject,
    body,
  };
}