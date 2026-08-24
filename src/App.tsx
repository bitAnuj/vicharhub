import { useEffect} from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AuthScreen from "./components/auth/AuthScreen";
import useVaultStore, { type Vault } from "./store/useVaultStore";
import { useAuthStore } from "./store/useAuthStore";

function App() {
  const { status } = useAuthStore();
  const { currentVaultId, vaults, createVault, openVault } = useVaultStore();
  useEffect(() => {
    if (status === "signedIn") void useVaultStore.getState().loadVaults();
  }, [status]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        Loading…
      </div>
    );
  }

  if (status === "signedOut") return <AuthScreen />;

  if (currentVaultId && vaults.some((v: Vault) => v.id === currentVaultId)) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">VicharHub</h1>
        {vaults.length === 0 ? (
          <div className="mb-6">
            <p className="text-zinc-400 mb-4">No vaults yet.</p>
            <button onClick={() => { const name = prompt("Enter new vault name:"); if (name && name.trim()) createVault(name.trim()); }} className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-md hover:bg-zinc-700">Create first vault</button>
          </div>
        ) : (
          <div>
            <p className="text-zinc-400 mb-4">Select a vault:</p>
            {vaults.map((vault: Vault) => (
              <button key={vault.id} onClick={() => void openVault(vault.id)} className="block w-full text-left bg-zinc-800 text-zinc-200 px-4 py-2 rounded-md mb-2 hover:bg-zinc-700">{vault.name}</button>
            ))}
            <button onClick={() => { const name = prompt("Enter new vault name:"); if (name && name.trim()) createVault(name.trim()); }} className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-md hover:bg-zinc-700 mt-2">Create new vault</button>
          </div>
        )}
      </div>
    </div>
  );
}
export default App;
