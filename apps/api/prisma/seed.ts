import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "catalog:read", description: "View catalog data" },
  { key: "catalog:write", description: "Manage catalog data" },
  { key: "order:read", description: "View orders" },
  { key: "order:write", description: "Manage orders" },
  { key: "admin:access", description: "Access the admin dashboard" },
];

const ROLES: Array<{ name: string; description: string; permissionKeys: string[] }> = [
  { name: "customer", description: "Storefront customer", permissionKeys: [] },
  {
    name: "admin",
    description: "Full administrative access",
    permissionKeys: PERMISSIONS.map((p) => p.key),
  },
  {
    name: "catalog_manager",
    description: "Manages catalog content",
    permissionKeys: ["catalog:read", "catalog:write"],
  },
];

const FEATURE_FLAGS = [
  { key: "search.meilisearch", isEnabled: false, description: "Enable Meilisearch-backed search" },
  { key: "payments.razorpay", isEnabled: false, description: "Enable Razorpay checkout" },
];

async function main() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }

  for (const role of ROLES) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });

    for (const permissionKey of role.permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key: permissionKey },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: createdRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: createdRole.id, permissionId: permission.id },
      });
    }
  }

  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { isEnabled: flag.isEnabled, description: flag.description },
      create: flag,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "admin" } });
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@ecom.local" },
    update: {},
    create: {
      email: "admin@ecom.local",
      displayName: "Development Admin",
      status: "active",
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete: roles, permissions, feature flags, and dev admin user are ready.");
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
