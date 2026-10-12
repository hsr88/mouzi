const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const server = process.argv[2] ? null : createServer(async (req,res)=>{
 const path=resolve('website/dist','.'+new URL(req.url,'http://localhost').pathname);
 for (const f of [path,path+'.html',path+'/index.html']) {try {const body=await readFile(f);res.setHeader('Content-Type',f.endsWith('.html')?'text/html':f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'application/octet-stream');res.end(body);return;}catch{}}
 res.statusCode=404;res.end();
});
if(server) await new Promise(r=>server.listen(4322,'127.0.0.1',r));
import assert from 'node:assert/strict';
const base=process.argv[2] || 'http://127.0.0.1:4322';
const browser=await chromium.launch({channel:'msedge',headless:true});
const key='mouzi-analytics-consent';
try {
 const context=await browser.newContext();
 let loads=0;
 await context.route('https://www.googletagmanager.com/**',r=>{loads++;return r.fulfill({contentType:'text/javascript',body:''});});
 await context.route(/https:\/\/[^/]*google-analytics.com\//,r=>r.abort());
 const page=await context.newPage();
 await page.goto(base+'/privacy');
 await page.waitForFunction(()=>window.mouziAnalyticsInitialized);
 const count=()=>page.evaluate(()=>window.dataLayer.filter(x=>x[0]==='config').length);
 assert.equal(await count(),1);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
 assert.equal(await page.locator('#analytics-consent').isVisible(),true);
 await page.locator('#analytics-accept').click();
 assert.equal(await count(),1);
 await page.locator('[data-manage-analytics]').click();
 await page.evaluate(()=>{document.cookie='_ga=test; path=/';document.cookie='_ga_GMDTSE5DFS=test; path=/';});
 await Promise.all([page.waitForEvent('load'),page.locator('#analytics-decline').click()]);
 assert.equal(await page.evaluate(()=>window.mouziAnalyticsEnabled),false);
 assert.equal(await count(),0);
 assert.equal((await context.cookies()).some(c=>c.name.startsWith('_ga')),false);
 const before=loads;
 await page.reload();
 assert.equal(loads,before);
 await page.locator('[data-manage-analytics]').click();
 assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).value,key),'denied');
 await page.reload();
 assert.equal(loads,before);
 await page.locator('[data-manage-analytics]').click();
 await page.locator('#analytics-accept').click();
 assert.equal(await count(),1);
 await page.evaluate(()=>{
  const a=document.createElement('a');a.href='#';a.dataset.mouziDownload='true';document.body.append(a);a.click();a.remove();
 });
 assert.equal(await page.evaluate(()=>window.dataLayer.filter(x=>x[0]==='event'&&x[1]==='mouzi_download').length),1);
 for(const raw of ['denied',JSON.stringify({value:'denied',savedAt:1})]){
  await page.evaluate(([k,v])=>localStorage.setItem(k,v),[key,raw]);
  await page.reload();assert.equal(await count(),0);
 }
 for(const lang of ['pl','de','fr','es','it']){
  await page.goto(base+'/'+lang+'/privacy');
  assert.equal(await page.locator('[data-manage-analytics]').count(),1);
  assert.ok((await page.locator('main').textContent()).includes('2026'));
 }
 await context.close();
 console.log('PASS: default start, no implicit saved consent, no duplicate config/download, cookie cleanup, reload refusal, reopening preferences, re-enable, legacy refusals, five translations. '+base);
} finally {await browser.close();server?.close();}
