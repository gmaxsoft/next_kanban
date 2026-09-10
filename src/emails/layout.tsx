import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from "react-email";
import type { ReactNode } from "react";

const body = {
  backgroundColor: "#09090b",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  margin: 0,
  padding: "24px 12px",
};

const container = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "16px",
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden" as const,
};

const header = {
  backgroundColor: "#4f46e5",
  color: "#fafafa",
  fontSize: "14px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  padding: "16px 24px",
  textTransform: "uppercase" as const,
};

const content = {
  padding: "8px 24px 24px",
};

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="pl">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>Next Kanban</Section>
          <Section style={content}>{children}</Section>
        </Container>
      </Body>
    </Html>
  );
}
