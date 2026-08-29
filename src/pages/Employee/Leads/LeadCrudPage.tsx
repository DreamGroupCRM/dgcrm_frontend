// src/pages/Employee/Leads/LeadCrudPage.tsx
import React from 'react';
import LeadCrudView, { LeadCrudMode } from '../../../components/leads/LeadCrudView';
import { ROUTES } from '../../../constants';

const LeadCrudPage: React.FC<{ mode: LeadCrudMode }> = ({ mode }) => <LeadCrudView mode={mode} basePath={ROUTES.EMPLOYEE.LEADS} />;

export default LeadCrudPage;
