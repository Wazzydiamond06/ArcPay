import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import Landing from '@/pages/Landing'
import GetStarted from '@/pages/GetStarted'
import Send from '@/pages/Send'
import SendDashboard from '@/pages/SendDashboard'
import Receive from '@/pages/Receive'
import ReceiveDashboard from '@/pages/ReceiveDashboard'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="get-started" element={<GetStarted />} />
        <Route path="send" element={<Send />} />
        <Route path="send/dashboard" element={<SendDashboard />} />
        <Route path="receive" element={<Receive />} />
        <Route path="receive/dashboard" element={<ReceiveDashboard />} />
        <Route path="*" element={<Landing />} />
      </Route>
    </Routes>
  )
}
