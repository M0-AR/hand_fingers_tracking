# Contributing to SurgicalAir

Thank you for considering a contribution. This project is a research prototype, and the most valuable contributions make it **clearer**, **safer**, or **more honest** — not merely larger.

## Before you start

- Read [README.md](README.md), especially [Safety and limitations](README.md#safety-and-limitations).
- Check existing issues and pull requests so we do not duplicate work.
- For a large change, open an issue first and describe the problem before writing code.
- Never include secrets, API keys, personal data, or recorded video.

## Ways to contribute

| Contribution | Examples |
| --- | --- |
| Documentation | Fix an unclear paragraph, add a diagram, improve the beginner guide |
| Accessibility | Keyboard navigation, focus states, reduced motion, screen-reader labels |
| Performance | Lower memory use, faster startup, better low-end-device behaviour |
| Correctness | Signal-maths tests, edge cases, deterministic demos |
| Honesty | Correct an unsupported claim or a missing limitation |
| Bug reports | A clear reproduction with environment details |

## Development setup

### Browser experience

The site is plain HTML, CSS, and JavaScript. No build step is required.

```bash
python3 -m http.server 8000
# Open http://localhost:8000/preview.html
```

Camera access requires `localhost` or HTTPS. Mouse mode requires neither.

### Python demos

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python3 python/basic_tracking.py
```

## Verification

Run these checks before opening a pull request:

```bash
python3 -m py_compile python/*.py
node --check assets/js/core.js
node --input-type=module --check < assets/js/scene.js
python3 -m unittest discover -s tests -v
```

Or run the whole suite with:

```bash
make check
```

Then verify in a browser:

- No console errors.
- The Live Lab works in mouse mode.
- The quiz accepts answers and shows explanations.
- The page has no horizontal scroll at 360 px width.
- The layout still works with reduced motion enabled.

## Style

- Match the existing style. Do not reformat unrelated code.
- Keep one pull request focused on one change.
- Prefer plain language in documentation and comments.
- Do not add dependencies unless they are necessary and permissively licensed.
- Do not add analytics, trackers, accounts, or video uploads.

## Claims policy

This is the most important rule in this repository.

- Do **not** describe the project as a medical device, clinical tool, or validated product.
- Do **not** claim accuracy, safety, or clinical benefit without a citation and a stated scope.
- Do **not** remove or weaken a limitation in the README without evidence.
- Label prototypes as prototypes, and simulations as simulations.

A smaller, accurate claim is always better than a larger, fragile one.

## Pull requests

A good pull request contains:

1. **One change** — a focused diff.
2. **One verification step** — a command, a screenshot, or a reproduction.
3. **A clear description** — what problem it solves and what it does not solve.

Maintainers may ask for a smaller scope or additional evidence. That is normal.

## Commit messages

Use a short imperative subject line:

```text
Add hysteresis to pinch detection
Fix mobile overflow in the lab status bar
Clarify the depth-coordinate limitation
```

## Community

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
