import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  icon: LucideIcon;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  icon: Icon,
  onAction,
}: EmptyStateProps) {
  return (
    <section className="rounded-md border border-dashed border-ink-100 bg-white p-8 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-ink-50 text-mint-700">
        <Icon aria-hidden="true" size={22} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
        {description}
      </p>
      {actionLabel ? (
        <button
          className="mt-5 rounded-md bg-mint-700 px-4 py-2 text-sm font-semibold text-white hover:bg-mint-600"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
