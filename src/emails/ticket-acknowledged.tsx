import { Button, Heading, Hr, Link, Text } from "react-email";

import { EmailLayout } from "@/emails/layout";
import { emailStyles as s } from "@/emails/styles";

export function TicketAcknowledgedEmail({
  requesterName,
  displayId,
  subject,
  ticketUrl,
}: {
  requesterName: string | null;
  displayId: string;
  subject: string;
  ticketUrl: string;
}) {
  return (
    <EmailLayout preview={`Otrzymaliśmy zgłoszenie ${displayId}`}>
      <Heading style={s.heading}>Otrzymaliśmy Twoje zgłoszenie</Heading>
      <Text style={s.text}>
        Dzień dobry{requesterName ? ` ${requesterName}` : ""},
      </Text>
      <Text style={s.text}>
        Potwierdzamy przyjęcie zgłoszenia{" "}
        <Link href={ticketUrl} style={s.link}>
          {displayId}
        </Link>
        .
      </Text>
      <Text style={s.meta}>
        Temat: <span style={s.strong}>{subject}</span>
        <br />
        Numer:{" "}
        <Link href={ticketUrl} style={s.link}>
          {displayId}
        </Link>
      </Text>
      <Text style={s.text}>
        HelpDesk zajmie się sprawą. Odpowiadając na tę wiadomość, pozostaw
        numer zgłoszenia w temacie.
      </Text>
      <Hr style={s.divider} />
      <Button href={ticketUrl} style={s.button}>
        Otwórz zgłoszenie {displayId}
      </Button>
    </EmailLayout>
  );
}
