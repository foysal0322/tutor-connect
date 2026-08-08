/**
 * Shop event dispatcher — single entry point for all shop-originating
 * notifications. Bridges Phase 8 of the blueprint: in-app (createNotification),
 * transactional email (sendNoReplyEmail), and Discord ops webhooks
 * (notifyShop* helpers in src/lib/discord.ts).
 *
 * Failures here MUST NOT propagate to the caller — notifications are
 * best-effort. The business transaction has already committed by the time
 * this runs.
 */

import { createNotification } from '@/lib/notification';
import { sendNoReplyEmail } from '@/lib/mail';
import {
  notifyShopOrder,
  notifyShopDispute,
  notifyShopListingModerated,
} from '@/lib/discord';
import { formatBDT } from './service';

type Event =
  | 'order:placed'
  | 'order:shipped'
  | 'order:delivered'
  | 'order:completed'
  | 'order:cancelled'
  | 'order:refunded'
  | 'dispute:opened'
  | 'dispute:resolved'
  | 'listing:approved'
  | 'listing:rejected'
  | 'listing:reported'
  | 'review:received';

interface BasePayload {
  orderId?: string;
  listingTitle?: string;
}

export interface ShopEventPayload extends BasePayload {
  // Order
  buyerId?: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerId?: string;
  sellerName?: string;
  sellerEmail?: string;
  subtotal?: number;
  payoutBdt?: number;
  // Disputes / listings / reviews
  reason?: string;
  adminId?: string;
  fromUserName?: string;
  rating?: number;
  reportId?: string;
}

function actionUrl(orderId?: string): string | undefined {
  return orderId ? `/shop/orders/${orderId}` : undefined;
}

