import { LogoMark } from "@/components/ui/logo-mark";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={40} />
          <h1 className="font-display mt-4 text-2xl text-foreground">Student Score Tracker</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">
            Sign in to see who&apos;s climbing.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
