---
name: wrap
description: "Close a working session with a clear, scannable, plain-language summary for a non-technical reader. Adapts its shape to the work: building, investigating/researching, debugging, reviewing/auditing, or setup/ops. Use at the end of ANY session where code was written, changed, reviewed, debugged, deployed, or investigated, and whenever the user types /wrap, or asks to 'wrap up', 'summarize this session', 'what did we just do', or 'recap'. Do NOT use for quick factual answers, single lookups, or conversational replies where nothing was built or found out."
---

# Wrap

You are writing the **last thing the reader sees**. Everything above it was your
homework — tool calls, diffs, searches, false starts, reasoning. They should not
have to read any of that.

This is a handoff to a **smart non-technical reader** who owns this project. They
decide what ships. They cannot read the diff. If they misunderstand what happened,
that's your failure, not theirs.

## Non-negotiables

1. **Plain language.** No unexplained jargon. See "Translating jargon" below.
2. **Honest.** If tests didn't run, say so. If something is unverified, say so.
   Never let a summary read more confident than the work was.
3. **Scannable.** They should get the gist in 10 seconds and the full picture in
   60. Short lines. Whitespace. One idea per bullet.
4. **No filler.** Conditional sections appear only when they have real content.
   Never invent a to-do list to fill a heading.
5. **Match the shape to the work.** A research session summarised as if it were a
   build session buries the answer. Pick the shape first — see below.

---

## Step 1 — pick the shape

Ask: **what did this session actually produce?** Not what you spent time on — what
the reader now has that they didn't before.

| The session produced… | Shape | Body sections |
|---|---|---|
| Working code — a feature, a change, a refactor | 🏗 **Build** | What got done · What changed in plain English |
| An answer — a question researched, a tool evaluated, a decision informed | 🔎 **Investigation** | The answer · What I checked · What I'd do |
| A diagnosis — a bug hunted down | 🐞 **Debug** | What was actually wrong · The fix · How I know |
| A verdict on existing work — audit, code review, security pass | 🧪 **Review** | Findings · What's fine · Fix first |
| A changed state of the world — deployed, configured, released, account set up | 🚀 **Ops** | Where things stand · What got done · What needs you |

**Mixed sessions:** pick the **dominant** shape and fold the rest into one of its
sections. Never stack two full structures — that doubles the length and halves
the clarity. Researched a tool *and* wrote a small script? That's Investigation
with the script as a line in the table.

**When genuinely torn**, ask which sentence the reader most needs first. If it's
*"here's what's now true of your app"* → Build. If it's *"here's the answer"* →
Investigation.

---

## Step 2 — the constant spine

Every shape opens and closes the same way. **Only the middle changes.**

### Open: Title + TL;DR  *(always)*

```
# 🧾 Session wrap — <5-word plain description of the work>

**TL;DR** — <one or two sentences: what happened, and whether it worked.>
```

The TL;DR must survive alone. If they read nothing else, this sentence has to
leave them correctly informed — including about failure, and including when the
answer is "no".

> ❌ "Implemented perceived-performance improvements across the app."
> ✅ "Your app now shows loading placeholders instead of telling people their
> data is missing. Builds and tests all pass — not tested on a real phone yet."

> ❌ "Evaluated Strix for potential integration."
> ✅ "Strix is real and good, but it can't test the Mowj app — it only attacks
> websites. It *can* test the three servers behind Mowj, which are live now."

### Open: Scoreboard  *(always)*

One line of hard facts, pipe-separated. Only include what you actually know.
Its contents change by shape:

| Shape | Example scoreboard |
|---|---|
| 🏗 Build | `19 files changed · 5 new · iOS ✅ · macOS ✅ · 861 tests ✅ · not committed` |
| 🔎 Investigation | `3 sources checked · live server inspected · nothing changed · 2 gaps found` |
| 🐞 Debug | `root cause found ✅ · fix applied · 4 files · 861 tests ✅ · not reproduced on device` |
| 🧪 Review | `12 files reviewed · 5 findings (1 high · 3 medium · 1 low) · nothing changed` |
| 🚀 Ops | `2 of 3 steps done · deployed to production ✅ · 1 step needs your password ⛔` |

