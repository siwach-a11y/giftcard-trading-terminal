import { prisma } from "@/database/prisma-client";

export class SettingsRepository {
  async get(key: string): Promise<string | undefined> {
    const row = await prisma.settings.findUnique({ where: { key } });
    return row?.value;
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.settings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async list(): Promise<Array<{ key: string; value: string }>> {
    return prisma.settings.findMany();
  }
}
