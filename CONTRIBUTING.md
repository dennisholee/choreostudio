# Contributing to ChoreoStudio

Thank you for your interest in contributing. ChoreoStudio is licensed under Apache 2.0 and welcomes contributions of all kinds: bug reports, feature ideas, documentation, and code.

## Developer Certificate of Origin (DCO)

All commits must include a DCO sign-off. This certifies that you wrote the contribution or have the right to submit it under the Apache 2.0 licence.

```bash
git commit -s -m "your message"
```

This adds `Signed-off-by: Your Name <your@email.com>` to the commit. Every commit in a pull request must be signed off — the DCO check in CI will fail otherwise.

If you forgot to sign off, amend your commits:

```bash
# Single commit
git commit --amend -s

# Multiple commits
git rebase --signoff HEAD~N   # N = number of commits to fix
git push --force-with-lease
```

## Before you start

- **Check open issues** before opening a new one.
- **For large changes**, open an issue or discussion first to align on approach. This avoids wasted effort on work that may not be accepted.
- **Spikes A and B** are the immediate priority; see [`SPIKE_BRIEFS.md`](SPIKE_BRIEFS.md).

## Pull request guidelines

1. One logical change per PR.
2. Reference the relevant issue or ADR in the PR description.
3. All commits signed off (`-s`).
4. Keep commits small and well-described; squash fixups before requesting review.

## Code of Conduct

Be respectful. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
