Slate for Smart Boards — Upgrade Plan

Oct 30, 2026 · @Prism

Summary

Slate already has more teaching content than most smart-board apps; what it lacks is board-grade input handling and a teacher-first interface. The plan is to fix input first, then rebuild the shell around how a teacher stands at a 65–86 inch panel, then add classroom features.

What exists today (from the slate-web code): 13 pen types, 50+ 2D/3D shapes, shape and handwriting recognition, LaTeX formulas, ruler, protractor, reveal curtain, periodic table, maps, 3D solids, timer, stopwatch, dice, scoreboard, calculator, voice notes, flashcards, quizzes, mind maps, flowcharts, 8 backgrounds, pages, slide frames, presentation mode, minimap, find-on-board, PDF/document viewer, and an AI copilot with an offline fallback.

What changes on a smart board:

The screen is huge and vertical. The teacher stands close, can't see the whole board, and the bottom and top edges are hard to reach for shorter teachers and students.

Input is mostly fingers, passive styluses and palms, all reported as touch. Several people touch at once.

The teacher is talking to 40 students while using it. Every action must work in one tap, readable from the back of the room, with no settings hunting.

Boards run Android (Maxhub, BenQ, Samsung Flip, ViewSonic, Promethean) at 4K, often offline, shared by many teachers.

Phase 0: input blockers to fix first

The current input code assumes a phone or tablet with an active pen; on most smart panels it will misbehave the moment two hands touch the glass. These are the fixes, all in Canvas.tsx.

Issue found

Where

What happens on a board

Fix

Any 2nd touch starts pinch-zoom

onPointerDown (touchMapRef.size >= 2) and the native touchstart listener (e.touches.length >= 2)

Two students writing at once, or a resting palm, zoom the board and cancel the stroke

Per-pointer stroke sessions: each pointerId draws its own stroke. Zoom only on a deliberate 2-finger gesture that starts within ~80 ms and moves apart/together, or turn gestures off in a "Lock board" mode

Palm rejection needs pointerType === "pen"

Line 4666

Boards report passive stylus and fingers as touch, so palm rejection never activates

Use contact size (e.width / e.height): small = pen/finger, large = palm. Make thresholds calibratable per board

No palm/fist erase

—

Teachers expect to wipe with the side of the hand (every IFP does this)

Contact area above a threshold switches to an object/pixel eraser sized to the contact, then back

Touch never gets pointer capture

Line 4686

Fast strokes that leave the canvas element (over a widget or the toolbar) break

Capture all pointer types on the canvas; route widget hits explicitly

One global drawingRef

Canvas state

Only one stroke can be in progress at a time

Map of pointerId → drawing session; commit each independently to the store and undo stack

Single 7,450-line Canvas.tsx

—

Every board feature risks regressions

Split out input/ (pointer router, gesture detector, palm classifier) before adding features

Also check 4K performance: test a full board (1,000+ strokes) on a real 4K Android panel, render committed strokes to a cached layer, and keep only live strokes on the overlay canvas. Target 60 fps and under 20 ms pen-to-ink latency.

Teacher UX redesign

The goal is a board a first-time teacher can use in under a minute with no training: few visible choices, big targets, and everything reachable from where they stand.

A dedicated "Board mode" layout, switched on automatically when the screen is 55 inches or wider (or from Settings):

Side docks, not a bottom-centre dock. Put a vertical toolbar on both left and right edges at mid-height, so the teacher reaches it from either side without walking across. Either dock can be hidden; both mirror the same tools.

Five tools on the dock, not dozens. Pen, Highlighter, Eraser, Select, Shapes, then a "More" drawer. Pen opens 6 big colour swatches and 3 sizes. The 13 pen styles, 50 shapes and widgets live one level deeper.

Big targets. Minimum 64 px touch targets (current buttons are 28–40 px), labels under icons, popovers at least 480 px wide instead of 356 px.

Floating radial menu. Long-press anywhere on the canvas to open pen/colour/eraser/undo at the hand's position. No walking to a toolbar mid-sentence.

Always-visible Undo, Redo, Clear and Page controls in a slim strip at the bottom corners, readable from the back of the room.

