"use client";

import { cn } from "@/lib/cn";
import { useCountUp } from "@/components/ui/use-count-up";

type Tone = "primary" | "blue" | "amber" | "rose";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary text-primary-foreground",
  blue: "bg-tile-blue text-tile-blue-foreground",
  amber: "bg-tile-amber text-tile-amber-foreground",
  rose: "bg-tile-rose text-tile-rose-foreground",
};

export function StatTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: Tone;
  icon?: React.ReactNode;
}) {
  const animated = useCountUp(value);

  return (
    <div className={cn("flex flex-col justify-between rounded-lg p-5", toneClasses[tone])}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-90">{label}</span>
        {icon}
      </div>
      <span className="font-display mt-3 text-3xl">{animated.toLocaleString("en-US")}</span>
    </div>
  );
}
