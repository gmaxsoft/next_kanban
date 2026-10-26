import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";
import type { ReactNode } from "react";

const body = {
  backgroundColor: "#eef2f7",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: "28px 12px",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #dbe3ee",
  borderRadius: "14px",
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden" as const,
};

const header = {
  backgroundColor: "#0c4a6e",
  color: "#f8fafc",
  fontSize: "15px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  padding: "18px 24px",
  textTransform: "uppercase" as const,
};

const content = {
  padding: "20px 24px 8px",
};

const footer = {
  borderTop: "1px solid #e2e8f0",
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
  padding: "16px 24px 20px",
};

export function EmailLayout({
  preview,
  children,
  brand = "HelpDesk",
}: {
  preview: string;
  children: ReactNode;
  brand?: string;
}) {
  return (
    <Html lang="pl">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>{brand}</Section>
          <Section style={content}>{children}</Section>
          <Section>
            <Text style={footer}>
              Wiadomość wysłana automatycznie przez {brand}. Odpowiedz na tego
              maila, aby kontynuować rozmowę w zgłoszeniu.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
