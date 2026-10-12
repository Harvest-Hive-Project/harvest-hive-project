import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState,createLead,validateSignup,filterLeads,groups,summarize,parseCSV,importCSV,exportCSV,COUNTIES} from '../preview/model.mjs';
const valid={name:'Test Partner',email:'TEST@EXAMPLE.COM',role:'Home pro',company:'Demo Roofing',counties:['Broward','Palm Beach','Broward'],source:'Will',phone:''};
test('signup validates required fields, email, counties and optional phone',()=>{
  assert.deepEqual(validateSignup(valid),{});
  assert.equal(Object.keys(validateSignup({})).length,5);
  assert.ok(validateSignup({...valid,email:'bad@'}).email);
  assert.ok(validateSignup({...valid,counties:['Made up county']}).counties);
  assert.ok(validateSignup({...valid,phone:'letters'}).phone);
  assert.equal(COUNTIES.length,67);
});
test('new signup normalizes email, counties and source and rejects duplicate email',()=>{
  const first=createLead(valid,[],'2026-10-12T12:00:00Z');
  assert.equal(first.lead.email,'test@example.com');assert.deepEqual(first.lead.counties,['Broward','Palm Beach']);assert.equal(first.lead.source,'Will');
  assert.ok(createLead({...valid,email:' test@example.com '},[first.lead]).errors.email);
  assert.equal(createLead({...valid,source:'Unknown'},[]).lead.source,'Organic');
});
test('filters combine date, role, county, source, owner and search',()=>{
  const lead=createLead(valid,[],'2026-10-12T12:00:00Z').lead;lead.owner='Matthew';
  const old={...lead,id:'old',email:'old@example.com',createdAt:'2026-09-01T12:00:00Z'};
  const filters={days:7,role:'Home pro',county:'Broward',source:'Will',owner:'Matthew',search:'roof'};
  assert.deepEqual(filterLeads([old,lead],filters,new Date('2026-10-12T14:00:00Z')).map(l=>l.id),[lead.id]);
  assert.equal(filterLeads([lead],{...filters,role:'Realtor'}).length,0);
});
test('county counts include each partner once per county and office counts normalize spacing',()=>{
  const state=seedState(new Date('2026-10-12T12:00:00Z'));
  assert.equal(state.leads.length,42);assert.ok(state.leads.every(l=>new Set(l.counties).size===l.counties.length));
  const lead=createLead(valid,[]).lead;const summary=summarize([lead,{...lead,company:'  demo   roofing  ',status:'Ready for pilot'}]);
  assert.equal(summary.offices,1);assert.equal(summary.ready,1);assert.deepEqual(groups([lead],'counties'),[['Broward',1],['Palm Beach',1]]);
});
test('CSV parser handles BOM, quoted commas, escaped quotes and multiline fields',()=>{
  assert.deepEqual(parseCSV('\uFEFFname,notes\r\n"Alex, Test","Line one\nLine ""two"""\r\n'),[['name','notes'],['Alex, Test','Line one\nLine "two"']]);
  assert.throws(()=>parseCSV('name\n"unfinished'),/unclosed/);
});
test('Google Form imports map types and counties, dedupe within file, and report invalid rows',()=>{
  const csv='Full Name,Email Address,What do you do? Realtor / Mortgage lender / Car sales / Home trade (roofing),Company or brokerage that you represent,What county in FL do you work out of?\nTest Partner,test@example.com,Home Trade,Demo Roofing,Broward County\nDuplicate,TEST@example.com,Home Trade,Demo Roofing,Broward\nInvalid,bad-email,Realtor,Demo Office,Orange';
  const result=importCSV(csv,[],'2026-10-12T12:00:00Z');
  assert.equal(result.imported.length,1);assert.equal(result.duplicates,1);assert.equal(result.issues.length,1);assert.equal(result.imported[0].role,'Home pro');assert.deepEqual(result.imported[0].counties,['Broward']);assert.equal(result.imported[0].source,'Google import');
});
test('CSV export quotes contact data and neutralizes spreadsheet formulas',()=>{
  const lead=createLead({...valid,company:'=HYPERLINK("bad")'},[]).lead;lead.notes='Line one\nLine two';
  const csv=exportCSV([lead]),parsed=parseCSV(csv);assert.equal(parsed[1][3],"'=HYPERLINK(\"bad\")");assert.equal(parsed[1][11],lead.notes);
  assert.equal(importCSV(csv,[lead]).duplicates,1);
});
test('Google Form research responses are retained in the insights profile',()=>{
  const csv='Full Name,Email Address,What do you do?,Company or brokerage that you represent,What county in FL do you work out of?,Which rewards would motivate you most?,Would your brokerage or office need to approve this?,About how many clients buy a home or vehicle with you each month?,Is there anything that would stop you from using it?\nResearch Partner,research@example.com,Realtor,Demo Office,Orange,Year-end Vacation,Yes,10-12,Office needs a demo';
  const result=importCSV(csv,[]);
  assert.equal(result.imported.length,1);assert.equal(result.imported[0].profile.volume,'10-12');assert.equal(result.imported[0].profile.approval,'Yes');assert.deepEqual(result.imported[0].profile.rewards,['Vacation prize']);assert.equal(result.imported[0].profile.barrier,'Office needs a demo');
});
test('empty filters and summaries show zero without inventing data',()=>{
  assert.deepEqual(groups([],'role'),[]);assert.equal(summarize([]).signups,0);assert.equal(filterLeads([],{county:'Orange'}).length,0);
  assert.throws(()=>importCSV('unrelated,header\na,b',[]),/CSV needs/);
});
