// src/pages/Admin/CRM/Leads/LeadListPage.tsx
import React from 'react';
import LeadListView from '../../../../components/leads/LeadListView';
import { ROUTES } from '../../../../constants';

const LeadListPage: React.FC = () => <LeadListView portal="admin" basePath={ROUTES.ADMIN.LEADS} />;

export default LeadListPage;
