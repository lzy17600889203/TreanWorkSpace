const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const CVE_DB = [
  { package_name: 'lodash', version_range: '<4.17.21', cve_id: 'CVE-2021-23337', severity: 'HIGH', cvss: 7.2, description: 'Prototype pollution in lodash - 原型污染可导致代码执行', link: 'https://nvd.nist.gov/vuln/detail/CVE-2021-23337' },
  { package_name: 'lodash', version_range: '<4.17.19', cve_id: 'CVE-2020-28500', severity: 'CRITICAL', cvss: 9.8, description: 'ReDoS 拒绝服务漏洞 - 恶意正则表达式可耗尽 CPU', link: 'https://nvd.nist.gov/vuln/detail/CVE-2020-28500' },
  { package_name: 'minimist', version_range: '<0.2.1', cve_id: 'CVE-2020-7598', severity: 'HIGH', cvss: 7.5, description: 'Prototype pollution in minimist', link: 'https://nvd.nist.gov/vuln/detail/CVE-2020-7598' },
  { package_name: 'minimist', version_range: '<1.2.3', cve_id: 'CVE-2020-7598', severity: 'HIGH', cvss: 7.5, description: 'Prototype pollution in minimist', link: 'https://nvd.nist.gov/vuln/detail/CVE-2020-7598' },
  { package_name: 'ansi-regex', version_range: '<5.0.1', cve_id: 'CVE-2021-41136', severity: 'MEDIUM', cvss: 5.3, description: 'ReDoS 漏洞', link: 'https://nvd.nist.gov/vuln/detail/CVE-2021-41136' },
  { package_name: 'express', version_range: '<4.17.1', cve_id: 'CVE-2020-28498', severity: 'MEDIUM', cvss: 5.3, description: 'qs 模块原型污染风险', link: 'https://nvd.nist.gov/vuln/detail/CVE-2020-28498' },
  { package_name: 'express', version_range: '<4.16.0', cve_id: 'CVE-2019-10748', severity: 'HIGH', cvss: 7.5, description: 'Path traversal 路径遍历 - 可泄露敏感文件', link: 'https://nvd.nist.gov/vuln/detail/CVE-2019-10748' },
  { package_name: 'body-parser', version_range: '<1.19.0', cve_id: 'CVE-2019-16781', severity: 'HIGH', cvss: 7.5, description: 'DoS 拒绝服务漏洞', link: 'https://nvd.nist.gov/vuln/detail/CVE-2019-16781' },
  { package_name: 'debug', version_range: '<2.6.9', cve_id: 'CVE-2017-16137', severity: 'HIGH', cvss: 7.5, description: 'ReDoS 正则表达式拒绝服务', link: 'https://nvd.nist.gov/vuln/detail/CVE-2017-16137' },
  { package_name: 'underscore', version_range: '<1.12.1', cve_id: 'CVE-2021-23358', severity: 'HIGH', cvss: 7.2, description: 'Prototype pollution 原型污染', link: 'https://nvd.nist.gov/vuln/detail/CVE-2021-23358' },
  { package_name: 'jquery', version_range: '<3.5.0', cve_id: 'CVE-2020-11022', severity: 'CRITICAL', cvss: 9.8, description: 'XSS 跨站脚本漏洞 - 极易被利用', link: 'https://nvd.nist.gov/vuln/detail/CVE-2020-11022' },
  { package_name: 'qs', version_range: '<6.2.3', cve_id: 'CVE-2022-24999', severity: 'HIGH', cvss: 7.5, description: 'DoS 拒绝服务 - 解析复杂对象时内存飙升', link: 'https://nvd.nist.gov/vuln/detail/CVE-2022-24999' },
  { package_name: 'cookie', version_range: '<0.3.1', cve_id: 'CVE-2022-25863', severity: 'HIGH', cvss: 7.5, description: 'ReDoS 拒绝服务 - 大 Cookie 导致 CPU 耗尽', link: 'https://nvd.nist.gov/vuln/detail/CVE-2022-25863' },
  { package_name: 'send', version_range: '<0.17.0', cve_id: 'CVE-2021-44420', severity: 'HIGH', cvss: 7.5, description: 'Path traversal 路径遍历漏洞', link: 'https://nvd.nist.gov/vuln/detail/CVE-2021-44420' },
  { package_name: 'semver', version_range: '<5.7.2', cve_id: 'CVE-2022-25883', severity: 'MEDIUM', cvss: 5.3, description: 'ReDoS 拒绝服务', link: 'https://nvd.nist.gov/vuln/detail/CVE-2022-25883' },
  { package_name: 'semver', version_range: '<6.3.1', cve_id: 'CVE-2022-25883', severity: 'MEDIUM', cvss: 5.3, description: 'ReDoS 拒绝服务', link: 'https://nvd.nist.gov/vuln/detail/CVE-2022-25883' },
  { package_name: 'semver', version_range: '<7.5.2', cve_id: 'CVE-2023-26048', severity: 'HIGH', cvss: 7.5, description: 'ReDoS - 大版本号字符串导致服务崩溃', link: 'https://nvd.nist.gov/vuln/detail/CVE-2023-26048' },
  { package_name: 'd3', version_range: '<7.0.0', cve_id: 'CVE-2020-XXXX', severity: 'LOW', cvss: 3.5, description: '次要问题 - 旧版本维护不足', link: '#' },
  { package_name: 'iconv-lite', version_range: '<0.4.24', cve_id: 'CVE-2021-XXXX', severity: 'MEDIUM', cvss: 5.0, description: '编码解析潜在越界访问', link: '#' },
  { package_name: 'setprototypeof', version_range: '<1.2.0', cve_id: 'CVE-2019-10747', severity: 'HIGH', cvss: 7.5, description: 'Prototype pollution 原型污染', link: 'https://nvd.nist.gov/vuln/detail/CVE-2019-10747' },
  { package_name: 'path-to-regexp', version_range: '<0.1.8', cve_id: 'CVE-2021-XXXX', severity: 'MEDIUM', cvss: 5.0, description: 'ReDoS 正则表达式拒绝服务', link: '#' },
];

