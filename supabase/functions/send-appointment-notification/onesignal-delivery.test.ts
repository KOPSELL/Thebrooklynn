import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseOneSignalDelivery } from "../_shared/onesignal-delivery.ts";

Deno.test("rejects a success envelope when the saved phone is unsubscribed", () => {
  assertEquals(
    parseOneSignalDelivery({
      success: true,
      data: { errors: ["All included players are not subscribed"], id: "" },
    }),
    {
      delivered: false,
      notificationId: null,
      recipients: null,
      errors: ["All included players are not subscribed"],
    },
  );
});

Deno.test("accepts a OneSignal notification with recipients", () => {
  assertEquals(
    parseOneSignalDelivery({ data: { id: "notification-123", recipients: 1 } }),
    {
      delivered: true,
      notificationId: "notification-123",
      recipients: 1,
      errors: [],
    },
  );
});