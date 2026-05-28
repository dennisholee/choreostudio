# Security Policy

## Supported versions

ChoreoStudio is pre-1.0. Security fixes will be applied to the `main` branch only.

| Version | Supported |
|---|---|
| main (pre-release) | ✅ |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues by emailing the maintainer directly (see the GitHub profile for contact details) or by using [GitHub's private vulnerability reporting](https://github.com/dennisholee/choreostudio/security/advisories/new).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

You will receive acknowledgement within 72 hours. We aim to publish a fix and disclosure within 90 days of a confirmed report.

## Scope

In scope: canvas validation bypass, RBAC enforcement bypass, Git credential exposure, CRDT merge producing exploitable state, XSS in canvas rendering.

Out of scope: denial-of-service via extremely large canvases, theoretical CRDT convergence edge cases without practical exploit.
