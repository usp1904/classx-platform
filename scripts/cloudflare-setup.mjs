const API = 'https://api.cloudflare.com/client/v4';
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const project = process.env.CLOUDFLARE_PROJECT || 'classx-platform';
const customDomain = (process.env.CLOUDFLARE_CUSTOM_DOMAIN || '').trim().toLowerCase();
const zoneIdEnv = (process.env.CLOUDFLARE_ZONE_ID || '').trim();

function fail(message, details) {
  console.error(`[cloudflare-setup] ${message}`);
  if (details) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

if (!token || !accountId) {
  fail('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
}

async function cf(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function ensureProject() {
  const base = `/accounts/${accountId}/pages/projects`;
  const existing = await cf(`${base}/${project}`);
  if (existing.response.ok) {
    console.log(`[cloudflare-setup] Pages project "${project}" exists.`);
    return;
  }
  if (existing.response.status !== 404) {
    fail('Unable to read Pages project.', existing.data.errors || existing.data);
  }
  const created = await cf(base, {
    method: 'POST',
    body: JSON.stringify({ name: project, production_branch: 'main' }),
  });
  if (!created.response.ok) {
    fail('Unable to create Pages project.', created.data.errors || created.data);
  }
  console.log(`[cloudflare-setup] Created Pages project "${project}".`);
}

function zoneCandidates(hostname) {
  const parts = hostname.split('.').filter(Boolean);
  const candidates = [];
  for (let i = 1; i < parts.length - 1; i += 1) {
    candidates.push(parts.slice(i).join('.'));
  }
  return candidates;
}

async function resolveZoneId(hostname) {
  if (zoneIdEnv) return zoneIdEnv;
  for (const candidate of zoneCandidates(hostname)) {
    const result = await cf(`/zones?name=${encodeURIComponent(candidate)}`);
    const zone = result.data?.result?.[0];
    if (zone?.id) return zone.id;
  }
  return null;
}

async function ensureCname(zoneId, hostname) {
  const records = await cf(`/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(hostname)}`);
  if (!records.response.ok) fail('Unable to read DNS records.', records.data.errors || records.data);
  const target = `${project}.pages.dev`;
  const existing = records.data?.result?.[0];
  if (existing) {
    if (existing.content === target && existing.proxied) {
      console.log(`[cloudflare-setup] CNAME ${hostname} -> ${target} already correct.`);
      return;
    }
    const updated = await cf(`/zones/${zoneId}/dns_records/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: target, proxied: true, ttl: 1 }),
    });
    if (!updated.response.ok) fail('Unable to update DNS record.', updated.data.errors || updated.data);
    console.log(`[cloudflare-setup] Updated CNAME ${hostname} -> ${target} (proxied).`);
    return;
  }
  const created = await cf(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({ type: 'CNAME', name: hostname, content: target, proxied: true, ttl: 1 }),
  });
  if (!created.response.ok) fail('Unable to create DNS record.', created.data.errors || created.data);
  console.log(`[cloudflare-setup] Created CNAME ${hostname} -> ${target} (proxied).`);
}

async function ensureDomainAttached(hostname) {
  const base = `/accounts/${accountId}/pages/projects/${project}/domains`;
  const attached = await cf(base, {
    method: 'POST',
    body: JSON.stringify({ name: hostname }),
  });
  const alreadyThere = attached.data?.errors?.some((error) => /already|exists/i.test(error.message || ''));
  if (!attached.response.ok && !alreadyThere) {
    fail('Unable to attach custom domain.', attached.data.errors || attached.data);
  }
  const list = await cf(base);
  const domain = list.data?.result?.find((item) => item.name === hostname);
  console.log(`[cloudflare-setup] Domain ${hostname}: ${domain?.status || 'pending'}.`);
  return domain?.status;
}

async function verify(url, attempts = 6) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.ok) {
        console.log(`[cloudflare-setup] Verified ${url} -> HTTP ${response.status}.`);
        return true;
      }
      console.log(`[cloudflare-setup] ${url} -> HTTP ${response.status} (attempt ${attempt}/${attempts}).`);
    } catch (error) {
      console.log(`[cloudflare-setup] ${url} -> ${error.message} (attempt ${attempt}/${attempts}).`);
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  return false;
}

async function main() {
  await ensureProject();

  const stableUrl = `https://${project}.pages.dev`;
  if (!customDomain) {
    console.log(`[cloudflare-setup] No custom domain requested. Stable URL: ${stableUrl}`);
    await verify(stableUrl, 3);
    return;
  }

  const zoneId = await resolveZoneId(customDomain);
  if (!zoneId) {
    fail(
      `No Cloudflare zone found for ${customDomain}. Add the domain to Cloudflare or set CLOUDFLARE_ZONE_ID.`,
    );
  }

  await ensureCname(zoneId, customDomain);
  await ensureDomainAttached(customDomain);
  const verified = await verify(`https://${customDomain}`);
  if (!verified) {
    console.warn(`[cloudflare-setup] DNS/SSL still propagating for https://${customDomain}. Re-run later.`);
  }
}

main().catch((error) => fail(error.message));
