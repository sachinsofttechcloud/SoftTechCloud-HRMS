
export default function Button({ children, className = "", handleClick, ...props }) {
  return (
    <button
      className={`w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white
        transition hover:bg-blue-700 active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-blue-500/40
        disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}