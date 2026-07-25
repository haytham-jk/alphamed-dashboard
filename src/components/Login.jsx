import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/button";

function friendlyAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login")) return "The email or password is incorrect.";
  if (message.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (message.includes("rate")) return "Too many attempts. Please wait and try again.";
  return "Unable to sign in. Please try again.";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  function edit(setter) { return (event) => { setter(event.target.value); setErrorMessage(""); }; }
  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true); setErrorMessage("");
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error) { setErrorMessage(friendlyAuthError(error)); }
    finally { setSubmitting(false); }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-4 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-blue-400">Alphamed Operations Hub</p><h1 className="text-3xl font-semibold">Sign in</h1>
        <label className="block">Email<input type="email" name="email" autoComplete="username" required value={email} onChange={edit(setEmail)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-400" /></label>
        <label className="block">Password<input type="password" name="password" autoComplete="current-password" required value={password} onChange={edit(setPassword)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-400" /></label>
        {errorMessage && <div className="text-red-300" role="alert">{errorMessage}</div>}
        <Button type="submit" loading={submitting} className="w-full">{submitting ? "Signing in..." : "Sign in"}</Button>
      </form>
    </main>
  );
}
