import type { ReactNode } from "react";

function Page({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-4xl">{title}</h1>
        {updated && <p className="text-muted">{updated}</p>}
      </header>
      {children}
    </article>
  );
}

const H = ({ children }: { children: ReactNode }) => <h2 className="mt-6 text-2xl">{children}</h2>;
const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1 pl-6">
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

export function Terms() {
  return (
    <Page title="Terms of Use" updated="Hackathon prototype. October 2026.">
      <p>CareBridge is a prototype built for a hackathon demonstration. By using it you agree to these terms.</p>
      <H>What this is</H>
      <p>CareBridge reads a discharge summary and organizes it into tasks, reminders and a timeline. It explains the text in plain language and in Tamil and Hindi.</p>
      <H>Synthetic data only</H>
      <p>Use only invented discharge summaries. Do not enter real patient details. The privacy guard masks some personal data, but it can miss things. You are responsible for what you enter.</p>
      <H>No medical advice</H>
      <p>CareBridge gives no medical advice. It does not diagnose, change medicines or recommend treatment. Always follow your own doctor and care team.</p>
      <H>No guarantees</H>
      <p>The service is provided as is. Extraction and translation can be wrong. Provider suggestions are examples from an invented list and do not guarantee availability.</p>
      <H>Your use</H>
      <List items={["Do not use the prototype for real care decisions.", "Do not try to break, overload or misuse the service.", "Share family links only with people you trust. You can turn a link off at any time."]} />
    </Page>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy Policy" updated="Hackathon prototype. October 2026.">
      <p>This page explains what the prototype stores and who can see it.</p>
      <H>What is stored</H>
      <List items={[
        "The text of the summary you add, after personal details are masked.",
        "The instructions found in it, with the lines they came from.",
        "Tasks, reminders, review decisions, family links and an audit log of every action.",
      ]} />
      <H>Where it is stored</H>
      <p>Everything is kept in a local SQLite database on the computer that runs the backend. There are no accounts, no tracking and no advertising.</p>
      <H>The AI model</H>
      <p>When a Groq key is set, the masked text is sent to Groq to find and rewrite instructions. The key stays on the backend and never reaches the browser. Without a key, the prototype uses built-in fixtures for the sample summaries and sends nothing.</p>
      <H>Personal data masking</H>
      <p>Before anything is saved, the privacy guard looks for Aadhaar-style numbers, Indian mobile numbers, email addresses and PAN numbers, and replaces them with a label. You see what was masked.</p>
      <H>Family links</H>
      <p>A family link gives read access to one plan. The person with the link can mark tasks done and acknowledge alerts. Every action is recorded. Turn the link off to end access.</p>
    </Page>
  );
}

export function Safety() {
  return (
    <Page title="Safety &amp; Limitations" updated="Please read this before you use the prototype.">
      <p>CareBridge organizes and explains what a doctor already wrote. It does not make medical decisions.</p>
      <H>What it never does</H>
      <List items={[
        "It never diagnoses a condition.",
        "It never changes, adds or suggests changing a medicine or dose.",
        "It never recommends a treatment.",
        "It never presents a provider match as a guarantee.",
      ]} />
      <H>How we keep it honest</H>
      <p>Every item shows the exact lines of the summary it came from. A check compares each quote with those lines. If it does not match, the item goes to a person.</p>
      <p>Numbers, doses and drug names are compared before and after translation. If any number changes, the English text is shown instead.</p>
      <H>When we are unsure</H>
      <p>Vague words such as "as needed", missing dates, medicine start or stop wording, conflicting lines, symptoms and low confidence all go to a human reviewer. Until the reviewer approves, the patient sees "Your care team will confirm this" and not a guess.</p>
      <H>Warning signs</H>
      <p>The plan always shows the doctor's exact words for warning signs. In an emergency, call 108.</p>
      <H>Known limits</H>
      <List items={[
        "All data is synthetic. This is a demo, not a medical device.",
        "Reminders are shown in the app. No real SMS is sent.",
        "Tamil and Hindi text is machine written and should be checked by a person who speaks the language.",
        "Provider details and phone numbers are invented.",
        "Poor scans and handwriting are not supported.",
      ]} />
    </Page>
  );
}