Use ✅ pass · ❌ fail · ⚠️ partial · ⛔ blocked · — not run. If you didn't run
tests, write `tests not run`, never omit it silently. **If nothing was changed,
say `nothing changed`** — that fact reassures, and its absence worries.

### …body goes here — see Step 3…

### Close: What's left  *(only if something is)*

Real, specific, actionable. Anything unfinished, deliberately skipped, or waiting
on them.

**If nothing is outstanding, delete this section.** Do not write "nothing to do
here" — just leave it out.

### Close: ⚠️ Watch-outs  *(only if there are any)*

Honest flags. What wasn't tested, what could break, what you're unsure about,
where you made a judgment call they might disagree with.

This section protects them from false confidence. A session where everything
genuinely passed and nothing is uncertain **has no watch-outs** — leave it out
rather than manufacturing doubt.

### Close: Footer  *(when there's an obvious next action)*

One line naming how they'd check the work or take the next step — the exact
project file to open, the command to run, the page to visit. One line, not a
section. On Investigation wraps this is often a single offer: *"Want me to run
the read-only pass? Say the word."*

---

## Step 3 — the body, by shape

### 🏗 Build

**`## 📊 What got done`** — a table. Scope left, work middle, status right.

```
| Area | What I did | Status |
|---|---|---|
| Loading states | Screens show grey placeholder rows while data downloads, instead of "you have no tasks" | ✅ Done |
| Photo thumbnails | Images are remembered after first load, so scrolling stopped stuttering | ✅ Done |
```

Status vocabulary — use exactly these:

| Pill | Means |
|---|---|
| ✅ Done | Finished and verified |
| 🟡 Partial | Works, but something was scoped out |
| 🔬 Unverified | Written, builds, but not actually observed working |
| ⛔ Blocked | Could not finish — say why in What's left |

The **Area** column is what the reader recognizes ("Photo thumbnails"), not what
the code calls it ("ThumbnailCache").

**`## 🔍 What changed, in plain English`** — two to five bullets. This is where
you explain the *why*, the part a table can't carry. Lead each bullet with **what
is now true for the user**, then the reason.

> ❌ "Added an NSCache keyed on identity + version + pixel size."
> ✅ "Photos now load once and stay loaded. Before, the app was re-processing
> every image each time you scrolled past it — which is what made the list stutter."

If you fixed something genuinely broken, **say it was broken and what the user
would have seen.** That's the most valuable sentence in the whole summary.

---

### 🔎 Investigation

The reader asked a question. **Lead with the answer, never the search.**

**`## 💡 The answer`** — the verdict in the first sentence. Yes, no, partly, or
"it depends on X". Then two to four bullets of the reasoning that actually drives
the verdict. If the answer is *no*, say no in the first four words.

**`## 🔍 What I checked`** — a table, so they can see what the answer rests on:

```
| Question | What I found | Confidence |
|---|---|---|
| Is the tool legitimate? | Free licence, ~47,000 GitHub stars, well documented | 📄 Sourced |
| Can it test the iPhone app? | No — it only drives browsers and web requests | ✅ Verified |
| Are the servers reachable? | Yes, three are live right now; two need no login | ✅ Verified |
```

Confidence vocabulary — use exactly these:

| Pill | Means |
|---|---|
| ✅ Verified | I checked it myself and saw the result |
| 📄 Sourced | Documented by a credible source; I didn't test it |
| 🤔 Inferred | My read, not directly confirmed — could be wrong |

**Never blur these three.** "The docs say" and "I ran it and saw" are different
facts, and the reader is making a decision on them.

**`## 🧭 What I'd do`** — a recommendation, ordered, with a concrete first step
that's cheap and safe. Give one recommendation, not a menu of options.

**Rules for this shape:**
- **Never narrate the search path.** No "first I looked at X, then I tried Y."
- **Surface what you couldn't check.** Unknowns belong in Watch-outs, named
  specifically — "I couldn't confirm whether they require notice first."
- **Findings you stumbled into count.** If you noticed something broken while
  looking for something else, that's often the most valuable line in the wrap.
  Give it its own bullet.

---

### 🐞 Debug

**`## 🐞 What was actually wrong`** — the root cause, one short paragraph, in
user terms. This is the point of the whole summary. Say what the reader would
have *seen* happening, then what was causing it.

> ✅ "Tapping Save twice quickly created two copies of the task. The screen
> wasn't disabling the button while the first save was still finishing."

