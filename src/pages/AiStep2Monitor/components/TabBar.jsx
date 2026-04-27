import { DashboardTabs } from '../../../components/dashboard'

export default function TabBar({ tabs, activeTab, onTabChange }) {
  return <DashboardTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} ariaLabel="Seções do monitor" />
}
