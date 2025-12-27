const fs = require('fs');
const path = require('path');

const CONTROLLER_DIR = path.join(__dirname, '..', 'controller');
const ROUTES_DIR = path.join(__dirname, '..', 'routes');

function makeMockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.headers = {};
  res.status = function(code) { res.statusCode = code; return res; };
  res.json = function(obj) { res.body = obj; return res; };
  res.send = function(obj) { res.body = obj; return res; };
  res.set = function(k, v) { res.headers[k] = v; return res; };
  return res;
}

function makeMockReq(overrides = {}) {
  return Object.assign({ params: {}, query: {}, body: {}, headers: {}, method: 'GET', path: '/' }, overrides);
}

(async function main(){
  console.log('\nRunning project-wide controller + route quick tests\n');

  const results = {
    controllers: {},
    functionsTested: 0,
    functionsPassed: 0,
    functionsFailed: [],
    duplicateFunctionNames: {},
    routes: [],
    duplicateRoutes: []
  };

  // 1) Load controllers and call exported functions
  if (fs.existsSync(CONTROLLER_DIR)) {
    const files = fs.readdirSync(CONTROLLER_DIR).filter(f => f.endsWith('.js'));
    const nameMap = {}; // name -> [file]

    for (const file of files) {
      const full = path.join(CONTROLLER_DIR, file);
      let ctrl;
      try {
        ctrl = require(full);
      } catch (e) {
        results.functionsFailed.push({ file, fn: '<load>', error: e.stack || String(e) });
        continue;
      }

      results.controllers[file] = { exports: Object.keys(ctrl) };

      for (const [key, fn] of Object.entries(ctrl)) {
        // track duplicates
        if (!nameMap[key]) nameMap[key] = [];
        nameMap[key].push(file);

        if (typeof fn !== 'function') continue;

        results.functionsTested++;

        const mockReq = makeMockReq();
        const mockRes = makeMockRes();

        // provide some sensible defaults depending on name
        if (/add|create|send|post|put|update/i.test(key)) {
          mockReq.body = { sample: true };
        }
        if (/get|list|latest|status|health/i.test(key)) {
          mockReq.query = { page: 1, limit: 1 };
        }
        if (/acknowledge|id|update|command|last|history/i.test(key)) {
          mockReq.params = { id: '000000000000000000000000', device: 'test_device' };
        }

        try {
          const out = fn(mockReq, mockRes);
          // handle promise-returning handlers
          if (out && typeof out.then === 'function') {
            await out;
          }
          results.functionsPassed++;
        } catch (err) {
          results.functionsFailed.push({ file, fn: key, error: err.stack || String(err) });
        }
      }
    }

    // duplicates
    for (const [name, arr] of Object.entries(nameMap)) {
      if (arr.length > 1) results.duplicateFunctionNames[name] = arr;
    }
  } else {
    console.warn('Controller directory not found:', CONTROLLER_DIR);
  }

  // 2) Parse route files to find route definitions and detect duplicates
  if (fs.existsSync(ROUTES_DIR)) {
    const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
    const routeMap = {}; // method|path -> [file]

    for (const file of routeFiles) {
      const src = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
      // simple regex to find router.<method>('path', handler)
      const routeRegex = /router\.(get|post|put|delete|patch|all)\s*\(\s*['"`](.*?)['"`]\s*,/gmi;
      let m;
      while ((m = routeRegex.exec(src)) !== null) {
        const method = m[1].toUpperCase();
        const routePath = m[2];
        results.routes.push({ file, method, path: routePath });
        const key = `${method} ${routePath}`;
        if (!routeMap[key]) routeMap[key] = [];
        routeMap[key].push(file);
      }
    }

    for (const [k, arr] of Object.entries(routeMap)) {
      if (arr.length > 1) results.duplicateRoutes.push({ route: k, files: arr });
    }
  } else {
    console.warn('Routes directory not found:', ROUTES_DIR);
  }

  // 3) Print summary
  console.log('\nTest Summary:');
  console.log('  Controller files scanned:', Object.keys(results.controllers).length);
  console.log('  Exported functions found and tested:', results.functionsTested);
  console.log('  Functions executed without throwing:', results.functionsPassed);
  console.log('  Functions that threw errors:', results.functionsFailed.length);

  if (results.functionsFailed.length > 0) {
    console.log('\nFailures:');
    for (const f of results.functionsFailed) {
      console.log(` - ${f.file} -> ${f.fn}: ${f.error.split('\n')[0]}`);
    }
  }

  if (Object.keys(results.duplicateFunctionNames).length > 0) {
    console.log('\nDuplicate exported function names across controllers:');
    for (const [name, files] of Object.entries(results.duplicateFunctionNames)) {
      console.log(` - ${name}: ${files.join(', ')}`);
    }
  } else {
    console.log('\nNo duplicate exported function names detected.');
  }

  console.log('\nRoutes scanned:', results.routes.length);
  if (results.duplicateRoutes.length > 0) {
    console.log('Duplicate routes detected:');
    for (const d of results.duplicateRoutes) {
      console.log(` - ${d.route} declared in: ${d.files.join(', ')}`);
    }
  } else {
    console.log('No duplicate routes detected.');
  }

  console.log('\nDetailed JSON output (scripts/test_results.json)');
  fs.writeFileSync(path.join(__dirname, 'test_results.json'), JSON.stringify(results, null, 2));

  console.log('\nDone.');
})();
