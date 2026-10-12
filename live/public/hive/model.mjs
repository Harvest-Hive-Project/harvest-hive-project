export const ROLES = ['Realtor', 'Mortgage lender', 'Car dealer', 'Home pro', 'Other'];
export const OWNERS = ['Unassigned', 'Bryce', 'Will', 'Matthew'];
export const STATUSES = ['New', 'Contacted', 'Awaiting approval', 'Ready for pilot', 'Invited'];
export const SOURCES = ['Organic', 'Bryce', 'Will', 'Matthew', 'QR code'];
export const COUNTIES = ['Alachua','Baker','Bay','Bradford','Brevard','Broward','Calhoun','Charlotte','Citrus','Clay','Collier','Columbia','DeSoto','Dixie','Duval','Escambia','Flagler','Franklin','Gadsden','Gilchrist','Glades','Gulf','Hamilton','Hardee','Hendry','Hernando','Highlands','Hillsborough','Holmes','Indian River','Jackson','Jefferson','Lafayette','Lake','Lee','Leon','Levy','Liberty','Madison','Manatee','Marion','Martin','Miami-Dade','Monroe','Nassau','Okaloosa','Okeechobee','Orange','Osceola','Palm Beach','Pasco','Pinellas','Polk','Putnam','Santa Rosa','Sarasota','Seminole','St. Johns','St. Lucie','Sumter','Suwannee','Taylor','Union','Volusia','Wakulla','Walton','Washington'];
export const REWARDS = ['Weekly spin prizes', 'Marketing credits', 'HIVE gear', 'Vacation prize'];
export const VOLUMES = ['0–5', '6–15', '16–30', '31+'];
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizeEmail = value => String(value || '').trim().toLowerCase();
const newId = () => crypto.randomUUID();
export function validateSignup(input) {
  const errors = {};
  if (!String(input.name || '').trim() || input.name.length > 100) errors.name = 'Enter your name (up to 100 characters).';
  if (!EMAIL.test(normalizeEmail(input.email)) || input.email.length > 254) errors.email = 'Enter a valid email address.';
  if (!ROLES.includes(input.role)) errors.role = 'Choose your partner type.';
  if (!String(input.company || '').trim() || input.company.length > 150) errors.company = 'Enter your company or office (up to 150 characters).';
  if (!Array.isArray(input.counties) || !input.counties.length || input.counties.some(c => !COUNTIES.includes(c))) errors.counties = 'Choose at least one Florida county.';
  if (input.phone && !/^\+?[\d\s().-]{7,25}$/.test(input.phone.trim())) errors.phone = 'Enter a valid phone number, or leave it blank.';
  return errors;
}
export function createLead(input, existing, now = new Date().toISOString()) {
  const errors = validateSignup(input);
  if (Object.keys(errors).length) return { errors };
  const email = normalizeEmail(input.email);
  if (existing.some(lead => normalizeEmail(lead.email) === email)) return { errors: { email: 'This email is already registered.' } };
  return { lead: { id: input.id || newId(), name: input.name.trim(), email, role: input.role, company: input.company.trim(), counties: [...new Set(input.counties)], phone: String(input.phone || '').trim(), source: SOURCES.includes(input.source) ? input.source : 'Organic', createdAt: now, status: 'New', owner: 'Unassigned', notes: '', followUp: '', profile: null } };
}
export function filterLeads(leads, filters, now = new Date()) {
  const cutoff = filters.days ? now.getTime() - Number(filters.days) * 86400000 : -Infinity;
  const query = String(filters.search || '').trim().toLowerCase();
  return leads.filter(lead => Date.parse(lead.createdAt) >= cutoff && (!filters.role || lead.role === filters.role) && (!filters.county || lead.counties.includes(filters.county)) && (!filters.source || lead.source === filters.source) && (!filters.status || lead.status === filters.status) && (!filters.owner || lead.owner === filters.owner) && (!query || [lead.name, lead.email, lead.company, ...lead.counties].join(' ').toLowerCase().includes(query))).sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
export function summarize(leads) {
  return { signups: leads.length, offices: new Set(leads.map(l => l.company.trim().toLowerCase().replace(/\s+/g, ' '))).size, ready: leads.filter(l => l.status === 'Ready for pilot' || l.status === 'Invited').length, awaiting: leads.filter(l => l.status === 'Awaiting approval').length, profiles: leads.filter(l => l.profile).length };
}
export function groups(leads, property) {
  const result = {};
  for (const lead of leads) for (const key of Array.isArray(lead[property]) ? lead[property] : [lead[property]]) result[key] = (result[key] || 0) + 1;
  return Object.entries(result).sort((a,b) => b[1] - a[1]);
}
export function exportCSV(leads) {
  const keys=['name','email','role','company','counties','phone','source','createdAt','status','owner','followUp','notes','volume','rewards','approval','currentInsurance','priority','barrier'];
  const cell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  return '\uFEFF'+[keys.join(','),...leads.map(l=>keys.map(k=>{const value=Object.hasOwn(l,k)?l[k]:l.profile?.[k];return cell(Array.isArray(value)?value.join('; '):value);}).join(','))].join('\r\n');
}
