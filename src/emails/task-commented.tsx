import { Button, Heading, Hr, Text } from "react-email";

import { EmailLayout } from "@/emails/layout";
import { emailStyles as s } from "@/emails/styles";

export function TaskCommentedEmail({
  assigneeName,
  actorName,
  taskTitle,
  boardTitle,
  commentExcerpt,
  taskUrl,
  mentioned = false,
}: {
  assigneeName: string;
  actorName: string;
  taskTitle: string;
  boardTitle: string;
  commentExcerpt: string;
  taskUrl: string;
  mentioned?: boolean;
}) {
  return (
    <EmailLayout
      preview={
        mentioned
          ? `${actorName} wspomniał(a) Cię w zadaniu „${taskTitle}”.`
          : `${actorName} dodał(a) komentarz w zadaniu „${taskTitle}”.`
      }
    >
      <Heading style={s.heading}>
        {mentioned ? "Wspomniano Cię w komentarzu" : "Nowy komentarz w zadaniu"}
      </Heading>
      <Text style={s.text}>Cześć {assigneeName},</Text>
      <Text style={s.text}>
        <span style={s.strong}>{actorName}</span>{" "}
        {mentioned
          ? "oznaczył(a) Cię w komentarzu do zadania"
          : "dodał(a) komentarz do zadania"}{" "}
        <span style={s.strong}>„{taskTitle}”</span> na tablicy{" "}
        <span style={s.strong}>{boardTitle}</span>.
      </Text>
      <Text style={s.quote}>{commentExcerpt}</Text>
      <Hr style={s.divider} />
      <Button href={taskUrl} style={s.button}>
        Zobacz komentarz
      </Button>
    </EmailLayout>
  );
}
