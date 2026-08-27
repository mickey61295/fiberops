/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-26 — Samples & Enquiry (/orders/samples, item
// 'samples-enquiry', legacy frmOrderSample / FrmSampleEntry_WithEnquiry).
// SMP-#### doc number; buyer/style pickers (W4); status select mirrors the
// service contract. The create_sample tool is the agent door.
import type { DocConfig } from './types'
import { SAMPLE_SCHEMA } from '../schemas/sample'
import { planSample } from '../posting/sample'

export const sampleConfig: DocConfig = {
  docType: 'sample',
  slug: 'sample',
  title: 'Samples & Enquiry',
  numberPrefix: 'SMP-',
  numberField: 'sampleNo',
  chainStage: undefined,
  schema: SAMPLE_SCHEMA,
  service: { plan: (input: any) => planSample(input) },
  headerFields: [
    { name: 'sampleNo', label: 'Sample No', type: 'text', colSpan: 1 },
    { name: 'buyerCode', label: 'Buyer', type: 'picker', picker: 'buyer', colSpan: 1 },
    { name: 'styleCode', label: 'Style', type: 'picker', picker: 'style', pickerValueField: 'styleNo', colSpan: 1 },
    { name: 'sampleType', label: 'Sample Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'proto', label: 'Proto' },
      { value: 'photo', label: 'Photo' },
      { value: 'counter', label: 'Counter' },
      { value: 'salesman', label: 'Salesman' },
      { value: 'production', label: 'Production' },
    ] },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', colSpan: 1 },
    { name: 'sampledOn', label: 'Sampled On', type: 'date', colSpan: 1 },
    { name: 'status', label: 'Status', type: 'select', colSpan: 1, options: [
      { value: 'submitted', label: 'Submitted' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'closed', label: 'Closed' },
    ] },
    { name: 'enquiryRef', label: 'Enquiry Ref', type: 'text', colSpan: 1 },
    { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'sampleNo', label: 'Sample No' },
    { name: 'buyerName', label: 'Buyer' },
    { name: 'sampleType', label: 'Type' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'status', label: 'Status' },
    { name: 'sampledOn', label: 'Sampled On' },
  ],
  recentCount: 20,
  agentTools: ['create_sample', 'list_styles'],
}
