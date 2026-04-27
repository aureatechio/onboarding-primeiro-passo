import { DashboardTabs } from '../../../components/dashboard'

export default function TabBar({ tabs, activeTab, onTabChange, getHref }) {
  return (
    <DashboardTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      getHref={getHref}
      ariaLabel="Seções do monitor"
    />
  )
}
