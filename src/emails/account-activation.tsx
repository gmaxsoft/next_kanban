import { Button, Heading, Hr, Text } from "react-email";

import { EmailLayout } from "@/emails/layout";
import { emailStyles as s } from "@/emails/styles";

export function AccountActivationEmail({
  userName,
  activationUrl,
}: {
  userName: string;
  activationUrl: string;
}) {
  return (
    <EmailLayout preview="Aktywuj konto HelpDesk i ustaw hasło">
      <Heading style={s.heading}>Aktywuj swoje konto</Heading>
      <Text style={s.text}>Dzień dobry {userName},</Text>
      <Text style={s.text}>
        Na podstawie Twojej wiadomości do HelpDesk utworzyliśmy dla Ciebie
        konto z dostępem ograniczonym (tickety). Aby z niego korzystać,
        ustaw hasło i aktywuj konto.
      </Text>
      <Text style={s.meta}>
        Link jest ważny 7 dni. Jeśli nie zakładałaś / nie zakładałeś konta,
        zignoruj tę wiadomość.
      </Text>
      <Hr style={s.divider} />
      <Button href={activationUrl} style={s.button}>
        Aktywuj konto i ustaw hasło
      </Button>
    </EmailLayout>
  );
}
