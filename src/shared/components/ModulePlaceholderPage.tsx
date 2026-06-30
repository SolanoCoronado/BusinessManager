import { ArrowRight } from "lucide-react";

import { getModuleById, type ModuleId } from "../../app/routes/moduleCatalog";
import { EmptyState } from "./EmptyState";

type ModulePlaceholderPageProps = {
  moduleId: ModuleId;
};

export function ModulePlaceholderPage({ moduleId }: ModulePlaceholderPageProps) {
  const module = getModuleById(moduleId);
  const Icon = module.icon;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="rounded-md border border-ink-100 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-mint-700 text-white">
            <Icon aria-hidden="true" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-mint-700">{module.phase}</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink-900">{module.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
              {module.description}
            </p>
          </div>
        </div>
      </section>

      <EmptyState
        actionLabel="Modulo registrado"
        description="La pantalla ya esta conectada a la navegacion. La logica persistente se implementara por fases sin mezclarla con componentes visuales."
        icon={ArrowRight}
        title="Pendiente de implementacion funcional"
      />
    </div>
  );
}
