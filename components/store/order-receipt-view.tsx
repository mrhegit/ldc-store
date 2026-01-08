"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { FileDown, Link2, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatLocalTime } from "@/lib/time";

export type OrderReceiptViewData = {
  orderNo: string;
  productName: string;
  totalAmount: string;
  paidAt: Date | null;
  username: string | null;
  tradeNo: string | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="min-w-0 flex-1 text-right font-mono text-xs text-zinc-900 break-all">
        {value}
      </div>
    </div>
  );
}

export function OrderReceiptView({ receipt }: { receipt: OrderReceiptViewData }) {
  const posterRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const siteName = useMemo(
    () => process.env.NEXT_PUBLIC_SITE_NAME || "LDC Store",
    []
  );

  const paidAtText = receipt.paidAt ? formatLocalTime(receipt.paidAt) : "—";
  const username = receipt.username?.trim() ? receipt.username.trim() : "—";
  const tradeNo = receipt.tradeNo?.trim() ? receipt.tradeNo.trim() : "—";

  useEffect(() => {
    // 为什么这样做：确保服务端渲染与首屏 hydration 输出一致，避免因为 window 访问导致的 hydration mismatch。
    setShareUrl(
      `${window.location.origin}/order/receipt/${encodeURIComponent(
        receipt.orderNo
      )}`
    );
  }, [receipt.orderNo]);

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("已复制分享链接");
    } catch {
      toast.error("复制失败，请手动复制地址栏链接");
    }
  };

  const downloadPoster = async () => {
    if (!posterRef.current) return;

    setIsDownloading(true);
    try {
      // 为什么这样做：
      // - 海报是“对外发送”的内容，强制白底能避免深色模式截图/导出后可读性变差
      // - 提升 pixelRatio 可减少文字锯齿，便于客服核验
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `payment-receipt_${receipt.orderNo}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("已开始下载海报");
    } catch (error) {
      console.error("downloadPoster failed:", error);
      toast.error("导出失败，请改用截图或复制链接");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-lg font-semibold">支付成功凭证</h1>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                用于客服核验/对外分享（不包含卡密）
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Paid
            </Badge>
          </div>

          <div
            ref={posterRef}
            className="rounded-xl border bg-white p-5 text-zinc-900 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{siteName}</div>
              <div className="text-[11px] text-zinc-500">Payment Receipt</div>
            </div>
            <div className="mt-4 space-y-3 border-t pt-4">
              <Field label="订单号" value={receipt.orderNo} />
              <Field label="商品" value={receipt.productName} />
              <Field label="金额" value={`${receipt.totalAmount} LDC`} />
              <Field label="支付时间" value={paidAtText} />
              <Field label="用户名" value={username} />
              <Field label="tradeNo" value={tradeNo} />
            </div>
            <div className="mt-4 text-[11px] leading-relaxed text-zinc-500">
              说明：该凭证仅用于信息展示与便捷分享，最终核验以平台订单与后台记录为准。
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={copyShareLink} disabled={!shareUrl}>
              <Link2 className="mr-2 h-4 w-4" />
              复制链接
            </Button>
            <Button onClick={downloadPoster} disabled={isDownloading}>
              <FileDown className="mr-2 h-4 w-4" />
              {isDownloading ? "导出中..." : "下载海报"}
            </Button>
          </div>

          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/order/my">我的订单</Link>
            </Button>
            <Button asChild variant="ghost" className="flex-1">
              <Link href="/">首页</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
