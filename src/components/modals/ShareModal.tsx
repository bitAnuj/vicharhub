import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  X,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Eye,
  Trash2,
  Copy,
  Check,
  Link2,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  useVaultStore,
  type Role,
  type VaultMember,
  type VaultInvite,
} from "../../store/useVaultStore";
import { useAuthStore } from "../../store/useAuthStore";

type ShareModalProps = {
  vaultId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function ShareModal({ vaultId, isOpen, onClose }: ShareModalProps) {
  const {
    vaults,
    members,
    invites,
    currentRole,
    loadingMembers,
    loadMembers,
    loadInvites,
    createInvite,
    revokeInvite,
    updateMemberRole,
    removeMember,
  } = useVaultStore();

  const { user } = useAuthStore();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const vault = vaults.find((v) => v.id === vaultId);
  // Default to 'owner' so vault creators always have full permission
  const effectiveRole = currentRole || vault?.role || "owner";
  const canManage = effectiveRole === "owner" || effectiveRole === "admin";

  useEffect(() => {
    if (isOpen && vaultId) {
      void loadMembers(vaultId);
      if (canManage) void loadInvites(vaultId);
    }
  }, [isOpen, vaultId, canManage, loadMembers, loadInvites]);

  if (!isOpen) return null;

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      const invite = await createInvite(vaultId, inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      toast.success(`Invitation created for ${invite.email}!`);
      const linkToCopy = invite.inviteUrl || (typeof window !== "undefined" ? `${window.location.origin}/join/${invite.token || invite.id}` : "");
                          await navigator.clipboard.writeText(linkToCopy);
      toast.info("Invite link copied to clipboard & email dispatched if Resend API key configured.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create invite";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyWorkspaceLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/v/${vaultId}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Workspace link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const roleBadges: Record<Role, { label: string; icon: LucideIcon; color: string }> = {
    owner: {
      label: "Owner",
      icon: ShieldAlert,
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    admin: {
      label: "Admin",
      icon: ShieldCheck,
      color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    },
    member: {
      label: "Editor",
      icon: UserCheck,
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    viewer: {
      label: "Viewer",
      icon: Eye,
      color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    },
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl text-zinc-900 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-400">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Share Workspace
              </h2>
              <p className="text-xs text-zinc-500">
                &ldquo;{vault?.name ?? "Workspace"}&rdquo; &bull; Manage collaborators & permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Copy Link Bar */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Link2 size={15} className="text-indigo-500" />
              <span>Anyone with workspace access can open</span>
            </div>
            <button
              onClick={handleCopyWorkspaceLink}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              {copiedLink ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Invite form (only visible to owner and admin) */}
          {canManage ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Invite by Email
                </label>
                <span className="text-[11px] text-zinc-400">Recipient receives email + direct invite link</span>
              </div>
              <form onSubmit={handleSendInvite} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@domain.com"
                    className="w-full rounded-xl border border-zinc-300 bg-white pl-8.5 pr-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member" | "viewer")}
                  className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-800 outline-none transition dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <option value="member">Editor (Can edit)</option>
                  <option value="admin">Admin (Full control)</option>
                  <option value="viewer">Viewer (Can read)</option>
                </select>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  <UserPlus size={14} />
                  <span>{busy ? "Sending..." : "Invite"}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
              You have {effectiveRole} permissions. Only owners and admins can invite new members.
            </div>
          )}

          {/* Members list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Workspace Members ({members.length})
              </label>
              {loadingMembers && (
                <span className="text-[11px] text-zinc-400 animate-pulse">Loading...</span>
              )}
            </div>

            <div className="space-y-2">
              {members.map((member: VaultMember) => {
                const Badge = roleBadges[member.role] || roleBadges.member;
                const Icon = Badge.icon;
                const isMe =
                  member.userId === user?.id ||
                  member.id === "self" ||
                  (!!user?.email && member.email.toLowerCase() === user.email.toLowerCase());
                const displayName = (isMe && user?.name) ? user.name : (member.name || "Workspace Member");
                const displayEmail = (isMe && user?.email) ? user.email : member.email;
                const canChangeThisMember =
                  canManage && !isMe && member.role !== "owner";

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 font-bold dark:bg-indigo-600/20 dark:text-indigo-400">
                        {displayName ? displayName[0].toUpperCase() : displayEmail[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {displayName}
                          </span>
                          {isMe && (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                              you
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500">{displayEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canChangeThisMember ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            void updateMemberRole(vaultId, member.userId, e.target.value as Role)
                          }
                          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <div
                          className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${Badge.color}`}
                        >
                          <Icon size={12} />
                          <span>{Badge.label}</span>
                        </div>
                      )}

                      {canChangeThisMember && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${displayName} from this workspace?`)) {
                              void removeMember(vaultId, member.userId);
                            }
                          }}
                          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                          title="Remove member"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending invites list */}
          {canManage && invites.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Pending Invitations ({invites.length})
              </label>

              <div className="space-y-2">
                {invites.map((invite: VaultInvite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-xl border border-dashed border-zinc-300 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {invite.email}
                        </span>
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                          {invite.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Expires {new Date(invite.expiresAt * 1000).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(invite.inviteUrl);
                          setCopiedId(invite.id);
                          toast.success("Invite link copied!");
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        title="Copy link"
                      >
                        {copiedId === invite.id ? (
                          <>
                            <Check size={12} className="text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy link</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => void revokeInvite(vaultId, invite.id)}
                        className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                        title="Revoke invite"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
