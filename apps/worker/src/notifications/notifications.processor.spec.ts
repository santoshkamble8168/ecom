import type { NotificationSendJob } from "@ecom/types";
import type { Job } from "bullmq";

import { sendEmail } from "./email.adapter";
import { NotificationsProcessor } from "./notifications.processor";
import { sendSms } from "./sms.adapter";
import { truncateDeliveryError } from "./notifications.constants";

jest.mock("./email.adapter", () => ({
  createMailTransport: jest.fn(() => ({})),
  sendEmail: jest.fn(),
}));

jest.mock("./sms.adapter", () => ({
  sendSms: jest.fn(),
}));

const sendEmailMock = sendEmail as jest.MockedFunction<typeof sendEmail>;
const sendSmsMock = sendSms as jest.MockedFunction<typeof sendSms>;

function job(data: NotificationSendJob, attemptsMade = 0, attempts = 5): Job<NotificationSendJob> {
  return {
    data,
    attemptsMade,
    opts: { attempts },
  } as Job<NotificationSendJob>;
}

describe("truncateDeliveryError", () => {
  it("redacts secrets and truncates", () => {
    expect(truncateDeliveryError("otpCode=999111 boom")).toContain("otpCode=[redacted]");
    expect(truncateDeliveryError("a".repeat(600)).length).toBe(500);
  });
});

describe("NotificationsProcessor", () => {
  let prisma: { deliveryLog: { update: jest.Mock } };
  let processor: NotificationsProcessor;

  beforeEach(() => {
    prisma = { deliveryLog: { update: jest.fn().mockResolvedValue({}) } };
    processor = new NotificationsProcessor(prisma as never);
    sendEmailMock.mockReset();
    sendSmsMock.mockReset();
  });

  it("marks email deliveries sent after SMTP success", async () => {
    sendEmailMock.mockResolvedValue("msg-1");

    await processor.process(
      job({
        deliveryLogId: "log-1",
        channel: "email",
        destination: "ada@example.com",
        subject: "Hi",
        body: "<p>Hi</p>",
      }),
    );

    expect(sendEmailMock).toHaveBeenCalled();
    expect(prisma.deliveryLog.update).toHaveBeenLastCalledWith({
      where: { id: "log-1" },
      data: expect.objectContaining({ status: "sent", providerMessageId: "msg-1" }),
    });
  });

  it("retries by rethrowing and only marks failed on the last attempt", async () => {
    sendEmailMock.mockRejectedValue(new Error("smtp down"));

    await expect(
      processor.process(
        job(
          {
            deliveryLogId: "log-1",
            channel: "email",
            destination: "ada@example.com",
            subject: "Hi",
            body: "<p>Hi</p>",
          },
          0,
          5,
        ),
      ),
    ).rejects.toThrow("smtp down");

    expect(prisma.deliveryLog.update).toHaveBeenLastCalledWith({
      where: { id: "log-1" },
      data: expect.objectContaining({ status: "queued", errorMessage: "smtp down" }),
    });

    await expect(
      processor.process(
        job(
          {
            deliveryLogId: "log-1",
            channel: "email",
            destination: "ada@example.com",
            subject: "Hi",
            body: "<p>Hi</p>",
          },
          4,
          5,
        ),
      ),
    ).rejects.toThrow("smtp down");

    expect(prisma.deliveryLog.update).toHaveBeenLastCalledWith({
      where: { id: "log-1" },
      data: expect.objectContaining({ status: "failed" }),
    });
  });

  it("records mock SMS as sent", async () => {
    sendSmsMock.mockResolvedValue({ status: "sent", providerMessageId: "mock-sms-1" });

    await processor.process(
      job({
        deliveryLogId: "log-sms",
        channel: "sms",
        destination: "+911234567890",
        subject: null,
        body: "code 1",
      }),
    );

    expect(prisma.deliveryLog.update).toHaveBeenLastCalledWith({
      where: { id: "log-sms" },
      data: expect.objectContaining({ status: "sent", providerMessageId: "mock-sms-1" }),
    });
  });
});
