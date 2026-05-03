import {
  Body,
  Controller,
  Get,
  Injectable,
  Logger,
  Module,
  OnModuleInit,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { DuffelModule, DuffelService } from '../duffel/duffel.module';
import { CJModule, CJService } from '../cj/cj.module';

type Airport = { code: string; city: string; country: string; name: string };

const COUNTRY_NAMES: Record<string, string> = {
  AD: 'Andorra', AE: 'Emiratos Árabes', AR: 'Argentina', AT: 'Austria', AU: 'Australia',
  BE: 'Bélgica', BO: 'Bolivia', BR: 'Brasil', CA: 'Canadá', CH: 'Suiza', CL: 'Chile',
  CN: 'China', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CZ: 'República Checa',
  DE: 'Alemania', DK: 'Dinamarca', DO: 'República Dominicana', EC: 'Ecuador', EE: 'Estonia',
  ES: 'España', FI: 'Finlandia', FR: 'Francia', GB: 'Reino Unido', GR: 'Grecia',
  GT: 'Guatemala', HR: 'Croacia', HU: 'Hungría', IE: 'Irlanda', IL: 'Israel',
  IN: 'India', IS: 'Islandia', IT: 'Italia', JP: 'Japón', KR: 'Corea del Sur',
  LI: 'Liechtenstein', LT: 'Lituania', LU: 'Luxemburgo', LV: 'Letonia', MA: 'Marruecos',
  MC: 'Mónaco', MX: 'México', NL: 'Países Bajos', NO: 'Noruega', NZ: 'Nueva Zelanda',
  PA: 'Panamá', PE: 'Perú', PL: 'Polonia', PT: 'Portugal', PY: 'Paraguay',
  RO: 'Rumanía', RS: 'Serbia', RU: 'Rusia', SE: 'Suecia', SG: 'Singapur',
  SI: 'Eslovenia', SK: 'Eslovaquia', SV: 'El Salvador', TH: 'Tailandia', TN: 'Túnez',
  TR: 'Turquía', TW: 'Taiwán', US: 'Estados Unidos', UY: 'Uruguay', VE: 'Venezuela',
  VN: 'Vietnam', ZA: 'Sudáfrica',
};

const REGION_PRIORITY: Record<string, string[]> = {
  'España': ['España', 'Portugal', 'Francia', 'Italia', 'Reino Unido', 'Alemania', 'Países Bajos', 'Bélgica', 'Irlanda', 'Grecia', 'Croacia', 'Austria', 'Suiza', 'Dinamarca', 'Suecia', 'Noruega', 'Marruecos', 'Turquía', 'Polonia'],
  'Portugal': ['Portugal', 'España', 'Francia', 'Italia', 'Reino Unido', 'Alemania', 'Países Bajos', 'Bélgica', 'Irlanda', 'Grecia', 'Croacia', 'Austria', 'Suiza', 'Dinamarca', 'Suecia', 'Noruega', 'Marruecos', 'Turquía', 'Polonia'],
};

const HOTEL_CATEGORIES: Record<string, { perNightPerPerson: number }> = {
  BUDGET: { perNightPerPerson: 35 },
  MEDIUM: { perNightPerPerson: 55 },
  EXPENSIVE: { perNightPerPerson: 85 },
};

const HOTEL_PRICES: Record<string, number> = {
  'BUD': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'PRG': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'OPO': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'LIS': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'RAK': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'CMN': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'ATH': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'SKG': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'WAW': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'KRK': HOTEL_CATEGORIES.BUDGET.perNightPerPerson,
  'DBV': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'SPU': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'ZAG': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'BCN': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'NAP': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'VCE': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'FCO': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'MXP': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'MAD': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'AGP': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'VLC': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'ALC': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'PMI': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'BIO': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'SVQ': HOTEL_CATEGORIES.MEDIUM.perNightPerPerson,
  'CDG': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'ORY': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'AMS': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'ZRH': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'GVA': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'LHR': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'LGW': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'STN': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'BER': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'MUC': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'FRA': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'CPH': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'ARN': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'OSL': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'HEL': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'BRU': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'VIE': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'DUB': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'NCE': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'MRS': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'IST': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
  'TLV': HOTEL_CATEGORIES.EXPENSIVE.perNightPerPerson,
};

function getHotelPricePerNight(code: string, adults: number): number {
  return (HOTEL_PRICES[code] ?? HOTEL_CATEGORIES.MEDIUM.perNightPerPerson) * adults;
}

const POPULAR_DESTINATIONS = [
  'MAD', 'BCN', 'PMI', 'AGP', 'ALC', 'VLC', 'SVQ', 'BIO', 'LIS', 'OPO',
  'CDG', 'ORY', 'FCO', 'MXP', 'VCE', 'NAP', 'AMS', 'BRU', 'LHR', 'LGW',
  'DUB', 'PRG', 'BUD', 'VIE', 'ATH', 'IST', 'RAK', 'CPH', 'GVA', 'ZRH',
  'BER', 'FRA', 'MUC', 'NCE', 'MRS', 'DBV', 'SPU',
];

class TravelSearchDto {
  @IsString() origin_code!: string;
  @IsString() origin_city!: string;
  @IsNumber() @Min(1) max_budget!: number;
  @IsString() date_from!: string;
  @IsString() date_to!: string;
  @IsInt() @Min(1) adults = 2;
  @IsOptional() @IsString() destination_code?: string;
}

@Injectable()
export class TripsService implements OnModuleInit {
  private readonly logger = new Logger(TripsService.name);
  private readonly MAX_FLIGHT_BUDGET_PCT = 0.3;
  private readonly MAX_HOTEL_BUDGET_PCT = 0.1;
  private readonly MAX_DESTINATIONS = 5;
  private readonly CANDIDATE_COUNT = 30;
  private cachedAirports: Airport[] = [];

  constructor(
    private readonly duffel: DuffelService,
    private readonly cj: CJService,
  ) {}

  async onModuleInit() {
    await this.loadAirportsFromDuffel();
  }

  private async loadAirportsFromDuffel() {
    if (!this.duffel.isConfigured()) {
      this.logger.warn('Duffel not configured, using empty airport list');
      return;
    }

    try {
      const countries = [
        'ES', 'PT', 'FR', 'IT', 'DE', 'NL', 'BE', 'GB', 'IE', 'CZ', 'HU',
        'AT', 'PL', 'GR', 'TR', 'MA', 'HR', 'DK', 'SE', 'NO', 'FI', 'CH',
        'US', 'MX', 'CO', 'AR', 'BR', 'IL',
      ];

      const airportPromises = countries.map(async (code) => {
        try {
          const airports = await this.duffel.listAirportsByCountry(code);
          return airports.map((a) => ({
            code: a.iata_code,
            city: a.city_name,
            country: COUNTRY_NAMES[a.iata_country_code] ?? a.iata_country_code,
            name: a.name,
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(airportPromises);
      const all = results.flat();
      const seen = new Set<string>();
      this.cachedAirports = all.filter((a) => {
        if (seen.has(a.code)) return false;
        seen.add(a.code);
        return true;
      });

      this.logger.log(`Loaded ${this.cachedAirports.length} airports from Duffel`);
    } catch (error) {
      this.logger.error(`Failed to load airports from Duffel: ${error}`);
    }
  }

  async searchAirports(query: string): Promise<Airport[]> {
    if (this.duffel.isConfigured()) {
      const places = await this.duffel.searchPlaces(query);
      const airports: Airport[] = [];
      const seen = new Set<string>();

      for (const place of places) {
        if (place.type === 'city') {
          const cityName = place.name;
          const country = COUNTRY_NAMES[place.iata_country_code] ?? place.iata_country_code;
          const primaryAirport = place.airports?.[0];

          if (primaryAirport && !seen.has(primaryAirport.iata_code)) {
            airports.push({
              code: primaryAirport.iata_code,
              city: cityName,
              country,
              name: primaryAirport.name,
            });
            seen.add(primaryAirport.iata_code);
          }
        } else if (place.type === 'airport' && place.city_name) {
          const country = COUNTRY_NAMES[place.iata_country_code] ?? place.iata_country_code;
          if (!seen.has(place.iata_code)) {
            airports.push({
              code: place.iata_code,
              city: place.city_name,
              country,
              name: place.name,
            });
            seen.add(place.iata_code);
          }
        }
      }

      return airports.slice(0, 10);
    }

    return this.cachedAirports
      .filter((a) =>
        a.city.toLowerCase().includes(query.toLowerCase()) ||
        a.code.toLowerCase().includes(query.toLowerCase()) ||
        a.country.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 10);
  }

  allAirports(): Airport[] {
    return this.cachedAirports;
  }

  private getRelevantDestinations(originCode: string): Airport[] {
    const origin = this.cachedAirports.find((a) => a.code === originCode);
    if (!origin) {
      const seen = new Set<string>();
      return this.cachedAirports.filter((a) => {
        if (seen.has(a.code)) return false;
        seen.add(a.code);
        return true;
      }).slice(0, this.CANDIDATE_COUNT);
    }

    const priorities = REGION_PRIORITY[origin.country] ?? [];
    const sorted = [...this.cachedAirports].sort((a, b) => {
      if (a.code === originCode) return 1;
      if (b.code === originCode) return -1;

      const aPopular = POPULAR_DESTINATIONS.includes(a.code) ? 0 : 1;
      const bPopular = POPULAR_DESTINATIONS.includes(b.code) ? 0 : 1;
      if (aPopular !== bPopular) return aPopular - bPopular;

      if (priorities.length > 0) {
        const aIdx = priorities.indexOf(a.country);
        const bIdx = priorities.indexOf(b.country);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
      }

      return 0;
    });

    const filtered = sorted.filter((a) => a.code !== originCode);
    const seen = new Set<string>();
    return filtered.filter((a) => {
      if (seen.has(a.code)) return false;
      seen.add(a.code);
      return true;
    }).slice(0, this.CANDIDATE_COUNT);
  }

  private generateSkyscannerUrl(
    origin: string,
    dest: string,
    dateOut: string,
    dateIn: string,
    adults: number,
  ): string {
    const dOut = dateOut.replace(/-/g, '').slice(2);
    const dIn = dateIn.replace(/-/g, '').slice(2);
    return `https://www.skyscanner.es/transporte/vuelos/${origin.toLowerCase()}/${dest.toLowerCase()}/${dOut}/${dIn}/?adults=${adults}&adultsv2=${adults}&cabinclass=economy&currency=EUR`;
  }

  async travelSearch(dto: TravelSearchDto) {
    const destinations = dto.destination_code
      ? this.cachedAirports.filter((a) => a.code === dto.destination_code)
      : this.getRelevantDestinations(dto.origin_code);

    const from = new Date(dto.date_from);
    const to = new Date(dto.date_to);
    const nights = Math.max(
      2,
      Math.ceil((to.getTime() - from.getTime()) / 86400000),
    );

    const maxFlightBudget = dto.max_budget * this.MAX_FLIGHT_BUDGET_PCT;
    const maxHotelPerNight = dto.max_budget * this.MAX_HOTEL_BUDGET_PCT;

    const useDuffel = this.duffel.isConfigured();

    const results = await Promise.all(
      destinations.map(async (airport) => {
        let flightCost: number;
        let hotelPerNight: number;
        let flightIsReal: boolean;

        if (useDuffel) {
          const flightResult = await this.duffel.searchFlights({
            origin: dto.origin_code,
            destination: airport.code,
            dateFrom: dto.date_from,
            dateTo: dto.date_to,
            adults: dto.adults,
            currency: 'EUR',
          });

          if (flightResult) {
            flightCost = flightResult.pricePerAdult * dto.adults;
            flightIsReal = true;
          } else {
            flightCost = Math.round(maxFlightBudget * 0.5);
            flightIsReal = false;
          }

          hotelPerNight = getHotelPricePerNight(airport.code, dto.adults);
        } else {
          const seed =
            (airport.code.charCodeAt(0) * 31 + airport.code.charCodeAt(1) * 17 + dto.origin_code.charCodeAt(0) * 13) %
            100;
          flightCost = Math.round(maxFlightBudget * 0.4 + (seed / 100) * maxFlightBudget * 0.6);
          hotelPerNight = getHotelPricePerNight(airport.code, dto.adults);
          flightIsReal = false;
        }

        const hotelTotal = hotelPerNight * nights;
        const totalCost = flightCost + hotelTotal;

        if (flightCost > maxFlightBudget) {
          return null;
        }

        return {
          destination_code: airport.code,
          destination: airport.city,
          country: airport.country,
          image: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop&q=80`,
          flight_estimate: parseFloat(flightCost.toFixed(2)),
          hotel_estimate_per_night: parseFloat(hotelPerNight.toFixed(2)),
          hotel_estimate_total: parseFloat(hotelTotal.toFixed(2)),
          total_estimate: parseFloat(totalCost.toFixed(2)),
          nights,
          adults: dto.adults,
          within_budget: totalCost <= dto.max_budget,
          savings_estimate: parseFloat(
            Math.max(0, dto.max_budget - totalCost).toFixed(2),
          ),
          flights_url: this.generateSkyscannerUrl(
            dto.origin_code,
            airport.code,
            dto.date_from,
            dto.date_to,
            dto.adults,
          ),
          hotels_url: this.cj.generateHotelSearchLink(
            airport.city,
            dto.date_from,
            dto.date_to,
            dto.adults,
          ).url,
          is_estimate: !flightIsReal,
          source: flightIsReal ? 'duffel' : 'estimate',
        };
      }),
    );

    const validResults = results
      .filter(Boolean)
      .sort((a, b) => a!.total_estimate - b!.total_estimate);

    const budgetResult = validResults[0];

    const withinBudget = validResults.filter(
      (r) => r!.total_estimate <= dto.max_budget,
    );
    const recommendedResult = withinBudget.length > 0
      ? withinBudget[withinBudget.length - 1]
      : validResults[validResults.length - 1];

    const seen = new Set<string>();
    if (budgetResult) seen.add(budgetResult!.destination_code);
    if (recommendedResult) seen.add(recommendedResult!.destination_code);

    const origin = this.cachedAirports.find((a) => a.code === dto.origin_code);
    const sameRegion = origin ? REGION_PRIORITY[origin.country] ?? [origin.country] : [];

    const intermediateCandidates = validResults
      .filter((r) => !seen.has(r!.destination_code))
      .filter((r) => {
        const mid = (budgetResult!.total_estimate + recommendedResult!.total_estimate) / 2;
        const diff = r!.total_estimate - mid;
        return Math.abs(diff) <= mid * 0.35;
      })
      .sort((a, b) => {
        const aInternational = !sameRegion.includes(a!.country) ? 0 : 1;
        const bInternational = !sameRegion.includes(b!.country) ? 0 : 1;
        if (aInternational !== bInternational) return aInternational - bInternational;
        return Math.abs(a!.total_estimate - (budgetResult!.total_estimate + recommendedResult!.total_estimate) / 2)
          - Math.abs(b!.total_estimate - (budgetResult!.total_estimate + recommendedResult!.total_estimate) / 2);
      });

    const intermediateResult = intermediateCandidates[0] ?? validResults.find(
      (r) => !seen.has(r!.destination_code),
    );
    if (intermediateResult) seen.add(intermediateResult!.destination_code);

    const tagMap = new Map<string, string>();
    if (recommendedResult) tagMap.set(recommendedResult!.destination_code, 'recommended');
    if (budgetResult) tagMap.set(budgetResult!.destination_code, 'budget');
    if (intermediateResult) tagMap.set(intermediateResult!.destination_code, 'intermediate');

    const finalResults = [recommendedResult, budgetResult, intermediateResult]
      .filter(Boolean)
      .map((r) => ({
        ...r!,
        tag: tagMap.get(r!.destination_code) ?? 'intermediate',
      }));

    const note = 'Precios reales de vuelos. Los enlaces te llevan a Skyscanner y Booking para reservar directamente.';

    return {
      origin: { code: dto.origin_code, city: dto.origin_city },
      search_params: { ...dto, nights: finalResults[0]?.nights ?? 0 },
      budget_breakdown: {
        max_for_flights: dto.max_budget * this.MAX_FLIGHT_BUDGET_PCT,
        max_for_hotel_per_night: dto.max_budget * this.MAX_HOTEL_BUDGET_PCT,
      },
      destinations: finalResults,
      note,
      api_status: {
        duffel_connected: this.duffel.isConfigured(),
        cj_connected: this.cj.isConfigured(),
        data_source: finalResults.length > 0 && finalResults[0]!.source === 'duffel' ? 'duffel' : 'estimate',
      },
    };
  }
}

@Controller()
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get('airports/search')
  async search(@Query('query') query: string) {
    return this.trips.searchAirports(query ?? '');
  }

  @Get('airports')
  all() {
    return this.trips.allAirports();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('travel/search')
  async searchTravel(
    @Body() body: TravelSearchDto,
    @Req() req: { user?: { sub: string } },
  ) {
    if (!req.user?.sub)
      throw new UnauthorizedException('Usuario no autenticado');
    return this.trips.travelSearch(body);
  }
}

@Module({
  imports: [DuffelModule, CJModule],
  providers: [TripsService],
  controllers: [TripsController],
  exports: [TripsService],
})
export class TripsModule {}
