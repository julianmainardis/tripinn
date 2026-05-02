import { Module, Injectable, Logger } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface AmadeusToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  acquired_at: number;
}

export interface AmadeusLocation {
  subType: string;
  detailedName: string;
  iataCode: string;
  name: string;
  address: {
    cityName: string;
    cityCode: string;
    countryName: string;
  };
}

export interface FlightOffer {
  id: string;
  source: string;
  itineraries: Array<{
    segments: Array<{
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
    }>;
  }>;
  price: {
    currency: string;
    total: string;
    perAdult?: string;
  };
  travelers: Array<{
    id: string;
    fareOption: string;
    price: { total: string };
  }>;
}

export interface HotelOffer {
  hotelId: string;
  hotel: {
    name: string;
    cityCode: string;
    address: {
      lines: string[];
    };
  };
  offers: Array<{
    id: string;
    checkInDate: string;
    checkOutDate: string;
    guests: { adults: number };
    room: { type: string };
    price: {
      currency: string;
      total: string;
      base: string;
    };
  }>;
}

@Injectable()
export class AmadeusService {
  private readonly logger = new Logger(AmadeusService.name);
  private token: AmadeusToken | null = null;
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('AMADEUS_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>(
      'AMADEUS_CLIENT_SECRET',
      '',
    );
    this.baseUrl = this.configService.get<string>(
      'AMADEUS_BASE_URL',
      'https://test.api.amadeus.com',
    );
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  private isTokenValid(): boolean {
    if (!this.token) return false;
    const now = Date.now() / 1000;
    const safetyMargin = 60;
    return this.token.acquired_at + this.token.expires_in - safetyMargin > now;
  }

  async getToken(): Promise<string> {
    if (this.isTokenValid() && this.token) {
      return this.token.access_token;
    }

    this.logger.log('Requesting new Amadeus access token');
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/security/oauth2/token`,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );

      const data = response.data;
      this.token = {
        access_token: data.access_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        acquired_at: Date.now() / 1000,
      };

      this.logger.log('Amadeus token acquired successfully');
      return this.token.access_token;
    } catch (error: any) {
      this.logger.error(
        'Failed to obtain Amadeus token',
        error?.response?.data || error.message,
      );
      throw new Error('Failed to authenticate with Amadeus API');
    }
  }

  async searchAirports(query: string): Promise<AmadeusLocation[]> {
    const token = await this.getToken();
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v1/reference-data/locations`, {
          params: {
            subType: 'AIRPORT',
            keyword: query,
          },
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.data.data || [];
    } catch (error: any) {
      this.logger.error(
        'Airport search failed',
        error?.response?.data || error.message,
      );
      return [];
    }
  }

  async searchFlights(params: {
    originLocationCode: string;
    destinationLocationCode: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    maxPrice?: number;
    currencyCode?: string;
  }): Promise<FlightOffer[]> {
    const token = await this.getToken();
    try {
      const queryParams: Record<string, string | number> = {
        originLocationCode: params.originLocationCode,
        destinationLocationCode: params.destinationLocationCode,
        departureDate: params.departureDate,
        adults: params.adults,
        currencyCode: params.currencyCode || 'EUR',
      };

      if (params.returnDate) {
        queryParams.returnDate = params.returnDate;
      }

      if (params.maxPrice) {
        queryParams.maxPrice = params.maxPrice;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/shopping/flight-offers`, {
          params: queryParams,
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      const offers = (response.data.data || []) as FlightOffer[];
      return offers.map((offer) => {
        const perAdult = parseFloat(offer.price.total) / params.adults;
        return {
          ...offer,
          price: {
            ...offer.price,
            perAdult: perAdult.toFixed(2),
          },
        };
      });
    } catch (error: any) {
      this.logger.error(
        `Flight search failed for ${params.originLocationCode}-${params.destinationLocationCode}`,
        error?.response?.data || error.message,
      );
      return [];
    }
  }

  async searchHotels(params: {
    cityCode: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    radius?: string;
    maxRate?: number;
  }): Promise<HotelOffer[]> {
    const token = await this.getToken();
    try {
      const queryParams: Record<string, string | number> = {
        cityCode: params.cityCode,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        adults: params.adults,
      };

      if (params.radius) {
        queryParams.radius = params.radius;
      }

      if (params.maxRate) {
        queryParams.maxRate = params.maxRate;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v3/shopping/hotel-offers`, {
          params: queryParams,
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      return response.data.data || [];
    } catch (error: any) {
      this.logger.error(
        `Hotel search failed for ${params.cityCode}`,
        error?.response?.data || error.message,
      );
      return [];
    }
  }

  async getFlightInspiration(params: {
    origin: string;
    maxPrice?: number;
    currencyCode?: string;
  }): Promise<any[]> {
    const token = await this.getToken();
    try {
      const queryParams: Record<string, string | number> = {
        origin: params.origin,
        currencyCode: params.currencyCode || 'EUR',
      };

      if (params.maxPrice) {
        queryParams.maxPrice = params.maxPrice;
      }

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/v1/shopping/flight-destinations`,
          {
            params: queryParams,
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );

      return response.data.data || [];
    } catch (error: any) {
      this.logger.error(
        `Flight inspiration failed for ${params.origin}`,
        error?.response?.data || error.message,
      );
      return [];
    }
  }
}

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [AmadeusService],
  exports: [AmadeusService],
})
export class AmadeusModule {}
