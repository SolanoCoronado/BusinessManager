import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  apiClient,
  type AuthUser,
  type CompanyProfileDto,
  type LoginInput,
  type OnboardingInput,
} from "../../shared/lib/apiClient";

type AuthStatus = "loading" | "needs-onboarding" | "needs-login" | "authenticated";

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  company: CompanyProfileDto | null;
  accessToken: string | null;
};

type AuthContextValue = AuthState & {
  onboard: (input: OnboardingInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadCompany(token: string) {
  const { company } = await apiClient.getCurrentCompany(token);
  return company;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    company: null,
    accessToken: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const { exists } = await apiClient.checkCompanyExists();
      if (!exists) {
        if (!cancelled) setState((s) => ({ ...s, status: "needs-onboarding" }));
        return;
      }

      try {
        const { accessToken } = await apiClient.refresh();
        const [{ user }, company] = await Promise.all([
          apiClient.me(accessToken),
          loadCompany(accessToken),
        ]);

        if (!cancelled) {
          setState({ status: "authenticated", user, company, accessToken });
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, status: "needs-login" }));
      }
    }

    bootstrap().catch(() => {
      if (!cancelled) setState((s) => ({ ...s, status: "needs-login" }));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const onboard = useCallback(async (input: OnboardingInput) => {
    const result = await apiClient.onboard(input);
    const company = await loadCompany(result.accessToken);
    setState({
      status: "authenticated",
      user: result.user,
      company,
      accessToken: result.accessToken,
    });
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const result = await apiClient.login(input);
    const company = await loadCompany(result.accessToken);
    setState({
      status: "authenticated",
      user: result.user,
      company,
      accessToken: result.accessToken,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } finally {
      setState({ status: "needs-login", user: null, company: null, accessToken: null });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, onboard, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }
  return ctx;
}
