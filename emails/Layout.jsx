import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

const colors = {
  page: "#eef5fb",
  primary: "#1f5b9d",
  primaryDark: "#123b67",
  primaryLight: "#eaf3ff",
  orange: "#d9653a",
  text: "#172033",
  muted: "#667386",
  border: "#c4d8ec",
  white: "#ffffff",
}

export function Layout({ preview, eyebrow, title, children, actionLabel, actionUrl, note }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.hero}>
            <Section style={styles.brandRow}>
              <Text style={styles.mark}>VS</Text>
              <Section style={styles.brandText}>
                <Text style={styles.product}>Meu Ponto CLT</Text>
                <Text style={styles.company}>Virtus Soft</Text>
              </Section>
            </Section>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </Section>

          <Section style={styles.card}>
            <Heading style={styles.title}>{title}</Heading>
            {children}

            {actionUrl && actionLabel && (
              <Button href={actionUrl} style={styles.button}>
                {actionLabel}
              </Button>
            )}

            {actionUrl && (
              <Section style={styles.fallbackBox}>
                <Text style={styles.small}>Se o botão não funcionar, copie e cole este link no navegador:</Text>
                <Text style={styles.link}>{actionUrl}</Text>
              </Section>
            )}

            {note && <Text style={styles.note}>{note}</Text>}

            <Hr style={styles.hr} />
            <Text style={styles.signature}>Equipe Virtus Soft</Text>
            <Text style={styles.footer}>
              Você recebeu este e-mail porque usa ou solicitou acesso ao Meu Ponto CLT.
            </Text>
            <Text style={styles.footer}>
              <Link href={`${siteUrl}/privacidade`} style={styles.footerLink}>
                Política de Privacidade
              </Link>
              {"  |  "}
              <Link href={`${siteUrl}/termos-de-uso`} style={styles.footerLink}>
                Termos de Uso
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function Paragraph({ children }) {
  return <Text style={styles.text}>{children}</Text>
}

export function Highlight({ children }) {
  return (
    <Section style={styles.highlight}>
      <Text style={styles.highlightText}>{children}</Text>
    </Section>
  )
}

const styles = {
  body: {
    margin: 0,
    backgroundColor: colors.page,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  container: {
    width: "100%",
    maxWidth: "580px",
    margin: "0 auto",
    padding: "30px 16px",
  },
  hero: {
    padding: "24px 22px",
    backgroundColor: colors.primary,
    borderRadius: "18px 18px 0 0",
  },
  brandRow: {
    display: "table",
    width: "100%",
  },
  mark: {
    display: "inline-block",
    width: "52px",
    height: "52px",
    margin: "0 14px 0 0",
    borderRadius: "16px",
    backgroundColor: colors.white,
    color: colors.primaryDark,
    fontSize: "18px",
    fontWeight: "800",
    lineHeight: "52px",
    textAlign: "center",
  },
  brandText: {
    display: "inline-block",
    verticalAlign: "top",
  },
  product: {
    margin: "4px 0 0",
    color: colors.white,
    fontSize: "21px",
    fontWeight: "800",
    lineHeight: "1.2",
  },
  company: {
    margin: "4px 0 0",
    color: "#cfe5ff",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  },
  eyebrow: {
    margin: "18px 0 0",
    color: "#dbeafe",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  card: {
    padding: "26px 22px",
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderTop: "0",
    borderRadius: "0 0 18px 18px",
  },
  title: {
    margin: "0 0 16px",
    color: colors.primaryDark,
    fontSize: "25px",
    lineHeight: "1.25",
  },
  text: {
    margin: "0 0 13px",
    color: colors.text,
    fontSize: "15px",
    lineHeight: "1.65",
  },
  highlight: {
    margin: "16px 0",
    padding: "14px 16px",
    backgroundColor: colors.primaryLight,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
  },
  highlightText: {
    margin: 0,
    color: colors.primaryDark,
    fontSize: "14px",
    lineHeight: "1.55",
  },
  button: {
    display: "block",
    margin: "24px 0",
    padding: "14px 18px",
    backgroundColor: colors.primary,
    borderRadius: "12px",
    color: colors.white,
    fontSize: "15px",
    fontWeight: "800",
    textAlign: "center",
    textDecoration: "none",
  },
  fallbackBox: {
    margin: "0 0 14px",
    padding: "12px",
    backgroundColor: "#f8fbff",
    border: `1px solid ${colors.border}`,
    borderRadius: "10px",
  },
  small: {
    margin: "0 0 8px",
    color: colors.muted,
    fontSize: "12px",
    lineHeight: "1.5",
  },
  link: {
    margin: 0,
    color: colors.primaryDark,
    fontSize: "12px",
    lineHeight: "1.5",
    wordBreak: "break-all",
  },
  note: {
    margin: "16px 0 0",
    color: colors.muted,
    fontSize: "12px",
    lineHeight: "1.5",
  },
  hr: {
    margin: "24px 0 14px",
    borderColor: colors.border,
  },
  signature: {
    margin: "0 0 6px",
    color: colors.primaryDark,
    fontSize: "13px",
    fontWeight: "800",
  },
  footer: {
    margin: "0 0 8px",
    color: colors.muted,
    fontSize: "12px",
    lineHeight: "1.5",
  },
  footerLink: {
    color: colors.primaryDark,
    fontWeight: "700",
    textDecoration: "none",
  },
}
