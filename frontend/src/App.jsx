import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { SubastaDetailPage } from "./pages/SubastaDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { CallbackPostorPage } from "./pages/CallbackPostorPage";
import { CallbackStaffPage } from "./pages/CallbackStaffPage";
import { PerfilPage } from "./pages/PerfilPage";
import { HistorialPage } from "./pages/HistorialPage";
import { CrearLotePage } from "./pages/CrearLotePage";
import { ProgramarSubastaPage } from "./pages/ProgramarSubastaPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/subastas/:id" element={<SubastaDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback/postor" element={<CallbackPostorPage />} />
            <Route path="/auth/callback/staff" element={<CallbackStaffPage />} />

            <Route
              path="/perfil"
              element={
                <RequireAuth>
                  <PerfilPage />
                </RequireAuth>
              }
            />
            <Route
              path="/historial"
              element={
                <RequireAuth roles={["POSTOR"]}>
                  <HistorialPage />
                </RequireAuth>
              }
            />
            <Route
              path="/martillero/lotes/nuevo"
              element={
                <RequireAuth roles={["MARTILLERO", "ADMINISTRADOR"]}>
                  <CrearLotePage />
                </RequireAuth>
              }
            />
            <Route
              path="/martillero/subastas/nueva"
              element={
                <RequireAuth roles={["MARTILLERO", "ADMINISTRADOR"]}>
                  <ProgramarSubastaPage />
                </RequireAuth>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <footer className="app-footer">SubastaLive — proyecto DSY1107, Etapa 1</footer>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