const PACKAGE_DB = {
  'express': { deps: { 'accepts': '1.3.8', 'array-flatten': '1.1.1', 'body-parser': '1.20.2', 'content-disposition': '0.5.4', 'content-type': '1.0.4', 'cookie': '0.6.0', 'cookie-signature': '1.0.6', 'debug': '2.6.9', 'depd': '2.0.0', 'encodeurl': '1.0.2', 'escape-html': '1.0.3', 'etag': '1.8.1', 'finalhandler': '1.2.0', 'fresh': '0.5.2', 'http-errors': '2.0.0', 'merge-descriptors': '1.0.1', 'methods': '1.1.2', 'on-finished': '2.4.1', 'parseurl': '1.3.3', 'path-to-regexp': '0.1.7', 'proxy-addr': '2.0.7', 'qs': '6.11.0', 'range-parser': '1.2.1', 'safe-buffer': '5.2.1', 'send': '0.18.0', 'serve-static': '1.15.0', 'setprototypeof': '1.2.0', 'statuses': '2.0.1', 'type-is': '1.6.18', 'utils-merge': '1.0.1', 'vary': '1.1.2' } },
  'body-parser': { deps: { 'bytes': '3.1.2', 'content-type': '1.0.5', 'debug': '2.6.9', 'depd': '2.0.0', 'destroy': '1.2.0', 'http-errors': '2.0.0', 'iconv-lite': '0.4.24', 'on-finished': '2.4.1', 'qs': '6.11.0', 'raw-body': '2.5.2', 'type-is': '1.6.18', 'unpipe': '1.0.0' } },
  'send': { deps: { 'debug': '2.6.9', 'depd': '2.0.0', 'destroy': '1.2.0', 'encodeurl': '1.0.2', 'escape-html': '1.0.3', 'etag': '1.8.1', 'fresh': '0.5.2', 'http-errors': '2.0.0', 'mime': '1.6.0', 'ms': '2.1.3', 'on-finished': '2.4.1', 'range-parser': '1.2.1', 'statuses': '2.0.1' } },
  'serve-static': { deps: { 'encodeurl': '1.0.2', 'escape-html': '1.0.3', 'parseurl': '1.3.3', 'send': '0.18.0' } },
  'finalhandler': { deps: { 'debug': '2.6.9', 'encodeurl': '1.0.2', 'escape-html': '1.0.3', 'on-finished': '2.4.1', 'parseurl': '1.3.3', 'statuses': '2.0.1', 'unpipe': '1.0.0' } },
  'http-errors': { deps: { 'depd': '2.0.0', 'inherits': '2.0.4', 'setprototypeof': '1.2.0', 'statuses': '2.0.1', 'toidentifier': '1.0.1' } },
  'proxy-addr': { deps: { 'forwarded': '0.2.0', 'ipaddr.js': '1.9.1' } },
  'accepts': { deps: { 'mime-types': '2.1.35', 'negotiator': '0.6.3' } },
  'mime-types': { deps: { 'mime-db': '1.52.0' } },
  'qs': { deps: { 'side-channel': '1.0.4' } },
  'side-channel': { deps: { 'call-bind': '1.0.2', 'get-intrinsic': '1.1.1', 'object-inspect': '1.12.2' } },
  'raw-body': { deps: { 'bytes': '3.1.2', 'http-errors': '2.0.0', 'iconv-lite': '0.4.24', 'unpipe': '1.0.0' } },
  'type-is': { deps: { 'media-typer': '0.3.0', 'mime-types': '2.1.35' } },
  'on-finished': { deps: { 'ee-first': '1.1.1' } },
  'd3': { deps: { 'd3-array': '3.2.0', 'd3-axis': '3.0.0', 'd3-brush': '3.0.0', 'd3-chord': '3.0.0', 'd3-color': '3.0.1', 'd3-contour': '4.0.0', 'd3-delaunay': '6.0.2', 'd3-dispatch': '3.0.1', 'd3-drag': '3.0.0', 'd3-dsv': '3.0.1', 'd3-ease': '3.0.1', 'd3-fetch': '3.0.1', 'd3-force': '3.0.0', 'd3-format': '3.1.0', 'd3-geo': '3.0.1', 'd3-hierarchy': '3.1.2', 'd3-interpolate': '3.0.1', 'd3-path': '3.0.1', 'd3-polygon': '3.0.1', 'd3-quadtree': '3.0.1', 'd3-random': '3.0.1', 'd3-scale': '4.0.2', 'd3-scale-chromatic': '3.0.0', 'd3-selection': '3.0.0', 'd3-shape': '3.1.0', 'd3-time': '3.0.0', 'd3-time-format': '4.1.0', 'd3-timer': '3.0.1', 'd3-transition': '3.0.1', 'd3-zoom': '3.0.0' } },
  'lodash': { deps: {} },
  'underscore': { deps: {} },
  'jquery': { deps: {} },
  'semver': { deps: { 'lru-cache': '6.0.0' } },
  'debug': { deps: { 'ms': '2.0.0' } },
  'ms': { deps: {} },
  'mime': { deps: {} },
  'cookie': { deps: {} },
  'cookie-signature': { deps: {} },
  'bytes': { deps: {} },
  'content-type': { deps: {} },
  'content-disposition': { deps: { 'safe-buffer': '5.2.1' } },
  'safe-buffer': { deps: {} },
  'etag': { deps: {} },
  'fresh': { deps: {} },
  'parseurl': { deps: {} },
  'path-to-regexp': { deps: {} },
  'setprototypeof': { deps: {} },
  'statuses': { deps: {} },
  'toidentifier': { deps: {} },
  'vary': { deps: {} },
  'escape-html': { deps: {} },
  'encodeurl': { deps: {} },
  'merge-descriptors': { deps: {} },
  'methods': { deps: {} },
  'utils-merge': { deps: {} },
  'destroy': { deps: {} },
  'depd': { deps: {} },
  'inherits': { deps: {} },
  'unpipe': { deps: {} },
  'range-parser': { deps: {} },
  'array-flatten': { deps: {} },
  'iconv-lite': { deps: { 'safer-buffer': '2.1.2' } },
  'safer-buffer': { deps: {} },
  'negotiator': { deps: {} },
  'mime-db': { deps: {} },
  'media-typer': { deps: {} },
  'forwarded': { deps: {} },
  'ipaddr.js': { deps: {} },
  'ee-first': { deps: {} },
  'object-inspect': { deps: {} },
  'call-bind': { deps: { 'function-bind': '1.1.1', 'get-intrinsic': '1.1.1' } },
  'get-intrinsic': { deps: { 'function-bind': '1.1.1', 'has': '1.0.3', 'has-symbols': '1.0.3' } },
  'function-bind': { deps: {} },
  'has': { deps: { 'function-bind': '1.1.1' } },
  'has-symbols': { deps: {} },
  'ansi-regex': { deps: {} },
  'minimist': { deps: {} },
  'lru-cache': { deps: { 'yallist': '4.0.0' } },
  'yallist': { deps: {} },
  'd3-array': { deps: { 'internmap': '2.0.3' } },
  'internmap': { deps: {} },
  'd3-axis': { deps: {} },
  'd3-brush': { deps: {} },
  'd3-chord': { deps: {} },
  'd3-color': { deps: {} },
  'd3-contour': { deps: {} },
  'd3-delaunay': { deps: { 'delaunator': '5.0.0' } },
  'delaunator': { deps: { 'robust-predicates': '3.0.1' } },
  'robust-predicates': { deps: {} },
  'd3-dispatch': { deps: {} },
  'd3-drag': { deps: {} },
  'd3-dsv': { deps: { 'commander': '7.2.0', 'iconv-lite': '0.6.3', 'rw': '1.3.3' } },
  'commander': { deps: {} },
  'rw': { deps: {} },
  'd3-ease': { deps: {} },
  'd3-fetch': { deps: {} },
  'd3-force': { deps: {} },
  'd3-format': { deps: {} },
  'd3-geo': { deps: {} },
  'd3-hierarchy': { deps: {} },
  'd3-interpolate': { deps: { 'd3-color': '3.0.1' } },
  'd3-path': { deps: {} },
  'd3-polygon': { deps: {} },
  'd3-quadtree': { deps: {} },
  'd3-random': { deps: {} },
  'd3-scale': { deps: {} },
  'd3-scale-chromatic': { deps: { 'd3-color': '3.0.1', 'd3-interpolate': '3.0.1' } },
  'd3-selection': { deps: {} },
  'd3-shape': { deps: { 'd3-path': '3.0.1' } },
  'd3-time': { deps: {} },
  'd3-time-format': { deps: {} },
  'd3-timer': { deps: {} },
  'd3-transition': { deps: {} },
  'd3-zoom': { deps: {} },
};

