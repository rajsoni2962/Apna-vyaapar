import { db } from '../src/lib/db';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../src/lib/auth-token';
import { verifySessionTokenEdge } from '../src/lib/auth-edge';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { POST as invoicePostHandler } from '../src/app/api/invoices/route';
import { PUT as invoicePutHandler, DELETE as invoiceDeleteHandler } from '../src/app/api/invoices/[id]/route';
import { POST as paymentPostHandler } from '../src/app/api/payments/route';
import { POST as customerPostHandler } from '../src/app/api/customers/route';
import { POST as productPostHandler } from '../src/app/api/products/route';
import { NextRequest } from 'next/server';

async function runSecurityAuditTests() {
  console.log('================================================================');
  console.log('🛡️  SECURITY AUDIT & ACCESS CONTROL VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, details || '');
      failed++;
    }
  }

  // 1. Password Hashing & Scrypt Verification
  console.log('--- 1. Cryptographic Password Hashing & Verification ---');
  const plainPass = 'admin123';
  const hashed = hashPassword(plainPass);
  assert(hashed.startsWith('scrypt$'), 'Password successfully hashed using scrypt format');
  assert(verifyPassword(plainPass, hashed), 'verifyPassword returns true for correct plaintext vs scrypt hash');
  assert(!verifyPassword('wrongpass', hashed), 'verifyPassword returns false for incorrect password');
  assert(verifyPassword('admin123', 'admin123'), 'verifyPassword supports backward-compatible legacy plaintext');

  // 2. Cryptographic HMAC Token Creation & Expiry
  console.log('\n--- 2. HMAC Session Token Generation & Verification ---');
  const testUser = { id: 'test-user-123', username: 'admin', role: 'admin' };
  const token = createSessionToken(testUser);
  assert(typeof token === 'string' && token.split('.').length === 3, 'Session token generated in 3-part signed format');
  const decoded = verifySessionToken(token);
  assert(decoded?.userId === 'test-user-123' && decoded?.username === 'admin', 'verifySessionToken decodes valid token payload');
  const edgeDecoded = await verifySessionTokenEdge(token);
  assert(edgeDecoded?.userId === 'test-user-123' && edgeDecoded?.username === 'admin', 'verifySessionTokenEdge (Web Crypto) decodes valid token payload identically');
  const tamperedToken = token.slice(0, -4) + 'abcd';
  assert(verifySessionToken(tamperedToken) === null, 'Tampered token is rejected');
  assert((await verifySessionTokenEdge(tamperedToken)) === null, 'verifySessionTokenEdge rejects tampered token');

  // 3. Unauthenticated Rejections on Protected Mutation Endpoints
  console.log('\n--- 3. Unauthenticated Mutation Endpoint Lockdown (Defense in Depth) ---');

  // 3a. Invoice Creation without Auth
  const unauthInvoiceReq = new NextRequest('http://localhost:3000/api/invoices', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'dummy-cust',
      items: [{ productId: 'dummy-prod', quantity: 1, rate: 100 }],
    }),
  });
  const unauthInvoiceRes = await invoicePostHandler(unauthInvoiceReq);
  const unauthInvoiceBody = await unauthInvoiceRes.json();
  assert(
    unauthInvoiceRes.status === 401 && unauthInvoiceBody.code === 'UNAUTHORIZED',
    'POST /api/invoices rejects unauthenticated requests with 401 Unauthorized'
  );

  // 3b. Invoice Edit without Auth
  const unauthPutReq = new NextRequest('http://localhost:3000/api/invoices/test-id', {
    method: 'PUT',
    body: JSON.stringify({ revisionReason: 'test unauthorized edit' }),
  });
  const unauthPutRes = await invoicePutHandler(unauthPutReq, { params: Promise.resolve({ id: 'test-id' }) });
  const unauthPutBody = await unauthPutRes.json();
  assert(
    unauthPutRes.status === 401 && unauthPutBody.code === 'UNAUTHORIZED',
    'PUT /api/invoices/[id] rejects unauthenticated requests with 401 Unauthorized'
  );

  // 3c. Invoice Delete without Auth
  const unauthDelReq = new NextRequest('http://localhost:3000/api/invoices/test-id', {
    method: 'DELETE',
  });
  const unauthDelRes = await invoiceDeleteHandler(unauthDelReq, { params: Promise.resolve({ id: 'test-id' }) });
  const unauthDelBody = await unauthDelRes.json();
  assert(
    unauthDelRes.status === 401 && unauthDelBody.code === 'UNAUTHORIZED',
    'DELETE /api/invoices/[id] rejects unauthenticated requests with 401 Unauthorized'
  );

  // 3d. Payment Creation without Auth
  const unauthPayReq = new NextRequest('http://localhost:3000/api/payments', {
    method: 'POST',
    body: JSON.stringify({ amount: 500 }),
  });
  const unauthPayRes = await paymentPostHandler(unauthPayReq);
  const unauthPayBody = await unauthPayRes.json();
  assert(
    unauthPayRes.status === 401 && unauthPayBody.code === 'UNAUTHORIZED',
    'POST /api/payments rejects unauthenticated requests with 401 Unauthorized'
  );

  // 3e. Customer Creation without Auth
  const unauthCustReq = new NextRequest('http://localhost:3000/api/customers', {
    method: 'POST',
    body: JSON.stringify({ name: 'Hacker', phone: '0000000000' }),
  });
  const unauthCustRes = await customerPostHandler(unauthCustReq);
  const unauthCustBody = await unauthCustRes.json();
  assert(
    unauthCustRes.status === 401 && unauthCustBody.code === 'UNAUTHORIZED',
    'POST /api/customers rejects unauthenticated requests with 401 Unauthorized'
  );

  // 3f. Product Creation without Auth
  const unauthProdReq = new NextRequest('http://localhost:3000/api/products', {
    method: 'POST',
    body: JSON.stringify({ name: 'Unauthorized Laptop', productType: 'PHYSICAL' }),
  });
  const unauthProdRes = await productPostHandler(unauthProdReq);
  const unauthProdBody = await unauthProdRes.json();
  assert(
    unauthProdRes.status === 401 && unauthProdBody.code === 'UNAUTHORIZED',
    'POST /api/products rejects unauthenticated requests with 401 Unauthorized'
  );

  // 4. Login Endpoint Verification
  console.log('\n--- 4. Authentication Login Route Verification ---');
  // 4a. Wrong credentials
  const badLoginReq = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'incorrect_password_xyz' }),
  });
  const badLoginRes = await loginHandler(badLoginReq);
  assert(badLoginRes.status === 401, 'POST /api/auth/login rejects incorrect password with 401');

  // 4b. Legitimate admin credentials
  // Ensure admin user exists in database
  let admin = await db.user.findFirst({ where: { role: 'admin' } });
  if (!admin) {
    admin = await db.user.create({
      data: {
        username: 'admin',
        name: 'Raj Soni',
        password: hashPassword('admin123'),
        role: 'admin',
      },
    });
  }

  const validLoginReq = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: admin.username, password: 'password123' }),
  });
  // If user has 'password123' or 'admin123', test matching password
  let goodLoginRes = await loginHandler(validLoginReq);
  if (goodLoginRes.status === 401) {
    // try fallback password 'admin123'
    const altReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: admin.username, password: 'admin123' }),
    });
    goodLoginRes = await loginHandler(altReq);
  }

  const goodLoginBody = await goodLoginRes.json();
  assert(goodLoginRes.status === 200 && goodLoginBody.success === true, 'POST /api/auth/login succeeds for valid admin credentials');
  assert(Boolean(goodLoginBody.token), 'Login response contains cryptographically signed session token');

  // 5. Authenticated Invoice Creation & Revision Audit Trail
  console.log('\n--- 5. Authenticated Invoice Creation & User Attribution ---');
  const sessionToken = goodLoginBody.token;

  // Find customer and product
  const customer = await db.customer.findFirst();
  const product = await db.product.findFirst({ where: { productType: 'PHYSICAL' } });

  if (customer && product) {
    const authInvoiceReq = new NextRequest('http://localhost:3000/api/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: customer.id,
        items: [
          {
            productId: product.id,
            description: `${product.name} (Security Verification Item)`,
            quantity: 1,
            rate: 5000,
            taxableAmount: 4237.29,
            gstAmount: 762.71,
            total: 5000,
          },
        ],
        subtotal: 5000,
        taxableAmount: 4237.29,
        cgst: 381.355,
        sgst: 381.355,
        grandTotal: 5000,
        paidAmount: 5000,
        paymentMode: 'Cash',
      }),
    });

    const authInvoiceRes = await invoicePostHandler(authInvoiceReq);
    const authInvoiceBody = await authInvoiceRes.json();
    assert(authInvoiceRes.status === 200 && authInvoiceBody.success === true, 'Authenticated invoice creation succeeded');

    if (authInvoiceBody.data?.id) {
      const createdId = authInvoiceBody.data.id;
      // Verify InvoiceRevisionAudit was created and attributed to authenticated user
      const auditLog = await db.invoiceRevisionAudit.findFirst({
        where: { invoiceId: createdId },
        orderBy: { createdAt: 'desc' },
      });

      assert(auditLog !== null, 'InvoiceRevisionAudit record automatically generated upon invoice creation');
      assert(auditLog?.changedBy === admin.username, `Audit record correctly attributed to authenticated user: ${auditLog?.changedBy}`);
      assert(auditLog?.action === 'CREATED_FINALIZED', `Audit record action is CREATED_FINALIZED: ${auditLog?.action}`);

      // Clean up the temporary verification invoice
      await db.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { invoiceId: createdId } });
        await tx.stockMovement.deleteMany({ where: { referenceId: createdId } });
        await tx.invoiceRevisionAudit.deleteMany({ where: { invoiceId: createdId } });
        await tx.invoiceItem.deleteMany({ where: { invoiceId: createdId } });
        await tx.invoice.delete({ where: { id: createdId } });
      });
      console.log('✓ Cleaned up temporary security verification test invoice.');
    }
  }

  // 6. Preservation of Legitimate Invoices and Unfamiliar Test Invoices
  console.log('\n--- 6. Data Integrity & Preservation Verification ---');
  const allInvoices = await db.invoice.findMany({
    select: { invoiceNumber: true, isDeleted: true, grandTotal: true },
    orderBy: { createdAt: 'asc' },
  });

  const legitimateInvoices = allInvoices.filter((i) => i.invoiceNumber.startsWith('AT/2026/'));
  const testInvoices = allInvoices.filter((i) =>
    ['NGST-573484', 'BOS-573296', 'IGST-573108', 'TI-572910', 'EST-573668'].includes(i.invoiceNumber)
  );

  assert(legitimateInvoices.length >= 3, `Legitimate invoices preserved: found ${legitimateInvoices.length} (${legitimateInvoices.map((i) => i.invoiceNumber).join(', ')})`);
  assert(testInvoices.length === 5, `All 5 unfamiliar test invoices intact (not automatically deleted per requirement 6): found ${testInvoices.length}`);

  // Summary
  console.log('\n================================================================');
  console.log(`SECURITY SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAuditTests()
  .catch((e) => {
    console.error('Fatal Security Test Suite Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
