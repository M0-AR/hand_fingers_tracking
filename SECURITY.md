# Security Policy

## Supported versions

SurgicalAir is a research prototype. There is no long-term support branch and
no security certification. Security fixes are applied to the `main` branch.

| Version | Supported |
| --- | --- |
| `main` (latest) | Best effort |
| Older commits | Not supported |

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private vulnerability reporting for this repository:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Describe the issue, the affected file or page, and a reproduction.

If private reporting is unavailable, open a minimal public issue asking for a
private contact channel — without disclosing details.

Please include:

- The affected component: browser page, Python demo, or BLE bridge.
- Steps to reproduce.
- The potential impact.
- Whether the issue requires camera access, local code execution, or a
  malicious network.

## What to expect

- Acknowledgement within 72 hours, best effort.
- An assessment and a proposed fix timeline.
- Credit in the fix commit if you want it.

## Scope

In scope:

- Cross-site scripting or script injection in the browser experience.
- Camera or video data being transmitted unexpectedly.
- Path traversal or unsafe file handling in the Python demos.
- Dependency vulnerabilities with a practical impact.

Out of scope:

- The fact that the project is not a medical device.
- Intentional use of the prototype to control unsafe equipment.
- Issues that require a compromised browser, operating system, or local
  attacker with equivalent access.
- Denial of service from deliberately extreme input.

## Important safety note

This is not a medical device and must not be used for diagnosis, treatment, or
control of equipment that can harm a person. If you discover a safety-relevant
behaviour, report it privately and describe the scenario. Do not test it on a
person or on live equipment.
