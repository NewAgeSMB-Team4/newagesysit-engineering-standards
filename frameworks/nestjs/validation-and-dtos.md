# NestJS validation, DTOs and request boundaries

- Use DTO classes with runtime validation decorators or an approved schema integration.
- Configure a global `ValidationPipe` with `whitelist: true`; consider `forbidNonWhitelisted: true` for strict contracts and `transform: true` when conversion is intentional.
- Do not use TypeScript interfaces as runtime DTO validation; interfaces are erased at runtime.
- Validate nested objects and arrays explicitly (`@ValidateNested`, appropriate transformation) and constrain lengths/ranges.
- Keep request DTOs separate from persistence entities and response DTOs.
- Never bind untrusted request bodies directly into ORM entities without an explicit allowlist/mapping.
- Validate query sort/filter fields against allowlists; cap pagination.
- Document validation behavior and stable error responses.