function parseVersion(v) {
  if (!v) return { major: 0, minor: 0, patch: 0 };
  let clean = String(v).replace(/^[\^~>=<\s]+/, '').trim();
  const parts = clean.split('.');
  return {
    major: parseInt(parts[0]) || 0,
    minor: parseInt(parts[1]) || 0,
    patch: parseInt((parts[2] || '0').split('-')[0]) || 0
  };
}

function versionInRange(version, range) {
  if (!range) return false;
  const v = parseVersion(version);
  const r = parseVersion(range.replace(/^[<>=~^]+/, '').trim());
  const cur = v.major * 1000000 + v.minor * 1000 + v.patch;
  const ref = r.major * 1000000 + r.minor * 1000 + r.patch;
  return cur < ref;
}

function severityRank(s) {
  switch ((s || '').toUpperCase()) {
    case 'CRITICAL': return 4;
    case 'HIGH': return 3;
    case 'MEDIUM': return 2;
    case 'LOW': return 1;
    default: return 0;
  }
}

function checkCVEs(pkgName, version) {
  return CVE_DB.filter(c => c.package_name === pkgName && versionInRange(version, c.version_range));
}

function buildTree(name, version, pkgJson, depth, visited, stats, mode) {
  const key = `${name}@${version}`;
  if (depth > 6) return null;
  if (visited.has(key) && depth > 0) return null;
  visited.add(key);

  const cves = checkCVEs(name, version);
  const node = { name, version, depth, children: [], cves: cves, maxSeverity: 0 };
  if (cves.length > 0) {
    node.maxSeverity = Math.max(...cves.map(c => severityRank(c.severity)));
    if (node.maxSeverity >= 3) stats.vulnCount++;
  }

  let deps = {};
  if (depth === 0 && pkgJson && pkgJson.dependencies) {
    deps = pkgJson.dependencies;
  } else {
    const meta = PACKAGE_DB[name];
    if (meta && meta.deps) deps = meta.deps;
  }

  if (mode === 'dangerous') {
    for (const [cname, cver] of Object.entries(deps)) {
      stats.totalCount++;
      const child = buildTree(cname, cver, null, depth + 1, visited, stats, mode);
      if (child) {
        if (child.cves.length === 0) {
          const forced = CVE_DB[Math.floor(Math.random() * CVE_DB.length)];
          child.cves = [forced];
          child.maxSeverity = severityRank(forced.severity);
          if (child.maxSeverity >= 3) stats.vulnCount++;
        }
        node.children.push(child);
        if (child.maxSeverity > node.maxSeverity) node.maxSeverity = child.maxSeverity;
      }
    }
    if (node.children.length < 4 && depth < 3) {
      const extras = ['lodash@4.17.15', 'minimist@0.2.0', 'semver@5.0.0', 'jquery@3.4.1', 'underscore@1.8.3', 'ansi-regex@3.0.0'];
      for (const ek of extras.slice(0, 4 - node.children.length)) {
        const [en, ev] = ek.split('@');
        stats.totalCount++;
        const cves2 = checkCVEs(en, ev);
        const child = { name: en, version: ev, depth: depth + 1, children: [], cves: cves2, maxSeverity: 0 };
        if (child.cves.length > 0) {
          child.maxSeverity = Math.max(...child.cves.map(c => severityRank(c.severity)));
          if (child.maxSeverity >= 3) stats.vulnCount++;
        }
        node.children.push(child);
        if (child.maxSeverity > node.maxSeverity) node.maxSeverity = child.maxSeverity;
      }
    }
  } else if (mode === 'conflict') {
    for (const [cname, cver] of Object.entries(deps)) {
      stats.totalCount++;
      const child = buildTree(cname, cver, null, depth + 1, visited, stats, mode);
      if (child) node.children.push(child);
      stats.totalCount++;
      stats.conflictCount++;
      const altVer = cver.replace(/\.\d+$/, '.' + (Math.floor(Math.random() * 5) + 5));
      node.children.push({
        name: cname,
        version: altVer,
        depth: depth + 1,
        children: [],
        cves: [],
        maxSeverity: 0,
        _conflict: true,
        _conflictWith: `${cname}@${cver}`
      });
    }
  } else if (mode === 'safe') {
    for (const [cname, cver] of Object.entries(deps)) {
      stats.totalCount++;
      const child = buildTree(cname, cver, null, depth + 1, visited, stats, mode);
      if (child) {
        child.cves = [];
        child.maxSeverity = 0;
        node.children.push(child);
      }
    }
  } else {
    for (const [cname, cver] of Object.entries(deps)) {
      stats.totalCount++;
      const child = buildTree(cname, cver, null, depth + 1, visited, stats, mode);
      if (child) {
        node.children.push(child);
        if (child.maxSeverity > node.maxSeverity) node.maxSeverity = child.maxSeverity;
      }
    }
  }
  return node;
}

