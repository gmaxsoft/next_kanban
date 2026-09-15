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

const quote = {
  backgroundColor: "#09090b",
  borderLeft: "3px solid #4f46e5",
  borderRadius: "8px",
  color: "#e4e4e7",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
  padding: "12px 14px",
  whiteSpace: "pre-wrap" as const,
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
      <Heading style={heading}>
        {mentioned ? "Wspomniano Cię w komentarzu" : "Nowy komentarz w zadaniu"}
      </Heading>
      <Text style={text}>Cześć {assigneeName},</Text>
      <Text style={text}>
        <span style={strong}>{actorName}</span>{" "}
        {mentioned
          ? "oznaczył(a) Cię w komentarzu do zadania"
          : "dodał(a) komentarz do zadania"}{" "}
        <span style={strong}>„{taskTitle}”</span> na tablicy{" "}
        <span style={strong}>{boardTitle}</span>.
      </Text>
      <Text style={quote}>{commentExcerpt}</Text>
      <Hr style={divider} />
      <Button href={taskUrl} style={button}>
        Zobacz komentarz
      </Button>
    </EmailLayout>
  );
}
