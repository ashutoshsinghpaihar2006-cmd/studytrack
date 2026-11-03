import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseClient, type RuntimeSupabaseConfig } from "../lib/supabase";

const ConnectionContext = createContext<{
  loading: boolean;
  config: RuntimeSupabaseConfig | null;
  client: SupabaseClient | null;
  error: string | null;
}>({ loading: true, config: null, client: null, error: null });

const AuthContext = createContext<{
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}>({ user: null, session: null, loading: true, signOut: async () => undefined });

export function useRuntimeConnection() {
  return useContext(ConnectionContext);
}

export function useAuth() {
  const auth = useContext(AuthContext);
  const connection = useRuntimeConnection();
  return { ...auth, client: connection.client };
}

function RuntimeConnectionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<{
    loading: boolean;
    config: RuntimeSupabaseConfig | null;
    client: SupabaseClient | null;
    error: string | null;
  }>({ loading: true, config: null, client: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-config", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("StudyTrack could not load its runtime configuration.");
        return (await response.json()) as RuntimeSupabaseConfig;
      })
      .then((config) => {
        if (!cancelled) setState({ loading: false, config, client: createSupabaseClient(config), error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            loading: false,
            config: null,
            client: null,
            error: error instanceof Error ? error.message : "Unable to load runtime configuration.",
          });
        }
      });
    return () => { cancelled = true; };
  }, []);

  return <ConnectionContext.Provider value={state}>{children}</ConnectionContext.Provider>;
}

function SessionProvider({ children }: PropsWithChildren) {
  const { client } = useRuntimeConnection();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) {
      setSession(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    void client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    signOut: async () => { if (client) await client.auth.signOut(); },
  }), [client, loading, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 20_000, refetchOnWindowFocus: true, retry: 1 },
      mutations: { retry: 0 },
    },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <RuntimeConnectionProvider>
        <SessionProvider>{children}</SessionProvider>
      </RuntimeConnectionProvider>
    </QueryClientProvider>
  );
}
