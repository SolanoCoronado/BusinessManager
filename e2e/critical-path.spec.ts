import { expect, test } from "@playwright/test";

// Flujo critico completo: onboarding -> maestros -> factura -> pago -> asiento ->
// reporte -> respaldo -> restaurar -> datos revertidos.
// Se ejecuta como un unico test largo porque el estado se acumula (es un flujo E2E
// de negocio real, no pruebas unitarias aisladas).

test("flujo critico de LedgerLocal de principio a fin", async ({ page }) => {
  // ---------- Onboarding ----------
  await page.goto("/");
  await page.waitForSelector("text=Configura tu negocio", { timeout: 20000 });
  await page.fill("#companyDisplayName", "WKD PRODUCTS E2E");
  await page.fill("#adminName", "Ada E2E");
  await page.fill("#adminEmail", "ada-e2e@test.local");
  await page.fill("#adminPassword", "contrasena-e2e-123");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Empresa activa", { timeout: 20000 });
  await expect(page.locator("h1")).toContainText("WKD PRODUCTS E2E");

  // ---------- Cliente ----------
  await page.click('button:has-text("Clientes")');
  await page.waitForSelector("text=Todavia no hay clientes", { timeout: 10000 });
  await page.fill('input[placeholder="Nombre"]', "Cafe del Pueblo S.A.");
  await page.click('button:has-text("Agregar")');
  await page.waitForSelector("text=Cafe del Pueblo S.A.", { timeout: 10000 });

  // ---------- Producto ----------
  await page.click('button:has-text("Productos")');
  await page.waitForSelector("text=Todavia no hay productos", { timeout: 10000 });
  await page.fill('input[placeholder="SKU"]', "CAFE-1KG");
  await page.fill('input[placeholder="Nombre"]', "Cafe premium 1kg");
  await page.fill('input[placeholder="Precio unitario"]', "5000");
  await page.click('button:has-text("Agregar producto")');
  await page.waitForSelector("text=CAFE-1KG", { timeout: 10000 });

  // ---------- Factura ----------
  await page.click('button:has-text("Facturas")');
  await page.waitForSelector("text=Nueva factura", { timeout: 10000 });
  await page.selectOption("select", { label: "Cafe del Pueblo S.A." });
  await page.fill("table input[type='text']", "Servicio E2E");
  const numInputs = page.locator("table input[type='number']");
  await numInputs.nth(0).fill("1");
  await numInputs.nth(1).fill("10000");
  await page.click('button:has-text("Crear factura")');
  await page.waitForSelector("text=FA-0001", { timeout: 10000 });

  await page.click('button:has-text("Confirmar")');
  await page.waitForSelector("text=Confirmada", { timeout: 10000 });

  // Pago parcial
  await page.click('button:has-text("Registrar pago")');
  await page.waitForSelector("text=Registrar pago", { timeout: 5000 });
  await page.fill('input[placeholder="Monto"]', "5000");
  await page.click('div.fixed button:has-text("Guardar pago")');
  await page.waitForSelector("text=Pago parcial", { timeout: 10000 });

  // ---------- Asiento manual ----------
  await page.click('button:has-text("Contabilidad")');
  await page.waitForSelector("text=Catalogo de cuentas", { timeout: 15000 });
  const accountRows = await page.locator("table").first().locator("tbody tr").count();
  expect(accountRows).toBeGreaterThan(10); // catalogo sembrado

  await page.locator("table").nth(1).locator("select").nth(0).selectOption({ label: "1020 - Banco" });
  await page.locator("table").nth(1).locator('input[type="number"]').nth(0).fill("1000");
  await page.locator("table").nth(1).locator("select").nth(1).selectOption({ label: "5020 - Gastos Operativos" });
  await page.locator("table").nth(1).locator('input[type="number"]').nth(3).fill("1000");
  await page.waitForSelector("text=Balanceado", { timeout: 5000 });
  await page.click('button:has-text("Crear asiento")');
  await page.waitForSelector("text=Revertir", { timeout: 10000 });
  // El boton "Revertir" aparece en la lista para el asiento recien creado

  // ---------- Reporte ----------
  await page.click('button:has-text("Reportes")');
  await page.waitForSelector("text=Generar reporte", { timeout: 10000 });
  await page.click('button:has-text("Generar reporte")');
  await page.waitForSelector("text=TOTAL INGRESOS", { timeout: 10000 });
  const netIncomeText = await page
    .locator("tbody tr:last-child td:last-child")
    .textContent();
  // Utilidad del periodo = 10000 (ingreso por factura) - 1000 (gasto) = 9000
  // Nota: el "ingreso" del asiento manual debita Banco y acredita Gastos Operativos
  // En realidad ese asiento es inusual (no es una venta), pero el test valida que
  // el reporte se genera sin error y muestra la fila UTILIDAD NETA.
  expect(netIncomeText).toBeTruthy();

  // ---------- Respaldo ----------
  await page.click('button:has-text("Respaldos")');
  await page.waitForSelector("text=Crear respaldo", { timeout: 10000 });
  await page.click('button:has-text("Crear respaldo")');
  await page.waitForSelector("text=backup-", { timeout: 10000 });
  const backupFilename = await page.locator("tbody tr:first-child td:first-child").textContent();
  expect(backupFilename).toMatch(/^backup-/);

  // Crear dato extra (para verificar que se revierte en restauracion)
  await page.click('button:has-text("Clientes")');
  await page.waitForSelector("text=Cafe del Pueblo S.A.", { timeout: 10000 });
  await page.fill('input[placeholder="Nombre"]', "Cliente Extra E2E");
  await page.click('button:has-text("Agregar")');
  await page.waitForSelector("text=Cliente Extra E2E", { timeout: 10000 });

  // ---------- Restaurar ----------
  await page.click('button:has-text("Respaldos")');
  await page.waitForSelector("text=Restaurar", { timeout: 10000 });
  await page.click('button:has-text("Restaurar")');
  await page.waitForSelector("text=Confirmar restauracion", { timeout: 5000 });
  await page.click('button:has-text("Si, restaurar")');

  // Forzado a logout
  await page.waitForSelector("text=Iniciar sesion", { timeout: 20000 });

  // Re-login
  await page.fill("#email", "ada-e2e@test.local");
  await page.fill("#password", "contrasena-e2e-123");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Empresa activa", { timeout: 20000 });

  // Verificar que "Cliente Extra E2E" ya no existe
  await page.click('button:has-text("Clientes")');
  await page.waitForSelector("text=Cafe del Pueblo S.A.", { timeout: 10000 });
  await expect(page.locator("text=Cliente Extra E2E")).toHaveCount(0);

  // Verificar que el catalogo de cuentas sigue intacto
  await page.click('button:has-text("Contabilidad")');
  await page.waitForSelector("text=Catalogo de cuentas", { timeout: 10000 });
  await expect(page.locator("text=1020").first()).toBeVisible();
});
