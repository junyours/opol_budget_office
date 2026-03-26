import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import DepartmentHeadDashboard from '../department-head/Dashboard';
import AdminDashboard from '../admin/Dashboard';
import HrmoDashboard from '../hrmo/HrmoDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'department-head':
      return <DepartmentHeadDashboard />;
    case 'admin':
    case 'super-admin':
      return <AdminDashboard />;
    case 'admin-hrmo':
      return <HrmoDashboard />;
    default:
      return <div>Unknown role</div>;
  }
};

export default Dashboard;