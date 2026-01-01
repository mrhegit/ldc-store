/**
 * Linux DO Credit 支付回调处理
 * 接收支付成功通知并更新订单状态
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySign, type NotifyParams } from "@/lib/payment/ldc";
import { handlePaymentSuccess } from "@/lib/actions/orders";
import { db, orders } from "@/lib/db";
import { eq } from "drizzle-orm";

function toCents(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // 提取回调参数
  const params: NotifyParams = {
    pid: searchParams.get("pid") || "",
    trade_no: searchParams.get("trade_no") || "",
    out_trade_no: searchParams.get("out_trade_no") || "",
    type: searchParams.get("type") || "",
    name: searchParams.get("name") || "",
    money: searchParams.get("money") || "",
    trade_status: searchParams.get("trade_status") || "",
    sign_type: searchParams.get("sign_type") || "",
    sign: searchParams.get("sign") || "",
  };

  // 验证必要参数
  if (!params.out_trade_no || !params.sign || !params.pid || !params.trade_no || !params.money) {
    console.error("支付回调缺少必要参数:", params);
    return new NextResponse("fail", { status: 400 });
  }

  // 验证签名算法
  if (params.sign_type && params.sign_type.toUpperCase() !== "MD5") {
    console.error("支付回调 sign_type 不支持:", params.sign_type);
    return new NextResponse("fail", { status: 400 });
  }

  // 验证签名
  const secret = process.env.LDC_CLIENT_SECRET;
  if (!secret) {
    console.error("LDC_CLIENT_SECRET 未配置");
    return new NextResponse("fail", { status: 500 });
  }

  // 验证商户号
  const merchantPid = process.env.LDC_CLIENT_ID;
  if (!merchantPid) {
    console.error("LDC_CLIENT_ID 未配置");
    return new NextResponse("fail", { status: 500 });
  }

  if (params.pid !== merchantPid) {
    console.error("支付回调 pid 不匹配:", {
      pid: params.pid,
      expected: merchantPid,
      out_trade_no: params.out_trade_no,
    });
    return new NextResponse("fail", { status: 400 });
  }

  if (!verifySign(params, secret)) {
    console.error("支付回调签名验证失败:", params);
    return new NextResponse("fail", { status: 400 });
  }

  // 验证订单与金额（防御式校验）
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNo, params.out_trade_no),
    columns: {
      id: true,
      status: true,
      totalAmount: true,
      paymentMethod: true,
      tradeNo: true,
    },
  });

  if (!order) {
    console.error("支付回调订单不存在:", params.out_trade_no);
    return new NextResponse("fail", { status: 400 });
  }

  if (order.paymentMethod !== "ldc") {
    console.error("支付回调支付方式不匹配:", {
      out_trade_no: params.out_trade_no,
      paymentMethod: order.paymentMethod,
    });
    return new NextResponse("fail", { status: 400 });
  }

  const expectedCents = toCents(order.totalAmount);
  const receivedCents = toCents(params.money);
  if (expectedCents === null || receivedCents === null || expectedCents !== receivedCents) {
    console.error("支付回调金额不匹配:", {
      out_trade_no: params.out_trade_no,
      expected: order.totalAmount,
      received: params.money,
    });
    return new NextResponse("fail", { status: 400 });
  }

  // 幂等：订单已处理则直接确认成功，避免支付平台重复通知
  if (order.status === "completed" || order.status === "paid") {
    return new NextResponse("success");
  }

  // 验证交易状态
  if (params.trade_status !== "TRADE_SUCCESS") {
    console.log("交易状态非成功:", params.trade_status);
    return new NextResponse("success");
  }

  // 非待支付状态不再重复处理（例如 expired/refunded）
  if (order.status !== "pending") {
    console.error("支付回调订单状态不可处理:", {
      out_trade_no: params.out_trade_no,
      status: order.status,
    });
    return new NextResponse("success");
  }

  // 处理支付成功
  try {
    const result = await handlePaymentSuccess(params.out_trade_no, params.trade_no);

    if (result) {
      console.log("订单支付成功处理完成:", params.out_trade_no);
      return new NextResponse("success");
    } else {
      // 兜底再查一次，避免并发/重复回调导致的误判
      const latest = await db.query.orders.findFirst({
        where: eq(orders.orderNo, params.out_trade_no),
        columns: { status: true },
      });
      if (latest?.status === "completed" || latest?.status === "paid") {
        return new NextResponse("success");
      }

      console.error("订单处理失败:", params.out_trade_no);
      return new NextResponse("fail", { status: 500 });
    }
  } catch (error) {
    console.error("处理支付回调异常:", error);
    return new NextResponse("fail", { status: 500 });
  }
}
