import { z } from 'zod';
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Invalid calendar date');
export const patientSchema = z.object({
  name: z.string().trim().min(2).max(100),
  nameAr: z.string().trim().min(2).max(100),
  dob: dateSchema.refine(
    (v) => v <= new Date().toISOString().slice(0, 10),
    'Date of birth cannot be in the future',
  ),
  sex: z.enum(['male', 'female', 'other']),
  phone: z.string().trim().min(5).max(30),
  blood: z.enum(['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  allergies: z.string().trim().max(1000),
  address: z.string().trim().max(300),
});
export const recordSchema = z.object({
  module: z.string().max(30),
  title: z.string().trim().min(2).max(150),
  titleAr: z.string().trim().min(2).max(150),
  patientId: z.string().max(50).default(''),
  assignedTo: z.string().max(50),
  priority: z.enum(['routine', 'urgent', 'critical']),
  date: dateSchema,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  data: z.record(z.string().max(50), z.string().trim().max(5000)),
});
export const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create-patient'), payload: patientSchema }),
  z.object({ action: z.literal('update-patient'), id: z.string(), payload: patientSchema }),
  z.object({ action: z.literal('create-record'), payload: recordSchema }),
  z.object({
    action: z.literal('update-record'),
    id: z.string(),
    version: z.number().int().positive(),
    payload: recordSchema,
  }),
  z.object({
    action: z.literal('transition'),
    id: z.string(),
    version: z.number().int().positive(),
    status: z.string().max(30),
  }),
  z.object({
    action: z.literal('settings'),
    payload: z.object({
      name: z.string().trim().min(2).max(100),
      nameAr: z.string().trim().min(2).max(100),
      address: z.string().trim().max(300),
      phone: z.string().trim().max(50),
    }),
  }),
  z.object({
    action: z.literal('password'),
    currentPassword: z.string().max(200),
    newPassword: z.string().min(12).max(200),
  }),
]);
export function moneyCents(value: string) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value))
    throw new Error(
      'Enter a non-negative amount with at most 2 decimal places. / أدخل مبلغًا موجبًا بمنزلتين عشريتين كحد أقصى.',
    );
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function integerQuantity(value: string) {
  if (!/^\d{1,7}$/.test(value))
    throw new Error(
      'Quantity must be a non-negative whole number. / يجب أن تكون الكمية عددًا صحيحًا غير سالب.',
    );
  return Number(value);
}
