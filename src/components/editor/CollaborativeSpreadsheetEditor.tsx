import { LiveblocksRoomProvider } from "../../lib/liveblocks";
import useVaultStore from "../../store/useVaultStore";
import SpreadsheetEditor from "./SpreadsheetEditor";

type Props = { pageId: string };

export default function CollaborativeSpreadsheetEditor({ pageId }: Props) {
  const currentVaultId = useVaultStore((s) => s.currentVaultId);

  return (
    <LiveblocksRoomProvider
      key={currentVaultId ?? "none"}
      id={`${currentVaultId ?? "none"}-page-${pageId}`}
      initialPresence={{}}
    >
      <SpreadsheetEditor pageId={pageId} />
    </LiveblocksRoomProvider>
  );
}
