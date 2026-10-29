# দৈনিক কল্যাণ

## Admin Control Panel

Secret admin URL: `https://dainikkalyan.com/dainik-kalyan-control-panel`

Backup URL: `https://dainikkalyan.com/dk-admin-2026`

Login: `/dainik-kalyan-control-panel/login`

The public site does not link to the control panel. Keep these URLs private.

### First login

Set `ADMIN_ID` and `ADMIN_PASSWORD` in the deployment environment before production. The development fallback is `admin` / `change-me-now`; change it immediately. Login sessions use an httpOnly cookie and expire after two hours.

### Security checklist

- Change the default credentials before deployment.
- Enable 2FA/TOTP through the production identity layer.
- Add an IP allowlist or geo restriction at the edge if the newsroom requires it.
- Use a managed database for persistent news, users, media, drafts, and audit logs.
- Keep daily backups and test restoration regularly.
- The login endpoint limits an IP to five failed attempts per fifteen minutes in the current runtime. For multi-instance deployments, move this counter to a shared rate-limit store.

### Roles and workflow

- Super Admin: full access.
- Editor: review and publish news.
- Reporter: create and edit their own drafts.
- Workflow: Draft → Review → Publish, with rejected items returning a reason.

The current panel provides a safe, friendly UI scaffold for all management areas. Connect the forms to your database/storage provider before using it as a production CMS.
