# The Brooklyn Barbearia

## Web Push para novos agendamentos

O projeto usa React/Vite no frontend, Supabase no backend e OneSignal para Web Push. O fluxo é:

1. O barbeiro abre o painel **/admin** no celular.
2. Seleciona seu nome e toca em **Ativar Notificações**.
3. O OneSignal pede a permissão do navegador e cria uma Subscription ID.
4. A Subscription ID é salva em `public.perfis_barbeiros`.
5. Um `INSERT` em `public.appointments` dispara um Database Webhook.
6. O webhook chama a Edge Function `send-appointment-notification`.
7. A função consulta a inscrição do barbeiro e envia **Novo Corte Agendado! 💈** pela API do OneSignal.

O OneSignal usa uma Service Worker pública em `/OneSignalSDKWorker.js`; a documentação recomenda que esse arquivo seja publicamente acessível. urlDocumentação do OneSignal Web SDKhttps://documentation.onesignal.com/docs/vue-js-setup

## 1. OneSignal

Crie um aplicativo Web Push no OneSignal e copie o **App ID**.

No ambiente do frontend:

```env
VITE_ONESIGNAL_APP_ID="SEU_APP_ID"
```

A chave REST/API do OneSignal **não** deve ficar no frontend. Ela deve ser cadastrada como secret no Supabase.

## 2. Banco Supabase

Aplique:

```text
supabase/migrations/20261002000000_add_barber_push_subscriptions.sql
```

Ela cria:

- `public.perfis_barbeiros`
- `barber_id`
- `onesignal_subscription_id`
- políticas para o registro/atualização da inscrição pelo painel.

A leitura da inscrição não é pública; a Edge Function usa a chave privilegiada do servidor.

## 3. PWA

O projeto já possui:

- `public/manifest.json`
- `public/pwa-icon.svg`
- `public/OneSignalSDKWorker.js`
- meta tags Android/iOS em `index.html`.

Para instalar no celular, abra o site em HTTPS e use **Adicionar à tela inicial**.

No iPhone/iPad, o suporte a Web Push para sites depende do uso do site como Web App adicionado à Tela de Início e de uma versão compatível do iOS/iPadOS. O OneSignal também documenta suporte ao Safari Web Push.

## 4. Edge Function

Arquivo:

```text
supabase/functions/send-appointment-notification/index.ts
```

Cadastre estes secrets no Supabase:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
supabase secrets set ONESIGNAL_APP_ID="SEU_ONESIGNAL_APP_ID"
supabase secrets set ONESIGNAL_API_KEY="SUA_CHAVE_REST_ONESIGNAL"
supabase secrets set APPOINTMENT_WEBHOOK_SECRET="UM_SEGREDO_LONGO_E_ALEATORIO"
```

Depois faça o deploy:

```bash
supabase functions deploy send-appointment-notification
```

A Edge Function é TypeScript/Deno e pode receber webhooks do banco. urlDocumentação das Supabase Edge Functionshttps://supabase.com/docs/guides/functions

## 5. Database Webhook

No Supabase Dashboard:

**Database → Webhooks → Create webhook**

Configure:

- Table: `public.appointments`
- Event: **INSERT**
- Method: **POST**
- Target: **Supabase Edge Function**
- Function: `send-appointment-notification`
- Header personalizado: `x-webhook-secret: UM_SEGREDO_LONGO_E_ALEATORIO` (o mesmo salvo em `APPOINTMENT_WEBHOOK_SECRET`).
- Content-Type: `application/json`

O payload enviado pelo Database Webhook contém `type`, `table`, `schema`, `record` e `old_record`. citeturn0search0

## 6. Teste

1. Abra `/admin` no celular do barbeiro.
2. Selecione o barbeiro.
3. Toque em **Ativar Notificações** e permita as notificações.
4. Confirme no OneSignal que a subscription aparece como inscrita.
5. Faça um agendamento pela página pública.
6. O INSERT em `appointments` deve chamar a Edge Function.
7. O barbeiro deve receber:

**Novo Corte Agendado! 💈**

com a data/horário do corte e o nome do cliente.

A API atual do OneSignal aceita `include_subscription_ids` para direcionar uma notificação a uma Subscription ID específica. citeturn2search0turn2search4

## Observação de segurança

A chave REST do OneSignal e a `SUPABASE_SERVICE_ROLE_KEY` são somente de servidor. Nunca coloque essas chaves em `VITE_*` ou em código enviado ao navegador.
