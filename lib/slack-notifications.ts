// Using 'use server' for this utility if it's only called from server actions
// and to potentially access environment variables securely.
// However, for a simple utility like this, it might not be strictly necessary
// if it's just a helper function. Let's keep it simple for now.
// If it were to make fetch requests, 'use server' would be more relevant
// for actions, or it would be a regular server-side module.

export async function sendSlackNotification(message: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (webhookUrl && webhookUrl !== "dummy_url_for_testing") {
    console.log(`Attempting to send Slack notification: "${message}"`)
    try {
      // In a real scenario, you would use fetch:
      /*
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: message }),
      });

      if (!response.ok) {
        console.error(`Slack notification failed: ${response.status} ${response.statusText}`);
        const responseBody = await response.text();
        console.error(`Response body: ${responseBody}`);
      } else {
        console.log('Slack notification sent successfully.');
      }
      */
      // For this stub, we just log the intent.
      console.log(
        `[STUB] Slack notification would be sent to ${webhookUrl.substring(0, webhookUrl.indexOf("hooks.slack.com") + "hooks.slack.com".length)}...: "${message}"`,
      )
    } catch (error) {
      console.error("Error sending Slack notification:", error)
    }
  } else if (webhookUrl === "dummy_url_for_testing") {
    console.log(`[STUB] Slack notification (dummy URL configured) for message: "${message}"`)
  } else {
    console.log(`Slack notifications not configured (SLACK_WEBHOOK_URL not set). Message: "${message}"`)
  }
}
