# Admin role and maintenance mode

## Admin routes (`/admin`)

- Dashboard with platform statistics.
- User management and approval of new registrations.
- Review management, messages, orders, user monitoring.
- Finance and payout requests.
- Notifications.
- **Maintenance** page: schedule or manage maintenance.

## Scheduled maintenance

Admins can set a start and end time and a custom message. Users receive email notices when schedules are created, updated, cancelled, or when maintenance starts or ends.

Before the window, users may see a reminder modal when signed in. During the active window, non-admin users see a full-screen maintenance page; new orders are paused.

## Sudden maintenance

Admins can start sudden maintenance. The system may wait for active deliveries (picked up or in transit) to finish before showing the full maintenance UI to users. Email notifies users when sudden maintenance starts.

## Admin during maintenance

Administrators can still use the platform and access maintenance controls during maintenance.
