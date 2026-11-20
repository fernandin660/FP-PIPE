/*
 * Liga/desliga o pagamento online (Mercado Pago) para NOVAS assinaturas.
 *
 * Desligado (false):
 * - a página /planos troca "Assinar" por "Assinar pelo WhatsApp";
 * - /api/checkout/mercadopago recusa criar pagamentos.
 * O webhook do Mercado Pago continua funcionando, para registrar pagamentos
 * e renovações de quem já assinou.
 *
 * Para religar: troque para true e publique.
 */
export const PAGAMENTO_ONLINE_ATIVO = false;

export const WHATSAPP_VENDAS = "5516997700593";
