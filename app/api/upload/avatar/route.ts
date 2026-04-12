import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  // Validate file size (2 MB max)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 2 MB" }, { status: 400 });
  }

  // Upload to Vercel Blob
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `avatars/${session.user.id}.${ext}`;

  const blob = await put(filename, file, {
    access: "public",
    addRandomSuffix: false, // overwrite same path = always latest avatar
  });

  // Save URL to user record
  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}
