export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
  roles: string[];
}

export interface JwtPayload {
  sub: string;
  email: string | null;
  phone: string | null;
  roles: string[];
}
