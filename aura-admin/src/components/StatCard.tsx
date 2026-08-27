export function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-white p-2.5 shadow-sm">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-500">{label}</p>
        <p className="mt-0.5 text-lg font-extrabold text-[#0D1829]">{value}</p>
      </div>
    </div>
  );
}
