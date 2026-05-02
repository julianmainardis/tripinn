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
        trips/                  # Trip search con Duffel + CJ
          trips.module.ts       # DTOs, Service, Controller
        experiences/            # Experiencias + quotes + recomendaciones
          experiences.module.ts # Static data + endpoints
        mood/                   # Mood analysis + history + profile
          mood.module.ts        # DTOs, Service, Controller
        saved/                  # Saved experiences
          saved.module.ts       # Service, Controller
        duffel/                 # Duffel API integration (vuelos)
          duffel.module.ts      # DuffelService, types
          duffel.service.ts     # Offer requests, flight search
          duffel.types.ts       # Duffel API types
        cj/                     # CJ Affiliate integration (Booking.com)
          cj.module.ts          # CJService
          cj.service.ts         # Affiliate link generation
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

- One domain per module (`auth`, `trips`, `experiences`, `mood`, `saved`, `duffel`, `cj`)
- `duffel`: external API integration for flight pricing (Offer Requests API v2)
- `cj`: CJ Affiliate link generation for Booking.com hotels
- `trips`: uses Duffel for real flight prices, CJ for hotel affiliate links, local airport DB as fallback
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

## Duffel Integration (Vuelos)

- **Auth**: Bearer token via `DUFFEL_ACCESS_TOKEN`
- **Flight Search**: `POST /air/offer_requests?return_offers=true` — creates offer request with slices (outbound + return)
- **API Version**: `v2` (header `Duffel-Version: v2`)
- **Response**: Array of `Offer` objects with `total_amount`, `slices`, `segments`
- **Cabin class**: economy (configurable)
- Test env: `https://api.duffel.com` (sandbox with `duffel_test_*` tokens)
- Prod env: same URL with `duffel_live_*` tokens

## CJ Affiliate Integration (Hoteles)

- **Publisher ID**: `CJ_PUBLISHER_ID` (7934409)
- **Link Search API**: `CJ_API_TOKEN` + `CJ_WEBSITE_ID` for automatic link ID discovery
- **Deep links**: `anrdoezrs.net/click-{PID}-{linkId}?url={encodedBookingUrl}` (direct, no intermediary page)
- **Fallback**: `anrdoezrs.net/links/{PID}/type/dlg/{bookingUrl}` (with intermediary page)
- **Booking.com CID**: 17259345

## Travel Search Logic

- **Flight budget**: max 30% of total user budget (not per person)
- **Hotel budget**: max 10% of total budget per night
- **Destinations**: 5-8 most relevant destinations from origin (geographic proximity)
- **Parallel search**: Duffel calls made in parallel per destination
- **Fallback**: if Duffel fails for a destination, uses estimated pricing

## Frontend conventions

- UI routes in `app/` (Expo Router)
- API calls through `src/shared/api` clients
- Feature logic under `src/features/<domain>`
- Legacy `src/store/*` re-exports for compatibility

## Infrastructure

- PostgreSQL via Docker Compose
- Prisma ORM for database access
- JWT authentication (7-day expiry)
- Environment variables: `DUFFEL_ACCESS_TOKEN`, `CJ_PUBLISHER_ID`, `CJ_API_TOKEN`, `CJ_WEBSITE_ID`
