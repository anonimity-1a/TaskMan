import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  Bell,
  Blocks,
  Calendar,
  CalendarDays,
  Check,
  CircleUser,
  CreditCard,
  Database,
  Flag,
  Hash,
  Inbox,
  Lock,
  MapPin,
  Palette,
  PanelLeft,
  Paperclip,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Tag,
  Target,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { PALETTES, QUICK_ACTIONS, SETTINGS_SECTIONS, WEEKDAY_OPTIONS } from "../settings.js";
import { TeamGeneral, TeamPeople, TeamWizard } from "./TeamSettings.jsx";

const ACTION_ICONS = {
  project: Hash,
  date: CalendarDays,
  assignee: UserRound,
  attachment: Paperclip,
  priority: Flag,
  reminders: AlarmClock,
  labels: Tag,
  deadline: Target,
  location: MapPin,
};

const NAV_ICONS = {
  account: CircleUser,
  general: Settings,
  subscription: CreditCard,
  theme: Palette,
  sidebar: PanelLeft,
  "quick-add": Plus,
  productivity: TrendingUp,
  reminders: AlarmClock,
  notifications: Bell,
  backups: Database,
  integrations: Blocks,
  calendars: Calendar,
};

const fieldClass =
  "mt-2 w-full rounded-md border border-white/10 bg-[var(--field)] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-[var(--accent)]";

function Toggle({ on, label, onClick, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full ${on ? "bg-[var(--accent)]" : "bg-white/15"} disabled:opacity-50`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-[var(--knob)] ${on ? "right-0.5" : "left-0.5"}`} />
    </button>
  );
}

function Select({ label, value, onChange, children, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-100">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        {children}
      </select>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </label>
  );
}

