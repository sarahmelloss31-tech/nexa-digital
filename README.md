# Nexa Digital Públicos

MVP em português para gerar conteúdo com IA para **adultos, crianças e empresas**.

## Recursos
- Login/cadastro com senha criptografada e cookie HttpOnly.
- Planos Grátis, Pro e Premium com créditos.
- Gerador por público-alvo: adultos, crianças e empresas.
- Conteúdo infantil com instruções de segurança e supervisão adulta.
- Histórico das gerações.
- Backend seguro: a OPENAI_API_KEY fica fora do navegador.

## Rodar
```bash
npm install
cp .env.example .env
npm start
```
Abra http://localhost:3000.

## IA real
Configure `OPENAI_API_KEY` no `.env`. Sem chave, roda em modo demonstração.

## Render
Build: `npm install`
Start: `npm start`
Variáveis: `OPENAI_API_KEY`, `OPENAI_MODEL`, `ALLOWED_ORIGIN`, `NODE_ENV=production`.

## Instalar no smartphone

Este MVP agora é um PWA. Depois de publicado em HTTPS:

- Android/Chrome: abrir o link, tocar em **Instalar** ou menu ⋮ > **Adicionar à tela inicial**.
- iPhone/Safari: abrir o link, tocar em **Compartilhar** > **Adicionar à Tela de Início**.

Para aparecer como app instalável, precisa estar publicado em HTTPS, por exemplo no Render.

## Pagamentos Mercado Pago

O app agora tem checkout real do Mercado Pago. Configure:

```env
MERCADO_PAGO_ACCESS_TOKEN=seu_token_do_mercado_pago
APP_BASE_URL=https://seu-app.onrender.com
```

Rotas adicionadas:

- `POST /api/checkout`: cria o checkout real para Pro/Premium.
- `POST /api/payments/webhook`: recebe confirmação e libera créditos.
- `POST /api/checkout/mock`: modo demonstração, bloqueado em produção.

Observação: o MVP ainda usa armazenamento em memória. Para produção, use PostgreSQL antes de vender de verdade.

## Deploy no Render

O projeto inclui `render.yaml`. Para publicar automaticamente, conecte este projeto a um repositório GitHub no Render e configure as variáveis secretas:

- `OPENAI_API_KEY`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `APP_BASE_URL` com a URL final do Render

Build: `npm install`
Start: `npm start`
Health check: `/api/health`

## Versão sem pagamento automático

Esta versão publica IA e login no Render. Os botões Pro/Premium registram interesse, mas não cobram automaticamente.

## Pagamento NG.CASH

Esta versão aceita pagamento por NG.CASH via link ou Pix manual configurável no Render:

```env
NG_CASH_PAYMENT_LINK=https://...
NG_CASH_PIX_KEY=sua-chave-pix-ou-ngcash
NG_CASH_CONTACT=whatsapp-ou-email-para-comprovante
```

O app mostra os dados de pagamento nos planos Pro/Premium. Após o pagamento, a liberação de créditos é manual nesta versão.
