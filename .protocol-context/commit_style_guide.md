# ArcWorker Protocol - Commit Style Guide

## Philosophy
Commit messages should essentially read like a professional log written by a human engineer, not a machine.
Avoid semantic commit prefixes like `feat:`, `fix:`, `chore:` unless explicitly required for specific CI/CD pipelines (currently not required).

## Guidelines
1.  **Natural Language:** Use standard English or Spanish sentences.
2.  **Professional Tone:** Be concise but descriptive.
3.  **No Prefixes:** Do not use `[FEAT]`, `feat(auth):`, etc.
4.  **Content Focused:** Describe *what* changed and *why*.

## Examples
**✅ Good:**
- "Refactored login flow to use username instead of email for better privacy"
- "Fixed the wallet restoration bug causing 500 errors"
- "Updated security documentation for new auth patterns"

**❌ Avoid:**
- "feat: update login"
- "fix(wallet): resolve 500 error"
- "wip"
