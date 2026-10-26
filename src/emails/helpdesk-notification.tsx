import { Button, Heading, Hr, Link, Text } from "react-email";

import { EmailLayout } from "@/emails/layout";
import { emailStyles as s } from "@/emails/styles";

export function HelpdeskNotificationEmail({
  recipientName,
  title,
  body,
  actionUrl,
  actionLabel = "Otwórz w panelu",
  ticketDisplayId,
  ticketSubject,
}: {
  recipientName?: string | null;
  title: string;
  body: string;
  actionUrl: string;
  actionLabel?: string;
  ticketDisplayId?: string;
  ticketSubject?: string;
}) {
  return (
    <EmailLayout preview={title}>
      <Heading style={s.heading}>{title}</Heading>
      <Text style={s.text}>
        Cześć{recipientName ? ` ${recipientName}` : ""},
      </Text>
      <Text style={s.textPre}>{body}</Text>
      {ticketDisplayId || ticketSubject ? (
        <Text style={s.meta}>
          {ticketDisplayId ? (
            <>
              Zgłoszenie:{" "}
              <Link href={actionUrl} style={s.link}>
                {ticketDisplayId}
              </Link>
              {ticketSubject ? ` — ${ticketSubject}` : null}
            </>
          ) : (
            ticketSubject
          )}
        </Text>
      ) : null}
      <Hr style={s.divider} />
      <Button href={actionUrl} style={s.button}>
        {actionLabel}
      </Button>
      <Text style={s.muted}>{actionUrl}</Text>
    </EmailLayout>
  );
}
