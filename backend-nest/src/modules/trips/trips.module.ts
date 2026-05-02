import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
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

const AIRPORTS: Airport[] = [
  {
    code: 'MAD',
    city: 'Madrid',
    country: 'España',
    name: 'Adolfo Suárez Madrid-Barajas',
  },
  { code: 'BCN', city: 'Barcelona', country: 'España', name: 'El Prat' },
  { code: 'AGP', city: 'Málaga', country: 'España', name: 'Costa del Sol' },
  {
    code: 'PMI',
    city: 'Palma de Mallorca',
    country: 'España',
    name: 'Son Sant Joan',
  },
  { code: 'ALC', city: 'Alicante', country: 'España', name: 'Alicante-Elche' },
  { code: 'VLC', city: 'Valencia', country: 'España', name: 'Valencia' },
  { code: 'SVQ', city: 'Sevilla', country: 'España', name: 'San Pablo' },
  { code: 'BIO', city: 'Bilbao', country: 'España', name: 'Bilbao' },
  {
    code: 'TFS',
    city: 'Tenerife Sur',
    country: 'España',
    name: 'Tenerife Sur',
  },
  {
    code: 'LPA',
    city: 'Gran Canaria',
    country: 'España',
    name: 'Gran Canaria',
  },
  {
    code: 'LIS',
    city: 'Lisboa',
    country: 'Portugal',
    name: 'Humberto Delgado',
  },
  {
    code: 'OPO',
    city: 'Oporto',
    country: 'Portugal',
    name: 'Francisco Sá Carneiro',
  },
  { code: 'FCO', city: 'Roma', country: 'Italia', name: 'Fiumicino' },
  { code: 'MXP', city: 'Milán', country: 'Italia', name: 'Malpensa' },
  { code: 'VCE', city: 'Venecia', country: 'Italia', name: 'Marco Polo' },
  { code: 'NAP', city: 'Nápoles', country: 'Italia', name: 'Capodichino' },
  { code: 'CDG', city: 'París', country: 'Francia', name: 'Charles de Gaulle' },
  { code: 'ORY', city: 'París Orly', country: 'Francia', name: 'Orly' },
  { code: 'NCE', city: 'Niza', country: 'Francia', name: 'Costa Azul' },
  { code: 'MRS', city: 'Marsella', country: 'Francia', name: 'Provence' },
  { code: 'AMS', city: 'Ámsterdam', country: 'Países Bajos', name: 'Schiphol' },
  { code: 'BRU', city: 'Bruselas', country: 'Bélgica', name: 'Zaventem' },
  { code: 'FRA', city: 'Frankfurt', country: 'Alemania', name: 'Frankfurt' },
  {
    code: 'MUC',
    city: 'Múnich',
    country: 'Alemania',
    name: 'Franz Josef Strauss',
  },
  { code: 'BER', city: 'Berlín', country: 'Alemania', name: 'Brandenburg' },
  { code: 'LHR', city: 'Londres', country: 'Reino Unido', name: 'Heathrow' },
  {
    code: 'LGW',
    city: 'Londres Gatwick',
    country: 'Reino Unido',
    name: 'Gatwick',
  },
  {
    code: 'STN',
    city: 'Londres Stansted',
    country: 'Reino Unido',
    name: 'Stansted',
  },
  { code: 'DUB', city: 'Dublín', country: 'Irlanda', name: 'Dublin' },
  {
    code: 'PRG',
    city: 'Praga',
    country: 'República Checa',
    name: 'Václav Havel',
  },
  { code: 'BUD', city: 'Budapest', country: 'Hungría', name: 'Ferenc Liszt' },
  { code: 'VIE', city: 'Viena', country: 'Austria', name: 'Schwechat' },
  { code: 'WAW', city: 'Varsovia', country: 'Polonia', name: 'Chopin' },
  { code: 'KRK', city: 'Cracovia', country: 'Polonia', name: 'Juan Pablo II' },
  {
    code: 'ATH',
    city: 'Atenas',
    country: 'Grecia',
    name: 'Eleftherios Venizelos',
  },
  { code: 'SKG', city: 'Salónica', country: 'Grecia', name: 'Makedonia' },
  { code: 'IST', city: 'Estambul', country: 'Turquía', name: 'Istanbul' },
  { code: 'RAK', city: 'Marrakech', country: 'Marruecos', name: 'Menara' },
  { code: 'CMN', city: 'Casablanca', country: 'Marruecos', name: 'Mohammed V' },
  { code: 'DBV', city: 'Dubrovnik', country: 'Croacia', name: 'Dubrovnik' },
  { code: 'SPU', city: 'Split', country: 'Croacia', name: 'Split' },
  { code: 'ZAG', city: 'Zagreb', country: 'Croacia', name: 'Franjo Tuđman' },
  { code: 'CPH', city: 'Copenhague', country: 'Dinamarca', name: 'Kastrup' },
  { code: 'ARN', city: 'Estocolmo', country: 'Suecia', name: 'Arlanda' },
  { code: 'OSL', city: 'Oslo', country: 'Noruega', name: 'Gardermoen' },
  { code: 'HEL', city: 'Helsinki', country: 'Finlandia', name: 'Vantaa' },
  { code: 'GVA', city: 'Ginebra', country: 'Suiza', name: 'Geneva' },
  { code: 'ZRH', city: 'Zúrich', country: 'Suiza', name: 'Kloten' },
  { code: 'TLV', city: 'Tel Aviv', country: 'Israel', name: 'Ben Gurion' },
  {
    code: 'JFK',
    city: 'Nueva York',
    country: 'Estados Unidos',
    name: 'John F. Kennedy',
  },
  {
    code: 'MIA',
    city: 'Miami',
    country: 'Estados Unidos',
    name: 'Miami International',
  },
  {
    code: 'MEX',
    city: 'Ciudad de México',
    country: 'México',
    name: 'Benito Juárez',
  },
  {
    code: 'CUN',
    city: 'Cancún',
    country: 'México',
    name: 'Cancún International',
  },
  { code: 'BOG', city: 'Bogotá', country: 'Colombia', name: 'El Dorado' },
  { code: 'EZE', city: 'Buenos Aires', country: 'Argentina', name: 'Ezeiza' },
  { code: 'GRU', city: 'São Paulo', country: 'Brasil', name: 'Guarulhos' },
];

