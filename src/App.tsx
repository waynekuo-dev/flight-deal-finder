import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/landing";
import AuthPage from "./pages/auth";
import AppPage from "./pages/app";
import RequireAuth from "./components/require-auth";
import NotFound from "./components/not-found";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Combined auth screen (existing UI) plus explicit sign-in / sign-up routes. */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/sign-in" element={<AuthPage initialMode="signin" />} />
      <Route path="/sign-up" element={<AuthPage initialMode="signup" />} />

      {/* Protected: client-side auth guard, redirects to /auth when signed out. */}
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
