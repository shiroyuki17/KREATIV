/**
 * Layout-neutral wrapper. (The magnetic cursor-follow movement was removed —
 * it read as janky/broken. Buttons now stay put with a clean hover from their
 * own styles.) Keeps the same inline-block box + className so nothing shifts.
 */
export default function Magnet({ children, className = "" }) {
  return <div className={`inline-block ${className}`}>{children}</div>;
}