const REGION_PRIORITY: Record<string, string[]> = {
  'España': ['España', 'Portugal'],
  'Portugal': ['Portugal', 'España'],
};

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
export class TripsService {
  private readonly MAX_FLIGHT_BUDGET_PCT = 0.3;
  private readonly MAX_HOTEL_BUDGET_PCT = 0.1;
  private readonly MAX_DESTINATIONS = 8;

  constructor(
    private readonly duffel: DuffelService,
    private readonly cj: CJService,
  ) {}

  searchAirportsLocal(query: string): Airport[] {
    const q = query.toLowerCase();
    return AIRPORTS.filter(
      (a) =>
        a.city.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q),
    ).slice(0, 10);
  }

  allAirports(): Airport[] {
    return AIRPORTS;
  }

  private getRelevantDestinations(originCode: string): Airport[] {
    const origin = AIRPORTS.find((a) => a.code === originCode);
    if (!origin) return AIRPORTS.slice(0, this.MAX_DESTINATIONS);

    const priorities = REGION_PRIORITY[origin.country] ?? [origin.country];
    const sorted = [...AIRPORTS].sort((a, b) => {
      const aIdx = priorities.indexOf(a.country);
      const bIdx = priorities.indexOf(b.country);
      if (aIdx !== bIdx) return aIdx - bIdx;
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
      ? AIRPORTS.filter((a) => a.code === dto.destination_code)
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
      ? `Precios reales de vuelos obtenidos de Duffel (${duffelCount}/${validResults.length} destinos). Hoteles con tarifas estimadas. Los enlaces a Skyscanner y Booking son para reservar directamente.`
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
  search(@Query('query') query: string) {
    return this.trips.searchAirportsLocal(query ?? '');
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
