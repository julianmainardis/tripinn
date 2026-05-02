export interface DuffelOfferSlice {
  origin_type: string;
  origin: {
    type: string;
    id: string;
    time_zone: string;
    name: string;
    iata_code: string;
    icao_code: string;
    city: {
      type: string;
      name: string;
      iata_code: string;
      iata_country_code: string;
    };
    city_name?: string;
    country_name?: string;
  };
  destination: {
    type: string;
    id: string;
    time_zone: string;
    name: string;
    iata_code: string;
    icao_code: string;
    city: {
      type: string;
      name: string;
      iata_code: string;
      iata_country_code: string;
    };
    city_name?: string;
    country_name?: string;
  };
  origin_location_type?: string;
  destination_location_type?: string;
  departure_date: string;
}

export interface DuffelOfferSegment {
  origin: {
    flight_place_type: string;
    airport?: string;
    time_zone: string;
    name: string;
    iata_code: string;
    city: string;
    city_name?: string;
    country_name?: string;
  };
  destination: {
    flight_place_type: string;
    airport?: string;
    time_zone: string;
    name: string;
    iata_code: string;
    city: string;
    city_name?: string;
    country_name?: string;
  };
  departure: string;
  arrival: string;
  duration: {
    datetime: string;
    nanoseconds: number;
  };
  distance: {
    value: number;
    unit: string;
  };
  aircraft: {
    name: string;
    code: string;
  };
  airline: {
    name: string;
    code: string;
    logo_symbol_url: string;
  };
  operating_airline: {
    name: string;
    code: string;
  };
  marketing_carrier_flight_number: string;
  passengers: Array<{
    passenger_id: string;
    fare_brand_name: string;
    baggages: Array<{
      type: string;
      quantity: number;
    }>;
    cabin_class_marketing_name: string;
    fares: Array<{
      cabin_class: string;
      fare_basis_code: string;
    }>;
  }>;
}

export interface DuffelOffer {
  id: string;
  updated_at: string;
  live_mode: boolean;
  owner: {
    name: string;
    id: string;
    iata_code: string;
    logo_symbol_url: string;
  };
  slices: Array<{
    duration: string;
    segments: DuffelOfferSegment[];
    origin: {
      flight_place_type: string;
      iata_code: string;
      type: string;
      city: string;
    };
    destination: {
      flight_place_type: string;
      iata_code: string;
      type: string;
      city: string;
    };
    ngs_shield?: boolean;
  }>;
  passenger_identity_documents_required: boolean;
  passenger_feo_savings: boolean;
  payment_requirements: {
    price: string;
    requires_instant_payment: boolean;
    price_guarantee_expires_at: string;
  };
  private_fare: boolean;
  passenger_identity_documents_required_by_owner: boolean;
  supports_interlining: boolean;
  tax_currency: string;
  tax_amount: string;
  partial: boolean;
  total_currency: string;
  total_amount: string;
  base_currency: string;
  base_amount: string;
  conditions: {
    refund_before_departure: {
      penalty_currency: string;
      penalty_amount: string;
      allowed: boolean;
    };
    change_before_departure: {
      penalty_currency: string;
      penalty_amount: string;
      allowed: boolean;
    };
  };
  available_services: Array<{
    id: string;
    total_amount: string;
    total_currency: string;
  }>;
}

export interface DuffelOfferRequest {
  id: string;
  live_mode: boolean;
  slices: DuffelOfferSlice[];
  passengers: Array<{
    type: string;
    id?: string;
    age?: number;
    given_name?: string;
    family_name?: string;
  }>;
  cabin_class: string;
  offers: DuffelOffer[];
}

export interface DuffelPlace {
  id: string;
  type: 'city' | 'airport';
  name: string;
  iata_code: string;
  iata_country_code: string;
  city_name: string | null;
  iata_city_code: string | null;
  airports?: DuffelAirport[] | null;
}

export interface DuffelAirport {
  id: string;
  type: string;
  name: string;
  iata_code: string;
  icao_code: string | null;
  iata_country_code: string;
  iata_city_code: string;
  city_name: string;
  time_zone: string;
  latitude: number;
  longitude: number;
}

export interface DuffelSearchParams {
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  adults: number;
  currency: string;
}

export interface DuffelAirportResponse {
  id: string;
  time_zone: string;
  name: string;
  longitude: number;
  latitude: number;
  icao_code: string | null;
  iata_country_code: string;
  iata_code: string;
  iata_city_code: string;
  city_name: string;
}

export interface DuffelAirportListResponse {
  data: DuffelAirportResponse[];
  meta: {
    limit: number;
    after?: string;
    before?: string;
  };
}
