# Garantir notificações de agendamentos

## Objetivo
Validar o fluxo completo no site publicado e corrigir qualquer falha entre o novo agendamento, a função de envio, o OneSignal e o aparelho inscrito.

## Etapas
- Corrigir o erro atual da função de notificações e manter os agendamentos no Lovable Cloud.
- Validar a inscrição do aparelho e rejeitar IDs inativos ou sem destinatário.
- Publicar a função corrigida e executar um agendamento real de teste.
- Conferir os registros de envio e confirmar que o OneSignal aceitou ao menos um destinatário.

## Limite da verificação
O sistema pode confirmar o aceite e o destinatário no OneSignal. A exibição final no iPhone também depende das permissões do iOS, conexão, Foco e políticas da Apple.