**`## 🔧 The fix`** — what changed, and why that addresses the cause rather than
the symptom.

**`## ✅ How I know`** — the evidence it's actually fixed. Reproduced before and
after? Test added? Or is it reasoned-but-unobserved? Say which, plainly, here —
don't hide a weak verification down in Watch-outs.

**Rules for this shape:**
- **If you never found the cause, say so in the TL;DR.** A change that makes the
  symptom disappear without an understood cause is 🔬 Unverified, not ✅ Done.
- **Name the wrong turns only if they matter** — e.g. "the obvious suspect was
  fine, so don't go looking there next time." Otherwise cut them.

---

### 🧪 Review

**`## 🚩 Findings`** — a table, **most severe first**:

```
| What's wrong | What could happen | Severity |
|---|---|---|
| The AI endpoint needs no login | Anyone could run up your Anthropic bill | 🔴 High |
| Two functions log full request bodies | Personal notes end up in server logs | 🟠 Medium |
```

Severity: 🔴 High · 🟠 Medium · 🟡 Low.

Every finding needs a **concrete failure story** — "someone could do X, and then
Y happens" — not a category name. "Insufficient input validation" tells the
reader nothing they can act on.

**`## ✅ What's fine`** — one or two lines. Reassurance is information. Without
it, a findings list reads as though the whole thing is broken.

**`## 🧭 Fix first`** — a short ordered shortlist, not everything. Two or three
items. Which one, and why that one first.

**Rules for this shape:**
- **Separate confirmed from suspected.** If you didn't prove a finding is real,
  label it. A speculative finding presented as fact costs them a wasted day.
- **Say what you did *not* look at.** Scope gaps belong in Watch-outs.

---

### 🚀 Ops

**`## 📍 Where things stand`** — before → after, plainly. Often a small table.
The reader's first question is always *"is it live?"* — answer it here.

**`## 📊 What got done`** — same table and status pills as Build.

**`## 🧭 What needs you`** — usually the most important section on this shape.
Anything needing their password, their Apple account, their card, their decision.
**Be exact**: name the screen, the button, the value to type. Not "configure the
key" — "in App Store Connect → Users and Access → Keys, revoke the key ending
`22B9DAC5UZ`."

**Rules for this shape:**
- **Anything outward-facing gets stated plainly** — deployed, published, sent,
  submitted. Say it's live and **who can now see it**.
- **Anything irreversible gets its own line**, even if it went fine.

---

## Translating jargon into plain language

The whole skill lives or dies here.

**The move: say what it means for the human, not what it is in the system.**

Ask: *if this is true, what does the reader do differently?* Write that. The
technique is optional detail, and usually you can drop it entirely.

| Don't write | Write |
|---|---|
| Refactored to `@Observable` | The screen updates itself now instead of needing a manual refresh |
| Fixed a race condition | Tapping quickly twice could create two copies — it can't now |
| Added a decode cache | Images load once and stay loaded, so scrolling is smooth |
| Gated behind a feature flag | Built, but switched off — nobody sees it until you turn it on |
| Extracted a shared component | Four screens each did this their own way; now they share one, so they can't drift apart |
| The endpoint has `verify_jwt: true` | It asks for a key — but the public key everyone already has passes the check |
| Rate limiting is per-isolate | The limit resets each time the server starts a fresh copy, so it's far weaker than it sounds |
| Apache 2.0 licensed | Free to use, including commercially, with no strings you need to worry about |
| The repo and deployment have drifted | The code you can read is not the code that's actually running |

**Keep a technical term only when they'll meet it elsewhere** — a filename they'll
see, a button they'll click, a word their developer or Apple's review team will
use. Define it inline, once, by what it *means for them* — not by what the letters
stand for.

