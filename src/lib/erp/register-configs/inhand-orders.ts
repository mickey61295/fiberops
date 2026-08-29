import type { RegisterConfig } from './types'

/** /orders/in-hand — SPEC-M4 §7 row 3 (legacy ST_Ord_inHand + SPEC-M19 §2
 *  Wave B trading fold: FrmTradingOrdersInHandReg → derived variant filter). */
export const inhandOrdersConfig: RegisterConfig = {
  slug: 'inhand-orders',
  title: 'In-Hand Orders',
  description: 'Orders in hand: qty pending to produce/despatch per order (ordered − despatched).',
  filters: [
    { key: 'variant', label: 'Order type', type: 'select', options: [
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'trading', label: 'Trading (no production)' },
    ] },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'order no, buyer, style' },
  ],
  columns: [
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'style', label: 'Style', mono: true },
    { name: 'orderDate', label: 'Ordered', format: 'date' },
    { name: 'deliveryDate', label: 'Delivery', format: 'date' },
    { name: 'totalPcs', label: 'Ordered pcs', align: 'right', format: 'int' },
    { name: 'despatchedPcs', label: 'Despatched', align: 'right', format: 'int' },
    { name: 'pendingPcs', label: 'Pending', align: 'right', format: 'int' },
    { name: 'invoicedQty', label: 'Invoiced', align: 'right', format: 'int' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['list_inhand_orders'],
  askPrompt: 'Which orders are in hand and how much is pending',
  emptyMessage: 'No open or in-progress orders.',
}
