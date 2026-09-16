import { Button, Heading, Hr, Text } from "react-email";

import { EmailLayout } from "@/emails/layout";

const heading = {
  color: "#fafafa",
  fontSize: "22px",
  fontWeight: 600,
  lineHeight: "28px",
  margin: "16px 0 8px",
};

const text = {
  color: "#a1a1aa",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 12px",
  whiteSpace: "pre-wrap" as const,
};

const strong = {
  color: "#fafafa",
};

const button = {
  backgroundColor: "#4f46e5",
  borderRadius: "10px",
  color: "#fafafa",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 18px",
  textDecoration: "none",
};

const divider = {
  borderColor: "#27272a",
  margin: "8px 0 16px",
};

export function TicketReplyEmail({
  requesterName,
  agentName,
  ticketId,
  subject,
  body,
  ticketUrl,
}: {
  requesterName: string;
  agentName: string;
  ticketId: string;
  subject: string;
  body: string;
  ticketUrl: string;
}) {
  return (
    <EmailLayout preview={`Odpowiedź w tickecie ${ticketId}: ${subject}`}>
      <Heading style={heading}>Odpowiedź na zgłoszenie {ticketId}</Heading>
      <Text style={text}>
        Cześć {requesterName || "Kliencie"},
      </Text>
      <Text style={text}>
        <span style={strong}>{agentName}</span> odpowiedział(a) w sprawie:{" "}
        <span style={strong}>{subject}</span>
      </Text>
      <Hr style={divider} />
      <Text style={text}>{body}</Text>
      <Hr style={divider} />
      <Button href={ticketUrl} style={button}>
        Podgląd wątku (panel)
      </Button>
    </EmailLayout>
  );
}
