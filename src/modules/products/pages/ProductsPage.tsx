import { zodResolver } from "@hookform/resolvers/zod";
import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "../../../app/providers/AuthProvider";
import { ApiError, apiClient, type ProductDto, type TaxRateDto } from "../../../shared/lib/apiClient";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ProductFormSchema, type ProductFormValues } from "../schemas";

const priceFormatter = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2 });

function formatCents(cents: number) {
  return priceFormatter.format(cents / 100);
}

export function ProductsPage() {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      type: "product",
      unitPrice: 0,
      taxRateId: "",
      trackInventory: false,
      stockQuantity: 0,
    },
  });

  async function load(token: string) {
    try {
      const [productsRes, taxRatesRes] = await Promise.all([
        apiClient.listProducts(token),
        apiClient.listTaxRates(token),
      ]);
      setProducts(productsRes.products);
      setTaxRates(taxRatesRes.taxRates);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar el catalogo.");
    }
  }

  useEffect(() => {
    if (accessToken) void load(accessToken);
  }, [accessToken]);

  async function onSubmit(values: ProductFormValues) {
    if (!accessToken) return;
    setError(null);
    try {
      await apiClient.createProduct(accessToken, {
        sku: values.sku,
        name: values.name,
        type: values.type,
        unitPrice: Math.round(values.unitPrice * 100),
        taxRateId: values.taxRateId || undefined,
        trackInventory: values.trackInventory,
        stockQuantity: values.stockQuantity,
      });
      reset();
      await load(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el producto.");
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-mint-700 text-white">
            <Package aria-hidden="true" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-ink-900">Productos y servicios</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
              Catalogo comercial con cuentas contables e impuestos asociados.
            </p>
          </div>
        </div>

        <form
          className="mt-6 grid grid-cols-3 gap-3"
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        >
          <input
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            placeholder="SKU"
            type="text"
            {...register("sku")}
          />
          <input
            className="col-span-2 rounded-md border border-ink-100 px-3 py-2 text-sm"
            placeholder="Nombre"
            type="text"
            {...register("name")}
          />

          <select className="rounded-md border border-ink-100 px-3 py-2 text-sm" {...register("type")}>
            <option value="product">Producto</option>
            <option value="service">Servicio</option>
          </select>
          <input
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            placeholder="Precio unitario"
            step="0.01"
            type="number"
            {...register("unitPrice", { valueAsNumber: true })}
          />
          <select
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            {...register("taxRateId")}
          >
            <option value="">Sin impuesto</option>
            {taxRates.map((tax) => (
              <option key={tax.id} value={tax.id}>
                {tax.name} ({tax.rate}%)
              </option>
            ))}
          </select>

          <label className="col-span-2 flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" {...register("trackInventory")} />
            Controlar inventario
          </label>
          <input
            className="rounded-md border border-ink-100 px-3 py-2 text-sm"
            placeholder="Stock inicial"
            type="number"
            {...register("stockQuantity", { valueAsNumber: true })}
          />

          {errors.sku || errors.name ? (
            <p className="col-span-3 text-xs text-amberline">
              {errors.sku?.message || errors.name?.message}
            </p>
          ) : null}

          <button
            className="col-span-3 w-fit rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Guardando..." : "Agregar producto"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-amberline">{error}</p> : null}
      </section>

      {products.length === 0 ? (
        <EmptyState
          description="Agrega tu primer producto o servicio con el formulario de arriba."
          icon={Package}
          title="Todavia no hay productos registrados"
        />
      ) : (
        <section className="overflow-hidden rounded-md border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-700">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Precio</th>
                <th className="px-4 py-2 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-2">{product.sku}</td>
                  <td className="px-4 py-2 font-medium text-ink-900">{product.name}</td>
                  <td className="px-4 py-2 text-ink-700">
                    {product.type === "product" ? "Producto" : "Servicio"}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCents(product.unitPrice)}</td>
                  <td className="px-4 py-2 text-right">
                    {product.trackInventory ? product.stockQuantity : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
