import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import {
  layout,
  typography,
  button,
  utils,
  branding,
  colors,
  DEFAULT_LOGO_URL,
} from './shared-styles'

interface StatusChangeEmailProps {
  postTitle: string
  postUrl: string
  previousStatus: string
  newStatus: string
  organizationName: string
  unsubscribeUrl: string
  logoUrl?: string
}

function getStatusEmoji(status: string): string {
  const map: Record<string, string> = {
    open: '📥',
    under_review: '👀',
    planned: '📅',
    in_progress: '🚧',
    complete: '✅',
    closed: '🔒',
  }
  return map[status.toLowerCase().replace(/\s+/g, '_')] || '📌'
}

function capitalizeStatus(status: string): string {
  return status
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function StatusChangeEmail({
  postTitle,
  postUrl,
  previousStatus,
  newStatus,
  organizationName,
  unsubscribeUrl,
  logoUrl,
}: StatusChangeEmailProps) {
  const emoji = getStatusEmoji(newStatus)
  const formattedNewStatus = capitalizeStatus(newStatus)
  const formattedPreviousStatus = capitalizeStatus(previousStatus)

  return (
    <Html>
      <Head />
      <Preview>
        {emoji} Your feedback is now {formattedNewStatus}
      </Preview>
      <Body style={layout.main}>
        <Container style={layout.container}>
          {/* Logo */}
          <Section style={branding.logoContainer}>
            <Img src={logoUrl ?? DEFAULT_LOGO_URL} alt={organizationName} style={branding.logo} />
          </Section>

          {/* Content */}
          <Heading style={typography.h1}>
            {emoji} Your feedback is now {formattedNewStatus}!
          </Heading>
          <Text style={typography.text}>
            Great news! The status of your feedback has been updated on {organizationName}.
          </Text>

          {/* Post Title */}
          <Section
            style={{
              backgroundColor: colors.surfaceMuted,
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '24px',
            }}
          >
            <Text style={{ ...typography.text, margin: 0, fontWeight: '600' }}>{postTitle}</Text>
          </Section>

          {/* Status Change */}
          <Text style={typography.text}>
            <span style={{ color: colors.textMuted }}>{formattedPreviousStatus}</span>
            {' → '}
            <strong>{formattedNewStatus}</strong>
          </Text>

          {/* CTA Button */}
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button.primary} href={postUrl}>
              View Feedback
            </Button>
          </Section>

          {/* Footer */}
          <Text style={typography.footer}>
            You received this email because you submitted or subscribed to this feedback.
            <br />
            <Link href={unsubscribeUrl} style={{ ...utils.link, fontSize: '13px' }}>
              Unsubscribe from this post
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
