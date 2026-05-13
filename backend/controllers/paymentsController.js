// =============================================
// FILE: controllers/paymentsController.js
// Contains all the logic for managing payments.
// Has two sides:
// 1. Public side → member uploads receipt via token
// 2. Admin side  → admin confirms and uploads invoice
// =============================================

const supabase = require('../config/supabaseClient');

// ── GET PAYMENT PAGE INFO (PUBLIC) ─────────
// Called when the member opens their payment link.
// Uses the payment token to find their info.
// No login required.
const getPaymentByToken = async (req, res) => {

  const { token } = req.params;

  // Find the member using their unique payment token
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, name, phone, individual_value, due_date, group_id')
    .eq('payment_token', token)
    .single();

  if (memberError || !member) {
    return res.status(404).json({ error: 'Payment link not found or expired.' });
  }

  // Get the group name
  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', member.group_id)
    .single();

  // Check if there is already a payment record for this member
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('member_id', member.id)
    .single();

  return res.status(200).json({
    member: {
      name: member.name,
      individual_value: member.individual_value,
      due_date: member.due_date,
      group_name: group ? group.name : 'Unknown',
    },
    payment: payment || null,
  });
};

// ── UPLOAD RECEIPT (PUBLIC) ─────────────────
// Called when the member uploads their receipt.
// Uses the payment token to identify the member.
// No login required.
const uploadReceipt = async (req, res) => {

  const { token } = req.params;

  // Check if a file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // Find the member using their payment token
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('payment_token', token)
    .single();

  if (memberError || !member) {
    return res.status(404).json({ error: 'Payment link not found or expired.' });
  }

  // Upload the file to Supabase Storage (receipts bucket)
  // Remove special characters and spaces from filename
const cleanFileName = req.file.originalname
   .normalize('NFD')
   .replace(/[\u0300-\u036f]/g, '') // Remove accents (ã → a, é → e)
   .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace special chars with underscore

const fileName = `${member.id}-${Date.now()}-${cleanFileName}`;

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('receipts')
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
    });
    console.log('Upload error:', uploadError);
    console.log('Upload data:', uploadData);

  if (uploadError) {
    return res.status(500).json({ error: 'Error uploading receipt.' });
  }

  // Get the public URL of the uploaded file
  const { data: urlData } = supabase
    .storage
    .from('receipts')
    .getPublicUrl(fileName);

  const receiptUrl = urlData.publicUrl;

  // Check if a payment record already exists for this member
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('member_id', member.id)
    .single();

  if (existingPayment) {
    // Update the existing payment record with the new receipt
    await supabase
      .from('payments')
      .update({ receipt_url: receiptUrl, status: 'pending' })
      .eq('member_id', member.id);
  } else {
    // Create a new payment record
    await supabase
      .from('payments')
      .insert([{ member_id: member.id, receipt_url: receiptUrl, status: 'pending' }]);
  }

  return res.status(200).json({
    message: 'Receipt uploaded successfully! Waiting for admin confirmation.',
    receipt_url: receiptUrl,
  });
};

