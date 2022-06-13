import './style.css'

// Add some content to the HTML
document.querySelector('#app').innerHTML = `
  <h1>Hello Vite!</h1>
  <h4>Open the DevTools console to see the output</h4>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`

import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_next from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

const MANUAL_BUNDLES = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: mvp_worker,
    },
    eh: {
        mainModule: duckdb_wasm_next,
        // mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).toString(),
        mainWorker: eh_worker
    },
};

// Select a bundle based on browser checks
const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

// Instantiate the asynchronus version of DuckDB-wasm
const worker = new Worker(bundle.mainWorker);
const logger = new duckdb.ConsoleLogger();
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

const conn = await db.connect(); // Connect to db

// Basic query
console.log("Basic query");
let q = await conn.query(`SELECT count(*)::INTEGER as v
FROM generate_series(0, 100) t(v)`); // Returns v = 101
console.log("Query result (Arrow Table):", q);

// Copy of query result (JSON instead of Arrow Table)
console.log('Query result copy (JSON):', JSON.parse(JSON.stringify(q.toArray())));
console.log('');

// Prepare query
console.log("Prepared query statement")
const stmt = await conn.prepare(
`SELECT (v + ?) as v FROM generate_series(0, 1000) as t(v);`
);

// ... and run the query with materialized results
const res = await stmt.query(234); // Returns 1001 entries ranging from v = 234 to 1,234
console.log("Statement result (Table):", res);
console.log('Statement result copy (JSON):', 
    // Bug fix explained at: https://github.com/GoogleChromeLabs/jsbi/issues/30
    JSON.parse(JSON.stringify(res.toArray(), (key, value) =>
    typeof value === 'bigint'
    ? value.toString()
    : value // return everything else unchanged
    ))
);

// Closing everything
await conn.close();
await db.terminate();
await worker.terminate();

console.log("Finished!");