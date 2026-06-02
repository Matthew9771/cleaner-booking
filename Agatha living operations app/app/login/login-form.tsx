"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "sign-up";

type LoginFormProps = {
  allowSignUp?: boolean;
  portal?: "admin" | "cleaner";
};

export function LoginForm({ allowSignUp = false, portal = "admin" }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (mode === "sign-in" || !allowSignUp) {
      return;
    }

    event.preventDefault();
    setLoading(true);
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();

    const supabase = createClient();
    const result = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    setLoading(false);

    if (result.error) {
      const errorMessage = result.error.message.toLowerCase().includes("email not confirmed")
        ? "This account exists, but Supabase has not confirmed the email yet. For a fake test email, confirm the user in Supabase Auth or turn email confirmation off while testing."
        : result.error.message;
      setMessage(errorMessage);
      return;
    }

    if (mode === "sign-up" && !result.data.session) {
      setMessage("Account created. Check your email to confirm your login.");
      return;
    }

    const userId = result.data.user?.id;
    let nextPath = portal === "cleaner" ? "/cleaner" : "/dashboard";

    if (userId) {
      const { data: linkedCleaner } = await supabase.rpc("link_current_user_to_cleaner", {
        cleaner_email_input: normalizedEmail
      });

      if (linkedCleaner && typeof linkedCleaner === "object" && "linked" in linkedCleaner && linkedCleaner.linked) {
        router.push("/cleaner");
        router.refresh();
        return;
      }

      const { data: cleaner } = await supabase
        .from("cleaners")
        .select("id, can_login")
        .ilike("email", normalizedEmail)
        .eq("can_login", true)
        .maybeSingle();

      if (cleaner?.id) {
        await Promise.all([
          supabase.from("cleaners").update({ auth_user_id: userId }).eq("id", cleaner.id),
          supabase.from("profiles").update({ role: "cleaner", full_name: fullName || normalizedEmail }).eq("id", userId)
        ]);
        nextPath = "/cleaner";
      } else {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
        nextPath = profile?.role === "cleaner" ? "/cleaner" : "/dashboard";
      }
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form action="/login/submit" className="auth-form" method="post" onSubmit={handleSubmit}>
      <input name="portal" type="hidden" value={portal} />
      <input name="mode" type="hidden" value={mode} />
      {allowSignUp ? (
        <div className="segmented-control" aria-label="Login mode">
          <button
            aria-pressed={mode === "sign-in"}
            type="button"
            onClick={() => setMode("sign-in")}
          >
            Sign in
          </button>
          <button
            aria-pressed={mode === "sign-up"}
            type="button"
            onClick={() => setMode("sign-up")}
          >
            Create account
          </button>
        </div>
      ) : null}

      {allowSignUp && mode === "sign-up" ? (
        <label>
          Full name
          <input
            autoComplete="name"
            minLength={2}
            name="full_name"
            onChange={(event) => setFullName(event.target.value)}
            required
            type="text"
            value={fullName}
          />
        </label>
      ) : null}

      <label>
        Email
        <input
          autoComplete="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label>
        Password
        <input
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {message ? <p className="form-message">{message}</p> : null}

      <button className="button primary" disabled={loading} type="submit">
        {loading ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
