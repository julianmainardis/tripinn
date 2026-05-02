import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  DuffelSearchParams,
  DuffelOffer,
  DuffelOfferRequest,
  DuffelPlace,
  DuffelAirportResponse,
} from './duffel.types';

interface DuffelOfferRequestResponse {
  data: DuffelOfferRequest;
  meta: {
    request_id: string;
    idempotency_key: string;
  };
}

interface DuffelErrorResponse {
  errors: Array<{
    code: string;
    title: string;
    message: string;
    documentation_url: string;
    type: string;
  }>;
}

@Injectable()
export class DuffelService implements OnModuleInit {
  private readonly logger = new Logger(DuffelService.name);
  private accessToken: string;
  private baseUrl: string;
  private isConfig = false;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.accessToken = this.configService.get<string>('DUFFEL_ACCESS_TOKEN', '');
    this.baseUrl = this.configService.get<string>(
      'DUFFEL_BASE_URL',
      'https://api.duffel.com',
    );
    this.isConfig = this.accessToken.length > 0;
  }

  async onModuleInit() {
    if (this.isConfig) {
      this.logger.log('Duffel API configured successfully');
    } else {
      this.logger.warn('Duffel API not configured - flight prices will be estimated');
    }
  }

  isConfigured(): boolean {
    return this.isConfig;
  }

  async searchPlaces(query: string): Promise<DuffelPlace[]> {
    if (!this.isConfig || query.length < 2) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/places/suggestions?query=${encodeURIComponent(query)}`;

      const response = await firstValueFrom(
        this.http.get<{ data: DuffelPlace[] }>(url, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: 'application/json',
            'Duffel-Version': 'v2',
          },
          timeout: 10000,
        }),
      );

      return response.data.data.slice(0, 10);
    } catch (error: any) {
      this.logger.warn(`Failed to search Duffel places: ${error.message}`);
      return [];
    }
  }

  async listAirportsByCountry(countryCode: string): Promise<DuffelAirportResponse[]> {
    if (!this.isConfig) {
      return [];
    }

    const allAirports: DuffelAirportResponse[] = [];
    let after: string | undefined;

    try {
      do {
        const params = new URLSearchParams({
          limit: '200',
          iata_country_code: countryCode,
        });
        if (after) {
          params.set('after', after);
        }

        const url = `${this.baseUrl}/air/airports?${params.toString()}`;

        const response = await firstValueFrom(
          this.http.get<{ data: DuffelAirportResponse[]; meta: { after?: string } }>(url, {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              Accept: 'application/json',
              'Duffel-Version': 'v2',
            },
            timeout: 15000,
          }),
        );

        allAirports.push(...response.data.data);
        after = response.data.meta.after;
      } while (after);

      return allAirports;
    } catch (error: any) {
      this.logger.warn(`Failed to list airports for ${countryCode}: ${error.message}`);
      return [];
    }
  }

  async createBookingLink(
    origin: string,
    destination: string,
    dateFrom: string,
    dateTo: string,
    adults: number,
  ): Promise<string | null> {
    if (!this.isConfig) {
      return null;
    }

    try {
      const requestBody = {
        data: {
          reference: `tripinn-${Date.now()}-${origin}-${destination}`,
          success_url: 'https://gettripinn.com',
          failure_url: 'https://gettripinn.com',
          abandonment_url: 'https://gettripinn.com',
          logo_url: '',
          primary_color: '#0066FF',
          flights: {
            enabled: true,
          },
          stays: {
            enabled: false,
          },
        },
      };

      const url = `${this.baseUrl}/links/sessions`;

      const response = await firstValueFrom(
        this.http.post<{ data: { url: string } }>(url, requestBody, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Duffel-Version': 'v2',
          },
          timeout: 10000,
        }),
      );

      return response.data.data.url;
    } catch (error: any) {
      const status = error.response?.status;
      this.logger.warn(
        `Failed to create Duffel booking link for ${origin}-${destination} (status: ${status}): ${error.message}`,
      );
      return null;
    }
  }

  async searchFlights(
    params: DuffelSearchParams,
  ): Promise<{ pricePerAdult: number; offers: DuffelOffer[] } | null> {
    if (!this.isConfig) {
      return null;
    }

    try {
      const requestBody = {
        data: {
          slices: [
            {
              origin: params.origin,
              destination: params.destination,
              departure_date: params.dateFrom,
            },
            {
              origin: params.destination,
              destination: params.origin,
              departure_date: params.dateTo,
            },
          ],
          passengers: Array.from({ length: params.adults }, () => ({
            type: 'adult' as const,
          })),
          cabin_class: 'economy' as const,
        },
      };

      const url = `${this.baseUrl}/air/offer_requests?return_offers=true`;

      const response = await firstValueFrom(
        this.http.post<DuffelOfferRequestResponse>(url, requestBody, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Duffel-Version': 'v2',
          },
          timeout: 20000,
        }),
      );

      const offerRequest = response.data.data;
      const offers = offerRequest.offers || [];

      if (offers.length === 0) {
        this.logger.log(
          `No Duffel offers found for ${params.origin}-${params.destination}`,
        );
        return null;
      }

      const cheapestOffer = offers.reduce((min, offer) => {
        const price = parseFloat(offer.total_amount);
        return price < min ? price : min;
      }, Infinity);

      const pricePerAdult = parseFloat(
        (cheapestOffer / params.adults).toFixed(2),
      );

      this.logger.log(
        `Duffel: ${params.origin}-${params.destination} = €${pricePerAdult}/adult (total €${cheapestOffer})`,
      );

      return { pricePerAdult, offers: offers.slice(0, 3) };
    } catch (error: any) {
      const status = error.response?.status;
      const errors = error.response?.data?.errors as DuffelErrorResponse['errors'];

      if (errors?.length > 0) {
        this.logger.warn(
          `Duffel error for ${params.origin}-${params.destination}: ${errors[0].title} - ${errors[0].message}`,
        );
      } else {
        this.logger.warn(
          `Duffel request failed for ${params.origin}-${params.destination} (status: ${status}): ${error.message}`,
        );
      }

      return null;
    }
  }
}
