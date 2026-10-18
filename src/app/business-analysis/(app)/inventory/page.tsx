import { z } from "zod";
import { pageSchema } from "@/business-analysis/schemas";
import { pageContext } from "@/business-analysis/server/page-guard";
import { getInventorySnapshot, listMaterials, listMovements, listPurchaseOrders, listSuppliers } from "@/business-analysis/server/services/inventory-service";
import { listProductsWithCosts } from "@/business-analysis/server/services/product-costing-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";
import { ExportMenu } from "@/business-analysis/ui/export-menu";
import { InventoryView } from "@/business-analysis/ui/inventory-view";
import { PageHeader } from "@/business-analysis/ui/kit";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await pageContext();
  const q = pageSchema.extend({ materialId: z.string().uuid().optional().catch(undefined) }).parse(await searchParams);
  const { settings } = await getCurrentSettings(ctx);
  const [snapshot, movements, suppliers, purchaseOrders, materials, products] = await Promise.all([
    getInventorySnapshot(ctx, settings),
    listMovements(ctx, { materialId: q.materialId, page: 1, pageSize: 100 }),
    listSuppliers(ctx),
    listPurchaseOrders(ctx),
    listMaterials(ctx),
    listProductsWithCosts(ctx),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Inventory" description="Raw materials and finished goods from an auditable ledger. Stock is never overwritten — every change is a movement." actions={<ExportMenu report="inventory" formats={["csv", "xlsx", "pdf"]} />} />
      <InventoryView
        snapshot={snapshot}
        movements={movements.rows as never}
        movementTotal={movements.total}
        suppliers={suppliers}
        purchaseOrders={purchaseOrders as never}
        materials={materials.map((m) => ({ id: m.id, name: m.name, unit: m.unit }))}
        products={products.map((p) => ({ id: p.product.id, name: p.product.name, sku: p.product.sku }))}
        canWrite={ctx.can("writer")}
      />
    </div>
  );
}
