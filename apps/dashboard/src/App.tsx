import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { OverviewPage } from '@/pages/Overview'
import { TransactionDetailPage } from '@/pages/TransactionDetail'
import { SplitMetricsPage } from '@/pages/SplitMetrics'
import { ContratosPage } from '@/pages/Contratos'
import { DescontoPage } from '@/pages/Desconto'
import { ReenviarContratoPage } from '@/pages/ReenviarContrato'
import { CheckoutConfigPage } from '@/pages/CheckoutConfig'
import { OmieNfseConfigPage } from '@/pages/OmieNfseConfig'
import { OmieUpsertOsPage } from '@/pages/OmieUpsertOs'
import { ClientesPage } from '@/pages/Clientes'
import { EnviarCheckoutEmailPage } from '@/pages/EnviarCheckoutEmail'
import { EnviarBoletosEmailPage } from '@/pages/EnviarBoletosEmail'
import { GerarOnboardingLinkPage } from '@/pages/GerarOnboardingLink'
import { TasksPage } from '@/pages/Tasks'
import { CheckoutMonitorPage } from '@/pages/CheckoutMonitor'
import { DevCredenciaisPage } from '@/pages/DevCredenciais'
import { PerplexityConfigPage } from '@/pages/PerplexityConfig'
import { NanoBananaConfigPage } from '@/pages/NanoBananaConfig'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/contratos" element={<ContratosPage />} />
          <Route path="/split-metrics" element={<SplitMetricsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/checkout-monitor" element={<CheckoutMonitorPage />} />
          <Route path="/desconto" element={<DescontoPage />} />
          <Route path="/reenviar-contrato" element={<ReenviarContratoPage />} />
          <Route
            path="/enviar-checkout-email"
            element={<EnviarCheckoutEmailPage />}
          />
          <Route
            path="/enviar-boletos-email"
            element={<EnviarBoletosEmailPage />}
          />
          <Route path="/gerar-onboarding-link" element={<GerarOnboardingLinkPage />} />
          <Route path="/checkout-config" element={<CheckoutConfigPage />} />
          <Route path="/omie-nfse-config" element={<OmieNfseConfigPage />} />
          <Route path="/perplexity-config" element={<PerplexityConfigPage />} />
          <Route path="/nanobanana-config" element={<NanoBananaConfigPage />} />
          <Route path="/omie-upsert-os" element={<OmieUpsertOsPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/dev/credenciais" element={<DevCredenciaisPage />} />
          <Route path="/transaction" element={<TransactionDetailPage />} />
          <Route
            path="/transaction/:compraId"
            element={<TransactionDetailPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