function emailWrapper(title: string, bodyLines: string[]): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111; margin: 0 0 16px;">${title}</h2>
      <div style="color: #333; line-height: 1.5; font-size: 14px;">
        ${bodyLines.map((l) => `<p style="margin: 0 0 12px;">${l}</p>`).join('')}
      </div>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
      <p style="color: #999; font-size: 12px;">NSUOne Shop — campus marketplace</p>
    </div>
  `;
}

export async function notifyShopEvent(
  event: Event,
  p: ShopEventPayload,
): Promise<void> {
  try {
    switch (event) {
      case 'order:placed': {
        // To buyer
        if (p.buyerId) {
          await createNotification(
            p.buyerId,
            'Order placed',
            `Your order for "${p.listingTitle ?? 'item'}" is confirmed. ${formatBDT(
              p.subtotal ?? 0,
            )} held in escrow.`,
            actionUrl(p.orderId),
          );
        }
        // To seller
        if (p.sellerId) {
          await createNotification(
            p.sellerId,
            'New order',
            `${p.buyerName ?? 'A buyer'} purchased "${p.listingTitle ?? 'your item'}". Mark it as shipped when ready.`,
            actionUrl(p.orderId),
          );
        }
        if (p.sellerEmail) {
          await sendNoReplyEmail({
            to: p.sellerEmail,
            subject: `New shop order — ${p.listingTitle ?? 'item'}`,
            html: emailWrapper('You have a new order', [
              `<strong>${p.buyerName ?? 'A buyer'}</strong> purchased <strong>${p.listingTitle ?? 'an item'}</strong>.`,
              `Escrow is holding ${formatBDT(p.subtotal ?? 0)}. Mark the order as shipped from your dashboard.`,
            ]),
          });
        }
        await notifyShopOrder({
          kind: 'placed',
          orderId: p.orderId ?? '',
          listingTitle: p.listingTitle,
          buyerName: p.buyerName,
          sellerName: p.sellerName,
          amount: p.subtotal ?? 0,
        });
        break;
      }

      case 'order:shipped': {
        if (p.buyerId) {
          await createNotification(
            p.buyerId,
            'Order shipped',
            `Your order for "${p.listingTitle ?? 'an item'}" has been shipped. Confirm delivery once you receive it.`,
            actionUrl(p.orderId),
          );
        }
        if (p.buyerEmail) {
          await sendNoReplyEmail({
            to: p.buyerEmail,
            subject: `Your order has shipped — ${p.listingTitle ?? 'item'}`,
            html: emailWrapper('Order shipped', [
              `The seller has marked your order for <strong>${p.listingTitle ?? 'an item'}</strong> as shipped.`,
              `Please confirm delivery from your orders page so the seller can be paid.`,
            ]),
          });
        }
        break;
      }

      case 'order:delivered': {
        if (p.sellerId) {
          await createNotification(
            p.sellerId,
            'Buyer confirmed delivery',
            `${p.listingTitle ?? 'Your item'} — the buyer confirmed receipt. Payout will be released once the order completes.`,
            actionUrl(p.orderId),
          );
        }
        if (p.sellerEmail) {
          await sendNoReplyEmail({
            to: p.sellerEmail,
            subject: `Delivery confirmed — ${p.listingTitle ?? 'item'}`,
            html: emailWrapper('Delivery confirmed', [
              `The buyer confirmed receipt of <strong>${p.listingTitle ?? 'your item'}</strong>.`,
              `Payout of ${formatBDT(p.payoutBdt ?? 0)} will be released to your wallet when the order completes.`,
            ]),
          });
        }
        break;
      }

      case 'order:completed': {
        if (p.sellerId) {
          await createNotification(
            p.sellerId,
            'Payout released',
            `${formatBDT(p.payoutBdt ?? 0)} from "${p.listingTitle ?? 'a sale'}" has been credited to your wallet.`,
            '/wallet',
          );
        }
        if (p.sellerEmail) {
          await sendNoReplyEmail({
            to: p.sellerEmail,
            subject: `Payout released — ${p.listingTitle ?? 'sale'}`,
            html: emailWrapper('Payout released', [
              `Your sale of <strong>${p.listingTitle ?? 'an item'}</strong> is complete.`,
              `${formatBDT(p.payoutBdt ?? 0)} has been credited to your wallet and is withdrawable from your earnings page.`,
            ]),
          });
        }
        break;
      }

      case 'order:cancelled': {
        if (p.buyerId) {
          await createNotification(
            p.buyerId,
            'Order cancelled',
            `Your order for "${p.listingTitle ?? 'an item'}" was cancelled. ${formatBDT(
              p.subtotal ?? 0,
            )} refunded to your wallet.`,
            '/wallet',
          );
        }
        if (p.sellerId) {
          await createNotification(
            p.sellerId,
            'Order cancelled',
            `The buyer cancelled the order for "${p.listingTitle ?? 'your item'}". Inventory restored.`,
            actionUrl(p.orderId),
          );
        }
        if (p.sellerEmail) {
          await sendNoReplyEmail({
            to: p.sellerEmail,
            subject: `Order cancelled — ${p.listingTitle ?? 'item'}`,
            html: emailWrapper('Order cancelled', [
              `The buyer cancelled the order for <strong>${p.listingTitle ?? 'an item'}</strong>.`,
              `Your inventory has been restored and the listing is active again.`,
            ]),
          });
        }
        break;
      }

      case 'order:refunded': {
        if (p.buyerId) {
          await createNotification(
            p.buyerId,
            'Refund processed',
            `${formatBDT(p.subtotal ?? 0)} refunded for "${p.listingTitle ?? 'an order'}".`,
            '/wallet',
          );
        }
        break;
      }

      case 'dispute:opened': {
        const counterpartyId =
          p.reason === 'buyer' ? p.sellerId : p.buyerId;
        if (counterpartyId) {
          await createNotification(
            counterpartyId,
            'Problem reported',
            `A problem was reported on "${p.listingTitle ?? 'an order'}". An admin will review it.`,
            actionUrl(p.orderId),
          );
        }
        await notifyShopDispute({
          kind: 'opened',
          orderId: p.orderId ?? '',
          listingTitle: p.listingTitle,
          reason: p.reason,
        });
        break;
      }

      case 'dispute:resolved': {
        for (const uid of [p.buyerId, p.sellerId].filter(Boolean) as string[]) {
          await createNotification(
            uid,
            'Issue resolved',
            `The issue on "${p.listingTitle ?? 'an order'}" has been resolved by admin.`,
            actionUrl(p.orderId),
          );
        }
        break;
      }

      case 'listing:approved': {
        if (p.sellerId) {
          await createNotification(
            p.sellerId,
            'Listing approved',
            `"${p.listingTitle ?? 'Your listing'}" is now visible on the shop.`,
            '/shop/selling',
          );
        }
        break;
      }

      case 'listing:rejected': {
        if (p.sellerId) {
          await createNotification(
            p.sellerId,
            'Listing needs changes',
            `"${p.listingTitle ?? 'Your listing'}" was rejected. Edit and resubmit, or contact support.`,
            '/shop/selling',
          );
        }
        break;
      }

      case 'listing:reported': {
        await notifyShopListingModerated({
          kind: 'reported',
          listingTitle: p.listingTitle,
          reportId: p.reportId,
        });
        break;
      }

      case 'review:received': {
        if (p.sellerId) {
          await createNotification(
            p.sellerId,
            'New review',
            `${p.fromUserName ?? 'A buyer'} rated your item "${p.listingTitle ?? ''}" ${p.rating ?? 5}/5.`,
            '/shop/selling',
          );
        }
        break;
      }
    }
  } catch (err) {
    // Best-effort. Don't propagate.
    console.error('[shop.notify] failed:', event, err);
  }
}
