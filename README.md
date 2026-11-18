# Aura Player

**One player for local files and online streams.**

Most browser media players end up as two things bolted together: one code path
for local playback, another for streaming, two sets of controls, two state
machines that drift apart.

Aura Player routes both through a single **Web Audio API** graph. Local MP3s and
streamed audio flow through the same nodes, which means one set of playback
controls, one visualiser, one state machine.

**Live:** [aura-player-nine.vercel.app](https://aura-player-nine.vercel.app/)

## What it does

- Offline MP3 / MP4 playback
- Online streaming
- Unified playback controls across both
- Web Audio processing and visualisation
- Responsive interface

## The design

Routing local and streamed audio through one audio graph was the whole point.
Everything downstream — the controls, the visualiser, the seek logic — only has
to understand one source of truth. Adding a second playback path would have been
faster to ship and worse to maintain.

## Built with

React · Web Audio API · Tailwind CSS

## Licence

Proprietary — All Rights Reserved. Published for portfolio and demonstration
purposes only. See [LICENSE](LICENSE).

---

Built by **Vansh Kashyap** — full-stack and AI automation developer in New Delhi,
India, and **co-founder of [LZ Worth](https://lzworth.in)**, a New Delhi studio
building AI automation, websites and apps.

[Portfolio](https://vanshkashyap.lzworth.in) · [LZ Worth](https://lzworth.in) · [DEV](https://dev.to/techbyvansh) · [LinkedIn](https://www.linkedin.com/in/techbyvansh)