> ❌ "The CI pipeline is green." *(they don't know what CI is)*
> ✅ "The automated checks all pass."
> ✅ "TestFlight — Apple's system for sending test builds to people — is still blocked on your API key."

**Numbers beat adjectives.** "861 tests pass" lands; "comprehensive test coverage"
doesn't. "Three files" beats "several files."

---

## Style

**Rich but calm.** The reader should enjoy scanning it.

- Emoji as **section signposts**, one per heading — not sprinkled through prose
- Tables for anything with more than two parallel items
- **Bold** the thing that matters in a line, not the whole line
- `---` dividers between major sections
- Short lines. Break before ~15 words.
- One idea per bullet
- Blank lines between ideas — whitespace is the feature, not wasted space

Heading emoji: 🧾 wrap · 📊 done · 🔍 explained · 💡 answer · 🐞 cause · 🔧 fix ·
🚩 findings · 📍 status · 🧭 left / next · ⚠️ watch-outs

**Never:**
- Dump your reasoning or narrate the path you took
- Apologize, hedge, or pad ("I hope this helps", "as you can see")
- List every file mechanically — group by what the reader cares about
- Claim verification you didn't do
- Blur "I confirmed this" with "a source claims this"

---

## Length

Scale to the work. A one-fix session gets a title, TL;DR, scoreboard and three
lines. A large session still fits on one screen-and-a-bit.

Rough ceilings: **Build and Debug ~400 words. Investigation and Review may run to
~600**, because there the findings *are* the deliverable rather than a description
of one — but only if every line earns its place.

**If the summary is longer than the work felt, you're narrating instead of
summarizing.** Cut it.

---

## Worked examples

<details>
<summary>🏗 Build</summary>

# 🧾 Session wrap — faster loading, fewer stutters

**TL;DR** — Your app no longer tells people their data is missing while it's
still downloading, and photo lists stopped stuttering. Everything builds and all
tests pass, but this hasn't been tried on a real phone yet.

**19 files changed · 5 new · iOS ✅ · macOS ✅ · 861 tests ✅ · not committed**

---

## 📊 What got done

| Area | What I did | Status |
|---|---|---|
| Restoring from iCloud | Screens now show grey placeholder rows while data downloads | ✅ Done |
| Photo thumbnails | Images load once and stay loaded | ✅ Done |
| Paywall | Prices no longer make the page jump as they appear | ✅ Done |

---

## 🔍 What changed, in plain English

- **There was a real bug.** Someone setting up a new phone saw *"Today is wide
  open"* while their whole account was still downloading. It looked exactly like
  their data had been lost. They now see placeholder rows instead.

- **Photo lists were doing the same work over and over.** Every time you scrolled
  past an image, the app re-processed it from scratch. It now remembers them.

---

## ⚠️ Watch-outs

- The iCloud restore case **can't be tested on a simulator** — it needs a real
  device with a real account. Everything else was verified.

Open `Mowj.xcodeproj` in Xcode, scheme `Mowj`, to try it.

</details>

<details>
<summary>🔎 Investigation</summary>

# 🧾 Session wrap — can we use Strix on Mowj?

**TL;DR** — Strix is real and genuinely good, but it **cannot test the Mowj app
itself** — it only attacks websites, and Mowj is a native iPhone app. It *can*
test the three server functions behind Mowj, which are live right now. While
checking, I found two of them don't match what's in your code.

**3 sources checked · live server inspected · nothing changed · 2 mismatches found**

---

## 💡 The answer

**Partly — and only for one slice of Mowj.**

- Strix works by driving a browser and sending web requests. Your iPhone app has
  no web address, so there is nothing for it to grab onto.
- Behind the app sit three small programs on Supabase's servers. Two of them can
  be called **with no login at all**. That's exactly what Strix is built for.
- One of those holds your Anthropic billing key, so an attack agent hammering it
  is a real bill, not a hypothetical.

---

## 🔍 What I checked

| Question | What I found | Confidence |
|---|---|---|
| Is the tool legitimate? | Free licence, ~47,000 GitHub stars, actively documented | 📄 Sourced |
| Can it test a native iPhone app? | No — browser and web requests only | ✅ Verified |
| What of Mowj is reachable from the internet? | Three server functions, live; two need no login | ✅ Verified |
| Does the code match what's deployed? | **No.** One live function has no code in the repo | ✅ Verified |

---

## 🧭 What I'd do

Start with the harmless version: point it at the server code sitting on your Mac.
Costs pennies, changes nothing, and will tell us whether the paid version of this
is worth it.

---

## ⚠️ Watch-outs

- **Real testers are on that same server.** An agent that triggers the
  account-delete function deletes someone's actual data.
- **I couldn't confirm** whether Supabase requires notice before you run an
  automated attack on their infrastructure. Worth an email before going live.

Want me to run the read-only pass? Say the word.

</details>
