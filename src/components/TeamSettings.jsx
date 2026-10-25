import { useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";

const SIZES = [
  ["1", "Only me (1)"],
  ["2-7", "2 – 7"],
  ["8-15", "8 – 15"],
  ["16-24", "16 – 24"],
  ["25+", "25+"],
];

const WORK = [
  ["projects", "Mostly projects", "Each one is different, with little we can reuse."],
  ["processes", "Mostly processes", "We repeat the same steps often, with minor changes."],
  ["both", "Both", "We do unique projects and repeatable processes about equally."],
];

const PERKS = [
  "A shared team",
  "Task and project collaboration",
  "Centralized access",
  "Team and project activity",
  "Shared project templates",
  "All personal productivity tools",
];

const GENERIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "aol.com",
]);

const readImage = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Pick a photo."));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Pick a photo up to 4MB."));
      return;
    }
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext("2d");
      const scale = Math.max(128 / image.width, 128 / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (128 - width) / 2, (128 - height) / 2, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That photo could not be read."));
    };
    image.src = url;
  });

function PerkPanel({ onClose }) {
  return (
    <aside className="hidden w-72 shrink-0 border-l border-white/10 bg-[#242424] p-5 md:block">
      <div className="mb-4 flex justify-end">
        <button type="button" aria-label="Close create team" onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-white/5">
          <X className="size-4" />
        </button>
      </div>
      <h3 className="text-sm font-semibold text-white">Team productivity, made simple</h3>
      <ul className="mt-4 space-y-2 text-sm text-neutral-300">
        {PERKS.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function TeamWizard({ user, onClose, onCreate }) {
  const [step, setStep] = useState("name");
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [work, setWork] = useState("");
  const [emails, setEmails] = useState("");
  const [discovery, setDiscovery] = useState(false);
  const [team, setTeam] = useState(null);
  const [notice, setNotice] = useState("");
  const domain = user.email.split("@")[1]?.toLowerCase() ?? "";
  const generic = GENERIC_DOMAINS.has(domain);

  const create = () => {
    const created = onCreate({ name, size, work });
    setTeam(created);
    setNotice("Your team has been created!");
    setStep("invite");
  };

  const finish = () => {
    const list = emails
      .split(/[,\s]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    onCreate({ ...team, invites: list, discovery }, { update: true });
    onClose(team.id);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex max-h-[min(640px,calc(100%-2rem))] w-[min(760px,calc(100%-1rem))] overflow-hidden rounded-xl border border-white/10 bg-[#1f1f1f] text-neutral-100 shadow-2xl">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {step === "name" ? (
              <>
                <h2 className="text-xl font-semibold">Create your team</h2>
                <p className="mt-1 text-sm text-neutral-400">Give the team a name people will recognize.</p>
                <label className="mt-5 block text-sm font-medium">
                  Team name
                  <input
                    autoFocus
                    value={name}
                    maxLength={120}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Example"
                    aria-label="Team name"
                    className="mt-2 w-full rounded-md border border-white/10 bg-[#2a2a2a] px-3 py-2 outline-none focus:border-[var(--accent)]"
                  />
                  <span className="mt-1 block text-right text-xs text-neutral-500">{name.length}/120</span>
                </label>
              </>
            ) : null}
            {step === "size" ? (
              <>
                <h2 className="text-xl font-semibold">How many people will you work with?</h2>
                <p className="mt-1 text-sm text-neutral-400">We’ll use your answer to set up the team.</p>
                <div className="mt-4 space-y-2">
                  {SIZES.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={size === id}
                      onClick={() => setSize(id)}
                      className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                        size === id ? "border-[var(--accent)] bg-white/5" : "border-white/10 hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {step === "work" ? (
              <>
                <h2 className="text-xl font-semibold">What does your team’s work look like?</h2>
                <p className="mt-1 text-sm text-neutral-400">We’ll use your answer to set up the team.</p>
                <div className="mt-4 space-y-2">
                  {WORK.map(([id, label, hint]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={work === id}
                      onClick={() => setWork(id)}
                      className={`block w-full rounded-md border px-3 py-2 text-left ${
                        work === id ? "border-[var(--accent)] bg-white/5" : "border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-neutral-500">{hint}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {step === "invite" ? (
              <>
                <h2 className="text-xl font-semibold">Invite your teammates</h2>
                <p className="mt-1 text-sm text-neutral-400">Save the people who should join {team?.name}.</p>
                <label className="mt-4 block text-sm font-medium">
                  Invite by email
                  <textarea
                    value={emails}
                    onChange={(event) => setEmails(event.target.value)}
                    placeholder="Separate multiple emails with commas"
                    aria-label="Invite by email"
                    rows={2}
                    className="mt-2 w-full resize-none rounded-md border border-white/10 bg-[#2a2a2a] px-3 py-2 text-sm outline-none"
                  />
                </label>
                <p className="mt-1 text-xs text-neutral-500">Addresses are saved on the team. TaskMan does not send email.</p>
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={discovery} onChange={(event) => setDiscovery(event.target.checked)} />
                  Team discovery
                </label>
                <p className="mt-1 text-xs text-neutral-500">Saved for later. People are not added from an email domain automatically.</p>
                {discovery && generic ? (
                  <p className="mt-3 text-sm text-[var(--accent)]">You appear to be using a generic email domain.</p>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="border-t border-white/10 px-6 py-4">
            {step === "name" ? (
              <button
                type="button"
                disabled={!name.trim()}
                onClick={() => setStep("size")}
                className="w-full rounded-md bg-[var(--accent)] py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Continue
              </button>
            ) : null}
            {step === "size" ? (
              <button
                type="button"
                disabled={!size}
                onClick={() => setStep("work")}
                className="w-full rounded-md bg-[var(--accent)] py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Continue
              </button>
            ) : null}
            {step === "work" ? (
              <button
                type="button"
                disabled={!work}
                onClick={create}
                className="w-full rounded-md bg-[var(--accent)] py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Create your team
              </button>
            ) : null}
            {step === "invite" ? (
              <div className="space-y-2">
                <button type="button" onClick={finish} className="w-full rounded-md bg-[var(--accent)] py-2 text-sm font-medium text-white">
                  Continue
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const link = `${window.location.origin}/join/${team.inviteCode}`;
                    try {
                      await navigator.clipboard.writeText(link);
                      setNotice("Invite link copied.");
                    } catch {
                      setNotice(link);
                    }
                  }}
                  className="w-full rounded-md bg-white/10 py-2 text-sm"
                >
                  Copy invite link
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <PerkPanel onClose={() => (team ? onClose(team.id) : onClose())} />
      </div>
      {notice ? (
        <p className="fixed bottom-4 left-4 z-[70] rounded-lg bg-[#2a2a2a] px-3 py-2 text-sm text-white shadow-lg">
          {notice}
          <button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")} className="ml-3 text-neutral-400">
            <X className="inline size-3.5" />
          </button>
        </p>
      ) : null}
    </div>
  );
}

export function TeamGeneral({ team, onChange, onDelete }) {
  const fileRef = useRef(null);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState("");
  const initial = team.name.slice(0, 1).toUpperCase();
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium">Logo</h3>
        <div className="mt-3 flex items-center gap-3">
          {team.logo ? (
            <img src={team.logo} alt="" className="size-14 rounded-lg object-cover" />
          ) : (
            <span className="grid size-14 place-items-center rounded-lg bg-[#4073ff] text-xl font-semibold text-white">{initial}</span>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md bg-white/10 px-3 py-1.5 text-sm">
            Upload logo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                onChange({ ...team, logo: await readImage(file) });
                setError("");
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : "That photo could not be read.");
              }
            }}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">Pick a photo up to 4MB.</p>
        {error ? <p className="mt-1 text-sm text-[var(--accent)]">{error}</p> : null}
      </section>
      <label className="block">
        <span className="text-sm font-medium">Team name</span>
        <input
          value={team.name}
          maxLength={120}
          onChange={(event) => onChange({ ...team, name: event.target.value })}
          aria-label="Team name"
          className="mt-2 w-full rounded-md border border-white/10 bg-[#2a2a2a] px-3 py-2 text-sm outline-none"
        />
        <span className="mt-1 block text-xs text-neutral-500">Keep it simple — something your teammates will recognize.</span>
      </label>
      <section>
        <h3 className="text-sm font-medium">Projects</h3>
        <label className="mt-3 block text-sm">
          Default access level
          <select
            value={team.access}
            aria-label="Default access level"
            onChange={(event) => onChange({ ...team, access: event.target.value })}
            className="mt-2 w-full rounded-md border border-white/10 bg-[#2a2a2a] px-3 py-2"
          >
            <option value="team">Team</option>
            <option value="restricted">Restricted</option>
          </select>
        </label>
        <p className="mt-1 text-xs text-neutral-500">New projects created in this team use this access level.</p>
        <p className="mt-4 text-sm font-medium">Default collaborators</p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-xs">
          Everyone in “{team.name}”
        </p>
        <p className="mt-2 text-xs text-neutral-500">Saved members are kept with the team. TaskMan does not share projects with other accounts yet.</p>
      </section>
      <section className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium">Danger zone</h3>
        <h4 className="mt-4 text-sm font-medium">Delete team</h4>
        <p className="mt-1 text-sm text-neutral-400">
          This will permanently delete the <span className="font-semibold text-white">{team.name}</span> team. Projects stay in My Projects. This cannot be undone.
        </p>
        <input
          value={confirmName}
          onChange={(event) => setConfirmName(event.target.value)}
          placeholder="Type the team name"
          aria-label="Confirm team name"
          className="mt-3 w-full max-w-xs rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none"
        />
        <button
          type="button"
          disabled={confirmName.trim() !== team.name}
          onClick={onDelete}
          className="mt-3 rounded-md border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)] disabled:opacity-40"
        >
          Delete team
        </button>
      </section>
    </div>
  );
}

export function TeamPeople({ team, user, onChange }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const link = `${window.location.origin}/join/${team.inviteCode}`;
  const people = [
    { id: "you", name: user.username, email: user.email, role: "Admin" },
    ...team.invites.map((email) => ({ id: email, name: email, email, role: "Invited" })),
  ].filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={team.inviteEnabled}
            aria-label="Enable invite link"
            onClick={() => onChange({ ...team, inviteEnabled: !team.inviteEnabled })}
            className={`relative h-6 w-11 rounded-full ${team.inviteEnabled ? "bg-[var(--accent)]" : "bg-[#3a3a3a]"}`}
          >
            <span className={`absolute top-0.5 size-5 rounded-full bg-white ${team.inviteEnabled ? "right-0.5" : "left-0.5"}`} />
          </button>
          <span className="text-sm">Enable invite link</span>
        </div>
        {team.inviteEnabled ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input readOnly value={link} aria-label="Invite link" className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#2a2a2a] px-2 py-1.5 text-xs" />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setMessage("Invite link copied.");
                } catch {
                  setMessage("Select the link and copy it.");
                }
              }}
              className="rounded-md bg-white/10 px-2 py-1.5 text-xs"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...team, inviteCode: crypto.randomUUID().replaceAll("-", "") })}
              className="rounded-md border border-[var(--accent)] px-2 py-1.5 text-xs text-[var(--accent)]"
            >
              Reset link
            </button>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-neutral-500">Share this link to invite people to your team. Joining from another account is not available yet.</p>
      </section>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const email = draft.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setMessage("Enter an email address.");
            return;
          }
          if (team.invites.includes(email) || email === user.email.toLowerCase()) {
            setMessage("That person is already on the team.");
            return;
          }
          onChange({ ...team, invites: [...team.invites, email] });
          setDraft("");
          setMessage("Saved. TaskMan does not send the invite email.");
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="name@example.com"
          aria-label="Invite by email"
          className="min-w-48 flex-1 rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-sm outline-none"
        />
        <button type="submit" className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white">
          Invite by email
        </button>
      </form>
      {message ? <p className="text-sm text-neutral-400">{message}</p> : null}
      <label className="flex items-center gap-2 rounded-md border border-white/10 px-2 py-1.5">
        <span className="sr-only">Search by name or email</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search by name or email"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      <section>
        <h3 className="text-sm font-medium">On this team</h3>
        <ul className="mt-3 space-y-2">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 text-sm">
              <span className="grid size-8 place-items-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
                {person.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{person.role === "Admin" ? `${person.name} (You)` : person.name}</span>
                <span className="block truncate text-xs text-neutral-500">{person.email}</span>
              </span>
              <span className="text-xs text-neutral-400">{person.role}</span>
              {person.role === "Invited" ? (
                <button
                  type="button"
                  aria-label={`Remove ${person.email}`}
                  onClick={() => onChange({ ...team, invites: team.invites.filter((item) => item !== person.email) })}
                  className="text-neutral-500 hover:text-white"
                >
                  <Plus className="size-3.5 rotate-45" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
