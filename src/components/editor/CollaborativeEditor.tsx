import { LiveblocksRoomProvider } from "../../lib/liveblocks";
import useVaultStore from "../../store/useVaultStore";
import NotionEditor from "./NotionEditor";

type Props = { pageId: string };

export default function CollaborativeEditor({ pageId }: Props) {
  const currentVaultId = useVaultStore((s) => s.currentVaultId);
  return (
    <LiveblocksRoomProvider
      key={currentVaultId ?? "none"}
      id={`${currentVaultId ?? "none"}-page-${pageId}`}
      initialPresence={{}}
    >
      <NotionEditor pageId={pageId} />
    </LiveblocksRoomProvider>
  );
}
