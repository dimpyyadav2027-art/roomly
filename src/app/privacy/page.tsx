import Link from "next/link";

export const metadata = {
  title: "Privacy - Roomly",
  description: "How Roomly handles your photos and account.",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 20px", fontFamily: "system-ui, sans-serif", lineHeight: 1.6, color: "#1f2933" }}>
      <p><Link href="/">← Back to Roomly</Link></p>
      <h1>Privacy at Roomly</h1>
      <p><i>Last updated: October 23, 2026</i></p>

      <h2>Your room photos</h2>
      <p>Photos you upload are used in your own browser. Roomly does not upload or store your photo on our servers, and it is not saved in your browser's storage. Closing the tab removes it.</p>
      <p>If you choose the AI restyle, that one photo is sent to Cloudflare's AI service (Workers AI) to generate the concept image, only after you agree. If you use tap-to-add, only the part of the photo around the spot you tap is sent, again only after you agree. These requests include no other personal data. Cloudflare's terms for this service are at https://developers.cloudflare.com/workers-ai/platform/data-usage/.</p>

      <h2>What we store in your browser</h2>
      <p>Your design brief (theme, room type, budget and shopping list) is saved in your browser's local storage so it survives a refresh. You can clear it any time from your browser settings. It never leaves your device.</p>

      <h2>Accounts</h2>
      <p>If you sign in, we store your email address and sign-in method in Supabase (our authentication provider) so you can log in again, and your browser stores a Supabase session token in local storage to keep you signed in. Signing in with Google shares your Google account email and basic profile with Roomly. We do not post to your Google account or access your contacts, files or emails.</p>
      <p>Roomly loads Google AdSense code so that Google can review the site for advertising. Google may use cookies or similar technologies for ads. Your room photos are not sent to Google. See Google&apos;s policy at https://policies.google.com/technologies/ads for how Google uses data from sites that use its advertising services.</p>

      <h2>What we do not do</h2>
      <p>We do not sell your data, or use your photos to train AI models.</p>

      <h2>Contact</h2>
      <p>Questions: dimpy.yadav2027@mastersunion.org</p>
    </main>
  );
}
