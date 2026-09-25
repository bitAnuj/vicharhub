import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { getOrCreateCollabUser } from "./collabUser";

const client = createClient({
  throttle: 16,
  authEndpoint: async (room) => {
    const user = getOrCreateCollabUser();
    const accessToken = localStorage.getItem("vh_access_token") ?? "";
    const response = await fetch("/api/liveblocks-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        room,
        userId: user.id,
        userName: user.name,
      }),
    });
    return response.json();
  },
});

type Presence = {
  cursor?: { x: number; y: number };
  selection?: { anchor: number; head: number };
};

type Storage = Record<string, never>;
type UserMeta = { id: string; info: { name: string } };

export type RoomEvent =
  | {
      type: "SHEET_CELL_CHANGE";
      x: number;
      y: number;
      value: any;
    };

type ThreadMetadata = { resolved: boolean };

export const {
  RoomProvider: LiveblocksRoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useSelf,
  useOthers,
  useOthersMapped,
  useOthersConnectionIds,
  useOther,
  useBroadcastEvent,
  useEventListener,
  useStorage,
  useMutation,
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(client);

export { client };
