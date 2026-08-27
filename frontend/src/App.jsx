// SPA única con zona pública y dos entradas de login (Cognito / Entra ID).
// La integración OIDC real (react-oidc-context / oidc-client-ts) se agrega al implementar la Etapa 1.

function App() {
  return (
    <main>
      <h1>SubastaLive</h1>
      <p>Zona pública — subastas y lotes disponibles.</p>
      <nav>
        <button type="button">Ingresar como postor</button>
        <button type="button">Ingresar como martillero / administrador</button>
      </nav>
    </main>
  );
}

export default App;
