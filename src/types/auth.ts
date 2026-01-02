export interface AuthUser {
  id: number;
  username: string;
  name: string;
  surname: string;
  email?: string | null;
  is_active: boolean;
  is_admin: boolean;
}
