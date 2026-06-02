"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type InviteFormProps = {
  cleanerId: string;
  email: string;
  name: string;
};

export function InviteForm({ cleanerId, email, name }: InviteFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: "cleaner",
          cleaner_id: cleanerId
        }
      }
    });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (!result.data.session) {
      setMessage("Account created. Please check your email to confirm your login.");
      return;
    }

    router.push("/cleaner");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input disabled type="email" value={email} />
      </label>
      <label>
        Password
        <input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
      </label>
      {message ? <p className="form-message">{message}</p> : null}
      <button className="button primary" disabled={loading} type="submit">
        {loading ? "Creating..." : "Create cleaner account"}
      </button>
    </form>
  );
}
