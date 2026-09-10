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

export function TaskAssignedEmail({
  assigneeName,
  actorName,
  taskTitle,
  boardTitle,
  taskUrl,
}: {
  assigneeName: string;
  actorName: string;
  taskTitle: string;
  boardTitle: string;
  taskUrl: string;
}) {
  return (
    <EmailLayout preview={`${actorName} przypisał(a) Cię do zadania „${taskTitle}”.`}>
      <Heading style={heading}>Przypisano Cię do zadania</Heading>
      <Text style={text}>Cześć {assigneeName},</Text>
      <Text style={text}>
        <span style={strong}>{actorName}</span> przypisał(a) Cię do zadania{" "}
        <span style={strong}>„{taskTitle}”</span> na tablicy{" "}
        <span style={strong}>{boardTitle}</span>.
      </Text>
      <Hr style={divider} />
      <Button href={taskUrl} style={button}>
        Otwórz zadanie
      </Button>
    </EmailLayout>
  );
}
