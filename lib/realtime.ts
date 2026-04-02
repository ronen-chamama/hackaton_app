import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { GroupValue } from "@/lib/types";

type GroupValueEventType = "INSERT" | "UPDATE" | "DELETE";

interface SubscribeToGroupValuesParams {
  supabase: SupabaseClient;
  groupId: string;
  hackathonId: string;
  onChange: (row: GroupValue, eventType: GroupValueEventType) => void;
}

export function subscribeToGroupValues({
  supabase,
  groupId,
  hackathonId,
  onChange,
}: SubscribeToGroupValuesParams): RealtimeChannel {
  return supabase
    .channel(`group:${groupId}:hackathon:${hackathonId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "group_values",
        filter: `group_id=eq.${groupId}`,
      },
      (payload: RealtimePostgresChangesPayload<GroupValue>) => {
        const row = (
          payload.eventType === "DELETE" ? payload.old : payload.new
        ) as GroupValue;

        if (!row || row.hackathon_id !== hackathonId) {
          return;
        }

        onChange(row, payload.eventType);
      }
    )
    .subscribe();
}
