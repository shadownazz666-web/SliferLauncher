# sliferlauncher.com (landing)

Static one-page site: brand + pitch + Windows download CTA.

Download target:

`https://github.com/shadownazz666-web/SliferLauncher/releases/latest/download/SliferLauncher_Setup.exe`

## Local preview

From this folder:

```bash
npx --yes serve -l 4173 .
```

Open `http://127.0.0.1:4173`.

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

### 4. HTTPS

```bash
sudo certbot --nginx -d sliferlauncher.com -d www.sliferlauncher.com
```

Confirm:

- `https://sliferlauncher.com` shows the landing page
- Store API URL still works as before
- Password-reset mail DNS unchanged

## Updates

Edit files under `website/`, then re-rsync / re-copy to `/var/www/sliferlauncher.com/` and reload nginx only if the server block changed.