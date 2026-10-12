export const ROLES = ['Realtor', 'Mortgage lender', 'Car dealer', 'Home pro', 'Other'];
export const OWNERS = ['Unassigned', 'Bryce', 'Will', 'Matthew'];
export const STATUSES = ['New', 'Contacted', 'Awaiting approval', 'Ready for pilot', 'Invited'];
export const SOURCES = ['Organic', 'Bryce', 'Will', 'Matthew', 'QR code', 'Google import'];
export const COUNTIES = ['Alachua','Baker','Bay','Bradford','Brevard','Broward','Calhoun','Charlotte','Citrus','Clay','Collier','Columbia','DeSoto','Dixie','Duval','Escambia','Flagler','Franklin','Gadsden','Gilchrist','Glades','Gulf','Hamilton','Hardee','Hendry','Hernando','Highlands','Hillsborough','Holmes','Indian River','Jackson','Jefferson','Lafayette','Lake','Lee','Leon','Levy','Liberty','Madison','Manatee','Marion','Martin','Miami-Dade','Monroe','Nassau','Okaloosa','Okeechobee','Orange','Osceola','Palm Beach','Pasco','Pinellas','Polk','Putnam','Santa Rosa','Sarasota','Seminole','St. Johns','St. Lucie','Sumter','Suwannee','Taylor','Union','Volusia','Wakulla','Walton','Washington'];
export const REWARDS = ['Weekly spin prizes', 'Marketing credits', 'HIVE gear', 'Vacation prize'];
export const VOLUMES = ['0–5', '6–15', '16–30', '31+'];
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizeEmail = value => String(value || '').trim().toLowerCase();
const previewId = () => globalThis.crypto?.randomUUID?.() || `preview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
  if (existing.some(lead => normalizeEmail(lead.email) === email)) return { errors: { email: 'This email is already in this preview waitlist.' } };
  return { lead: { id: input.id || previewId(), name: input.name.trim(), email, role: input.role, company: input.company.trim(), counties: [...new Set(input.counties)], phone: String(input.phone || '').trim(), source: SOURCES.includes(input.source) ? input.source : 'Organic', createdAt: now, status: 'New', owner: 'Unassigned', notes: '', followUp: '', profile: null } };
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
export function seedState(now = new Date()) {
  const names = ['Alex Rivera','Jordan Chen','Taylor Brooks','Casey Morgan','Avery Collins','Morgan Reed','Riley Parker','Jamie Foster','Drew Bennett','Cameron Lee','Sam Torres','Quinn Davis'];
  const markets = ['Broward','Palm Beach','Miami-Dade','Hillsborough','Orange','Pinellas','Duval','Lee'];
  const leads = Array.from({length:42},(_,i) => {
    const role = ROLES[i % 4], source = SOURCES[(i * 3 + Math.floor(i / 4)) % 5];
    const createdAt = new Date(now.getTime() - (Math.floor((41 - i) / 3) + (i % 3) / 5) * 86400000).toISOString();
    return { id: `demo-${i+1}`, name: `${names[i % names.length]} (demo)`, email: `partner${i+1}@example.com`, phone: '', role, company: `Demo ${['Realty','Lending','Motors','Home Services'][i % 4]} ${String.fromCharCode(65 + Math.floor(i / 4) % 6)}`, counties: [...new Set(i % 8 === 0 ? [markets[i % 8], 'Broward'] : [markets[i % 8]])], source, createdAt, status: STATUSES[(i + Math.floor(i / 7)) % 5], owner: OWNERS[i % 4], notes: '', followUp: '', profile: i % 3 ? { volume: VOLUMES[i % 4], rewards: [REWARDS[i % 4]], approval: ['Yes','No','Not sure'][i % 3], currentInsurance: ['Existing referral partner','Clients find their own','Lender or dealer handles it'][i % 3], priority: ['Fast quotes','Responsive agents','Easy proof of insurance'][i % 3], barrier: i % 5 === 0 ? 'Would like to review the office approval process.' : '' } : null };
  });
  return { version: 1, leads, starts: leads.map(l => ({createdAt:l.createdAt,source:l.source})).concat(Array.from({length:19},(_,i)=>({createdAt:leads[i].createdAt,source:leads[i].source}))), sessionStarts: [], updatedAt: now.toISOString() };
}
export function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = String(text).replace(/^\uFEFF/,'');
  for (let i=0;i<text.length;i++) {
    const char=text[i];
    if (char==='"') { if(quoted && text[i+1]==='"'){cell+='"';i++;} else if(quoted){quoted=false;} else if(!cell){quoted=true;} else {throw new Error('Invalid quote in CSV.');} }
    else if(char===','&&!quoted){row.push(cell);cell='';}
    else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
    else cell+=char;
  }
  if(quoted)throw new Error('CSV contains an unclosed quoted field.');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
export function importCSV(text, existing, now = new Date().toISOString()) {
  const rows = parseCSV(text); if(rows.length<2)throw new Error('Add a header row and at least one response.');
  const headers=rows.shift().map(v=>v.trim().toLowerCase().replace(/\s+/g,' '));
  const find = patterns => headers.findIndex(h=>patterns.some(p=>typeof p==='string'?h===p:p.test(h)));
  const columns = {name:find(['name','full name']),email:find(['email','email address']),company:find(['company',/^company or brokerage/]),role:find(['role','partner type',/^what do you do/]),counties:find(['counties','county',/^what county in fl/]),createdAt:find(['createdat','timestamp']),phone:find(['phone','mobile number (optional)','moblie number (optional)'])};
  Object.assign(columns,{volume:find(['volume',/^about how many clients/]),rewards:find(['rewards',/^which rewards/]),approval:find(['approval',/^would your brokerage/]),currentInsurance:find(['currentinsurance',/^where do your clients/]),priority:find(['priority']),barrier:find(['barrier',/^is there anything/])});
  if(['name','email','company','role','counties'].some(k=>columns[k]<0))throw new Error('CSV needs name, email, company, partner type, and county columns. Google Form headings and HIVE export headings are supported.');
  const imported=[],issues=[]; let duplicates=0;
  rows.forEach((row,i)=>{
    const value=key=>columns[key]>=0?(row[columns[key]]||'').trim():'';
    const roleText=value('role').toLowerCase();const role={'realtor':'Realtor','mortgage lender':'Mortgage lender','car sales':'Car dealer','car dealer':'Car dealer','home trade':'Home pro','home pro':'Home pro','other':'Other'}[roleText] || value('role');
    const counties=value('counties').split(/[;,|]/).map(v=>COUNTIES.find(c=>c.toLowerCase()===v.trim().replace(/ county$/i,'').toLowerCase())||v.trim()).filter(Boolean);
    const email=normalizeEmail(value('email'));
    if([...existing,...imported].some(l=>normalizeEmail(l.email)===email)){duplicates++;return;}
    const rawDate=value('createdAt');const parsed=rawDate?new Date(rawDate):new Date(now);
    const result=createLead({name:value('name'),email,company:value('company'),role,counties,phone:value('phone'),source:'Google import'},[...existing,...imported],Number.isNaN(parsed.getTime())?now:parsed.toISOString());
    if(result.errors)issues.push(`Row ${i+2}: ${Object.values(result.errors).join(' ')}`);else {
      const rewardText=value('rewards');
      const rewards=rewardText.split(/[;|]/).map(v=>v.trim()).filter(Boolean).map(v=>REWARDS.find(r=>r.toLowerCase()===v.toLowerCase())||(v.toLowerCase()==='year-end vacation'?'Vacation prize':v)).filter(v=>!v.toLowerCase().includes('service'));
      const profile={volume:value('volume'),rewards,approval:value('approval'),currentInsurance:value('currentInsurance'),priority:value('priority')||(rewardText.toLowerCase().includes('service')?rewardText:''),barrier:value('barrier')};
      if(Object.values(profile).some(v=>Array.isArray(v)?v.length:String(v).trim()))result.lead.profile=profile;
      imported.push(result.lead);
    }
  });
  return { imported, duplicates, issues };
}
export function exportCSV(leads) {
  const keys=['name','email','role','company','counties','phone','source','createdAt','status','owner','followUp','notes','volume','rewards','approval','currentInsurance','priority','barrier'];
  const cell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  return '\uFEFF'+[keys.join(','),...leads.map(l=>keys.map(k=>{const value=Object.hasOwn(l,k)?l[k]:l.profile?.[k];return cell(Array.isArray(value)?value.join('; '):value);}).join(','))].join('\r\n');
}