app.post('/api/analyze', (req, res) => {
  try {
    const pkgJson = req.body;
    const mode = req.query.mode || 'normal';
    if (!pkgJson || typeof pkgJson !== 'object') {
      return res.status(400).json({ error: 'Invalid package.json' });
    }
    const stats = { totalCount: 1, vulnCount: 0, conflictCount: 0 };
    const tree = buildTree(pkgJson.name || 'root-project', pkgJson.version || '1.0.0', pkgJson, 0, new Set(), stats, mode);
    res.json({ tree, stats, mode });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analyze-file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = req.file.buffer.toString('utf8');
    const pkgJson = JSON.parse(content);
    const mode = (req.body && req.body.mode) || 'normal';
    const stats = { totalCount: 1, vulnCount: 0, conflictCount: 0 };
    const tree = buildTree(pkgJson.name || 'root-project', pkgJson.version || '1.0.0', pkgJson, 0, new Set(), stats, mode);
    res.json({ tree, stats, mode });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/demo/:mode', (req, res) => {
  const mode = req.params.mode;
  const validModes = ['init', 'safe', 'dangerous', 'conflict', 'normal'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  const demoPackages = {
    init: { name: 'empty-project', version: '1.0.0', dependencies: {} },
    safe: { name: 'clean-project', version: '1.0.0', dependencies: { 'express': '4.18.2', 'd3': '7.8.0', 'lodash': '4.17.21', 'semver': '7.5.4' } },
    dangerous: { name: 'vulnerable-project', version: '1.0.0', dependencies: { 'express': '4.16.0', 'lodash': '4.17.15', 'underscore': '1.8.3', 'jquery': '3.4.1', 'semver': '5.0.0', 'minimist': '0.2.0', 'ansi-regex': '3.0.0', 'body-parser': '1.18.0', 'debug': '2.6.8', 'qs': '6.0.0' } },
    conflict: { name: 'conflict-project', version: '1.0.0', dependencies: { 'lodash': '4.17.21', 'semver': '7.5.4', 'express': '4.18.2', 'd3': '7.8.0' } },
    normal: { name: 'my-project', version: '1.0.0', dependencies: { 'express': '4.18.2', 'd3': '7.8.0', 'lodash': '4.17.21', 'semver': '7.5.4', 'jquery': '3.6.0' } }
  };
  const pkgJson = demoPackages[mode];
  const stats = { totalCount: 1, vulnCount: 0, conflictCount: 0 };
  const tree = buildTree(pkgJson.name, pkgJson.version, pkgJson, 0, new Set(), stats, mode);
  res.json({ tree, stats, mode, projectName: pkgJson.name });
});

app.get('/api/cves', (req, res) => {
  res.json(CVE_DB);
});

app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`  Galaxy Dependency Visualizer 已启动`);
  console.log(`  访问地址: http://localhost:${PORT}`);
  console.log(`  API: POST /api/analyze, POST /api/analyze-file`);
  console.log(`  演示: GET /api/demo/[init|safe|dangerous|conflict|normal]`);
  console.log(`=============================================================`);
});
