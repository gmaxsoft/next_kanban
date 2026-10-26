import { Button, Heading, Hr, Link, Text } from "react-email";

import { EmailLayout } from "@/emails/layout";
import { emailStyles as s } from "@/emails/styles";

export function TicketStatusChangedEmail({
  requesterName,
  displayId,
  subject,
  statusLabel,
  ticketUrl,
}: {
  requesterName: string | null;
  displayId: string;
  subject: string;
  statusLabel: string;
  ticketUrl: string;
}) {
  const lead = `Twoje zgłoszenie ${displayId} zmieniło status na: ${statusLabel}.`;

  return (
    <EmailLayout preview={lead}>
      <Heading style={s.heading}>Zmiana statusu zgłoszenia</Heading>
      <Text style={s.text}>
        Dzień dobry{requesterName ? ` ${requesterName}` : ""},
      </Text>
      <Text style={s.text}>
        Twoje zgłoszenie{" "}
        <Link href={ticketUrl} style={s.link}>
          {displayId}
        </Link>{" "}
        zmieniło status na: <span style={s.strong}>{statusLabel}</span>.
      </Text>
      <Text style={s.meta}>
        Temat: <span style={s.strong}>{subject}</span>
      </Text>
      <Hr style={s.divider} />
      <Button href={ticketUrl} style={s.button}>
        Otwórz zgłoszenie {displayId}
      </Button>
    </EmailLayout>
  );
}
