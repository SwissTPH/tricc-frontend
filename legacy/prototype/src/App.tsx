import React from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ProjectDashboard from './pages/ProjectDashboard'
import ActivityEditor from './pages/ActivityEditor'
import ProjectSettings from './pages/ProjectSettings'
import UserAccount from './pages/UserAccount'
import TerminologyServer from './pages/TerminologyServer'

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<ProjectDashboard />} />
        <Route path="/activity/:activityId" element={<ActivityEditor />} />
        <Route path="/settings" element={<ProjectSettings />} />
        <Route path="/account" element={<UserAccount />} />
        <Route path="/terminology" element={<TerminologyServer />} />
      </Routes>
    </MainLayout>
  )
}

export default App
