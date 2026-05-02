import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CJAffiliateLink } from './cj.types';
import { firstValueFrom } from 'rxjs';
import { parseString } from 'xml2js';

interface CjLinkSearchResult {
  'cj-api': {
    links: Array<{
      $: { 'total-matched': string; 'records-returned': string; 'page-number': string };
      link?: Array<{
        'link-id': string[];
        'link-name': string[];
        'link-type': string[];
        destination: string[];
        'click-url': string[];
        description: string[];
        advertiser: Array<{
          'advertiser-id': string[];
          'advertiser-name': string[];
        }>;
      }>;
    }>;
  };
}

@Injectable()
export class CJService implements OnModuleInit {
  private readonly logger = new Logger(CJService.name);
  private publisherId: number;
  private cjApiToken: string;
  private websiteId: string;
  private bookingCid: number;
  private bookingLinkId: string | null = null;
  private cjDomains = [
    'www.anrdoezrs.net',
    'www.jdoqocy.net',
    'www.tkqlhce.com',
    'www.ftjcfx.com',
    'www.kqzyfj.com',
  ];

  constructor(private readonly configService: ConfigService, private readonly http: HttpService) {
    this.publisherId = this.configService.get<number>('CJ_PUBLISHER_ID', 0);
    this.cjApiToken = this.configService.get<string>('CJ_API_TOKEN', '');
    this.websiteId = this.configService.get<string>('CJ_WEBSITE_ID', '');
    this.bookingCid = this.configService.get<number>('CJ_BOOKING_CID', 17259345);
  }

  async onModuleInit() {
    if (this.cjApiToken && this.websiteId) {
      await this.fetchBookingLinkId();
    }
  }

  isConfigured(): boolean {
    return this.publisherId > 0;
  }

  getPublisherId(): number {
    return this.publisherId;
  }

  private async fetchBookingLinkId() {
    try {
      const url = `https://link-search.api.cj.com/v2/link-search?website-id=${this.websiteId}&advertiser-ids=${this.bookingCid}&link-type=Text%20Link&records-per-page=1`;

      const response = await firstValueFrom(
        this.http.get(url, {
          headers: {
            Authorization: `Bearer ${this.cjApiToken}`,
            Accept: 'application/xml',
          },
          responseType: 'text',
        }),
      );

      const xmlData = response.data;

      await new Promise<void>((resolve, reject) => {
        parseString(xmlData, (err, result: CjLinkSearchResult) => {
          if (err) {
            this.logger.warn(`XML parse error: ${err.message}`);
            return reject(err);
          }

          const links = result['cj-api']?.links?.[0]?.link;
          if (links && links.length > 0) {
            const link = links[0];
            this.bookingLinkId = link['link-id']?.[0];
            const linkName = link['link-name']?.[0] || 'unknown';
            this.logger.log(
              `Booking.com CJ Link ID found: ${this.bookingLinkId} (${linkName})`,
            );
          } else {
            const totalMatched = result['cj-api']?.links?.[0]?.$?.['total-matched'] || '0';
            this.logger.warn(
              `No text links found for Booking.com (CID: ${this.bookingCid}, total matched: ${totalMatched}). Ensure you are joined to the Booking.com affiliate program in CJ.`,
            );
          }

          resolve();
        });
      });
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message;
      this.logger.warn(`Failed to fetch Booking.com link ID (status: ${status}): ${msg}`);
    }
  }

  private getClickDomain(): string {
    return this.cjDomains[Math.floor(Math.random() * this.cjDomains.length)];
  }

  private generateDirectClickLink(destinationUrl: string): string | null {
    if (this.bookingLinkId) {
      const domain = this.getClickDomain();
      const encoded = encodeURIComponent(destinationUrl);
      return `https://${domain}/click-${this.publisherId}-${this.bookingLinkId}?url=${encoded}`;
    }

    return null;
  }

  generateHotelSearchLink(
    city: string,
    checkin: string,
    checkout: string,
    adults: number,
  ): CJAffiliateLink {
    const encoded = encodeURIComponent(city);
    const bookingUrl = `https://www.booking.com/searchresults.es.html?ss=${encoded}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&no_rooms=1&selected_currency=EUR`;

    let affiliateUrl = this.generateDirectClickLink(bookingUrl) ??
      `https://www.anrdoezrs.net/links/${this.publisherId}/type/dlg/${bookingUrl}`;

    this.logger.log(
      `Generated CJ affiliate link for ${city}: ${affiliateUrl.substring(0, 60)}...`,
    );

    return {
      url: affiliateUrl,
      pid: this.publisherId,
      destination: city,
    };
  }

  generateGenericLink(destinationUrl: string): CJAffiliateLink {
    let affiliateUrl = this.generateDirectClickLink(destinationUrl) ??
      `https://www.anrdoezrs.net/links/${this.publisherId}/type/dlg/${destinationUrl}`;

    return {
      url: affiliateUrl,
      pid: this.publisherId,
      destination: destinationUrl,
    };
  }
}
