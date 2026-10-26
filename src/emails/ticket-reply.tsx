import { Button, Heading, Hr, Link, Text } from "react-email";

import { EmailLayout } from "@/emails/layout";
import { emailStyles as s } from "@/emails/styles";

export function TicketReplyEmail({
  requesterName,
  agentName,
  displayId,
  subject,
  body,
  ticketUrl,
}: {
  requesterName: string;
  agentName: string;
  displayId: string;
  subject: string;
  body: string;
  ticketUrl: string;
}) {
  return (
    <EmailLayout preview={`Odpowiedź w zgłoszeniu ${displayId}: ${subject}`}>
      <Heading style={s.heading}>
        Odpowiedź na zgłoszenie{" "}
        <Link href={ticketUrl} style={s.link}>
          {displayId}
        </Link>
      </Heading>
      <Text style={s.text}>
        Dzień dobry{requesterName ? ` ${requesterName}` : ""},
      </Text>
      <Text style={s.text}>
        <span style={s.strong}>{agentName}</span> odpowiedział(a) w sprawie
        zgłoszenia{" "}
        <Link href={ticketUrl} style={s.link}>
          {displayId}
        </Link>
        : <span style={s.strong}>{subject}</span>
      </Text>
      <Text style={s.quote}>{body}</Text>
      <Hr style={s.divider} />
      <Button href={ticketUrl} style={s.button}>
        Otwórz zgłoszenie {displayId}
      </Button>
    </EmailLayout>
  );
}
