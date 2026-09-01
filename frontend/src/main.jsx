import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

async function habilitarMocksSiCorresponde() {
  if (import.meta.env.VITE_USE_MOCKS === "false") return;
  try {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  } catch (error) {
    console.error("No se pudo registrar el Service Worker de MSW, la app sigue sin mocks:", error);
  }
}

habilitarMocksSiCorresponde().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
