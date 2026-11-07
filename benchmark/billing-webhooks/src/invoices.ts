export interface Invoice {
  readonly amountCents: number;
  readonly customerId: string;
  readonly id: string;
  readonly refundedCents: number;
}

export class InvoiceStore {
  private readonly invoices = new Map<string, Invoice>();

  public get(invoiceId: string): Invoice | undefined {
    return this.invoices.get(invoiceId);
  }

  public record(invoice: Invoice): void {
    this.invoices.set(invoice.id, invoice);
  }

  /** A refund can never exceed what was paid on the invoice. */
  public refund(invoiceId: string, amountCents: number): Invoice | undefined {
    const invoice = this.invoices.get(invoiceId);
    if (invoice === undefined) return undefined;
    const refundedCents = Math.min(invoice.amountCents, invoice.refundedCents + amountCents);
    const updated = { ...invoice, refundedCents };
    this.invoices.set(invoiceId, updated);
    return updated;
  }
}
