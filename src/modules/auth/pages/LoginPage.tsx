import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "../../../app/providers/AuthProvider";
import { PRODUCT_CONFIG } from "../../../app/config/product";
import { ApiError } from "../../../shared/lib/apiClient";
import { LoginFormSchema, type LoginFormValues } from "../schemas";

export function LoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(LoginFormSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login(values);
    } catch (error) {
      setServerError(
        error instanceof ApiError ? "Correo o contrasena incorrectos." : "No se pudo iniciar sesion.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm rounded-md border border-ink-100 bg-white p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-mint-700 text-white">
            <Banknote aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="text-base font-semibold">{PRODUCT_CONFIG.name}</p>
            <p className="text-xs text-ink-700">Iniciar sesion</p>
          </div>
        </div>

        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div>
            <label className="text-sm font-medium text-ink-800" htmlFor="email">
              Correo
            </label>
            <input
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              id="email"
              type="email"
              {...register("email")}
            />
            {errors.email ? <p className="mt-1 text-xs text-amberline">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className="text-sm font-medium text-ink-800" htmlFor="password">
              Contrasena
            </label>
            <input
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              id="password"
              type="password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-amberline">{errors.password.message}</p>
            ) : null}
          </div>

          {serverError ? <p className="text-sm text-amberline">{serverError}</p> : null}

          <button
            className="mt-2 rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
