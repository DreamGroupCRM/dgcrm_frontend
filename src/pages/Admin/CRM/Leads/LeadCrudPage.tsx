// src/pages/Admin/CRM/Leads/LeadCrudPage.tsx
import React from 'react';
import LeadCrudView, { LeadCrudMode } from '../../../../components/leads/LeadCrudView';
import { ROUTES } from '../../../../constants';

const LeadCrudPage: React.FC<{ mode: LeadCrudMode }> = ({ mode }) => <LeadCrudView mode={mode} basePath={ROUTES.ADMIN.LEADS} />;

export default LeadCrudPage;
