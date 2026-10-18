import { pageContext } from "@/business-analysis/server/page-guard";
import { listMaterials } from "@/business-analysis/server/services/inventory-service";
import { listCostVersions, listProductsWithCosts } from "@/business-analysis/server/services/product-costing-service";
import { PageHeader } from "@/business-analysis/ui/kit";
import { ProductsView, type CostVersion, type ProductWithCost } from "@/business-analysis/ui/products-view";

export default async function ProductsPage() {
  const ctx = await pageContext();
  const [products, materials, costVersions] = await Promise.all([listProductsWithCosts(ctx), listMaterials(ctx), listCostVersions(ctx)]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Product costing" description="Recipes, material prices and the estimated cost of each frame. Price changes apply from their effective date; past orders keep their cost snapshot." />
      <ProductsView products={products as unknown as ProductWithCost[]} materials={materials} costVersions={costVersions as CostVersion[]} canWrite={ctx.can("writer")} />
    </div>
  );
}
