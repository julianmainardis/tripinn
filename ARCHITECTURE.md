# TripInn modular architecture

## Folder structure

```text
tripinn/
  backend-nest/                 # NestJS backend (único backend)
    prisma/
      schema.prisma             # User, MoodEntry, SavedExperience
    src/
      common/
        filters/                # Global exception filter
      config/
      prisma/                   # Prisma module + service
      modules/
        auth/                   # Auth (register, login, profile)
          auth.module.ts        # DTOs, Service, JWT Strategy, Controller
        trips/                  # Trip search con Amadeus
          trips.module.ts       # DTOs, Service, Controller
        experiences/            # Experiencias + quotes + recomendaciones
          experiences.module.ts # Static data + endpoints
        mood/                   # Mood analysis + history + profile
          mood.module.ts        # DTOs, Service, Controller
        saved/                  # Saved experiences
          saved.module.ts       # Service, Controller
        amadeus/                # Amadeus API integration
          amadeus.module.ts     # OAuth2, flights, hotels, airports
  frontend/
    app/                        # Expo Router routes
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
      store/
```

## Module conventions

- One domain per module (`auth`, `trips`, `experiences`, `mood`, `saved`, `amadeus`)
- `amadeus`: external API integration (OAuth2 token management, HTTP calls)
- `trips`: uses Amadeus for real flight/hotel prices, local airport DB as fallback
- Avoid direct DB access from controllers; only use services
- Static content (experiences, quotes, recommendations) served from in-memory constants

## API conventions

- Base prefix: `/api`
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/profile`
- Trips: `GET /api/airports/search`, `GET /api/airports`, `POST /api/travel/search` (JWT)
- Experiences: `GET /api/experiences`, `GET /api/experiences/:id`, `GET /api/experiences/categories/list`
- Quotes: `GET /api/quote/daily`
- Recommendations: `GET /api/recommendations/{movie,book,coffee,food}`
- Mood: `POST /api/mood/analyze`, `GET /api/mood/history`, `GET /api/mood/profile` (JWT)
- Saved: `GET/POST/DELETE /api/saved`, `GET /api/saved/check/:id` (JWT)

## Amadeus Integration

- **Auth**: OAuth2 client credentials, token cached with 60s safety margin
- **Flights**: `GET /v2/shopping/flight-offers` — real-time pricing
- **Hotels**: `GET /v3/shopping/hotel-offers` — real-time pricing
- **Airports**: `GET /v1/reference-data/locations` — real airport search
- **Inspiration**: `GET /v1/shopping/flight-destinations` — cheap destinations
- Test env: `https://test.api.amadeus.com` (free quota, cached data)
- Prod env: `https://api.amadeus.com` (real-time, pay-as-you-go)

## Frontend conventions

- UI routes in `app/` (Expo Router)
- API calls through `src/shared/api` clients
- Feature logic under `src/features/<domain>`
- Legacy `src/store/*` re-exports for compatibility

## Infrastructure

- PostgreSQL via Docker Compose
- Prisma ORM for database access
- JWT authentication (7-day expiry)
- Environment variables: `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`
