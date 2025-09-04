export interface AuthRequest {
    passkey: string;
}

export interface AuthResponse {
    id?: string;
    name: string;
    role: string;
}

export interface LogoutRequest {
    name: string;
}