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
    if (!origin) return this.cachedAirports.slice(0, this.MAX_DESTINATIONS);

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

    return sorted
      .filter((a) => a.code !== originCode)
      .slice(0, this.MAX_DESTINATIONS);
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

          hotelPerNight = Math.round(maxHotelPerNight * 0.5);
        } else {
          const seed =
            (airport.code.charCodeAt(0) * 31 + airport.code.charCodeAt(1) * 17 + dto.origin_code.charCodeAt(0) * 13) %
            100;
          flightCost = Math.round(maxFlightBudget * 0.4 + (seed / 100) * maxFlightBudget * 0.6);
          hotelPerNight = Math.round(maxHotelPerNight * 0.4 + (seed / 100) * maxHotelPerNight * 0.6);
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
      .sort((a, b) => a!.total_estimate - b!.total_estimate)
      .slice(0, 8);

    const duffelCount = validResults.filter((r) => r!.source === 'duffel').length;
    const note = duffelCount > 0
      ? `Precios reales de vuelos para ${duffelCount}/${validResults.length} destinos. Hoteles con tarifas estimadas. Los enlaces a Skyscanner y Booking son para reservar directamente.`
      : 'Precios estimados. Haz clic en los enlaces para ver precios actuales en Skyscanner y Booking.';

    return {
      origin: { code: dto.origin_code, city: dto.origin_city },
      search_params: { ...dto, nights: validResults[0]?.nights ?? 0 },
      budget_breakdown: {
        max_for_flights: dto.max_budget * this.MAX_FLIGHT_BUDGET_PCT,
        max_for_hotel_per_night: dto.max_budget * this.MAX_HOTEL_BUDGET_PCT,
      },
      destinations: validResults,
      note,
      api_status: {
        duffel_connected: this.duffel.isConfigured(),
        cj_connected: this.cj.isConfigured(),
        data_source: duffelCount > 0 ? 'duffel' : 'estimate',
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
