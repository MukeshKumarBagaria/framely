// Meesho supplier-panel order export.
//
// Known columns (2026): Reason for Credit Entry, Sub Order No, Catalog ID,
// Order Date, Order source, Customer State, Product Name, SKU, Size, Quantity,
// Supplier Listed Price (Incl. GST + Commission),
// Supplier Discounted Price (Incl GST and Commision), Packet Id.
//
// "Reason for Credit Entry" carries the order status (DELIVERED, CANCELLED,
// RTO_LOCKED, …). The two supplier price columns are the prices the order was
// listed and sold at — they are NOT what Meesho paid into the bank. Actual
// payouts and deductions come only from the payments/settlement report.
import { detectDateOrder, type DateOrder } from "../../domain/dates";
import { dec, money } from "../../domain/money";
import { normalizeOrderStatus, statusRank } from "../../domain/statuses";
import { orderLineSchema, type OrderLineRecord } from "../normalized";
import type { ImportAdapter, Issue } from "../types";
import { amount, checkNotFuture, columnValues, date, identifier, integer, text } from "./common";

export const meeshoOrdersAdapter: ImportAdapter<OrderLineRecord> = {
  reportType: "meesho_orders",
  platform: "meesho",
  label: "Meesho order report",
  description: "Orders and their current status, from Supplier Panel → Orders → Download.",
  fields: [
    { key: "status", label: "Reason for Credit Entry", kind: "text", required: true,
      aliases: ["Order Status", "Live Order Status", "Sub Order Status", "Status"],
      description: "Order status (DELIVERED, CANCELLED, RTO_LOCKED, …)" },
    { key: "sub_order_no", label: "Sub Order No", kind: "text", required: true,
      aliases: ["Sub Order No.", "Sub Order Number", "Suborder No", "Sub Order ID", "Suborder ID"] },
    { key: "catalog_id", label: "Catalog ID", kind: "text", aliases: ["Catalogue ID"] },
    { key: "order_date", label: "Order Date", kind: "date", required: true,
      aliases: ["Order Created Date", "Order Placed Date", "Created Date"] },
    { key: "order_source", label: "Order source", kind: "text", aliases: ["Order Source", "Source"] },
    { key: "customer_state", label: "Customer State", kind: "text", aliases: ["State", "Delivery State"] },
    { key: "product_name", label: "Product Name", kind: "text", aliases: ["Product", "Product Title"] },
    { key: "sku", label: "SKU", kind: "text", aliases: ["Supplier SKU", "Seller SKU", "SKU ID"] },
    { key: "size", label: "Size", kind: "text", aliases: ["Variation", "Variant"] },
    { key: "quantity", label: "Quantity", kind: "integer", required: true, aliases: ["Qty", "Units"] },
    { key: "listed_price", label: "Supplier Listed Price (Incl. GST + Commission)", kind: "amount",
      aliases: ["Supplier Listed Price", "Listed Price", "Listing Price"] },
    { key: "discounted_price", label: "Supplier Discounted Price (Incl GST and Commission)", kind: "amount", required: true,
      aliases: ["Supplier Discounted Price (Incl GST and Commision)", "Supplier Discounted Price", "Discounted Price", "Selling Price"] },
    { key: "packet_id", label: "Packet Id", kind: "text", aliases: ["Packet ID", "Packet No"] },
    { key: "delivered_date", label: "Delivered Date", kind: "date", aliases: ["Delivery Date", "Delivered On"] },
  ],
  optionDefs: [
    {
      key: "priceBasis",
      label: "Price columns are",
      default: "per_unit",
      choices: [
        { value: "per_unit", label: "Per unit (multiply by quantity)" },
        { value: "line_total", label: "Already the total for the sub-order" },
      ],
    },
    {
      key: "dateOrder",
      label: "Numeric dates are written",
      default: "auto",
      choices: [
        { value: "auto", label: "Detect automatically" },
        { value: "dmy", label: "Day first (DD-MM-YYYY)" },
        { value: "mdy", label: "Month first (MM-DD-YYYY)" },
      ],
    },
  ],

  prepare(rows, ctx) {
    const warnings: Issue[] = [];
    const configured = String(ctx.options.dateOrder ?? ctx.settings.imports.meeshoOrders.dateOrder);
    let order: DateOrder = configured === "mdy" ? "mdy" : "dmy";
    if (configured === "auto") {
      const detected = detectDateOrder([...columnValues(rows, "order_date"), ...columnValues(rows, "delivered_date")]);
      order = detected.order;
      if (detected.conflicting) {
        warnings.push({ code: "date_order_conflict", message: "Dates in this file are written both day-first and month-first. Choose the date order explicitly." });
      } else if (detected.order === "mdy") {
        warnings.push({ code: "date_order_mdy", message: "Dates were detected as month-first (MM-DD-YYYY)." });
      }
    }
    return { file: { dateOrder: order }, warnings };
  },

  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const order = (ctx.file.dateOrder as DateOrder) ?? "dmy";
    const priceBasis = String(ctx.options.priceBasis ?? ctx.settings.imports.meeshoOrders.priceBasis) === "line_total" ? "line_total" : "per_unit";

    const lineId = identifier(row, "sub_order_no");
    if (!lineId) errors.push({ code: "missing_value", field: "sub_order_no", message: "Sub Order No is missing" });
    else if (!/^[A-Za-z0-9_\-]{3,100}$/.test(lineId)) {
      errors.push({ code: "invalid_identifier", field: "sub_order_no", message: `Sub Order No "${lineId}" contains unexpected characters` });
    }

    const statusRaw = text(row, "status", 100);
    const status = normalizeOrderStatus(statusRaw, ctx.settings.imports.statusAliases);
    if (!statusRaw) errors.push({ code: "missing_value", field: "status", message: "Order status (Reason for Credit Entry) is missing" });
    else if (!status.recognized) {
      warnings.push({ code: "unknown_status", field: "status", message: `Status "${statusRaw}" is not recognised; the line is excluded from revenue until mapped in Settings.` });
    }

    const orderDate = date(row, "order_date", errors, "Order Date", order, ctx.timeZone, true);
    checkNotFuture(orderDate, ctx.today, "Order Date", errors, "order_date");
    const deliveredOn = date(row, "delivered_date", warnings, "Delivered Date", order, ctx.timeZone);
    const quantity = integer(row, "quantity", errors, "Quantity", { required: true, min: 1, max: 10_000 });

    const listed = amount(row, "listed_price", errors, "Supplier Listed Price");
    const discounted = amount(row, "discounted_price", errors, "Supplier Discounted Price", true);
    if (listed && dec(listed).isNegative()) errors.push({ code: "negative_amount", field: "listed_price", message: "Supplier Listed Price is negative" });
    if (discounted && dec(discounted).isNegative()) errors.push({ code: "negative_amount", field: "discounted_price", message: "Supplier Discounted Price is negative" });
    if (listed && discounted && dec(listed).lessThan(discounted)) {
      warnings.push({ code: "listed_below_discounted", message: "Listed price is lower than the discounted price." });
    }
    if (!listed && discounted) {
      warnings.push({ code: "listed_missing", field: "listed_price", message: "No listed price; the discounted price is used for gross order value." });
    }
    if (quantity && quantity > 1) {
      warnings.push({
        code: "price_basis_assumed",
        field: "quantity",
        message: priceBasis === "per_unit"
          ? `Quantity is ${quantity}: prices were treated as per unit and multiplied. Change "Price columns are" if they are line totals.`
          : `Quantity is ${quantity}: prices were treated as the sub-order total.`,
      });
    }

    if (errors.length > 0 || !lineId || !orderDate || !quantity || !discounted) {
      return { record: null, errors, warnings, naturalKey: lineId ?? undefined };
    }

    const factor = priceBasis === "per_unit" ? quantity : 1;
    const listedUnit = listed ?? discounted;
    // Meesho sub-order numbers are "<order no>_<line>"; the order is the prefix.
    const orderId = /^(.+)_\d+$/.exec(lineId)?.[1] ?? lineId;

    const record: OrderLineRecord = {
      kind: "order_line",
      channel: "meesho",
      external_order_id: orderId,
      external_line_id: lineId,
      order_date: orderDate,
      delivered_on: deliveredOn,
      status: status.status,
      raw_status: status.raw,
      sku: text(row, "sku", 100),
      product_name: text(row, "product_name", 500),
      size: text(row, "size", 100),
      catalog_id: identifier(row, "catalog_id"),
      packet_id: identifier(row, "packet_id"),
      customer_state: text(row, "customer_state", 100),
      order_source: text(row, "order_source", 100),
      quantity,
      listed_unit_price: listed,
      discounted_unit_price: discounted,
      listed_amount: money(dec(listedUnit).times(factor)),
      sale_amount: money(dec(discounted).times(factor)),
      price_basis: priceBasis,
    };
    const valid = orderLineSchema.safeParse(record);
    if (!valid.success) {
      return {
        record: null,
        errors: valid.error.issues.map((i) => ({ code: "invalid_record", field: String(i.path[0] ?? ""), message: `${String(i.path.join("."))}: ${i.message}` })),
        warnings,
        naturalKey: lineId,
      };
    }
    return { record: valid.data, errors, warnings, naturalKey: lineId, rank: statusRank(status.status) };
  },
};
