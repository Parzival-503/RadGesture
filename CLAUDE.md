# CLAUDE.md

Project guidance for Claude Code sessions in `RadGesture`.

<!-- BEGIN wrap-skill (synced by sync-wrap-skill.sh — do not hand-edit) -->
## Close working sessions with a wrap summary

When you finish a substantive piece of work — code written, changed, reviewed,
debugged, or investigated — and you are handing back to Sina, **close your reply
with the summary defined in the `wrap` skill**, committed at
`.claude/skills/wrap/SKILL.md`. Invoke it with the Skill tool (`wrap`) and follow
it exactly.

This is a rule, not a judgment call about whether the work "deserves" a summary.
If files changed, he gets a wrap.

**Skip it** for quick factual answers, single lookups, status checks, and
conversational replies where nothing was built or changed. A wrap on a one-line
answer is noise.

Sina is the non-technical owner of this project. Everything above the summary is
your working-out — tool calls, diffs, reasoning. He should not have to read it to
know what happened. The wrap is the part he actually reads, so it has to be in
plain language, honest about what was and wasn't verified, and scannable.
<!-- END wrap-skill -->
