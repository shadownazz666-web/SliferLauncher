# sliferlauncher.com (landing)

Static site: landing + Account (register/login) + `/profile.html` full-page profile.

Download target:

`https://github.com/shadownazz666-web/SliferLauncher/releases/latest/download/SliferLauncher_Setup.exe`

Account uses the **same store-api accounts** as the Slifer launcher (`/auth/register-player`, `/auth/login`, `/auth/login-username`) via a same-origin `/api/` nginx proxy.

## Local preview

From this folder:

```bash
npx --yes serve -l 4173 .
```

Open `http://127.0.0.1:4173`.

Auth calls go to `/api/...`. For local login to work, either proxy `/api` to a running store-api, or test against the live site after deploy.

## Deploy on the store-api Linux host

Same machine as store-api. Apex hostname serves this site; leave the API on its existing subdomain/port.

### 1. DNS (registrar or Cloudflare)

| Type | Name | Value |
|------|------|--------|
| A | `@` | your VPS IPv4 |
| AAAA | `@` | your VPS IPv6 (if any) |
| CNAME or A | `www` | `@` or same IP |

Do **not** change Resend SPF/DKIM/MX records. Do **not** move the store-api hostname.

Wait until `dig +short sliferlauncher.com` returns the VPS IP.

### 2. Copy files onto the VPS

From your PC (adjust user/host/path):

```bash
ssh you@YOUR_VPS 'sudo mkdir -p /var/www/sliferlauncher.com && sudo chown $USER /var/www/sliferlauncher.com'
rsync -av --delete ./website/ you@YOUR_VPS:/var/www/sliferlauncher.com/
```

Or on the VPS after `git pull` of this repo:

```bash
sudo mkdir -p /var/www/sliferlauncher.com
sudo rsync -a --delete /path/to/Slifer\ Launcher/website/ /var/www/sliferlauncher.com/
```

Omit `README.md` and `nginx.example.conf` from the public root if you prefer (optional).

### 3. nginx

```bash
sudo cp /path/to/website/nginx.example.conf /etc/nginx/sites-available/sliferlauncher.com
sudo ln -sf /etc/nginx/sites-available/sliferlauncher.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The example includes `/api/` → `http://127.0.0.1:8787/` (trailing slash strips the `/api` prefix). If the live site block already exists, merge that `location /api/` into the **443** server (and 80 if needed), then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Smoke test:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://sliferlauncher.com/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"test@example.com","password":"wrong"}'
```

Expect `401` JSON (proxy OK), not HTML/`502`.

### 4. HTTPS

```bash
sudo certbot --nginx -d sliferlauncher.com -d www.sliferlauncher.com
```

Confirm:

- `https://sliferlauncher.com` shows the landing page
- Account → Sign in / Create account works with a launcher account
- Store API URL still works as before
- Password-reset mail DNS unchanged

## Updates

Edit files under `website/`, then re-rsync / re-copy to `/var/www/sliferlauncher.com/` and reload nginx only if the server block changed.