import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CJAffiliateLink } from './cj.types';

@Injectable()
export class CJService {
  private readonly logger = new Logger(CJService.name);
  private publisherId: number;
  private cjBaseUrl = 'https://www.anrdoezrs.net';

  constructor(private readonly configService: ConfigService) {
    this.publisherId = this.configService.get<number>('CJ_PUBLISHER_ID', 0);
  }

  isConfigured(): boolean {
    return this.publisherId > 0;
  }

  getPublisherId(): number {
    return this.publisherId;
  }

  generateHotelSearchLink(
    city: string,
    checkin: string,
    checkout: string,
    adults: number,
  ): CJAffiliateLink {
    const encoded = encodeURIComponent(city);
    const bookingUrl = `https://www.booking.com/searchresults.es.html?ss=${encoded}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&no_rooms=1&selected_currency=EUR`;

    const affiliateUrl = `${this.cjBaseUrl}/links/${this.publisherId}/type/dlg/${bookingUrl}`;

    this.logger.log(
      `Generated CJ affiliate link for ${city}: ${affiliateUrl.substring(0, 50)}...`,
    );

    return {
      url: affiliateUrl,
      pid: this.publisherId,
      destination: city,
    };
  }

  generateGenericLink(destinationUrl: string): CJAffiliateLink {
    return {
      url: `${this.cjBaseUrl}/links/${this.publisherId}/type/dlg/${destinationUrl}`,
      pid: this.publisherId,
      destination: destinationUrl,
    };
  }
}
