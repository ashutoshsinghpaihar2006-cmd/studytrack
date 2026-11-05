import { createContext, useContext, useEffect, useMemo, useState, useCallback, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseClient, type RuntimeSupabaseConfig } from "../lib/supabase";
import type { Profile, UserRole } from "../lib/database.types";

const ConnectionContext = createContext<{
  loading: boolean;
  config: RuntimeSupabaseConfig | null;
  client: SupabaseClient | null;
  error: string | null;
}>({ loading: true, config: null, client: null, error: null });

const AuthContext = createContext<{
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole;
  isApproved: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  logActivity: (action: string, entityType: string, entityId?: string, details?: string) => Promise<void>;
}>({
  user: null,
  session: null,
  profile: null,
  role: "student",
  isApproved: true,
  loading: true,
  signOut: async () => undefined,
  refreshProfile: async () => null,
  logActivity: async () => undefined,
});

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!client) return null;
    try {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not query profiles table:", error.message);
        return null;
      }
      return (data as Profile) ?? null;
    } catch {
      return null;
    }
  }, [client]);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!session?.user?.id) return null;
    const p = await fetchProfile(session.user.id);
    if (p) setProfile(p);
    return p;
  }, [fetchProfile, session?.user?.id]);

  useEffect(() => {
    if (!client) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    const supabase = client;
    setLoading(true);
    let active = true;

    async function initSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        if (data.session?.user?.id) {
          const prof = await fetchProfile(data.session.user.id);
          if (active) setProfile(prof);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user?.id) {
        const prof = await fetchProfile(nextSession.user.id);
        if (active) setProfile(prof);
      } else {
        if (active) setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client, fetchProfile]);

  const role: UserRole = useMemo(() => {
    if (profile?.role) return profile.role;
    // Fallback to metadata if profiles table query fails or is not yet migrated
    const metaRole = session?.user?.user_metadata?.role as UserRole | undefined;
    if (metaRole === "admin" || metaRole === "professor" || metaRole === "student") {
      return metaRole;
    }
    return "student";
  }, [profile, session?.user]);

  const isApproved = useMemo(() => {
    if (profile) return profile.approved;
    // By default students are approved; professors require approval
    return role !== "professor";
  }, [profile, role]);

  const logActivity = useCallback(async (action: string, entityType: string, entityId?: string, details?: string) => {
    if (!client || !session?.user) return;
    try {
      await client.from("activity_logs").insert({
        user_id: session.user.id,
        user_name: profile?.full_name ?? session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "User",
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        details: details ?? null,
      });
    } catch (err) {
      console.warn("Could not write activity log:", err);
    }
  }, [client, profile?.full_name, session?.user]);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    profile,
    role,
    isApproved,
    loading,
    signOut: async () => {
      if (client) await client.auth.signOut();
      setProfile(null);
      setSession(null);
    },
    refreshProfile,
    logActivity,
  }), [client, isApproved, loading, logActivity, profile, refreshProfile, role, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 },
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
