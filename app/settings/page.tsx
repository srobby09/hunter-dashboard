import SettingsClient from "./SettingsClient";

export const metadata = { title: "Settings · Hunter Dashboard" };

export default function SettingsPage() {
  // Static page: the build time is when this version was deployed.
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);
  return <SettingsClient version={sha} builtAt={new Date().toISOString()} />;
}
