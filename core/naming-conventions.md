# Naming conventions

- Use descriptive `camelCase` for variables and functions; `PascalCase` for classes, React components and types/interfaces; `UPPER_SNAKE_CASE` only for true module-level constants that are configuration-like and stable.
- Use kebab-case for filenames unless the framework/tool convention requires otherwise. React component filenames may follow the repository convention consistently.
- Name booleans with `is`, `has`, `can` or `should` where it improves readability.
- Name functions with verbs and values with nouns. Avoid vague names such as `data`, `item`, `value`, `process` or `handle` when a domain-specific name is available.
- Use consistent domain terminology across API contracts, database models and UI. Do not use one word for different concepts.
- Acronyms should be readable and consistent (`userId`, not `userID`, unless required by an external contract).
- Do not encode type information or implementation details in names (`strName`, `arrUsers`, `doFetch`).
