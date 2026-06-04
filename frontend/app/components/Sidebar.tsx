"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  PlusCircle,
  ClipboardList,
  FlaskConical,
  Shield,
  Heart,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Submit Claim",
    href: "/",
    icon: PlusCircle,
    description: "File a new OPD claim",
  },
  {
    label: "Claims History",
    href: "/claims",
    icon: ClipboardList,
    description: "View all submitted claims",
  },
  {
    label: "Test Runner",
    href: "/test",
    icon: FlaskConical,
    description: "Run adjudication test cases",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col border-r border-gray-200 bg-white"
      style={{ width: 260 }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, #6d28d9, #0ea5e9)",
            }}
          >
            <Heart size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">
              Plum
            </h1>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              OPD Claims Portal
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group relative
                ${
                  isActive
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{
                    background:
                      "linear-gradient(180deg, #6d28d9, #8b5cf6)",
                  }}
                />
              )}
              <Icon
                size={18}
                className={
                  isActive
                    ? "text-purple-600"
                    : "text-gray-400 group-hover:text-gray-600"
                }
              />
              <div>
                <span className="block leading-tight">{item.label}</span>
                <span
                  className={`block text-[10px] mt-0.5 ${
                    isActive ? "text-purple-400" : "text-gray-400"
                  }`}
                >
                  {item.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-50 to-sky-50">
          <Shield size={14} className="text-purple-500 shrink-0" />
        </div>
        <p className="text-[10px] text-gray-300 text-center mt-3">
          © 2024 Plum Benefits
        </p>
      </div>
    </aside>
  );
}
