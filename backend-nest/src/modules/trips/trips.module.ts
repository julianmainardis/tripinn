import { Body, Controller, Get, Injectable, Module, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsInt, IsNumber, IsString, Min } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';

type Airport = { code: string; city: string; country: string; name: string };
const AIRPORTS: Airport[] = [
  { code: 'MAD', city: 'Madrid', country: 'España', name: 'Adolfo Suárez Madrid-Barajas' },
  { code: 'BCN', city: 'Barcelona', country: 'España', name: 'El Prat' },
  { code: 'LIS', city: 'Lisboa', country: 'Portugal', name: 'Humberto Delgado' },
  { code: 'OPO', city: 'Oporto', country: 'Portugal', name: 'Francisco Sá Carneiro' },
  { code: 'FCO', city: 'Roma', country: 'Italia', name: 'Fiumicino' },
  { code: 'CDG', city: 'París', country: 'Francia', name: 'Charles de Gaulle' },
  { code: 'AMS', city: 'Ámsterdam', country: 'Países Bajos', name: 'Schiphol' },
  { code: 'PRG', city: 'Praga', country: 'República Checa', name: 'Václav Havel' },
  { code: 'BUD', city: 'Budapest', country: 'Hungría', name: 'Ferenc Liszt' },
  { code: 'ATH', city: 'Atenas', country: 'Grecia', name: 'Eleftherios Venizelos' },
  { code: 'DBV', city: 'Dubrovnik', country: 'Croacia', name: 'Dubrovnik' },
  { code: 'VIE', city: 'Viena', country: 'Austria', name: 'Schwechat' },
];

const DESTINATION_ESTIMATES: Record<string, { flight: number; hotel: number; image: string }> = {
  LIS: { flight: 80, hotel: 65, image: 'https://images.unsplash.com/photo-1580323956656-26bbb7e19b1e' },
  OPO: { flight: 70, hotel: 55, image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b' },
  FCO: { flight: 90, hotel: 80, image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5' },
  CDG: { flight: 85, hotel: 95, image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34' },
  AMS: { flight: 75, hotel: 90, image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017' },
  PRG: { flight: 65, hotel: 50, image: 'https://images.unsplash.com/photo-1541849546-216549ae216d' },
  BUD: { flight: 60, hotel: 45, image: 'https://images.unsplash.com/photo-1541343672885-9be56236302a' },
  ATH: { flight: 95, hotel: 60, image: 'https://images.unsplash.com/photo-1555993539-1732b0258235' },
  DBV: { flight: 110, hotel: 70, image: 'https://images.unsplash.com/photo-1555990538-16d7db2b3ef7' },
  VIE: { flight: 80, hotel: 75, image: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af' },
};

class TravelSearchDto {
  @IsString() origin_code!: string;
  @IsString() origin_city!: string;
  @IsNumber() @Min(1) max_budget!: number;
  @IsString() date_from!: string;
  @IsString() date_to!: string;
  @IsInt() @Min(1) adults = 2;
}

@Injectable()
class TripsService {
  searchAirports(query: string): Airport[] {
    const q = query.toLowerCase();
    return AIRPORTS.filter((a) => a.city.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.country.toLowerCase().includes(q)).slice(0, 10);
  }
  allAirports(): Airport[] { return AIRPORTS; }
  travelSearch(dto: TravelSearchDto) {
    const maxFlightBudget = dto.max_budget * 0.5;
    const maxHotelBudget = dto.max_budget * 0.1;
    const from = new Date(dto.date_from);
    const to = new Date(dto.date_to);
    const nights = Math.max(2, Math.ceil((to.getTime() - from.getTime()) / 86400000));
    const destinations = Object.entries(DESTINATION_ESTIMATES)
      .filter(([code]) => code !== dto.origin_code)
      .map(([code, info]) => {
        const airport = AIRPORTS.find((a) => a.code === code);
        if (!airport) return null;
        const flightCost = info.flight * 2 * dto.adults;
        const hotelCost = info.hotel * nights;
        const totalCost = flightCost + hotelCost;
        if (flightCost > maxFlightBudget || info.hotel > maxHotelBudget) return null;
        return {
          destination_code: code,
          destination: airport.city,
          country: airport.country,
          image: info.image,
          flight_estimate: flightCost,
          hotel_estimate_per_night: info.hotel,
          hotel_estimate_total: hotelCost,
          total_estimate: totalCost,
          nights,
          adults: dto.adults,
          within_budget: totalCost <= dto.max_budget,
          savings_estimate: Math.max(0, dto.max_budget - totalCost),
          flights_url: `https://www.skyscanner.es/transporte/vuelos/${dto.origin_code.toLowerCase()}/${code.toLowerCase()}/`,
          hotels_url: `https://www.booking.com/searchresults.es.html?ss=${encodeURIComponent(airport.city)}`,
          is_estimate: true,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a?.total_estimate ?? 0) - (b?.total_estimate ?? 0));
    return {
      origin: { code: dto.origin_code, city: dto.origin_city },
      search_params: { ...dto, nights },
      budget_breakdown: {
        max_for_flights: maxFlightBudget,
        max_for_hotel_per_night: maxHotelBudget,
      },
      destinations: destinations.slice(0, 8),
      note: 'Precios estimados. Haz clic en los enlaces para ver precios actuales en Skyscanner y Booking.',
      api_status: { skyscanner_connected: false, booking_connected: false },
    };
  }
}

@Controller()
class TripsController {
  constructor(private readonly trips: TripsService) {}
  @Get('airports/search')
  search(@Query('query') query: string) {
    return this.trips.searchAirports(query ?? '');
  }
  @Get('airports')
  all() { return this.trips.allAirports(); }
  @UseGuards(AuthGuard('jwt'))
  @Post('travel/search')
  searchTravel(@Body() body: TravelSearchDto, @Req() req: { user?: { sub: string } }) {
    if (!req.user?.sub) throw new UnauthorizedException('Usuario no autenticado');
    return this.trips.travelSearch(body);
  }
}

@Module({
  providers: [TripsService],
  controllers: [TripsController],
})
export class TripsModule {}
