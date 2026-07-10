import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ThemeSection } from "@/components/settings/theme-section";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-foreground-muted">Manage your account and appearance.</p>
      </div>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-lg text-foreground">Account</h2>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-16 text-foreground-muted">Name</dt>
            <dd className="text-foreground">{session.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 text-foreground-muted">Email</dt>
            <dd className="text-foreground">{session.email}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-lg text-foreground">Change password</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-lg text-foreground">Appearance</h2>
        <p className="mt-1 text-sm text-foreground-muted">Choose how the app looks.</p>
        <div className="mt-4">
          <ThemeSection />
        </div>
      </section>
    </div>
  );
}