Height-aware dialogs. Dialogs open near where they were triggered, never at the top of a 2-metre-tall screen. Add a "Pull down" button that moves the whole UI to the lower half for shorter teachers and students.

Simple vs Advanced. A one-switch "Simple" mode hides AI, 3D, and pen effects for teachers who just want to write. Advanced shows everything.

Ease of understanding:

Plain labels instead of jargon ("Glitter & Shine", "Radar Minimap", "Dual Ribbon" become "Sparkle pen", "Board map", "Double line").

A 60-second first-run tour on the board itself, then a "?" button that shows labels over every control.

Every destructive action is undoable; replace "swipe to clear" and "double-tap bin" with one Clear button plus an Undo toast.

Settings grouped by teacher task (Writing, Pages, Classroom, Display), not by feature.

New features

The biggest gaps are multi-user writing, lesson prep and student interaction; Slate already covers content tools well. P1 = needed for a board release, P2 = strong differentiator, P3 = later.

Feature

What it does for the teacher

Priority

Effort

Classroom basics

Split board (2–4 zones)

Students solve side by side, each zone with its own pen, colour and undo

P1

M

Multi-user writing

2–10 people write at once anywhere on the board

P1

M (after Phase 0)

Spotlight & screen shade

Dim everything except a movable circle/rectangle; extends the existing Reveal Curtain

P1

S

Magnifier

Zoom lens on part of the board for the back rows

P2

S

Freeze / Lock board

Stops accidental pans, zooms and erases while kids are at the board

P1

S

Random name picker & groups

Load a class list once, pick a student or make groups on screen

P2

S

Traffic light / noise meter

Classroom-management widgets next to the existing timer

P3

S

Lesson preparation

Lesson files

A lesson = ordered pages + widgets, prepared at home on phone/laptop, opened on the board

P1

M

Import PPT / PDF as pages

Annotate on top of existing slides (PDF viewer exists; make each page a board page)

P1

M

Subject template packs

Maths graph paper, number lines, music staves, handwriting lines (4-line for Hindi/English), world/India maps

P2

S

Page sorter

Thumbnail grid to reorder, duplicate and delete pages

P1

S

Teaching tools

Graph plotter

Type y = f(x) and get an editable graph on the board

P2

M

Compass & set-square

Join the existing ruler and protractor; ink snaps to the tool edge

P2

M

Number line, fraction bars, clock

Draggable manipulatives for primary classes

P2

S

Embedded video & web

Play a YouTube/local video or web page on a page and annotate over it

P2

M

Desktop annotation overlay

Draw over any other Android app (needs a native Capacitor plugin)

P3

L

Student interaction

Quick poll via QR

Students scan a QR, answer on their phones, results chart on the board (the qrcode package is already installed)

P2

L (needs Supabase realtime)

Turn existing quiz objects into a live quiz

Reuse QuizObject; reveal answers and a class score

P2

M

Drag-and-drop activities

Sort / match / label cards that students drag on the board

P2

M

After class

Share notes via QR

Students scan to get the board as a PDF

P1

M

Record lesson

Screen + voice recording saved as video

P3

L

Auto-save & teacher login

Sign in with a QR from the teacher's phone; boards save to their account, not the shared device

P1

M

AI (already strong)

Generate a lesson from a topic

Copilot builds 5–8 pages with diagrams, a quiz and flashcards

P2

M

Board-friendly AI output

Answers rendered large and handwritten-style, placed where the teacher points

P2

S

Roadmap

About 9–10 weeks of work gets a pilot-ready board build; each phase ends with a test on real hardware before the next starts.

roadmap · 4 phases, 3 gates

Effort assumes one developer working full-time. Phase 3 items can be picked in any order based on pilot feedback.

Open questions

☐ Which board will this run on first (brand, size, Android version)? Contact-size palm detection must be tuned on real hardware.

☐ Does the board run Slate as an installed APK, or in a browser? This decides whether native features like the desktop overlay are possible.

☐ Who are the teachers: primary, secondary, or college? This sets which template packs and manipulatives come first.

☐ Will classrooms have reliable internet? If not, polls and sharing need a local-network fallback.

☐ Is the Play Store phone/tablet app still the same product, or does the board get its own build?