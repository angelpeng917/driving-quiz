import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import BackupPage from './pages/BackupPage'
import ExamPage from './pages/ExamPage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import NumericPage from './pages/NumericPage'
import PracticePage from './pages/PracticePage'
import TipsPage from './pages/TipsPage'
import WrongPage from './pages/WrongPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="exam" element={<ExamPage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="numeric" element={<NumericPage />} />
        <Route path="tips" element={<TipsPage />} />
        <Route path="wrong" element={<WrongPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<HistoryPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  )
}
