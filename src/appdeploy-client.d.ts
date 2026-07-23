declare module '@appdeploy/client' {
  type ApiResponse = { data: any };

  export type AuthUser = {
    userId: string;
    email?: string;
    name?: string;
    picture?: string;
    scope: string;
  };

  export const auth: {
    isSignedIn(): boolean;
    getUser(): Promise<AuthUser | null>;
    signIn(options?: { scope?: string }): Promise<{ user: AuthUser }>;
    signOut(): Promise<void>;
  };

  export const api: {
    get(path: string): Promise<ApiResponse>;
    post(path: string, body: unknown): Promise<ApiResponse>;
    put(path: string, body: unknown): Promise<ApiResponse>;
  };

  type RealtimeMessage = { payload?: any };
  type RealtimeConnection = {
    connectionId: string | null;
    ready: Promise<void>;
    onMessage(handler: (message: RealtimeMessage) => void): void;
    disconnect(): void;
  };

  export const ws: { connect(): RealtimeConnection };
}
