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
import {
  AmadeusModule,
  AmadeusService,
  AmadeusLocation,
} from '../amadeus/amadeus.module';
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
  constructor(
    private readonly amadeus: AmadeusService,
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

  async searchAirportsAmadeus(query: string): Promise<AmadeusLocation[]> {
    return this.amadeus.searchAirports(query);
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
    const destinations: Airport[] = dto.destination_code
      ? AIRPORTS.filter((a) => a.code === dto.destination_code)
      : AIRPORTS.filter((a) => a.code !== dto.origin_code);

    const results = await Promise.all(
      destinations.map(async (airport) => {
        const flights = await this.amadeus.searchFlights({
          originLocationCode: dto.origin_code,
          destinationLocationCode: airport.code,
          departureDate: dto.date_from,
          returnDate: dto.date_to,
          adults: dto.adults,
          currencyCode: 'EUR',
        });

        if (flights.length === 0) return null;

        const cheapestFlight = flights.reduce((min, f) => {
          const total = parseFloat(f.price.total);
          return total < min ? total : min;
        }, Infinity);

        const hotels = await this.amadeus.searchHotels({
          cityCode: airport.code,
          checkInDate: dto.date_from,
          checkOutDate: dto.date_to,
          adults: dto.adults,
        });

        let hotelPerNight = 0;
        if (hotels.length > 0) {
          const validOffers = hotels
            .flatMap((h) => h.offers)
            .filter((o) => o.price && o.price.total);
          if (validOffers.length > 0) {
            const cheapestHotel = validOffers.reduce((min, o) => {
              const total = parseFloat(o.price.total);
              return total < min ? total : min;
            }, Infinity);
            const from = new Date(dto.date_from);
            const to = new Date(dto.date_to);
            const nights = Math.max(
              1,
              Math.ceil((to.getTime() - from.getTime()) / 86400000),
            );
            hotelPerNight = cheapestHotel / nights;
          }
        }

        const from = new Date(dto.date_from);
        const to = new Date(dto.date_to);
        const nights = Math.max(
          2,
          Math.ceil((to.getTime() - from.getTime()) / 86400000),
        );

        const flightCost = cheapestFlight;
        const hotelTotal = hotelPerNight * nights;
        const totalCost = flightCost + hotelTotal;

        const maxFlightBudget = dto.max_budget * 0.5;
        const maxHotelPerNight = dto.max_budget * 0.1;

        if (
          flightCost > maxFlightBudget ||
          (hotelPerNight > 0 && hotelPerNight > maxHotelPerNight)
        ) {
          return null;
        }

        return {
          destination_code: airport.code,
          destination: airport.city,
          country: airport.country,
          image: `https://source.unsplash.com/800x600/?${encodeURIComponent(airport.city.toLowerCase())},travel`,
          flight_total: parseFloat(cheapestFlight.toFixed(2)),
          flight_per_adult: parseFloat(
            (cheapestFlight / dto.adults).toFixed(2),
          ),
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
          is_estimate: false,
          source: 'amadeus',
        };
      }),
    );

    const validResults = results
      .filter(Boolean)
      .sort((a, b) => a!.total_estimate - b!.total_estimate)
      .slice(0, 8);

    return {
      origin: { code: dto.origin_code, city: dto.origin_city },
      search_params: { ...dto, nights: validResults[0]?.nights ?? 0 },
      budget_breakdown: {
        max_for_flights: dto.max_budget * 0.5,
        max_for_hotel_per_night: dto.max_budget * 0.1,
      },
      destinations: validResults,
      note: 'Precios reales obtenidos de Amadeus API. Los enlaces a Skyscanner y Booking son para referencia.',
      api_status: {
        amadeus_connected: this.amadeus.isConfigured(),
        data_source: 'amadeus',
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
  imports: [AmadeusModule, CJModule],
  providers: [TripsService],
  controllers: [TripsController],
  exports: [TripsService],
})
export class TripsModule {}
