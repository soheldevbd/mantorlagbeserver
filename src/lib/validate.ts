export const s = (v: unknown, max = 500) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';
export const isUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);
export const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseTuition(b: any): { error?: string; data?: any } {
  const d = {
    title: s(b?.title, 120),
    subject: s(b?.subject, 60),
    classLevel: s(b?.classLevel, 60),
    mode: s(b?.mode, 10),
    location: s(b?.location, 120),
    monthlyFee: Number(b?.monthlyFee),
    daysPerWeek: Number(b?.daysPerWeek),
    bannerImage: s(b?.bannerImage, 500),
    description: s(b?.description, 2000),
  };
  if (d.title.length < 5)
    return { error: 'Title must be at least 5 characters' };
  if (!d.subject || !d.classLevel || !d.location)
    return { error: 'Subject, class level and location are required' };
  if (!['Online', 'Offline'].includes(d.mode))
    return { error: 'Mode must be Online or Offline' };
  if (!(d.monthlyFee > 0))
    return { error: 'Monthly fee must be greater than 0' };
  if (
    !Number.isInteger(d.daysPerWeek) ||
    d.daysPerWeek < 1 ||
    d.daysPerWeek > 7
  )
    return { error: 'Days per week must be between 1 and 7' };
  if (!isUrl(d.bannerImage)) return { error: 'A banner image is required' };
  if (d.description.length < 20)
    return { error: 'Description must be at least 20 characters' };
  return { data: d };
}
