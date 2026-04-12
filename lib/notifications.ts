import { prisma } from "@/lib/prisma";

/**
 * Create a notification for a user. Fire-and-forget safe — errors are swallowed.
 */
export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
  href?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        href: params.href ?? null,
      },
    });
  } catch (e) {
    console.error("createNotification error:", e);
  }
}
