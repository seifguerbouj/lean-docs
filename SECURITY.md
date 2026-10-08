# Security

## Reporting a problem

Please don't open a public issue for a security problem. Use GitHub's private reporting instead (Security tab, "Report a vulnerability"). You'll get an answer within a week.

## What lean-docs does with your code

- **The CLI** (`lean-docs`, `affected`, `check`, `coverage`, `index`, `wiki`, `relink`) runs locally. It reads files and runs `git`, and it never uses the network. It has no dependencies.
- **The GitHub Action** runs the same CLI. With `comment: true` it posts one PR comment using the job's `GITHUB_TOKEN`, so give it `pull-requests: write` only if you want that.
- **The skill and plugin** are instructions for your coding agent. Whatever the agent reads, it sends to your model provider, as with any agent. Publishing to Confluence or Notion uses the connector you set up, under your account. It happens only after you confirm the target.
- **The Stop hook** (Claude Code plugin) runs the CLI on your uncommitted changes. It keeps a small file in your temp folder, so it asks about each page once per session.
