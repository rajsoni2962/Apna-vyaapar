const fetch = globalThis.fetch || require('node-fetch');

async function testWhatsAppShare() {
  console.log('--- Testing WhatsApp Customer Bill Sharing Workflow ---');
  const baseUrl = 'http://localhost:3000';

  // 1. Fetch invoices
  const invoicesRes = await fetch(`${baseUrl}/api/invoices`);
  const invoicesData = await invoicesRes.json();

  if (!invoicesData.success || invoicesData.data.length === 0) {
    console.error('No invoices found to test with.');
    process.exit(1);
  }

  const testInvoice = invoicesData.data[0];
  console.log(`Using Invoice: ${testInvoice.invoiceNumber} (ID: ${testInvoice.id})`);
  console.log(`Customer: ${testInvoice.customer?.name} (Phone: ${testInvoice.customer?.phone || 'none'})`);

  // 2. Test Phone Normalization
  const rawNumber = '9825000000';
  let cleaned = rawNumber.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  console.log(`Phone normalization test: ${rawNumber} -> ${cleaned}`);
  if (cleaned !== '919825000000') {
    throw new Error('Phone normalization failed');
  }

  // 3. Post a share log
  const sharePayload = {
    channel: 'WHATSAPP',
    recipient: cleaned,
    customerName: testInvoice.customer?.name || 'Test Customer',
    updateCustomerPhone: !testInvoice.customer?.phone,
  };

  console.log('Sending POST /api/invoices/' + testInvoice.id + '/share ...');
  const shareRes = await fetch(`${baseUrl}/api/invoices/${testInvoice.id}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sharePayload),
  });

  const shareJson = await shareRes.json();
  console.log('Share Response:', shareJson);
  if (!shareJson.success || !shareJson.data.shareLog?.id) {
    throw new Error('Failed to record WhatsApp share log');
  }
  console.log(`Share log recorded with status: "${shareJson.data.shareLog.status}"`);

  // 4. Verify share history GET
  const historyRes = await fetch(`${baseUrl}/api/invoices/${testInvoice.id}/share`);
  const historyJson = await historyRes.json();
  console.log(`Invoice share logs count: ${historyJson.data?.length}`);
  const latestLog = historyJson.data[0];
  if (!latestLog || latestLog.channel.toLowerCase() !== 'whatsapp') {
    throw new Error('Share history does not contain logged WHATSAPP share');
  }
  console.log(`Verified logged share: [${latestLog.status}] to ${latestLog.recipient} at ${latestLog.sharedAt}`);

  // 5. Verify invoice has whatsappSharedAt
  const invoiceRes = await fetch(`${baseUrl}/api/invoices/${testInvoice.id}`);
  const invoiceJson = await invoiceRes.json();
  if (!invoiceJson.data.whatsappSharedAt) {
    throw new Error('whatsappSharedAt was not updated on invoice');
  }
  console.log(`Invoice whatsappSharedAt verified: ${invoiceJson.data.whatsappSharedAt}`);

  console.log('✅ ALL WHATSAPP SHARING TESTS PASSED SUCCESSFULLY!');
}

testWhatsAppShare().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
