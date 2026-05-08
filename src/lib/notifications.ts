import { prisma } from './prisma'
import { waOrderConfirmed, waOrderShipped } from './whatsapp'

async function log(orderId: string, type: string, phone: string, status: string, error?: string) {
  await prisma.notificationLog.create({ data: { orderId, type, phone, status, error } }).catch(() => {})
}

export async function sendOrderConfirmation(orderId: string, phone: string, name: string, total: number) {
  if (!phone) return
  try {
    const msgId = await waOrderConfirmed(phone, name, orderId, total)
    await log(orderId, 'ORDER_CONFIRMED', phone, msgId ? 'SENT' : 'FAILED')
  } catch (e) {
    await log(orderId, 'ORDER_CONFIRMED', phone, 'FAILED', String(e))
  }
}

export async function sendShippingNotification(orderId: string, phone: string, trackingUrl: string) {
  if (!phone) return
  try {
    const msgId = await waOrderShipped(phone, orderId, trackingUrl)
    await log(orderId, 'ORDER_SHIPPED', phone, msgId ? 'SENT' : 'FAILED')
  } catch (e) {
    await log(orderId, 'ORDER_SHIPPED', phone, 'FAILED', String(e))
  }
}
