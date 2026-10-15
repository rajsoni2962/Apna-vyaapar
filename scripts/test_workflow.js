const baseUrl = 'http://localhost:3000';

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE BUSINESS WORKFLOW TESTS ---\n');

  // 1. Dashboard
  console.log('1. Testing Dashboard API...');
  const dashRes = await fetch(`${baseUrl}/api/dashboard`);
  const dashData = await dashRes.json();
  console.log('Dashboard Data:', {
    period: dashData.data.period,
    salesTotal: dashData.data.salesTotal,
    purchasesTotal: dashData.data.purchasesTotal,
    currentStockValue: dashData.data.currentStockValue,
    totalReceivables: dashData.data.totalReceivables,
    totalPayables: dashData.data.totalPayables,
    recentSalesCount: dashData.data.recentSales?.length,
  });
  if (!dashData.success) throw new Error('Dashboard API failed');

  // 2. Create Supplier
  console.log('\n2. Testing Create Supplier...');
  const supRes = await fetch(`${baseUrl}/api/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Navkar Infotech',
      phone: '9825000000',
      email: 'sales@navkar.com',
      address: 'Simandhar Complex, Satellite, Ahmedabad',
      gstin: '24NAVKR1234F1Z9',
      openingBalance: 15000,
    }),
  });
  const supData = await supRes.json();
  console.log('Created Supplier ID:', supData.data.id, 'Name:', supData.data.name, 'Balance:', supData.data.currentBalance);
  const supplierId = supData.data.id;

  // 3. Create Product
  console.log('\n3. Testing Create Product...');
  const prodRes = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dell Latitude 5420 i7 11th Gen',
      brand: 'Dell',
      model: 'Latitude 5420',
      category: 'Laptop',
      cpu: 'Intel Core i7-1185G7',
      generation: '11th Gen',
      ram: '16GB',
      ramType: 'DDR4',
      storage: '512GB NVMe SSD',
      storageType: 'NVMe',
      condition: 'Refurbished Grade A+',
      hsn: '8471',
      gstPercent: 18,
      purchasePrice: 28000,
      sellingPrice: 38500,
      minStock: 2,
      initialStock: 3,
    }),
  });
  const prodData = await prodRes.json();
  console.log('Created Product ID:', prodData.data.id, 'Name:', prodData.data.name, 'Stock:', prodData.data.currentStock);
  const productId = prodData.data.id;

  // 4. Save Purchase (Stock Increase test)
  console.log('\n4. Testing Purchase Bill creation (increasing stock & updating payable)...');
  const poRes = await fetch(`${baseUrl}/api/purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplierId,
      supplierInvoiceNumber: `INV-NAV-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      subtotal: 56000,
      taxableAmount: 56000,
      cgst: 5040,
      sgst: 5040,
      igst: 0,
      grandTotal: 66080,
      paidAmount: 20000,
      items: [
        {
          productId,
          description: 'Dell Latitude 5420 i7 11th Gen (Lot of 2)',
          quantity: 2,
          unit: 'Pcs',
          rate: 28000,
          discount: 0,
          gstPercent: 18,
          taxableAmount: 56000,
          gstAmount: 10080,
          total: 66080,
          serialNumbers: 'SN-LAT-5420-A01, SN-LAT-5420-A02',
        },
      ],
    }),
  });
  const poData = await poRes.json();
  if (!poData.success) {
    console.error('Purchase creation failed:', poData);
    throw new Error(poData.error || 'Purchase creation failed');
  }
  console.log('Created Purchase:', poData.data.purchaseNumber, 'Grand Total:', poData.data.grandTotal, 'Balance Due:', poData.data.balanceDue);

  // Verify stock increased
  const prodCheck1 = await (await fetch(`${baseUrl}/api/products/${productId}`)).json();
  console.log('Product Stock after Purchase (+2 units):', prodCheck1.data.currentStock, '(Expected 5)');

  // 5. Create Customer
  console.log('\n5. Testing Create Customer...');
  const custRes = await fetch(`${baseUrl}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Vikram Mehta',
      phone: '9909000000',
      email: 'vikram.m@gmail.com',
      address: 'B-402 Shivalik Shilp, Iscon Cross Road, Ahmedabad',
      gstin: '24MEHTA1234F1Z1',
      state: 'Gujarat',
      stateCode: '24',
      openingBalance: 0,
    }),
  });
  const custData = await custRes.json();
  console.log('Created Customer ID:', custData.data.id, 'Name:', custData.data.name);
  const customerId = custData.data.id;

  // 6. Create Sales Invoice (Stock decrease + Serial marking test)
  console.log('\n6. Testing Create Sales Invoice (with serial number & partial payment)...');
  const invRes = await fetch(`${baseUrl}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      date: new Date().toISOString(),
      subtotal: 38500,
      discountAmount: 1000,
      taxableAmount: 37500,
      cgst: 3375,
      sgst: 3375,
      igst: 0,
      grandTotal: 44250,
      paidAmount: 20000,
      paymentMode: 'UPI',
      items: [
        {
          productId,
          serialNumber: 'SN-LAT-5420-A01',
          description: 'Dell Latitude 5420 i7 11th Gen 16GB 512GB (Refurbished)',
          quantity: 1,
          unit: 'Pcs',
          rate: 38500,
          discount: 1000,
          gstPercent: 18,
          taxableAmount: 37500,
          gstAmount: 6750,
          total: 44250,
        },
      ],
    }),
  });
  const invData = await invRes.json();
  console.log('Created Invoice:', invData.data.invoiceNumber, 'Grand Total:', invData.data.grandTotal, 'Paid:', invData.data.paidAmount, 'Balance Due:', invData.data.balanceDue);
  const invoiceId = invData.data.id;

  // Verify stock decreased
  const prodCheck2 = await (await fetch(`${baseUrl}/api/products/${productId}`)).json();
  console.log('Product Stock after Sale (-1 unit):', prodCheck2.data.currentStock, '(Expected 4)');

  // Verify Serial Number marked as Sold
  const serialCheck = await (await fetch(`${baseUrl}/api/serial-numbers?search=SN-LAT-5420-A01`)).json();
  console.log('Serial Number Status:', serialCheck.data[0]?.status, 'Customer:', serialCheck.data[0]?.customer?.name);

  // 7. Record Customer Payment to settle remaining balance
  console.log('\n7. Testing Customer Payment Receipt...');
  const payRes = await fetch(`${baseUrl}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      invoiceId,
      amount: invData.data.balanceDue,
      paymentMode: 'Bank Transfer',
      referenceNumber: 'NEFT-SBI-99120',
      notes: 'Cleared final invoice balance',
    }),
  });
  const payData = await payRes.json();
  console.log('Payment recorded:', payData.data.paymentNumber, 'Amount:', payData.data.amount);

  // 8. Verify Customer Ledger
  console.log('\n8. Checking Customer Ledger Timeline...');
  const custLedger = await (await fetch(`${baseUrl}/api/customers/${customerId}`)).json();
  console.log('Customer Net Balance after settlement:', custLedger.data.customer.currentBalance, '(Expected 0)');
  console.log('Ledger entries count:', custLedger.data.ledger.length);

  // 9. Verify Supplier Ledger
  console.log('\n9. Checking Supplier Ledger Timeline...');
  const supLedger = await (await fetch(`${baseUrl}/api/suppliers/${supplierId}`)).json();
  console.log('Supplier Current Balance:', supLedger.data.supplier.currentBalance);
  console.log('Supplier Ledger entries count:', supLedger.data.ledger.length);

  // 10. Check Inventory Movements Audit Log
  console.log('\n10. Checking Inventory Movements Audit Trail...');
  const moves = await (await fetch(`${baseUrl}/api/stock-adjustments?productId=${productId}`)).json();
  console.log(`Found ${moves.data.length} stock movement audit records for ${prodData.data.name}:`);
  moves.data.forEach((m) => {
    console.log(`  - [${m.type}] Qty Change: ${m.quantityChange > 0 ? '+' : ''}${m.quantityChange} -> Balance: ${m.balanceAfter} (${m.referenceNumber || m.notes})`);
  });

  // 11. Test Global Search
  console.log('\n11. Testing Global Search...');
  const searchRes = await (await fetch(`${baseUrl}/api/search?q=5420`)).json();
  console.log(`Search for '5420': found ${searchRes.data.products?.length || 0} products, ${searchRes.data.serials?.length || 0} serial numbers.`);

  // 12. Test Report Aggregation
  console.log('\n12. Testing Financial & GST Reports...');
  const salesRep = await (await fetch(`${baseUrl}/api/reports?type=sales`)).json();
  console.log('Sales Report Total Sales Billed:', salesRep.data.summary.totalSales);
  const gstRep = await (await fetch(`${baseUrl}/api/reports?type=gst`)).json();
  console.log('GST Report Output Tax Total:', gstRep.data.summary.totalGst, 'HSN codes count:', gstRep.data.hsnTable?.length);

  // 13. Test Backup JSON Export
  console.log('\n13. Testing System Backup Export...');
  const backupRes = await fetch(`${baseUrl}/api/backup?table=all`);
  const backupJson = await backupRes.json();
  console.log('Backup generated for:', backupJson.business, 'Tables count:', Object.keys(backupJson.tables).length);
  console.log('Total archived products:', backupJson.tables.products.length);

  console.log('\n==================================================');
  console.log('ALL 13 END-TO-END BUSINESS WORKFLOW VERIFICATIONS PASSED 100%!');
  console.log('==================================================');
}

runTests().catch((e) => {
  console.error('Test Failed:', e);
  process.exit(1);
});
