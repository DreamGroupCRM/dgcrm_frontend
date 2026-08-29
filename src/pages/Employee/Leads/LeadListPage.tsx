// src/pages/Employee/Leads/LeadListPage.tsx
import React from 'react';
import LeadListView from '../../../components/leads/LeadListView';
import { ROUTES } from '../../../constants';

const LeadListPage: React.FC = () => <LeadListView portal="employee" basePath={ROUTES.EMPLOYEE.LEADS} />;

export default LeadListPage;
