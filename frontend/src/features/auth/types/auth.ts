export interface User {
  id: string;
  email: string;
  name: string;
  nationality: string;
  language: string;
  city?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