// ── GET ALL PAYMENTS (ADMIN) ────────────────
// Returns all payments with member and group info.
// Admin only.
const getAllPayments = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        members (
          name,
          phone,
          individual_value,
          due_date,
          payment_token,
          groups (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error); // <-- vai aparecer no terminal
      return res.status(500).json({ error: 'Error fetching payments.' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Unexpected error:', err); // <-- vai aparecer no terminal
    return res.status(500).json({ error: 'Unexpected error.' });
  }
};

// ── CONFIRM PAYMENT (ADMIN) ─────────────────
// Admin confirms the payment and uploads the invoice.
// ── CONFIRM PAYMENT AND GENERATE INVOICE (ADMIN) ──
// Admin fills invoice details, system generates PDF automatically
const confirmPayment = async (req, res) => {

  const { id } = req.params;
  const {
    company_name,
    company_cnpj,
    items,
    is_installment,
    installment_info,
  } = req.body;

  // Validate required fields
  if (!company_name || !company_cnpj || !items || items.length === 0) {
    return res.status(400).json({ error: 'company_name, company_cnpj and items are required.' });
  }

  // Get payment with member and group info
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select(`*, members(name, phone, individual_value, due_date, payment_token, groups(name))`)
    .eq('id', id)
    .single();

  if (paymentError || !payment) {
    return res.status(404).json({ error: 'Payment not found.' });
  }

  // Generate invoice number (NF-YEAR-ID)
  const invoiceNumber = `NF-${new Date().getFullYear()}-${String(id).substring(0, 6).toUpperCase()}`;

  // Calculate total value from items
  const totalValue = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

  // Build invoice data
  const invoiceData = {
    invoiceNumber,
    companyName:     company_name,
    companyCNPJ:     company_cnpj,
    clientName:      payment.members.name,
    groupName:       payment.members.groups.name,
    items,
    totalValue,
    paymentDate:     new Date().toISOString().split('T')[0],
    dueDate:         payment.members.due_date,
    isInstallment:   is_installment || false,
    installmentInfo: installment_info || '',
  };

  try {
    // Generate the PDF
    const { generateInvoicePDF } = require('../utils/invoiceGenerator');
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    // Upload the PDF to Supabase Storage
    const fileName = `invoice-${id}-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase
      .storage
      .from('invoices')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });

    if (uploadError) {
      return res.status(500).json({ error: 'Error uploading invoice PDF.' });
    }

    // Get the public URL of the invoice
    const { data: urlData } = supabase
      .storage
      .from('invoices')
      .getPublicUrl(fileName);

    const invoiceUrl = urlData.publicUrl;

    // Update the payment as confirmed
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status:       'confirmed',
        invoice_url:  invoiceUrl,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Error confirming payment.' });
    }

    // Send invoice via WhatsApp if Z-API is configured
    const ZAPI_INSTANCE_ID  = process.env.ZAPI_INSTANCE_ID;
    const ZAPI_TOKEN        = process.env.ZAPI_TOKEN;
    const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;

    if (ZAPI_INSTANCE_ID && ZAPI_TOKEN && ZAPI_CLIENT_TOKEN) {
      try {
        // Send confirmation message with invoice link
        const message =
          `Olá, *${payment.members.name}*! ✅\n\n` +
          `Seu pagamento foi *confirmado* com sucesso!\n\n` +
          `🧾 *Nota Fiscal:* ${invoiceNumber}\n` +
          `💰 *Valor:* R$ ${totalValue.toFixed(2).replace('.', ',')}\n\n` +
          `Acesse sua nota fiscal pelo link:\n${invoiceUrl}\n\n` +
          `_SplitSync_ 🚀`;

        await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Client-Token': ZAPI_CLIENT_TOKEN,
          },
          body: JSON.stringify({
            phone:   payment.members.phone,
            message,
          }),
        });

        // Log the WhatsApp message
        await supabase.from('whatsapp_logs').insert([{
          member_id:    payment.members.id,
          phone:        payment.members.phone,
          message_text: message,
          status:       'sent',
        }]);

      } catch {
        // WhatsApp error doesn't block the confirmation
        console.log('WhatsApp notification failed but payment was confirmed.');
      }
    }

    return res.status(200).json({
      message:     'Payment confirmed and invoice generated!',
      payment:     updatedPayment,
      invoice_url: invoiceUrl,
      invoice_number: invoiceNumber,
    });

  } catch (err) {
    console.error('Error generating invoice:', err);
    return res.status(500).json({ error: 'Error generating invoice PDF.' });
  }
};

// ── REJECT PAYMENT (ADMIN) ──────────────────
// Admin rejects the payment if the receipt is invalid.
const rejectPayment = async (req, res) => {

  const { id } = req.params;

  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'rejected' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Error rejecting payment.' });
  }

  return res.status(200).json({
    message: 'Payment rejected.',
    payment: data,
  });
};

// Export all functions
module.exports = {
  getPaymentByToken,
  uploadReceipt,
  getAllPayments,
  confirmPayment,
  rejectPayment,
};