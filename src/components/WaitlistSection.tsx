import { FormEvent, useState } from "react";
import { joinWaitlist } from "../lib/api";

export function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await joinWaitlist(email);
      setMessage(response.message);
      setEmail("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to join the waitlist right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="waitlist" className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
      <div className="grid gap-8 rounded-[2rem] border border-navy/10 bg-white p-8 shadow-soft lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-navy">
            Get Pro when it launches.
          </h2>
          <p className="mt-3 max-w-sm text-base leading-7 text-charcoal/65">
            Rubric alignment, gap detection, and humanizing guidance. One email
            when it's ready.
          </p>
        </div>
        <form onSubmit={onSubmit} className="rounded-soft bg-mist p-6">
          <label className="text-sm font-medium text-charcoal/75" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.edu"
            className="mt-3 w-full rounded-2xl border border-navy/10 bg-white px-4 py-3 text-base text-charcoal outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/35"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-4 rounded-2xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy/95 disabled:cursor-not-allowed disabled:bg-navy/60"
          >
            {loading ? "Submitting..." : "Join Waitlist"}
          </button>
          <p className="mt-3 text-sm text-charcoal/60">One-time email. No spam.</p>
          {message ? (
            <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-charcoal">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-charcoal">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
