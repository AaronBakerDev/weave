# Weave: A ChatGPT‑Native Medium for Living Memory

**Summary.**
Weave is a memory platform built *inside* ChatGPT. It turns everyday conversation into durable, navigable, and optionally shared memories. Private by default, it supports three modes—solo, shared, and public—while treating each memory as a living object: an immutable core with append‑only layers, linked across people, places, and feelings. The result is not a feed, but a map—visual, auditory, and conversational—where memories can be revisited, enriched from multiple perspectives, and woven into meaning over time.

---

## Why build this now—and why ChatGPT first

1. **Memory lives in dialogue.** Humans recall and make sense of life by telling stories, asking questions, and hearing them echoed back. ChatGPT is already the most widespread interface for that kind of reflection. Building Weave here aligns the product with how remembering actually happens: in conversation.

2. **Context is a first‑class citizen.** ChatGPT's session and app architecture allows persistent context per user and per space. Memories aren't files you open; they're relationships you return to. That makes Weave feel like continuity, not storage.

3. **Associative intelligence, not manual filing.** Large‑language intelligence can detect emotional and semantic overlap—"the nights with open windows," "the cedar smell," "the week after the surgery"—and surface connections without forcing users to tag exhaustively.

4. **Ambient access, minimal friction.** Inside any conversation, the user can simply say: *"Add this to my New York summer memory"* or *"Open the memory about Dad's guitar."* Weave runs as a background companion (a "weaver"), invoked on demand, with deeper immersion available in a full‑screen canvas.

5. **Trust posture and privacy scaffolding.** Private by default. Explicit consent gates for any sharing. Clear boundaries when AI assists (especially with synthesized narration). Users control visibility at the memory level and can change it over time.

---

## The new primitive: a **Living Memory**

A Living Memory is not a post or a chat transcript. It is a composable object with four parts:

1. **Core (immutable):** a snapshot you set when the memory feels formed enough—title, time, place, people, your telling, and 3–5 sensory anchors (light, sound, smell, touch, words). The Core is locked; to change it, you "lift the flag." Any amendment is logged as a new version.

2. **Layers (append‑only):** later details, perspectives from invited people, reflections, and artifacts (photos, videos, voice notes, documents). Layers never overwrite the Core.

3. **Permissions:** `private`, `shared`, or `public`, with roles (owner, contributor, viewer). Visibility can shift over time; permission changes are versioned.

4. **Graph context:** links to other memories via people, place, era, motif, or emotion. The graph is how Weave "knows" two separate memories belong to the same season of life and can invite you to weave them.

This structure protects the truth of the moment while allowing meaning to grow.

---

## Experience: navigating your memory space

Weave replaces the feed with an explorable canvas where your memories live as interconnected objects.

* **The Canvas (open view).** On open, you enter an organized, explorable space where memories cluster by connection—people you've known, places you've been, seasons of life, emotions, events. The layout is intentional and aesthetic; clusters can be rearranged, filtered by time or theme. You navigate freely: pan, zoom, move memories around to suit how *you* remember them.

* **Enter a memory.** Click or tap a memory and the camera zooms into it, revealing detail. The canvas smoothly transitions into the memory's full view: Core (the original moment) at the center, Layers (contributions, reflections, artifacts) surrounding it. You can view, edit, share, or link from inside. Touch or say "back" to zoom out and return to the canvas.

* **Explore connections.** Memories in the canvas show **visual threads** connecting related ones (same person, place, theme, emotion). These threads let you see at a glance how your life weaves together. Follow a thread to jump between memories or hover to preview connections.

* **Weaving.** When the system detects strong overlap (same people, sensory details, or themes), it offers to weave: *"This shares three anchors with memories about your dad. Weave them?"* Accepting creates a link visible in the canvas—originals stay separate, but now connected.

* **Recall without search.** Prompts like *"Show me the last time I felt this calm,"* *"memories that smell like cedar,"* or *"everything from the week after the graduation"* filter and highlight relevant memories on the canvas. The spatial layout means you're not reading a list; you're **seeing** your memories in relation to each other.

---

## Modes: private, shared, public

* **Private (solo).** A quiet space to capture and revisit. The system learns your cadence. It may gently resurface a related note on an anniversary—opt‑in and never pushy.

* **Shared (co‑authored).** Two or more people contribute layers to the same memory. Differences are preserved and can be pinned ("we remember this differently"). Composite summaries appear alongside originals, never instead of them. Turn‑taking tools keep conversations human.

* **Public (collective).** Some stories want an audience: a community event, a creative project. Public memories remain authored *from inside ChatGPT* and present as living timelines rather than static posts. Viewers can witness, not rewrite, unless invited.

All three run on the same object model and UI, gated by permissions and tone.

---

## Remembrance: safe, interactive sessions

