import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ForgotPassword from '../pages/ForgotPassword/forgot-password.jsx'
import Page404 from '../pages/NotFound/404.jsx'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Page404 />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes