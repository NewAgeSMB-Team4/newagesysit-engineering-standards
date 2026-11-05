# Claude Code project instructions

This project follows NewAgeSysIT Engineering Standards (NSES). The standards repository is pinned as a Git submodule at `.engineering/standards`.

Read the central NSES entry point:

@.engineering/standards/ENTRY.md

Then import exactly one primary technology profile appropriate to this project. For example, for a Next.js application:

@.engineering/standards/profiles/nextjs.md

For a NestJS service use `@.engineering/standards/profiles/nestjs.md`; for a standalone React application use `@.engineering/standards/profiles/react.md`. Do not import all profiles into every project. If this template is copied into a project, replace the example Next.js profile import with the actual profile and remove the other examples from the project file.

Also follow the project-root `AGENTS.md` and any more-specific instructions in the directories you modify. Project-specific architecture, commands, framework versions, test instructions, deployment notes and approved exceptions belong in this file or linked project docs. Do not duplicate the full company standards here.

Before completing a task, inspect the diff, run the relevant checks and report what was and was not verified. Never claim a check passed unless you ran it.
