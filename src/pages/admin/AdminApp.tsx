import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useHeadTags, type HeadTag } from '../../lib/useHeadTags';
import { AdminBookings } from './AdminBookings';
import { AdminCustomers } from './AdminCustomers';
import { AdminCustomerDetail } from './AdminCustomerDetail';
import { AdminDashboard } from './AdminDashboard';
import { AdminGuard } from './AdminGuard';
import { AdminLogin } from './AdminLogin';
import { AdminOrders } from './AdminOrders';
import { AdminKitchen } from './AdminKitchen';
import { AdminOrdering } from './AdminOrdering';
import { payFirst } from '../../core/tenant';
import { AdminSecurity } from './AdminMfa';

const guarded = (page: React.ReactNode) => <AdminGuard>{page}</AdminGuard>;

// Installable as "Kitchen" (staff.webmanifest, emitted by the tenant HTML
// plugin). Added on /admin only; the public site adds its own app.webmanifest.
// The staff worker (lock-screen alerts) fetches and caches nothing.
const INSTALL_TAGS: HeadTag[] = [
  ['link', { rel: 'manifest', href: '/staff.webmanifest' }],
  ['link', { rel: 'apple-touch-icon', href: '/images/app/apple-touch-icon.png' }],
  ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
  ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
  ['meta', { name: 'apple-mobile-web-app-title', content: 'Kitchen' }],
];

export const AdminApp: React.FC = () => {
  useHeadTags(INSTALL_TAGS);
  return <AdminRoutes />;
};

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route path="login" element={<AdminLogin />} />
    <Route index element={guarded(<AdminDashboard />)} />
    <Route path="bookings" element={guarded(<AdminBookings />)} />
    <Route path="orders" element={guarded(<AdminOrders />)} />
    <Route path="kitchen" element={<AdminGuard bare><AdminKitchen /></AdminGuard>} />
    {payFirst && <Route path="ordering" element={guarded(<AdminOrdering />)} />}
    <Route path="customers" element={guarded(<AdminCustomers />)} />
    <Route path="customers/:customerId" element={guarded(<AdminCustomerDetail />)} />
    <Route path="security" element={guarded(<AdminSecurity />)} />
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes>
);
