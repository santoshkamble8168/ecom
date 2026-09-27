import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { isRazorpayMockMode, toPaise } from "./policies/payment.policy";

export interface RazorpayOrderResult {
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  mock: boolean;
}

export interface RazorpayPaymentResult {
  id: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  status: string;
}

@Injectable()
export class RazorpayProvider {
  isMockMode(): boolean {
    return isRazorpayMockMode();
  }

  getKeyId(): string {
    return this.requireCredential("RAZORPAY_KEY_ID");
  }

  getKeySecret(): string {
    return this.requireCredential("RAZORPAY_KEY_SECRET");
  }

  getWebhookSecret(): string {
    return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";
  }

  async createOrder(params: {
    amount: number;
    currency: string;
    receipt: string;
  }): Promise<RazorpayOrderResult> {
    if (this.isMockMode()) {
      return {
        providerOrderId: `order_mock_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
        amountPaise: toPaise(params.amount),
        currency: params.currency,
        keyId: "",
        mock: true,
      };
    }

    // Live/test mode: call Razorpay Orders API
    const auth = Buffer.from(`${this.getKeyId()}:${this.getKeySecret()}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: toPaise(params.amount),
        currency: params.currency,
        receipt: params.receipt,
        payment_capture: 1,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Razorpay order create failed: ${text}`);
    }

    const data = (await response.json()) as { id: string; amount: number; currency: string };
    return {
      providerOrderId: data.id,
      amountPaise: data.amount,
      currency: data.currency,
      keyId: this.getKeyId(),
      mock: false,
    };
  }

  async refundPayment(params: {
    providerPaymentId: string;
    amountPaise: number;
    notes?: Record<string, string>;
  }): Promise<{ providerRefundId: string; mock: boolean }> {
    if (this.isMockMode()) {
      return { providerRefundId: `rfnd_mock_${randomUUID().replace(/-/g, "").slice(0, 14)}`, mock: true };
    }

    const auth = Buffer.from(`${this.getKeyId()}:${this.getKeySecret()}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${params.providerPaymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: params.amountPaise, notes: params.notes ?? {} }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Razorpay refund failed: ${text}`);
    }

    const data = (await response.json()) as { id: string };
    return { providerRefundId: data.id, mock: false };
  }

  async fetchPayment(providerPaymentId: string): Promise<RazorpayPaymentResult> {
    if (this.isMockMode()) {
      throw new Error("Razorpay payment lookup is not available in mock mode");
    }

    const auth = Buffer.from(`${this.getKeyId()}:${this.getKeySecret()}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${providerPaymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Razorpay payment lookup failed: ${text}`);
    }

    const data = (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
      order_id: string;
      status: string;
    };
    return {
      id: data.id,
      orderId: data.order_id,
      amountPaise: data.amount,
      currency: data.currency,
      status: data.status,
    };
  }

  private requireCredential(name: "RAZORPAY_KEY_ID" | "RAZORPAY_KEY_SECRET"): string {
    const value = process.env[name]?.trim();
    if (!value) {
      throw new Error(`${name} is required when Razorpay is not in mock mode`);
    }
    return value;
  }
}
