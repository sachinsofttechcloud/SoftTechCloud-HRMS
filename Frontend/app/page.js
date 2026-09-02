import LoginIn from "./login-in/page";

export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col flex-1 items-center justify-center bg-cover bg-center bg-no-repeat font-sans"
      style={{ backgroundImage: "url('/login/loginbg.webp')" }}
    >
      <LoginIn />
    </main>
  );
}
