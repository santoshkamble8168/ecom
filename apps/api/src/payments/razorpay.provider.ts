import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { RAZORPAY_MODE, toPaise } from "./policies/payment.policy";

export interface RazorpayOrderResult {
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  mock: boolean;
}

@Injectable()
export class RazorpayProvider {
  isMockMode(): boolean {
    return RAZORPAY_MODE === "mock" || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;
  }

  getKeyId(): string {
    return process.env.RAZORPAY_KEY_ID || "rzp_test_mock_key";
  }

  getKeySecret(): string {
    return process.env.RAZORPAY_KEY_SECRET || "mock_razorpay_secret";
  }

  getWebhookSecret(): string {
    return process.env.RAZORPAY_WEBHOOK_SECRET || this.getKeySecret();
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
        keyId: this.getKeyId(),
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
}