function SwitchRow({ title, hint, on, onClick }) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-100">{title}</span>
        <Toggle on={on} label={title} onClick={onClick} />
        <span className="text-sm text-neutral-400">{on ? "On" : "Off"}</span>
      </div>
      {hint ? <p className="mt-1 max-w-xl text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

function readAvatar(file) {
  return new Promise((resolve, reject) => {
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
}

function AccountSection({ user, settings, onChange, onUpdateAccount, onDeleteAccount }) {
  const fileRef = useRef(null);
  const [name, setName] = useState(user.username);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const initial = (name || "T").slice(0, 1).toUpperCase();

  useEffect(() => {
    setName(user.username);
    setEmail(user.email);
  }, [user.email, user.username]);

  const saveName = async () => {
    const next = name.trim();
    if (!next || next === user.username) return;
    setError("");
    setMessage("");
    try {
      await onUpdateAccount({ username: next });
      setMessage("Name saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the name.");
      setName(user.username);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-neutral-400">{message}</p> : null}
      <section>
        <h3 className="text-sm font-medium text-neutral-100">Photo</h3>
        <div className="mt-3 flex items-center gap-3">
          {settings.avatar ? (
            <img src={settings.avatar} alt="" className="size-16 rounded-full object-cover" />
          ) : (
            <span className="grid size-16 place-items-center rounded-full bg-[var(--accent)] text-xl font-semibold text-[var(--on-accent)]">
              {initial}
            </span>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-neutral-100 hover:bg-white/15"
          >
            Change photo
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, avatar: "" })}
            className="rounded-md border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent-text)]"
          >
            Remove photo
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
                const avatar = await readAvatar(file);
                onChange({ ...settings, avatar });
                setError("");
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : "That photo could not be read.");
              }
            }}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">Pick a photo up to 4MB. It stays on this computer.</p>
      </section>
      <label className="block border-t border-white/10 pt-5">
        <span className="text-sm font-medium text-neutral-100">Name</span>
        <input
          value={name}
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          onBlur={saveName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className={fieldClass}
        />
        <span className="mt-1 block text-right text-xs text-neutral-500">{name.length}/40</span>
      </label>
      <section className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Email</h3>
        <p className="mt-1 text-sm text-neutral-300">{user.email}</p>
        {emailOpen ? (
          <form
            className="mt-3 space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setMessage("");
              try {
                await onUpdateAccount({ email, currentPassword });
                setMessage("Email saved.");
                setEmailOpen(false);
                setCurrentPassword("");
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : "Could not change the email.");
              }
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="New email"
              className={fieldClass}
            />
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              aria-label="Current password"
              className={fieldClass}
            />
            <button type="submit" className="rounded-md bg-white/10 px-3 py-1.5 text-sm">
              Save email
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            className="mt-2 rounded-md bg-white/10 px-3 py-1.5 text-sm text-neutral-100"
          >
            Change email
          </button>
        )}
      </section>
      <section className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Password</h3>
        {passwordOpen ? (
          <form
            className="mt-3 space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setMessage("");
              try {
                await onUpdateAccount({ currentPassword, newPassword });
                setMessage("Password saved.");
                setPasswordOpen(false);
                setCurrentPassword("");
                setNewPassword("");
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : "Could not change the password.");
              }
            }}
          >
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              aria-label="Current password"
              className={fieldClass}
            />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              aria-label="New password"
              className={fieldClass}
            />
            <button type="submit" className="rounded-md bg-white/10 px-3 py-1.5 text-sm">
              Save password
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="mt-2 rounded-md bg-white/10 px-3 py-1.5 text-sm text-neutral-100"
          >
            Change password
          </button>
        )}
      </section>
      <section className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Two-factor authentication</h3>
        <div className="mt-2 flex items-center gap-3">
          <Toggle on={false} disabled label="Two-factor authentication" onClick={() => undefined} />
          <span className="text-sm text-neutral-400">Off</span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">Two-factor authentication is not available on this TaskMan server.</p>
      </section>
      <section className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Connected accounts</h3>
        <p className="mt-1 text-sm text-neutral-400">TaskMan signs in with email and password.</p>
        <div className="mt-3 space-y-2">
          <button type="button" disabled className="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-neutral-500">
            Connect with Google
          </button>
          <button type="button" disabled className="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-neutral-500">
            Connect with Facebook
          </button>
          <button type="button" disabled className="w-full rounded-md bg-white/5 px-3 py-2 text-sm text-neutral-500">
            Connect with Apple
          </button>
        </div>
      </section>
      <section className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Delete account</h3>
        <p className="mt-1 text-sm text-neutral-400">
          Deleting your account is permanent. You immediately lose access to your tasks.
        </p>
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            try {
              await onDeleteAccount(deletePassword);
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Could not delete the account.");
            }
          }}
        >
          <input
            type="password"
            required
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            placeholder="Current password"
            aria-label="Password to delete account"
            className={`${fieldClass} mt-0 max-w-xs`}
          />
          <button type="submit" className="rounded-md border border-[var(--danger)] px-3 py-2 text-sm text-[var(--danger)]">
            Delete account
          </button>
        </form>
      </section>
    </div>
  );
}

