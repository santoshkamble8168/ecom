import { PrismaClient, type NotificationCategory, type NotificationChannel } from "@prisma/client";

type SeedTemplate = {
  id: string;
  key: string;
  name: string;
  description: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  requiredVariables: string[];
  subject: string | null;
  body: string;
};

const TEMPLATES: SeedTemplate[] = [
  {
    id: "ntpl-otp-email",
    key: "otp.email",
    name: "OTP email",
    description: "Sign-in one-time code",
    channel: "email",
    category: "transactional",
    requiredVariables: ["otpCode"],
    subject: "Your ECOM sign-in code",
    body: "<p>Your one-time code is <strong>{{otpCode}}</strong>. It expires in 10 minutes.</p><p>If you did not request this, ignore this email.</p>",
  },
  {
    id: "ntpl-otp-sms",
    key: "otp.sms",
    name: "OTP SMS",
    description: "Sign-in one-time code via SMS",
    channel: "sms",
    category: "transactional",
    requiredVariables: ["otpCode"],
    subject: null,
    body: "ECOM code: {{otpCode}}. Expires in 10 minutes.",
  },
  {
    id: "ntpl-order-confirmed",
    key: "order.confirmed.email",
    name: "Order confirmation",
    description: "Sent when payment is captured / COD is confirmed",
    channel: "email",
    category: "transactional",
    requiredVariables: ["orderNumber", "total"],
    subject: "Order {{orderNumber}} confirmed",
    body: "<p>Thanks for your order <strong>{{orderNumber}}</strong>.</p><p>Total: {{total}} {{currency}}</p><p><a href=\"{{orderUrl}}\">View order</a></p>",
  },
  {
    id: "ntpl-payment-failed",
    key: "payment.failed.email",
    name: "Payment failed",
    description: "Sent when a Razorpay attempt fails",
    channel: "email",
    category: "transactional",
    requiredVariables: ["orderRef"],
    subject: "Payment failed for {{orderRef}}",
    body: "<p>We could not complete payment for {{orderRef}}.</p><p>You can retry checkout with the same bag.</p>",
  },
  {
    id: "ntpl-shipment-updated",
    key: "shipment.updated.email",
    name: "Shipment update",
    description: "Sent when a shipment is created or tracking is added",
    channel: "email",
    category: "transactional",
    requiredVariables: ["orderNumber"],
    subject: "Update on order {{orderNumber}}",
    body: "<p>Shipment {{shipmentNumber}} for order {{orderNumber}} is on its way.</p><p>Tracking: {{trackingNumber}}</p>",
  },
  {
    id: "ntpl-return-updated",
    key: "return.updated.email",
    name: "Return update",
    description: "Sent when a return request changes status",
    channel: "email",
    category: "transactional",
    requiredVariables: ["orderNumber", "returnStatus"],
    subject: "Return update for order {{orderNumber}}",
    body: "<p>Your return for order {{orderNumber}} is now <strong>{{returnStatus}}</strong>.</p>",
  },
  {
    id: "ntpl-low-stock",
    key: "inventory.low_stock.email",
    name: "Low stock alert",
    description: "Operational alert to ops when SKUs drop to threshold",
    channel: "email",
    category: "operational",
    requiredVariables: ["skuCount"],
    subject: "Low stock: {{skuCount}} SKU(s)",
    body: "<p>{{skuCount}} stock item(s) are at or below their low-stock threshold. Review Inventory in admin.</p>",
  },
  {
    id: "ntpl-campaign-promo",
    key: "campaign.promo.email",
    name: "Campaign promo",
    description: "Marketing sample — requires email marketing opt-in",
    channel: "email",
    category: "marketing",
    requiredVariables: ["campaignName"],
    subject: "{{campaignName}} is live",
    body: "<p>{{campaignName}} is on now. Shop the collection: <a href=\"{{campaignUrl}}\">{{campaignUrl}}</a></p><p><a href=\"{{unsubscribeUrl}}\">Unsubscribe from marketing</a></p>",
  },
];

export async function seedNotifications(prisma: PrismaClient): Promise<void> {
  for (const template of TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { key: template.key },
      update: {
        name: template.name,
        description: template.description,
        channel: template.channel,
        category: template.category,
        status: "published",
        requiredVariables: template.requiredVariables,
      },
      create: {
        id: template.id,
        key: template.key,
        name: template.name,
        description: template.description,
        channel: template.channel,
        category: template.category,
        status: "published",
        requiredVariables: template.requiredVariables,
      },
    });

    const existing = await prisma.notificationTemplateVersion.findUnique({
      where: { templateId_version: { templateId: template.id, version: 1 } },
    });
    if (!existing) {
      await prisma.notificationTemplateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          subject: template.subject,
          body: template.body,
          createdBy: "seed",
        },
      });
    }
  }
}
