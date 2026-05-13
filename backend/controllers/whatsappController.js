// =============================================
// FILE: controllers/whatsappController.js
// Sends WhatsApp messages with payment links
// using the Z-API service.
// =============================================

const supabase = require('../config/supabaseClient');

// Z-API credentials from .env
const ZAPI_INSTANCE_ID  = process.env.ZAPI_INSTANCE_ID;
const ZAPI_TOKEN        = process.env.ZAPI_TOKEN;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
const FRONTEND_URL      = process.env.FRONTEND_URL;

// Z-API base URL for sending messages
const ZAPI_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

// ── BUILD MESSAGE TEXT ──────────────────────
// Builds the WhatsApp message with the payment link
const buildMessage = (member, groupName, paymentLink) => {
  const value = parseFloat(member.individual_value).toFixed(2).replace('.', ',');
  const dueDate = member.due_date
    ? new Date(member.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'Não definido';

  return `Olá, *${member.name}*! 👋\n\n` +
    `Você tem um pagamento pendente no grupo *${groupName}*.\n\n` +
    `💰 *Valor:* R$ ${value}\n` +
    `📅 *Vencimento:* ${dueDate}\n\n` +
    `Para pagar, acesse o link abaixo e envie o comprovante:\n` +
    `${paymentLink}\n\n` +
    `_GrupoPay_ 🚀`;
};

// ── SEND MESSAGE VIA Z-API ──────────────────
// Internal function that calls the Z-API endpoint
const sendWhatsAppMessage = async (phone, message) => {
  const response = await fetch(ZAPI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify({
      phone,    // Phone number: 5511999999999
      message,  // Message text
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Z-API error.');
  }

  return result;
};

// ── SEND PAYMENT LINK TO ONE MEMBER ────────
// Sends a WhatsApp message with the payment link
// to a specific member using their ID.
const sendPaymentLink = async (req, res) => {

  const { memberId } = req.params;

  // Find the member and their group
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('*, groups(name)')
    .eq('id', memberId)
    .single();

  if (memberError || !member) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  // ── Check if member already has a confirmed payment ──
  // If payment is confirmed, block sending the link again
  const { data: payment } = await supabase
    .from('payments')
    .select('status')
    .eq('member_id', memberId)
    .single();

  if (payment && payment.status === 'confirmed') {
    return res.status(400).json({ error: 'Payment already confirmed. No need to send again.' });
  }

  // ── Check if a message was already sent today ──
  // Prevents sending multiple messages in the same day
  const today = new Date().toISOString().split('T')[0];
  const { data: recentLog } = await supabase
    .from('whatsapp_logs')
    .select('id, sent_at')
    .eq('member_id', memberId)
    .eq('status', 'sent')
    .gte('sent_at', `${today}T00:00:00`)
    .single();

  if (recentLog) {
    return res.status(400).json({
      error: 'Message already sent today. Wait until tomorrow to send again.',
      already_sent: true,
    });
  }
  
  // Build the payment link
  const paymentLink = `${FRONTEND_URL}/pagar.html?token=${member.payment_token}`;
  const message     = buildMessage(member, member.groups.name, paymentLink);

  try {
    // Send message via Z-API
    await sendWhatsAppMessage(member.phone, message);

    // Save success log in database
    await supabase.from('whatsapp_logs').insert([{
      member_id:    member.id,
      phone:        member.phone,
      message_text: message,
      status:       'sent',
    }]);

    return res.status(200).json({
      message:      'WhatsApp message sent successfully!',
      payment_link: paymentLink,
    });

  } catch (err) {

    // Save failed log in database
    await supabase.from('whatsapp_logs').insert([{
      member_id:    member.id,
      phone:        member.phone,
      message_text: message,
      status:       'failed',
    }]);

    return res.status(500).json({ error: 'Error sending WhatsApp message.' });
  }
};

// ── SEND TO ALL MEMBERS OF A GROUP ─────────
const sendToAllMembers = async (req, res) => {

  const { groupId } = req.params;

  const { data: members, error } = await supabase
    .from('members')
    .select('*, groups(name)')
    .eq('group_id', groupId);

  if (error || !members || members.length === 0) {
    return res.status(404).json({ error: 'No members found in this group.' });
  }

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  const results = [];

  for (const member of members) {

    // ── Check if payment is already confirmed ──
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('member_id', member.id)
      .single();

    if (payment && payment.status === 'confirmed') {
      results.push({ member: member.name, phone: member.phone, status: 'skipped', reason: 'already paid' });
      continue; // Skip this member and go to next
    }

    // ── Check if message was already sent today ──
    const { data: recentLog } = await supabase
      .from('whatsapp_logs')
      .select('id')
      .eq('member_id', member.id)
      .eq('status', 'sent')
      .gte('sent_at', `${today}T00:00:00`)
      .single();

    if (recentLog) {
      results.push({ member: member.name, phone: member.phone, status: 'skipped', reason: 'already sent today' });
      continue; // Skip this member and go to next
    }

    // ── Send the message ──
    const paymentLink = `${FRONTEND_URL}/pagar.html?token=${member.payment_token}`;
    const message     = buildMessage(member, members[0].groups.name, paymentLink);

    try {
      await sendWhatsAppMessage(member.phone, message);

      await supabase.from('whatsapp_logs').insert([{
        member_id:    member.id,
        phone:        member.phone,
        message_text: message,
        status:       'sent',
      }]);

      results.push({ member: member.name, phone: member.phone, status: 'sent' });

      // Wait 1.5 seconds between messages to avoid spam detection
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch {
      await supabase.from('whatsapp_logs').insert([{
        member_id:    member.id,
        phone:        member.phone,
        message_text: message,
        status:       'failed',
      }]);

      results.push({ member: member.name, phone: member.phone, status: 'failed' });
    }
  }

  return res.status(200).json({ message: 'Messages processed!', results });
};

// ── GET WHATSAPP LOGS ───────────────────────
// Returns all sent message logs for the admin.
const getLogs = async (req, res) => {

  const { data, error } = await supabase
    .from('whatsapp_logs')
    .select('*, members(name, phone)')
    .order('sent_at', { ascending: false })
    .limit(100);

  if (error) {
    return res.status(500).json({ error: 'Error fetching logs.' });
  }

  return res.status(200).json(data);
};

module.exports = { sendPaymentLink, sendToAllMembers, getLogs };