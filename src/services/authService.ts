// src/services/authService.ts
import { api, authToken } from "../lib/api";
import type { User } from "../types/database";

type TokenResponse = { access_token: string; token_type: "bearer" };

// ✅ Backend signup response: access_token + generated_username
type SignupResponse = TokenResponse & { generated_username: string };

// ✅ Backend signup request: username yok!
type SignupRequest = {
  name: string;
  surname: string;
  password: string;
  email?: string | null;
};

export async function loginUser(username: string, password: string): Promise<User> {
  const token = await api.post<TokenResponse>("/auth/login", {
    username: username.trim(),
    password,
  });
  authToken.set(token.access_token);

  const me = await fetchMe();
  return me;
}

export async function fetchMe(): Promise<User> {
  return api.get<User>("/auth/me");
}

export function logoutUser() {
  authToken.clear();
}

// ✅ signup: username otomatik üretilecek
export async function signupUser(
  name: string,
  surname: string,
  password: string,
  email?: string
): Promise<{ user: User; generated_username: string }> {
  const payload: SignupRequest = {
    name: name.trim(),
    surname: surname.trim(),
    password,
    ...(email && email.trim() ? { email: email.trim() } : {}),
  };

  const signup = await api.post<SignupResponse>("/auth/signup", payload);
  authToken.set(signup.access_token);

  const me = await fetchMe();
  return { user: me, generated_username: signup.generated_username };
}

// ---- client-side validations ----
export function validatePassword(value: string) {
  const errors: string[] = [];
  if (value.length < 6) errors.push("En az 6 karakter olmalı");
  return { valid: errors.length === 0, errors };
}
