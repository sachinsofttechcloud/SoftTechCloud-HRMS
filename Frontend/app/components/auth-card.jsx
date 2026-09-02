
import Link from "next/link";

export default function AuthCard({ title, subtitle, children, footerText, footerLink, footerLabel }) {
  return (
    <div className="flex items-center justify-center rounded-full">
      <div className="w-full max-w-md rounded-2xl bg-white/90 py-8 px-10 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}

        <div className="mt-6">{children}</div>

        {footerText && (
          <p className="mt-6 text-center text-sm text-gray-500">
            {footerText}{" "}
            <Link href={footerLink} className="font-medium text-blue-600 hover:underline">
              {footerLabel}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}