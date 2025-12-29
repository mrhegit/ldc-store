/**
 * 数据库种子脚本
 * 用于初始化示例数据
 *
 * 运行: pnpm db:seed
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

async function seed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL 环境变量未设置");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("🌱 开始初始化数据...");

  try {
    // 创建示例分类
    const existingCategories = await db.query.categories.findMany();
    if (existingCategories.length === 0) {
      await db.insert(schema.categories).values([
        {
          name: "游戏账号",
          slug: "game-accounts",
          description: "各类游戏账号",
          icon: "🎮",
          sortOrder: 1,
        },
        {
          name: "会员充值",
          slug: "membership",
          description: "各平台会员充值卡",
          icon: "💎",
          sortOrder: 2,
        },
        {
          name: "软件授权",
          slug: "software",
          description: "正版软件授权码",
          icon: "💻",
          sortOrder: 3,
        },
        {
          name: "其他",
          slug: "others",
          description: "其他虚拟商品",
          icon: "📦",
          sortOrder: 99,
        },
      ]);
      console.log("✅ 示例分类已创建");
    } else {
      console.log("ℹ️  分类已存在，跳过创建");
    }

    // 创建示例公告
    const existingAnnouncements = await db.query.announcements.findMany();
    if (existingAnnouncements.length === 0) {
      await db.insert(schema.announcements).values({
        title: "欢迎使用",
        content: "欢迎使用 LDC Store 自动发卡系统，购买商品后将自动发放卡密到您的邮箱。",
        isActive: true,
        sortOrder: 1,
      });
      console.log("✅ 示例公告已创建");
    }

    console.log("\n🎉 数据初始化完成!");
  } catch (error) {
    console.error("❌ 初始化失败:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