function GeneralSection({ settings, onChange, onReload, onHelp }) {
  const zones = useMemo(() => {
    const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];
    return supported.includes(settings.timeZone) ? supported : [settings.timeZone, ...supported];
  }, [settings.timeZone]);
  const set = (patch) => onChange({ ...settings, ...patch });

  return (
    <div className="space-y-6">
      <Select label="Language" value={settings.language} onChange={() => undefined}>
        <option value="en">English</option>
      </Select>
      <Select
        label="Home view"
        value={settings.homeView}
        onChange={(homeView) => set({ homeView })}
        hint="Opens this view the next time you sign in."
      >
        <option value="inbox">Inbox</option>
        <option value="today">Today</option>
        <option value="upcoming">Upcoming</option>
      </Select>
      <div className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Date & time</h3>
        <div className="mt-4 space-y-4">
          <Select label="Time zone" value={settings.timeZone} onChange={(timeZone) => set({ timeZone })}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
          <Select label="Time format" value={settings.timeFormat} onChange={(timeFormat) => set({ timeFormat })}>
            <option value="12">1:00pm</option>
            <option value="24">13:00</option>
          </Select>
          <Select label="Date format" value={settings.dateFormat} onChange={(dateFormat) => set({ dateFormat })}>
            <option value="dmy">DD-MM-YYYY</option>
            <option value="mdy">MM-DD-YYYY</option>
            <option value="ymd">YYYY-MM-DD</option>
          </Select>
          <Select
            label="Week start"
            value={String(settings.weekStart)}
            onChange={(value) => set({ weekStart: Number(value) })}
            hint="Begin your week on this day in Upcoming and calendar views."
          >
            {WEEKDAY_OPTIONS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label="Next week"
            value={String(settings.nextWeek)}
            onChange={(value) => set({ nextWeek: Number(value) })}
            hint='Postpone tasks to this day when using "Next week".'
          >
            {WEEKDAY_OPTIONS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label="Weekend"
            value={String(settings.weekend)}
            onChange={(value) => set({ weekend: Number(value) })}
            hint='Postpone tasks to this day when using "Weekend".'
          >
            {WEEKDAY_OPTIONS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="border-t border-white/10 pt-5">
        <SwitchRow
          title="Smart date recognition"
          on={settings.smartDates}
          onClick={() => set({ smartDates: !settings.smartDates })}
          hint="Automatically recognize dates when typing a task name."
        />
        <h3 className="mt-5 text-sm font-medium text-neutral-100">Sound effects</h3>
        <SwitchRow
          title="Desktop and web"
          on={settings.soundDesktop}
          onClick={() => set({ soundDesktop: !settings.soundDesktop })}
        />
        <SwitchRow
          title="Mobile"
          on={settings.soundMobile}
          onClick={() => set({ soundMobile: !settings.soundMobile })}
          hint="Play sounds when you complete tasks."
        />
      </div>
      <div className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Advanced</h3>
        <SwitchRow
          title="Reset sub-tasks"
          on={settings.resetSubtasks}
          onClick={() => set({ resetSubtasks: !settings.resetSubtasks })}
          hint="Reset sub-tasks when you complete a recurring task."
        />
        <SwitchRow
          title="Auto accept project invites"
          on={settings.autoAcceptInvites}
          onClick={() => set({ autoAcceptInvites: !settings.autoAcceptInvites })}
          hint="Saved for later. TaskMan does not share projects yet."
        />
        <SwitchRow
          title="Email Assist"
          on={settings.emailAssist}
          onClick={() => set({ emailAssist: !settings.emailAssist })}
          hint="Saved for later. TaskMan does not create tasks from email."
        />
        <SwitchRow
          title="Experimental features"
          on={settings.experimental}
          onClick={() => set({ experimental: !settings.experimental })}
          hint="Nothing extra is turned on by this switch yet."
        />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">
        Do you have more feedback?{" "}
        <button type="button" onClick={onHelp} className="text-[var(--accent-text)]">
          Let's talk
        </button>
      </div>
      <section>
        <h3 className="text-sm font-medium text-neutral-100">Clear local data</h3>
        <p className="mt-1 text-sm text-neutral-400">
          Reloads your latest tasks from the server while preserving preferences like the theme and display settings.
        </p>
        <button
          type="button"
          onClick={onReload}
          className="mt-3 rounded-md border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent-text)]"
        >
          Reload
        </button>
      </section>
    </div>
  );
}

function ThemeSection({ settings, onChange }) {
  const set = (patch) => onChange({ ...settings, ...patch });
  return (
    <div>
      <p className="text-sm text-neutral-400">Personalize TaskMan with a color and a light or dark appearance.</p>
      <SwitchRow
        title="Sync theme"
        on={settings.syncTheme}
        onClick={() => set({ syncTheme: !settings.syncTheme })}
        hint="The theme is saved on this computer with your other preferences."
      />
      <h3 className="tm-eyebrow mt-7">Appearance</h3>
      <div className="tm-rule mt-2 inline-flex rounded-lg border bg-[var(--chip)] p-1">
        {[
          ["light", "Light"],
          ["dark", "Dark"],
          ["system", "System"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={settings.appearance === id}
            onClick={() => set({ appearance: id })}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              settings.appearance === id ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <h3 className="tm-eyebrow mt-7">Themes</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PALETTES.map((palette) => {
          const { canvas, sidebar, accent, highlight, dark } = palette.preview;
          const line = dark ? "rgb(255 255 255 / 0.18)" : "rgb(0 0 0 / 0.14)";
          const active = settings.palette === palette.id;
          return (
            <button
              key={palette.id}
              type="button"
              aria-pressed={active}
              onClick={() => set({ palette: palette.id })}
              className={`rounded-lg border p-2 text-left transition-colors ${
                active ? "border-[var(--accent)] bg-[var(--selected)]" : "tm-rule hover:bg-white/5"
              }`}
            >
              <span
                aria-hidden="true"
                className="flex h-20 overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgb(127_127_127/0.2)]"
                style={{ background: canvas }}
              >
                <span className="flex w-[30%] flex-col gap-1.5 p-2" style={{ background: sidebar }}>
                  <span className="h-2 w-full rounded-[2px]" style={{ background: accent }} />
                  <span className="h-1 w-3/4 rounded-[2px] bg-white/30" />
                  <span className="h-1 w-1/2 rounded-[2px] bg-white/20" />
                </span>
                <span className="flex flex-1 flex-col gap-1.5 p-2.5">
                  <span className="h-2 w-1/2 rounded-[2px]" style={{ background: highlight }} />
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className="size-2 rounded-[2px] border" style={{ borderColor: highlight }} />
                    <span className="h-1 flex-1 rounded-[2px]" style={{ background: line }} />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-[2px] border" style={{ borderColor: accent }} />
                    <span className="h-1 w-2/3 rounded-[2px]" style={{ background: line }} />
                  </span>
                </span>
              </span>
              <span className="mt-2.5 flex items-center gap-2 px-1">
                <span className="text-sm font-semibold text-neutral-100">{palette.name}</span>
                {active ? <Check className="size-3.5 text-[var(--accent-text)]" /> : null}
              </span>
              <span className="tm-eyebrow block px-1 pb-1">{palette.mood}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SidebarSection({ settings, onChange }) {
  const items = [
    ["inbox", "Inbox", Inbox],
    ["today", "Today", CalendarDays],
    ["upcoming", "Upcoming", Calendar],
    ["browse", "Filters & Labels", SlidersHorizontal],
    ["reporting", "Reporting", TrendingUp],
  ];
  const toggle = (key) =>
    onChange({ ...settings, sidebar: { ...settings.sidebar, [key]: !settings.sidebar[key] } });
  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-100">Show in sidebar</h3>
      <ul className="mt-3 space-y-2">
        {items.map(([key, label, Icon]) => (
          <li key={key}>
            <label className="flex items-center gap-3 text-sm text-neutral-200">
              <input
                type="checkbox"
                checked={settings.sidebar[key]}
                onChange={() => toggle(key)}
                className="size-4 accent-[var(--accent)]"
              />
              <Icon className="size-4 text-neutral-400" />
              {label}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-white/10 pt-5">
        <SwitchRow
          title="Show task count"
          on={settings.showCounts}
          onClick={() => onChange({ ...settings, showCounts: !settings.showCounts })}
        />
        <div className="mt-4 w-52 rounded-xl border border-white/10 p-3 text-sm">
          {[
            ["Personal", 2],
            ["Family", 8],
            ["Health", 1],
          ].map(([name, count]) => (
            <div key={name} className="flex items-center py-1 text-neutral-300">
              <Hash className="mr-2 size-3.5 text-neutral-500" />
              <span className="flex-1">{name}</span>
              {settings.showCounts ? <span className="text-neutral-500">{count}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function moveItem(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function ActionList({ title, ids, settings, onChange, extra }) {
  const [dragId, setDragId] = useState(null);
  const key = extra ? "more" : "shown";
  const reorder = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    onChange({ ...settings, quickAdd: { ...settings.quickAdd, [key]: moveItem(ids, from, to) } });
  };
  const transfer = (id) => {
    if (id === "project" && !extra) return;
    const shown = settings.quickAdd.shown.filter((item) => item !== id);
    const more = settings.quickAdd.more.filter((item) => item !== id);
    if (extra) shown.push(id);
    else more.push(id);
    onChange({ ...settings, quickAdd: { ...settings.quickAdd, shown, more } });
  };
  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-100">{title}</h3>
      <ul className="mt-2 overflow-hidden rounded-xl border border-white/10">
        {ids.map((id) => {
          const action = QUICK_ACTIONS.find((item) => item.id === id);
          const Icon = ACTION_ICONS[id] ?? Hash;
          return (
            <li
              key={id}
              draggable
              onDragStart={() => setDragId(id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => reorder(id)}
              className="flex items-center gap-3 border-b border-white/10 px-3 py-2 last:border-b-0"
            >
              {action?.locked && !extra ? (
                <Lock className="size-4 text-neutral-500" />
              ) : (
                <button type="button" aria-label={extra ? `Show ${action?.label}` : `Hide ${action?.label}`} onClick={() => transfer(id)}>
                  <span
                    className={`grid size-4 place-items-center rounded-full text-[var(--on-accent)] ${extra ? "bg-[var(--success)]" : "bg-[var(--accent)]"}`}
                  >
                    {extra ? <Plus className="size-3" /> : <span className="block h-0.5 w-2 bg-current" />}
                  </span>
                </button>
              )}
              <Icon className="size-4 text-neutral-400" />
              <span className="text-sm text-neutral-200">{action?.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QuickAddSection({ settings, onChange }) {
  const set = (patch) => onChange({ ...settings, quickAdd: { ...settings.quickAdd, ...patch } });
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-400">Drag a row to reorder the quick add actions.</p>
      <ActionList title="Show task actions" ids={settings.quickAdd.shown} settings={settings} onChange={onChange} />
      <ActionList title="More actions" ids={settings.quickAdd.more} settings={settings} onChange={onChange} extra />
      <div className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Customization</h3>
        <SwitchRow
          title="Show action labels"
          on={settings.quickAdd.showLabels}
          onClick={() => set({ showLabels: !settings.quickAdd.showLabels })}
        />
        <SwitchRow
          title="Show description"
          on={settings.quickAdd.showDescription}
          onClick={() => set({ showDescription: !settings.quickAdd.showDescription })}
        />
        <p className="mt-4 text-xs text-neutral-500">Preview:</p>
        <div className="mt-2 rounded-xl border border-white/10 p-3">
          <p className="text-sm text-neutral-500">Task name</p>
          {settings.quickAdd.showDescription ? (
            <p className="mt-2 text-xs text-neutral-600">Description</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.quickAdd.shown.map((id) => {
              const action = QUICK_ACTIONS.find((item) => item.id === id);
              const Icon = ACTION_ICONS[id] ?? Hash;
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-neutral-300">
                  <Icon className="size-3.5" />
                  {settings.quickAdd.showLabels ? action?.label : null}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RemindersSection({ settings, onChange, onTestReminder, alertsGranted, onAllowAlerts }) {
  const set = (patch) => onChange({ ...settings, reminders: { ...settings.reminders, ...patch } });
  const browserName = /Edg\//.test(navigator.userAgent)
    ? "Microsoft Edge"
    : /Chrome\//.test(navigator.userAgent)
      ? "Chrome"
      : /Firefox\//.test(navigator.userAgent)
        ? "Firefox"
        : "This browser";
  return (
    <div className="space-y-6">
      <Select
        label="Automatic reminders"
        value={settings.reminders.automatic}
        onChange={(automatic) => set({ automatic })}
        hint="When a new task has a time, this reminder is added unless you pick another."
      >
        <option value="none">No automatic reminder</option>
        <option value="at">At time of task</option>
        <option value="10">10 minutes before</option>
        <option value="60">1 hour before</option>
      </Select>
      <div className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">How would you like to get reminded?</h3>
        <SwitchRow
          title="Desktop notifications"
          on={settings.reminders.desktop}
          onClick={async () => {
            const next = !settings.reminders.desktop;
            if (next && !alertsGranted) await onAllowAlerts();
            set({ desktop: next });
          }}
        />
        <SwitchRow
          title="Mobile notifications"
          on={settings.reminders.mobile}
          onClick={() => set({ mobile: !settings.reminders.mobile })}
          hint="This browser can show a notification. A separate phone app is not connected."
        />
        <SwitchRow
          title="Emails"
          on={settings.reminders.email}
          onClick={() => set({ email: !settings.reminders.email })}
          hint="TaskMan does not send email. The choice is saved for later."
        />
      </div>
      <div className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Send test reminder</h3>
        <p className="mt-1 text-sm text-neutral-400">Trigger a test reminder to see it in action.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => onTestReminder("web")} className="rounded-md bg-white/10 px-3 py-1.5 text-sm">
            Test web
          </button>
          <button type="button" onClick={() => onTestReminder("mobile")} className="rounded-md bg-white/10 px-3 py-1.5 text-sm">
            Test mobile
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium text-neutral-100">Get groceries</span>
              <span className="text-xs text-neutral-500">Today 09:00</span>
            </span>
            <span className="text-xs text-neutral-500">now</span>
          </div>
        </div>
      </div>
      <section className="border-t border-white/10 pt-5">
        <h3 className="text-sm font-medium text-neutral-100">Your devices</h3>
        <p className="mt-1 text-sm text-neutral-400">Reminders from this TaskMan window use the browser below.</p>
        <div className="mt-3 flex items-center justify-between rounded-md px-1 py-2 text-sm text-neutral-200">
          <span>{browserName}</span>
        </div>
      </section>
    </div>
  );
}

function Note({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-100">{title}</h3>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">{children}</p>
    </div>
  );
}

export function SettingsDialog({
  user,
  settings,
  doc,
  onChange,
  onClose,
  onUpdateAccount,
  onDeleteAccount,
  onReload,
  onHelp,
  onTestReminder,
  alertsGranted,
  onAllowAlerts,
  onDetachTeam,
}) {
  const [section, setSection] = useState("account");
  const [query, setQuery] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const sections = SETTINGS_SECTIONS.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));
  const teams = (settings.teams ?? []).filter((team) => team.name.toLowerCase().includes(query.trim().toLowerCase()));
  const activeTeam = (settings.teams ?? []).find((team) => section.startsWith(`team:${team.id}:`)) ?? null;
  const teamPage = activeTeam ? section.split(":").at(-1) : "";

  const saveTeam = (next) => {
    if (!next?.name?.trim()) return;
    onChange({
      ...settings,
      teams: settings.teams.map((team) => (team.id === next.id ? next : team)),
    });
  };

  const createTeam = (draft, options) => {
    if (options?.update) {
      saveTeam(draft);
      return draft;
    }
    const team = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      logo: "",
      size: draft.size,
      work: draft.work,
      access: "team",
      discovery: false,
      inviteEnabled: true,
      inviteCode: crypto.randomUUID().replaceAll("-", ""),
      invites: [],
    };
    onChange({ ...settings, teams: [...(settings.teams ?? []), team] });
    return team;
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "taskman-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const title = activeTeam
    ? teamPage === "people"
      ? "People"
      : "General"
    : (SETTINGS_SECTIONS.find((item) => item.id === section)?.label ?? "Settings");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-labelledby="settings-title"
        className="tm-surface grid h-[min(720px,calc(100%-1rem))] w-[min(960px,calc(100%-1rem))] grid-cols-1 overflow-hidden rounded-xl text-neutral-100 md:grid-cols-[232px_1fr]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <aside className="tm-sidebar tm-rule flex min-h-0 flex-col border-b bg-[var(--sidebar)] text-neutral-200 md:border-r md:border-b-0">
          <div className="flex items-center justify-between px-4 pt-5 pb-3 md:block">
            <p className="tm-eyebrow">Preferences</p>
            <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-white">Settings</h2>
          </div>
          <label className="tm-rule mx-3 mb-3 flex items-center gap-2 rounded-md border bg-white/[0.03] px-2.5 py-1.5 focus-within:border-[var(--accent)]">
            <Search className="size-4 text-neutral-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search settings"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
            />
          </label>
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label="Settings sections">
            {sections.map((item) => {
              const Icon = NAV_ICONS[item.id] ?? Settings;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-active={active}
                  onClick={() => setSection(item.id)}
                  className={`tm-nav mb-0.5 flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm ${
                    active ? "font-semibold text-white" : "text-neutral-300 hover:bg-white/5"
                  }`}
                >
                  <Icon className={`size-4 ${active ? "text-[var(--accent-text)]" : "text-neutral-500"}`} />
                  {item.label}
                </button>
              );
            })}
            {teams.map((team) => (
              <div key={team.id} className="mt-4">
                <p className="tm-eyebrow flex items-center gap-2 px-2 py-1">
                  {team.logo ? (
                    <img src={team.logo} alt="" className="tm-check size-4 object-cover" />
                  ) : (
                    <span className="tm-check grid size-4 place-items-center bg-[var(--accent)] text-[10px] font-bold text-[var(--on-accent)]">
                      {team.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate">{team.name}</span>
                </p>
                {[
                  ["general", "General"],
                  ["people", "People"],
                ].map(([page, label]) => (
                  <button
                    key={page}
                    type="button"
                    data-active={section === `team:${team.id}:${page}`}
                    onClick={() => setSection(`team:${team.id}:${page}`)}
                    className={`tm-nav mb-0.5 flex w-full items-center gap-2 rounded-md px-3 py-1.5 pl-9 text-left text-sm ${
                      section === `team:${team.id}:${page}` ? "font-semibold text-white" : "text-neutral-300 hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setCreatingTeam(true)}
            className="tm-rule flex items-center gap-2 border-t px-4 py-3.5 text-sm text-neutral-300 hover:bg-white/5"
          >
            <Plus className="size-4 text-[var(--accent-text)]" />
            Add team
          </button>
        </aside>
        <section className="flex min-h-0 min-w-0 flex-col">
          <header className="tm-rule flex items-center justify-between border-b px-7 pt-6 pb-4">
            <h2 id="settings-title" className="font-display text-2xl font-bold tracking-tight text-[var(--title-ink)]">
              {title}
            </h2>
            <button type="button" aria-label="Close settings" onClick={onClose} className="tm-rule rounded-md border p-1.5 text-neutral-400 hover:bg-white/5">
              <X className="size-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
            {section === "account" ? (
              <AccountSection
                user={user}
                settings={settings}
                onChange={onChange}
                onUpdateAccount={onUpdateAccount}
                onDeleteAccount={onDeleteAccount}
              />
            ) : null}
            {section === "general" ? (
              <GeneralSection settings={settings} onChange={onChange} onReload={onReload} onHelp={onHelp} />
            ) : null}
            {section === "subscription" ? (
              <Note title="Plan">TaskMan has one account type. There is no separate plan to manage.</Note>
            ) : null}
            {section === "theme" ? <ThemeSection settings={settings} onChange={onChange} /> : null}
            {section === "sidebar" ? <SidebarSection settings={settings} onChange={onChange} /> : null}
            {section === "quick-add" ? <QuickAddSection settings={settings} onChange={onChange} /> : null}
            {section === "productivity" ? (
              <Note title="Productivity">Task counts and goals will come later. This page is a placeholder.</Note>
            ) : null}
            {section === "reminders" ? (
              <RemindersSection
                settings={settings}
                onChange={onChange}
                onTestReminder={onTestReminder}
                alertsGranted={alertsGranted}
                onAllowAlerts={onAllowAlerts}
              />
            ) : null}
            {section === "notifications" ? (
              <Note title="Notifications">
                Task reminders use the desktop notification switch in Reminders
                {alertsGranted ? ", and this browser is allowed to show them." : ". Allow notifications from the Reminders page to show them outside TaskMan."}
              </Note>
            ) : null}
            {section === "backups" ? (
              <div>
                <h3 className="text-sm font-medium text-neutral-100">Download tasks</h3>
                <p className="mt-1 text-sm text-neutral-400">Saves a JSON copy of your tasks on this computer.</p>
                <button
                  type="button"
                  onClick={downloadBackup}
                  className="mt-3 rounded-md border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent-text)]"
                >
                  Download backup
                </button>
              </div>
            ) : null}
            {section === "integrations" ? (
              <Note title="Integrations">No outside services are connected. Tasks stay in TaskMan.</Note>
            ) : null}
            {section === "calendars" ? (
              <Note title="Calendars">TaskMan uses its own calendar view. Outside calendars are not connected.</Note>
            ) : null}
            {activeTeam && teamPage === "general" ? (
              <TeamGeneral
                team={activeTeam}
                onChange={saveTeam}
                onDelete={() => {
                  onChange({ ...settings, teams: settings.teams.filter((item) => item.id !== activeTeam.id) });
                  onDetachTeam?.(activeTeam.id);
                  setSection("account");
                }}
              />
            ) : null}
            {activeTeam && teamPage === "people" ? (
              <TeamPeople team={activeTeam} user={user} onChange={saveTeam} />
            ) : null}
          </div>
        </section>
      </div>
      {creatingTeam ? (
        <TeamWizard
          user={user}
          onCreate={createTeam}
          onClose={(teamId) => {
            setCreatingTeam(false);
            if (teamId) setSection(`team:${teamId}:general`);
          }}
        />
      ) : null}
    </div>
  );
}
