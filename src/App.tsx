import { toast } from "sonner";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Trash2 } from "lucide-react";
import Home from "./pages/Home";
import AuthScreen from "./components/auth/AuthScreen";
import useVaultStore, { type Vault } from "./store/useVaultStore";
import { usePageStore } from "./store/usePageStore";
import { useAuthStore } from "./store/useAuthStore";

function parseRouteInfo() {
  const path = window.location.pathname;
  const search = new URLSearchParams(window.location.search);

  let inviteToken = search.get("invite");
  let pageId = search.get("page");
  let vaultId = search.get("vault");

  const joinMatch = path.match(/^\/(?:join|invite)\/([^/]+)/);
  if (joinMatch) inviteToken = joinMatch[1];

  const pageMatch = path.match(/^\/(?:p|page)\/([^/]+)/);
  if (pageMatch) pageId = pageMatch[1];

  const vaultMatch = path.match(/^\/(?:v|vault)\/([^/]+)/);
  if (vaultMatch) vaultId = vaultMatch[1];

  return { inviteToken, pageId, vaultId };
}

function App() {
  const { status, init } = useAuthStore();
  const { currentVaultId, vaults, createVault, openVault, deleteVault, acceptInvite } = useVaultStore();

  useEffect(() => {
    void init();
    // Cache pending URL params for users who need to sign in first
    const { inviteToken, pageId, vaultId } = parseRouteInfo();
    if (inviteToken) sessionStorage.setItem("vicharhub_pending_invite", inviteToken);
    if (pageId) sessionStorage.setItem("vicharhub_pending_page", pageId);
    if (vaultId) sessionStorage.setItem("vicharhub_pending_vault", vaultId);
  }, [init]);

  useEffect(() => {
    if (status === "signedIn") {
      void (async () => {
        const { inviteToken: urlInvite, pageId: urlPage, vaultId: urlVault } = parseRouteInfo();
        const inviteToken = urlInvite || sessionStorage.getItem("vicharhub_pending_invite");
        const pageId = urlPage || sessionStorage.getItem("vicharhub_pending_page");
        const vaultId = urlVault || sessionStorage.getItem("vicharhub_pending_vault");

        sessionStorage.removeItem("vicharhub_pending_invite");
        sessionStorage.removeItem("vicharhub_pending_page");
        sessionStorage.removeItem("vicharhub_pending_vault");

        if (inviteToken) {
          try {
            const res = await acceptInvite(inviteToken);
            toast.success(`You joined the workspace as ${res.role}!`);
            window.history.replaceState({}, "", "/");
            if (res?.vaultId) {
              await openVault(res.vaultId);
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to join workspace from invite";
            toast.error(msg);
            window.history.replaceState({}, "", "/");
            await useVaultStore.getState().loadVaults();
          }
        } else {
          await useVaultStore.getState().loadVaults();
          if (vaultId) {
            await openVault(vaultId);
          }
        }

        if (pageId) {
          usePageStore.getState().selectPage(pageId);
        }
      })();
    }
  }, [status, acceptInvite, openVault]);

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
          <Route path="*" element={<Home />} />
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
            <button
              onClick={() => {
                const name = prompt("Enter new vault name:");
                if (name && name.trim()) void createVault(name.trim());
              }}
              className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-md hover:bg-zinc-700"
            >
              Create first vault
            </button>
          </div>
        ) : (
          <div>
            <p className="text-zinc-400 mb-4">Select a vault:</p>
            {vaults.map((vault: Vault) => (
              <div key={vault.id} className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => void openVault(vault.id)}
                  className="flex-1 text-left bg-zinc-800 text-zinc-200 px-4 py-2 rounded-md hover:bg-zinc-700 transition-colors"
                >
                  {vault.name}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete vault "${vault.name}" and all its pages permanently?`)) {
                      deleteVault(vault.id);
                      toast.success(`Vault "${vault.name}" deleted`);
                    }
                  }}
                  className="rounded-md bg-zinc-800 p-2 text-zinc-400 hover:bg-red-950/60 hover:text-red-400 transition-colors"
                  title="Delete vault"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const name = prompt("Enter new vault name:");
                if (name && name.trim()) void createVault(name.trim());
              }}
              className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-md hover:bg-zinc-700 mt-2"
            >
              Create new vault
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
