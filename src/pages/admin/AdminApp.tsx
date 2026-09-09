import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminBookings } from './AdminBookings';
import { AdminCustomers } from './AdminCustomers';
import { AdminDashboard } from './AdminDashboard';
import { AdminGuard } from './AdminGuard';
import { AdminLogin } from './AdminLogin';
import { AdminOrders } from './AdminOrders';
import { AdminSecurity } from './AdminMfa';

const guarded = (page: React.ReactNode) => <AdminGuard>{page}</AdminGuard>;

export const AdminApp: React.FC = () => (
  <Routes>
    <Route path="login" element={<AdminLogin />} />
    <Route index element={guarded(<AdminDashboard />)} />
    <Route path="bookings" element={guarded(<AdminBookings />)} />
    <Route path="orders" element={guarded(<AdminOrders />)} />
    <Route path="customers" element={guarded(<AdminCustomers />)} />
    <Route path="security" element={guarded(<AdminSecurity />)} />
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes>
);
