import { describe, it, expect } from "vitest";
import {
  calculateReorderPoint,
  calculateEconomicOrderQuantity,
  calculateDaysUntilStockout,
} from "@/core/inventoryCore";
import type { Product } from "@/core/schema";

const baseProduct = { id: 1, price: 1000 /* $10.00 en centavos */ } as Product;

describe("calculateReorderPoint", () => {
  it("calcula ROP = demanda*leadTime + stock de seguridad", () => {
    // demanda=2/día, leadTime=9 días => seguridad = 2*sqrt(9) = 6; rop = 18+6 = 24
    expect(calculateReorderPoint(baseProduct, 2, 9)).toBe(24);
  });
});

describe("calculateEconomicOrderQuantity", () => {
  it("retorna 0 cuando no hay demanda", () => {
    expect(calculateEconomicOrderQuantity(baseProduct, 0)).toBe(0);
  });

  it("calcula el EOQ para valores conocidos", () => {
    // precio $10 -> costo mantenimiento/unidad = $2/año; demanda 10/día -> demanda anual 3650
    // EOQ = sqrt(2*3650*10/2) = sqrt(36500) ~= 191.05 -> ceil 192
    expect(calculateEconomicOrderQuantity(baseProduct, 10)).toBe(192);
  });
});

describe("calculateDaysUntilStockout", () => {
  it("retorna 999 cuando no hay demanda (evita división por cero)", () => {
    expect(calculateDaysUntilStockout(50, 0)).toBe(999);
  });

  it("redondea hacia abajo stock/demanda", () => {
    expect(calculateDaysUntilStockout(50, 3)).toBe(16);
  });
});
