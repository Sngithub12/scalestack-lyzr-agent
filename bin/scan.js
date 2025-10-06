#!/usr/bin/env node
/**
 * Baseline Guardian Scanner v2
 * Scans GitHub repositories for potential security issues, secrets, and risky code.
 */

const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const cliProgress = require("cli-progress");

// ====== CONFIG ======
const CODE_EXTENSIONS = [".js", ".ts", ".py", ".java", ".go", ".c", ".cpp", ".json", ".html", ".css", ".yaml", ".yml", ".md"];
const CRITICAL_PATTERNS = [
  /api[_-]?key\s*=\s*["'][A-Za-z0-9_\-]{16,}["']/i,
  /secret\s*=\s*["'][A-Za-z0-9_\-]{12,}["']/i,
  /password\s*=\s*["'][^"']{4,}["']/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /ghp_[A-Za-z0-9]{20,}/, // GitHub tokens
  /AKIA[0-9A-Z]{16}/ // AWS Access Key
];

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const HEADERS = GITHUB_TOKEN
  ? { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "baseline-guardian" }
  : { "User-Agent": "baseline-guardian" };

// ====== MAIN FUNCTION ======
async function main() {
  const repoArgIndex = process.argv.findIndex((a) => a === "--repo" || a === "-r");
  const outputJsonIndex = process.argv.findIndex((a) => a === "-o");
  const outputMdIndex = process.argv.findIndex((a) => a === "-m");
  const debug = process.argv.includes("--debug");

  if (repoArgIndex === -1) {
    console.error("❌ Usage: node bin/scan.js --repo <owner/repo> -o <report.json> -m <report.md>");
    process.exit(1);
  }

  const repo = process.argv[repoArgIndex + 1];
  const jsonReport = process.argv[outputJsonIndex + 1] || "report.json";
  const mdReport = process.argv[outputMdIndex + 1] || "report.md";

  console.log(`🔍 Fetching files from GitHub repo: ${repo} ...`);

  const files = await fetchRepoFiles(repo);
  const codeFiles = files.filter(f => CODE_EXTENSIONS.some(ext => f.name.endsWith(ext)));

  if (codeFiles.length === 0) {
    console.log("No code files found to scan.");
    process.exit(0);
  }

  console.log(`🔍 Found ${codeFiles.length} code files to scan from GitHub.`);

  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progress.start(codeFiles.length, 0);

  let issues = [];
  for (const [index, file] of codeFiles.entries()) {
    const url = file.download_url;
    const content = await fetchFileContent(url);
    const found = detectIssues(content, url);
    if (found.length > 0) issues.push(...found);
    progress.update(index + 1);
  }

  progress.stop();

  const report = summarizeResults(codeFiles.length, issues);
  fs.writeFileSync(jsonReport, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdReport, generateMarkdown(report));

  console.log(`📄 JSON report saved to ${jsonReport}`);
  console.log(`📄 Markdown report saved to ${mdReport}`);

  process.exit(issues.length > 0 ? 1 : 0);
}

// ====== HELPERS ======
async function fetchRepoFiles(repo) {
  const url = `https://api.github.com/repos/${repo}/contents`;
  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) {
    console.error(`❌ GitHub API Error: ${response.statusText}`);
    process.exit(254);
  }

  const data = await response.json();
  return data.filter(item => item.type === "file");
}

async function fetchFileContent(url) {
  const response = await fetch(url);
  return await response.text();
}

function detectIssues(content, fileUrl) {
  const issues = [];
  for (const pattern of CRITICAL_PATTERNS) {
    if (pattern.test(content)) {
      issues.push({
        file: fileUrl,
        issue: "Potential secret or credential found",
        severity: "critical",
      });
    }
  }
  return issues;
}

function summarizeResults(totalFiles, issues) {
  const filesWithIssues = new Set(issues.map(i => i.file)).size;
  const severityCount = {
    Critical: issues.filter(i => i.severity === "critical").length,
    High: 0, Medium: 0, Low: 0
  };

  console.log("\n=== 📝 Scan Summary ===");
  console.log(`Files scanned: ${totalFiles}`);
  console.log(`Files with issues: ${filesWithIssues}`);
  console.log(`Total issues found: ${issues.length}`);
  console.log(`Severity breakdown: Critical=${severityCount.Critical}, High=0, Medium=0, Low=0\n`);

  return {
    summary: { totalFiles, filesWithIssues, totalIssues: issues.length, severityCount },
    issues
  };
}

function generateMarkdown(report) {
  let md = `# 🧭 Baseline Guardian Report\n\n`;
  md += `**Files Scanned:** ${report.summary.totalFiles}\n\n`;
  md += `**Files with Issues:** ${report.summary.filesWithIssues}\n\n`;
  md += `**Total Issues:** ${report.summary.totalIssues}\n\n`;
  if (report.issues.length > 0) {
    md += `## Issues Found:\n`;
    report.issues.forEach((i) => {
      md += `- File: [${i.file}](${i.file})\n  - Issue: ${i.issue}\n  - Severity: ${i.severity}\n\n`;
    });
  } else {
    md += `✅ No issues detected.\n`;
  }
  return md;
}

main();
