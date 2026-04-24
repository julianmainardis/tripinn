# TripInn target modular architecture

## Folder structure

```text
tripinn/
  backend/                      # Legacy FastAPI (kept during dual-run)
  backend-nest/                 # New modular backend
    prisma/
      schema.prisma
    src/
      common/
        filters/
        logger/
      config/
      prisma/
      modules/
        auth/
          application/
          domain/
          infrastructure/
          presentation/
        trips/
          application/
          domain/
          infrastructure/
          presentation/
  frontend/
    app/                        # Expo Router routes (kept stable)
    src/
      features/
        auth/
          api/
          store/
          types/
        mood/
          api/
          store/
          types/
        trips/
          api/
          types/
      shared/
        api/
        lib/
        types/
      components/
      constants/
      store/                    # Compatibility exports to new feature stores
```

## Module conventions

- One domain per module (`auth`, `trips`) with explicit boundaries.
- `domain`: entities/value objects and pure contracts.
- `application`: business use-cases orchestrating domain + repositories.
- `infrastructure`: persistence adapters (Prisma repositories).
- `presentation`: controllers, DTOs, guards, serialization and API contracts.
- Avoid direct DB access from controllers; only use application services.

## API conventions

- Base prefix: `/api`.
- Auth endpoints keep current contracts:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `GET /api/auth/profile`
  - `PUT /api/auth/profile`
- Trips endpoints keep current contracts:
  - `GET /api/airports`
  - `GET /api/airports/search`
  - `POST /api/travel/search`

## Frontend conventions

- UI routes remain in `app/` to avoid navigation regressions.
- API calls go through `src/shared/api` clients.
- Feature logic (services + store + types) lives under `src/features/<domain>`.
- Legacy imports from `src/store/*` are kept as re-export compatibility shims.
