export const SALES_COLUMNS=['Date','Order Id','Sku','Qty','Portal','Month','Year','Simplified','Quality','Colour','Size'];
export const STOCK_COLUMNS=['Uniware SKU','Simplified','Item','Color','Size','STOCK','IMAGE','EAN','ASIN','MRP'];
export const normalizeSku=v=>String(v??'').trim().toUpperCase();
export const parseDate=v=>{const d=new Date(v);return Number.isNaN(+d)?null:d};
export const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:null};
export function aggregateSalesBySku(sales, now=new Date()){
 const six=new Date(now);six.setMonth(six.getMonth()-6); const by=new Map();
 for(const r of sales){const sku=normalizeSku(r.Sku), q=num(r.Qty), d=parseDate(r.Date);if(!sku||q===null||!d)continue;
  if(!by.has(sku))by.set(sku,{total:0,d7:0,d30:0,d90:0,d6:0,latest:null,first:null}); const m=by.get(sku);m.total+=q;
  const age=(now-d)/86400000;if(age>=0&&age<=7)m.d7+=q;if(age>=0&&age<=30)m.d30+=q;if(age>=0&&age<=90)m.d90+=q;if(d>=six&&d<=now)m.d6+=q;
  if(!m.latest||d>m.latest)m.latest=d;if(!m.first||d<m.first)m.first=d;
 }
 for(const m of by.values()){const start=m.first>six?m.first:six;const days=Math.max(1,Math.ceil((now-start)/86400000)+1);m.historyDays=days;m.avgDaily=m.d6/days;m.avgMonthly=m.avgDaily*30.4375}
 return by;
}
export const calculateDaysOfStock=(stock,avg)=>avg>0&&Number.isFinite(stock)?stock/avg:null;
export function dataQuality(sales,stock){const stockCounts=new Map(), skus=new Set();let missingSalesSku=0,invalidQty=0,invalidDate=0,missingStockSku=0,negativeStock=0;
 stock.forEach(r=>{const s=normalizeSku(r['Uniware SKU']);if(!s)missingStockSku++;else {skus.add(s);stockCounts.set(s,(stockCounts.get(s)||0)+1)}if((num(r.STOCK)??0)<0)negativeStock++});
 const unmatched=sales.filter(r=>{const s=normalizeSku(r.Sku);if(!s)missingSalesSku++;if(num(r.Qty)===null)invalidQty++;if(!parseDate(r.Date))invalidDate++;return s&&!skus.has(s)});
 return {unmatched,missingSalesSku,invalidQty,invalidDate,missingStockSku,negativeStock,duplicates:[...stockCounts].filter(([,n])=>n>1).map(([sku])=>sku)};
}
export function suspiciousDuplicates(sales){const seen=new Set(),out=[];sales.forEach(r=>{const k=['Date','Order Id','Sku','Qty','Portal'].map(x=>r[x]??'').join('|');if(seen.has(k))out.push(r);else seen.add(k)});return out}
