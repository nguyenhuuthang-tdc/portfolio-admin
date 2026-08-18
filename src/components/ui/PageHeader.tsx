import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-800">
      <div className="flex items-start gap-3">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-300"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-neutral-100">{title}</h1>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
