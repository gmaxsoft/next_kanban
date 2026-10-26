import { Button, Heading, Hr, Text } from "react-email";

import { EmailLayout } from "@/emails/layout";
import { emailStyles as s } from "@/emails/styles";

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
      <Heading style={s.heading}>Przypisano Cię do zadania</Heading>
      <Text style={s.text}>Cześć {assigneeName},</Text>
      <Text style={s.text}>
        <span style={s.strong}>{actorName}</span> przypisał(a) Cię do zadania{" "}
        <span style={s.strong}>„{taskTitle}”</span> na tablicy{" "}
        <span style={s.strong}>{boardTitle}</span>.
      </Text>
      <Hr style={s.divider} />
      <Button href={taskUrl} style={s.button}>
        Otwórz zadanie
      </Button>
    </EmailLayout>
  );
}
