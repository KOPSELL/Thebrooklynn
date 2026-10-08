import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
const parseOneSignalDelivery = (result: any) => {
  const errors = Array.isArray(result?.errors)
    ? result.errors.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const recipients = typeof result?.recipients === "number" ? result.recipients : 0;
  const notificationId = typeof result?.id === "string" ? result.id : undefined;

  return {
    delivered: Boolean(notificationId) && recipients > 0 && errors.length === 0,
    notificationId,
    recipients,
    errors,
  };
};

const AppointmentBodySchema = z.object({ appointmentId: z.string().uuid() });
const WebhookBodySchema = z.object({
  type: z.literal("INSERT"),
  table: z.literal("appointments"),
  schema: z.literal("public"),
  record: z.object({
    id: z.string().uuid(),
    barber_id: z.string().uuid(),
    appointment_date: z.string(),
    appointment_time: z.string(),
    client_name: z.string(),
  }),
});

const externalBaseUrl = "https://feloxrkstqptipfxrmkf.supabase.co";
const externalFunctionUrl = `${externalBaseUrl}/functions/v1/send-appointment-notification`;
const externalPublishableKey = "sb_publishable_h2TgIb-kj3PvmWFR7H1f-Q_zw-MydM5";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sendExternalOneSignalNotification = async (
  record: z.infer<typeof WebhookBodySchema>["record"],
  webhookSecret: string,
) => {
  const external = createClient(externalBaseUrl, externalPublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await external
    .from("perfis_barbeiros")
    .select("onesignal_subscription_id")
    .eq("barber_id", record.barber_id)
    .maybeSingle();

  if (profileError) {
    console.error("Barber push profile lookup failed", profileError);
    return jsonResponse({ ok: false, delivered: false, error: "Falha ao localizar o dispositivo do barbeiro." }, 500);
  }

  if (!profile?.onesignal_subscription_id) {
    return jsonResponse({
      ok: false,
      delivered: false,
      error: "O barbeiro ainda não possui dispositivo inscrito para notificações.",
      recipients: 0,
    }, 200);
  }

  const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID_THEBROOKLYNN") || Deno.env.get("ONESIGNAL_APP_ID");
  const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY_THEBROOKLYNN") || Deno.env.get("ONESIGNAL_API_KEY");

  if (!oneSignalAppId || !oneSignalApiKey) {
    return jsonResponse({ ok: false, delivered: false, error: "OneSignal não está configurado." }, 500);
  }

  const oneSignalResponse = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${oneSignalApiKey}`,
    },
    body: JSON.stringify({
      app_id: oneSignalAppId,
      include_subscription_ids: [profile.onesignal_subscription_id],
      headings: {
        pt: "Novo agendamento",
        en: "Novo agendamento",
      },
      contents: {
        pt: `${record.client_name} agendou para ${record.appointment_date} às ${record.appointment_time.slice(0, 5)}.`,
        en: `${record.client_name} agendou para ${record.appointment_date} às ${record.appointment_time.slice(0, 5)}.`,
      },
      data: {
        appointment_id: record.id,
        type: "new_appointment",
      },
    }),
  });

  const oneSignalResult = await oneSignalResponse.json().catch(() => ({}));
  const delivery = parseOneSignalDelivery(oneSignalResult);

  if (!oneSignalResponse.ok || !delivery.delivered) {
    console.error("OneSignal notification failed", {
      status: oneSignalResponse.status,
      result: oneSignalResult,
      subscriptionId: profile.onesignal_subscription_id,
    });
    return jsonResponse({
      ok: false,
      delivered: false,
      error: delivery.errors[0] ?? "O OneSignal não confirmou a entrega.",
      recipients: delivery.recipients ?? 0,
    }, 502);
  }

  console.log("OneSignal notification delivered", {
    appointmentId: record.id,
    notificationId: delivery.notificationId,
    recipients: delivery.recipients,
  });

  return jsonResponse({
    ok: true,
    delivered: true,
    notificationId: delivery.notificationId,
    recipients: delivery.recipients,
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const webhookSecret = Deno.env.get("APPOINTMENT_WEBHOOK_SECRET");

    if (!webhookSecret) {
      return jsonResponse({ ok: false, error: "Integração não configurada." }, 500);
    }

    const webhook = WebhookBodySchema.safeParse(body);

    if (webhook.success) {
      if (req.headers.get("x-webhook-secret") !== webhookSecret) {
        return jsonResponse({ ok: false, error: "Não autorizado." }, 401);
      }

      return await sendExternalOneSignalNotification(webhook.data.record, webhookSecret);
    }

    const parsed = AppointmentBodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ ok: false, error: "Agendamento inválido." }, 400);
    }

    const cloudUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!cloudUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: "Integração com o banco do Lovable não está configurada." }, 500);
    }

    const cloud = createClient(cloudUrl, serviceRoleKey);
    const { data: appointment, error } = await cloud
      .from("appointments")
      .select("id, appointment_date, appointment_time, client_name, barber:barbers(name)")
      .eq("id", parsed.data.appointmentId)
      .maybeSingle();

    if (error || !appointment) {
      console.error("Appointment lookup failed", error);
      return jsonResponse({ ok: false, error: "Agendamento não encontrado." }, 404);
    }

    const barberRelation = appointment.barber;
    const barberName = Array.isArray(barberRelation)
      ? barberRelation[0]?.name
      : barberRelation?.name;

    if (!barberName) {
      return jsonResponse({ ok: false, error: "Barbeiro não encontrado." }, 404);
    }

    const external = createClient(externalBaseUrl, externalPublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: externalBarber, error: barberError } = await external
      .from("barbers")
      .select("id")
      .eq("name", barberName)
      .maybeSingle();

    if (barberError || !externalBarber) {
      console.error("External barber lookup failed", barberError);
      return jsonResponse({ ok: false, error: "Barbeiro não vinculado às notificações." }, 404);
    }

    const externalResponse = await fetch(externalFunctionUrl, {
      method: "POST",
      headers: {
        apikey: externalPublishableKey,
        Authorization: `Bearer ${externalPublishableKey}`,
        "Content-Type": "application/json",
        "x-webhook-secret": webhookSecret,
      },
      body: JSON.stringify({
        type: "INSERT",
        table: "appointments",
        schema: "public",
        record: {
          id: appointment.id,
          barber_id: externalBarber.id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          client_name: appointment.client_name,
        },
        old_record: null,
      }),
    });

    const result = await externalResponse.json().catch(() => ({}));

    if (!externalResponse.ok) {
      console.error("External notification request failed", {
        status: externalResponse.status,
        result,
      });
      return jsonResponse({ ok: false, delivered: false, error: "Falha ao enviar notificação." }, 502);
    }

    return jsonResponse(result, externalResponse.status);
  } catch (error) {
    console.error("send-appointment-notification error", error);
    return jsonResponse({ ok: false, error: "Falha inesperada ao enviar notificação." }, 500);
  }
});
