import type { NavIcon } from "./nav-items";

const paths: Record<NavIcon, string> = {
  home: "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z",
  users: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M14 14.7c2.8.3 4.9 2.3 5 5.3",
  book: "M5 4.5C5 3.7 5.7 3 6.5 3H18a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 18.5v-14ZM5 18.5V4.5",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 12c0 .4 0 .8-.1 1.2l1.6 1.3-1.6 2.7-1.9-.5c-.6.5-1.3.9-2 1.2l-.3 2h-3.2l-.3-2c-.7-.3-1.4-.7-2-1.2l-1.9.5-1.6-2.7 1.6-1.3A6 6 0 0 1 5 12c0-.4 0-.8.1-1.2L3.5 9.5l1.6-2.7 1.9.5c.6-.5 1.3-.9 2-1.2l.3-2h3.2l.3 2c.7.3 1.4.7 2 1.2l1.9-.5 1.6 2.7-1.6 1.3c.1.4.1.8.1 1.2Z",
};

export function NavIconGlyph({ icon, className }: { icon: NavIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d={paths[icon]} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