For sensitive memories or those involving people who have died, Weave supports structured sessions designed for safety and clarity.

* **Framing.** The interface states plainly what is happening: an interactive remembrance, not a conversation with the person. If a synthetic voice is used, that state is visible at all times.

* **Voice as vessel.** When enabled, an approved synthetic voice can **narrate** Core text, read past letters, or speak curated phrases drawn from the corpus. It does not improvise. The aim is continuity and comfort, not impersonation.

* **Moderation and pacing.** Sessions have clear starts and ends, time limits, and grounding prompts. Users can mark memories as protected to prevent unexpected resurfacing. Co‑present remembrance (two or more participants) includes shared tempo, explicit turn‑taking, and a collective close.

* **Consent.** For living people, explicit consent is required for voice use or synthetic narration. For the dead, families control the corpus and may revoke access. All generated audio is watermarked and labeled in the UI.

---

## Product rituals, not growth hacks

* **Gathering** (invite a person to a memory),
* **Offering** (share a moment for witnessing),
* **Locking** (set the Core; amendments are logged),
* **Weaving** (link related fragments),
* **Closing** (leave a session deliberately).

These rituals keep the product human‑scaled and protect it from becoming a broadcast feed.

---

## The background companion: the **weaver**

Weave operates quietly inside any ChatGPT session:

* *"Add this paragraph to my 2025 Lisbon memory, under sense details."*
* *"Open the memory about the first apartment and play the morning clip."*
* *"Weave this with the note about the cedar drawers."*

The weaver handles capture, indexing, linking, and permissions. When deeper exploration is needed, users jump to the canvas view. This "always nearby" presence turns reflection into a habit rather than a chore.

---

## Architecture sketch

* **ChatGPT app surface.**

  * **Widget:** quick capture/recall.
  * **Canvas:** full‑screen map, timelines, replay, co‑presence tools.
  * **Actions (API):** `createMemory`, `setCore`, `appendLayer`, `setPermissions`, `searchAssociative`, `createWeave`, `playback`, `invite`, `startRemembranceSession`.

* **Backend (yours).**

  * **Event‑sourced model** to guarantee immutability of Cores and ordered append‑only layers.
  * **Media storage** for photos, audio, and video; transcripts as first‑class artifacts.
  * **Embedding indexes** across text, audio transcripts, and image captions to power associative recall.
  * **Graph store** to model relationships (people, places, motifs, emotions).
  * **Permissions and auditing** at the memory and artifact level.
  * **Encryption at rest and in transit;** export, delete, and full history views.

* **Intelligence roles (ChatGPT).**

  * **Archivist:** structure capture; maintain consistency.
  * **Weaver:** propose links and clusters; generate safe composite summaries.
  * **Guide:** surface gentle prompts and patterns.
  * **Guardian:** enforce consent boundaries, session limits, and transparent labeling for synthetic elements.

---

## Safety, ethics, and consent

* **Clarity over illusion.** Any synthetic narration is labeled in voice and UI. No deepfake impersonation, no open‑ended chat "as" someone. Voice is a reading instrument, not a character.

* **Consent pathways.** Living subjects must approve corpus use and narration. Estates manage access for the deceased where appropriate. Revocation is respected and logged.

* **Boundaries by design.** Protected memories won't resurface without explicit opt‑in. Sensitive sessions include pacing controls and optional support resources.

* **Data dignity.** Private by default; sharing is explicit and scoped. Users can see who accessed what, when. Every edit and permission change is versioned.

---

## What success looks like

* **Creation:** people capture small, true moments without friction.
* **Revisit:** memories are actually reopened—because recall feels natural, not like searching a hard drive.
* **Contribution:** shared memories gain depth from multiple perspectives without muddying the Core.
* **Weaving:** clusters and threads emerge that help people see their lives with greater coherence.
* **Retention with meaning:** the more your history lives here, the more valuable Weave becomes—not from lock‑in, but from accumulated clarity.

Key metrics (directional): time to first Core, revisit rate (D7/D30), percentage of memories with multiple layers, successful "weave" activations, co‑presence session completion rate, opt‑in rate for anniversaries, and export/delete friction (should be low and respected).

---

## Why this matters

Most tools capture what happened. Few help us preserve *how it felt* and *how it changed us*. Social media optimized for performance; cloud drives optimized for storage. Neither is built for remembrance, for testimony shared carefully, or for the quiet work of meaning‑making over time.

Weave proposes a different center: memory as a living, co‑authored object, stewarded by an intelligence that can organize without intruding, and presented in a medium—voice, image, and conversation—that matches how humans actually recall. Made ChatGPT‑first, it becomes ambient, trustworthy, and fluent.

This is not an attempt to recreate life. It is a way to **honor** it: to hold traces with care, let stories grow without erasure, and make it easier to find our way back when the mind is tired and soft.
