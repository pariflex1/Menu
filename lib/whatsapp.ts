/**
 * Meta WhatsApp Cloud API Service
 * Handles sending WhatsApp notifications and template messages.
 */

export interface WhatsAppOrderDetails {
  orderId: string;
  orderNumber?: string | number;
  customerName?: string | null;
  customerPhone?: string | null;
  orderType: string;
  tableName?: string | null;
  roomNumber?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod?: string;
  notes?: string | null;
}

/**
 * Format phone number into WhatsApp international format without '+' or spaces (e.g. 919198433007)
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  // If Indian number with 10 digits starting with 6-9, prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

/**
 * Send a Meta WhatsApp template message
 */
export async function sendWhatsAppTemplateMessage({
  to,
  templateName,
  languageCode = 'en',
  parameters = [],
}: {
  to: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN || 'EAAQKULcQUKEBR9dZAzwUk6VajWIZAglv2T8gdDcmyZAlRPHSRhKksEvUJ7M0wS3yUuJinfKJZAIqKV9aEZAwFpqEH4bmZBPaIbiyZBoGA5pjAVKHTUs8bqFwaXwrkgqGHZASVAZBWD8azfqXRWNjRGRah592VbZBFrhTvrOLXj8jmZCoTkzSAZCTGsEBbB5w5A3bMum7ogZDZD';
  const phoneId = process.env.WHATSAPP_PHONE_ID || '639759029221223';

  if (!token || !phoneId) {
    console.warn('[WhatsApp] WHATSAPP_TOKEN or WHATSAPP_PHONE_ID is not set in environment.');
    return { success: false, error: 'Credentials not configured' };
  }

  const recipient = formatPhoneNumber(to);
  if (!recipient) {
    return { success: false, error: 'Invalid recipient phone number' };
  }

  const components: any[] = [];
  if (parameters.length > 0) {
    components.push({
      type: 'body',
      parameters: parameters.map((param) => ({
        type: 'text',
        text: String(param || ''),
      })),
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('[WhatsApp] Meta API Error Response:', JSON.stringify(result, null, 2));
      return { success: false, error: result.error?.message || 'Failed to send WhatsApp message', data: result };
    }

    console.log('[WhatsApp] Message sent successfully to', recipient, 'Message ID:', result.messages?.[0]?.id);
    return { success: true, data: result };
  } catch (err: any) {
    console.error('[WhatsApp] Network error while sending message:', err);
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

/**
 * Send New Order Notification to Management / Staff
 * Matches template parameters:
 * {{1}} {{order_id}}
 * {{2}} {{order_date}}
 * {{3}} {{total_amount}}
 * {{4}} {{table_room}}
 */
export async function sendNewOrderAlertToManagement(order: WhatsAppOrderDetails) {
  const managementPhone = process.env.WHATSAPP_MANAGEMENT_PHONE || '919198433007';
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'ka_restaurent_order';

  const orderNum = order.orderNumber ? `#${order.orderNumber}` : `#${order.orderId.slice(0, 8)}`;
  
  // Format current date and time (Asia/Kolkata)
  const now = new Date();
  const orderDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(now);

  // Format fulfillment source (Table / Room / Customer Name)
  let tableRoom = order.customerName || 'Direct Order';
  if (order.tableName) {
    tableRoom = `Table ${order.tableName}`;
  } else if (order.roomNumber) {
    tableRoom = `Room ${order.roomNumber}`;
  } else if (order.customerName) {
    tableRoom = order.customerName;
  } else if (order.orderType === 'home') {
    tableRoom = 'Home Delivery';
  }

  const formattedTotal = `₹${order.total.toFixed(2)}`;

  // Meta Template Variables:
  // 1: {{order_id}}
  // 2: {{order_date}}
  // 3: {{total_amount}}
  // 4: {{table_room}}
  const parameters = [
    orderNum,          // {{1}} Order ID
    orderDate,         // {{2}} Date / Time
    formattedTotal,    // {{3}} Total Value
    tableRoom,         // {{4}} Room / Table
  ];

  return await sendWhatsAppTemplateMessage({
    to: managementPhone,
    templateName,
    parameters,
    languageCode: 'en', // Matches template language
  });
}

