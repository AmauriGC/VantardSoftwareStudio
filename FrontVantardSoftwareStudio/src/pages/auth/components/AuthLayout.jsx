import { Globe } from "lucide-react";

import BaseCard from "../../../components/BaseCard";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6">
      <BaseCard className="w-full max-w-md p-8 flex flex-col items-center justify-center gap-6">
        <div className="flex items-center justify-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Globe className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-gray-900">VSS</span>
        </div>

        {(title || subtitle) && (
          <div className="w-full flex flex-col items-center justify-center gap-1">
            {title ? <h1 className="text-2xl font-semibold text-gray-900">{title}</h1> : null}
            {subtitle ? <p className="text-sm text-gray-600 text-center">{subtitle}</p> : null}
          </div>
        )}

        <div className="w-full">{children}</div>

        {footer ? <div className="w-full">{footer}</div> : null}
      </BaseCard>
    </div>
  );
}
