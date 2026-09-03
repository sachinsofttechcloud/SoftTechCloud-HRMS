
export default function AuthLayout({ children }) {
  return (
    <div
   className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-kenburns"
  style={{ backgroundImage: "url('/login/loginbg.webp')" }}
    >
      {children}
    </div>
  );
}