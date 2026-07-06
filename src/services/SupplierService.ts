import { TRPCError } from "@trpc/server";
import type { ISupplierRepository, SupplierUpdate } from "@/repositories/SupplierRepository";
import type { Supplier, InsertSupplier } from "@/core/schema";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class SupplierService {
  constructor(private readonly supplierRepository: ISupplierRepository) {}

  list(): Promise<Supplier[]> {
    return this.supplierRepository.findAll();
  }

  async create(input: InsertSupplier): Promise<{ id: number }> {
    const email = input.email || null;
    if (email) await this.assertEmailIsValidAndUnique(email);

    const created = await this.supplierRepository.create({ ...input, email });
    return { id: created.id };
  }

  async update(id: number, input: SupplierUpdate): Promise<void> {
    if (input.email) {
      await this.assertEmailIsValidAndUnique(input.email, id);
    }
    await this.supplierRepository.update(id, input);
  }

  async delete(id: number): Promise<void> {
    await this.supplierRepository.delete(id);
  }

  /** Regla de negocio: el email del proveedor debe tener formato válido y ser único. */
  private async assertEmailIsValidAndUnique(email: string, excludingId?: number): Promise<void> {
    if (!EMAIL_REGEX.test(email)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "El formato del email del proveedor no es válido.",
      });
    }

    const existing = await this.supplierRepository.findByEmail(email);
    if (existing && existing.id !== excludingId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Ya existe un proveedor registrado con ese email.",
      });
    }
  }
}
