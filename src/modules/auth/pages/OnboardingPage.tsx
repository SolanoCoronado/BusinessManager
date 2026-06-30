import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "../../../app/providers/AuthProvider";
import { PRODUCT_CONFIG } from "../../../app/config/product";
import { ApiError } from "../../../shared/lib/apiClient";
import { OnboardingFormSchema, type OnboardingFormValues } from "../schemas";

export function OnboardingPage() {
  const { onboard } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({ resolver: zodResolver(OnboardingFormSchema) });

  async function onSubmit(values: OnboardingFormValues) {
    setServerError(null);
    try {
      await onboard({
        company: { displayName: values.companyDisplayName },
        admin: {
          name: values.adminName,
          email: values.adminEmail,
          password: values.adminPassword,
        },
      });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "No se pudo crear la empresa.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md rounded-md border border-ink-100 bg-white p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-mint-700 text-white">
            <Banknote aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="text-base font-semibold">{PRODUCT_CONFIG.name}</p>
            <p className="text-xs text-ink-700">Primer ingreso</p>
          </div>
        </div>

        <h1 className="mt-6 text-xl font-semibold text-ink-900">Configura tu negocio</h1>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          Esta informacion se guarda localmente en tu computadora. No se envia a ningun
          servicio externo.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <div>
            <label className="text-sm font-medium text-ink-800" htmlFor="companyDisplayName">
              Nombre del negocio
            </label>
            <input
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              id="companyDisplayName"
              type="text"
              {...register("companyDisplayName")}
            />
            {errors.companyDisplayName ? (
              <p className="mt-1 text-xs text-amberline">{errors.companyDisplayName.message}</p>
            ) : null}
          </div>

          <hr className="border-ink-100" />

          <div>
            <label className="text-sm font-medium text-ink-800" htmlFor="adminName">
              Tu nombre
            </label>
            <input
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              id="adminName"
              type="text"
              {...register("adminName")}
            />
            {errors.adminName ? (
              <p className="mt-1 text-xs text-amberline">{errors.adminName.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-ink-800" htmlFor="adminEmail">
              Correo
            </label>
            <input
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              id="adminEmail"
              type="email"
              {...register("adminEmail")}
            />
            {errors.adminEmail ? (
              <p className="mt-1 text-xs text-amberline">{errors.adminEmail.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-ink-800" htmlFor="adminPassword">
              Contrasena
            </label>
            <input
              className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-sm"
              id="adminPassword"
              type="password"
              {...register("adminPassword")}
            />
            {errors.adminPassword ? (
              <p className="mt-1 text-xs text-amberline">{errors.adminPassword.message}</p>
            ) : null}
          </div>

          {serverError ? <p className="text-sm text-amberline">{serverError}</p> : null}

          <button
            className="mt-2 rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creando..." : "Crear empresa y comenzar"}
          </button>
        </form>
      </div>
    </div>
  );
}
